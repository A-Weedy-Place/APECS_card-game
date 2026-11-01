import test from "node:test";
import assert from "node:assert/strict";
import { publicRun, takeAction, takeCardBatch, transitionFor, approvalFor } from "../src/game/engine";
import { v5Create as createRun, V5_CARDS, V5_CARD_BY_ID, v5LockedReason } from "../src/game/v5";
import type { RunState } from "../src/game/types";

const fresh = (seed = 1) => createRun("planning", "Planner", "PK", seed);
function adopted(state: RunState, ...ids: string[]) {
  for (const id of ids) {
    const card = V5_CARD_BY_ID.get(id)!;
    state.history.push({ year: 2026, planningRound: 1, kind: "policy", cardId: id, title: card.title, category: card.category, accepted: true, probability: 100, roll: 0, spent: 0, refund: 0, income: 0, transition: 0, effects: {} });
  }
  return state;
}
function acceptedBatch(state: RunState, ids: string[]) {
  for (let seed = 0; seed < 1000; seed++) {
    const fixture = structuredClone(state); fixture.seed = seed;
    const result = takeCardBatch(fixture, ids);
    if (result.lastActions!.every(action => action.accepted)) return result;
  }
  throw new Error("Could not find an accepted test package");
}

test("new games have ten explicit planning rounds, all adoption stays in 2026", () => {
  let state = fresh();
  assert.equal(state.rulesVersion, "prototype-0.5");
  assert.equal(publicRun(state).totalRounds, 10);
  assert.deepEqual(publicRun(state).years, []);
  for (let round = 0; round < 10; round++) {
    assert.equal(state.round, round); assert.equal(publicRun(state).year, 2026);
    state = takeAction(state, "end-round");
    assert.equal(state.history.at(-1)!.planningRound, round + 1);
  }
  assert.ok(state.finishedAt); assert.equal(state.history.length, 10);
  assert.ok(state.history.every(action => action.year === 2026));
  assert.equal(publicRun(state).resultYear, 2100);
  assert.equal(state.history.at(-1)!.income, 0);
  assert.equal(state.projection.temperatureC, undefined);
  assert.throws(() => takeCardBatch(state, ["solar"]), /complete/);
});

test("a funded package plays multiple cards without advancing, income or automatic replacement", () => {
  const state = fresh(); state.offers = ["citizens-assembly", "climate-literacy", "solar"];
  const next = takeCardBatch(state, ["citizens-assembly", "climate-literacy"]);
  assert.equal(next.round, 0); assert.equal(next.revision, 1);
  assert.equal(next.resources.credits, 6);
  assert.equal(next.resources.support, 96); assert.equal(next.resources.awareness, 63);
  assert.deepEqual(next.offers, ["solar"]); assert.equal(next.lastActions!.length, 2);
  assert.ok(next.lastActions!.every(action => action.income === 0 && !action.decay));
  assert.equal(publicRun(next).playedThisRound, 2); assert.equal(publicRun(next).roundSaveBonus, 0);
  assert.deepEqual(state.history, []); assert.equal(state.resources.credits, 12);
});

test("packages preflight all ownership, duplicates, prerequisites and combined affordability atomically", () => {
  const state = fresh(); state.offers = ["solar", "wind", "climate-literacy"];
  const original = structuredClone(state);
  assert.throws(() => takeCardBatch(state, ["solar", "solar"]), /different/);
  assert.throws(() => takeCardBatch(state, ["solar", "adaptation"]), /offered/);
  assert.throws(() => takeCardBatch(state, ["solar", "wind", "climate-literacy"]), /credits/);
  assert.throws(() => takeCardBatch(state, []), /different/);
  assert.throws(() => takeCardBatch(state, ["end-round"]), /offered/);
  assert.deepEqual(state, original);
  state.offers = ["solar", "grid"]; state.resources.credits = 50;
  assert.throws(() => takeCardBatch(state, ["solar", "grid"]), /not eligible/);
  assert.equal(state.history.length, 0);
});

test("package quotes are frozen and client order cannot change capped resources or rolls", () => {
  const state = fresh(); state.offers = ["climate-literacy", "solar", "efficiency"];
  const before = publicRun(state).offers;
  const next = acceptedBatch(state, [...state.offers].reverse());
  assert.equal(next.lastActions!.length, 3);
  for (const receipt of next.lastActions!) {
    const quote = before.find(card => card.id === receipt.cardId)!;
    assert.equal(receipt.spent, quote.cost); assert.equal(receipt.probability, quote.approval);
    assert.equal(receipt.transition, quote.transitionGain); assert.deepEqual(receipt.effects, quote.effects);
  }
  assert.ok(next.lastActions![0].effects.awareness! > 0);
  assert.equal(new Set(next.lastActions!.map(action => action.roll)).size, 3);
  const capped = fresh(); capped.offers = ["coalition", "revenue-reform", "citizens-assembly"]; capped.resources.support = 99; capped.resources.credits = 30;
  const forward = takeCardBatch(capped, ["coalition", "revenue-reform"]);
  const reverse = takeCardBatch(capped, ["revenue-reform", "coalition"]);
  assert.deepEqual(forward, reverse);
});

test("successors depend on prerequisite adoption, never on a later calendar date", () => {
  const state = fresh(); state.resources.credits = 30; state.offers = ["solar"];
  assert.match(v5LockedReason(state, V5_CARD_BY_ID.get("grid")!)!, /Requires/);
  const next = acceptedBatch(state, ["solar"]);
  assert.equal(next.round, 0); assert.equal(v5LockedReason(next, V5_CARD_BY_ID.get("grid")!), null);
  assert.equal(v5LockedReason(next, V5_CARD_BY_ID.get("solar")!), "Already adopted");
  assert.equal(v5LockedReason(state, V5_CARD_BY_ID.get("coal-exit")!), null);
  const early = fresh(), late = fresh(); late.round = 9;
  assert.equal(transitionFor(early, { transition: 20 }), transitionFor(late, { transition: 20 }));
  assert.equal(publicRun(next).library!.find(card => card.id === "grid")!.lockedReason, null);
});

test("round settlement is once per round; attempts prevent skip bonus and redraw cost persists", () => {
  let state = fresh(); state.offers = ["climate-literacy"];
  state = takeAction(state, "redraw"); assert.equal(publicRun(state).redrawCost, 2);
  state.offers = ["climate-literacy"];
  state = takeAction(state, "climate-literacy");
  assert.equal(publicRun(state).redrawCost, 2); assert.equal(state.round, 0);
  const before = { ...state.resources };
  state = takeAction(state, "end-round");
  const receipt = state.lastActions![0];
  assert.deepEqual(receipt.effects, {}); assert.equal(receipt.income, 5);
  assert.equal(state.resources.credits, before.credits + 5);
  assert.equal(state.resources.awareness, before.awareness - 2);
  assert.equal(publicRun(state).redrawCost, 1); assert.equal(state.round, 1);
  const empty = takeAction(fresh(), "save");
  assert.equal(empty.resources.credits, 19); assert.equal(empty.lastActions![0].effects.credits, 2);
});

test("rejection spends credits but cannot unlock technology or earn the idle-round bonus", () => {
  let failed: RunState | undefined;
  for (let seed = 0; seed < 1000; seed++) {
    const state = fresh(seed); state.offers = ["solar"];
    const next = takeAction(state, "solar");
    if (!next.lastActions![0].accepted) { failed = next; break; }
  }
  assert.ok(failed);
  const receipt = failed.lastActions![0];
  assert.equal(receipt.transition, 0); assert.equal(receipt.refund, 2);
  assert.equal(failed.resources.credits, 9); assert.equal(failed.round, 0);
  assert.equal(publicRun(failed).roundSaveBonus, 0);
  assert.match(v5LockedReason(failed, V5_CARD_BY_ID.get("grid")!)!, /Requires/);
  assert.equal(publicRun(failed).history[0].roll, undefined);
  assert.equal(publicRun(failed).lastActions![0].roll, undefined);
});

test("every catalogue quote matches successful application, including combinations", () => {
  for (const card of V5_CARDS) {
    const state = fresh(); state.resources.credits = 100;
    adopted(state, ...(card.requiresAll ?? []), ...(card.requiresAny?.slice(0, 1) ?? []));
    state.offers = [card.id];
    const quote = publicRun(state).offers[0], next = acceptedBatch(state, [card.id]), receipt = next.lastActions![0];
    assert.equal(receipt.spent, quote.cost, card.id);
    assert.equal(receipt.probability, quote.approval, card.id);
    assert.deepEqual(receipt.effects, quote.effects, card.id);
    assert.equal(receipt.transition, quote.transitionGain, card.id);
    assert.equal(receipt.resilience, quote.resilience, card.id);
  }
});

test("accepted cards contribute documented scenario targets once, not additive temperatures", () => {
  const state = fresh(); state.offers = ["solar", "wind", "citizens-assembly"];
  const preview = publicRun(state);
  assert.equal(preview.offers[0].climateInputs![0].value, -50);
  assert.equal(preview.offers[2].climateInputs!.length, 0);
  assert.equal(preview.offers[0].climateInputs![0].evidence, "documented-control-designer-target");
  assert.match(preview.offers[0].climateNote!, /temperature/);
  const next = acceptedBatch(state, ["solar", "wind"]);
  const combined = publicRun(next).climateScenario!;
  assert.equal(combined.length, 1); assert.equal(combined[0].value, -60);
  assert.equal(combined[0].adoptionYear, 2026); assert.equal(combined[0].modelStartYear, 2027);
  assert.equal(next.projection.temperatureC, undefined);
});

test("weak political capital stays consequential and zero credits can always end the round", () => {
  let state = fresh(); state.round = 9;
  state.resources = { credits: 0, economy: 0, support: 0, awareness: 0, justice: 0 };
  assert.equal(approvalFor(state, V5_CARD_BY_ID.get("removal")!), 9);
  assert.equal(approvalFor(state, V5_CARD_BY_ID.get("local-campaign")!), 100);
  assert.equal(publicRun(state).canRedraw, false); assert.equal(publicRun(state).canEndRound, true);
  state = takeAction(state, "end-round"); assert.ok(state.finishedAt);
});

test("300 varied sessions settle ten rounds with bounded scores, no temperature or secret rolls", () => {
  for (let seed = 0; seed < 300; seed++) {
    let state = fresh(seed);
    while (!state.finishedAt) {
      let budget = state.resources.credits;
      const selected = publicRun(state).offers.filter(card => { if (card.cost > budget) return false; budget -= card.cost; return true; }).map(card => card.id);
      if (selected.length && seed % 8 !== 0) state = takeCardBatch(state, selected);
      if (seed % 13 === 0 && publicRun(state).canRedraw) state = takeAction(state, "redraw");
      state = takeAction(state, "end-round");
      for (const key of ["support", "economy", "awareness", "justice"] as const) assert.ok(state.resources[key] >= 0 && state.resources[key] <= 100);
      assert.ok(state.resources.credits >= 0);
    }
    assert.equal(state.history.filter(action => action.kind === "round-end").length, 10);
    assert.ok(state.history.every(action => action.year === 2026));
    assert.ok(state.score! >= 0 && state.score! <= 1000);
    const visible = publicRun(state);
    assert.equal("seed" in visible, false); assert.ok(visible.history.every(action => !("roll" in action)));
    assert.equal(visible.projection.temperatureC, undefined);
  }
});
