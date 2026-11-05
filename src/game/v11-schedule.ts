export const V11_ROUND_LABELS = ["1", "2", "3", "★", "4", "5", "6", "★", "7", "8", "9"];
export const v11Arcade = (round: number) => round === 3 ? "flight" as const : round === 7 ? "cleanup" as const : null;
export const v11Stage = (round: number) => round < 4 ? 1 : round < 8 ? 2 : 3;
export const v11RoundLabel = (round: number) => V11_ROUND_LABELS[round] ?? "Complete";
