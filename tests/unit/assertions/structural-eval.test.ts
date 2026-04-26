import { describe, expect, test } from "bun:test";

describe("structural eval: function_exists C# compatibility", () => {
	const csRe = (fn: string) => new RegExp(`\\b${fn.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\(`);
	const gdRe = (fn: string) => new RegExp(`(?:func|function)\\s+${fn.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\(`);

	test("GDScript func matches gdRe", () => {
		expect(gdRe("_physics_process").test("func _physics_process(delta):")).toBe(true);
	});

	test("C# method matches csRe but not gdRe", () => {
		const code = "public override void _PhysicsProcess(double delta)";
		expect(gdRe("_PhysicsProcess").test(code)).toBe(false);
		expect(csRe("_PhysicsProcess").test(code)).toBe(true);
	});

	test("C# _Ready method matches csRe", () => {
		expect(csRe("_Ready").test("public override void _Ready()")).toBe(true);
	});

	test("C# _ExitTree method matches csRe", () => {
		expect(csRe("_ExitTree").test("public override void _ExitTree()")).toBe(true);
	});

	test("function not present fails both", () => {
		const code = "public override void _Ready()";
		expect(gdRe("_PhysicsProcess").test(code)).toBe(false);
		expect(csRe("_PhysicsProcess").test(code)).toBe(false);
	});
});

describe("structural eval: extends_type C# compatibility", () => {
	const gdRe = (ext: string) => new RegExp(`\\bextends\\s+${ext.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
	const csRe = (ext: string) => new RegExp(`class\\s+\\w+\\s*:\\s*${ext.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);

	test("GDScript extends matches gdRe", () => {
		expect(gdRe("CharacterBody2D").test("extends CharacterBody2D")).toBe(true);
	});

	test("C# class inheritance matches csRe but not gdRe", () => {
		const code = "public partial class PlayerController : CharacterBody2D";
		expect(gdRe("CharacterBody2D").test(code)).toBe(false);
		expect(csRe("CharacterBody2D").test(code)).toBe(true);
	});

	test("C# partial class inheritance matches csRe", () => {
		expect(csRe("CharacterBody2D").test("public partial class Foo : CharacterBody2D")).toBe(true);
	});

	test("C# extends not matched by gdRe in C# context", () => {
		const code = "public class Enemy : Node2D";
		expect(gdRe("Node2D").test(code)).toBe(false);
		expect(csRe("Node2D").test(code)).toBe(true);
	});
});
