import { CARD_BY_ID, CARDS, LEGACY_CARDS, LEGACY_CARD_BY_ID, V2_CARDS, V2_CARD_BY_ID } from "./cards";
import { SAVE_BONUS, LEGACY_YEARS as YEARS, incomeFor, phaseFor } from "./config";
import { climateAdapter } from "./model";
import { randomAt } from "./random";
import { eventFor, hasPerk, modernRules, perksFor, strategicRules } from "./perks";
import type { Card, Decision, Effects, PublicRun, Resources, RunState, SpecialCommand } from "./types";
import { v6Rules, v6Create, v6Action, v6Batch, v6Public, v6Special, v6Offers } from "./v6";
import { v7Rules, v7Action, v7Batch, v7Public, v7Special, v7Offers, v7Approval, v7Cost, v7Income, v7Transition, v7Mandate, v7Effects } from "./v7";
import { v8Rules, v8Create, v8Public, v8Special } from "./v8";
import { v9Rules,v9Create,v9Public,v9Action,v9Batch,v9Special,v9Income,v9Approval,v9Effects,v9Offers } from "./v9";
import { POLICY_BY_ID } from "./policy-catalogue";
import { v10Create, v10Special } from "./v10";
import { v11Create, v11Action, v11Batch, v11Public, v11Special, v11Approval, v11Effects, v11Offers } from "./v11";
import { V11_BY_ID } from "./v11-catalogue";
import { GameError } from "./errors";
import { v4Rules, v4Approval, v4Cost, v4Income, v4Transition, v4Mandate, v4Refund, v4Effects, v4Offers, v4Create, v4Score, v4Action, v4Public } from "./v4";
import { v5Rules, v5Approval, v5Cost, v5Income, v5Transition, v5Mandate, v5Refund, v5Effects, v5Offers, v5Create, v5Score, v5Action, v5Public, v5Batch } from "./v5";

export { GameError } from "./errors";
const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n));
const scarceBudgetRules = (state:RunState) => v7Rules(state) || v8Rules(state);
const cardsFor = (state: RunState) => strategicRules(state) ? CARDS : modernRules(state) ? V2_CARDS : LEGACY_CARDS;
const cardFor = (state: RunState, id: string) => (strategicRules(state) ? CARD_BY_ID : modernRules(state) ? V2_CARD_BY_ID : LEGACY_CARD_BY_ID).get(id);

export function approvalFor(state: RunState, card: Card) {
  if(state.rulesVersion==="prototype-0.11")return v11Approval(state,V11_BY_ID.get(card.id)!);
  if(v9Rules(state))return v9Approval(state,POLICY_BY_ID.get(card.id)!);
  if (scarceBudgetRules(state)) return v7Approval(state, card);
  if (v6Rules(state)) return v5Approval(state, card);
  if (v5Rules(state)) return v5Approval(state, card);
  if (v4Rules(state)) return v4Approval(state, card);
  if (strategicRules(state)) {
    const enabling = (card.effects.transition ?? 0) < 8;
    const politics = hasPerk(state, "politics") ? 10 : 0;
    const awareness = hasPerk(state, "awareness") ? 5 : 0;
    const spotlight = eventFor(state)?.id === "spotlight" && ["politics", "justice", "awareness"].includes(card.category) ? 6 : 0;
    // Hard action gets harder with time; inexpensive enabling actions remain a recovery route.
    const base = enabling ? 82 : 64;
    const urgency = state.round * (enabling ? 1.5 : 4);
    return Math.round(clamp(base + state.resources.support * .3 + state.resources.awareness * .22 - card.difficulty - urgency + politics + awareness + spotlight, enabling ? 70 : 25, 98));
  }
  const fatigue = state.round * 1.3;
  const bonus = (hasPerk(state, "politics") ? 8 : 0) + (hasPerk(state, "awareness") ? 5 : 0) + (eventFor(state)?.id === "spotlight" && ["politics", "justice", "awareness"].includes(card.category) ? 6 : 0);
  return Math.round(clamp(63 + state.resources.support * .29 + state.resources.awareness * .12 - card.difficulty - fatigue + bonus, 50, 98));
}

export function costFor(state: RunState, card: Card) {
  if(v9Rules(state))return card.cost;
  if (scarceBudgetRules(state)) return v7Cost(state, card);
  if (v6Rules(state)) return v5Cost(state, card);
  if (v5Rules(state)) return v5Cost(state, card);
  if (v4Rules(state)) return v4Cost(state, card);
  const discount = card.category === "technology" && hasPerk(state, "technology") ? (strategicRules(state) ? 2 : 1) : 0;
  const surcharge = card.category === "technology" && eventFor(state)?.id === "supply" && state.resources.economy < 75 ? 1 : 0;
  return Math.max(1, card.cost - discount + surcharge);
}
export function nextIncomeFor(state: RunState) { return v9Rules(state)?v9Income(state):scarceBudgetRules(state) ? v7Income(state) : v5Rules(state) || v6Rules(state) ? v5Income(state) : v4Rules(state) ? v4Income(state) : incomeFor(state.resources.economy) + (hasPerk(state, "economics") ? (strategicRules(state) ? 2 : 1) : 0); }
export function transitionFor(state: RunState, effects: Effects) {
  if(v9Rules(state))return 0;
  if (scarceBudgetRules(state)) return v7Transition(state, effects);
  if (v6Rules(state)) return v5Transition(state, effects);
  if (v5Rules(state)) return v5Transition(state, effects);
  if (v4Rules(state)) return v4Transition(state, effects);
  const understanding = strategicRules(state) ? .8 + Math.min(60, state.resources.awareness) / 200 : 1;
  return Math.round((effects.transition ?? 0) * (1 + (6 - state.round) * (strategicRules(state) ? .1 : .06)) * understanding);
}
export function mandateCostFor(state: RunState, card: Card) {
  if (scarceBudgetRules(state)) return v7Mandate(state, card);
  if (v6Rules(state)) return v5Mandate(state, card);
  if (v5Rules(state)) return v5Mandate(state, card);
  if (v4Rules(state)) return v4Mandate(state, card);
  if (!strategicRules(state) || (card.effects.transition ?? 0) < 8) return 0;
  const cost = 4 + state.round + (card.difficulty >= 10 ? 3 : 0);
  return Math.max(1, cost - (hasPerk(state, "politics") ? 3 : 0) - (state.resources.justice >= 50 ? 2 : 0));
}
export function refundFor(state: RunState, cost: number) { return scarceBudgetRules(state) ? v4Refund(state, cost) : v5Rules(state) || v6Rules(state) ? v5Refund(state, cost) : v4Rules(state) ? v4Refund(state, cost) : Math.floor(cost * (strategicRules(state) ? (hasPerk(state, "justice") ? .75 : .5) : (hasPerk(state, "justice") ? .9 : .75))); }

export function effectsFor(state: RunState, card: Card): Effects {
  if(state.rulesVersion==="prototype-0.11")return v11Effects(state,V11_BY_ID.get(card.id)!);
  if(v9Rules(state))return v9Effects(state,POLICY_BY_ID.get(card.id)!);
  if (scarceBudgetRules(state)) return v7Effects(state, card);
  if (v6Rules(state)) return v5Effects(state, card);
  if (v5Rules(state)) return v5Effects(state, card);
  if (v4Rules(state)) return v4Effects(state, card);
  const effects = { ...card.effects };
  const protectedWorkers = card.id === "coal-exit" && state.history.some(h => h.cardId === "worker-transition" && h.accepted);
  if (protectedWorkers) {
    effects.support = -5;
    effects.economy = -3;
  }
  if (card.category === "nature" && hasPerk(state, "nature")) effects.transition = (effects.transition ?? 0) + (strategicRules(state) ? 4 : 3);
  if (strategicRules(state)) {
    if (!protectedWorkers && state.resources.justice >= 50 && (effects.support ?? 0) < 0) effects.support = Math.ceil(effects.support! / 2);
    const mandate = mandateCostFor(state, card);
    if (mandate) effects.support = (effects.support ?? 0) - mandate;
  }
  return effects;
}

export function offerCards(state: RunState): string[] {
  if(state.rulesVersion==="prototype-0.11")return v11Offers(state);
  if(v9Rules(state))return v9Offers(state);
  if (scarceBudgetRules(state)) return v7Offers(state);
  if (v6Rules(state)) return v6Offers(state);
  if (v5Rules(state)) return v5Offers(state);
  if (v4Rules(state)) return v4Offers(state);
  const taken = new Set(state.history.filter(h => h.accepted).map(h => h.cardId));
  const pool = cardsFor(state).filter(card => card.phases.includes(phaseFor(state.round)) && !taken.has(card.id) && (!card.requires || taken.has(card.requires)));
  const ranked = pool.map((card, i) => ({ card, weight: randomAt(state.seed, state.round * 500 + i + (state.redrawsUsed ?? 0) * 20000) })).sort((a, b) => a.weight - b.weight);
  const chosen = ranked.slice(0, 3).map(x => x.card);
  if (strategicRules(state)) diversifyOffers(ranked.map(x => x.card), chosen);
  // Avoid three unaffordable cards when an affordable eligible card exists.
  if (!chosen.some(card => costFor(state, card) <= state.resources.credits)) {
    const affordable = ranked.find(x => costFor(state, x.card) <= state.resources.credits);
    if (affordable) chosen[2] = affordable.card;
  }
  return chosen.map(card => card.id);
}

function diversifyOffers(ranked: Card[], chosen: Card[]) {
  // Random within roles, not a deck. Always offer a foundation and an action when possible.
  const foundation = ranked.find(c => (c.effects.transition ?? 0) < 8);
  const action = ranked.find(c => (c.effects.transition ?? 0) >= 8 && c.id !== foundation?.id);
  if (!foundation || !action) return;
  const flex = ranked.find(c => c.id !== foundation.id && c.id !== action.id && c.category !== foundation.category && c.category !== action.category)
    ?? ranked.find(c => c.id !== foundation.id && c.id !== action.id);
  if (flex) chosen.splice(0, 3, foundation, action, flex);
}

export function createRun(id: string, nickname: string, country: string, seed: number): RunState {
  return v11Create(id, nickname, country, seed);
}

function applyEffects(resources: Resources, effects: Effects) {
  for (const key of ["credits", "economy", "support", "awareness", "justice"] as const) {
    resources[key] = clamp(resources[key] + (effects[key] ?? 0), 0, key === "credits" ? 999 : 100);
  }
}

export function calculateScore(state: RunState) {
  if(v9Rules(state))throw new GameError("Temperature scoring requires a completed En-ROADS evaluation.",409);
  if (scarceBudgetRules(state)) return v5Score(state);
  if (v6Rules(state)) return v5Score(state);
  if (v5Rules(state)) return v5Score(state);
  if (v4Rules(state)) return v4Score(state);
  // Explicit designer weights; a score is not a scientific or ethical ranking.
  return Math.round(clamp(state.transition) * (strategicRules(state) ? 5 : 6) + state.resources.justice * 2 + state.resources.support + state.resources.economy + (strategicRules(state) ? state.resources.awareness : 0));
}

export function takeAction(current: RunState, cardId: string): RunState {
  if(current.rulesVersion==="prototype-0.11")return v11Action(current,cardId);
  if(v9Rules(current))return v9Action(current,cardId);
  if (scarceBudgetRules(current)) return v7Action(current, cardId);
  if (v6Rules(current)) return v6Action(current, cardId);
  if (v5Rules(current)) return v5Action(current, cardId);
  if (v4Rules(current)) return v4Action(current, cardId);
  if (current.finishedAt) throw new GameError("That run is already complete.", 409);
  const state: RunState = structuredClone(current);
  if (cardId === "redraw") {
    if (!modernRules(state) || (state.redrawsUsed ?? 0) >= 1) throw new GameError("Your one free redraw has already been used.");
    const old = new Set(state.offers);
    state.redrawsUsed = 1;
    const taken = new Set(state.history.filter(h => h.accepted).map(h => h.cardId));
    const pool = cardsFor(state).filter(c => c.phases.includes(phaseFor(state.round)) && !taken.has(c.id) && !old.has(c.id) && (!c.requires || taken.has(c.requires)));
    const temporary = offerCards(state);
    const ranked = pool.map((card, i) => ({ card, weight: randomAt(state.seed, 30000 + state.round * 500 + i) })).sort((a, b) => a.weight - b.weight);
    const chosen = ranked.slice(0, 3).map(x => x.card);
    if (strategicRules(state)) diversifyOffers(ranked.map(x => x.card), chosen);
    state.offers = ranked.length >= 3 ? chosen.map(card => card.id) : temporary;
    if (!state.offers.some(id => costFor(state, cardFor(state, id)!) <= state.resources.credits)) {
      const affordable = ranked.find(x => costFor(state, x.card) <= state.resources.credits);
      if (affordable) state.offers[2] = affordable.card.id;
    }
    state.revision += 1;
    return state;
  }
  const beforePerks = new Set(perksFor(state).filter(p => p.active).map(p => p.id));
  const year = YEARS[state.round];
  let decision: Decision;
  if (cardId === "save") {
    state.resources.credits += SAVE_BONUS;
    decision = { year, cardId, title: "Skip", category: "save", accepted: true, probability: 100, roll: 0, spent: 0, refund: 0, income: 0, transition: 0, effects: { credits: SAVE_BONUS } };
  } else {
    const card = cardFor(state, cardId);
    if (!card || !state.offers.includes(cardId)) throw new GameError("Choose one of the three cards currently offered.");
    const taken = new Set(state.history.filter(action => action.accepted).map(action => action.cardId));
    if (!card.phases.includes(phaseFor(state.round)) || taken.has(cardId) || (card.requires && !taken.has(card.requires))) throw new GameError("That policy is not eligible this decade.");
    const cost = costFor(state, card);
    if (state.resources.credits < cost) throw new GameError("Not enough credits for that card.");
    const probability = approvalFor(state, card);
    const roll = randomAt(state.seed, 10000 + state.round) * 100;
    const accepted = roll < probability;
    state.resources.credits -= cost;
    const refund = accepted ? 0 : refundFor(state, cost);
    state.resources.credits += refund;
    const effects = accepted ? effectsFor(state, card) : strategicRules(state) ? { support: -3 } : {};
    const transition = transitionFor(state, effects);
    // Evaluate readiness before applying the card: displayed gains match the committed receipt.
    applyEffects(state.resources, effects);
    state.transition += transition;
    decision = { year, cardId, title: card.title, category: card.category, accepted, probability, roll: Math.round(roll * 100) / 100, spent: cost, refund, income: 0, transition, effects };
  }
  state.history.push(decision);
  decision.unlockedPerks = perksFor(state).filter(p => p.active && !beforePerks.has(p.id)).map(p => p.id);
  state.round += 1;
  state.revision += 1;
  if (state.round === YEARS.length) {
    state.finishedAt = new Date().toISOString();
    state.offers = [];
    state.score = calculateScore(state);
  } else {
    // Support and awareness need maintenance. These are deliberately simple rules.
    const supportDecay = strategicRules(state) ? (hasPerk(state, "justice") ? 3 : 6) : (hasPerk(state, "justice") ? 0 : 3);
    const awarenessDecay = strategicRules(state) ? (hasPerk(state, "awareness") ? 0 : 4) : 2;
    const before = { ...state.resources };
    state.resources.support = clamp(state.resources.support - supportDecay);
    state.resources.awareness = clamp(state.resources.awareness - awarenessDecay);
    decision.decay = { support: state.resources.support - before.support, awareness: state.resources.awareness - before.awareness };
    decision.income = nextIncomeFor(state);
    state.resources.credits += decision.income;
    state.offers = offerCards(state);
  }
  state.projection = climateAdapter.project(state.history);
  return state;
}

export function takeCardBatch(current: RunState, cardIds: string[]): RunState {
  if(current.rulesVersion==="prototype-0.11")return v11Batch(current,cardIds);
  if(v9Rules(current))return v9Batch(current,cardIds);
  if (scarceBudgetRules(current)) return v7Batch(current, cardIds);
  if (v6Rules(current)) return v6Batch(current, cardIds);
  return v5Batch(current, cardIds);
}
export function takeSpecialAction(current: RunState, command: SpecialCommand): RunState { return current.rulesVersion==="prototype-0.11"?v11Special(current,command):current.rulesVersion==="prototype-0.10"?v10Special(current,command):v9Rules(current)?v9Special(current,command):v8Rules(current) ? v8Special(current, command) : v7Rules(current) ? v7Special(current, command) : v6Special(current, command); }

export function publicRun(state: RunState): PublicRun {
  return redactPublicRun(publicRunWithPrivateRolls(state));
}

// Also used when replaying responses persisted by earlier app versions.
export function redactPublicRun(visible: PublicRun): PublicRun {
  const safeDecision = ({ roll: _private, ...decision }: Decision): Decision => decision;
  return { ...visible, history: visible.history.map(safeDecision), ...(visible.lastActions ? { lastActions: visible.lastActions.map(safeDecision) } : {}) };
}

function publicRunWithPrivateRolls(state: RunState): PublicRun {
  if(state.rulesVersion==="prototype-0.11")return v11Public(state);
  if(v9Rules(state))return v9Public(state);
  if (v8Rules(state)) return v8Public(state);
  if (v7Rules(state)) return v7Public(state);
  if (v6Rules(state)) return v6Public(state);
  if (v5Rules(state)) return v5Public(state);
  if (v4Rules(state)) return v4Public(state);
  const { seed: _secret, offers, ...visible } = state;
  return {
    ...visible, phase: phaseFor(state.round), year: YEARS[state.round] ?? 2100,
    nextIncome: nextIncomeFor(state), perks: perksFor(state), worldEvent: eventFor(state), canRedraw: modernRules(state) && !state.finishedAt && (state.redrawsUsed ?? 0) < 1,
    offers: offers.map(id => {
      const card = cardFor(state, id)!;
      const cost = costFor(state, card);
      const effects = effectsFor(state, card);
      const bonuses: string[] = [];
      if (card.category === "technology" && hasPerk(state, "technology")) bonuses.push(`Engineering −${strategicRules(state) ? 2 : 1} cost`);
      if (hasPerk(state, "politics")) bonuses.push(`Mandate +${strategicRules(state) ? 10 : 8} approval`);
      if (hasPerk(state, "awareness")) bonuses.push("Informed +5 approval");
      if (card.category === "nature" && hasPerk(state, "nature")) bonuses.push(`Landscapes +${strategicRules(state) ? 4 : 3} transition`);
      if (eventFor(state)?.id === "spotlight" && ["politics", "justice", "awareness"].includes(card.category)) bonuses.push("Spotlight +6 approval");
      if (cost > card.cost) bonuses.push("Supply squeeze +1 cost");
      return { ...card, cost, baseCost: card.cost, effects, approval: approvalFor(state, card), affordable: cost <= state.resources.credits, bonuses, transitionGain: transitionFor(state, effects), mandateCost: mandateCostFor(state, card), rejectionRefund: refundFor(state, cost), rejectionSupport: strategicRules(state) ? 3 : 0 };
    }),
  };
}
