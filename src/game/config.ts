import type { Phase, Resources } from "./types";
import { V12_VERSION, stagedRules, stageSchedule, stageNumber } from "./v11-schedule";

export const RULES_VERSION = V12_VERSION;
export const PLANNING_YEAR = 2026;
export const PLANNING_ROUNDS = 10;
export const LEGACY_YEARS = [2030, 2040, 2050, 2060, 2070, 2080, 2090] as const;
export const YEARS = [2030, 2035, 2040, 2045, 2050, 2055, 2060, 2065, 2070, 2075, 2080, 2085, 2090, 2095] as const;
const previousPlanningVersions = ["prototype-0.5", "prototype-0.6", "prototype-0.7", "prototype-0.8", "prototype-0.9", "prototype-0.10"];
export function yearsFor(version: string): readonly number[] {
  if (stagedRules(version)) return Array(stageSchedule(version).labels.length).fill(PLANNING_YEAR);
  if (previousPlanningVersions.includes(version)) return Array(PLANNING_ROUNDS).fill(PLANNING_YEAR);
  return version === "prototype-0.4" ? YEARS : LEGACY_YEARS;
}
export function phaseForVersion(round: number, version: string): Phase {
  if (stagedRules(version)) return (["Foundation", "Momentum", "Transformation"] as const)[stageNumber(version, round) - 1];
  if (previousPlanningVersions.includes(version)) return round < 3 ? "Foundation" : round < 7 ? "Momentum" : "Transformation";
  if (version === "prototype-0.4") return round < 4 ? "Foundation" : round < 10 ? "Momentum" : "Transformation";
  return phaseFor(round);
}
export const INITIAL_RESOURCES: Resources = { credits: 10, economy: 55, support: 70, awareness: 30, justice: 25 };
export const SAVE_BONUS = 2;
export function phaseFor(round: number): Phase { return round < 2 ? "Foundation" : round < 5 ? "Momentum" : "Transformation"; }
export function incomeFor(economy: number) { return 2 + Math.floor(Math.max(0, Math.min(100, economy)) / 25); }
export const CATEGORY_LABELS = { technology: "Technology", politics: "Politics", economics: "Economics", justice: "Climate justice", awareness: "Awareness", nature: "Nature" };
