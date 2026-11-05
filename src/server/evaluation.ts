import type { RunState } from "@/game/types";
import { validateModelResult } from "./model-result";
import { MODEL_PROFILE } from "@/game/policy-catalogue";
export type EvaluationRow = { status: "queued" | "running" | "failed" | "complete"; result: string | null; error: string | null; updated_at: string };
export function evaluationFromRow(row: EvaluationRow | undefined, settings: Record<string, number>,profile=MODEL_PROFILE): NonNullable<RunState["modelEvaluation"]> {
  if (!row) return { status: "idle" };
  if ((row.status === "running" || row.status === "queued") && Date.now() - Date.parse(row.updated_at) > (row.status === "running" ? 240000 : 1860000)) return { status: "failed", error: "Evaluation was interrupted. Retry." };
  if (row.status === "complete") {
    let result: unknown;
    try { result = JSON.parse(row.result ?? "null"); } catch { return { status: "failed", error: "Model cache could not be read. Retry." }; }
    if (!validateModelResult(result, settings,profile)) return { status: "failed", error: "Model readback did not match this scenario." };
    return { status: "complete", temperatureC: result.temperatureC, modelVersion: result.modelVersion, sourceUrl: result.sourceUrl, evaluatedAt: result.evaluatedAt, provider: result.provider };
  }
  return { status: row.status, ...(row.error ? { error: row.error } : {}) };
}
