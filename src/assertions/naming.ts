import type { AssertionResult } from "./types.ts";

export type { AssertionResult };

const SNAKE_CASE_RE = /^[a-z][a-z0-9]*(_[a-z0-9]+)*\.gd$/;
const PASCAL_CASE_RE = /^[A-Z][a-zA-Z0-9]*\.cs$/;
const CLASS_NAME_PASCAL_RE = /\bclass_name\s+([a-zA-Z][a-zA-Z0-9]*)/g;
const SCREAMING_SNAKE_RE = /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/;
const GD_VAR_RE = /\bvar\s+(\w+)/g;
const GD_CONST_RE = /\bconst\s+(\w+)/g;
const GD_SIGNAL_RE = /\bsignal\s+(\w+)/g;
const GD_FUNC_RE = /\bfunc\s+(\w+)/g;
const GD_ENUM_RE = /\benum\s+([A-Z][a-zA-Z0-9]*)/g;

function isSnakeCase(s: string): boolean {
	return /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/.test(s);
}

function isScreamingSnakeCase(s: string): boolean {
	return SCREAMING_SNAKE_RE.test(s);
}

export function checkGDScriptFileName(fileName: string): AssertionResult {
	if (SNAKE_CASE_RE.test(fileName)) {
		return { passed: true, message: `GDScript file name "${fileName}" follows snake_case.gd convention` };
	}
	return { passed: false, message: `GDScript file name "${fileName}" must be snake_case.gd (Godot official convention)` };
}

export function checkGDScriptClassNames(content: string): AssertionResult[] {
	const results: AssertionResult[] = [];
	const matches = content.matchAll(CLASS_NAME_PASCAL_RE);
	for (const match of matches) {
		const className = match[1];
		if (/^[A-Z][a-zA-Z0-9]*$/.test(className)) {
			results.push({ passed: true, message: `class_name "${className}" follows PascalCase` });
		} else {
			results.push({ passed: false, message: `class_name "${className}" must be PascalCase` });
		}
	}
	if (results.length === 0) {
		results.push({ passed: true, message: "No class_name declarations found (optional)" });
	}
	return results;
}

export function checkGDScriptVariables(content: string): AssertionResult[] {
	const results: AssertionResult[] = [];
	let match: RegExpExecArray | null;
	const re = new RegExp(GD_VAR_RE.source, "g");
	while ((match = re.exec(content)) !== null) {
		const varName = match[1];
		if (isSnakeCase(varName) || varName.startsWith("_")) {
			const bare = varName.startsWith("_") ? varName.slice(1) : varName;
			if (varName.startsWith("_") && bare.length > 0 && !isSnakeCase(bare)) {
				results.push({ passed: false, message: `Variable "${varName}" private prefix must be _snake_case` });
			} else {
				results.push({ passed: true, message: `Variable "${varName}" follows snake_case` });
			}
		} else {
			results.push({ passed: false, message: `Variable "${varName}" must be snake_case (or _snake_case for private)` });
		}
	}
	return results;
}

export function checkGDScriptConstants(content: string): AssertionResult[] {
	const results: AssertionResult[] = [];
	let match: RegExpExecArray | null;
	const re = new RegExp(GD_CONST_RE.source, "g");
	while ((match = re.exec(content)) !== null) {
		const constName = match[1];
		if (isScreamingSnakeCase(constName)) {
			results.push({ passed: true, message: `Constant "${constName}" follows SCREAMING_SNAKE_CASE` });
		} else {
			results.push({ passed: false, message: `Constant "${constName}" must be SCREAMING_SNAKE_CASE` });
		}
	}
	return results;
}

export function checkGDScriptSignals(content: string): AssertionResult[] {
	const results: AssertionResult[] = [];
	let match: RegExpExecArray | null;
	const re = new RegExp(GD_SIGNAL_RE.source, "g");
	while ((match = re.exec(content)) !== null) {
		const signalName = match[1];
		if (isSnakeCase(signalName)) {
			results.push({ passed: true, message: `Signal "${signalName}" follows snake_case` });
		} else {
			results.push({ passed: false, message: `Signal "${signalName}" must be snake_case` });
		}
	}
	return results;
}

export function checkGDScriptFunctions(content: string): AssertionResult[] {
	const results: AssertionResult[] = [];
	let match: RegExpExecArray | null;
	const re = new RegExp(GD_FUNC_RE.source, "g");
	while ((match = re.exec(content)) !== null) {
		const funcName = match[1];
		if (isSnakeCase(funcName)) {
			results.push({ passed: true, message: `Function "${funcName}" follows snake_case` });
		} else if (funcName.startsWith("_")) {
			const bare = funcName.slice(1);
			if (bare.length > 0 && isSnakeCase(bare)) {
				results.push({ passed: true, message: `Function "${funcName}" follows _snake_case` });
			} else {
				results.push({ passed: false, message: `Function "${funcName}" private prefix must be _snake_case` });
			}
		} else {
			results.push({ passed: false, message: `Function "${funcName}" must be snake_case` });
		}
	}
	return results;
}

export function checkGDScriptEnums(content: string): AssertionResult[] {
	const results: AssertionResult[] = [];
	let match: RegExpExecArray | null;
	const re = new RegExp(GD_ENUM_RE.source, "g");
	while ((match = re.exec(content)) !== null) {
		const enumName = match[1];
		if (/^[A-Z][a-zA-Z0-9]*$/.test(enumName)) {
			results.push({ passed: true, message: `Enum "${enumName}" follows PascalCase` });
		} else {
			results.push({ passed: false, message: `Enum "${enumName}" must be PascalCase` });
		}
	}
	return results;
}

export function checkGDScriptNaming(fileName: string, content: string): AssertionResult[] {
	const results: AssertionResult[] = [];
	results.push(checkGDScriptFileName(fileName));
	results.push(...checkGDScriptClassNames(content));
	results.push(...checkGDScriptVariables(content));
	results.push(...checkGDScriptConstants(content));
	results.push(...checkGDScriptSignals(content));
	results.push(...checkGDScriptFunctions(content));
	results.push(...checkGDScriptEnums(content));
	return results;
}

const CS_CLASS_RE = /\b(?:class|struct|interface)\s+([A-Z][a-zA-Z0-9]*)/g;
const CS_PRIVATE_FIELD_RE = /private\s+(?:readonly\s+)?(?:\w+(?:<[^>]+>)?\s+)(\w+)/g;
const CS_METHOD_RE = /(?:public|private|protected|internal)\s+(?:\w+(?:<[^>]+>)?\s+)(\w+)\s*\(/g;
const CS_PARAM_RE = /(?:public|private|protected|internal)?\s*\w+(?:<[^>]+>)?\s+\w+\s*\(([^)]*)\)/g;
const CS_DELEGATE_RE = /\[Signal\][\s\S]*?delegate\s+void\s+(\w+)/g;

export function checkCSharpFileName(fileName: string): AssertionResult {
	if (PASCAL_CASE_RE.test(fileName)) {
		return { passed: true, message: `C# file name "${fileName}" follows PascalCase.cs convention` };
	}
	return { passed: false, message: `C# file name "${fileName}" must be PascalCase.cs` };
}

export function checkCSharpClassNames(content: string): AssertionResult[] {
	const results: AssertionResult[] = [];
	let match: RegExpExecArray | null;
	const re = new RegExp(CS_CLASS_RE.source, "g");
	while ((match = re.exec(content)) !== null) {
		const className = match[1];
		if (/^[A-Z][a-zA-Z0-9]*$/.test(className)) {
			results.push({ passed: true, message: `C# class "${className}" follows PascalCase` });
		} else {
			results.push({ passed: false, message: `C# class "${className}" must be PascalCase` });
		}
	}
	return results;
}

export function checkCSharpPrivateFields(content: string): AssertionResult[] {
	const results: AssertionResult[] = [];
	let match: RegExpExecArray | null;
	const re = new RegExp(CS_PRIVATE_FIELD_RE.source, "g");
	while ((match = re.exec(content)) !== null) {
		const fieldName = match[1];
		if (fieldName.startsWith("_") && /^[a-z]/.test(fieldName.slice(1))) {
			results.push({ passed: true, message: `Private field "${fieldName}" follows _camelCase` });
		} else if (fieldName.startsWith("_")) {
			results.push({ passed: false, message: `Private field "${fieldName}" must follow _camelCase (lowercase after underscore)` });
		} else {
			results.push({ passed: false, message: `Private field "${fieldName}" must be _camelCase (missing underscore prefix)` });
		}
	}
	return results;
}

export function checkCSharpMethods(content: string): AssertionResult[] {
	const results: AssertionResult[] = [];
	let match: RegExpExecArray | null;
	const re = new RegExp(CS_METHOD_RE.source, "g");
	while ((match = re.exec(content)) !== null) {
		const methodName = match[1];
		if (/^[A-Z][a-zA-Z0-9]*$/.test(methodName)) {
			results.push({ passed: true, message: `Method "${methodName}" follows PascalCase` });
		} else {
			results.push({ passed: false, message: `Method "${methodName}" must be PascalCase` });
		}
	}
	return results;
}

export function checkCSharpParameters(content: string): AssertionResult[] {
	const results: AssertionResult[] = [];
	let match: RegExpExecArray | null;
	const re = new RegExp(CS_PARAM_RE.source, "g");
	while ((match = re.exec(content)) !== null) {
		const params = match[1];
		if (!params.trim()) continue;
		for (const param of params.split(",")) {
			const trimmed = param.trim();
			if (!trimmed) continue;
			const parts = trimmed.split(/\s+/);
			const paramName = parts[parts.length - 1];
			if (/^[a-z][a-zA-Z0-9]*$/.test(paramName)) {
				results.push({ passed: true, message: `Parameter "${paramName}" follows camelCase` });
			} else {
				results.push({ passed: false, message: `Parameter "${paramName}" must be camelCase` });
			}
		}
	}
	return results;
}

export function checkCSharpDelegates(content: string): AssertionResult[] {
	const results: AssertionResult[] = [];
	let match: RegExpExecArray | null;
	const re = new RegExp(CS_DELEGATE_RE.source, "g");
	while ((match = re.exec(content)) !== null) {
		const delegateName = match[1];
		if (delegateName.endsWith("Delegate") && /^[A-Z]/.test(delegateName)) {
			results.push({ passed: true, message: `Delegate "${delegateName}" follows PascalCase + Delegate suffix` });
		} else {
			results.push({ passed: false, message: `Delegate "${delegateName}" must be PascalCase with Delegate suffix` });
		}
	}
	return results;
}

export function checkCSharpNaming(fileName: string, content: string): AssertionResult[] {
	const results: AssertionResult[] = [];
	results.push(checkCSharpFileName(fileName));
	results.push(...checkCSharpClassNames(content));
	results.push(...checkCSharpPrivateFields(content));
	results.push(...checkCSharpMethods(content));
	results.push(...checkCSharpParameters(content));
	results.push(...checkCSharpDelegates(content));
	return results;
}

const ASSET_NAMING_ENFORCER_GD_PATTERN = /^[a-z][a-z0-9]*(_[a-z0-9]+)*\.gd$/;
const ASSET_NAMING_ENFORCER_CS_PATTERN = /^[A-Z][a-zA-Z0-9]*\.cs$/;

export function checkConsistencyWithHook(
	localPattern: RegExp,
	hookPattern: RegExp,
	typeName: string,
): AssertionResult {
	const localSource = localPattern.source;
	const hookSource = hookPattern.source;
	if (localSource === hookSource) {
		return { passed: true, message: `${typeName} naming pattern consistent with asset-naming-enforcer` };
	}
	const localTest = ASSET_NAMING_ENFORCER_GD_PATTERN.test("player_controller.gd") === localPattern.test("player_controller.gd");
	const hookTest = ASSET_NAMING_ENFORCER_GD_PATTERN.test("player_controller.gd") === hookPattern.test("player_controller.gd");
	if (localTest === hookTest) {
		return { passed: true, message: `${typeName} naming pattern functionally consistent with asset-naming-enforcer` };
	}
	return {
		passed: false,
		message: `INCONSISTENT: ${typeName} naming pattern differs from asset-naming-enforcer`,
		details: `Local: ${localSource}, Hook: ${hookSource}`,
	};
}
