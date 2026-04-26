import type { AssertionResult } from "./types.ts";

export type { AssertionResult };

const INIT_ACCESS_CHILD_RE = /func\s+_init\s*\([^)]*\)[^{]*?(?:\$|get_node\s*\()/s;
const PHYSICS_IN_PROCESS_RE = /func\s+_process\s*\([^)]*\)[^{]*?move_and_slide\s*\(/s;
const EXIT_TREE_DISCONNECT_RE = /func\s+_exit_tree/;
const EXPORT_MARK_RE = /@export/;

export function checkInitNoChildAccess(content: string): AssertionResult {
	if (INIT_ACCESS_CHILD_RE.test(content)) {
		return {
			passed: false,
			message: "_init() should not access child nodes — use _ready() instead (children not yet available in _init)",
		};
	}
	return { passed: true, message: "No child node access in _init()" };
}

export function checkPhysicsInPhysicsProcess(content: string): AssertionResult {
	if (PHYSICS_IN_PROCESS_RE.test(content)) {
		return {
			passed: false,
			message: "move_and_slide() in _process() — physics operations should be in _physics_process()",
		};
	}
	return { passed: true, message: "Physics operations correctly placed" };
}

export function checkSignalDisconnect(content: string): AssertionResult {
	const connects = content.match(/\.connect\s*\(/g);
	if (!connects || connects.length === 0) return { passed: true, message: "No signal connections to check" };

	const hasExitTree = EXIT_TREE_DISCONNECT_RE.test(content);
	const disconnects = (content.match(/\.disconnect\s*\(/g) || []).length;

	if (hasExitTree && disconnects >= connects.length) {
		return { passed: true, message: "Signals disconnected in _exit_tree" };
	}

	if (!hasExitTree && connects.length > 0) {
		return {
			passed: false,
			message: "Signals connected but no _exit_tree() with disconnect() — potential memory leak",
		};
	}

	if (disconnects < connects.length) {
		return {
			passed: false,
			message: `Not all signals disconnected (${disconnects}/${connects.length}) in _exit_tree`,
		};
	}

	return { passed: true, message: "Signal disconnect handling OK" };
}

export function checkExportForConfigurable(content: string): AssertionResult {
	const hasNumericVars = /\bvar\s+\w+\s*:\s*(?:float|int)\s*=\s*\d/.test(content);
	const hasExport = EXPORT_MARK_RE.test(content);

	if (hasNumericVars && !hasExport) {
		return {
			passed: false,
			message: "Configurable properties found without @export annotation — use @export for inspector-visible values",
		};
	}
	return { passed: true, message: "Configurable properties properly annotated with @export" };
}

export function checkOnreadyForNodeRefs(content: string): AssertionResult {
	const dollarRefs = content.match(/\$\w+/g);
	if (!dollarRefs || dollarRefs.length === 0) return { passed: true, message: "No direct node references found" };

	const hasOnready = /@onready/.test(content);
	if (!hasOnready) {
		return {
			passed: false,
			message: "Node references found without @onready — use @onready to cache node references",
		};
	}
	return { passed: true, message: "Node references properly cached with @onready" };
}

export function checkAllGodotRules(content: string): AssertionResult[] {
	return [
		checkInitNoChildAccess(content),
		checkPhysicsInPhysicsProcess(content),
		checkSignalDisconnect(content),
		checkExportForConfigurable(content),
		checkOnreadyForNodeRefs(content),
	];
}
