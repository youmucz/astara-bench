import { describe, expect, test } from "bun:test";

async function importModule(path: string) {
	return import(path);
}

describe("Assertion library availability", () => {
	test("naming assertions can be imported", async () => {
		const mod = await importModule("../../src/assertions/naming.ts");
		expect(mod.checkGDScriptNaming).toBeDefined();
		expect(mod.checkCSharpNaming).toBeDefined();
		expect(mod.checkConsistencyWithHook).toBeDefined();
	});

	test("architecture assertions can be imported", async () => {
		const mod = await importModule("../../src/assertions/architecture.ts");
		expect(mod.checkAllDependencies).toBeDefined();
		expect(mod.checkDependencyDirection).toBeDefined();
	});

	test("pattern assertions can be imported", async () => {
		const mod = await importModule("../../src/assertions/patterns.ts");
		expect(mod.checkAllProhibitedPatterns).toBeDefined();
		expect(mod.checkHardcodedPaths).toBeDefined();
		expect(mod.checkFreeVsQueueFree).toBeDefined();
		expect(mod.checkLoadInProcess).toBeDefined();
	});

	test("godot-specific assertions can be imported", async () => {
		const mod = await importModule("../../src/assertions/godot-specific.ts");
		expect(mod.checkAllGodotRules).toBeDefined();
		expect(mod.checkInitNoChildAccess).toBeDefined();
		expect(mod.checkPhysicsInPhysicsProcess).toBeDefined();
	});

	test("hook-simulation assertions can be imported", async () => {
		const mod = await importModule("../../src/assertions/hook-simulation.ts");
		expect(mod.runAllHookSimulations).toBeDefined();
		expect(mod.checkSceneFileGuard).toBeDefined();
		expect(mod.checkCommentChecker).toBeDefined();
	});
});
