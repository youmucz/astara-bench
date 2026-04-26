import { describe, expect, test } from "bun:test";
import { existsSync } from "fs";
import { join, resolve } from "path";

const ROOT = resolve(import.meta.dir, "../..");

describe("Scenario assertion references", () => {
	test("all scenario directories exist", () => {
		const dirs = [
			join(ROOT, "scenarios/basic"),
			join(ROOT, "scenarios/domain"),
			join(ROOT, "scenarios/negative"),
		];
		for (const dir of dirs) {
			expect(existsSync(dir)).toBe(true);
		}
	});

	test("fixture directories exist", () => {
		const dirs = [
			join(ROOT, "fixtures/godot-project-bare"),
			join(ROOT, "fixtures/partial-player"),
			join(ROOT, "fixtures/buggy-code"),
		];
		for (const dir of dirs) {
			expect(existsSync(dir)).toBe(true);
		}
	});

	test("godot-project-bare has project.godot", () => {
		expect(existsSync(join(ROOT, "fixtures/godot-project-bare/project.godot"))).toBe(true);
	});

	test("src directory has required modules", () => {
		const files = [
			join(ROOT, "src/cli.ts"),
			join(ROOT, "src/runners/bench-runner.ts"),
			join(ROOT, "src/runners/opencode-client.ts"),
			join(ROOT, "src/runners/project-manager.ts"),
			join(ROOT, "src/runners/reporter.ts"),
			join(ROOT, "src/assertions/naming.ts"),
			join(ROOT, "src/assertions/architecture.ts"),
			join(ROOT, "src/assertions/patterns.ts"),
			join(ROOT, "src/assertions/godot-specific.ts"),
			join(ROOT, "src/assertions/hook-simulation.ts"),
		];
		for (const file of files) {
			expect(existsSync(file)).toBe(true);
		}
	});

	test("bench.config.yaml exists", () => {
		expect(existsSync(join(ROOT, "bench.config.yaml"))).toBe(true);
	});
});
