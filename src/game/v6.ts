import { GameError } from "./errors";
import { projectFor } from "./model";
import { randomAt } from "./random";
import { challengeScore, validChallengeInput } from "./challenges";
import { climateMappingNote, combineClimateLevers } from "./climate-levers";
import { v5Action, v5Approval, v5Batch, v5Create, v5LockedReason, v5Offers, v5Preview, v5Public, v5Score, V5_CARDS } from "./v5";
import { v4Perks, v4Synergies } from "./v4";
import type { Card, Decision, Effects, OfferedCard, PublicRun, RewardStat, RunState, SpecialCommand, SpecialKind } from "./types";

export const v6Rules = (state: Pick<RunState, "rulesVersion">) => state.rulesVersion === "prototype-0.6";
export const specialFor = (round: number): SpecialKind | null => round === 3 ? "flight" : round === 6 ? "pulse" : null;
const rare = (card: Omit<Card, "phases" | "note" | "rarity">): Card => ({ ...card, rarity: "rare", phases: ["Foundation", "Momentum", "Transformation"], note: "A high-stakes game choice. The exact consequence is revealed after adoption." });
export const RARE_CARDS = [
  rare({ id: "rapid-grid", title: "The great grid leap", description: "Connect an entire region in one ambitious push.", category: "technology", pathway: "power", tier: 3, role: "action", cost: 12, difficulty: 18, effects: { transition: 35, economy: 12 }, icon: "plug", risk: "Community backlash", upkeep: 2 }),
  rare({ id: "emergency-levy", title: "Emergency climate levy", description: "Release a wave of climate finance at a political price.", category: "economics", pathway: "finance", tier: 3, role: "action", cost: 10, difficulty: 16, effects: { credits: 14, transition: 18, economy: 8 }, icon: "bank", risk: "Cost-of-living shock" }),
  rare({ id: "rewilding-leap", title: "The rewilding pact", description: "Protect a vast landscape with one sweeping agreement.", category: "nature", pathway: "land", tier: 3, role: "action", cost: 11, difficulty: 15, effects: { transition: 32, justice: 12 }, resilience: 12, icon: "leaf", risk: "Land-use conflict" }),
];
export const V6_CARDS = [...V5_CARDS, ...RARE_CARDS];
const rareIds = new Set(RARE_CARDS.map(card => card.id));
const adopted = (state: RunState, id: string) => state.history.some(h => h.kind === "policy" && h.accepted && h.cardId === id);
const apply = (state: RunState, effects: Effects) => { for (const key of ["credits", "economy", "support", "awareness", "justice"] as const) state.resources[key] = Math.max(0, Math.min(key === "credits" ? 999 : 100, state.resources[key] + (effects[key] ?? 0))); };
export function v6Offers(state: RunState, exclude: string[] = []) {
  if (specialFor(state.round) || state.finishedAt) return [];
  const offers = v5Offers(state, exclude.filter(id => !rareIds.has(id)));
  const available = RARE_CARDS.filter(card => !adopted(state, card.id) && !exclude.includes(card.id));
  const chance = randomAt(state.seed, 910000 + state.round * 101 + (state.redrawsUsed ?? 0));
  if (available.length && state.round >= 2 && (state.round === 4 || chance < .19)) offers[2] = available[Math.floor(randomAt(state.seed, 920000 + state.round + (state.redrawsUsed ?? 0) * 11) * available.length)].id;
  return offers;
}
export function v6Create(id: string, nickname: string, country: string, seed: number): RunState {
  const state = v5Create(id, nickname, country, seed);
  state.rulesVersion = "prototype-0.6"; state.resources.credits = 14; state.projection = projectFor([], state.rulesVersion); state.offers = v6Offers(state);
  return state;
}
export function v6Preview(state: RunState, card: Card): OfferedCard {
  if (!card.rarity) return v5Preview(state, card);
  return { ...v5Preview(state, card), approval: v5Approval(state, card), climateInputs: [], climateNote: climateMappingNote(card.id) };
}
function settle(current: RunState, policies: Decision[]): RunState {
  const state = v5Action({ ...current, rulesVersion: "prototype-0.5" }, "end-round");
  state.rulesVersion = "prototype-0.6"; delete state.specialAttempt;
  state.revision = current.revision; // the whole package is one transaction/revision
  const settlement = state.history.at(-1)!;
  if (specialFor(current.round) && settlement.effects.credits) {
    state.resources.credits = Math.min(999, current.resources.credits + settlement.income); settlement.effects = {}; settlement.title = "Round complete";
  }
  state.lastActions = policies.length ? policies.map((decision, i) => i ? decision : { ...decision, income: settlement.income, ...(settlement.decay ? { decay: settlement.decay } : {}), ...(settlement.upkeep !== undefined ? { upkeep: settlement.upkeep } : {}) }) : [settlement];
  state.offers = v6Offers(state); state.projection = projectFor(state.history, state.rulesVersion);
  if (state.finishedAt) state.score = v5Score(state);
  return state;
}
export function v6Batch(current: RunState, ids: string[]): RunState {
  if (current.finishedAt || specialFor(current.round)) throw new GameError("This round is not a policy round.", 409);
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 3 || new Set(ids).size !== ids.length || ids.some(id => !current.offers.includes(id))) throw new GameError("Choose different cards in the current hand.");
  const cards = ids.map(id => V6_CARDS.find(card => card.id === id));
  if (cards.some(card => !card || (card.rarity ? adopted(current, card.id) : v5LockedReason(current, card)))) throw new GameError("That policy is not eligible.");
  const cost = cards.reduce((sum, card) => sum + v6Preview(current, card!).cost, 0);
  if (cost > current.resources.credits) throw new GameError("Not enough credits for the selected cards.");
  // Resolve ordinary cards through the preserved engine, with every quote frozen.
  const regular = ids.filter(id => !rareIds.has(id));
  let state = regular.length ? v5Batch({ ...current, rulesVersion: "prototype-0.5" }, regular) : structuredClone(current);
  state.rulesVersion = "prototype-0.6";
  const outcomes = [...(regular.length ? state.lastActions ?? [] : [])];
  for (const card of cards.filter(card => card?.rarity)) {
    const beforePerks = new Set(v4Perks(state).filter(perk => perk.active).map(perk => perk.id));
    const beforeSynergies = new Set(v4Synergies(state).map(synergy => synergy.id));
    const quote = v6Preview(current, card!);
    const accepted = randomAt(current.seed, 930000 + current.round * 113 + current.history.length) * 100 < quote.approval;
    const refund = accepted ? 0 : quote.rejectionRefund!;
    apply(state, { credits: -quote.cost + refund });
    const effects = accepted ? quote.effects : { support: -2 };
    apply(state, effects);
    const decision: Decision = { kind: "policy", planningRound: current.round + 1, year: 2026, cardId: quote.id, title: quote.title, category: quote.category, accepted, probability: quote.approval, spent: quote.cost, refund, income: 0, effects, transition: accepted ? quote.transitionGain : 0, resilience: accepted ? quote.resilience ?? 0 : 0 };
    if (accepted) {
      const side = randomAt(current.seed, 940000 + current.round * 37 + current.history.length) < .5;
      const consequence = quote.id === "rapid-grid" ? side ? { justice: -24, support: -10 } : { economy: -22 } : quote.id === "emergency-levy" ? side ? { support: -26 } : { justice: -22, economy: -10 } : side ? { economy: -24 } : { support: -24, awareness: -8 };
      decision.surprise = { title: quote.risk!, effects: consequence }; apply(state, consequence);
      state.transition += decision.transition; state.resilience = Math.min(100, (state.resilience ?? 0) + (decision.resilience ?? 0));
    }
    state.history.push(decision);
    decision.unlockedPerks = v4Perks(state).filter(perk => perk.active && !beforePerks.has(perk.id)).map(perk => perk.id);
    decision.unlockedSynergies = v4Synergies(state).filter(synergy => !beforeSynergies.has(synergy.id)).map(synergy => synergy.id);
    outcomes.push(decision);
  }
  state.revision = current.revision + 1;
  return settle(state, outcomes);
}
export function v6Action(current: RunState, id: string): RunState {
  if (current.finishedAt) throw new GameError("The game is complete.", 409);
  if (["save", "end-round", "skip-special"].includes(id)) {
    const state = structuredClone(current); state.revision++;
    // Special rounds can always be skipped; they never grant the policy saving bonus.
    if (specialFor(state.round)) state.history.push({ year: 2026, planningRound: state.round + 1, kind: "special", cardId: "special-skipped", title: "Challenge skipped", category: "save", accepted: true, probability: 100, spent: 0, refund: 0, income: 0, transition: 0, effects: {} });
    return settle(state, []);
  }
  if (id === "redraw") {
    if (specialFor(current.round)) throw new GameError("No hand to reshuffle in a challenge.");
    const state = v5Action({ ...current, rulesVersion: "prototype-0.5" }, id); state.rulesVersion = "prototype-0.6"; state.offers = v6Offers(state, current.offers); return state;
  }
  return v6Batch(current, [id]);
}
const rewards: RewardStat[] = ["credits", "economy", "support", "awareness", "justice"];
export function v6Special(current: RunState, command: SpecialCommand, now = Date.now()): RunState {
  const kind = specialFor(current.round);
  if (!v6Rules(current) || current.finishedAt || !kind) throw new GameError("No special round is active.", 409);
  if (command.kind === "begin-special") {
    if (current.specialAttempt || !rewards.includes(command.reward)) throw new GameError("Choose a reward before starting; one attempt per challenge.", 409);
    const state = structuredClone(current); state.specialAttempt = { kind, reward: command.reward, startedAt: now }; state.revision++; state.lastActions = []; return state;
  }
  const attempt = current.specialAttempt;
  if (!attempt || !validChallengeInput(kind, command.frames, command.endFrame)) throw new GameError("Invalid challenge attempt.");
  if (now - attempt.startedAt < command.endFrame / 60 * 1000 - 250) throw new GameError("The challenge is still running.", 409);
  const score = challengeScore(kind, command.frames, command.endFrame);
  const amount = attempt.reward === "credits" ? Math.floor(score / 14) : Math.floor(score / 5);
  const state = structuredClone(current); const effects = { [attempt.reward]: amount };
  apply(state, effects);
  const decision: Decision = { kind: "special", planningRound: state.round + 1, year: 2026, cardId: `challenge-${kind}`, title: kind === "flight" ? "Ice courier" : "Grid pulse", category: "save", accepted: true, probability: 100, spent: 0, refund: 0, income: 0, transition: 0, effects, challengeScore: score };
  state.history.push(decision); state.revision++;
  return settle(state, [decision]);
}
export function v6Public(state: RunState): PublicRun {
  const safe = v5Public({ ...state, offers: [] });
  const special = specialFor(state.round);
  const library = V6_CARDS.map(card => ({ ...v6Preview(state, card), lockedReason: card.rarity ? adopted(state, card.id) ? "Already adopted" : state.round < 2 ? "Appears after round 2" : null : v5LockedReason(state, card), taken: adopted(state, card.id) }));
  return { ...safe, rulesVersion: state.rulesVersion, offers: state.offers.map(id => v6Preview(state, V6_CARDS.find(card => card.id === id)!)), library, specialRound: state.finishedAt ? null : special, canEndRound: !state.finishedAt, canRedraw: !special && safe.canRedraw, roundSaveBonus: special ? 0 : 2, climateScenario: combineClimateLevers(state.history.filter(h => h.kind === "policy" && h.accepted).map(h => h.cardId)) };
}
