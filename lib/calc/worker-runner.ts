import path from "node:path";
import { Worker } from "node:worker_threads";
import type { SimulationInput, SimulationResult } from "@/lib/types/simulation";
import { runSimulation } from "@/lib/calc/engine";

export async function runSimulationInWorker(
  input: SimulationInput
): Promise<SimulationResult> {
  try {
    return await spawnWorker(input);
  } catch {
    const fallback = runSimulation(input);
    fallback.trace.warnings.push(
      "No se pudo usar worker thread; se ejecutó el cálculo en el proceso principal."
    );
    return fallback;
  }
}

async function spawnWorker(input: SimulationInput): Promise<SimulationResult> {
  const workerPath = path.join(process.cwd(), "workers", "simulation-worker.ts");

  return new Promise<SimulationResult>((resolve, reject) => {
    const worker = new Worker(workerPath, {
      workerData: input,
      execArgv: ["--import", "tsx"]
    });

    worker.once("message", (message: SimulationResult | { error: string }) => {
      if ("error" in message) {
        reject(new Error(message.error));
        return;
      }
      resolve(message);
    });

    worker.once("error", (error) => reject(error));
    worker.once("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`Worker finalizó con código ${code}`));
      }
    });
  });
}
