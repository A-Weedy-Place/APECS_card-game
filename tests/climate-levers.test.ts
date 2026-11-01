import test from "node:test";
import assert from "node:assert/strict";
import { CLIMATE_LEVERS, climateLeversForCard, combineClimateLevers, climateMappingNote, POLICY_ADOPTION_YEAR, ENROADS_EARLIEST_START_YEAR, ENROADS_REFERENCE_VERSION } from "../src/game/climate-levers";
import { V5_CARDS } from "../src/game/v5";
import { publicRun, takeAction } from "../src/game/engine";
import { v8Create as createRun } from "../src/game/v8";

test("mapped card settings carry bounded input units, provenance and separate adoption/implementation years", () => {
  let mapped = 0;
  for (const card of V5_CARDS) for (const input of climateLeversForCard(card.id)) {
    mapped++;
    const definition = CLIMATE_LEVERS[input.leverId];
    assert.ok(Number.isFinite(input.value));
    assert.ok(input.value >= definition.min && input.value <= definition.max, card.id);
    assert.equal(input.unit, definition.unit); assert.match(input.source, /^https:\/\//);
    assert.equal(input.evidence, "documented-control-designer-target");
    assert.equal(input.adoptionYear, POLICY_ADOPTION_YEAR); assert.equal(input.adoptionYear, 2026);
    assert.equal(input.modelStartYear, ENROADS_EARLIEST_START_YEAR); assert.equal(input.modelStartYear, 2027);
    assert.equal(input.sourceVersion, ENROADS_REFERENCE_VERSION);
    if (input.timing.kind === "phase-in") {
      assert.ok(input.timing.years > 0);
      assert.equal(input.timing.targetYear, input.modelStartYear + input.timing.years);
    }
    assert.equal("temperatureC" in input, false);
  }
  assert.ok(mapped >= 20);
});

test("overlapping policies select stronger absolute targets, never add subsidy or efficiency percentages", () => {
  const inputs = combineClimateLevers(["solar", "wind", "community-power", "heat", "clean-industry", "efficiency", "deep-retrofit", "circular-materials"]);
  assert.equal(inputs.find(input => input.leverId === "renewables-price")!.value, -60);
  assert.equal(inputs.find(input => input.leverId === "buildings-efficiency")!.value, 3);
  assert.equal(inputs.find(input => input.leverId === "buildings-electrification")!.value, 35);
  assert.equal(inputs.find(input => input.leverId === "industrial-processes")!.value, 70);
  assert.equal(new Set(inputs.map(input => input.leverId)).size, inputs.length);
  const ids = V5_CARDS.map(card => card.id);
  assert.deepEqual(combineClimateLevers(ids), combineClimateLevers([...ids].reverse()));
  assert.deepEqual(combineClimateLevers(ids), combineClimateLevers([...ids, ...ids]));
});

test("adaptation, governance and unsupported sector proxies receive no invented temperature settings", () => {
  for (const id of ["adaptation", "coastal-protection", "loss-damage", "early-warning", "citizens-assembly", "worker-transition", "green-bank", "shipping", "grid", "wetlands", "international-deal"]) {
    assert.deepEqual(climateLeversForCard(id), [], id);
    assert.ok(climateMappingNote(id).length > 0);
  }
  assert.equal(CLIMATE_LEVERS["clean-electricity-standard"].baseline, null);
  const waste = climateLeversForCard("food-waste")[0];
  assert.equal(waste.timing.kind, "target-year");
  if (waste.timing.kind === "target-year") assert.equal(waste.timing.targetYear, 2100);
});

test("climate input summaries derive only from adopted cards, not rejected proposals or the library", () => {
  let testedSuccess = false, testedFailure = false;
  for (let seed = 0; seed < 100 && (!testedSuccess || !testedFailure); seed++) {
    const state = createRun("mapping", "Mapping reviewer", "AQ", seed); state.offers = ["solar"];
    assert.deepEqual(publicRun(state).climateScenario, []);
    const next = takeAction(state, "solar");
    const visible = publicRun(next);
    if (next.history.find(action => action.kind === "policy")!.accepted) {
      assert.deepEqual(visible.climateScenario, climateLeversForCard("solar")); testedSuccess = true;
    } else {
      assert.deepEqual(visible.climateScenario, []); testedFailure = true;
    }
    assert.equal(visible.projection.kind, "illustrative");
    assert.equal(visible.projection.temperatureC, undefined);
    assert.deepEqual(visible.projection.trajectory, []);
  }
  assert.ok(testedSuccess && testedFailure);
});

test("editing a public setting cannot mutate the next card or scenario description", () => {
  const inputs = climateLeversForCard("solar");
  inputs[0].value = 123456;
  inputs[0].timing.description = "tampered";
  const clean = climateLeversForCard("solar")[0];
  assert.equal(clean.value, -50); assert.notEqual(clean.timing.description, "tampered");
});
