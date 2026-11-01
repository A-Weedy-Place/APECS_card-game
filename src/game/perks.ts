import type { Category, Perk, RunState, WorldEvent } from "./types";

export const FAMILY_INFO: Record<Category, { title: string; description: string; icon: string; specialty: string; art: number }> = {
  technology: { title: "Engineering network", description: "Technology cards cost 1 less credit.", icon: "atom", specialty: "Build clean systems", art: 0 },
  politics: { title: "Strong mandate", description: "+8 approval points on every policy.", icon: "handshake", specialty: "Win political support", art: 1 },
  economics: { title: "Patient capital", description: "+1 credit income each new decade.", icon: "bank", specialty: "Finance the transition", art: 2 },
  justice: { title: "Social compact", description: "Support no longer decays. Rejections refund 90%.", icon: "scale", specialty: "Share benefits fairly", art: 3 },
  awareness: { title: "Informed public", description: "+5 approval points on every policy.", icon: "book", specialty: "Build understanding", art: 4 },
  nature: { title: "Living landscapes", description: "+3 transition points on future nature cards.", icon: "trees", specialty: "Protect living systems", art: 5 },
};
export const FAMILY_ORDER: Category[] = ["technology", "politics", "economics", "justice", "awareness", "nature"];
export function strategicRules(state: RunState) { return state.rulesVersion === "prototype-0.3"; }
export function modernRules(state: RunState) { return strategicRules(state) || state.rulesVersion === "prototype-0.2"; }
export function familyInfoFor(state: Pick<RunState, "rulesVersion">, id: Category) {
  const original = FAMILY_INFO[id];
  if (["prototype-0.7","prototype-0.8"].includes(state.rulesVersion)) {
    const descriptions: Record<Category,string> = {
      technology: "Technology costs 1 less coin.",
      politics: "+8 action approval; actions spend 2 less political support.",
      economics: "+1 coin income per round, within the income and purse limits.",
      justice: "Rejected actions refund 75% instead of 50%.",
      awareness: "Awareness decays 1 point per round instead of 2.",
      nature: "+2 base climate-action points on later nature actions.",
    };
    return { ...original, description: descriptions[id] };
  }
  if (["prototype-0.4", "prototype-0.5", "prototype-0.6"].includes(state.rulesVersion)) {
    const descriptions: Record<Category, string> = {
      technology: "Technology costs 1 less credit.",
      politics: "+5 approval; actions spend 1 less support.",
      economics: "+1 income each turn, before infrastructure upkeep.",
      justice: "Rejected actions refund 75% instead of 50%.",
      awareness: "Awareness decays 1 per turn instead of 2.",
      nature: "+2 base transition on later nature actions.",
    };
    return { ...original, description: descriptions[id] };
  }
  if (state.rulesVersion !== "prototype-0.3") return original;
  const descriptions: Record<Category, string> = {
    technology: "Technology costs 2 less credits.",
    politics: "+10 approval. Major policies spend 3 less political support.",
    economics: "+2 credits income every decade.",
    justice: "Support decay halves. Rejections refund 75% instead of 50%.",
    awareness: "Awareness decay stops. +5 approval on all policies.",
    nature: "+4 transition on future nature cards.",
  };
  return { ...original, description: descriptions[id] };
}
export function perksFor(state: RunState): Perk[] {
  return FAMILY_ORDER.map(id => {
    const count = state.history.filter(h => h.accepted && h.category === id).length;
    return { id, title: FAMILY_INFO[id].title, description: familyInfoFor(state, id).description, count, active: modernRules(state) && count >= 2 };
  });
}
export function hasPerk(state: RunState, category: Category) { return modernRules(state) && state.history.filter(h => h.accepted && h.category === category).length >= 2; }
export function eventFor(state: RunState): WorldEvent | null {
  if (!modernRules(state) || state.finishedAt) return null;
  if (state.round === 2) return { id: "spotlight", title: "The world is listening", description: "Public attention surges. Politics, justice and awareness cards get +6 approval points this decade.", icon: "megaphone" };
  if (state.round === 5) return { id: "supply", title: "Supply-chain squeeze", description: state.resources.economy >= 75 ? "Your strong economy absorbs the squeeze. Technology costs stay unchanged." : "Technology costs +1 credit this decade. An economy of 75 or more absorbs the surcharge.", icon: "factory" };
  return null;
}
