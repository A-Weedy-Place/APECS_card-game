/** Async boundary: local preview keeps SQLite; hosted instances share Postgres. */
import { GameError } from "@/game/errors";
import type * as Local from "./store";
type Store = typeof Local;
async function backend() {
  if (process.env.DATABASE_URL) return import("./postgres-store");
  if (process.env.VERCEL) throw new GameError("Hosted database is not configured.", 503);
  return import("./store");
}
async function call<K extends keyof Store>(name: K, ...args: Store[K] extends (...args: infer A) => unknown ? A : never): Promise<Store[K] extends (...args: never[]) => infer R ? Awaited<R> : never> {
  const store = await backend();
  // Both adapters implement the same public contracts; SQLite stays synchronous for archived tests.
  const fn = store[name] as (...values: unknown[]) => unknown;
  return await fn(...args) as never;
}
export const startRun = (...args: Parameters<Store["startRun"]>) => call("startRun", ...args);
export const getRun = (...args: Parameters<Store["getRun"]>) => call("getRun", ...args);
export const actOnRun = (...args: Parameters<Store["actOnRun"]>) => call("actOnRun", ...args);
export const attemptStatus = (...args: Parameters<Store["attemptStatus"]>) => call("attemptStatus", ...args);
export const resetAttempts = (...args: Parameters<Store["resetAttempts"]>) => call("resetAttempts", ...args);
export const resetPlayerAttempts = (...args: Parameters<Store["resetPlayerAttempts"]>) => call("resetPlayerAttempts", ...args);
export const adminRecords = (...args: Parameters<Store["adminRecords"]>) => call("adminRecords", ...args);
export const adminRun = (...args: Parameters<Store["adminRun"]>) => call("adminRun", ...args);
export const adminActivity = (...args: Parameters<Store["adminActivity"]>) => call("adminActivity", ...args);
export const editRecord = (...args: Parameters<Store["editRecord"]>) => call("editRecord", ...args);
export const deleteRecord = (...args: Parameters<Store["deleteRecord"]>) => call("deleteRecord", ...args);
export const moderate = (...args: Parameters<Store["moderate"]>) => call("moderate", ...args);
export const leaderboard = (...args: Parameters<Store["leaderboard"]>) => call("leaderboard", ...args);
export const displayUrl = () => call("displayUrl");
export const setDisplayUrl = (value: string) => call("setDisplayUrl", value);
export const modelSettings = (...args: Parameters<Store["modelSettings"]>) => call("modelSettings", ...args);
export const modelStatus = (...args: Parameters<Store["modelStatus"]>) => call("modelStatus", ...args);
export const saveModelStatus = (...args: Parameters<Store["saveModelStatus"]>) => call("saveModelStatus", ...args);
export const rateLimit = (...args: Parameters<Store["rateLimit"]>) => call("rateLimit", ...args);
