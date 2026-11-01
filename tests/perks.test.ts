import test from "node:test";
import assert from "node:assert/strict";
import { approvalFor, costFor, createRun as createCurrentRun, effectsFor, nextIncomeFor, offerCards, publicRun, takeAction } from "../src/game/engine";
import { CARD_BY_ID, LEGACY_CARD_BY_ID } from "../src/game/cards";
import { eventFor, perksFor } from "../src/game/perks";
import type { RunState } from "../src/game/types";
function createRun(...args: Parameters<typeof createCurrentRun>) { const run = createCurrentRun(...args); run.rulesVersion = "prototype-0.2"; run.resources = { credits: 10, economy: 55, support: 70, awareness: 30, justice: 25 }; run.offers = offerCards(run); return run; }
function pass(state: RunState, id: string) {
  for (let seed = 0; seed < 200; seed++) {
    const candidate = structuredClone(state); candidate.seed = seed; candidate.offers = [id]; candidate.resources.credits = 100;
    const next = takeAction(candidate, id);
    if (next.history.at(-1)!.accepted) return next;
  }
  throw new Error("No passing seed found");
}
test("six families have explicit permanent perks after two successful policies", () => {
  let run = createRun("perks", "Perk Tester", "PK", 0);
  run = pass(run, "solar"); assert.equal(perksFor(run).find(p => p.id === "technology")!.active, false);
  run = pass(run, "wind"); assert.ok(perksFor(run).find(p => p.id === "technology")!.active);
  assert.deepEqual(run.history.at(-1)!.unlockedPerks, ["technology"]);
  assert.equal(costFor(run, CARD_BY_ID.get("efficiency")!), 2);
  assert.equal(perksFor(run).length, 6);
});
test("economic perk increases next-turn income and awareness perk improves approval", () => {
  let run = createRun("perks", "Perk Tester", "PK", 1);
  run = pass(pass(run, "green-bank"), "innovation-fund");
  assert.equal(nextIncomeFor(run), 2 + Math.floor(run.resources.economy / 25) + 1);
  run = pass(pass(run, "climate-literacy"), "trusted-media");
  const without = structuredClone(run); without.rulesVersion = "prototype-0.1";
  const card = CARD_BY_ID.get("nuclear")!;
  assert.ok(approvalFor(run, card) > approvalFor(without, card));
});
test("justice perk prevents between-round support decay; nature adds only game transition", () => {
  let run = createRun("perks", "Perk Tester", "PK", 1);
  run = pass(pass(run, "worker-transition"), "community-power");
  const support = run.resources.support;
  run = takeAction(run, "save"); assert.equal(run.resources.support, support);
  run = pass(pass(run, "forest-protection"), "restore-land");
  assert.equal(effectsFor(run, CARD_BY_ID.get("food")!).transition, 13);
  assert.equal(run.projection.temperatureC, undefined);
});
test("redraw replaces all offers exactly once without spending money or a decade", () => {
  const run = createRun("redraw", "Redraw Tester", "PK", 42);
  const next = takeAction(run, "redraw");
  assert.equal(next.round, 0); assert.equal(next.revision, 1); assert.deepEqual(next.resources, run.resources);
  assert.equal(next.history.length, 0); assert.equal(next.offers.length, 3); assert.ok(next.offers.every(id => !run.offers.includes(id)));
  assert.equal(publicRun(next).canRedraw, false); assert.throws(() => takeAction(next, "redraw"), /already been used/);
  assert.equal(takeAction(next, "save").round, 1);
});
test("decade events show modifiers before selection and economy absorbs a surcharge", () => {
  const run = createRun("events", "Event Tester", "PK", 3); run.round = 2;
  assert.equal(eventFor(run)!.id, "spotlight");
  const legacy = structuredClone(run); legacy.rulesVersion = "prototype-0.1";
  const card = CARD_BY_ID.get("citizens-assembly")!;
  assert.equal(approvalFor(run, card), approvalFor(legacy, card) + 6);
  run.round = 5; const solar = CARD_BY_ID.get("solar")!;
  assert.equal(costFor(run, solar), solar.cost + 1);
  run.resources.economy = 75; assert.equal(costFor(run, solar), solar.cost);
});
test("legacy runs do not silently gain new perks, events or redraw", () => {
  let run = createRun("legacy", "Legacy Tester", "PK", 0); run.rulesVersion = "prototype-0.1";
  run = pass(pass(run, "solar"), "wind");
  assert.equal(perksFor(run).some(p => p.active), false);
  assert.equal(eventFor(run), null); assert.equal(publicRun(run).canRedraw, false);
  assert.equal(costFor(run, LEGACY_CARD_BY_ID.get("solar")!), 5);
  run.offers = ["green-bank"];
  assert.equal(publicRun(run).offers[0].category, "politics");
  run.offers = ["innovation-fund"];
  assert.throws(() => takeAction(run, "innovation-fund"), /Choose one of/);
});
