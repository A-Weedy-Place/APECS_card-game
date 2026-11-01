import { YEARS, INITIAL_RESOURCES, SAVE_BONUS, phaseForVersion } from "./config";
import { GameError } from "./errors";
import { projectFor } from "./model";
import { randomAt } from "./random";
import { FAMILY_ORDER, familyInfoFor } from "./perks";
import { PATHWAYS, V4_CARDS, V4_CARD_BY_ID } from "./v4-cards";
import type { Card, Decision, Effects, OfferedCard, Perk, PublicRun, Resources, RunState, ScoreComponent, Synergy, WorldEvent } from "./types";

export const v4Rules = (state: Pick<RunState, "rulesVersion">) => state.rulesVersion === "prototype-0.4";
const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n));
// Engine history is append-only. Cache immutable accepted IDs per history revision so
// each 48-card library response does not rebuild the same set thousands of times.
const historyCache = new WeakMap<RunState, { history: Decision[]; length: number; ids: Set<string> }>();
const taken = (state: RunState) => {
  const cached = historyCache.get(state);
  if (cached?.history === state.history && cached.length === state.history.length) return cached.ids;
  const ids = new Set(state.history.filter(h => h.accepted && h.cardId !== "save").map(h => h.cardId));
  historyCache.set(state, { history: state.history, length: state.history.length, ids });
  return ids;
};
const has = (state: RunState, id: string) => taken(state).has(id);
const generated = (state: RunState) => ["solar", "wind", "community-power", "nuclear"].some(id => has(state, id));
const categoryCount = (state: RunState, category: Card["category"]) => [...taken(state)].filter(id => (V4_CARD_BY_ID.get(id)?.category ?? state.history.find(action => action.cardId === id && action.accepted)?.category) === category).length;
const perk = (state: RunState, category: Card["category"]) => categoryCount(state, category) >= 2;

type SynergyRule = Synergy & { active: (state: RunState) => boolean };
const SYNERGIES: SynergyRule[] = [
  { id: "connected-power", title: "Connected power", description: "Heat, retrofits, transit, industry and freight gain +4 base transition.", active: s => has(s, "grid") && generated(s) },
  { id: "fair-exit", title: "A managed exit", description: "Grid + worker protection turn coal-exit disruption into +5 economy and +4 support before effort.", active: s => has(s, "grid") && has(s, "worker-transition") },
  { id: "skilled-industry", title: "Skilled workforce", description: "Industrial actions cost 1 less credit and spend 2 less support.", active: s => has(s, "skills-training") && has(s, "worker-transition") },
  { id: "patient-investment", title: "Patient investment", description: "Successful cards with a base cost of 7+ return 1 credit.", active: s => has(s, "green-bank") && has(s, "clean-contracts") },
  { id: "trusted-evidence", title: "Trusted evidence", description: "+6 approval; awareness stops decaying.", active: s => has(s, "climate-literacy") && has(s, "trusted-media") },
  { id: "stable-coalition", title: "Durable mandate", description: "Support decays 1 less; action spends 1 less support; pact gains +5 base transition.", active: s => has(s, "citizens-assembly") && has(s, "coalition") },
  { id: "community-stewardship", title: "Community stewardship", description: "Nature gains +4 base transition and +4 support; land projects cost 1 less.", active: s => has(s, "indigenous-leadership") && has(s, "forest-protection") },
  { id: "regenerative-landscape", title: "Living food systems", description: "Agroecology gains +6 base transition; later nature projects gain +5 resilience.", active: s => has(s, "restore-land") && has(s, "food") },
  { id: "fair-revenue", title: "Shared returns", description: "Carbon pricing gives +3 support before political effort, instead of a -12 backlash.", active: s => has(s, "social-dividend") },
  { id: "local-consent", title: "Local consent", description: "Wind, nature and transport get +8 approval and +3 support.", active: s => has(s, "citizens-assembly") && has(s, "participatory-budget") },
  { id: "prepared-communities", title: "Prepared communities", description: "Warning systems plus local protection add 10 resilience to later adaptation investments.", active: s => has(s, "early-warning") && has(s, "adaptation") },
];
export function v4Synergies(state: RunState): Synergy[] { return SYNERGIES.filter(x => x.active(state)).map(({ active: _rule, ...publicInfo }) => publicInfo); }
const synergy = (state: RunState, id: string) => SYNERGIES.find(x => x.id === id)!.active(state);
const SYNERGY_RECIPES: Record<string, string[]> = {
  "connected-power": ["grid"], // Grid itself requires clean generation.
  "fair-exit": ["grid", "worker-transition"],
  "skilled-industry": ["skills-training", "worker-transition"],
  "patient-investment": ["green-bank", "clean-contracts"],
  "trusted-evidence": ["climate-literacy", "trusted-media"],
  "stable-coalition": ["citizens-assembly", "coalition"],
  "community-stewardship": ["indigenous-leadership", "forest-protection"],
  "regenerative-landscape": ["restore-land", "food"],
  "fair-revenue": ["social-dividend"],
  "local-consent": ["citizens-assembly", "participatory-budget"],
  "prepared-communities": ["early-warning", "adaptation"],
};
export function v4SynergyLibrary(state: RunState) {
  return SYNERGIES.map(({ active, ...recipe }) => ({ ...recipe, requires: SYNERGY_RECIPES[recipe.id], active: active(state) }));
}

export function v4Perks(state: RunState): Perk[] {
  return FAMILY_ORDER.map(id => ({ id, ...familyInfoFor(state, id), count: categoryCount(state, id), active: perk(state, id) }));
}
export function v4Event(state: RunState): WorldEvent | null {
  if (state.finishedAt) return null;
  if (state.round <= 5) return { id: "supply", title: state.round === 5 ? "Supply squeeze" : "Ahead: 2055 supply squeeze", description: state.round === 5 ? state.resources.economy >= 70 ? "Economy 70+ absorbs the technology surcharge." : "Technology costs +1 this turn. Economy 70+ avoids it." : "In 2055, technology costs +1 for one turn unless economy is 70+. A 2075 disruption drill is next: resilience 40 prevents losses.", icon: "factory" };
  if (state.round <= 9) return { id: "disruption", title: state.round === 9 ? "Disruption drill" : "Ahead: 2075 disruption drill", description: `${state.round === 9 ? "At turn end" : "After the 2075 action"}: -6 economy, -5 support. Resilience 20 halves the loss; 40 prevents it. Protection played that turn counts.`, icon: "shield" };
  return null;
}
export function v4Upkeep(state: RunState) {
  return Math.min(3, [...taken(state)].reduce((sum, id) => sum + (V4_CARD_BY_ID.get(id)?.upkeep ?? 0), 0));
}
export function v4Income(state: RunState) {
  const gross = 1 + Math.floor(clamp(state.resources.economy) / 25) + (perk(state, "economics") ? 1 : 0);
  return Math.max(1, Math.min(6, gross) - v4Upkeep(state));
}
export function v4Cost(state: RunState, card: Card) {
  const engineering = card.category === "technology" && perk(state, "technology") ? 1 : 0;
  const skills = card.pathway === "industry" && card.role === "action" && synergy(state, "skilled-industry") ? 1 : 0;
  const stewardship = card.pathway === "land" && synergy(state, "community-stewardship") ? 1 : 0;
  const squeeze = card.category === "technology" && state.round === 5 && state.resources.economy < 70 ? 1 : 0;
  return Math.max(1, card.cost - engineering - skills - stewardship + squeeze);
}
export function v4Approval(state: RunState, card: Card) {
  // Preparation and recovery are reliable. Difficult action takes a public, visible risk.
  if (card.role === "enabler") return 100;
  const { support, awareness, economy } = state.resources;
  const consent = (card.id === "wind" || card.category === "nature" || card.pathway === "mobility") && synergy(state, "local-consent") ? 8 : 0;
  const bonus = (perk(state, "politics") ? 5 : 0) + (synergy(state, "trusted-evidence") ? 6 : 0) + consent;
  return Math.round(clamp(48 + .38 * support + .2 * awareness + .12 * economy - card.difficulty - state.round * 1.7 + bonus, 5, 95));
}
export function v4Mandate(state: RunState, card: Card) {
  if (card.role !== "action") return 0;
  const skills = card.pathway === "industry" && synergy(state, "skilled-industry") ? 2 : 0;
  return Math.max(1, 2 * (card.tier ?? 1) + Math.floor(state.round / 5) - (perk(state, "politics") ? 1 : 0) - (state.resources.justice >= 50 ? 1 : 0) - (synergy(state, "stable-coalition") ? 1 : 0) - skills);
}
export function v4Refund(state: RunState, cost: number) { return Math.floor(cost * (perk(state, "justice") ? .75 : .5)); }
export function v4Effects(state: RunState, card: Card): Effects {
  const effects = { ...card.effects };
  if (card.id === "coal-exit") {
    const replacement = generated(state), protectedWorkers = has(state, "worker-transition");
    effects.economy = replacement ? protectedWorkers ? -2 : -7 : -15;
    effects.support = protectedWorkers ? -5 : -14;
    if (synergy(state, "fair-exit")) { effects.economy = 5; effects.support = 4; }
  }
  if (card.id === "carbon-price" && synergy(state, "fair-revenue")) effects.support = 3;
  if ((effects.transition ?? 0) > 0 && card.category === "nature") {
    effects.transition! += perk(state, "nature") ? 2 : 0;
    if (synergy(state, "community-stewardship")) { effects.transition! += 4; effects.support = (effects.support ?? 0) + 4; }
  }
  if (synergy(state, "connected-power") && ["heat", "deep-retrofit", "clean-transit", "clean-industry", "shipping"].includes(card.id)) effects.transition = (effects.transition ?? 0) + 4;
  if (card.id === "agroecology" && synergy(state, "regenerative-landscape")) effects.transition = (effects.transition ?? 0) + 6;
  if (card.id === "international-deal" && synergy(state, "stable-coalition")) effects.transition = (effects.transition ?? 0) + 5;
  if ((card.id === "wind" || card.category === "nature" || card.pathway === "mobility") && synergy(state, "local-consent")) effects.support = (effects.support ?? 0) + 3;
  if (state.resources.justice >= 50 && (effects.support ?? 0) < 0) effects.support = Math.ceil(effects.support! / 2);
  const mandate = v4Mandate(state, card);
  if (mandate) effects.support = (effects.support ?? 0) - mandate;
  if (card.cost >= 7 && synergy(state, "patient-investment")) effects.credits = (effects.credits ?? 0) + 1;
  return effects;
}
export function v4Transition(state: RunState, effects: Effects) {
  return Math.round((effects.transition ?? 0) * (1 + .02 * Math.max(0, YEARS.length - 1 - state.round)) * (.7 + .003 * clamp(state.resources.awareness)));
}
export function v4Resilience(state: RunState, card: Card) {
  let gain = card.resilience ?? 0;
  if (card.category === "nature" && synergy(state, "regenerative-landscape")) gain += 5;
  if (card.pathway === "resilience" && gain > 0 && synergy(state, "prepared-communities")) gain += 10;
  return gain;
}

export function v4LockedReason(state: RunState, card: Card): string | null {
  const adopted = taken(state);
  if (!card.repeatable && adopted.has(card.id)) return "Already played";
  if (state.round < (card.minRound ?? 0)) return `Available from ${YEARS[card.minRound!]}`;
  const all = [...(card.requiresAll ?? []), ...(card.requires ? [card.requires] : [])].filter(id => !adopted.has(id));
  if (all.length) return `Requires ${all.map(id => V4_CARD_BY_ID.get(id)!.title).join(" + ")}`;
  if (card.requiresAny?.length && !card.requiresAny.some(id => adopted.has(id))) return `Requires ${card.requiresAny.map(id => V4_CARD_BY_ID.get(id)!.title).join(" or ")}`;
  return null;
}
export function v4Offers(state: RunState, exclude: string[] = []): string[] {
  const eligible = V4_CARDS.filter(card => !v4LockedReason(state, card));
  const fresh = eligible.filter(card => !exclude.includes(card.id));
  const pool = fresh.length >= 3 ? fresh : eligible;
  const ranked = pool.map((card, i) => ({ card, rank: randomAt(state.seed, 80000 + state.round * 1000 + (state.redrawsUsed ?? 0) * 20000 + i) })).sort((a, b) => a.rank - b.rank).map(x => x.card);
  const chosen: Card[] = [];
  const add = (card: Card | undefined) => { if (card && !chosen.some(c => c.id === card.id)) chosen.push(card); };
  // One follow-up is guaranteed when one is eligible; a different sector can still tempt a pivot.
  add(ranked.find(card => (card.tier ?? 1) > 1 && (card.requiresAny?.length || card.requiresAll?.length)) ?? ranked.find(card => card.role === "action"));
  const recovery = state.resources.support < 30 || state.resources.awareness < 15;
  add(recovery ? ranked.find(card => card.id === "local-campaign") ?? ranked.find(card => card.role === "enabler" && !chosen.includes(card)) : ranked.find(card => card.role === "enabler" && !chosen.includes(card)));
  add(ranked.find(card => !chosen.includes(card) && !chosen.some(c => c.pathway === card.pathway)) ?? ranked.find(card => !chosen.includes(card)));
  for (const card of ranked) { if (chosen.length === 3) break; add(card); }
  return chosen.map(card => card.id);
}
export function v4Create(id: string, nickname: string, country: string, seed: number): RunState {
  const state: RunState = { id, nickname, country, seed, rulesVersion: "prototype-0.4", round: 0, revision: 0, resources: { ...INITIAL_RESOURCES }, transition: 0, resilience: 0, offers: [], history: [], startedAt: new Date().toISOString(), finishedAt: null, score: null, projection: projectFor([], "prototype-0.4"), redrawsUsed: 0, redrawsThisTurn: 0 };
  state.offers = v4Offers(state); return state;
}
function apply(resources: Resources, effects: Effects) {
  for (const key of ["credits", "economy", "support", "awareness", "justice"] as const) resources[key] = clamp(resources[key] + (effects[key] ?? 0), 0, key === "credits" ? 999 : 100);
}
export function v4Breakdown(state: RunState): ScoreComponent[] {
  return [
    { label: "Transition", value: Math.round(clamp(state.transition / 180 * 100) * 6), max: 600 },
    { label: "Justice", value: Math.round(clamp(state.resources.justice) * 1.5), max: 150 },
    { label: "Resilience", value: Math.round(clamp(state.resilience ?? 0)), max: 100 },
    { label: "Economy", value: Math.round(clamp(state.resources.economy) * .75), max: 75 },
    { label: "Politics", value: Math.round(clamp(state.resources.support) * .5), max: 50 },
    { label: "Awareness", value: Math.round(clamp(state.resources.awareness) * .25), max: 25 },
  ];
}
export function v4Score(state: RunState) { return v4Breakdown(state).reduce((sum, part) => sum + part.value, 0); }
export function v4Action(current: RunState, cardId: string): RunState {
  if (current.finishedAt) throw new GameError("That run is already complete.", 409);
  const state = structuredClone(current);
  if (cardId === "redraw") {
    const cost = (state.redrawsThisTurn ?? 0) + 1;
    if (state.resources.credits < cost) throw new GameError("Not enough credits to reshuffle.");
    state.resources.credits -= cost; state.redrawsThisTurn = cost; state.redrawsUsed = (state.redrawsUsed ?? 0) + 1;
    state.offers = v4Offers(state, state.offers); state.revision += 1; return state;
  }
  const beforePerks = new Set(v4Perks(state).filter(p => p.active).map(p => p.id));
  const beforeSynergies = new Set(v4Synergies(state).map(s => s.id));
  const year = YEARS[state.round];
  let decision: Decision;
  if (cardId === "save") {
    state.resources.credits = Math.min(999, state.resources.credits + SAVE_BONUS);
    decision = { year, cardId, title: "Skip", category: "save", accepted: true, probability: 100, roll: 0, spent: 0, refund: 0, income: 0, transition: 0, effects: { credits: SAVE_BONUS }, resilience: 0 };
  } else {
    const card = V4_CARD_BY_ID.get(cardId);
    if (!card || !state.offers.includes(cardId)) throw new GameError("Choose one of the three cards currently offered.");
    if (v4LockedReason(state, card)) throw new GameError("That policy is not eligible this turn.");
    const cost = v4Cost(state, card);
    if (state.resources.credits < cost) throw new GameError("Not enough credits for that card.");
    const probability = v4Approval(state, card), roll = randomAt(state.seed, 180000 + state.round) * 100, accepted = roll < probability;
    const refund = accepted ? 0 : v4Refund(state, cost);
    const effects = accepted ? v4Effects(state, card) : { support: -2 };
    const transition = accepted ? v4Transition(state, effects) : 0;
    const resilience = accepted ? v4Resilience(state, card) : 0;
    state.resources.credits -= cost - refund;
    apply(state.resources, effects); state.transition += transition;
    state.resilience = clamp((state.resilience ?? 0) + resilience);
    decision = { year, cardId, title: card.title, category: card.category, accepted, probability, roll: Math.round(roll * 100) / 100, spent: cost, refund, income: 0, transition, effects, resilience };
  }
  state.history.push(decision);
  decision.unlockedPerks = v4Perks(state).filter(p => p.active && !beforePerks.has(p.id)).map(p => p.id);
  decision.unlockedSynergies = v4Synergies(state).filter(s => !beforeSynergies.has(s.id)).map(s => s.id);
  state.round++; state.revision++; state.redrawsThisTurn = 0;
  if (state.round === YEARS.length) {
    state.finishedAt = new Date().toISOString(); state.offers = []; state.score = v4Score(state);
  } else {
    const before = { ...state.resources };
    // Public scenario event, announced before turn 10. Newly funded protection applies.
    if (state.round === 10) {
      const resilience = state.resilience ?? 0;
      const damage = resilience >= 40 ? 0 : resilience >= 20 ? .5 : 1;
      apply(state.resources, { economy: -Math.ceil(6 * damage), support: -Math.ceil(5 * damage) });
    }
    const economy = state.resources.economy;
    const stress = economy < 25 ? 4 : economy < 40 ? 2 : economy >= 70 ? -1 : 0;
    const supportDecay = Math.max(0, 3 + stress - (state.resources.justice >= 50 ? 1 : 0) - (synergy(state, "stable-coalition") ? 1 : 0));
    const awarenessDecay = synergy(state, "trusted-evidence") ? 0 : perk(state, "awareness") ? 1 : 2;
    apply(state.resources, { support: -supportDecay, awareness: -awarenessDecay });
    decision.decay = { support: state.resources.support - before.support, awareness: state.resources.awareness - before.awareness, economy: state.resources.economy - before.economy };
    decision.upkeep = v4Upkeep(state);
    decision.income = v4Income(state); state.resources.credits = Math.min(999, state.resources.credits + decision.income);
    state.offers = v4Offers(state);
  }
  state.projection = projectFor(state.history, state.rulesVersion);
  return state;
}

export function v4Preview(state: RunState, card: Card): OfferedCard {
  const cost = v4Cost(state, card), effects = v4Effects(state, card), bonuses: string[] = [];
  if (cost < card.cost) bonuses.push(`Combined discounts −${card.cost - cost} cost`);
  if (cost > card.cost) bonuses.push("Supply squeeze +1 cost");
  if (perk(state, "politics") && card.role === "action") bonuses.push("Political network +5 approval");
  if (synergy(state, "trusted-evidence") && card.role === "action") bonuses.push("Trusted evidence +6 approval");
  if (card.id === "carbon-price" && synergy(state, "fair-revenue")) bonuses.push("Shared returns: backlash becomes +3 support before effort");
  if ((card.id === "wind" || card.category === "nature" || card.pathway === "mobility") && synergy(state, "local-consent")) bonuses.push("Local consent: +8 approval, +3 support");
  if (card.category === "nature" && synergy(state, "community-stewardship")) bonuses.push("Community stewardship: +4 support");
  if ((effects.transition ?? 0) !== (card.effects.transition ?? 0)) bonuses.push(`Synergies +${(effects.transition ?? 0) - (card.effects.transition ?? 0)} base transition`);
  if (card.id === "coal-exit") bonuses.push(synergy(state, "fair-exit") ? "Managed exit: replacement power + worker protection" : generated(state) || has(state, "worker-transition") ? "Partial preparation softens disruption" : "Unprepared exit: strong economic disruption");
  if ((effects.credits ?? 0) > 0) bonuses.push("Patient investment: +1 credit on success");
  return { ...card, cost, baseCost: card.cost, effects, approval: v4Approval(state, card), affordable: cost <= state.resources.credits, transitionGain: v4Transition(state, effects), resilience: v4Resilience(state, card), bonuses, mandateCost: v4Mandate(state, card), rejectionRefund: v4Refund(state, cost), rejectionSupport: 2 };
}
export function v4Public(state: RunState): PublicRun {
  const { seed: _secret, offers, ...visible } = state;
  const redrawCost = (state.redrawsThisTurn ?? 0) + 1;
  const adopted = taken(state);
  return {
    ...visible, phase: phaseForVersion(state.round, state.rulesVersion), year: YEARS[state.round] ?? 2100,
    years: [...YEARS], totalRounds: YEARS.length, nextIncome: v4Income(state), upkeep: v4Upkeep(state), transitionTarget: 180,
    perks: v4Perks(state), worldEvent: v4Event(state), canRedraw: !state.finishedAt && state.resources.credits >= redrawCost, redrawCost,
    offers: offers.map(id => v4Preview(state, V4_CARD_BY_ID.get(id)!)),
    library: V4_CARDS.map(card => ({ ...v4Preview(state, card), lockedReason: v4LockedReason(state, card), taken: adopted.has(card.id) })),
    pathways: PATHWAYS, activeSynergies: v4Synergies(state), synergyLibrary: SYNERGIES.map(({ active, ...recipe }) => ({ ...recipe, requires: SYNERGY_RECIPES[recipe.id], active: active(state) })), scoreBreakdown: v4Breakdown(state),
  };
}
