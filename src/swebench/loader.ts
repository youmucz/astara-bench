import { readFileSync, existsSync } from "fs";

export interface SwebenchInstance {
	instance_id: string;
	repo: string;
	pull_number?: number;
	base_commit: string;
	problem_statement: string;
	hints_text?: string;
	created_at?: string;
	test_patch: string;
	patch: string;
	version?: string;
}

export interface SwebenchFilter {
	repo?: string;
	version?: string;
	createdAfter?: string;
	createdBefore?: string;
}

export function loadInstances(filePath: string): SwebenchInstance[] {
	if (!existsSync(filePath)) {
		throw new Error(`SWE-bench instances file not found: ${filePath}`);
	}
	const raw = readFileSync(filePath, "utf-8");
	let data: unknown;
	try {
		data = JSON.parse(raw);
	} catch {
		throw new Error(`Invalid JSON in SWE-bench instances file: ${filePath}`);
	}
	if (!Array.isArray(data)) {
		throw new Error("SWE-bench instances must be a JSON array");
	}
	const instances: SwebenchInstance[] = [];
	for (let i = 0; i < data.length; i++) {
		const item = data[i] as Record<string, unknown>;
		if (!item.instance_id || !item.repo || !item.base_commit || !item.problem_statement) {
			console.warn(`Skipping SWE-bench instance at index ${i}: missing required fields`);
			continue;
		}
		instances.push({
			instance_id: item.instance_id as string,
			repo: item.repo as string,
			pull_number: typeof item.pull_number === "number" ? item.pull_number : undefined,
			base_commit: item.base_commit as string,
			problem_statement: item.problem_statement as string,
			hints_text: typeof item.hints_text === "string" ? item.hints_text : undefined,
			created_at: typeof item.created_at === "string" ? item.created_at : undefined,
			test_patch: (item.test_patch as string) ?? "",
			patch: (item.patch as string) ?? "",
			version: typeof item.version === "string" ? item.version : undefined,
		});
	}
	return instances;
}

export function filterInstances(
	instances: SwebenchInstance[],
	filter?: SwebenchFilter,
	limit?: number,
): SwebenchInstance[] {
	let result = instances;

	if (filter?.repo) {
		result = result.filter((i) => i.repo === filter.repo);
	}
	if (filter?.version) {
		result = result.filter((i) => i.version === filter.version);
	}
	if (filter?.createdAfter) {
		result = result.filter((i) => i.created_at && i.created_at >= filter.createdAfter!);
	}
	if (filter?.createdBefore) {
		result = result.filter((i) => i.created_at && i.created_at <= filter.createdBefore!);
	}

	if (limit && limit > 0) {
		result = result.slice(0, limit);
	}

	return result;
}
