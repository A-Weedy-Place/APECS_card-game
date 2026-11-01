import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { startRun, getRun, actOnRun } from "../src/server/store";
import type { PublicRun } from "../src/game/types";
import { publicRun, takeAction, takeCardBatch } from "../src/game/engine";
import { v5Create as createRun } from "../src/game/v5";

// Separate from the player preview and every other suite. These tests exercise
// the actual transaction boundary, not client-side button restrictions.
process.env.DATABASE_PATH = `./data/session-security-${randomUUID()}.sqlite`;

function startWith(predicate: (run: PublicRun) => boolean) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const candidate = startRun("Package security", "AQ");
    if (predicate(candidate.run)) return candidate;
  }
  throw new Error("Could not construct a suitable offered-hand transaction fixture.");
}
function affordablePair(run: PublicRun) {
  for (let i = 0; i < run.offers.length; i++) for (let j = i + 1; j < run.offers.length; j++) {
    if (run.offers[i].cost + run.offers[j].cost <= run.resources.credits) return [run.offers[i].id, run.offers[j].id];
  }
  return null;
}

test("replaying a response cached by an older app cannot expose historical random rolls", () => {
  const { run, token } = startRun("Cached privacy", "AQ");
  const requestId = randomUUID();
  const result = actOnRun(run.id, token, "end-round", run.revision, requestId) as PublicRun;
  const legacyCached = structuredClone(result);
  legacyCached.history.forEach(action => { action.roll = 42.17; });
  legacyCached.lastActions?.forEach(action => { action.roll = 42.17; });
  const fixture = new DatabaseSync(process.env.DATABASE_PATH!);
  try { fixture.prepare("UPDATE actions SET response = ? WHERE run_id = ? AND request_id = ?").run(JSON.stringify(legacyCached), run.id, requestId); }
  finally { fixture.close(); }
  const replay = actOnRun(run.id, token, "end-round", run.revision, requestId) as PublicRun;
  assert.deepEqual(replay, result);
  assert.equal(replay.history.some(action => Object.hasOwn(action, "roll")), false);
  assert.equal(replay.lastActions?.some(action => Object.hasOwn(action, "roll")), false);
});

test("a batch must be affordable in aggregate, with no debit or history on refusal", () => {
  const { run, token } = startWith(candidate => candidate.offers.every(card => card.affordable)
    && candidate.offers.reduce((total, card) => total + card.cost, 0) > candidate.resources.credits);
  const before = getRun(run.id, token);
  assert.throws(() => actOnRun(run.id, token, run.offers.map(card => card.id), run.revision, randomUUID()), /credits|coins|afford/i);
  assert.deepEqual(getRun(run.id, token), before);
});

test("one invalid batch member, duplicate or control action rolls back the entire package", () => {
  const { run, token } = startWith(candidate => candidate.offers.some(card => card.affordable));
  const good = run.offers.find(card => card.affordable)!.id;
  for (const ids of [[good, "not-a-policy"], [good, good], [good, "save"], [good, "redraw"], []]) {
    assert.throws(() => actOnRun(run.id, token, ids, run.revision, randomUUID()));
    assert.deepEqual(getRun(run.id, token), run, ids.join(", "));
  }
});

test("a package uses one revision, advances one round, and repeated requests cannot double-spend", () => {
  const { run, token } = startWith(candidate => affordablePair(candidate) !== null);
  const ids = affordablePair(run)!;
  const requestId = randomUUID();
  const next = actOnRun(run.id, token, ids, run.revision, requestId) as PublicRun;
  assert.equal(next.revision, run.revision + 1);
  assert.equal(next.round, run.round + 1);
  assert.equal(next.history.length, 3);
  assert.ok(next.history.every(decision => decision.year === 2026));
  assert.ok(next.history.filter(decision => decision.kind === "policy").every(decision => decision.income === 0));
  const expectedCredits = run.resources.credits + next.history.reduce((total, decision) =>
    total - decision.spent + decision.refund + (decision.effects.credits ?? 0) + decision.income, 0);
  assert.equal(next.resources.credits, expectedCredits);
  assert.deepEqual(actOnRun(run.id, token, ids, run.revision, requestId), next);
  // Existing idempotency semantics return the original response even when a
  // caller mistakenly reuses the key with another payload. Nothing new executes.
  assert.deepEqual(actOnRun(run.id, token, "save", next.revision, requestId), next);
  assert.deepEqual(getRun(run.id, token), next);
  assert.throws(() => actOnRun(run.id, token, "save", run.revision, randomUUID()), /board changed/i);
  assert.throws(() => actOnRun(run.id, "wrong-session-token", ids, next.revision, requestId), /session key invalid/i);
  assert.throws(() => actOnRun(run.id, token, ["not-an-offered-card"], next.revision, randomUUID()), /current hand|offered|eligible/i);
  assert.deepEqual(getRun(run.id, token), next);
});

test("confirmed packages and skips settle funding once without an extra saving bonus", () => {
  const { run, token } = startWith(candidate => affordablePair(candidate) !== null);
  const played = actOnRun(run.id, token, affordablePair(run)!, run.revision, randomUUID()) as PublicRun;
  const receipt = played.history.at(-1)!;
  assert.equal(played.round, 1);
  assert.equal(receipt.effects.credits ?? 0, 0);
  const skipped = actOnRun(run.id, token, "save", played.revision, randomUUID()) as PublicRun;
  assert.equal(skipped.round, 2);
  assert.equal(skipped.history.at(-1)!.effects.credits ?? 0, 0);
  assert.equal(skipped.resources.credits, played.resources.credits + skipped.history.at(-1)!.income);
});

test("public planning responses never expose the private seed or RNG roll samples", () => {
  const { run, token } = startWith(candidate => candidate.offers.some(card => card.affordable));
  const next = actOnRun(run.id, token, [run.offers.find(card => card.affordable)!.id], run.revision, randomUUID()) as PublicRun;
  for (const visible of [run, next, getRun(run.id, token)]) {
    assert.equal("seed" in visible, false);
    assert.equal(JSON.stringify(visible).includes('"roll":'), false);
    assert.equal(visible.projection.temperatureC, undefined);
  }
});

test("the final drafting round allows several policies but finishes only when explicitly ended", () => {
  let state = createRun("last-round", "Final planner", "AQ", 1);
  for (let round = 0; round < 9; round++) state = takeAction(state, "end-round");
  state.offers = ["citizens-assembly", "climate-literacy", "local-campaign"];
  const beforeFunding = state.resources.credits;
  state = takeCardBatch(state, ["citizens-assembly", "climate-literacy"]);
  assert.equal(state.round, 9); assert.equal(state.finishedAt, null); assert.equal(state.score, null);
  assert.ok(state.resources.credits < beforeFunding);
  state = takeAction(state, "local-campaign");
  assert.equal(state.finishedAt, null); assert.equal(publicRun(state).playedThisRound, 3);
  const beforeEnd = state.resources.credits;
  state = takeAction(state, "end-round");
  assert.ok(state.finishedAt); assert.equal(state.round, 10);
  assert.equal(state.resources.credits, beforeEnd); assert.equal(state.history.at(-1)!.income, 0);
  assert.throws(() => takeAction(state, "end-round"), /complete/);
});

test("repeating a recovery card cannot manufacture distinct-card family perks", () => {
  let state = createRun("repeat-recovery", "Recovery planner", "AQ", 2);
  state.resources.credits = 100;
  for (let repeat = 0; repeat < 4; repeat++) {
    // Eligible repeated recovery may reappear after a paid reshuffle. Injecting
    // that lawful offer isolates the family-count rule from random dealing.
    state.offers = ["local-campaign"];
    state = takeAction(state, "local-campaign");
  }
  const politics = publicRun(state).perks.find(perk => perk.id === "politics")!;
  assert.equal(politics.count, 1); assert.equal(politics.active, false);
  assert.equal(publicRun(state).playedThisRound, 4); assert.equal(state.round, 0);
});
