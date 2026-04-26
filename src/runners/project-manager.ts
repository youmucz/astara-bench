import { cpSync, mkdirSync, existsSync, readFileSync, writeFileSync, rmSync } from "fs";
import { join, resolve } from "path";
import { execSync } from "child_process";

export interface ProjectPaths {
	baseline: string;
	studios: string;
}

export interface ProjectManagerOptions {
	fixtureDir: string;
	tempDir: string;
	projectDir?: string;
	studiosSource?: string;
}

function gitInit(dir: string): void {
	execSync("git init", { cwd: dir, stdio: "pipe" });
	execSync("git add .", { cwd: dir, stdio: "pipe" });
	execSync('git commit -m "initial"', { cwd: dir, stdio: "pipe" });
}

function removeStudiosConfig(dir: string): void {
	const agentsMd = join(dir, "AGENTS.md");
	if (existsSync(agentsMd)) rmSync(agentsMd);

	const opencodeDir = join(dir, ".opencode");
	if (existsSync(opencodeDir)) rmSync(opencodeDir, { recursive: true });

	const opencodeJson = join(dir, "opencode.json");
	if (existsSync(opencodeJson)) {
		try {
			const content = JSON.parse(readFileSync(opencodeJson, "utf-8"));
			delete content.hooks;
			delete content.mcp;
			writeFileSync(opencodeJson, JSON.stringify(content, null, 2));
		} catch {
			rmSync(opencodeJson);
		}
	}
}

function deployStudiosFromNpm(dir: string): void {
	execSync("bunx astara-studios install", { cwd: dir, stdio: "pipe", timeout: 120000 });
}

function deployStudiosFromLocal(dir: string, sourcePath: string): void {
	const absSource = resolve(sourcePath);

	const srcOpencode = join(absSource, ".opencode");
	if (existsSync(srcOpencode)) {
		cpSync(srcOpencode, join(dir, ".opencode"), { recursive: true });
	}

	const srcAgents = join(absSource, "AGENTS.md");
	if (existsSync(srcAgents)) {
		cpSync(srcAgents, join(dir, "AGENTS.md"));
	}

	const srcJson = join(absSource, "opencode.json");
	if (existsSync(srcJson)) {
		cpSync(srcJson, join(dir, "opencode.json"));
	}
}

export function initProjects(options: ProjectManagerOptions): ProjectPaths {
	const { fixtureDir, tempDir, projectDir, studiosSource } = options;

	mkdirSync(tempDir, { recursive: true });
	const baselineDir = join(tempDir, "bench-baseline");
	const studiosDir = join(tempDir, "bench-studios");

	const sourceDir = projectDir ?? fixtureDir;

	cpSync(sourceDir, baselineDir, { recursive: true });
	cpSync(sourceDir, studiosDir, { recursive: true });

	if (projectDir) {
		removeStudiosConfig(baselineDir);
	} else {
		const src = studiosSource ?? "npm";
		if (src === "npm") {
			deployStudiosFromNpm(studiosDir);
		} else if (existsSync(src)) {
			deployStudiosFromLocal(studiosDir, src);
		}
	}

	gitInit(baselineDir);
	gitInit(studiosDir);

	return { baseline: baselineDir, studios: studiosDir };
}

export function applyFixture(projectDir: string, fixturePath: string): void {
	const absFixturePath = resolve(fixturePath);
	if (!existsSync(absFixturePath)) {
		console.warn(`Warning: fixture directory not found: ${absFixturePath}, skipping`);
		return;
	}
	cpSync(absFixturePath, projectDir, { recursive: true });
	console.warn(`Fixture loaded: ${fixturePath}`);
}

export function resetProject(dir: string): void {
	try {
		execSync("git checkout .", { cwd: dir, stdio: "pipe" });
		execSync("git clean -fd", { cwd: dir, stdio: "pipe" });
	} catch (err) {
		throw new Error(`Failed to reset project at ${dir}: ${err}`);
	}
}

export function cleanupProjects(paths: ProjectPaths): void {
	rmSync(paths.baseline, { recursive: true, force: true });
	rmSync(paths.studios, { recursive: true, force: true });
}
