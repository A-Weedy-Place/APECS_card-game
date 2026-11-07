import { defaultSettings, POLICY_BY_ID, POLICY_CARDS, type PolicyCardV9 } from "./policy-catalogue";
import { V11_BY_ID, V11_CARDS } from "./v11-catalogue";
import { stagedRules, V13_VERSION } from "./v11-schedule";
import { V13_CARDS, V13_BY_ID } from "./v13-catalogue";

export const stagedCatalogue = (version: string) => version === V13_VERSION
  ? { cards: V13_CARDS, byId: V13_BY_ID }
  : { cards: V11_CARDS, byId: V11_BY_ID };

export const catalogueFor = (version: string) => stagedRules(version)
  ? stagedCatalogue(version)
  : { cards: POLICY_CARDS, byId: POLICY_BY_ID };

/** Reconstruct both current and saved model packages using their distinct card IDs. */
export function settingsFor(history: { cardId: string; accepted: boolean; kind?: string }[]) {
  const settings = defaultSettings();
  for (const action of history) {
    const card: PolicyCardV9 | undefined = V11_BY_ID.get(action.cardId) ?? POLICY_BY_ID.get(action.cardId);
    if (action.kind === "policy" && action.accepted && card?.factor) settings[card.factor] = card.target!;
  }
  return settings;
}
