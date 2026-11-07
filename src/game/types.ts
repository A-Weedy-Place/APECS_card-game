import type { ClimateLeverSetting } from "./climate-levers";

export type Category = "technology" | "politics" | "economics" | "justice" | "awareness" | "nature";
export type Phase = "Foundation" | "Momentum" | "Transformation";
export type Resources = { credits: number; economy: number; support: number; awareness: number; justice: number };
export type Effects = Partial<Resources> & { transition?: number };
export type Card = {
  id: string; title: string; description: string; category: Category;
  cost: number; difficulty: number; phases: Phase[]; effects: Effects;
  note: string; icon: string; requires?: string;
  pathway?: string; tier?: 1 | 2 | 3; requiresAny?: string[]; requiresAll?: string[];
  minRound?: number; repeatable?: boolean; role?: "enabler" | "action";
  resilience?: number; upkeep?: number;
  rarity?: "rare"; risk?: string;
};
export type Decision = {
  year: number; cardId: string; title: string; category: Category | "save";
  accepted: boolean; probability: number; roll?: number; spent: number;
  refund: number; income: number; transition: number; effects: Effects;
  unlockedPerks?: string[];
  decay?: Effects;
  unlockedSynergies?: string[]; resilience?: number; upkeep?: number;
  /** Version 0.5 records adoption in 2026; this is a negotiation round, not a year. */
  planningRound?: number; kind?: "policy" | "round-end" | "special";
  surprise?: { title: string; effects: Effects }; challengeScore?: number;
};
export type Projection = {
  kind: "illustrative" | "model" | "pending"; model: string; version: string;
  pressure?: number; trajectory: { year: number; pressure: number }[];
  temperatureC?: number; caveat: string;
};
export type RunState = {
  id: string; nickname: string; country: string; seed: number;
  rulesVersion: string; round: number; revision: number; resources: Resources;
  transition: number; offers: string[]; history: Decision[];
  startedAt: string; finishedAt: string | null; score: number | null;
  projection: Projection;
  redrawsUsed?: number;
  redrawsThisTurn?: number; resilience?: number;
  lastActions?: Decision[];
  elapsedMs?: number; policySettings?: Record<string,number>; electionMandate?: boolean;
  modelEvaluation?: { status:"idle"|"queued"|"running"|"failed"|"complete";temperatureC?:number;modelVersion?:string;sourceUrl?:string;evaluatedAt?:string;provider?:string;error?:string };
  specialAttempt?: { kind: SpecialKind; reward: RewardStat; startedAt: number };
};
export type RewardStat = "credits" | "economy" | "support" | "awareness" | "justice";
export type SpecialKind = "flight" | "pulse" | "cleanup";
export type SpecialCommand = { kind: "begin-special"; reward: RewardStat } | { kind: "finish-special"; frames: number[]; endFrame: number; moves?: import("./arcade").SwimMove[] };
export type Perk = { id: Category; title: string; description: string; count: number; active: boolean };
export type WorldEvent = { id: string; title: string; description: string; icon: string };
export type OfferedCard = Card & { approval: number; affordable: boolean; baseCost: number; bonuses: string[]; transitionGain: number; mandateCost?: number; rejectionRefund?: number; rejectionSupport?: number; climateInputs?: ClimateLeverSetting[]; climateNote?: string };
export type LibraryCard = OfferedCard & { lockedReason: string | null; taken: boolean };
export type Pathway = { id: string; title: string; description: string };
export type Synergy = { id: string; title: string; description: string };
export type SynergyRecipe = Synergy & { requires: string[]; active: boolean };
export type ScoreComponent = { label: string; value: number; max: number };
export type PublicRun = Omit<RunState, "seed" | "offers"> & { offers: OfferedCard[]; phase: Phase; year: number; nextIncome: number; perks: Perk[]; worldEvent: WorldEvent | null; canRedraw: boolean; years?: number[]; totalRounds?: number; redrawCost?: number; library?: LibraryCard[]; pathways?: Pathway[]; activeSynergies?: Synergy[]; synergyLibrary?: SynergyRecipe[]; scoreBreakdown?: ScoreComponent[]; upkeep?: number; transitionTarget?: number; planningYear?: number; resultYear?: number; canEndRound?: boolean; playedThisRound?: number; roundSaveBonus?: number; climateScenario?: ClimateLeverSetting[]; specialRound?: SpecialKind | null; generalApproval?: number; bankLimit?: number };
export type LeaderboardEntry = { id: string; nickname: string; country: string; score: number; finishedAt: string; rulesVersion?: string; hidden?: boolean;temperatureC?:number;elapsedMs?:number;manualRank?:number };
export type AttemptStatus = { used: number; remaining: number; limit: number };
export type AdminRecord = { id: string; nickname: string; country: string; score: number | null; originalScore: number | null; hidden: boolean; deleted: boolean; finishedAt: string | null; startedAt: string; round: number; rulesVersion: string; revision: number;temperatureC?:number;elapsedMs?:number;manualRank?:number;playsUsed?:number };
export type AdminData = { entries: LeaderboardEntry[]; records: AdminRecord[]; total: number; page: number; pages: number; stats: { runs: number; completed: number; hidden: number; deleted: number } };
export type AdminActivity = {
  attempts: AttemptStatus | null;
  games: { id: string; nickname: string; startedAt: string; finishedAt: string | null }[];
  events: { id: string; kind: string; at: string | null; summary: string }[];
  audit: { id: string; action: string; createdAt: string; changes: unknown }[];
};
