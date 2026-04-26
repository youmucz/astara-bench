import type { AssertionResult } from "./types.ts";

export type { AssertionResult };

const LAYERS: Record<string, number> = {
	ui: 0,
	gameplay: 1,
	framework: 2,
	engine: 3,
};

function inferLayer(filePath: string): string | null {
	const normalized = filePath.replace(/\\/g, "/").toLowerCase();
	if (normalized.includes("/ui/") || normalized.includes("/hud/") || normalized.includes("/gui/")) return "ui";
	if (normalized.includes("/gameplay/") || normalized.includes("/entities/") || normalized.includes("/actors/")) return "gameplay";
	if (normalized.includes("/framework/") || normalized.includes("/core/") || normalized.includes("/systems/")) return "framework";
	if (normalized.includes("/engine/")) return "engine";
	return null;
}

const PRELOAD_RE = /preload\s*\(\s*["']([^"']+)["']\s*\)/g;
const EXTENDS_RE = /^extends\s+(\w+)/gm;

const BUILTIN_TYPES = new Set([
	"Node", "Node2D", "Node3D", "Control", "CharacterBody2D", "CharacterBody3D",
	"RigidBody2D", "RigidBody3D", "StaticBody2D", "StaticBody3D", "Area2D", "Area3D",
	"Sprite2D", "Sprite3D", "AnimatedSprite2D", "AnimatedSprite3D", "CollisionShape2D",
	"CollisionShape3D", "Camera2D", "Camera3D", "TileMap", "TileMapLayer", "Label",
	"Button", "TextureRect", "ProgressBar", "HBoxContainer", "VBoxContainer",
	"Panel", "ColorRect", "Resource", "RefCounted", "Object", "Variant",
	"Vector2", "Vector3", "Vector2i", "Vector3i", "Color", "Rect2", "Transform2D",
	"Transform3D", "Dictionary", "Array", "String", "int", "float", "bool",
	"Signal", "Callable", "PackedScene", "SceneTree", "Timer",
	"AudioStreamPlayer", "AudioStreamPlayer2D", "NavigationAgent2D", "NavigationAgent3D",
	"Input", "InputEvent", "ProjectSettings", "ConfigFile", "FileAccess",
	"DirAccess", "OS", "Engine", "PhysicsDirectSpaceState2D",
	"KinematicCollision2D", "Rid",
]);

export function checkDependencyDirection(
	sourceFile: string,
	sourceContent: string,
	allClassNames: Map<string, string>,
): AssertionResult[] {
	const results: AssertionResult[] = [];
	const sourceLayer = inferLayer(sourceFile);

	if (!sourceLayer) {
		return [{ passed: true, message: `Cannot determine layer for "${sourceFile}", skipping dependency check` }];
	}

	const sourceLayerIdx = LAYERS[sourceLayer]!;

	let match: RegExpExecArray | null;
	const preloadRe = new RegExp(PRELOAD_RE.source, "g");
	while ((match = preloadRe.exec(sourceContent)) !== null) {
		const targetPath = match[1];
		const targetLayer = inferLayer(targetPath);
		if (targetLayer && LAYERS[targetLayer]! < sourceLayerIdx) {
			results.push({
				passed: false,
				message: `Reverse dependency: ${sourceLayer} ("${sourceFile}") → ${targetLayer} ("${targetPath}")`,
			});
		}
	}

	const extendsRe = new RegExp(EXTENDS_RE.source, "gm");
	while ((match = extendsRe.exec(sourceContent)) !== null) {
		const parentClass = match[1];
		if (BUILTIN_TYPES.has(parentClass)) continue;
		const parentPath = allClassNames.get(parentClass);
		if (parentPath) {
			const parentLayer = inferLayer(parentPath);
			if (parentLayer && LAYERS[parentLayer]! < sourceLayerIdx) {
				results.push({
					passed: false,
					message: `Reverse dependency: ${sourceLayer} extends ${parentClass} (${parentLayer} layer)`,
				});
			}
		}
	}

	if (sourceFile.endsWith(".cs")) {
		const usingRe = /using\s+([\w.]+);/g;
		while ((match = usingRe.exec(sourceContent)) !== null) {
			const ns = match[1];
			const nsLower = ns.toLowerCase();
			const targetLayer = inferLayer(nsLower + "/");
			if (targetLayer && LAYERS[targetLayer]! < sourceLayerIdx) {
				results.push({
					passed: false,
					message: `Reverse dependency: ${sourceLayer} ("${sourceFile}") → ${targetLayer} (using ${ns})`,
				});
			}
		}

		const csInheritRe = /class\s+\w+\s*:\s*(\w+)/g;
		while ((match = csInheritRe.exec(sourceContent)) !== null) {
			const parentClass = match[1];
			if (BUILTIN_TYPES.has(parentClass)) continue;
			const parentPath = allClassNames.get(parentClass);
			if (parentPath) {
				const parentLayer = inferLayer(parentPath);
				if (parentLayer && LAYERS[parentLayer]! < sourceLayerIdx) {
					results.push({
						passed: false,
						message: `Reverse dependency: ${sourceLayer} inherits ${parentClass} (${parentLayer} layer)`,
					});
				}
			}
		}
	}

	if (results.length === 0) {
		results.push({ passed: true, message: `Dependency direction OK for "${sourceFile}" (${sourceLayer} layer)` });
	}

	return results;
}

export function checkAllDependencies(
	files: Map<string, string>,
	classLocations: Map<string, string>,
): AssertionResult[] {
	const results: AssertionResult[] = [];
	for (const [filePath, content] of files) {
		if (!filePath.endsWith(".gd") && !filePath.endsWith(".cs")) continue;
		results.push(...checkDependencyDirection(filePath, content, classLocations));
	}
	return results;
}
