import { GameError } from "./errors";
import { randomAt } from "./random";
import { defaultSettings, MODEL_VERSION } from "./policy-catalogue";
import { V11_BY_ID, V11_CARDS, v11Settings, type PolicyCardV11 } from "./v11-catalogue";
import { v11Arcade, v11Stage, V11_ROUND_LABELS } from "./v11-schedule";
import { endlessCoins, replaySurvival, validArcadeInput } from "./arcade";
import { v9Create, v9Income } from "./v9";
import type { Decision, Effects, OfferedCard, PublicRun, RunState, SpecialCommand } from "./types";

const clamp = (value: number, max = 100) => Math.max(0, Math.min(max, value));
const adopted = (state: RunState, id: string) => state.history.some(action => action.kind === "policy" && action.accepted && action.cardId === id);

export function v11Locked(state: RunState, card: PolicyCardV11): string | null {
  if (!card.repeatable && adopted(state, card.id)) return "Already adopted";
  if (card.excludes && adopted(state, card.excludes)) return "Opposite nuclear policy adopted";
  if ((card.minStage ?? 1) > v11Stage(state.round)) return "Unlocks in stage 2";
  if (card.requires && !adopted(state, card.requires)) return `Needs ${V11_BY_ID.get(card.requires)!.title}`;
  return null;
}

export function v11Approval(state: RunState, card: PolicyCardV11) {
  if (card.role === "enabler") return 100;
  if (state.electionMandate && card.rarity !== "rare") return Math.min(99, Math.round(96 + state.resources.support * .03));
  const policyRounds = state.history.filter(action => action.kind === "round-end" && ![4, 8].includes(action.planningRound!)).length;
  return Math.round(Math.max(5, Math.min(95, 47 + state.resources.support * .55 + state.resources.awareness * .12 - card.difficulty - policyRounds * 2)));
}

export function v11Effects(state: RunState, card: PolicyCardV11): Effects {
  const effects = { ...card.effects };
  if (card.factor) effects.support = (effects.support ?? 0) - Math.max(2, 3 + (card.tier ?? 1) * 2 - (state.resources.awareness >= 60 ? 2 : 0));
  return effects;
}

export function v11Quote(state: RunState, card: PolicyCardV11): OfferedCard & PolicyCardV11 {
  const rare = card.rarity === "rare";
  return { ...card, baseCost: card.cost, affordable: card.cost <= state.resources.credits, approval: v11Approval(state, card),
    effects: v11Effects(state, card), transitionGain: 0, bonuses: [],
    rejectionRefund: Math.floor(card.cost * (rare ? .25 : .5)), rejectionSupport: rare ? 15 : 4 };
}

export function v11Offers(state: RunState, exclude: string[] = []) {
  if (state.finishedAt || v11Arcade(state.round)) return [];
  const stage = v11Stage(state.round);
  const eligible = V11_CARDS.filter(card => !v11Locked(state, card));
  const ranked = eligible.map((card, index) => {
    const roll = Math.max(.000001, randomAt(state.seed, 2100000 + state.round * 10000 + (state.redrawsUsed ?? 0) * 100 + index));
    const weight = card.factor ? 1 : stage === 1 ? 1.5 : 1;
    return { card, rank: -Math.log(roll) / weight };
  }).sort((a, b) => a.rank - b.rank).map(item => item.card);
  const fresh = ranked.filter(card => !exclude.includes(card.id));
  const source = fresh.length >= 3 ? fresh : ranked;
  const common = source.filter(card => card.rarity !== "rare");
  const selected: PolicyCardV11[] = [];
  const supportFirst = stage === 1 || randomAt(state.seed, 2200000 + state.round + (state.redrawsUsed ?? 0) * 31) < .5;
  const support = common.find(card => !card.factor && card.cost <= state.resources.credits);
  if (supportFirst && support) selected.push(support);
  for (const card of common) {
    if (selected.length === 3) break;
    if (!selected.includes(card)) selected.push(card);
  }
  const rare = source.find(card => card.rarity === "rare");
  if (rare && randomAt(state.seed, 2300000 + state.round + (state.redrawsUsed ?? 0) * 13) < [0, .06, .12, .18][stage]) selected[2] = rare;
  if (!selected.some(card => card.cost <= state.resources.credits)) {
    const affordable = common.find(card => card.cost <= state.resources.credits);
    if (affordable) selected[0] = affordable;
  }
  return selected.map(card => card.id);
}

export function v11Create(id: string, name: string, country: string, seed: number): RunState {
  const state = v9Create(id, name, country, seed);
  state.rulesVersion = "prototype-0.11";
  state.projection.version = MODEL_VERSION;
  state.policySettings = defaultSettings();
  state.offers = v11Offers(state);
  return state;
}

function apply(state: RunState, effects: Effects) {
  for (const key of ["credits", "economy", "support", "awareness"] as const) {
    state.resources[key] = clamp(state.resources[key] + (effects[key] ?? 0), key === "credits" ? 20 : 100);
  }
}

function settle(state: RunState, outcomes: Decision[], arcade = false) {
  const ending: Decision = { kind: "round-end", planningRound: state.round + 1, year: 2026, cardId: "end-round", title: outcomes.length ? "Round complete" : "Skipped",
    category: "save", accepted: true, probability: 100, spent: 0, refund: 0, income: 0, transition: 0, effects: {} };
  state.history.push(ending);
  state.round++;
  state.revision++;
  state.redrawsThisTurn = 0;
  delete state.specialAttempt;
  if (state.round === V11_ROUND_LABELS.length) {
    state.finishedAt = new Date().toISOString();
    state.elapsedMs = Math.max(0, Date.parse(state.finishedAt) - Date.parse(state.startedAt));
    state.score = null;
  } else if (!arcade) {
    const before = { ...state.resources };
    apply(state, { support: -(3 + (state.resources.economy < 25 ? 3 : 0)), awareness: -1 });
    ending.decay = { support: state.resources.support - before.support, awareness: state.resources.awareness - before.awareness };
    ending.income = Math.min(v9Income(state), 20 - state.resources.credits);
    apply(state, { credits: ending.income });
  }
  state.lastActions = outcomes.length ? outcomes.map((action, index) => index ? action : { ...action, income: ending.income, decay: ending.decay }) : [ending];
  state.policySettings = v11Settings(state.history);
  state.offers = v11Offers(state);
  return state;
}

export function v11Batch(current: RunState, ids: string[]) {
  if (current.finishedAt || v11Arcade(current.round)) throw new GameError("This is not a policy round.", 409);
  if (!ids.length || ids.length > 3 || new Set(ids).size !== ids.length || ids.some(id => !current.offers.includes(id))) throw new GameError("Choose offered cards only.");
  const cards = ids.map(id => V11_BY_ID.get(id));
  if (cards.some(card => !card || v11Locked(current, card))) throw new GameError("A prerequisite or stage is missing.");
  const valid = cards as PolicyCardV11[];
  const factors = valid.filter(card => card.factor).map(card => card.factor);
  if (new Set(factors).size !== factors.length) throw new GameError("Choose one card per model control in a round.");
  const quotes = valid.sort((a, b) => current.offers.indexOf(a.id) - current.offers.indexOf(b.id)).map(card => v11Quote(current, card));
  const cost = quotes.reduce((sum, card) => sum + card.cost, 0);
  if (cost > current.resources.credits) throw new GameError("Not enough coins for this selection.");
  const state = structuredClone(current);
  state.resources.credits -= cost;
  const outcomes: Decision[] = [];
  for (const card of quotes) {
    const accepted = randomAt(current.seed, 2400000 + current.history.length + outcomes.length) * 100 < card.approval;
    const refund = accepted ? 0 : card.rejectionRefund!;
    const effects = accepted ? card.effects : { support: -card.rejectionSupport! };
    apply(state, { credits: refund });
    apply(state, effects);
    if (accepted && card.wildcard) state.electionMandate = true;
    const action: Decision = { kind: "policy", planningRound: current.round + 1, year: 2026, cardId: card.id, title: card.title,
      category: card.category, accepted, probability: card.approval, spent: card.cost, refund, income: 0, transition: 0, effects };
    state.history.push(action);
    outcomes.push(action);
  }
  return settle(state, outcomes);
}

export function v11Action(current: RunState, id: string) {
  if (current.finishedAt) throw new GameError("The game is complete.", 409);
  if (["save", "end-round", "skip-special"].includes(id)) return settle(structuredClone(current), [], !!v11Arcade(current.round));
  if (id !== "redraw") return v11Batch(current, [id]);
  if (v11Arcade(current.round)) throw new GameError("No cards to shuffle.");
  const cost = (current.redrawsThisTurn ?? 0) + 1;
  if (cost > current.resources.credits) throw new GameError("Not enough coins to shuffle.");
  const state = structuredClone(current);
  state.resources.credits -= cost;
  state.redrawsThisTurn = cost;
  state.redrawsUsed = (state.redrawsUsed ?? 0) + 1;
  state.revision++;
  state.lastActions = [];
  state.offers = v11Offers(state, current.offers);
  return state;
}

export function v11Special(current: RunState, command: SpecialCommand, now = Date.now()) {
  const kind = v11Arcade(current.round);
  if (!kind || current.finishedAt) throw new GameError("No arcade round is active.", 409);
  if (command.kind === "begin-special") {
    if (current.specialAttempt || command.reward !== "credits") throw new GameError("Arcade rewards are coins only.");
    const state = structuredClone(current);
    state.specialAttempt = { kind, reward: "credits", startedAt: now };
    state.revision++;
    state.lastActions = [];
    return state;
  }
  const attempt = current.specialAttempt;
  if (!attempt || attempt.kind !== kind || !validArcadeInput(kind, command.frames, command.endFrame, command.moves, "endless")) throw new GameError("Invalid arcade inputs.");
  if (now - attempt.startedAt < command.endFrame / 60 * 1000 - 250) throw new GameError("The challenge is still running.", 409);
  const replay = replaySurvival(kind, command.frames, command.endFrame, command.moves);
  if (!replay.dead || replay.frame !== command.endFrame) throw new GameError("Finish the survival run before collecting coins.");
  const state = structuredClone(current);
  const amount = Math.min(endlessCoins(command.endFrame), 20 - state.resources.credits);
  apply(state, { credits: amount });
  const action: Decision = { kind: "special", planningRound: current.round + 1, year: 2026, cardId: `challenge-${kind}`, title: kind === "flight" ? "Flappy Flight" : "Reef Rescue",
    category: "save", accepted: true, probability: 100, spent: 0, refund: 0, income: 0, transition: 0, effects: { credits: amount }, challengeScore: command.endFrame };
  state.history.push(action);
  return settle(state, [action], true);
}

export function v11Public(state: RunState): PublicRun {
  const { seed: _private, offers, ...safe } = state;
  return { ...safe, phase: v11Stage(state.round) === 1 ? "Foundation" : v11Stage(state.round) === 2 ? "Momentum" : "Transformation", year: 2026,
    planningYear: 2026, resultYear: 2100, totalRounds: 11, nextIncome: v9Income(state), perks: [], worldEvent: null,
    canRedraw: !state.finishedAt && !v11Arcade(state.round) && state.resources.credits >= (state.redrawsThisTurn ?? 0) + 1,
    redrawCost: (state.redrawsThisTurn ?? 0) + 1, offers: offers.map(id => v11Quote(state, V11_BY_ID.get(id)!)),
    library: V11_CARDS.map(card => ({ ...v11Quote(state, card), lockedReason: v11Locked(state, card), taken: adopted(state, card.id) })),
    specialRound: state.finishedAt ? null : v11Arcade(state.round), generalApproval: v11Approval(state, V11_CARDS[0]), bankLimit: 20, roundSaveBonus: 0 };
}
