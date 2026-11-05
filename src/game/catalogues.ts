import { defaultSettings, POLICY_BY_ID, POLICY_CARDS, type PolicyCardV9 } from "./policy-catalogue";
import { V11_BY_ID, V11_CARDS } from "./v11-catalogue";

export const catalogueFor = (version: string) => version === "prototype-0.11"
  ? { cards: V11_CARDS, byId: V11_BY_ID }
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
