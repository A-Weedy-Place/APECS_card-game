export const V11_VERSION = "prototype-0.11";
export const V12_VERSION = "prototype-0.12";

function schedule(roundsPerStage: number) {
  const labels = Array.from({ length: 3 * roundsPerStage }, (_, i) => String(i + 1));
  const firstBreak = roundsPerStage;
  const secondBreak = roundsPerStage * 2 + 1;
  labels.splice(firstBreak, 0, "★");
  labels.splice(secondBreak, 0, "★");
  return { labels, firstBreak, secondBreak, policyRounds: roundsPerStage * 3 };
}

const schedules = { [V11_VERSION]: schedule(3), [V12_VERSION]: schedule(4) };
export const V11_ROUND_LABELS = schedules[V11_VERSION].labels;
export const stagedRules = (version: string) => version === V11_VERSION || version === V12_VERSION;
export const stageSchedule = (version: string) => schedules[version === V12_VERSION ? V12_VERSION : V11_VERSION];

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
