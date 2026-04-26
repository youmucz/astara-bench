import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import type { ScenarioResult } from "./bench-runner.ts";

export interface ReportData {
	timestamp: string;
	model: string;
	mode: string;
	category: string;
	runs: number;
	scenarios: ScenarioResult[];
	scenarioWeights: Record<string, number>;
}

export interface BaselineEntry {
	scenarioId: string;
	group: "baseline" | "studios";
	avgScore: number;
	stdScore: number;
	minScore: number;
	maxScore: number;
	runs: number;
}

export interface BaselineData {
	version: number;
	timestamp: string;
	model: string;
	entries: BaselineEntry[];
}

function aggregateByScenario(results: ScenarioResult[]): Map<string, ScenarioResult[]> {
	const map = new Map<string, ScenarioResult[]>();
	for (const r of results) {
		const key = `${r.scenarioId}:${r.group}`;
		if (!map.has(key)) map.set(key, []);
		map.get(key)!.push(r);
	}
	return map;
}

function calcStats(scores: number[]): { avg: number; std: number; min: number; max: number } {
	if (scores.length === 0) return { avg: 0, std: 0, min: 0, max: 0 };
	const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
	const variance = scores.reduce((sum, s) => sum + (s - avg) ** 2, 0) / scores.length;
	return { avg, std: Math.sqrt(variance), min: Math.min(...scores), max: Math.max(...scores) };
}

export function weightedCategoryScore(
	results: ScenarioResult[],
	weights: Record<string, number>,
): number {
	const grouped = new Map<string, ScenarioResult[]>();
	for (const r of results) {
		if (!grouped.has(r.scenarioId)) grouped.set(r.scenarioId, []);
		grouped.get(r.scenarioId)!.push(r);
	}
	let weightedSum = 0;
	let weightTotal = 0;
	for (const [scenarioId, res] of grouped) {
		const w = weights[scenarioId] ?? 1.0;
		const scores = res.map((r) => r.totalScore);
		const stats = calcStats(scores);
		weightedSum += stats.avg * w;
		weightTotal += w;
	}
	return weightTotal > 0 ? weightedSum / weightTotal : 0;
}

export function detectRegression(
	currentAvg: number,
	baselineAvg: number,
	baselineStd: number,
	stdMultiplier: number,
	fallbackPercentage: number,
): boolean {
	const drop = baselineAvg - currentAvg;
	if (drop <= 0) return false;
	const threshold = baselineStd > 0.001 ? stdMultiplier * baselineStd : fallbackPercentage * baselineAvg;
	return drop > threshold;
}

export function generateJsonReport(report: ReportData): string {
	return JSON.stringify(report, (_key, value) => {
		if (value instanceof Map) return Object.fromEntries(value);
		return value;
	}, 2);
}

export function generateMarkdownReport(report: ReportData): string {
	const lines: string[] = [];
	lines.push(`# astara-bench Report`);
	lines.push(``);
	lines.push(`- **Model**: ${report.model}`);
	lines.push(`- **Mode**: ${report.mode}`);
	lines.push(`- **Category**: ${report.category}`);
	lines.push(`- **Runs**: ${report.runs}`);
	lines.push(`- **Timestamp**: ${report.timestamp}`);
	lines.push(``);

	const grouped = aggregateByScenario(report.scenarios);
	const scenarioIds = [...new Set(report.scenarios.map((r) => r.scenarioId))].sort();

	if (report.mode === "compare") {
		lines.push(`## A/B Comparison`);
		lines.push(``);
		lines.push(`| Scenario | Baseline | Studios | Delta |`);
		lines.push(`|----------|----------|---------|-------|`);
		for (const id of scenarioIds) {
			const baselineResults = grouped.get(`${id}:baseline`) ?? [];
			const studiosResults = grouped.get(`${id}:studios`) ?? [];
			const bStats = calcStats(baselineResults.map((r) => r.totalScore));
			const sStats = calcStats(studiosResults.map((r) => r.totalScore));
			const delta = sStats.avg - bStats.avg;
			const deltaStr = delta >= 0 ? `+${delta.toFixed(3)}` : delta.toFixed(3);
			lines.push(`| ${id} | ${bStats.avg.toFixed(3)} ± ${bStats.std.toFixed(3)} | ${sStats.avg.toFixed(3)} ± ${sStats.std.toFixed(3)} | ${deltaStr} |`);
		}
	} else {
		lines.push(`## Scores`);
		lines.push(``);
		lines.push(`| Scenario | Score | Det | Struct | Hook | Status |`);
		lines.push(`|----------|-------|-----|--------|------|--------|`);
		for (const id of scenarioIds) {
			const results = report.scenarios.filter((r) => r.scenarioId === id);
			const stats = calcStats(results.map((r) => r.totalScore));
			const detStats = calcStats(results.map((r) => r.deterministicScore));
			const structStats = calcStats(results.map((r) => r.structuralScore));
			const hookStats = calcStats(results.map((r) => r.hookSimulationScore));
			const status = results[0]?.result.status ?? "unknown";
			lines.push(`| ${id} | ${stats.avg.toFixed(3)} | ${detStats.avg.toFixed(3)} | ${structStats.avg.toFixed(3)} | ${hookStats.avg.toFixed(3)} | ${status} |`);
		}
	}

	lines.push(``);
	lines.push(`## Weighted Category Score`);
	lines.push(``);
	const weighted = weightedCategoryScore(report.scenarios, report.scenarioWeights);
	lines.push(`**Score**: ${weighted.toFixed(3)}`);
	lines.push(``);

	return lines.join("\n");
}

export function loadBaseline(filePath: string): BaselineData | null {
	if (!existsSync(filePath)) return null;
	try {
		return JSON.parse(readFileSync(filePath, "utf-8"));
	} catch {
		return null;
	}
}

export function saveBaseline(filePath: string, data: BaselineData): void {
	writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export function generateBaselineFromResults(
	results: ScenarioResult[],
	model: string,
): BaselineData {
	const grouped = aggregateByScenario(results);
	const entries: BaselineEntry[] = [];
	for (const [key, res] of grouped) {
		const [scenarioId, group] = key.split(":") as [string, "baseline" | "studios"];
		const scores = res.map((r) => r.totalScore);
		const stats = calcStats(scores);
		entries.push({
			scenarioId,
			group,
			avgScore: stats.avg,
			stdScore: stats.std,
			minScore: stats.min,
			maxScore: stats.max,
			runs: res.length,
		});
	}
	return {
		version: 1,
		timestamp: new Date().toISOString(),
		model,
		entries,
	};
}

export function writeReports(report: ReportData, outputDir: string): void {
	mkdirSync(outputDir, { recursive: true });
	writeFileSync(join(outputDir, "latest.json"), generateJsonReport(report));
	writeFileSync(join(outputDir, "latest.md"), generateMarkdownReport(report));
}
