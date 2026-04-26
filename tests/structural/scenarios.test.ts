import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "fs";
import { join, resolve } from "path";
import { parse as parseYaml } from "yaml";

const ROOT = resolve(import.meta.dir, "../..");

const SCENARIO_DIRS = [
	join(ROOT, "scenarios/basic"),
	join(ROOT, "scenarios/domain"),
	join(ROOT, "scenarios/negative"),
];

const VALID_CATEGORIES = new Set(["basic", "domain", "negative"]);
const VALID_DIFFICULTIES = new Set(["easy", "medium", "hard"]);

function collectScenarioFiles(): string[] {
	const files: string[] = [];
	for (const dir of SCENARIO_DIRS) {
		if (!existsSync(dir)) continue;
		for (const file of readdirSync(dir)) {
			if (file.endsWith(".yaml") || file.endsWith(".yml")) {
				files.push(join(dir, file));
			}
		}
	}
	return files;
}

describe("Scenario YAML format validation", () => {
	const scenarioFiles = collectScenarioFiles();

	test("at least 25 scenario files exist", () => {
		expect(scenarioFiles.length).toBeGreaterThanOrEqual(25);
	});

	for (const file of scenarioFiles) {
		const fileName = file.split(/[\\/]/).pop()!;
		describe(fileName, () => {
			const content = readFileSync(file, "utf-8");
			let parsed: any;

			test("valid YAML", () => {
				parsed = parseYaml(content);
				expect(parsed).toBeDefined();
				expect(typeof parsed).toBe("object");
			});

			test("has required id field", () => {
				expect(parsed.id).toBeDefined();
				expect(typeof parsed.id).toBe("string");
			});

			test("has required name field", () => {
				expect(parsed.name).toBeDefined();
				expect(typeof parsed.name).toBe("string");
			});

			test("has valid category", () => {
				expect(parsed.category).toBeDefined();
				expect(VALID_CATEGORIES.has(parsed.category)).toBe(true);
			});

			test("has valid difficulty", () => {
				expect(parsed.difficulty).toBeDefined();
				expect(VALID_DIFFICULTIES.has(parsed.difficulty)).toBe(true);
			});

			test("has prompt", () => {
				expect(parsed.prompt).toBeDefined();
				expect(typeof parsed.prompt).toBe("string");
				expect(parsed.prompt.length).toBeGreaterThan(0);
			});

			test("has assertions", () => {
				expect(parsed.assertions).toBeDefined();
				expect(typeof parsed.assertions).toBe("object");
			});
		});
	}
});
