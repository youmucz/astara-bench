import { Command } from "commander";
import { readFileSync } from "fs";
import { join, resolve } from "path";
import { parse as parseYaml } from "yaml";
import picocolors from "picocolors";
import { setupDualClients, shutdownClients, type DualClients } from "./runners/opencode-client.ts";
import { initProjects, type ProjectPaths } from "./runners/project-manager.ts";
import { loadScenarios, runScenario, type BenchConfig } from "./runners/bench-runner.ts";
import { runSwebench, type SwebenchConfig, type SwebenchInstanceResult } from "./runners/swebench-runner.ts";
import {
	writeReports,
	writeSwebenchReport,
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
		.option("--category <cat>", "basic / domain / negative / general / all", "all")
		.option("--preset <preset>", "godot / swebench / all", "godot")
		.option("--scenario <id>", "run a single scenario by ID")
		.option("--runs <n>", "number of runs per scenario", "5")
		.option("--max-instances <n>", "max SWE-bench instances to evaluate")
		.option("--project-dir <path>", "path to an existing Godot game project")
		.option("--studios-source <src>", "Studios source: 'npm' or local path", "npm")
		.option("--compare <file>", "compare against baseline file")
		.option("--update-baseline", "update baseline.json with current results")
		.option("--baseline-url <url>", "connect to existing baseline opencode server")
		.option("--studios-url <url>", "connect to existing studios opencode server")
		.action(async (opts) => {
			const config = loadConfig();
			const preset = opts.preset ?? "godot";

			console.log(picocolors.cyan("astara-bench: Godot domain benchmark suite"));
			console.log();

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

				const runs = parseInt(opts.runs, 10);
				const runsFinal = isNaN(runs) ? config.runs : runs;
				const allYamlResults: import("./runners/bench-runner.ts").ScenarioResult[] = [];
				const allSwebenchResults: SwebenchInstanceResult[] = [];

				if (preset === "godot" || preset === "all") {
					const scenarios = loadScenarios(
						config.scenarioDirs.map((d) => resolve(d)),
						preset === "all" ? undefined : opts.category,
						preset === "all" ? undefined : opts.scenario,
					);

					if (scenarios.length > 0) {
						console.log(picocolors.dim(`Found ${scenarios.length} YAML scenario(s)`));

						for (let i = 0; i < scenarios.length; i++) {
							const scenario = scenarios[i]!;
							console.log(
								picocolors.bold(`[${i + 1}/${scenarios.length}] ${scenario.id}: ${scenario.name}`),
							);

							for (let run = 0; run < runsFinal; run++) {
								if (runsFinal > 1) {
									console.log(picocolors.dim(`  Run ${run + 1}/${runsFinal}`));
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
								allYamlResults.push(...results);
							}
						}
					}
				}

				if (preset === "swebench" || preset === "all") {
					const swebenchConfig = config.swebench;
					if (swebenchConfig) {
						const maxInstances = opts.maxInstances ? parseInt(opts.maxInstances, 10) : swebenchConfig.maxInstances;

						console.log(picocolors.dim("Running SWE-bench instances..."));
						const groups: Array<"baseline" | "studios"> = opts.mode === "compare" ? ["baseline", "studios"] : [opts.mode];
						for (const group of groups) {
							console.log(picocolors.bold(`SWE-bench group: ${group}`));
							const client = group === "baseline" ? clients.baseline : clients.studios;
							const sweResults = await runSwebench(client, swebenchConfig, group, undefined, maxInstances);
							allSwebenchResults.push(...sweResults);
						}
					} else {
						console.warn(picocolors.yellow("No swebench config found in bench.config.yaml, skipping SWE-bench"));
					}
				}

				const report: ReportData = {
					timestamp: new Date().toISOString(),
					model: config.model,
					mode: opts.mode,
					category: opts.category,
					runs: runsFinal,
					scenarios: allYamlResults,
					scenarioWeights: config.scenarioWeights,
				};

				writeReports(report, "reports");

				if (allSwebenchResults.length > 0) {
					writeSwebenchReport(allSwebenchResults, "reports");
				}

				console.log();
				console.log(picocolors.green("Reports written to reports/latest.json and reports/latest.md"));

				if (opts.updateBaseline) {
					const baseline = generateBaselineFromResults(allYamlResults, config.model);
					saveBaseline("baseline.json", baseline);
					console.log(picocolors.green("Baseline updated: baseline.json"));
				}

				if (opts.compare) {
					const existingBaseline = loadBaseline(resolve(opts.compare));
					if (existingBaseline) {
						let hasRegression = false;
						for (const entry of existingBaseline.entries) {
							const currentResults = allYamlResults.filter(
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

interface FullConfig extends BenchConfig {
	swebench?: SwebenchConfig;
}

function loadConfig(): FullConfig {
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
		swebench: raw.swebench ? {
			dataset: raw.swebench.dataset ?? "lite",
			instancesDir: raw.swebench.instances_dir ?? "swebench-instances",
			reposDir: raw.swebench.repos_dir ?? "swebench-repos",
			maxInstances: raw.swebench.max_instances ?? 20,
			timeoutMs: raw.swebench.timeout_ms ?? 600000,
		} : undefined,
	};
}
