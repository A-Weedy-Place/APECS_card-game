import test from "node:test";
import assert from "node:assert/strict";
import { CARDS, CARD_BY_ID } from "../src/game/cards";
import { approvalFor, createRun as createCurrentRun, effectsFor, GameError, offerCards, publicRun, takeAction } from "../src/game/engine";
import { incomeFor, phaseFor } from "../src/game/config";
import { demoAdapter } from "../src/game/model";
const YEARS = [2030, 2040, 2050, 2060, 2070, 2080, 2090];
// Regression fixtures preserve the already-shipped 0.2 numerical rules.
function createRun(...args: Parameters<typeof createCurrentRun>) { const run = createCurrentRun(...args); run.rulesVersion = "prototype-0.2"; run.resources = { credits: 10, economy: 55, support: 70, awareness: 30, justice: 25 }; run.projection=demoAdapter.project([]);run.offers = offerCards(run); return run; }

test("seven decision years and a 2100 result, never an eighth turn", () => {
  assert.deepEqual(YEARS, [2030, 2040, 2050, 2060, 2070, 2080, 2090]);
  let run = createRun("one", "Tester", "PK", 15);
  for (let i = 0; i < 7; i++) { assert.equal(publicRun(run).year, YEARS[i]); run = takeAction(run, "save"); }
  assert.equal(run.round, 7); assert.equal(run.history.length, 7);
  assert.ok(run.finishedAt); assert.equal(publicRun(run).year, 2100);
  assert.equal(run.offers.length, 0); assert.throws(() => takeAction(run, "save"), GameError);
});
test("three deterministic eligible offers, not a player-owned deck", () => {
  const a = createRun("one", "Tester", "PK", 123);
  const b = createRun("two", "Tester", "GB", 123);
  assert.deepEqual(a.offers, b.offers); assert.equal(a.offers.length, 3); assert.equal(new Set(a.offers).size, 3);
  assert.equal("deck" in a, false);
  assert.ok(a.offers.every(id => CARD_BY_ID.get(id)!.phases.includes("Foundation")));
  assert.equal(phaseFor(1), "Foundation"); assert.equal(phaseFor(2), "Momentum"); assert.equal(phaseFor(5), "Transformation");
});
test("saving preserves credits and adds bonus plus regular income", () => {
  const run = createRun("one", "Tester", "PK", 1);
  const next = takeAction(run, "save");
  assert.equal(next.resources.credits, 16); assert.equal(next.history[0].income, 4);
  assert.equal(run.resources.credits, 10); assert.equal(next.resources.support, 67); assert.equal(next.resources.awareness, 28);
  assert.deepEqual([incomeFor(0), incomeFor(24), incomeFor(25), incomeFor(75), incomeFor(100)], [2, 2, 3, 5, 6]);
});
test("unoffered and unaffordable cards are rejected server-side", () => {
  const run = createRun("one", "Tester", "PK", 5);
  assert.throws(() => takeAction(run, "not-a-card"), GameError);
  run.resources.credits = 0;
  assert.throws(() => takeAction(run, run.offers[0]), /Not enough credits/);
});
test("support and awareness improve odds and difficulty lowers them", () => {
  const run = createRun("one", "Tester", "PK", 123);
  const card = CARDS[0]; const low = approvalFor(run, card);
  run.resources.support += 15; assert.ok(approvalFor(run, card) > low);
  run.resources.support = 0; const unaware = approvalFor(run, card);
  run.resources.awareness = 80; assert.ok(approvalFor(run, card) > unaware);
  assert.ok(approvalFor(run, { ...card, difficulty: 20 }) < approvalFor(run, card));
});
test("worker protection softens coal trade-offs without claiming economic laws", () => {
  let run = createRun("one", "Tester", "PK", 3);
  run.offers = ["worker-transition", "efficiency", "solar"];
  // Find an accepted deterministic seed rather than forcing a random outcome.
  for (let seed = 1; seed < 100; seed++) { run.seed = seed; const candidate = takeAction(run, "worker-transition"); if (candidate.history[0].accepted) { run = candidate; break; } }
  const effects = effectsFor(run, CARD_BY_ID.get("coal-exit")!);
  assert.equal(effects.support, -5); assert.equal(effects.economy, -3);
});
test("rejected policy costs a turn, gives partial refund and no effects", () => {
  let found = false;
  for (let seed = 0; seed < 200; seed++) {
    const run = createRun("one", "Tester", "PK", seed); run.offers = ["solar"];
    const next = takeAction(run, "solar"); const action = next.history[0];
    if (!action.accepted) { found = true; assert.equal(action.refund, 3); assert.equal(action.transition, 0); assert.deepEqual(action.effects, {}); assert.equal(next.resources.credits, 12); assert.equal(next.round, 1); break; }
  }
  assert.ok(found);
});
test("adaptation can increase justice without changing climate pressure", () => {
  for (let seed = 0; seed < 100; seed++) {
    const run = createRun("one", "Tester", "PK", seed); run.round = 3; run.offers = ["adaptation"];
    const next = takeAction(run, "adaptation");
    if (next.history[0].accepted) { assert.equal(next.resources.justice, 49); assert.equal(next.projection.pressure, 100); return; }
  }
  assert.fail("No accepted seed found");
});
test("the public response hides seed and carries no fake temperature", () => {
  const run = publicRun(createRun("one", "Tester", "PK", 42));
  assert.equal("seed" in run, false); assert.equal(run.projection.kind, "illustrative");
  assert.equal(run.projection.temperatureC, undefined); assert.match(run.projection.caveat, /not a climate forecast/);
});
test("card data is unique and referenced prerequisites exist", () => {
  assert.equal(new Set(CARDS.map(c => c.id)).size, 36);
  for (const card of CARDS) { assert.ok(card.cost > 0); assert.ok(card.phases.length > 0); if (card.requires) assert.ok(CARD_BY_ID.has(card.requires)); }
});
test("1000 varied games complete with bounded resources, offers and scores", () => {
  for (let seed = 0; seed < 1000; seed++) {
    let run = createRun(`sim-${seed}`, "Simulation", "AQ", seed); run.rulesVersion = "prototype-0.3"; run.offers = offerCards(run);
    while (!run.finishedAt) {
      assert.equal(run.offers.length, 3); assert.equal(new Set(run.offers).size, 3);
      const taken = new Set(run.history.filter(h => h.accepted).map(h => h.cardId));
      assert.ok(run.offers.every(id => !taken.has(id)));
      assert.ok(run.offers.every(id => CARD_BY_ID.get(id)!.phases.includes(phaseFor(run.round))));
      assert.deepEqual(offerCards(run), run.offers);
      const eligible = publicRun(run).offers.filter(c => c.affordable);
      const choice = eligible[(seed + run.round) % eligible.length];
      run = takeAction(run, seed % 5 === 0 || !choice ? "save" : choice.id);
      for (const key of ["economy", "support", "awareness", "justice"] as const) assert.ok(run.resources[key] >= 0 && run.resources[key] <= 100);
      assert.ok(run.resources.credits >= 0);
    }
    assert.ok(run.score! >= 0 && run.score! <= 1000);
    assert.equal(run.history.length, 7);
  }
});
