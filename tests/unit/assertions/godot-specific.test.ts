import { describe, expect, test } from "bun:test";
import {
	checkInitNoChildAccess,
	checkPhysicsInPhysicsProcess,
	checkSignalDisconnect,
	checkExportForConfigurable,
	checkOnreadyForNodeRefs,
	checkAllGodotRules,
} from "../../../src/assertions/godot-specific.ts";

describe("godot-specific: _init no child access", () => {
	test("_init accessing $ fails", () => {
		expect(checkInitNoChildAccess("func _init():\n\t$Sprite2D.visible = true").passed).toBe(false);
	});

	test("_init without child access passes", () => {
		expect(checkInitNoChildAccess("func _init():\n\tspeed = 100").passed).toBe(true);
	});

	test("_ready with child access passes", () => {
		expect(checkInitNoChildAccess("func _ready():\n\t$Sprite2D.visible = true").passed).toBe(true);
	});
});

describe("godot-specific: physics in _physics_process", () => {
	test("move_and_slide in _process fails", () => {
		expect(checkPhysicsInPhysicsProcess("func _process(delta):\n\tmove_and_slide()").passed).toBe(false);
	});

	test("move_and_slide in _physics_process passes", () => {
		expect(checkPhysicsInPhysicsProcess("func _physics_process(delta):\n\tmove_and_slide()").passed).toBe(true);
	});

	test("no move_and_slide passes", () => {
		expect(checkPhysicsInPhysicsProcess("func _process(delta): pass").passed).toBe(true);
	});
});

describe("godot-specific: signal disconnect", () => {
	test("connected with _exit_tree disconnect passes", () => {
		const code = `
signal.finished.connect(_on_finished)
func _exit_tree():
	finished.disconnect(_on_finished)`;
		expect(checkSignalDisconnect(code).passed).toBe(true);
	});

	test("connected without _exit_tree fails", () => {
		const code = `health.changed.connect(_on_changed)`;
		expect(checkSignalDisconnect(code).passed).toBe(false);
	});

	test("no connections passes", () => {
		expect(checkSignalDisconnect("func _ready(): pass").passed).toBe(true);
	});
});

describe("godot-specific: @export for configurable", () => {
	test("numeric var with @export passes", () => {
		expect(checkExportForConfigurable("@export var speed: float = 300.0").passed).toBe(true);
	});

	test("numeric var without @export fails", () => {
		expect(checkExportForConfigurable("var speed: float = 300.0").passed).toBe(false);
	});

	test("no numeric vars passes", () => {
		expect(checkExportForConfigurable("var label := \"hello\"").passed).toBe(true);
	});
});

describe("godot-specific: @onready for node refs", () => {
	test("@onready for $ reference passes", () => {
		expect(checkOnreadyForNodeRefs("@onready var sprite = $Sprite2D").passed).toBe(true);
	});

	test("$ reference without @onready fails", () => {
		expect(checkOnreadyForNodeRefs("var sprite = $Sprite2D").passed).toBe(false);
	});

	test("no $ references passes", () => {
		expect(checkOnreadyForNodeRefs("var x := 1").passed).toBe(true);
	});
});

describe("godot-specific: checkAllGodotRules", () => {
	test("clean code passes all", () => {
		const code = `extends CharacterBody2D
@export var speed: float = 300.0
@onready var sprite = $Sprite2D
func _ready(): pass
func _physics_process(delta): move_and_slide()`;
		const results = checkAllGodotRules(code);
		expect(results.every((r) => r.passed)).toBe(true);
	});
});
