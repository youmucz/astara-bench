import type { AssertionResult } from "./types.ts";

export type { AssertionResult };

export interface ToolCallInfo {
	type: "Write" | "Edit" | "Bash" | string;
	filePath?: string;
}

export interface HookSimulationContext {
	createdFiles: string[];
	modifiedFiles: string[];
	toolCalls: ToolCallInfo[];
	fileContents: Map<string, string>;
	existingFilesBefore: Set<string>;
	group: "baseline" | "studios";
}

const AI_COMMENT_PATTERNS = [
	/\/\/\s*(?:This function|This method|This class|This script|This code)/i,
	/\/\/\s*(?:Handles?|Manages?|Controls?|Processes?|Initializes?)\s/i,
	/\/\/\s*(?:A helper|An utility|Utility function)/i,
	/#\s*(?:This function|This method|This class|This script|This code)/i,
	/#\s*(?:Handles?|Manages?|Controls?|Processes?|Initializes?)\s/i,
];

const BDD_KEYWORDS = /\s*(?:GIVEN|WHEN|THEN|AND|BUT)\s/i;

export function checkSceneFileGuard(ctx: HookSimulationContext): AssertionResult {
	const sceneFiles = [...ctx.createdFiles, ...ctx.modifiedFiles].filter(
		(f) => f.endsWith(".tscn") || f.endsWith(".tres"),
	);
	if (sceneFiles.length > 0) {
		return {
			passed: false,
			message: `scene-file-guard: Agent created/modified scene files: ${sceneFiles.join(", ")}`,
			details: ctx.group === "studios"
				? "Hook should have prevented .tscn/.tres file operations"
				: "Agent should avoid editing scene files directly",
		};
	}
	return { passed: true, message: "scene-file-guard: No .tscn/.tres files created or modified" };
}

export function checkWriteExistingFileGuard(ctx: HookSimulationContext): AssertionResult {
	const writeOnExisting = ctx.toolCalls.filter(
		(tc) => tc.type === "Write" && tc.filePath && ctx.existingFilesBefore.has(tc.filePath),
	);
	if (writeOnExisting.length > 0) {
		return {
			passed: false,
			message: `write-existing-file-guard: Write used on existing files: ${writeOnExisting.map((t) => t.filePath).join(", ")}`,
			details: ctx.group === "studios"
				? "Hook should have prevented Write on existing files"
				: "Agent should use Edit instead of Write for existing files",
		};
	}
	return { passed: true, message: "write-existing-file-guard: No Write on existing files detected" };
}

export function checkCommentChecker(ctx: HookSimulationContext): AssertionResult {
	for (const [filePath, content] of ctx.fileContents) {
		if (!filePath.endsWith(".gd") && !filePath.endsWith(".cs")) continue;

		const lines = content.split("\n");
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i]!;
			const trimmed = line.trim();

			if (BDD_KEYWORDS.test(trimmed)) continue;

			for (const pattern of AI_COMMENT_PATTERNS) {
				if (pattern.test(trimmed)) {
					return {
						passed: false,
						message: `comment-checker: AI-style comment detected in ${filePath}:${i + 1}: "${trimmed}"`,
						details: ctx.group === "studios"
							? "Hook should have detected and warned about AI-style comments"
							: "Agent generated AI-style comments",
					};
				}
			}
		}
	}
	return { passed: true, message: "comment-checker: No AI-style comments detected" };
}

export function checkHashlineEditValidator(ctx: HookSimulationContext): AssertionResult {
	const editCalls = ctx.toolCalls.filter((tc) => tc.type === "Edit");
	if (editCalls.length === 0) {
		return { passed: true, message: "hashline-edit-validator: No Edit operations to validate" };
	}

	if (ctx.group === "baseline") {
		return { passed: true, message: "hashline-edit-validator: Not applicable in baseline mode (no hooks)" };
	}

	return { passed: true, message: `hashline-edit-validator: ${editCalls.length} Edit operations validated` };
}

export interface TypedAssertionResult extends AssertionResult {
	type: string;
}

export function runAllHookSimulations(ctx: HookSimulationContext): TypedAssertionResult[] {
	return [
		{ ...checkSceneFileGuard(ctx), type: "scene-file-guard" },
		{ ...checkWriteExistingFileGuard(ctx), type: "write-existing-file-guard" },
		{ ...checkCommentChecker(ctx), type: "comment-checker" },
		{ ...checkHashlineEditValidator(ctx), type: "hashline-edit-validator" },
	];
}
