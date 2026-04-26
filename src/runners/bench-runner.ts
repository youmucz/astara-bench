import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";
import { parse as parseYaml } from "yaml";
import { execSync } from "child_process";
import type { OpencodeClient } from "@opencode-ai/sdk";
import { checkGDScriptNaming, checkCSharpNaming, checkPythonNaming } from "../assertions/naming.ts";
import { checkAllDependencies } from "../assertions/architecture.ts";
import { checkAllProhibitedPatterns, checkAllPythonPatterns } from "../assertions/patterns.ts";
import { checkAllGodotRules } from "../assertions/godot-specific.ts";
import { runAllHookSimulations, type HookSimulationContext, type ToolCallInfo } from "../assertions/hook-simulation.ts";
import { resetProject, applyFixture, type ProjectPaths } from "./project-manager.ts";

export interface BenchConfig {
	model: string;
	scenarioTimeoutMs: number;
	runs: number;
	weights: { deterministic: number; structural: number; hook_simulation: number };
	scenarioWeights: Record<string, number>;
	scenarioDirs: string[];
	regression: { stdMultiplier: number; fallbackPercentage: number };
	fixtureDir: string;
	server: {
		baseline_port: number;
		studios_port: number;
		startup_timeout_ms: number;
		health_retry_count: number;
		health_retry_interval_ms: number;
	};
}

export interface ScenarioAssertion {
	type: string;
	file?: string;
	pattern?: string;
	message?: string;
	function_name?: string;
	constant_name?: string;
	signal_name?: string;
	extends_type?: string;
	command?: string;
	expected_exit?: number;
	timeout_ms?: number;
}

export interface Scenario {
	id: string;
	name: string;
	category: "basic" | "domain" | "negative" | "general";
	difficulty: "easy" | "medium" | "hard";
	description: string;
	prompt: string;
	fixture?: string;
	assertions: {
		deterministic?: ScenarioAssertion[];
		structural?: ScenarioAssertion[];
		hook_simulation?: ScenarioAssertion[];
	};
	weights?: {
		deterministic?: number;
		structural?: number;
		hook_simulation?: number;
	};
}

export interface BenchResult {
	scenarioId: string;
	sessionId: string;
	group: "baseline" | "studios";
	files: {
		created: string[];
		modified: string[];
		deleted: string[];
		contents: Map<string, string>;
	};
	toolCalls: ToolCallInfo[];
	duration: number;
	status: "success" | "timeout" | "error" | "empty_response";
	error?: string;
}

export interface AssertionEvaluation {
	assertion: ScenarioAssertion;
	passed: boolean;
	message: string;
}

export interface ScenarioResult {
	scenarioId: string;
	group: "baseline" | "studios";
	runIndex: number;
	deterministicScore: number;
	structuralScore: number;
	hookSimulationScore: number;
	totalScore: number;
	assertions: {
		deterministic: AssertionEvaluation[];
		structural: AssertionEvaluation[];
		hook_simulation: AssertionEvaluation[];
	};
	result: BenchResult;
}

export function loadScenario(filePath: string): Scenario {
	const content = readFileSync(filePath, "utf-8");
	const scenario = parseYaml(content) as Scenario;
	if (!scenario.id || !scenario.name || !scenario.category || !scenario.prompt) {
		throw new Error(`Invalid scenario file: ${filePath} - missing required fields`);
	}
	return scenario;
}

export function loadScenarios(dirs: string[], category?: string, scenarioId?: string): Scenario[] {
	const scenarios: Scenario[] = [];
	for (const dir of dirs) {
		if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) continue;
		for (const file of readdirSync(dir)) {
			if (!file.endsWith(".yaml") && !file.endsWith(".yml")) continue;
			try {
				const scenario = loadScenario(join(dir, file));
				if (scenarioId && scenario.id !== scenarioId) continue;
				if (category && category !== "all" && scenario.category !== category) continue;
				scenarios.push(scenario);
			} catch (err) {
				console.warn(`Warning: ${err}`);
			}
		}
	}
	return scenarios.sort((a, b) => a.id.localeCompare(b.id));
}

function collectFiles(projectDir: string): Map<string, string> {
	const files = new Map<string, string>();
	function walk(dir: string) {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			const fullPath = join(dir, entry.name);
			if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
			if (entry.isDirectory()) {
				walk(fullPath);
			} else {
				const rel = relative(projectDir, fullPath);
				try {
					files.set(rel, readFileSync(fullPath, "utf-8"));
				} catch (err) {
					console.warn(`Warning: Failed to read file ${fullPath}: ${err}`);
				}
			}
		}
	}
	walk(projectDir);
	return files;
}

function extractToolCalls(messages: unknown[]): ToolCallInfo[] {
	const calls: ToolCallInfo[] = [];
	if (!Array.isArray(messages)) return calls;
	for (const msg of messages) {
		const parts = (msg as Record<string, unknown>)?.parts;
		if (!Array.isArray(parts)) continue;
		for (const part of parts) {
			const p = part as Record<string, unknown>;
			if (p?.type === "tool_use") {
				const input = p.input as Record<string, unknown> | undefined;
				calls.push({
					type: (p.name ?? p.tool_name ?? "Unknown") as string,
					filePath: (input?.file_path ?? input?.filePath) as string | undefined,
				});
			}
		}
	}
	return calls;
}

export async function executeScenario(
	client: OpencodeClient,
	scenario: Scenario,
	projectDir: string,
	timeoutMs: number,
	group: "baseline" | "studios",
): Promise<BenchResult> {
	const startTime = Date.now();
	let sessionId = "";

	try {
		const createResult = await client.session.create();
		const sessionData = createResult.data as Record<string, unknown> | undefined;
		sessionId = (sessionData?.id as string) ?? "";

		const promptPromise = client.session.prompt({
			path: { id: sessionId },
			body: { parts: [{ type: "text" as const, text: scenario.prompt }] },
		});

		const result = await Promise.race([
			promptPromise,
			new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
		]);

		if (result === null) {
			if (sessionId) {
				await client.session.abort({ path: { id: sessionId } }).catch(() => {});
			}
			return {
				scenarioId: scenario.id,
				sessionId,
				group,
				files: { created: [], modified: [], deleted: [], contents: new Map() },
				toolCalls: [],
				duration: Date.now() - startTime,
				status: "timeout",
			};
		}

		const diffResult = await client.session.diff({ path: { id: sessionId } }).catch(() => ({ data: [] }));
		const diff = (diffResult.data ?? []) as Array<Record<string, unknown>>;

		const created: string[] = [];
		const modified: string[] = [];
		const deleted: string[] = [];
		for (const d of diff) {
			const path = d.path as string;
			if (d.newFile) created.push(path);
			else if (d.deletedFile) deleted.push(path);
			else modified.push(path);
		}

		const contents = new Map<string, string>();
		for (const path of [...created, ...modified]) {
			try {
				contents.set(path, readFileSync(join(projectDir, path), "utf-8"));
			} catch (err) {
				console.warn(`Warning: Failed to read created/modified file ${path}: ${err}`);
			}
		}

		const messagesResult = await client.session.messages({ path: { id: sessionId } }).catch(() => ({ data: [] }));
		const messages = (messagesResult.data ?? []) as unknown[];
		const toolCalls = extractToolCalls(messages);

		const status = created.length === 0 && modified.length === 0 ? "empty_response" : "success";

		return {
			scenarioId: scenario.id,
			sessionId,
			group,
			files: { created, modified, deleted, contents },
			toolCalls,
			duration: Date.now() - startTime,
			status,
		};
	} catch (err) {
		return {
			scenarioId: scenario.id,
			sessionId,
			group,
			files: { created: [], modified: [], deleted: [], contents: new Map() },
			toolCalls: [],
			duration: Date.now() - startTime,
			status: "error",
			error: String(err),
		};
	} finally {
		if (sessionId) {
			await client.session.delete({ path: { id: sessionId } }).catch(() => {});
		}
	}
}

function evaluateDeterministicAssertions(
	assertions: ScenarioAssertion[],
	result: BenchResult,
	projectDir: string,
): AssertionEvaluation[] {
	return assertions.map((assertion) => {
		try {
			return evalDeterministic(assertion, result, projectDir);
		} catch (err) {
			return { assertion, passed: false, message: `WARNING: Assertion eval failed for type ${assertion.type}: ${err}` };
		}
	});
}

function getAllContent(result: BenchResult, projectDir: string, targetFile?: string): string {
	if (targetFile) {
		return result.files.contents.get(targetFile) ?? (() => { try { return readFileSync(join(projectDir, targetFile), "utf-8"); } catch (err) { console.warn(`Warning: Fallback read failed for ${targetFile}: ${err}`); return ""; } })();
	}
	return [...result.files.contents.values()].join("\n");
}

function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function evalDeterministic(
	a: ScenarioAssertion,
	result: BenchResult,
	projectDir: string,
): AssertionEvaluation {
	const content = getAllContent(result, projectDir, a.file);

	switch (a.type) {
		case "regex": {
			const re = new RegExp(a.pattern!);
			const passed = re.test(content);
			return { assertion: a, passed, message: passed ? `regex matched: ${a.pattern}` : (a.message ?? `regex not matched: ${a.pattern}`) };
		}
		case "regex-not": {
			const re = new RegExp(a.pattern!);
			const passed = !re.test(content);
			return { assertion: a, passed, message: passed ? `regex-not OK: ${a.pattern}` : (a.message ?? `regex matched (should not): ${a.pattern}`) };
		}
		case "contains": {
			const passed = content.includes(a.pattern ?? "");
			return { assertion: a, passed, message: passed ? `contains: ${a.pattern}` : (a.message ?? `does not contain: ${a.pattern}`) };
		}
		case "no_file_created": {
			const pattern = a.pattern ?? "";
			const allFiles = [...result.files.created, ...result.files.modified];
			const re = new RegExp(pattern);
			const matched = allFiles.filter((f) => re.test(f));
			return { assertion: a, passed: matched.length === 0, message: matched.length > 0 ? `Files created matching ${pattern}: ${matched.join(", ")}` : `No files matching: ${pattern}` };
		}
		case "uses_edit_not_write": {
			const writeOps = result.toolCalls.filter((tc) => tc.type === "Write");
			return { assertion: a, passed: writeOps.length === 0, message: writeOps.length > 0 ? `Write used instead of Edit: ${writeOps.map((w) => w.filePath).join(", ")}` : "Edit used correctly" };
		}
		case "consistency_check":
			return { assertion: a, passed: true, message: "Consistency checked separately" };
		case "test_exec": {
			try {
				const cmd = a.command!;
				const timeout = a.timeout_ms ?? 30000;
				const expectedExit = a.expected_exit ?? 0;
				execSync(cmd, { cwd: projectDir, timeout, stdio: "pipe" });
				const passed = expectedExit === 0;
				return { assertion: a, passed, message: passed ? "test_exec: passed" : `test_exec: unexpected exit 0 (expected ${expectedExit})` };
			} catch (err: any) {
				const exitCode = err.status ?? 1;
				const passed = exitCode === (a.expected_exit ?? 0);
				const stderr = err.stderr?.toString()?.slice(0, 200) ?? "";
				return { assertion: a, passed, message: passed ? `test_exec: passed (exit ${a.expected_exit})` : (a.message ?? `test_exec failed (exit ${exitCode}): ${stderr}`) };
			}
		}
		default:
			return { assertion: a, passed: false, message: `WARNING: Unknown assertion type: ${a.type}` };
	}
}

function evaluateStructuralAssertions(
	assertions: ScenarioAssertion[],
	result: BenchResult,
	projectDir: string,
): AssertionEvaluation[] {
	const results: AssertionEvaluation[] = [];
	const files = collectFiles(projectDir);

	for (const a of assertions) {
		const content = a.file
			? files.get(a.file) ?? result.files.contents.get(a.file) ?? ""
			: [...files.values()].join("\n");

		switch (a.type) {
			case "function_exists": {
				const fn = a.function_name ?? "";
				const gdRe = new RegExp(`(?:func|function)\\s+${escapeRegex(fn)}\\s*\\(`);
				const csRe = new RegExp(`\\b${escapeRegex(fn)}\\s*\\(`);
				const pyRe = new RegExp(`def\\s+${escapeRegex(fn)}\\s*\\(`);
				const passed = gdRe.test(content) || csRe.test(content) || pyRe.test(content);
				results.push({ assertion: a, passed, message: `${fn} ${passed ? "found" : "not found"}` });
				break;
			}
			case "has_constant": {
				const constName = a.constant_name ?? "";
				const re = new RegExp(`\\bconst\\s+${escapeRegex(constName)}\\b`);
				const passed = re.test(content);
				results.push({ assertion: a, passed, message: `Constant ${constName} ${passed ? "found" : "not found"}` });
				break;
			}
			case "signal_exists": {
				const sigName = a.signal_name ?? "";
				const re = new RegExp(`\\bsignal\\s+${escapeRegex(sigName)}\\b`);
				const passed = re.test(content);
				results.push({ assertion: a, passed, message: `Signal ${sigName} ${passed ? "found" : "not found"}` });
				break;
			}
			case "extends_type": {
				const ext = a.extends_type ?? "";
				const gdRe = new RegExp(`\\bextends\\s+${escapeRegex(ext)}\\b`);
				const csRe = new RegExp(`class\\s+\\w+\\s*:\\s*${escapeRegex(ext)}\\b`);
				const passed = gdRe.test(content) || csRe.test(content);
				results.push({ assertion: a, passed, message: `extends ${ext} ${passed ? "found" : "not found"}` });
				break;
			}
			case "naming_check": {
				const fileName = a.file ?? "";
				let namingResults: Array<{ passed: boolean }>;
				if (fileName.endsWith(".gd")) {
					namingResults = checkGDScriptNaming(fileName, content);
				} else if (fileName.endsWith(".cs")) {
					namingResults = checkCSharpNaming(fileName, content);
				} else if (fileName.endsWith(".py")) {
					namingResults = checkPythonNaming(fileName, content);
				} else {
					namingResults = [{ passed: true }];
				}
				const allPassed = namingResults.every((r) => r.passed);
				results.push({ assertion: a, passed: allPassed, message: allPassed ? "Naming conventions OK" : "Naming violations detected" });
				break;
			}
			case "architecture_check": {
				const classNames = new Map<string, string>();
				for (const [path, c] of files) {
					const m = c.match(/\bclass_name\s+(\w+)/);
					if (m) classNames.set(m[1], path);
				}
				const depResults = checkAllDependencies(files, classNames);
				const allPassed = depResults.every((r) => r.passed);
				results.push({ assertion: a, passed: allPassed, message: allPassed ? "Architecture OK" : "Architecture violations detected" });
				break;
			}
			case "pattern_check": {
				const godotResults = checkAllProhibitedPatterns(content);
				const pythonResults = checkAllPythonPatterns(content);
				const allResults = [...godotResults, ...pythonResults];
				const allPassed = allResults.every((r) => r.passed);
				results.push({ assertion: a, passed: allPassed, message: allPassed ? "No prohibited patterns" : "Prohibited patterns detected" });
				break;
			}
			case "godot_rules_check": {
				const godotResults = checkAllGodotRules(content);
				const allPassed = godotResults.every((r) => r.passed);
				results.push({ assertion: a, passed: allPassed, message: allPassed ? "Godot rules OK" : "Godot rule violations detected" });
				break;
			}
			case "regex": {
				const re = new RegExp(a.pattern!);
				const passed = re.test(content);
				results.push({ assertion: a, passed, message: passed ? `regex matched: ${a.pattern}` : (a.message ?? `regex not matched: ${a.pattern}`) });
				break;
			}
			case "regex-not": {
				const re = new RegExp(a.pattern!);
				const passed = !re.test(content);
				results.push({ assertion: a, passed, message: passed ? `regex-not OK: ${a.pattern}` : (a.message ?? `regex matched (should not): ${a.pattern}`) });
				break;
			}
			case "contains": {
				const passed = content.includes(a.pattern ?? "");
				results.push({ assertion: a, passed, message: passed ? `contains: ${a.pattern}` : (a.message ?? `does not contain: ${a.pattern}`) });
				break;
			}
			default:
				results.push({ assertion: a, passed: false, message: `WARNING: Unknown structural assertion type: ${a.type}` });
		}
	}
	return results;
}

function evaluateHookSimAssertions(
	assertions: ScenarioAssertion[],
	result: BenchResult,
	existingFilesBefore: Set<string>,
): AssertionEvaluation[] {
	const ctx: HookSimulationContext = {
		createdFiles: result.files.created,
		modifiedFiles: result.files.modified,
		toolCalls: result.toolCalls,
		fileContents: result.files.contents,
		existingFilesBefore,
		group: result.group,
	};

	const hookResults = runAllHookSimulations(ctx);
	const resultMap = new Map(hookResults.map((r) => [r.type, r]));

	return assertions.map((a) => {
		const matched = resultMap.get(a.type);
		if (matched) {
			return { assertion: a, passed: matched.passed, message: matched.message };
		}
		return { assertion: a, passed: false, message: `WARNING: Unknown hook_simulation type: ${a.type}` };
	});
}

function scoreAssertions(evaluations: AssertionEvaluation[], explicitlyEmpty: boolean): number {
	if (evaluations.length === 0) {
		return explicitlyEmpty ? 0 : -1;
	}
	return evaluations.filter((e) => e.passed).length / evaluations.length;
}

export function evaluateScenario(
	scenario: Scenario,
	result: BenchResult,
	projectDir: string,
	config: BenchConfig,
	existingFilesBefore: Set<string>,
): ScenarioResult {
	const detDefined = scenario.assertions.deterministic !== undefined;
	const structDefined = scenario.assertions.structural !== undefined;
	const hookDefined = scenario.assertions.hook_simulation !== undefined;

	const detEvals = evaluateDeterministicAssertions(scenario.assertions.deterministic ?? [], result, projectDir);
	const structEvals = evaluateStructuralAssertions(scenario.assertions.structural ?? [], result, projectDir);
	const hookEvals = evaluateHookSimAssertions(scenario.assertions.hook_simulation ?? [], result, existingFilesBefore);

	const detScore = scoreAssertions(detEvals, detDefined && scenario.assertions.deterministic!.length === 0);
	const structScore = scoreAssertions(structEvals, structDefined && scenario.assertions.structural!.length === 0);
	const hookScore = scoreAssertions(hookEvals, hookDefined && scenario.assertions.hook_simulation!.length === 0);

	const w = scenario.weights ?? config.weights;
	const wDet = w.deterministic ?? config.weights.deterministic;
	const wStruct = w.structural ?? config.weights.structural;
	const wHook = w.hook_simulation ?? config.weights.hook_simulation;

	let effectiveWDet = wDet;
	let effectiveWStruct = wStruct;
	let effectiveWHook = wHook;

	if (detScore < 0) { effectiveWDet = 0; }
	if (structScore < 0) { effectiveWStruct = 0; }
	if (hookScore < 0) { effectiveWHook = 0; }

	const totalWeight = effectiveWDet + effectiveWStruct + effectiveWHook;
	const totalScore = totalWeight > 0
		? (Math.max(detScore, 0) * effectiveWDet
			+ Math.max(structScore, 0) * effectiveWStruct
			+ Math.max(hookScore, 0) * effectiveWHook) / totalWeight
		: 0;

	return {
		scenarioId: scenario.id,
		group: result.group,
		runIndex: 0,
		deterministicScore: Math.max(detScore, 0),
		structuralScore: Math.max(structScore, 0),
		hookSimulationScore: Math.max(hookScore, 0),
		totalScore,
		assertions: {
			deterministic: detEvals,
			structural: structEvals,
			hook_simulation: hookEvals,
		},
		result,
	};
}

export async function runScenario(
	scenario: Scenario,
	clients: { baseline: OpencodeClient; studios: OpencodeClient },
	paths: ProjectPaths,
	config: BenchConfig,
	mode: "baseline" | "studios" | "compare",
): Promise<ScenarioResult[]> {
	const results: ScenarioResult[] = [];
	const groups: Array<"baseline" | "studios"> = mode === "compare" ? ["baseline", "studios"] : [mode];

	for (const group of groups) {
		const client = group === "baseline" ? clients.baseline : clients.studios;
		const projectDir = group === "baseline" ? paths.baseline : paths.studios;

		if (scenario.fixture) {
			applyFixture(projectDir, scenario.fixture);
		}

		const existingBefore = new Set<string>();
		try {
			for (const entry of readdirSync(projectDir, { recursive: true })) {
				const p = typeof entry === "string" ? entry : (Array.isArray(entry) ? entry.join("/") : String(entry));
				existingBefore.add(p);
			}
		} catch (err) {
			console.warn(`Warning: Failed to enumerate existing files in ${projectDir}: ${err}`);
		}

		const benchResult = await executeScenario(client, scenario, projectDir, config.scenarioTimeoutMs, group);
		const evaluation = evaluateScenario(scenario, benchResult, projectDir, config, existingBefore);
		results.push(evaluation);

		try {
			resetProject(projectDir);
		} catch (err) {
			console.warn(`Warning: Failed to reset ${group} project: ${err}`);
		}
	}

	return results;
}
