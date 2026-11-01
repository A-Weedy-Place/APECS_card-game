import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { publicRun, takeAction, takeCardBatch } from "../src/game/engine";
import { v6Create as createRun } from "../src/game/v6";
import { RARE_CARDS, specialFor, v6Special, v6Offers } from "../src/game/v6";
import { CHALLENGE_FRAMES, challengeScore, initialFlight, stepFlight, pulseAccuracy, validChallengeInput } from "../src/game/challenges";
import { COUNTRY_CODES } from "../src/lib/countries";
import type { RunState } from "../src/game/types";
const fresh = (seed = 1) => createRun("v6", "Tester", "PK", seed);

test("ten 2026 rounds contain exactly eight policy hands and two skippable special rounds", () => {
  let state = fresh(); let hands = 0; const specials: number[] = [];
  assert.equal(state.rulesVersion, "prototype-0.6");
  for (let round = 0; round < 10; round++) {
    const visible = publicRun(state);
    if (visible.specialRound) { specials.push(round + 1); assert.equal(visible.offers.length, 0); assert.throws(() => takeCardBatch(state, ["solar"])); }
    else { hands++; assert.equal(visible.offers.length, 3); }
    state = takeAction(state, "save");
  }
  assert.equal(hands, 8); assert.deepEqual(specials, [4, 7]); assert.ok(state.finishedAt);
  assert.ok(state.history.every(action => action.year === 2026));
  assert.deepEqual(state.projection.trajectory, []); assert.equal(state.projection.temperatureC, undefined);
});

test("one affordable multi-card commitment advances one round and settles funding once", () => {
  const state = fresh(); state.resources.credits = 20; state.offers = ["citizens-assembly", "climate-literacy", "local-campaign"];
  const result = takeCardBatch(state, state.offers.slice(0, 2));
  assert.equal(result.round, 1); assert.equal(result.revision, 1);
  assert.equal(result.history.filter(action => action.kind === "policy").length, 2);
  assert.equal(result.history.filter(action => action.kind === "round-end").length, 1);
  assert.ok(result.lastActions?.every(action => action.kind === "policy"));
  assert.equal(result.history.at(-1)!.effects.credits ?? 0, 0);
  assert.equal(result.resources.credits, 20 - result.history.reduce((sum, action) => sum + action.spent - action.refund - (action.effects.credits ?? 0) - action.income, 0));
});

test("unaffordable or duplicate packages leave the whole state untouched", () => {
  const state = fresh(); state.resources.credits = 1; const before = structuredClone(state);
  assert.throws(() => takeCardBatch(state, state.offers), /credits/); assert.deepEqual(state, before);
  assert.throws(() => takeCardBatch(state, [state.offers[0], state.offers[0]])); assert.deepEqual(state, before);
});

test("rare cards reveal a material downside only after successful adoption", () => {
  for (const card of RARE_CARDS) {
    let accepted: RunState | undefined;
    for (let seed = 0; seed < 100 && !accepted; seed++) {
      const state = fresh(seed); state.round = 4; state.resources.credits = 40; state.offers = [card.id];
      const preview = publicRun(state).offers[0];
      assert.equal(preview.rarity, "rare"); assert.ok(preview.risk); assert.equal("surprise" in preview, false);
      const result = takeCardBatch(state, [card.id]);
      if (result.lastActions![0].accepted) accepted = result;
    }
    assert.ok(accepted); const surprise = accepted.lastActions![0].surprise!;
    assert.ok(surprise.title); assert.ok(Object.values(surprise.effects).some(value => value < -10));
    assert.equal(accepted.projection.temperatureC, undefined);
  }
  const state = fresh(); state.round = 4; state.offers = v6Offers(state);
  assert.equal(state.offers.filter(id => RARE_CARDS.some(card => card.id === id)).length, 1);
});

test("challenge input is replayed with fixed physics and bounded difficulty/rewards", () => {
  assert.equal(challengeScore("flight", [], 1080), challengeScore("flight", [], 1080));
  let flight = initialFlight(); for (let tick = 0; tick < 200 && !flight.dead; tick++) flight = stepFlight(flight, false);
  assert.ok(flight.dead); assert.ok(flight.frame < 200);
  assert.ok(pulseAccuracy(1, 0) >= 0 && pulseAccuracy(1, 0) <= 1);
  assert.equal(validChallengeInput("pulse", [1, 2], 50), false);
  assert.equal(validChallengeInput("flight", [3, 2], 40), false);
  assert.equal(validChallengeInput("flight", [NaN], 40), false);
  assert.equal(validChallengeInput("flight", [], CHALLENGE_FRAMES + 1), false);
});

test("special attempt locks reward, rejects premature/forged claims and pays once", () => {
  let state = fresh(); state.round = 6; state.offers = [];
  const start = 100000;
  state = v6Special(state, { kind: "begin-special", reward: "support" }, start);
  assert.throws(() => v6Special(state, { kind: "begin-special", reward: "credits" }, start + 100));
  assert.throws(() => v6Special(state, { kind: "finish-special", frames: [], endFrame: 1080 }, start + 100), /running/);
  const result = v6Special(state, { kind: "finish-special", frames: [1, 31, 61, 91, 121], endFrame: 121 }, start + 3000);
  assert.equal(result.round, 7); assert.equal(result.specialAttempt, undefined); assert.equal(result.lastActions![0].kind, "special");
  assert.ok((result.lastActions![0].effects.support ?? 0) <= 20);
  assert.equal(result.history.at(-1)!.effects.credits ?? 0, 0);
  assert.throws(() => v6Special(result, { kind: "finish-special", frames: [], endFrame: 1 }, start + 4000));
});

test("skipping a special round clears an active attempt and cannot farm saving bonuses", () => {
  const state = fresh(); state.round = 3; state.offers = [];
  const attempt = v6Special(state, { kind: "begin-special", reward: "credits" }, 100);
  const result = takeAction(attempt, "skip-special");
  assert.equal(result.round, 4); assert.equal(result.specialAttempt, undefined); assert.equal(result.history.at(-1)!.effects.credits ?? 0, 0);
  state.resources.credits = 999;
  assert.equal(takeAction(state, "skip-special").resources.credits, 999);
});

test("rare cards count toward family buffs and subsequent quotes stay consistent", () => {
  const state = fresh(); state.resources.credits = 100;
  for (const id of ["solar", "rapid-grid"]) state.history.push({ year: 2026, kind: "policy", planningRound: 1, cardId: id, title: id, category: "technology", accepted: true, probability: 100, spent: 0, refund: 0, income: 0, transition: 0, effects: {} });
  state.offers = ["efficiency"];
  const quote = publicRun(state).offers[0];
  assert.ok(publicRun(state).perks.find(perk => perk.id === "technology")?.active);
  const result = takeCardBatch(state, ["efficiency"]);
  assert.equal(result.lastActions![0].spent, quote.cost);
  assert.equal(result.lastActions![0].probability, quote.approval);
});

test("all selectable countries have real local flag assets", () => {
  for (const code of COUNTRY_CODES) assert.ok(existsSync(`public/flags/${code.toLowerCase()}.svg`), code);
});

test("250 complete sessions preserve bounds, private seeds and legacy rules", () => {
  for (let seed = 0; seed < 250; seed++) {
    let state = fresh(seed);
    while (!state.finishedAt) {
      const visible = publicRun(state); const cards: string[] = []; let budget = visible.resources.credits;
      for (const card of visible.offers) if (card.cost <= budget) { cards.push(card.id); budget -= card.cost; }
      state = !specialFor(state.round) && cards.length ? takeCardBatch(state, cards) : takeAction(state, "save");
      assert.ok(state.resources.credits >= 0); assert.ok(state.resources.support >= 0 && state.resources.support <= 100);
    }
    const visible = publicRun(state); assert.equal("seed" in visible, false); assert.equal(JSON.stringify(visible).includes('"roll":'), false);
    assert.ok(state.score! >= 0 && state.score! <= 1000); assert.equal(state.round, 10);
  }
});
