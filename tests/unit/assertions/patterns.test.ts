import { describe, expect, test } from "bun:test";
import {
	checkHardcodedPaths,
	checkFreeVsQueueFree,
	checkLoadInProcess,
	checkMagicNumbers,
	checkEmptyProcess,
	checkFindChildInLoop,
	checkAllProhibitedPatterns,
} from "../../../src/assertions/patterns.ts";

describe("patterns: hardcoded paths", () => {
	test("hardcoded get_node fails", () => {
		expect(checkHardcodedPaths('get_node("/root/Main/Player")').passed).toBe(false);
	});

	test("relative path passes", () => {
		expect(checkHardcodedPaths('get_node("Sprite2D")').passed).toBe(true);
	});

	test("groups-based access passes", () => {
		expect(checkHardcodedPaths('get_tree().get_first_node_in_group("player")').passed).toBe(true);
	});
});

describe("patterns: free vs queue_free", () => {
	test("free() fails", () => {
		expect(checkFreeVsQueueFree("enemy.free()").passed).toBe(false);
	});

	test("queue_free() passes", () => {
		expect(checkFreeVsQueueFree("enemy.queue_free()").passed).toBe(true);
	});

	test("mixed free and queue_free still detects", () => {
		expect(checkFreeVsQueueFree("a.free(); b.queue_free()").passed).toBe(false);
	});
});

describe("patterns: load in _process", () => {
	test("load in _process fails", () => {
		const code = `func _process(delta):\n\tvar s = load("res://bullet.tscn")`;
		expect(checkLoadInProcess(code).passed).toBe(false);
	});

	test("load in _ready passes", () => {
		const code = `func _ready():\n\tvar s = load("res://bullet.tscn")`;
		expect(checkLoadInProcess(code).passed).toBe(true);
	});

	test("no load at all passes", () => {
		expect(checkLoadInProcess("func _process(delta): pass").passed).toBe(true);
	});
});

describe("patterns: magic numbers", () => {
	test("magic number without const fails", () => {
		const code = `func _physics_process(delta):\n\tvelocity.x = 300.0`;
		expect(checkMagicNumbers(code).passed).toBe(false);
	});

	test("no magic numbers passes", () => {
		expect(checkMagicNumbers("var x := 1").passed).toBe(true);
	});

	test("with const definition may pass", () => {
		const code = `const SPEED := 300.0\nfunc _physics_process(delta):\n\tvelocity.x = SPEED`;
		expect(checkMagicNumbers(code).passed).toBe(true);
	});
});

describe("patterns: empty _process", () => {
	test("empty _process fails", () => {
		expect(checkEmptyProcess("func _process(delta):\n\tpass").passed).toBe(false);
	});

	test("_process with logic passes", () => {
		expect(checkEmptyProcess("func _process(delta):\n\tcounter += 1").passed).toBe(true);
	});

	test("no _process passes", () => {
		expect(checkEmptyProcess("func _ready(): pass").passed).toBe(true);
	});
});

describe("patterns: find_child in loop", () => {
	test("find_child in for loop fails", () => {
		expect(checkFindChildInLoop("for i in range(10):\n\tfind_child('item')").passed).toBe(false);
	});

	test("find_child outside loop passes", () => {
		expect(checkFindChildInLoop("var item = find_child('item')").passed).toBe(true);
	});

	test("no find_child passes", () => {
		expect(checkFindChildInLoop("for i in range(10): pass").passed).toBe(true);
	});
});

describe("patterns: checkAllProhibitedPatterns", () => {
	test("clean code passes all", () => {
		const code = `extends Node2D\nconst SPEED := 300.0\nfunc _ready(): pass\nfunc _process(delta): counter += 1`;
		const results = checkAllProhibitedPatterns(code);
		expect(results.every((r) => r.passed)).toBe(true);
	});
});
