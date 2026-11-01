import { createRun, publicRun, takeAction, takeCardBatch } from "../src/game/engine";
import { RULES_VERSION } from "../src/game/config";
import { randomAt } from "../src/game/random";
import type { OfferedCard, PublicRun } from "../src/game/types";

// Design probes, not optimal players or empirical climate models. Controllers see
// public offers only, never future draws/approval rolls. Runs never touch SQLite.
const STRATEGIES = ["random", "burst", "mixed", "finance", "nature", "technology", "politics"] as const;
type Strategy = typeof STRATEGIES[number];
type StudyCard = OfferedCard & {
  pathway?: string; tier?: number; role?: string; enabling?: boolean;
  requiresAny?: string[]; requiresAll?: string[];
};
const isAction = (card: StudyCard) => card.role ? card.role === "action" : !card.enabling;
type StudyView = PublicRun & {
  totalRounds?: number; redrawCost?: number;
  library?: (StudyCard & { taken?: boolean; lockedReason?: string | null })[];
};
type Sample = {
  seed: number; score: number; transition: number; passes: number; attempts: number;
  skips: number; redraws: number; lateOdds: number[]; lateActionOdds: number[]; credits: number;
  endSupport: number; endEconomy: number; actionAttempts: number; actionPasses: number;
  upgrades: number; capstones: number; paths: string[]; firstCard: string;
  played: string[]; trace: string[]; synergies: string[];
  multiCardRounds: number; lowCashRounds: number; target: number;
};

function integerArg(name: string, fallback: number) {
  const value = process.argv.find(arg => arg.startsWith(`--${name}=`))?.split("=")[1];
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < (name === "samples" ? 1 : 0)) throw new Error(`Invalid --${name}`);
  return parsed;
}
const samples = integerArg("samples", 500);
const firstSeed = integerArg("seed", 0);
const routeBonus = integerArg("route-bonus", 14);
const mean = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const round = (value: number, places = 1) => Number(value.toFixed(places));
const percentile = (values: number[], quantile: number) => [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) * quantile)] ?? 0;
const positive = (value: number | undefined) => Math.max(0, value ?? 0);

function cappedEffects(card: StudyCard, view: StudyView) {
  const effect = { ...card.effects };
  for (const key of ["economy", "support", "awareness", "justice"] as const) {
    effect[key] = Math.max(0, Math.min(100, view.resources[key] + (effect[key] ?? 0))) - view.resources[key];
  }
  return effect;
}

function directValue(card: StudyCard, view: StudyView) {
  const effect = cappedEffects(card, view);
  const target = view.transitionTarget ?? 180;
  const transition = Math.max(0, Math.min(target - view.transition, card.transitionGain));
  const resilience = Math.max(0, Math.min(100 - (view.resilience ?? 0), card.resilience ?? 0));
  return transition * (600 / target) + (effect.justice ?? 0) * 1.5
    + resilience + (effect.economy ?? 0) * .75
    + (effect.support ?? 0) * .5 + (effect.awareness ?? 0) * .25;
}

function value(card: StudyCard, view: StudyView, strategy: Strategy) {
  const probability = card.approval / 100;
  if (strategy === "burst") return probability * card.transitionGain * (600 / (view.transitionTarget ?? 180)) - card.cost * .45;
  const turnsLeft = (view.totalRounds ?? 10) - view.round - 1;
  const effect = cappedEffects(card, view);
  const resources = view.resources;
  const supportNeed = Math.max(0, 60 - resources.support) / 16;
  const awarenessNeed = Math.max(0, 50 - resources.awareness) / 22;
  const economyNeed = Math.max(0, 60 - resources.economy) / 28;
  const future = Math.min(1, turnsLeft / 4);
  let result = directValue(card, view)
    + future * ((effect.support ?? 0) * supportNeed + (effect.awareness ?? 0) * awarenessNeed
      + positive(effect.economy) * (economyNeed + Math.min(1.2, turnsLeft * .1)));

  // A prerequisite matters only if a successor exists and time remains to play it.
  // This bonus does not peek at whether a future deal will actually contain it.
  const successors = (view.library ?? []).filter(next => !next.taken &&
    (next.requires === card.id || next.requiresAny?.includes(card.id) || next.requiresAll?.includes(card.id)));
  if (turnsLeft >= 2) result += Math.min(3, successors.length) * 3;
  if ((card.tier ?? 1) > 1) result += 3;

  // Route preferences stay soft: specialists still maintain enabling resources.
  if (strategy === "finance" && turnsLeft >= 6 && card.category === "economics") result += routeBonus + 1;
  if (strategy === "nature" && card.category === "nature") result += routeBonus;
  if (strategy === "technology" && card.category === "technology") result += routeBonus;
  if (strategy === "politics" && turnsLeft >= 2 && card.category === "politics") result += resources.support < 75 ? routeBonus + 3 : 3;

  const refund = card.rejectionRefund ?? Math.floor(card.cost * .5);
  const expectedLoss = (1 - probability) * (card.cost - refund);
  const budgetPressure = resources.credits < 7 && turnsLeft > 0 ? 1.15 : .55;
  const addedUpkeep = Math.max(0, Math.min(3 - (view.upkeep ?? 0), card.upkeep ?? 0));
  return result * probability - card.cost * budgetPressure - expectedLoss * .9 - addedUpkeep * turnsLeft * .65;
}

function rankCards(view: StudyView, strategy: Strategy) {
  return (view.offers as StudyCard[]).filter(card => card.affordable)
    .map(card => ({ card, value: value(card, view, strategy) }))
    .sort((a, b) => b.value - a.value || a.card.id.localeCompare(b.card.id));
}

function playV6(seed: number, strategy: Strategy): Sample {
  let run = createRun(`study-${strategy}-${seed}`, "Balance probe", "AQ", seed);
  const record: Sample = { seed, score: 0, transition: 0, passes: 0, attempts: 0, skips: 0, redraws: 0, lateOdds: [], lateActionOdds: [], credits: 0, endSupport: 0, endEconomy: 0, actionAttempts: 0, actionPasses: 0, upgrades: 0, capstones: 0, paths: [], firstCard: "save", played: [], trace: [], synergies: [], multiCardRounds: 0, lowCashRounds: 0, target: 150 };
  while (!run.finishedAt) {
    let view = publicRun(run) as StudyView;
    if (view.specialRound) { run = takeAction(run, "skip-special"); record.trace.push(`R${view.round + 1}:challenge-skip`); continue; }
    let ranked = rankCards(view, strategy);
    if (strategy !== "burst" && strategy !== "random" && (!ranked.length || ranked[0].value < 7) && view.canRedraw && view.resources.credits >= (view.redrawCost ?? 1) + 4) {
      run = takeAction(run, "redraw"); record.redraws++; view = publicRun(run); ranked = rankCards(view, strategy);
    }
    let budget = view.resources.credits;
    const cards = ranked.filter((entry, index) => {
      if (entry.card.cost > budget || (strategy === "random" && randomAt(seed, 880000 + view.round * 10 + index) < .3) || (strategy !== "random" && entry.value < 0)) return false;
      budget -= entry.card.cost; return true;
    }).map(entry => entry.card);
    if (!cards.length) { run = takeAction(run, "save"); record.skips++; record.trace.push(`R${view.round + 1}:save`); continue; }
    if (!record.attempts) record.firstCard = cards[0].id;
    record.attempts += cards.length; if (cards.length > 1) record.multiCardRounds++;
    for (const card of cards) {
      if (isAction(card)) record.actionAttempts++;
      if (view.round >= 7) { record.lateOdds.push(card.approval); if (isAction(card)) record.lateActionOdds.push(card.approval); }
    }
    run = takeCardBatch(run, cards.map(card => card.id));
    for (const decision of run.lastActions ?? []) {
      const card = cards.find(card => card.id === decision.cardId)!;
      if (decision.accepted) { record.passes++; record.played.push(card.id); if (isAction(card)) record.actionPasses++; if ((card.tier ?? 1) > 1) record.upgrades++; if ((card.tier ?? 1) === 3) record.capstones++; if (card.pathway) record.paths.push(card.pathway); }
      record.trace.push(`R${view.round + 1}:${decision.cardId}:${decision.accepted ? "passed" : "rejected"}${decision.surprise ? ":surprise" : ""}`);
    }
    if (run.resources.credits < 3) record.lowCashRounds++;
  }
  record.score = run.score!; record.transition = run.transition; record.credits = run.resources.credits; record.endSupport = run.resources.support; record.endEconomy = run.resources.economy;
  record.synergies = run.history.flatMap(decision => decision.unlockedSynergies ?? []);
  return record;
}
function play(seed: number, strategy: Strategy): Sample {
  if (["prototype-0.6", "prototype-0.7"].includes(RULES_VERSION)) return playV6(seed, strategy);
  let run = createRun(`study-${strategy}-${seed}`, "Balance probe", "AQ", seed);
  const record: Sample = { seed, score: 0, transition: 0, passes: 0, attempts: 0, skips: 0,
    redraws: 0, lateOdds: [], lateActionOdds: [], credits: 0, endSupport: 0, endEconomy: 0, actionAttempts: 0, actionPasses: 0,
    upgrades: 0, capstones: 0, paths: [], firstCard: "save", played: [], trace: [], synergies: [],
    multiCardRounds: 0, lowCashRounds: 0, target: 180 };
  let iterations = 0;
  while (!run.finishedAt) {
    const planningRound = run.round;
    let playedThisRound = 0, redrawnThisRound = false;
    // Preparation can be committed before another card in the same 2026 round.
    // No projected years pass between plays. Ending the round alone funds the
    // next drafting tranche. Never assume history length or revision is a turn.
    while (true) {
      if (++iterations > 150) throw new Error(`Run did not finish: ${strategy}, seed ${seed}`);
      let view = publicRun(run) as StudyView;
      record.target = view.transitionTarget ?? 180;
      let offers = rankCards(view, strategy);
      let choice: StudyCard | undefined;
      if (strategy === "random") {
        // Independent controller randomness; no peeking at engine rolls.
        const index = Math.floor(randomAt(seed, 900_000 + run.revision) * (offers.length + 1));
        choice = offers[index]?.card;
      } else {
        // At most one paid reshuffle per planning round, including after cards
        // have been played. More intensive search can outperform this probe.
        const redrawCost = view.redrawCost ?? Number.POSITIVE_INFINITY;
        const weakHand = !offers.length || offers[0].value < 7;
        if (strategy !== "burst" && !redrawnThisRound && view.canRedraw && weakHand && view.resources.credits >= redrawCost + 4) {
          run = takeAction(run, "redraw"); record.redraws++; redrawnThisRound = true;
          view = publicRun(run) as StudyView; offers = rankCards(view, strategy);
        }
        choice = offers[0] && (offers[0].value > 0 || view.round === (view.totalRounds ?? 10) - 1) ? offers[0].card : undefined;
        // Passing does not retain this offer. Saving toward an upgrade is a
        // resource preference, not knowledge of a later draw.
        const upgrade = (view.offers as StudyCard[]).filter(card => !card.affordable && (card.tier ?? 1) > 1
          && card.cost <= view.resources.credits + view.nextIncome + (playedThisRound ? 0 : 2))
          .sort((a, b) => value(b, view, strategy) - value(a, view, strategy))[0];
        if (strategy !== "burst" && upgrade && view.round < (view.totalRounds ?? 10) - 2
          && value(upgrade, view, strategy) > (offers[0]?.value ?? 0) + 14) choice = undefined;
      }
      if (!choice) break;
      if (!record.attempts) record.firstCard = choice.id;
      record.attempts++; playedThisRound++;
      if (isAction(choice)) record.actionAttempts++;
      if (run.round >= (view.totalRounds ?? 10) - 3) {
        record.lateOdds.push(choice.approval);
        if (isAction(choice)) record.lateActionOdds.push(choice.approval);
      }
      run = takeAction(run, choice.id);
      if (run.round !== planningRound) throw new Error("This probe requires planning rounds; a policy must not advance the round.");
      const decision = run.history.at(-1)!;
      if (decision.accepted) {
        record.passes++;
        if (isAction(choice)) record.actionPasses++;
        record.played.push(choice.id);
        if ((choice.tier ?? 1) > 1) record.upgrades++;
        if ((choice.tier ?? 1) >= 3) record.capstones++;
        if (choice.pathway) record.paths.push(choice.pathway);
      }
      record.trace.push(`R${planningRound + 1}:${choice.id}:${decision.accepted ? "passed" : "rejected"}`);
    }
    if (!playedThisRound) record.skips++;
    if (playedThisRound >= 2) record.multiCardRounds++;
    if (run.resources.credits < 3) record.lowCashRounds++;
    run = takeAction(run, "save");
    record.trace.push(`R${planningRound + 1}:${playedThisRound ? "end" : "save"}`);
  }
  record.score = run.score!;
  record.transition = run.transition;
  record.credits = run.resources.credits;
  record.endSupport = run.resources.support;
  record.endEconomy = run.resources.economy;
  record.synergies = run.history.flatMap(decision => decision.unlockedSynergies ?? []);
  return record;
}

function frequency(values: string[], denominator: number, limit = 5) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit)
    .map(([id, count]) => ({ id, percentOfRuns: round(count / denominator * 100) }));
}

console.log(JSON.stringify({ study: "Shared-seed controller comparison", rulesVersion: RULES_VERSION,
  samplesPerStrategy: samples, firstSeed, routeBonus, strategies: STRATEGIES,
  caveat: "Heuristic probes, not optimal play or proof of fairness. Strategy strength, score spread and RNG variance are different questions. No database writes." }));
const results = new Map<Strategy, Sample[]>();
for (const strategy of STRATEGIES) {
  const runs = Array.from({ length: samples }, (_, index) => play(firstSeed + index, strategy));
  results.set(strategy, runs);
  const scores = runs.map(run => run.score);
  const scoreMean = mean(scores);
  console.log(JSON.stringify({ strategy, mean: round(scoreMean), p10: percentile(scores, .1), median: percentile(scores, .5), p90: percentile(scores, .9),
    min: Math.min(...scores), max: Math.max(...scores), sd: round(Math.sqrt(mean(scores.map(score => (score - scoreMean) ** 2)))),
    passed: round(mean(runs.map(run => run.passes))), attempts: round(mean(runs.map(run => run.attempts))),
    skips: round(mean(runs.map(run => run.skips))), redraws: round(mean(runs.map(run => run.redraws)), 2),
    multiCardRounds: round(mean(runs.map(run => run.multiCardRounds))), lowCashRounds: round(mean(runs.map(run => run.lowCashRounds))),
    lateApproval: round(mean(runs.flatMap(run => run.lateOdds))), transition: round(mean(runs.map(run => run.transition))),
    lateActionApproval: runs.some(run => run.lateActionOdds.length) ? round(mean(runs.flatMap(run => run.lateActionOdds))) : null,
    actionAttempts: round(mean(runs.map(run => run.actionAttempts))), actionPassed: round(mean(runs.map(run => run.actionPasses))),
    transitionCapPercent: round(runs.filter(run => run.transition >= run.target).length / samples * 100),
    perfectScorePercent: round(runs.filter(run => run.score >= 1000).length / samples * 100),
    remainingCredits: round(mean(runs.map(run => run.credits))), upgrades: round(mean(runs.map(run => run.upgrades))),
    endSupport: round(mean(runs.map(run => run.endSupport))), endEconomy: round(mean(runs.map(run => run.endEconomy))),
    capstones: round(mean(runs.map(run => run.capstones))), distinctPaths: round(mean(runs.map(run => new Set(run.paths).size))),
    synergies: round(mean(runs.map(run => run.synergies.length))), commonSynergies: frequency(runs.flatMap(run => run.synergies), samples),
    mostUsedCards: frequency(runs.flatMap(run => [...new Set(run.played)]), samples),
    commonOpenings: frequency(runs.map(run => run.firstCard), samples, 3),
    pathCoverage: frequency(runs.flatMap(run => [...new Set(run.paths)]), samples, 20) }));
}
for (const baseline of ["random", "burst"] as const) {
  const adaptive = results.get("mixed")!;
  const naive = results.get(baseline)!;
  const deltas = adaptive.map((run, index) => run.score - naive[index].score);
  console.log(JSON.stringify({ paired: `mixed vs ${baseline}`, meanScoreDifference: round(mean(deltas)),
    p10Difference: percentile(deltas, .1), p90Difference: percentile(deltas, .9),
    betterPercent: round(deltas.filter(delta => delta > 0).length / samples * 100), tiesPercent: round(deltas.filter(delta => delta === 0).length / samples * 100) }));
}
const mixed = results.get("mixed")!;
const best = mixed.reduce((a, b) => a.score > b.score ? a : b);
const worst = mixed.reduce((a, b) => a.score < b.score ? a : b);
console.log(JSON.stringify({ example: "mixed best and worst for replay; not optimal routes", best: { seed: best.seed, score: best.score, trace: best.trace },
  worst: { seed: worst.seed, score: worst.score, trace: worst.trace } }));
