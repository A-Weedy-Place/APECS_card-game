import { INITIAL_RESOURCES, PLANNING_ROUNDS, PLANNING_YEAR, SAVE_BONUS, phaseForVersion } from "./config";
import { GameError } from "./errors";
import { projectFor } from "./model";
import { randomAt } from "./random";
import { climateLeversForCard, climateMappingNote, combineClimateLevers } from "./climate-levers";
import { PATHWAYS, V4_CARDS } from "./v4-cards";
import { v4Approval, v4Cost, v4Effects, v4Mandate, v4Perks, v4Refund, v4Resilience, v4Synergies, v4SynergyLibrary, v4Upkeep } from "./v4";
import type { Card, Decision, Effects, OfferedCard, PublicRun, Resources, RunState, ScoreComponent, WorldEvent } from "./types";

export const v5Rules = (state: Pick<RunState, "rulesVersion">) => state.rulesVersion === "prototype-0.5";
// All proposals are adopted in 2026. Technology follows actual prerequisite cards,
// not invented calendar unlocks; the old catalogue remains immutable for saves.
export const V5_CARDS: Card[] = V4_CARDS.map(card => ({ ...card, minRound: 0 }));
export const V5_CARD_BY_ID = new Map(V5_CARDS.map(card => [card.id, card]));
const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n));
const taken = (state: RunState) => new Set(state.history.filter(h => h.accepted && h.kind !== "round-end" && h.cardId !== "save").map(h => h.cardId));
const activePerk = (state: RunState, id: string) => v4Perks(state).some(p => p.id === id && p.active);
const activeSynergy = (state: RunState, id: string) => v4Synergies(state).some(s => s.id === id);
export const v5PlayedThisRound = (state: RunState) => state.history.filter(h => h.kind === "policy" && h.planningRound === state.round + 1).length;

// These are readiness and negotiation game rules, never modelled economic growth.
// Their round-based pressure is agenda fatigue inside one 2026 planning session.
export const v5Approval = v4Approval;
export const v5Cost = v4Cost;
export const v5Mandate = v4Mandate;
export const v5Refund = v4Refund;
export const v5Effects = v4Effects;
export function v5Transition(state: RunState, effects: Effects) {
  return Math.round((effects.transition ?? 0) * (.7 + .003 * clamp(state.resources.awareness)));
}
export function v5Income(state: RunState) {
  const allocation = 3 + Math.floor(clamp(state.resources.economy) / 25) + (activePerk(state, "economics") ? 1 : 0);
  return Math.max(1, Math.min(7, allocation) - v4Upkeep(state));
}
export function v5LockedReason(state: RunState, card: Card): string | null {
  const adopted = taken(state);
  if (!card.repeatable && adopted.has(card.id)) return "Already adopted";
  const missing = [...(card.requiresAll ?? []), ...(card.requires ? [card.requires] : [])].filter(id => !adopted.has(id));
  if (missing.length) return `Requires ${missing.map(id => V5_CARD_BY_ID.get(id)!.title).join(" + ")}`;
  if (card.requiresAny?.length && !card.requiresAny.some(id => adopted.has(id))) return `Requires ${card.requiresAny.map(id => V5_CARD_BY_ID.get(id)!.title).join(" or ")}`;
  return null;
}
export function v5Offers(state: RunState, exclude: string[] = []): string[] {
  const eligible = V5_CARDS.filter(card => !v5LockedReason(state, card));
  const fresh = eligible.filter(card => !exclude.includes(card.id));
  const pool = fresh.length >= 3 ? fresh : eligible;
  const ranked = pool.map((card, i) => ({ card, rank: randomAt(state.seed, 380000 + state.round * 1000 + (state.redrawsUsed ?? 0) * 20000 + i) })).sort((a, b) => a.rank - b.rank).map(x => x.card);
  const chosen: Card[] = [];
  const add = (card: Card | undefined) => { if (card && !chosen.includes(card)) chosen.push(card); };
  add(ranked.find(card => (card.requiresAny?.length || card.requiresAll?.length)) ?? ranked.find(card => card.role === "action"));
  const recovery = state.resources.support < 30 || state.resources.awareness < 15;
  add(recovery ? ranked.find(card => card.id === "local-campaign") ?? ranked.find(card => card.role === "enabler" && !chosen.includes(card)) : ranked.find(card => card.role === "enabler" && !chosen.includes(card)));
  add(ranked.find(card => !chosen.includes(card) && !chosen.some(c => c.pathway === card.pathway)) ?? ranked.find(card => !chosen.includes(card)));
  for (const card of ranked) { if (chosen.length === 3) break; add(card); }
  return chosen.map(card => card.id);
}
export function v5Create(id: string, nickname: string, country: string, seed: number): RunState {
  const state: RunState = { id, nickname, country, seed, rulesVersion: "prototype-0.5", round: 0, revision: 0, resources: { ...INITIAL_RESOURCES, credits: 12 }, transition: 0, resilience: 0, offers: [], history: [], startedAt: new Date().toISOString(), finishedAt: null, score: null, projection: projectFor([], "prototype-0.5"), redrawsUsed: 0, redrawsThisTurn: 0, lastActions: [] };
  state.offers = v5Offers(state);
  return state;
}
function apply(resources: Resources, effects: Effects) {
  for (const key of ["credits", "economy", "support", "awareness", "justice"] as const) resources[key] = clamp(resources[key] + (effects[key] ?? 0), 0, key === "credits" ? 999 : 100);
}
export function v5Breakdown(state: RunState): ScoreComponent[] {
  return [
    { label: "Transition", value: Math.round(clamp(state.transition / 150 * 100) * 6), max: 600 },
    { label: "Justice", value: Math.round(clamp(state.resources.justice) * 1.5), max: 150 },
    { label: "Resilience", value: Math.round(clamp(state.resilience ?? 0)), max: 100 },
    { label: "Economy", value: Math.round(clamp(state.resources.economy) * .75), max: 75 },
    { label: "Politics", value: Math.round(clamp(state.resources.support) * .5), max: 50 },
    { label: "Awareness", value: Math.round(clamp(state.resources.awareness) * .25), max: 25 },
  ];
}
export function v5Score(state: RunState) { return v5Breakdown(state).reduce((sum, part) => sum + part.value, 0); }

export function v5Batch(current: RunState, ids: string[]): RunState {
  if (!v5Rules(current)) throw new GameError("Multiple-card play requires a new planning game.", 409);
  if (current.finishedAt) throw new GameError("That run is already complete.", 409);
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 3 || ids.some(id => typeof id !== "string") || new Set(ids).size !== ids.length) throw new GameError("Select one to three different offered cards.");
  const selected = ids.map(id => {
    const card = V5_CARD_BY_ID.get(id);
    if (!card || !current.offers.includes(id)) throw new GameError("Choose cards currently offered.");
    if (v5LockedReason(current, card)) throw new GameError("That policy is not eligible for this package.");
    return card;
  }).sort((a, b) => current.offers.indexOf(a.id) - current.offers.indexOf(b.id));
  // Every quote is frozen against the displayed pre-play state. An enabler in the
  // same package does not secretly alter another card's odds, cost or payoff.
  const quotes = selected.map(card => v5Preview(current, card));
  const totalCost = quotes.reduce((total, card) => total + card.cost, 0);
  if (totalCost > current.resources.credits) throw new GameError("Not enough credits for all selected cards.");
  const state = structuredClone(current);
  state.resources.credits -= totalCost; // no borrowing against an uncertain refund
  state.lastActions = [];
  const historyOffset = state.history.length;
  for (let index = 0; index < quotes.length; index++) {
    const quote = quotes[index];
    const beforePerks = new Set(v4Perks(state).filter(p => p.active).map(p => p.id));
    const beforeSynergies = new Set(v4Synergies(state).map(s => s.id));
    const roll = randomAt(state.seed, 580000 + historyOffset + index) * 100;
    const accepted = roll < quote.approval;
    const refund = accepted ? 0 : quote.rejectionRefund!;
    const effects = accepted ? { ...quote.effects } : { support: -2 };
    const transition = accepted ? quote.transitionGain : 0;
    const resilience = accepted ? quote.resilience ?? 0 : 0;
    apply(state.resources, { credits: refund });
    apply(state.resources, effects);
    state.transition += transition;
    state.resilience = clamp((state.resilience ?? 0) + resilience);
    const decision: Decision = { year: PLANNING_YEAR, planningRound: current.round + 1, kind: "policy", cardId: quote.id, title: quote.title, category: quote.category, accepted, probability: quote.approval, roll: Math.round(roll * 100) / 100, spent: quote.cost, refund, income: 0, transition, effects, resilience };
    state.history.push(decision);
    decision.unlockedPerks = v4Perks(state).filter(p => p.active && !beforePerks.has(p.id)).map(p => p.id);
    decision.unlockedSynergies = v4Synergies(state).filter(s => !beforeSynergies.has(s.id)).map(s => s.id);
    state.lastActions.push(decision);
  }
  state.offers = current.offers.filter(id => !ids.includes(id));
  state.revision++;
  state.projection = projectFor(state.history, state.rulesVersion);
  return state;
}

export function v5Action(current: RunState, cardId: string): RunState {
  if (current.finishedAt) throw new GameError("That run is already complete.", 409);
  if (!["redraw", "save", "end-round"].includes(cardId)) return v5Batch(current, [cardId]);
  const state = structuredClone(current);
  if (cardId === "redraw") {
    const cost = (state.redrawsThisTurn ?? 0) + 1;
    if (state.resources.credits < cost) throw new GameError("Not enough credits to reshuffle.");
    state.resources.credits -= cost;
    state.redrawsThisTurn = cost;
    state.redrawsUsed = (state.redrawsUsed ?? 0) + 1;
    state.offers = v5Offers(state, state.offers);
    state.lastActions = [];
    state.revision++;
    return state;
  }
  const bonus = v5PlayedThisRound(state) ? 0 : SAVE_BONUS;
  apply(state.resources, { credits: bonus });
  const decision: Decision = { year: PLANNING_YEAR, planningRound: current.round + 1, kind: "round-end", cardId: "end-round", title: bonus ? "Skip & save" : "Round complete", category: "save", accepted: true, probability: 100, roll: 0, spent: 0, refund: 0, income: 0, transition: 0, effects: bonus ? { credits: bonus } : {} };
  state.history.push(decision);
  state.lastActions = [decision];
  state.round++;
  state.revision++;
  state.redrawsThisTurn = 0;
  if (state.round === PLANNING_ROUNDS) {
    state.finishedAt = new Date().toISOString(); state.offers = []; state.score = v5Score(state);
  } else {
    const before = { ...state.resources };
    // A disclosed budget stress-test, not a disaster forecast or elapsed time.
    if (state.round === 8) {
      const damage = (state.resilience ?? 0) >= 40 ? 0 : (state.resilience ?? 0) >= 20 ? .5 : 1;
      apply(state.resources, { economy: -Math.ceil(6 * damage), support: -Math.ceil(5 * damage) });
    }
    const economy = state.resources.economy;
    const stress = economy < 25 ? 4 : economy < 40 ? 2 : economy >= 70 ? -1 : 0;
    const supportDecay = Math.max(0, 3 + stress - (state.resources.justice >= 50 ? 1 : 0) - (activeSynergy(state, "stable-coalition") ? 1 : 0));
    const awarenessDecay = activeSynergy(state, "trusted-evidence") ? 0 : activePerk(state, "awareness") ? 1 : 2;
    apply(state.resources, { support: -supportDecay, awareness: -awarenessDecay });
    decision.decay = { support: state.resources.support - before.support, awareness: state.resources.awareness - before.awareness, economy: state.resources.economy - before.economy };
    decision.upkeep = v4Upkeep(state);
    decision.income = v5Income(state);
    apply(state.resources, { credits: decision.income });
    state.offers = v5Offers(state);
  }
  state.projection = projectFor(state.history, state.rulesVersion);
  return state;
}

export function v5Event(state: RunState): WorldEvent | null {
  if (state.finishedAt) return null;
  if (state.round === 5) return { id: "supply", title: "Tight procurement", description: "Technology costs +1 this round unless economy is 70+.", icon: "factory" };
  if (state.round === 7) return { id: "disruption", title: "Budget stress-test", description: "At round end: −6 economy, −5 support. Resilience 20 halves losses; 40 prevents them.", icon: "shield" };
  return null;
}
export function v5Preview(state: RunState, card: Card): OfferedCard {
  const cost = v5Cost(state, card), effects = v5Effects(state, card), bonuses: string[] = [];
  if (cost < card.cost) bonuses.push(`Combined discounts −${card.cost - cost} cost`);
  if (cost > card.cost) bonuses.push("Tight procurement +1 cost");
  if ((effects.transition ?? 0) !== (card.effects.transition ?? 0)) bonuses.push(`Combinations +${(effects.transition ?? 0) - (card.effects.transition ?? 0)} base transition`);
  if (card.id === "coal-exit") bonuses.push(activeSynergy(state, "fair-exit") ? "Managed exit: replacement power + worker protection" : "Power and worker preparation change the economic cost");
  if (card.id === "carbon-price" && activeSynergy(state, "fair-revenue")) bonuses.push("Shared returns remove the public backlash");
  if (activeSynergy(state, "trusted-evidence") && card.role === "action") bonuses.push("Trusted evidence +6 approval");
  if ((effects.credits ?? 0) > 0) bonuses.push("Patient investment: +1 credit on success");
  return { ...card, cost, baseCost: card.cost, effects, approval: v5Approval(state, card), affordable: cost <= state.resources.credits, transitionGain: v5Transition(state, effects), resilience: v4Resilience(state, card), bonuses, mandateCost: v5Mandate(state, card), rejectionRefund: v5Refund(state, cost), rejectionSupport: 2, climateInputs: climateLeversForCard(card.id), climateNote: climateMappingNote(card.id) };
}
export function v5Public(state: RunState): PublicRun {
  const { seed: _secret, offers, ...visible } = state;
  const adopted = taken(state), redrawCost = (state.redrawsThisTurn ?? 0) + 1;
  return {
    ...visible, phase: phaseForVersion(state.round, state.rulesVersion), year: PLANNING_YEAR, planningYear: PLANNING_YEAR, resultYear: 2100, years: [], totalRounds: PLANNING_ROUNDS,
    nextIncome: v5Income(state), upkeep: v4Upkeep(state), transitionTarget: 150,
    perks: v4Perks(state), worldEvent: v5Event(state), canRedraw: !state.finishedAt && state.resources.credits >= redrawCost, redrawCost,
    canEndRound: !state.finishedAt, playedThisRound: v5PlayedThisRound(state), roundSaveBonus: state.finishedAt || v5PlayedThisRound(state) ? 0 : SAVE_BONUS,
    offers: offers.map(id => v5Preview(state, V5_CARD_BY_ID.get(id)!)),
    library: V5_CARDS.map(card => ({ ...v5Preview(state, card), lockedReason: v5LockedReason(state, card), taken: adopted.has(card.id) })),
    pathways: PATHWAYS, activeSynergies: v4Synergies(state), synergyLibrary: v4SynergyLibrary(state), scoreBreakdown: v5Breakdown(state), climateScenario: combineClimateLevers([...adopted]),
  };
}
