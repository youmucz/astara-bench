import { execSync } from "child_process";
import { existsSync } from "fs";

export type TestEnv = "docker" | "venv" | "dry-run";

export interface TestResult {
	passed: boolean;
	resolveRate: number;
	totalF2P: number;
	passedF2P: number;
	totalP2P: number;
	passedP2P: number;
	output: string;
	env: TestEnv;
}

function parseTestOutput(output: string): { totalF2P: number; passedF2P: number; totalP2P: number; passedP2P: number } {
	const lines = output.split("\n");
	const failBefore: string[] = [];
	const failAfter: string[] = [];
	let inSection: "none" | "f2p" | "p2p" = "none";

	for (const line of lines) {
		if (line.includes("FAIL_TO_PASS")) { inSection = "f2p"; failBefore.length = 0; }
		if (line.includes("PASS_TO_PASS")) { inSection = "p2p"; failAfter.length = 0; }
		if (line.includes("===") && line.includes("test session")) { inSection = "none"; }

		if (inSection === "f2p" && (line.includes("FAILED") || line.includes("PASSED"))) {
			failBefore.push(line);
		}
		if (inSection === "p2p" && (line.includes("FAILED") || line.includes("PASSED"))) {
			failAfter.push(line);
		}
	}

	const totalF2P = failBefore.length;
	const passedF2P = failBefore.filter((l) => l.includes("PASSED")).length;
	const totalP2P = failAfter.length;
	const passedP2P = failAfter.filter((l) => l.includes("PASSED")).length;

	return { totalF2P, passedF2P, totalP2P, passedP2P };
}

function runDockerTest(workDir: string, repo: string): { output: string; exitCode: number } {
	try {
		const output = execSync(
			`docker run --rm -v "${workDir}:/app" -w /app python:3.10-slim bash -c "pip install -q pytest && python -m pytest -x --tb=short -q"`,
			{ stdio: "pipe", timeout: 300000 },
		);
		return { output: output.toString(), exitCode: 0 };
	} catch (err: any) {
		return { output: err.stdout?.toString() ?? err.stderr?.toString() ?? "", exitCode: err.status ?? 1 };
	}
}

function runVenvTest(workDir: string): { output: string; exitCode: number } {
	try {
		const output = execSync(`python -m pytest -x --tb=short -q`, {
			cwd: workDir,
			stdio: "pipe",
			timeout: 300000,
		});
		return { output: output.toString(), exitCode: 0 };
	} catch (err: any) {
		return { output: err.stdout?.toString() ?? err.stderr?.toString() ?? "", exitCode: err.status ?? 1 };
	}
}

let cachedEnvs: TestEnv[] | null = null;

function detectAvailableEnvs(): TestEnv[] {
	if (cachedEnvs) return cachedEnvs;
	const envs: TestEnv[] = [];
	try {
		execSync("docker info", { stdio: "pipe", timeout: 10000 });
		envs.push("docker");
	} catch {}
	try {
		execSync("python --version", { stdio: "pipe", timeout: 5000 });
		envs.push("venv");
	} catch {}
	envs.push("dry-run");
	cachedEnvs = envs;
	return envs;
}

export function runTests(workDir: string, repo: string, forceEnv?: TestEnv): TestResult {
	const availableEnvs = detectAvailableEnvs();

	if (forceEnv) {
		if (!availableEnvs.includes(forceEnv)) {
			console.warn(`Requested test env "${forceEnv}" not available, falling back to ${availableEnvs[0]}`);
			forceEnv = availableEnvs[0];
		}
	} else {
		forceEnv = availableEnvs[0];
	}

	if (forceEnv === "docker") {
		const { output, exitCode } = runDockerTest(workDir, repo);
		const parsed = parseTestOutput(output);
		const resolveRate = parsed.totalF2P > 0 ? parsed.passedF2P / parsed.totalF2P : 0;
		return {
			passed: exitCode === 0,
			resolveRate,
			...parsed,
			output,
			env: "docker",
		};
	}

	if (forceEnv === "venv") {
		const { output, exitCode } = runVenvTest(workDir);
		const parsed = parseTestOutput(output);
		const resolveRate = parsed.totalF2P > 0 ? parsed.passedF2P / parsed.totalF2P : 0;
		return {
			passed: exitCode === 0,
			resolveRate,
			...parsed,
			output,
			env: "venv",
		};
	}

	return {
		passed: false,
		resolveRate: 0,
		totalF2P: 0,
		passedF2P: 0,
		totalP2P: 0,
		passedP2P: 0,
		output: "Dry run: tests not executed",
		env: "dry-run",
	};
}
