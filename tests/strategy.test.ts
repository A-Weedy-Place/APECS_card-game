import test from "node:test";
import assert from "node:assert/strict";
import { CARDS, CARD_BY_ID, V2_CARD_BY_ID } from "../src/game/cards";
import { approvalFor, calculateScore, costFor, createRun as createCurrentRun, effectsFor, mandateCostFor, nextIncomeFor, offerCards, publicRun, refundFor, takeAction } from "../src/game/engine";
import { perksFor } from "../src/game/perks";
import type { RunState } from "../src/game/types";
function createRun(...args: Parameters<typeof createCurrentRun>) { const run = createCurrentRun(...args); run.rulesVersion = "prototype-0.3"; run.resources = { credits: 10, economy: 55, support: 70, awareness: 30, justice: 25 }; run.offers = offerCards(run); return run; }
function pass(run: RunState, cardId: string) {
  for (let seed = 0; seed < 200; seed++) {
    const candidate = structuredClone(run); candidate.seed = seed; candidate.resources.credits = 100; candidate.offers = [cardId];
    const next = takeAction(candidate, cardId); if (next.history.at(-1)!.accepted) return next;
  }
  throw new Error("No passing seed");
}
test("neglecting politics and awareness makes late action substantially harder", () => {
  let run = createRun("risk", "Test", "PK", 1); const nuclear = CARD_BY_ID.get("nuclear")!;
  const early = approvalFor(run, nuclear);
  for (let i = 0; i < 6; i++) run = takeAction(run, "save");
  const late = approvalFor(run, nuclear); assert.ok(early - late >= 35);
  const ready = structuredClone(run); ready.resources.support = 85; ready.resources.awareness = 65;
  assert.ok(approvalFor(ready, nuclear) - late >= 25);
  assert.ok(late >= 25 && late < 50);
});
test("politics, education and finance unlock different persistent advantages", () => {
  let politics = pass(pass(createRun("p", "Test", "PK", 1), "citizens-assembly"), "coalition");
  const without = structuredClone(politics); without.history = [];
  assert.equal(mandateCostFor(without, CARD_BY_ID.get("solar")!) - mandateCostFor(politics, CARD_BY_ID.get("solar")!), 3);
  let aware = pass(pass(createRun("a", "Test", "PK", 1), "climate-literacy"), "trusted-media");
  const before = aware.resources.awareness; aware = takeAction(aware, "save"); assert.equal(aware.resources.awareness, before);
  const economics = pass(pass(createRun("e", "Test", "PK", 1), "green-bank"), "innovation-fund");
  assert.equal(nextIncomeFor(economics), 2 + Math.floor(economics.resources.economy / 25) + 2);
});
test("technology and nature perks alter costs and gains, justice protects against setbacks", () => {
  const tech = pass(pass(createRun("t", "Test", "PK", 1), "solar"), "wind");
  assert.equal(costFor(tech, CARD_BY_ID.get("grid")!), CARD_BY_ID.get("grid")!.cost - 2);
  const nature = pass(pass(createRun("n", "Test", "PK", 1), "forest-protection"), "restore-land");
  assert.equal(effectsFor(nature, CARD_BY_ID.get("food")!).transition, 14);
  let justice = pass(pass(createRun("j", "Test", "PK", 1), "worker-transition"), "energy-access");
  const before = justice.resources.support; justice = takeAction(justice, "save"); assert.equal(justice.resources.support, before - 3);
  assert.equal(refundFor(justice, 8), 6); assert.equal(refundFor(createRun("u", "Test", "PK", 1), 8), 4);
});
test("every deal contains an enabler and an action unless affordability replaces one", () => {
  for (let seed = 0; seed < 250; seed++) {
    let run = createRun("mix", "Test", "PK", seed);
    while (!run.finishedAt) {
      const offers = publicRun(run).offers;
      assert.equal(offers.length, 3); assert.equal(new Set(offers.map(c => c.id)).size, 3);
      assert.ok(offers.some(c => (c.effects.transition ?? 0) < 8));
      assert.ok(offers.some(c => (c.effects.transition ?? 0) >= 8));
      run = takeAction(run, "save");
    }
  }
});
test("shown transition, cost and support effects match accepted receipts", () => {
  const start = createRun("match", "Test", "PK", 1);
  for (const card of CARDS) {
    const run = card.requires ? pass(structuredClone(start), card.requires) : structuredClone(start); run.round = card.phases.includes("Foundation") ? 0 : card.phases.includes("Momentum") ? 3 : 5; run.offers = [card.id]; run.resources.credits = 100;
    const shown = publicRun(run).offers[0]; const result = pass(run, card.id); const action = result.history.at(-1)!;
    assert.equal(action.transition, shown.transitionGain, card.id); assert.equal(action.spent, shown.cost, card.id); assert.deepEqual(action.effects, shown.effects, card.id);
  }
});
test("a corrupted offered list cannot bypass phase, prerequisites or successful ownership", () => {
  const run = createRun("eligibility", "Test", "PK", 1); run.resources.credits = 100;
  run.offers = ["removal"]; assert.throws(() => takeAction(run, "removal"), /not eligible/);
  run.round = 3; run.offers = ["international-deal"]; assert.throws(() => takeAction(run, "international-deal"), /not eligible/);
  const accepted = pass(createRun("owned", "Test", "PK", 1), "solar"); accepted.offers = ["solar"];
  assert.throws(() => takeAction(accepted, "solar"), /not eligible/);
});
test("old 0.2 rules keep their card pool, costs, decay and perks", () => {
  let run = createRun("old", "Test", "PK", 1); run.rulesVersion = "prototype-0.2";
  run = pass(pass(run, "solar"), "wind");
  assert.equal(costFor(run, V2_CARD_BY_ID.get("solar")!), 4);
  const support = run.resources.support; run = takeAction(run, "save"); assert.equal(run.resources.support, support - 3);
  assert.ok(perksFor(run).find(p => p.id === "technology")!.active);
  assert.equal(calculateScore(run), Math.round(Math.min(100, run.transition) * 6 + run.resources.justice * 2 + run.resources.support + run.resources.economy));
});
