import test from "node:test";
import assert from "node:assert/strict";
import { createRun, publicRun, takeAction, approvalFor, effectsFor, costFor, nextIncomeFor, calculateScore, offerCards } from "../src/game/engine";
import { YEARS, LEGACY_YEARS, yearsFor } from "../src/game/config";
import { V4_CARDS, V4_CARD_BY_ID } from "../src/game/v4-cards";
import { v4Create, v4LockedReason, v4Synergies, v4Perks, v4Upkeep } from "../src/game/v4";
import type { Card, RunState } from "../src/game/types";

const fresh = (seed = 1) => v4Create("v4", "Tester", "PK", seed);
const card = (id: string) => V4_CARD_BY_ID.get(id)!;
function adopted(state: RunState, ...ids: string[]) {
  for (const id of ids) state.history.push({ year: 2030, cardId: id, title: card(id).title, category: card(id).category, accepted: true, probability: 100, roll: 0, spent: 0, refund: 0, income: 0, transition: 0, effects: {} });
  return state;
}
function resolve(state: RunState, id: string, success: boolean) {
  for (let seed = 0; seed < 1000; seed++) {
    const fixture = structuredClone(state); fixture.seed = seed; fixture.offers = [id];
    const next = takeAction(fixture, id);
    if (next.history.at(-1)!.accepted === success) return next;
  }
  throw new Error(`Could not obtain ${success ? "accepted" : "rejected"} ${id}`);
}
test("0.4 has fourteen decisions while old saved versions retain seven years", () => {
  assert.equal(YEARS.length, 14); assert.deepEqual(YEARS, Array.from({ length: 14 }, (_, i) => 2030 + 5 * i));
  assert.deepEqual(yearsFor("prototype-0.3"), LEGACY_YEARS);
  let state = fresh(); for (const year of YEARS) { assert.equal(publicRun(state).year, year); state = takeAction(state, "save"); }
  assert.equal(state.history.length, 14); assert.equal(publicRun(state).year, 2100); assert.ok(state.finishedAt);
  assert.equal(state.history.at(-1)!.income, 0); assert.throws(() => takeAction(state, "save"), /complete/);
});
test("reshuffling costs 1, 2, 3 credits without spending a turn; next turn resets cost", () => {
  let state = fresh(); const original = structuredClone(state);
  state = takeAction(state, "redraw"); assert.equal(state.resources.credits, 9); assert.equal(state.round, 0); assert.equal(state.revision, 1); assert.equal(state.history.length, 0);
  assert.ok(state.offers.every(id => !original.offers.includes(id)));
  state = takeAction(state, "redraw"); assert.equal(state.resources.credits, 7); assert.equal(publicRun(state).redrawCost, 3);
  state = takeAction(state, "redraw"); assert.equal(state.resources.credits, 4);
  state.resources.credits = 3; assert.throws(() => takeAction(state, "redraw"), /credits/);
  state = takeAction(state, "save"); assert.equal(publicRun(state).redrawCost, 1); assert.equal(state.redrawsUsed, 3);
  assert.deepEqual(original.resources, fresh().resources);
});
test("prerequisites cannot be bypassed by editing offered IDs, and failed prerequisites do not unlock", () => {
  const state = fresh(); state.round = 3; state.resources.credits = 100; state.offers = ["grid"];
  assert.throws(() => takeAction(state, "grid"), /not eligible/);
  const failed = resolve(state, "solar", false); failed.offers = ["grid"];
  assert.throws(() => takeAction(failed, "grid"), /not eligible/);
  const succeeded = resolve(state, "solar", true); succeeded.offers = ["grid"]; assert.equal(v4LockedReason(succeeded, card("grid")), null);
  succeeded.offers = ["solar"]; assert.throws(() => takeAction(succeeded, "solar"), /not eligible/);
});
test("all 48 cards form reachable, referenced short trees across ten pathways", () => {
  assert.equal(V4_CARDS.length, 48); assert.equal(new Set(V4_CARDS.map(c => c.id)).size, 48);
  const reachable = new Set<string>();
  for (let pass = 0; pass < 10; pass++) for (const c of V4_CARDS) {
    for (const id of [...(c.requiresAll ?? []), ...(c.requiresAny ?? [])]) assert.ok(V4_CARD_BY_ID.has(id));
    if ((c.requiresAll ?? []).every(id => reachable.has(id)) && (!c.requiresAny?.length || c.requiresAny.some(id => reachable.has(id)))) reachable.add(c.id);
  }
  assert.equal(reachable.size, 48); assert.equal(new Set(V4_CARDS.map(c => c.pathway)).size, 10);
});
test("a fresh follow-up slot includes adaptation as well as mitigation upgrades", () => {
  const state = adopted(fresh(), "early-warning"); state.round = 2;
  // Only one reachable upgrade: adaptation. It must not disappear because it is an enabler.
  for (let seed = 0; seed < 100; seed++) { state.seed = seed; assert.ok(offerCards(state).includes("adaptation")); }
});
test("low politics, awareness and economy can reduce ambitious approval to five percent", () => {
  const state = fresh(); state.round = 13; state.resources.support = 0; state.resources.awareness = 0; state.resources.economy = 0;
  assert.equal(approvalFor(state, card("removal")), 5); assert.equal(approvalFor(state, card("local-campaign")), 100);
  state.resources.support = 90; state.resources.awareness = 80; state.resources.economy = 80;
  assert.ok(approvalFor(state, card("removal")) >= 60);
});
test("zero credits cannot soft-lock a run; skip funds reliable repeatable recovery", () => {
  let state = fresh(); state.resources = { credits: 0, economy: 0, support: 0, awareness: 0, justice: 0 };
  assert.equal(publicRun(state).canRedraw, false); state = takeAction(state, "save");
  assert.equal(state.resources.credits, 3); assert.ok(state.offers.includes("local-campaign"));
  state = takeAction(state, "local-campaign"); assert.ok(state.resources.support > 0); assert.ok(state.resources.awareness > 0);
  state.offers = ["local-campaign"]; state = takeAction(state, "local-campaign");
  assert.equal(v4Perks(state).find(p => p.id === "politics")!.count, 1); assert.equal(v4Perks(state).find(p => p.id === "politics")!.active, false);
});
test("economy affects both income and political stability, while upkeep and income stay bounded", () => {
  const rich = fresh(), poor = fresh(); rich.resources.economy = 80; poor.resources.economy = 20;
  assert.ok(nextIncomeFor(rich) > nextIncomeFor(poor));
  const richNext = takeAction(rich, "save"), poorNext = takeAction(poor, "save");
  assert.equal(richNext.resources.support, 68); assert.equal(poorNext.resources.support, 63);
  const costly = adopted(fresh(), "nuclear", "clean-industry", "shipping", "removal"); costly.resources.economy = 0;
  assert.equal(v4Upkeep(costly), 3); assert.equal(nextIncomeFor(costly), 1);
  costly.resources.economy = 100; adopted(costly, "green-bank", "clean-contracts"); assert.ok(nextIncomeFor(costly) <= 6);
});
test("preparing power and workers makes coal exit a different economic outcome", () => {
  const state = fresh(); state.round = 4;
  const unprepared = effectsFor(state, card("coal-exit")); assert.equal(unprepared.economy, -15);
  adopted(state, "solar", "grid", "worker-transition");
  const prepared = effectsFor(state, card("coal-exit")); assert.equal(prepared.economy, 5); assert.ok(prepared.support! > unprepared.support!);
  assert.ok(v4Synergies(state).some(s => s.id === "fair-exit"));
});
test("cross-path combinations add real gains and discounts without directly cooling adaptation", () => {
  const state = adopted(fresh(), "solar", "grid", "indigenous-leadership", "forest-protection", "worker-transition", "skills-training");
  assert.equal(effectsFor(state, card("heat")).transition, card("heat").effects.transition! + 4);
  assert.equal(costFor(state, card("clean-industry")), card("clean-industry").cost - 2); // engineering + workforce
  assert.equal(effectsFor(state, card("restore-land")).transition, 20);
  assert.equal(costFor(state, card("restore-land")), 7);
  assert.equal(effectsFor(state, card("adaptation")).transition, undefined);
});
test("failure grants no payoff, prerequisites, synergies, resilience or upkeep", () => {
  const state = adopted(fresh(), "innovation-fund"); state.round = 4; state.resources.credits = 20;
  const next = resolve(state, "clean-industry", false), receipt = next.history.at(-1)!;
  assert.equal(receipt.transition, 0); assert.equal(receipt.resilience, 0); assert.equal(receipt.refund, 4); assert.deepEqual(receipt.effects, { support: -2 });
  assert.equal(v4Upkeep(next), 0); assert.ok(v4LockedReason(next, card("circular-materials"))); assert.deepEqual(receipt.unlockedSynergies, []);
});
test("every card's shown cost, odds, effects, transition and resilience match successful receipt", () => {
  for (const c of V4_CARDS) {
    const state = fresh(); state.round = Math.max(c.minRound ?? 0, 5); state.resources.credits = 100;
    adopted(state, ...(c.requiresAll ?? []), ...(c.requiresAny?.slice(0, 1) ?? [])); state.offers = [c.id];
    const shown = publicRun(state).offers[0], next = resolve(state, c.id, true), receipt = next.history.at(-1)!;
    assert.equal(receipt.spent, shown.cost, c.id); assert.equal(receipt.probability, shown.approval, c.id);
    assert.deepEqual(receipt.effects, shown.effects, c.id); assert.equal(receipt.transition, shown.transitionGain, c.id); assert.equal(receipt.resilience, shown.resilience, c.id);
  }
});
test("resilience prevents the disclosed drill and never changes the transition index itself", () => {
  const exposed = fresh(), protectedRun = fresh(); exposed.round = 9; protectedRun.round = 9; protectedRun.resilience = 40;
  assert.match(publicRun(exposed).worldEvent!.description, /-6 economy/);
  const a = takeAction(exposed, "save"), b = takeAction(protectedRun, "save");
  assert.equal(b.resources.economy - a.resources.economy, 6); assert.equal(a.transition, b.transition); assert.equal(a.projection.pressure, b.projection.pressure);
});
test("public library contains locked prerequisites and no seed; score weights cap at 1000", () => {
  const state = fresh(); const visible = publicRun(state);
  assert.equal(visible.library!.length, 48); assert.match(visible.library!.find(c => c.id === "grid")!.lockedReason!, /2040/);
  assert.equal("seed" in visible, false); assert.equal(visible.projection.temperatureC, undefined);
  state.transition = 10000; state.resilience = 100; state.resources = { credits: 999, economy: 100, support: 100, awareness: 100, justice: 100 };
  assert.equal(calculateScore(state), 1000); state.resources.credits = 0; assert.equal(calculateScore(state), 1000);
});
test("500 varied complete games maintain offers, authority, legal resources and score bounds", () => {
  for (let seed = 0; seed < 500; seed++) {
    let state = fresh(seed);
    while (!state.finishedAt) {
      const view = publicRun(state); assert.equal(view.offers.length, 3); assert.equal(new Set(state.offers).size, 3);
      for (const c of view.offers) assert.equal(v4LockedReason(state, c), null);
      if (seed % 11 === 0 && view.canRedraw) state = takeAction(state, "redraw");
      const affordable = publicRun(state).offers.filter(c => c.affordable);
      state = takeAction(state, seed % 9 === 0 || !affordable.length ? "save" : affordable[(seed + state.round) % affordable.length].id);
      for (const key of ["support", "economy", "awareness", "justice"] as const) assert.ok(state.resources[key] >= 0 && state.resources[key] <= 100);
      assert.ok(state.resources.credits >= 0); assert.ok((state.resilience ?? 0) >= 0 && (state.resilience ?? 0) <= 100);
    }
    assert.equal(state.history.length, 14); assert.ok(state.score! >= 0 && state.score! <= 1000);
  }
});
