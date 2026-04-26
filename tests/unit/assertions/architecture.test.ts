import { describe, expect, test } from "bun:test";
import { checkAllDependencies, checkDependencyDirection } from "../../../src/assertions/architecture.ts";

describe("architecture: dependency direction", () => {
	test("forward dependency passes", () => {
		const classNames = new Map([["PlayerController", "src/gameplay/player_controller.gd"]]);
		const results = checkDependencyDirection(
			"src/ui/hud.gd",
			'preload("res://src/gameplay/player_controller.gd")',
			classNames,
		);
		expect(results.every((r) => r.passed)).toBe(true);
	});

	test("reverse dependency fails", () => {
		const classNames = new Map([["HUD", "src/ui/hud.gd"]]);
		const results = checkDependencyDirection(
			"src/gameplay/player.gd",
			'preload("res://src/ui/hud.gd")',
			classNames,
		);
		expect(results.some((r) => !r.passed)).toBe(true);
	});

	test("unknown layer passes", () => {
		const classNames = new Map<string, string>();
		const results = checkDependencyDirection("src/player.gd", "var x := 1", classNames);
		expect(results.every((r) => r.passed)).toBe(true);
	});

	test("checkAllDependencies aggregates", () => {
		const files = new Map([
			["src/ui/hud.gd", "extends Control"],
			["src/gameplay/player.gd", 'preload("res://src/ui/hud.gd")'],
		]);
		const classNames = new Map([["HUD", "src/ui/hud.gd"]]);
		const results = checkAllDependencies(files, classNames);
		expect(results.some((r) => !r.passed)).toBe(true);
	});

	test("C# forward using passes", () => {
		const classNames = new Map([["PlayerController", "src/gameplay/PlayerController.cs"]]);
		const results = checkDependencyDirection(
			"src/ui/Hud.cs",
			"using Gameplay;",
			classNames,
		);
		expect(results.every((r) => r.passed)).toBe(true);
	});

	test("C# reverse inheritance fails", () => {
		const classNames = new Map([["HUD", "src/ui/HUD.cs"]]);
		const results = checkDependencyDirection(
			"src/gameplay/Enemy.cs",
			"class Enemy : HUD { }",
			classNames,
		);
		expect(results.some((r) => !r.passed)).toBe(true);
	});

	test("C# mixed with GDScript files", () => {
		const files = new Map([
			["src/gameplay/player.gd", "extends Node2D"],
			["src/ui/HealthBar.cs", "class HealthBar : Godot.Control { }"],
		]);
		const classNames = new Map<string, string>();
		const results = checkAllDependencies(files, classNames);
		expect(results.every((r) => r.passed)).toBe(true);
	});
});
