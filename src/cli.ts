import { Command } from "commander";
import { readFileSync } from "fs";
import { join, resolve } from "path";
import { parse as parseYaml } from "yaml";
import picocolors from "picocolors";
import { setupDualClients, shutdownClients, type DualClients } from "./runners/opencode-client.ts";
import { initProjects, type ProjectPaths } from "./runners/project-manager.ts";
import { loadScenarios, runScenario, type BenchConfig } from "./runners/bench-runner.ts";
import {
	writeReports,
	generateBaselineFromResults,
	saveBaseline,
	loadBaseline,
	detectRegression,
	type ReportData,
} from "./runners/reporter.ts";
import { tmpdir } from "os";

export async function main() {
	const program = new Command();

	program
		.name("astara-bench")
		.description("Godot domain benchmark suite for testing Studios framework effectiveness")
		.version("0.1.0");

	program
		.option("--mode <mode>", "baseline / studios / compare", "compare")
		.option("--category <cat>", "basic / domain / negative / all", "all")
		.option("--scenario <id>", "run a single scenario by ID")
		.option("--runs <n>", "number of runs per scenario", "5")
		.option("--project-dir <path>", "path to an existing Godot game project")
		.option("--studios-source <src>", "Studios source: 'npm' or local path", "npm")
		.option("--compare <file>", "compare against baseline file")
		.option("--update-baseline", "update baseline.json with current results")
		.option("--baseline-url <url>", "connect to existing baseline opencode server")
		.option("--studios-url <url>", "connect to existing studios opencode server")
		.action(async (opts) => {
			const config = loadConfig();

			console.log(picocolors.cyan("astara-bench: Godot domain benchmark suite"));
			console.log();

			const scenarios = loadScenarios(
				config.scenarioDirs.map((d) => resolve(d)),
				opts.category,
				opts.scenario,
			);

			if (scenarios.length === 0) {
				console.error(picocolors.red("No scenarios found matching criteria."));
				process.exit(1);
			}

			console.log(picocolors.dim(`Found ${scenarios.length} scenario(s)`));

			const tempDir = join(tmpdir(), `astara-bench-${Date.now()}`);
			const projectPaths = initProjects({
				fixtureDir: resolve(config.fixtureDir),
				tempDir,
				projectDir: opts.projectDir ? resolve(opts.projectDir) : undefined,
				studiosSource: opts.studiosSource,
			});

			let clients: DualClients | undefined;
			try {
				console.log(picocolors.dim("Starting opencode servers..."));
				clients = await setupDualClients({
					baselineConfig: {
						port: config.server.baseline_port,
						cwd: projectPaths.baseline,
						startupTimeoutMs: config.server.startup_timeout_ms,
						healthRetryCount: config.server.health_retry_count,
						healthRetryIntervalMs: config.server.health_retry_interval_ms,
					},
					studiosConfig: {
						port: config.server.studios_port,
						cwd: projectPaths.studios,
						startupTimeoutMs: config.server.startup_timeout_ms,
						healthRetryCount: config.server.health_retry_count,
						healthRetryIntervalMs: config.server.health_retry_interval_ms,
					},
					baselineUrl: opts.baselineUrl,
					studiosUrl: opts.studiosUrl,
				});

				const runs = parseInt(opts.runs, 10) || config.runs;
				const allResults: import("./runners/bench-runner.ts").ScenarioResult[] = [];

				for (let i = 0; i < scenarios.length; i++) {
					const scenario = scenarios[i]!;
					console.log(
						picocolors.bold(`[${i + 1}/${scenarios.length}] ${scenario.id}: ${scenario.name}`),
					);

					for (let run = 0; run < runs; run++) {
						if (runs > 1) {
							console.log(picocolors.dim(`  Run ${run + 1}/${runs}`));
						}
						const results = await runScenario(
							scenario,
							clients,
							projectPaths,
							config,
							opts.mode,
						);
						for (const r of results) {
							r.runIndex = run;
						}
						allResults.push(...results);
					}
				}

				const report: ReportData = {
					timestamp: new Date().toISOString(),
					model: config.model,
					mode: opts.mode,
					category: opts.category,
					runs,
					scenarios: allResults,
					scenarioWeights: config.scenarioWeights,
				};

				writeReports(report, "reports");
				console.log();
				console.log(picocolors.green("Reports written to reports/latest.json and reports/latest.md"));

				if (opts.updateBaseline) {
					const baseline = generateBaselineFromResults(allResults, config.model);
					saveBaseline("baseline.json", baseline);
					console.log(picocolors.green("Baseline updated: baseline.json"));
				}

				if (opts.compare) {
					const existingBaseline = loadBaseline(resolve(opts.compare));
					if (existingBaseline) {
						let hasRegression = false;
						for (const entry of existingBaseline.entries) {
							const currentResults = allResults.filter(
								(r) => r.scenarioId === entry.scenarioId && r.group === entry.group,
							);
							if (currentResults.length === 0) continue;
							const currentAvg = currentResults.reduce((s, r) => s + r.totalScore, 0) / currentResults.length;
							if (detectRegression(currentAvg, entry.avgScore, entry.stdScore, config.regression.stdMultiplier, config.regression.fallbackPercentage)) {
								console.log(picocolors.red(`REGRESSED: ${entry.scenarioId} (${entry.group}) — ${currentAvg.toFixed(3)} vs baseline ${entry.avgScore.toFixed(3)}`));
								hasRegression = true;
							}
						}
						if (!hasRegression) {
							console.log(picocolors.green("No regressions detected."));
						}
					} else {
						console.warn(picocolors.yellow(`Baseline file not found: ${opts.compare}`));
					}
				}
			} finally {
				if (clients) shutdownClients(clients);
				try {
					const { cleanupProjects } = await import("./runners/project-manager.ts");
					cleanupProjects(projectPaths);
				} catch {}
			}
		});

	program.parse();
}

function loadConfig(): BenchConfig {
	const configPath = join(process.cwd(), "bench.config.yaml");
	const content = readFileSync(configPath, "utf-8");
	const raw = parseYaml(content) as any;
	return {
		model: raw.model,
		scenarioTimeoutMs: raw.scenario_timeout_ms ?? 300000,
		runs: raw.runs ?? 5,
		weights: {
			deterministic: raw.weights?.deterministic ?? 0.5,
			structural: raw.weights?.structural ?? 0.3,
			hook_simulation: raw.weights?.hook_simulation ?? 0.2,
		},
		scenarioWeights: raw.scenario_weights ?? {},
		scenarioDirs: raw.scenario_dirs ?? [],
		regression: {
			stdMultiplier: raw.regression?.std_multiplier ?? 1.5,
			fallbackPercentage: raw.regression?.fallback_percentage ?? 0.05,
		},
		fixtureDir: raw.fixture_dir ?? "fixtures/godot-project-bare",
		server: {
			baseline_port: raw.server?.baseline_port ?? 4097,
			studios_port: raw.server?.studios_port ?? 4098,
			startup_timeout_ms: raw.server?.startup_timeout_ms ?? 10000,
			health_retry_count: raw.server?.health_retry_count ?? 5,
			health_retry_interval_ms: raw.server?.health_retry_interval_ms ?? 1000,
		},
	};
}
