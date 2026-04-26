import { execSync } from "child_process";
import { existsSync, mkdirSync, writeFileSync, unlinkSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

export function getRepoCacheDir(reposDir: string, repo: string): string {
	const safe = repo.replace(/\//g, "__");
	return join(reposDir, safe);
}

export function ensureRepoCached(reposDir: string, repo: string): string {
	const cacheDir = getRepoCacheDir(reposDir, repo);
	const githubUrl = `https://github.com/${repo}.git`;

	if (!existsSync(cacheDir)) {
		mkdirSync(cacheDir, { recursive: true });
		execSync(`git clone --bare --filter=blob:none ${githubUrl} "${cacheDir}"`, {
			stdio: "pipe",
			timeout: 300000,
		});
	} else {
		try {
			execSync("git fetch --all --prune", { cwd: cacheDir, stdio: "pipe", timeout: 120000 });
		} catch {
			console.warn(`Failed to fetch updates for ${repo}, using cached version`);
		}
	}

	return cacheDir;
}

export function checkoutInstance(
	reposDir: string,
	repo: string,
	baseCommit: string,
	workDir: string,
): string {
	const cacheDir = ensureRepoCached(reposDir, repo);
	execSync(`git --git-dir="${cacheDir}" worktree add "${workDir}" ${baseCommit}`, {
		stdio: "pipe",
		timeout: 60000,
	});
	return workDir;
}

export function cleanupWorktree(workDir: string): void {
	try {
		execSync(`git worktree remove "${workDir}" --force`, { stdio: "pipe", timeout: 30000 });
	} catch {
		console.warn(`Failed to clean up worktree: ${workDir}`);
	}
}

export function applyPatch(workDir: string, patch: string): boolean {
	if (!patch || patch.trim().length === 0) return false;
	const patchFile = join(tmpdir(), `astara-bench-patch-${Date.now()}.diff`);
	writeFileSync(patchFile, patch);
	try {
		execSync(`git apply --verbose "${patchFile}"`, { cwd: workDir, stdio: "pipe", timeout: 30000 });
		return true;
	} catch {
		return false;
	} finally {
		try { unlinkSync(patchFile); } catch {}
	}
}

export function resetWorkdir(workDir: string): void {
	try {
		execSync("git checkout .", { cwd: workDir, stdio: "pipe" });
		execSync("git clean -fd", { cwd: workDir, stdio: "pipe" });
	} catch {
		console.warn(`Failed to reset workdir: ${workDir}`);
	}
}

export function invalidateRepoCache(reposDir: string, repo: string): void {
	const cacheDir = getRepoCacheDir(reposDir, repo);
	if (existsSync(cacheDir)) {
		rmSync(cacheDir, { recursive: true, force: true });
	}
}
