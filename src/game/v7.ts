import { GameError } from "./errors";
import { projectFor } from "./model";
import { randomAt } from "./random";
import { challengeScore, validChallengeInput } from "./challenges";
import { climateLeversForCard, climateMappingNote, combineClimateLevers } from "./climate-levers";
import { v5Create, v5Cost, v5Effects, v5LockedReason, v5Offers, v5Public, v5Score } from "./v5";
import { v4Mandate, v4Perks, v4Refund, v4Resilience, v4Synergies } from "./v4";
import { V6_CARDS, RARE_CARDS, specialFor } from "./v6";
import type { Card, Decision, Effects, OfferedCard, PublicRun, Resources, RunState, SpecialCommand } from "./types";

// All quantities below are authored game rules, not economic or climate estimates.
export const V7_BANK_LIMIT = 20;
export const v7Rules = (state: Pick<RunState, "rulesVersion">) => state.rulesVersion === "prototype-0.7";
const clamp = (value: number, max = 100) => Math.max(0, Math.min(max, value));
const adopted = (state: RunState, id: string) => state.history.some(h => h.kind === "policy" && h.accepted && h.cardId === id);
const perk = (state: RunState, id: string) => v4Perks(state).some(p => p.id === id && p.active);
const synergy = (state: RunState, id: string) => v4Synergies(state).some(s => s.id === id);
function apply(resources: Resources, effects: Effects) {
  for (const key of ["credits", "economy", "support", "awareness", "justice"] as const) resources[key] = clamp(resources[key] + (effects[key] ?? 0), key === "credits" ? V7_BANK_LIMIT : 100);
}
export function v7Upkeep(state: RunState) {
  return Math.min(4, V6_CARDS.filter(card => adopted(state, card.id)).reduce((sum, card) => sum + (card.upkeep ?? 0), 0));
}
export function v7Income(state: RunState) {
  return Math.max(1, Math.min(8, 3 + Math.floor(clamp(state.resources.economy) / 25) + (perk(state, "economics") ? 1 : 0)) - v7Upkeep(state));
}
export function v7Cost(state: RunState, card: Card) {
  return v5Cost(state, card) + (card.role === "enabler" ? 1 : card.tier === 1 ? 2 : 3);
}
export function v7Approval(state: RunState, card: Card) {
  if (card.role === "enabler") return 100;
  const consent = (card.id === "wind" || card.category === "nature" || card.pathway === "mobility") && synergy(state, "local-consent") ? 8 : 0;
  const bonus = (perk(state, "politics") ? 8 : 0) + (synergy(state, "trusted-evidence") ? 4 : 0) + consent;
  return Math.round(Math.max(5, Math.min(95, 35 + .62 * state.resources.support + .08 * state.resources.awareness + .08 * state.resources.economy - card.difficulty - state.round * 3.3 + bonus)));
}
export function v7Mandate(state: RunState, card: Card) {
  if (card.role !== "action") return 0;
  return Math.max(2, 3 + 2 * (card.tier ?? 1) + Math.floor(state.round / 3) - (perk(state, "politics") ? 2 : 0) - (state.resources.justice >= 55 ? 2 : 0) - (synergy(state, "stable-coalition") ? 1 : 0) - (card.pathway === "industry" && synergy(state, "skilled-industry") ? 2 : 0));
}
export function v7Effects(state: RunState, card: Card): Effects {
  const effects = { ...v5Effects(state, card) };
  // Remove the old mandate before applying the stronger, disclosed new cost.
  if (card.role === "action") effects.support = (effects.support ?? 0) + v4Mandate(state, card);
  for (const key of ["economy", "support", "justice"] as const) if ((effects[key] ?? 0) < 0) effects[key] = Math.floor(effects[key]! * 1.25);
  if (card.role === "action") effects.support = (effects.support ?? 0) - v7Mandate(state, card);
  if (effects.support === 0) delete effects.support;
  return effects;
}
export const v7Transition = (state: RunState, effects: Effects) => Math.round((effects.transition ?? 0) * (.78 + .0022 * clamp(state.resources.awareness)));
export function v7Preview(state: RunState, card: Card): OfferedCard {
  const effects = v7Effects(state, card), cost = v7Cost(state, card);
  return { ...card, effects, cost, baseCost: card.cost, affordable: cost <= state.resources.credits, approval: v7Approval(state, card), transitionGain: v7Transition(state, effects), mandateCost: v7Mandate(state, card), rejectionRefund: v4Refund(state, cost), rejectionSupport: 4, resilience: v4Resilience(state, card), bonuses: ["Action spends political support; fairness and coalitions soften the cost.", ...(cost > card.cost ? [`Scarce-budget cost: ${cost} coins total`] : [])], climateInputs: climateLeversForCard(card.id), climateNote: climateMappingNote(card.id) };
}
export function v7Offers(state: RunState, exclude: string[] = []) {
  if (specialFor(state.round) || state.finishedAt) return [];
  const offers = v5Offers(state, exclude);
  const rare = RARE_CARDS.filter(card => !adopted(state, card.id) && !exclude.includes(card.id));
  if (rare.length && state.round >= 2 && (state.round === 4 || randomAt(state.seed, 910000 + state.round * 101 + (state.redrawsUsed ?? 0)) < .19)) offers[2] = rare[Math.floor(randomAt(state.seed, 920000 + state.round + (state.redrawsUsed ?? 0) * 11) * rare.length)].id;
  return offers;
}
export function v7Create(id: string, nickname: string, country: string, seed: number): RunState {
  const state = v5Create(id, nickname, country, seed);
  state.rulesVersion = "prototype-0.7"; state.resources.credits = 8; state.offers = v7Offers(state); state.projection = projectFor([], state.rulesVersion);
  return state;
}
export function v7Settle(state: RunState, outcomes: Decision[]): RunState {
  const special = specialFor(state.round);
  const settlement: Decision = { kind: "round-end", planningRound: state.round + 1, year: 2026, cardId: "end-round", title: !outcomes.length && !special ? "Skipped" : "Round complete", category: "save", accepted: true, probability: 100, spent: 0, refund: 0, income: 0, transition: 0, effects: {} };
  state.history.push(settlement); state.round++; state.revision++; state.redrawsThisTurn = 0; delete state.specialAttempt;
  if (state.round === 10) { state.finishedAt = new Date().toISOString(); state.score = v5Score(state); }
  else {
    const before = { ...state.resources };
    if (state.round === 8) { const damage = (state.resilience ?? 0) >= 40 ? 0 : (state.resilience ?? 0) >= 20 ? .5 : 1; apply(state.resources, { economy: -Math.ceil(8 * damage), support: -Math.ceil(8 * damage) }); }
    const stress = state.resources.economy < 25 ? 4 : state.resources.economy < 40 ? 2 : 0;
    apply(state.resources, { support: -Math.max(1, 4 + stress - (state.resources.justice >= 55 ? 2 : 0) - (synergy(state, "stable-coalition") ? 1 : 0)), awareness: synergy(state, "trusted-evidence") ? 0 : perk(state, "awareness") ? -1 : -2 });
    settlement.decay = { economy: state.resources.economy - before.economy, support: state.resources.support - before.support, awareness: state.resources.awareness - before.awareness };
    settlement.upkeep = v7Upkeep(state);
    settlement.income = Math.min(v7Income(state), V7_BANK_LIMIT - state.resources.credits);
    apply(state.resources, { credits: settlement.income });
  }
  state.lastActions = outcomes.length ? outcomes.map((outcome, index) => index ? outcome : { ...outcome, income: settlement.income, ...(settlement.decay ? { decay: settlement.decay } : {}), ...(settlement.upkeep !== undefined ? { upkeep: settlement.upkeep } : {}) }) : [settlement];
  state.offers = v7Offers(state); state.projection = projectFor(state.history, state.rulesVersion);
  return state;
}
export function v7Batch(current: RunState, ids: string[]): RunState {
  if (current.finishedAt || specialFor(current.round)) throw new GameError("This is not a policy round.", 409);
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 3 || new Set(ids).size !== ids.length || ids.some(id => !current.offers.includes(id))) throw new GameError("Choose different cards from the current hand.");
  const cards = ids.map(id => V6_CARDS.find(card => card.id === id)).sort((a, b) => current.offers.indexOf(a?.id ?? "") - current.offers.indexOf(b?.id ?? ""));
  if (cards.some(card => !card || (card.rarity ? adopted(current, card.id) : v5LockedReason(current, card)))) throw new GameError("That card is not eligible.");
  const quotes = cards.map(card => v7Preview(current, card!));
  const total = quotes.reduce((sum, quote) => sum + quote.cost, 0);
  if (total > current.resources.credits) throw new GameError("Not enough coins for the selected cards.");
  const state = structuredClone(current); state.resources.credits -= total;
  const outcomes: Decision[] = [];
  for (const quote of quotes) {
    const beforePerks = new Set(v4Perks(state).filter(p => p.active).map(p => p.id));
    const beforeSynergies = new Set(v4Synergies(state).map(s => s.id));
    const accepted = randomAt(current.seed, 580000 + current.history.length + outcomes.length) * 100 < quote.approval;
    const refund = accepted ? 0 : quote.rejectionRefund!;
    const effects = accepted ? quote.effects : { support: -4 };
    apply(state.resources, { credits: refund }); apply(state.resources, effects);
    const decision: Decision = { kind: "policy", planningRound: current.round + 1, year: 2026, cardId: quote.id, title: quote.title, category: quote.category, accepted, probability: quote.approval, spent: quote.cost, refund, income: 0, effects: { ...effects }, transition: accepted ? quote.transitionGain : 0, resilience: accepted ? quote.resilience ?? 0 : 0 };
    if (accepted && quote.rarity) {
      const side = randomAt(current.seed, 940000 + current.round * 37 + current.history.length) < .5;
      const consequence = quote.id === "rapid-grid" ? side ? { justice: -28, support: -14 } : { economy: -26 } : quote.id === "emergency-levy" ? side ? { support: -30 } : { justice: -26, economy: -14 } : side ? { economy: -28 } : { support: -28, awareness: -12 };
      decision.surprise = { title: quote.risk!, effects: consequence }; apply(state.resources, consequence);
    }
    state.transition += decision.transition; state.resilience = clamp((state.resilience ?? 0) + (decision.resilience ?? 0));
    state.history.push(decision);
    decision.unlockedPerks = v4Perks(state).filter(p => p.active && !beforePerks.has(p.id)).map(p => p.id);
    decision.unlockedSynergies = v4Synergies(state).filter(s => !beforeSynergies.has(s.id)).map(s => s.id);
    outcomes.push(decision);
  }
  return v7Settle(state, outcomes);
}
export function v7Action(current: RunState, id: string): RunState {
  if (current.finishedAt) throw new GameError("The game is complete.", 409);
  if (["save", "end-round", "skip-special"].includes(id)) return v7Settle(structuredClone(current), []);
  if (id !== "redraw") return v7Batch(current, [id]);
  if (specialFor(current.round)) throw new GameError("There is no hand to shuffle.");
  const cost = (current.redrawsThisTurn ?? 0) + 1;
  if (current.resources.credits < cost) throw new GameError("Not enough coins to shuffle.");
  const state = structuredClone(current); state.resources.credits -= cost; state.redrawsThisTurn = cost; state.redrawsUsed = (state.redrawsUsed ?? 0) + 1; state.revision++; state.lastActions = []; state.offers = v7Offers(state, current.offers); return state;
}
export function v7Special(current: RunState, command: SpecialCommand, now = Date.now()): RunState {
  const kind = specialFor(current.round);
  if (!v7Rules(current) || current.finishedAt || !kind) throw new GameError("No special round is active.", 409);
  if (command.kind === "begin-special") {
    if (current.specialAttempt || !["credits", "economy", "support", "awareness", "justice"].includes(command.reward)) throw new GameError("Choose one reward before starting.", 409);
    const state = structuredClone(current); state.specialAttempt = { kind, reward: command.reward, startedAt: now }; state.revision++; state.lastActions = []; return state;
  }
  const attempt = current.specialAttempt;
  if (!attempt || !validChallengeInput(kind, command.frames, command.endFrame)) throw new GameError("Invalid challenge attempt.");
  if (now - attempt.startedAt < command.endFrame / 60 * 1000 - 250) throw new GameError("The challenge is still running.", 409);
  const score = challengeScore(kind, command.frames, command.endFrame), state = structuredClone(current);
  const amount = attempt.reward === "credits" ? Math.min(Math.floor(score / 25), V7_BANK_LIMIT - state.resources.credits) : Math.min(Math.floor(score / 6), 100 - state.resources[attempt.reward]);
  const effects = { [attempt.reward]: amount }; apply(state.resources, effects);
  const decision: Decision = { kind: "special", planningRound: current.round + 1, year: 2026, cardId: `challenge-${kind}`, title: kind === "flight" ? "Ice courier" : "Grid pulse", category: "save", accepted: true, probability: 100, spent: 0, refund: 0, income: 0, transition: 0, effects, challengeScore: score };
  state.history.push(decision); return v7Settle(state, [decision]);
}
export function v7Public(state: RunState): PublicRun {
  const safe = v5Public({ ...state, offers: [] });
  const describe = <T extends {id:string;description:string}>(item:T):T => item.id === "trusted-evidence" ? { ...item, description: "+4 action approval; awareness stops decaying." } : item;
  safe.activeSynergies = safe.activeSynergies?.map(describe);
  safe.synergyLibrary = safe.synergyLibrary?.map(describe);
  const special = specialFor(state.round);
  const library = V6_CARDS.map(card => ({ ...v7Preview(state, card), lockedReason: card.rarity ? adopted(state, card.id) ? "Already adopted" : state.round < 2 ? "Appears after round 2" : null : v5LockedReason(state, card), taken: adopted(state, card.id) }));
  const reference = { ...V6_CARDS[0], role: "action" as const, difficulty: 8, id: "reference-action" };
  return { ...safe, rulesVersion: state.rulesVersion, offers: state.offers.map(id => v7Preview(state, V6_CARDS.find(card => card.id === id)!)), library, nextIncome: v7Income(state), upkeep: v7Upkeep(state), generalApproval: v7Approval(state, reference), bankLimit: V7_BANK_LIMIT, specialRound: state.finishedAt ? null : special, canEndRound: !state.finishedAt, canRedraw: !special && safe.canRedraw, roundSaveBonus: 0, worldEvent: state.round === 7 ? { id: "disruption", title: "Budget stress-test", description: "At round end: −8 economy and politics. Resilience 20 halves the loss; 40 prevents it.", icon: "shield" } : safe.worldEvent, climateScenario: combineClimateLevers(state.history.filter(h => h.kind === "policy" && h.accepted).map(h => h.cardId)) };
}
