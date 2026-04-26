import { describe, expect, test } from "bun:test";
import {
	checkGDScriptFileName,
	checkGDScriptClassNames,
	checkGDScriptVariables,
	checkGDScriptConstants,
	checkGDScriptSignals,
	checkGDScriptNaming,
	checkCSharpFileName,
	checkCSharpPrivateFields,
	checkCSharpMethods,
	checkConsistencyWithHook,
} from "../../../src/assertions/naming.ts";

describe("naming: GDScript file names", () => {
	test("valid snake_case.gd passes", () => {
		const result = checkGDScriptFileName("player_controller.gd");
		expect(result.passed).toBe(true);
	});

	test("PascalCase.gd fails", () => {
		const result = checkGDScriptFileName("PlayerController.gd");
		expect(result.passed).toBe(false);
	});

	test("camelCase.gd fails", () => {
		const result = checkGDScriptFileName("playerController.gd");
		expect(result.passed).toBe(false);
	});
});

describe("naming: GDScript class_name", () => {
	test("PascalCase class_name passes", () => {
		const results = checkGDScriptClassNames("class_name PlayerController");
		expect(results.every((r) => r.passed)).toBe(true);
	});

	test("snake_case class_name fails", () => {
		const results = checkGDScriptClassNames("class_name player_controller");
		expect(results.some((r) => !r.passed)).toBe(true);
	});

	test("no class_name is ok", () => {
		const results = checkGDScriptClassNames("extends Node2D");
		expect(results.every((r) => r.passed)).toBe(true);
	});
});

describe("naming: GDScript variables", () => {
	test("snake_case variables pass", () => {
		const results = checkGDScriptVariables("var health_points := 100");
		expect(results.every((r) => r.passed)).toBe(true);
	});

	test("camelCase variable fails", () => {
		const results = checkGDScriptVariables("var healthPoints := 100");
		expect(results.some((r) => !r.passed)).toBe(true);
	});

	test("private _snake_case passes", () => {
		const results = checkGDScriptVariables("var _internal_state := 0");
		expect(results.every((r) => r.passed)).toBe(true);
	});
});

describe("naming: GDScript constants", () => {
	test("SCREAMING_SNAKE_CASE passes", () => {
		const results = checkGDScriptConstants("const MAX_HEALTH := 100");
		expect(results.every((r) => r.passed)).toBe(true);
	});

	test("camelCase constant fails", () => {
		const results = checkGDScriptConstants("const maxHealth := 100");
		expect(results.some((r) => !r.passed)).toBe(true);
	});

	test("snake_case constant fails", () => {
		const results = checkGDScriptConstants("const max_health := 100");
		expect(results.some((r) => !r.passed)).toBe(true);
	});
});

describe("naming: GDScript signals", () => {
	test("snake_case signal passes", () => {
		const results = checkGDScriptSignals("signal health_changed(new_value)");
		expect(results.every((r) => r.passed)).toBe(true);
	});

	test("camelCase signal fails", () => {
		const results = checkGDScriptSignals("signal healthChanged(new_value)");
		expect(results.some((r) => !r.passed)).toBe(true);
	});
});

describe("naming: full GDScript check", () => {
	test("well-named file passes all", () => {
		const content = `
class_name PlayerController
extends CharacterBody2D

const MAX_SPEED := 300.0
var velocity := Vector2.ZERO
signal health_changed(new_health: int)
func move_toward_target() -> void:
	pass
`;
		const results = checkGDScriptNaming("player_controller.gd", content);
		expect(results.every((r) => r.passed)).toBe(true);
	});

	test("poorly-named file fails", () => {
		const content = `const maxSpeed := 300`;
		const results = checkGDScriptNaming("PlayerController.gd", content);
		expect(results.some((r) => !r.passed)).toBe(true);
	});
});

describe("naming: C# file names", () => {
	test("PascalCase.cs passes", () => {
		expect(checkCSharpFileName("PlayerController.cs").passed).toBe(true);
	});

	test("snake_case.cs fails", () => {
		expect(checkCSharpFileName("player_controller.cs").passed).toBe(false);
	});

	test("camelCase.cs fails", () => {
		expect(checkCSharpFileName("playerController.cs").passed).toBe(false);
	});
});

describe("naming: C# private fields", () => {
	test("_camelCase passes", () => {
		const results = checkCSharpPrivateFields("private int _currentHealth;");
		expect(results.every((r) => r.passed)).toBe(true);
	});

	test("missing underscore fails", () => {
		const results = checkCSharpPrivateFields("private int currentState;");
		expect(results.some((r) => !r.passed)).toBe(true);
	});

	test("_PascalCase fails (wrong after underscore)", () => {
		const results = checkCSharpPrivateFields("private int _CurrentState;");
		expect(results.some((r) => !r.passed)).toBe(true);
	});
});

describe("naming: C# methods", () => {
	test("PascalCase method passes", () => {
		const results = checkCSharpMethods("public void TakeDamage(int amount) { }");
		expect(results.every((r) => r.passed)).toBe(true);
	});

	test("camelCase method fails", () => {
		const results = checkCSharpMethods("public void takeDamage(int amount) { }");
		expect(results.some((r) => !r.passed)).toBe(true);
	});
});

describe("naming: consistency check", () => {
	test("same pattern is consistent", () => {
		const re = /^[a-z][a-z0-9]*(_[a-z0-9]+)*\.gd$/;
		const result = checkConsistencyWithHook(re, re, "GDScript file");
		expect(result.passed).toBe(true);
	});

	test("different pattern may be inconsistent", () => {
		const local = /^[a-z][a-z0-9_]*\.gd$/;
		const hook = /^[A-Z][a-zA-Z0-9]*\.gd$/;
		const result = checkConsistencyWithHook(local, hook, "GDScript file");
		expect(result.passed).toBe(false);
	});

	test("functionally equivalent passes", () => {
		const re1 = /^[a-z][a-z0-9]*(_[a-z0-9]+)*\.gd$/;
		const re2 = /^[a-z][a-z0-9]*(_[a-z0-9]+)*\.gd$/;
		const result = checkConsistencyWithHook(re1, re2, "GDScript file");
		expect(result.passed).toBe(true);
	});
});
