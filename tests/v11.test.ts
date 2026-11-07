import test from "node:test";
import assert from "node:assert/strict";
import { createRun, publicRun, takeAction, takeCardBatch, takeSpecialAction } from "../src/game/engine";
import { V11_BY_ID, V11_CARDS } from "../src/game/v11-catalogue";
import { v11Create, v11Locked, v11Approval, v11Offers } from "../src/game/v11";
import { V11_ROUND_LABELS, V12_VERSION } from "../src/game/v11-schedule";
import { yearsFor } from "../src/game/config";
import { CONTROLS, validSettings } from "../src/game/policy-catalogue";
import { settingsFor } from "../src/game/catalogues";
import { initialPuffin, initialReef, stepPuffin, stepReef, gateIndices, iceGate, replaySurvival, endlessCoins, validArcadeInput } from "../src/game/arcade";
import type { Decision } from "../src/game/types";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { startRun, getRun } from "../src/server/store";
import { v10Create } from "../src/game/v10";
import { LEGACY_MODEL_PROFILE, MODEL_PROFILE, MODEL_VERSION, defaultSettings } from "../src/game/policy-catalogue";
import { scenarioKey } from "../src/server/model-result";
process.env.DATABASE_PATH=`./data/v11-cache-${randomUUID()}.sqlite`;

const fresh = (seed = 1) => v11Create("new", "Player", "PK", seed);
const action = (id: string): Decision => ({ kind: "policy", planningRound: 1, year: 2026, cardId: id, title: "Adopted", category: "technology", accepted: true, probability: 100, spent: 0, refund: 0, income: 0, transition: 0, effects: {} });

test("0.11 has 26 model cards, nine support cards and reachable whole-slider targets", () => {
  assert.equal(fresh().rulesVersion, "prototype-0.11");
  assert.equal(V11_CARDS.length, 35);
  assert.equal(V11_CARDS.filter(card => card.factor).length, 26);
  assert.equal(V11_CARDS.filter(card => !card.factor).length, 9);
  assert.equal(V11_CARDS.filter(card => card.rarity === "rare").length, 3);
  assert.equal(V11_CARDS.filter(card => card.riskCard).length, 2);
  assert.equal(new Set(V11_CARDS.map(card => card.photo)).size, 35);
  for (const control of CONTROLS) {
    const cards = V11_CARDS.filter(card => card.factor === control.id);
    assert.ok(cards.length >= 1 && cards.length <= 2);
    assert.ok(cards.every(card => card.target! >= control.min && card.target! <= control.max));
  }
});

test("upgrades require stage two and adoption; nuclear choices lock each other out", () => {
  const state = fresh();
  const first = V11_BY_ID.get("coal-v11-1")!, second = V11_BY_ID.get("coal-v11-2")!;
  state.history = [action(first.id)];
  assert.match(v11Locked(state, second)!, /stage 2/);
  state.round = 4;
  assert.equal(v11Locked(state, second), null);
  state.history = [];
  assert.match(v11Locked(state, second)!, /Needs/);
  state.history = [action("nuclear-v11-1")];
  assert.match(v11Locked(state, V11_BY_ID.get("nuclear-v11-2")!)!, /Opposite/);
  state.offers = ["nuclear-v11-1", "nuclear-v11-2", "coalition-v11"];
  assert.throws(() => takeCardBatch(state, ["nuclear-v11-2"]), /prerequisite/);
});

test("three stages have nine decisions and two coin-only arcade stops", () => {
  let state = fresh();
  const arcade: number[] = [];
  while (!state.finishedAt) {
    const view = publicRun(state);
    if (view.specialRound) arcade.push(state.round);
    assert.equal(view.totalRounds, 11);
    state = takeAction(state, "save");
  }
  assert.deepEqual(arcade, [3, 7]);
  assert.equal(V11_ROUND_LABELS.filter(label => label !== "★").length, 9);
  assert.equal(state.round, 11);
  assert.equal(state.score, null);
  assert.ok(validSettings(settingsFor(state.history)));
});

test("saved 0.12 games play four policy rounds per stage and finish after both arcade breaks", () => {
  let state = v11Create("current", "Player", "PK", 1, V12_VERSION);
  assert.equal(state.rulesVersion, V12_VERSION);
  const visited: string[] = [];
  while (!state.finishedAt) {
    const view = publicRun(state);
    assert.equal(view.totalRounds, 14);
    visited.push(view.specialRound ?? view.phase);
    state = takeAction(state, "save");
    assert.ok(state.round <= 14);
  }
  assert.deepEqual(visited, ["Foundation", "Foundation", "Foundation", "Foundation", "flight",
    "Momentum", "Momentum", "Momentum", "Momentum", "cleanup",
    "Transformation", "Transformation", "Transformation", "Transformation"]);
  assert.equal(state.round, 14);
  assert.equal(state.score, null);
});

test("offers stay valid, ordinary packages settle once and complete model settings remain reproducible", () => {
  for (let seed = 0; seed < 150; seed++) {
    let state = fresh(seed);
    while (!state.finishedAt) {
      const view = publicRun(state);
      assert.equal("seed" in view, false);
      assert.ok(view.offers.every(card => !v11Locked(state, V11_BY_ID.get(card.id)!)));
      if (!view.specialRound) assert.equal(view.offers.length, 3);
      let budget = state.resources.credits;
      const factors = new Set<string>();
      const ids = view.offers.filter(offer => {
        const card = V11_BY_ID.get(offer.id)!;
        if (card.cost > budget || card.factor && factors.has(card.factor)) return false;
        budget -= card.cost;
        if (card.factor) factors.add(card.factor);
        return true;
      }).map(card => card.id);
      const before = state.round;
      state = ids.length ? takeCardBatch(state, ids) : takeAction(state, "save");
      assert.equal(state.round, before + 1);
      assert.ok(state.resources.credits >= 0 && state.resources.credits <= 20);
      assert.deepEqual(state.policySettings, settingsFor(state.history));
    }
  }
  const state = fresh();
  state.resources.support = 0;state.resources.awareness = 0;state.round = 10;
  assert.equal(v11Approval(state, V11_BY_ID.get("population-v11-1")!), 19);
  assert.ok(v11Offers(fresh()).some(id => !V11_BY_ID.get(id)!.factor));
});

test("survival physics passes the former timer and replays a real death before coins are granted", () => {
  let puffin = { ...initialPuffin(), frame: 1080 };
  const near = gateIndices(1081, "endless").map(index => iceGate(index, 1081, "endless")).find(gate => gate.x < 109 && gate.x + gate.width > 85);
  if (near) puffin.y = near.centre;
  assert.equal(stepPuffin(puffin, false, "endless").frame, 1081);
  assert.equal(stepReef({ ...initialReef(), frame: 1080 }, 1, "endless").frame, 1081);
  assert.ok(validArcadeInput("flight", [], 2000, undefined, "endless"));
  assert.equal(endlessCoins(239), 0);assert.equal(endlessCoins(240), 1);assert.equal(endlessCoins(99999), 8);
  let state = fresh();state.round = 3;state.offers = [];
  state = takeSpecialAction(state, { kind: "begin-special", reward: "credits" });
  const attempt = state.specialAttempt!;
  const death = replaySurvival("flight", [], 1000);
  assert.ok(death.dead);
  state.specialAttempt!.startedAt = Date.now() - 20000;
  const next = takeSpecialAction(state, { kind: "finish-special", frames: [], endFrame: death.frame });
  assert.equal(next.round, 4);
  assert.equal(next.resources.credits, state.resources.credits);
  const alive = fresh();alive.round = 3;alive.offers = [];alive.specialAttempt = { ...attempt, startedAt: Date.now() - 20000 };
  assert.throws(() => takeSpecialAction(alive, { kind: "finish-special", frames: [], endFrame: 1 }), /Finish the survival/);
});

test("new model results stay separate while saved 26.10 results remain available",()=>{
  const old=startRun("Old Player","AQ"),current=startRun("Current Player","AQ");
  const settings=defaultSettings(),now=new Date().toISOString(),db=new DatabaseSync(process.env.DATABASE_PATH!);
  try{
    for(const [session,state] of [[old,v10Create(old.run.id,"Old Player","AQ",1)],[current,createRun(current.run.id,"Current Player","AQ",1)]] as const){
      state.id=session.run.id;state.finishedAt=now;state.round=yearsFor(state.rulesVersion).length;
      db.prepare("UPDATE runs SET state=?,finished_at=? WHERE id=?").run(JSON.stringify(state),now,session.run.id);
    }
    // Synthetic results are restricted to this isolated test database.
    for(const [profile,version,temperatureC]of [[LEGACY_MODEL_PROFILE,"26.10.0",3.3],[MODEL_PROFILE,MODEL_VERSION,3.4]] as const){
      const result={profile,modelVersion:version,temperatureC,provider:"public-ui-experimental",sourceUrl:`https://en-roads.climateinteractive.org/scenario.html?v=${version}`,evaluatedAt:now,readback:settings};
      db.prepare("INSERT INTO model_evaluations VALUES (?,?,?,?,?)").run(scenarioKey(settings,profile),"complete",JSON.stringify(result),null,now);
    }
    assert.equal(getRun(old.run.id,old.token).modelEvaluation?.modelVersion,"26.10.0");
    assert.equal(getRun(old.run.id,old.token).modelEvaluation?.temperatureC,3.3);
    assert.equal(getRun(current.run.id,current.token).modelEvaluation?.modelVersion,MODEL_VERSION);
    assert.equal(getRun(current.run.id,current.token).modelEvaluation?.temperatureC,3.4);
  }finally{db.close();}
});
