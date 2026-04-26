import type { AssertionResult } from "./types.ts";

export type { AssertionResult };

const HARDCODED_PATH_RE = /get_node\s*\(\s*["']\/root\//g;
const FREE_NOT_QUEUE_FREE_RE = /\.free\s*\(\s*\)/g;
const LOAD_IN_PROCESS_RE = /func\s+_process\s*\([^)]*\)[^{]*?(?:load|preload)\s*\(/s;
const MAGIC_NUMBER_IN_PHYSICS_RE = /func\s+_physics_process\s*\([^)]*\)[^{]*?(?:velocity\.[xy]\s*[+\-*/]?=\s*|\bvelocity\s*=\s*Vector[23]\s*\([^)]*\))\s*(?:\d+\.?\d*)/s;
const EMPTY_PROCESS_RE = /func\s+_process\s*\([^)]*\)\s*:\s*(?:#[^\n]*)?\s*pass\s*(?:\n|$)/;
const FIND_CHILD_IN_LOOP_RE = /(?:for|while)[^:]*:[^}]*?find_child\s*\(/s;

export function checkHardcodedPaths(content: string): AssertionResult {
	if (HARDCODED_PATH_RE.test(content)) {
		return {
			passed: false,
			message: "Hardcoded node path detected (get_node(\"/root/...\")), use groups or relative paths instead",
		};
	}
	return { passed: true, message: "No hardcoded node paths detected" };
}

export function checkFreeVsQueueFree(content: string): AssertionResult {
	let match: RegExpExecArray | null;
	const re = new RegExp(FREE_NOT_QUEUE_FREE_RE.source, "g");
	while ((match = re.exec(content)) !== null) {
		const idx = match.index;
		const before = content.substring(Math.max(0, idx - 6), idx);
		if (!before.endsWith("queue_")) {
			return {
				passed: false,
				message: "Direct free() detected — use queue_free() instead to avoid dangling references",
			};
		}
	}
	return { passed: true, message: "No direct free() calls (only queue_free)" };
}

export function checkLoadInProcess(content: string): AssertionResult {
	if (LOAD_IN_PROCESS_RE.test(content)) {
		return {
			passed: false,
			message: "load()/preload() detected inside _process() — should be cached or moved to _ready()",
		};
	}
	return { passed: true, message: "No load/preload in _process" };
}

export function checkMagicNumbers(content: string): AssertionResult {
	if (MAGIC_NUMBER_IN_PHYSICS_RE.test(content)) {
		const hasConstants = /\bconst\s+/.test(content);
		if (!hasConstants) {
			return {
				passed: false,
				message: "Magic numbers in physics calculations — define constants for readability",
			};
		}
	}
	return { passed: true, message: "No magic numbers detected in physics" };
}

export function checkEmptyProcess(content: string): AssertionResult {
	if (EMPTY_PROCESS_RE.test(content)) {
		return {
			passed: false,
			message: "Empty _process() function detected — remove if not needed, or implement logic",
		};
	}
	return { passed: true, message: "No empty _process() detected" };
}

export function checkFindChildInLoop(content: string): AssertionResult {
	if (FIND_CHILD_IN_LOOP_RE.test(content)) {
		return {
			passed: false,
			message: "find_child() called inside loop — cache the reference before the loop",
		};
	}
	return { passed: true, message: "No find_child() in loops detected" };
}

export function checkAllProhibitedPatterns(content: string): AssertionResult[] {
	return [
		checkHardcodedPaths(content),
		checkFreeVsQueueFree(content),
		checkLoadInProcess(content),
		checkMagicNumbers(content),
		checkEmptyProcess(content),
		checkFindChildInLoop(content),
	];
}

const BARE_EXCEPT_RE = /\bexcept\s*:/g;
const MUTABLE_DEFAULT_RE = /def\s+\w+\s*\([^)]*\w+\s*=\s*(\[\s*\]|\{\s*\}|set\s*\(\s*\))/g;

export function checkBareExcept(content: string): AssertionResult {
	if (BARE_EXCEPT_RE.test(content)) {
		return {
			passed: false,
			message: "Bare except detected — specify the exception type (e.g., except ValueError:)",
		};
	}
	return { passed: true, message: "No bare except detected" };
}

export function checkMutableDefaultArg(content: string): AssertionResult {
	if (MUTABLE_DEFAULT_RE.test(content)) {
		return {
			passed: false,
			message: "Mutable default argument detected — use None as default and initialize inside the function",
		};
	}
	return { passed: true, message: "No mutable default arguments detected" };
}

export function checkAllPythonPatterns(content: string): AssertionResult[] {
	return [
		checkBareExcept(content),
		checkMutableDefaultArg(content),
	];
}
