import { parentPort, workerData } from "node:worker_threads";
import type { SimulationInput } from "../lib/types/simulation";
import { runSimulation } from "../lib/calc/engine";

function main(): void {
  if (!parentPort) {
    return;
  }

  try {
    const input = workerData as SimulationInput;
    const result = runSimulation(input);
    parentPort.postMessage(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido en worker";
    parentPort.postMessage({ error: message });
  }
}

main();
