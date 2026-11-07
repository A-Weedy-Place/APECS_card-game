import test from "node:test";
import assert from "node:assert/strict";
import { createRun, publicRun, takeAction, takeCardBatch } from "../src/game/engine";
import { V13_BY_ID } from "../src/game/v13-catalogue";
import { V13_VERSION } from "../src/game/v11-schedule";
import { v11Approval, v11Effects } from "../src/game/v11";

test("support rotates and the revenue upgrades lead to 5, 6 and 8 coins per policy round", () => {
  let state = createRun("progression", "Player", "GB", 1);
  assert.equal(state.rulesVersion, V13_VERSION);
  assert.equal(publicRun(state).nextIncome, 4);
  const revenueCards: string[] = [];
  const incomes: number[] = [];
  const supportCategories: string[] = [];
  let previousHand: string[] = [];
  while (!state.finishedAt) {
    const view = publicRun(state);
    assert.equal(view.totalRounds, 14);
    if (view.specialRound) {
      state = takeAction(state, "save");
      previousHand = [];
      continue;
    }
    const support = view.offers.filter(card => card.category !== "technology");
    assert.ok(support.length <= 1);
    assert.ok(view.offers.every(card => !previousHand.includes(card.id)));
    previousHand = state.offers;
    if (support[0]) supportCategories.push(support[0].category);
    if (support[0]?.category === "economics") {
      const card = support[0];
      assert.equal(card.approval, 100);
      revenueCards.push(card.id);
      state = takeCardBatch(state, [card.id]);
      assert.equal(publicRun(state).nextIncome, card.incomeAfter);
      incomes.push(publicRun(state).nextIncome!);
    } else state = takeAction(state, "save");
  }
  assert.deepEqual(supportCategories.slice(0, 3), ["economics", "politics", "awareness"]);
  assert.deepEqual(revenueCards, ["revenue-v11", "finance-v11", "finance-breakthrough-v11"]);
  assert.deepEqual(incomes, [5, 6, 8]);
  assert.equal(state.round, 14);
});

test("approval has no round fatigue and only explicit effects change support", () => {
  const neutral = V13_BY_ID.get("coal-v11-1")!;
  const risk = V13_BY_ID.get("population-v11-1")!;
  let state = createRun("support", "Player", "GB", 1);
  const approval = v11Approval(state, neutral);
  assert.deepEqual(v11Effects(state, neutral), {});
  for (let round = 0; round < 12; round++) state = takeAction(state, "save");
  assert.equal(state.resources.support, 70);
  assert.equal(state.resources.awareness, 30);
  assert.equal(v11Approval(state, neutral), approval);
  assert.deepEqual(v11Effects(state, risk), { awareness: -45, support: -35 });
  assert.equal(publicRun(state).library?.find(card => card.id === risk.id)?.rejectionSupport, 0);
});
