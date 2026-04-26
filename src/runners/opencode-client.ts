import { spawn, type ChildProcess } from "child_process";
import { createOpencodeClient, type OpencodeClient } from "@opencode-ai/sdk";

export interface ServerConfig {
	port: number;
	cwd: string;
	startupTimeoutMs: number;
	healthRetryCount: number;
	healthRetryIntervalMs: number;
}

export interface DualClients {
	baseline: OpencodeClient;
	studios: OpencodeClient;
	baselineProcess?: ChildProcess;
	studiosProcess?: ChildProcess;
}

async function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth(
	client: OpencodeClient,
	retryCount: number,
	retryIntervalMs: number,
): Promise<boolean> {
	for (let i = 0; i < retryCount; i++) {
		try {
			const result = await client.config.get();
			if (result.data) return true;
		} catch {
			await sleep(retryIntervalMs);
		}
	}
	return false;
}

async function findAvailablePort(startPort: number, maxPort: number = startPort + 100): Promise<number> {
	if (startPort > maxPort) throw new Error(`No available port found in range ${startPort - 100}-${maxPort}`);
	const { createServer } = await import("net");
	return new Promise((resolve) => {
		const server = createServer();
		server.listen(startPort, () => {
			const addr = server.address();
			server.close(() => {
				resolve(typeof addr === "object" && addr ? addr.port : startPort);
			});
		});
		server.on("error", () => {
			resolve(findAvailablePort(startPort + 1, maxPort));
		});
	});
}

export async function startServer(config: ServerConfig): Promise<{ client: OpencodeClient; process: ChildProcess }> {
	const port = await findAvailablePort(config.port);

	const proc = spawn("opencode", ["serve", "--port", String(port)], {
		cwd: config.cwd,
		stdio: ["pipe", "pipe", "pipe"],
		detached: false,
	});

	const baseUrl = `http://127.0.0.1:${port}`;
	const client = createOpencodeClient({ baseUrl });

	const healthy = await waitForHealth(
		client,
		config.healthRetryCount,
		config.healthRetryIntervalMs,
	);

	if (!healthy) {
		proc.kill();
		throw new Error(`opencode server on port ${port} did not become healthy within timeout`);
	}

	return { client, process: proc };
}

export async function connectToServer(baseUrl: string, retryCount: number, retryIntervalMs: number): Promise<OpencodeClient> {
	const client = createOpencodeClient({ baseUrl });
	const healthy = await waitForHealth(client, retryCount, retryIntervalMs);
	if (!healthy) {
		throw new Error(`Cannot connect to opencode server at ${baseUrl}`);
	}
	return client;
}

export async function setupDualClients(config: {
	baselineConfig: ServerConfig;
	studiosConfig: ServerConfig;
	baselineUrl?: string;
	studiosUrl?: string;
}): Promise<DualClients> {
	const [baselineResult, studiosResult] = await Promise.all([
		config.baselineUrl
			? connectToServer(config.baselineUrl, config.baselineConfig.healthRetryCount, config.baselineConfig.healthRetryIntervalMs).then((client) => ({ client, process: undefined }))
			: startServer(config.baselineConfig),
		config.studiosUrl
			? connectToServer(config.studiosUrl, config.studiosConfig.healthRetryCount, config.studiosConfig.healthRetryIntervalMs).then((client) => ({ client, process: undefined }))
			: startServer(config.studiosConfig),
	]);

	return {
		baseline: baselineResult.client,
		studios: studiosResult.client,
		baselineProcess: baselineResult.process,
		studiosProcess: studiosResult.process,
	};
}

export function shutdownClients(clients: DualClients): void {
	clients.baselineProcess?.kill();
	clients.studiosProcess?.kill();
}
