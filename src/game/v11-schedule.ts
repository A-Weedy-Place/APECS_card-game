export const V11_VERSION = "prototype-0.11";
export const V12_VERSION = "prototype-0.12";
export const V13_VERSION = "prototype-0.13";
export const STAGED_VERSIONS: readonly string[] = [V11_VERSION, V12_VERSION, V13_VERSION];

function schedule(roundsPerStage: number) {
  const labels = Array.from({ length: 3 * roundsPerStage }, (_, i) => String(i + 1));
  const firstBreak = roundsPerStage;
  const secondBreak = roundsPerStage * 2 + 1;
  labels.splice(firstBreak, 0, "★");
  labels.splice(secondBreak, 0, "★");
  return { labels, firstBreak, secondBreak, policyRounds: roundsPerStage * 3 };
}

const nineRounds = schedule(3);
const twelveRounds = schedule(4);
export const V11_ROUND_LABELS = nineRounds.labels;
export const stagedRules = (version: string) => STAGED_VERSIONS.includes(version);
export const stageSchedule = (version: string) => version === V12_VERSION || version === V13_VERSION ? twelveRounds : nineRounds;

export function stageArcade(version: string, round: number) {
  const { firstBreak, secondBreak } = stageSchedule(version);
  if (round === firstBreak) return "flight";
  if (round === secondBreak) return "cleanup";
  return null;
}

export function stageNumber(version: string, round: number) {
  const { firstBreak, secondBreak } = stageSchedule(version);
  return round <= firstBreak ? 1 : round <= secondBreak ? 2 : 3;
}

export const stageRoundLabel = (version: string, round: number) => stageSchedule(version).labels[round] ?? "Complete";
