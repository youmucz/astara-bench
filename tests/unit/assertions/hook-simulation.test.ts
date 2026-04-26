import { describe, expect, test } from "bun:test";
import {
	checkSceneFileGuard,
	checkWriteExistingFileGuard,
	checkCommentChecker,
	checkHashlineEditValidator,
	runAllHookSimulations,
	type HookSimulationContext,
} from "../../../src/assertions/hook-simulation.ts";

function makeCtx(overrides: Partial<HookSimulationContext> = {}): HookSimulationContext {
	return {
		createdFiles: [],
		modifiedFiles: [],
		toolCalls: [],
		fileContents: new Map(),
		existingFilesBefore: new Set(),
		group: "studios",
		...overrides,
	};
}

describe("hook-simulation: scene-file-guard", () => {
	test("creating .tscn fails", () => {
		const ctx = makeCtx({ createdFiles: ["scene.tscn"] });
		expect(checkSceneFileGuard(ctx).passed).toBe(false);
	});

	test("creating .tres fails", () => {
		const ctx = makeCtx({ createdFiles: ["material.tres"] });
		expect(checkSceneFileGuard(ctx).passed).toBe(false);
	});

	test("creating .tres fails", () => {
		const ctx = makeCtx({ createdFiles: ["material.tres"] });
		expect(checkSceneFileGuard(ctx).passed).toBe(false);
	});

	test("modifying .tres fails", () => {
		const ctx = makeCtx({ modifiedFiles: ["material.tres"] });
		expect(checkSceneFileGuard(ctx).passed).toBe(false);
	});

	test("creating .gd passes", () => {
		const ctx = makeCtx({ createdFiles: ["player.gd"] });
		expect(checkSceneFileGuard(ctx).passed).toBe(true);
	});

	test("no scene files passes", () => {
		const ctx = makeCtx({ createdFiles: ["player.gd"] });
		expect(checkSceneFileGuard(ctx).passed).toBe(true);
	});
});

describe("hook-simulation: write-existing-file-guard", () => {
	test("Write on existing file fails", () => {
		const ctx = makeCtx({
			toolCalls: [{ type: "Write", filePath: "player.gd" }],
			existingFilesBefore: new Set(["player.gd"]),
		});
		expect(checkWriteExistingFileGuard(ctx).passed).toBe(false);
	});

	test("Edit on existing file passes", () => {
		const ctx = makeCtx({
			toolCalls: [{ type: "Edit", filePath: "player.gd" }],
			existingFilesBefore: new Set(["player.gd"]),
		});
		expect(checkWriteExistingFileGuard(ctx).passed).toBe(true);
	});

	test("Write on new file passes", () => {
		const ctx = makeCtx({
			toolCalls: [{ type: "Write", filePath: "new_file.gd" }],
			existingFilesBefore: new Set(),
		});
		expect(checkWriteExistingFileGuard(ctx).passed).toBe(true);
	});
});

describe("hook-simulation: comment-checker", () => {
	test("BDD GIVEN comment passes (exempt)", () => {
		const contents = new Map([["player.gd", "# GIVEN player has health"]]);
		const ctx = makeCtx({ fileContents: contents });
		expect(checkCommentChecker(ctx).passed).toBe(true);
	});

	test("AI-style comment fails", () => {
		const contents = new Map([["player.gd", "// This function handles player movement"]]);
		const ctx = makeCtx({ fileContents: contents });
		expect(checkCommentChecker(ctx).passed).toBe(false);
	});

	test("clean code passes", () => {
		const contents = new Map([["player.gd", "var speed := 300.0"]]);
		const ctx = makeCtx({ fileContents: contents });
		expect(checkCommentChecker(ctx).passed).toBe(true);
	});

	test("BDD WHEN comment passes", () => {
		const contents = new Map([["test.gd", "# WHEN player takes damage"]]);
		const ctx = makeCtx({ fileContents: contents });
		expect(checkCommentChecker(ctx).passed).toBe(true);
	});
});

describe("hook-simulation: hashline-edit-validator", () => {
	test("no edits passes", () => {
		const ctx = makeCtx();
		expect(checkHashlineEditValidator(ctx).passed).toBe(true);
	});

	test("baseline group always passes", () => {
		const ctx = makeCtx({
			group: "baseline",
			toolCalls: [{ type: "Edit", filePath: "a.gd" }],
		});
		expect(checkHashlineEditValidator(ctx).passed).toBe(true);
	});

	test("studios group with edits passes", () => {
		const ctx = makeCtx({
			group: "studios",
			toolCalls: [{ type: "Edit", filePath: "a.gd" }],
		});
		expect(checkHashlineEditValidator(ctx).passed).toBe(true);
	});
});

describe("hook-simulation: runAllHookSimulations", () => {
	test("clean ctx passes all", () => {
		const ctx = makeCtx();
		const results = runAllHookSimulations(ctx);
		expect(results.every((r) => r.passed)).toBe(true);
		expect(results.length).toBe(4);
	});
});
