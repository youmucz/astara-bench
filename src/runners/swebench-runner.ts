import { loadInstances, filterInstances, type SwebenchInstance, type SwebenchFilter } from "../swebench/loader.ts";
import { checkoutInstance, applyPatch, cleanupWorktree } from "../swebench/repo-manager.ts";
import { runTests, type TestResult } from "../swebench/test-executor.ts";
import type { OpencodeClient } from "@opencode-ai/sdk";
import { execSync } from "child_process";
import { join } from "path";
import { mkdirSync } from "fs";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

export interface SwebenchConfig {
	dataset: string;
	instancesDir: string;
	reposDir: string;
	maxInstances: number;
	timeoutMs: number;
}

export interface SwebenchInstanceResult {
	instanceId: string;
	repo: string;
	group: "baseline" | "studios";
	sessionId: string;
	patch: string;
	testResult: TestResult;
	resolveRate: number;
	duration: number;
	status: "success" | "timeout" | "error" | "patch_failed";
	error?: string;
}

export interface SwebenchRepoSummary {
	repo: string;
	instances: number;
	resolved: number;
	resolveRate: number;
	avgDuration: number;
}

function extractPatchFromDiff(workDir: string): string {
	try {
		return execSync("git diff HEAD", { cwd: workDir, stdio: "pipe" }).toString();
	} catch {
		return "";
	}
}

export async function runSwebenchInstance(
	client: OpencodeClient,
	instance: SwebenchInstance,
	reposDir: string,
	timeoutMs: number,
	group: "baseline" | "studios",
): Promise<SwebenchInstanceResult> {
	const startTime = Date.now();
	const tempDir = join(tmpdir(), `sweb-instance-${randomUUID()}`);
	mkdirSync(tempDir, { recursive: true });

	let sessionId = "";

	try {
		checkoutInstance(reposDir, instance.repo, instance.base_commit, tempDir);

		const createResult = await client.session.create();
		const sessionData = createResult.data as Record<string, unknown> | undefined;
		sessionId = (sessionData?.id as string) ?? "";

		const promptText = `Repository: ${instance.repo}\nIssue:\n${instance.problem_statement}\n${instance.hints_text ? `\nHints:\n${instance.hints_text}` : ""}\n\nPlease fix this issue. Make minimal changes.`;

		const promptPromise = client.session.prompt({
			path: { id: sessionId },
			body: { parts: [{ type: "text" as const, text: promptText }] },
		});

		const result = await Promise.race([
			promptPromise,
			new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
		]);

		if (result === null) {
			if (sessionId) {
				await client.session.abort({ path: { id: sessionId } }).catch(() => {});
			}
			return {
				instanceId: instance.instance_id,
				repo: instance.repo,
				group,
				sessionId,
				patch: "",
				testResult: { passed: false, resolveRate: 0, totalF2P: 0, passedF2P: 0, totalP2P: 0, passedP2P: 0, output: "", env: "dry-run" },
				resolveRate: 0,
				duration: Date.now() - startTime,
				status: "timeout",
			};
		}

		const patch = extractPatchFromDiff(tempDir);

		if (!patch || patch.trim().length === 0) {
			return {
				instanceId: instance.instance_id,
				repo: instance.repo,
				group,
				sessionId,
				patch: "",
				testResult: { passed: false, resolveRate: 0, totalF2P: 0, passedF2P: 0, totalP2P: 0, passedP2P: 0, output: "No patch generated", env: "dry-run" },
				resolveRate: 0,
				duration: Date.now() - startTime,
				status: "error",
				error: "Agent generated no changes",
			};
		}

		const patchApplied = applyPatch(tempDir, patch);
		if (!patchApplied) {
			return {
				instanceId: instance.instance_id,
				repo: instance.repo,
				group,
				sessionId,
				patch,
				testResult: { passed: false, resolveRate: 0, totalF2P: 0, passedF2P: 0, totalP2P: 0, passedP2P: 0, output: "Patch apply failed", env: "dry-run" },
				resolveRate: 0,
				duration: Date.now() - startTime,
				status: "patch_failed",
			};
		}

		const testResult = runTests(tempDir, instance.repo);
		const resolveRate = testResult.resolveRate;

		return {
			instanceId: instance.instance_id,
			repo: instance.repo,
			group,
			sessionId,
			patch,
			testResult,
			resolveRate,
			duration: Date.now() - startTime,
			status: "success",
		};
	} catch (err) {
		return {
			instanceId: instance.instance_id,
			repo: instance.repo,
			group,
			sessionId,
			patch: "",
			testResult: { passed: false, resolveRate: 0, totalF2P: 0, passedF2P: 0, totalP2P: 0, passedP2P: 0, output: "", env: "dry-run" },
			resolveRate: 0,
			duration: Date.now() - startTime,
			status: "error",
			error: String(err),
		};
	} finally {
		if (sessionId) {
			await client.session.delete({ path: { id: sessionId } }).catch(() => {});
		}
		try {
			cleanupWorktree(tempDir);
		} catch {}
	}
}

export function summarizeByRepo(results: SwebenchInstanceResult[]): SwebenchRepoSummary[] {
	const repoMap = new Map<string, SwebenchInstanceResult[]>();
	for (const r of results) {
		if (!repoMap.has(r.repo)) repoMap.set(r.repo, []);
		repoMap.get(r.repo)!.push(r);
	}

	const summaries: SwebenchRepoSummary[] = [];
	for (const [repo, instances] of repoMap) {
		const resolved = instances.filter((i) => i.resolveRate === 1.0).length;
		const avgDuration = instances.reduce((s, i) => s + i.duration, 0) / instances.length;
		summaries.push({
			repo,
			instances: instances.length,
			resolved,
			resolveRate: instances.length > 0 ? resolved / instances.length : 0,
			avgDuration,
		});
	}

	return summaries.sort((a, b) => a.repo.localeCompare(b.repo));
}

export async function runSwebench(
	client: OpencodeClient,
	config: SwebenchConfig,
	group: "baseline" | "studios",
	filter?: SwebenchFilter,
	limit?: number,
): Promise<SwebenchInstanceResult[]> {
	const instancesPath = join(config.instancesDir, "instances.json");
	const allInstances = loadInstances(instancesPath);
	const selected = filterInstances(allInstances, filter, limit ?? config.maxInstances);

	const results: SwebenchInstanceResult[] = [];
	for (let i = 0; i < selected.length; i++) {
		const instance = selected[i];
		console.log(`  [${i + 1}/${selected.length}] ${instance.instance_id}`);
		const result = await runSwebenchInstance(client, instance, config.reposDir, config.timeoutMs, group);
		results.push(result);
	}

	return results;
}
