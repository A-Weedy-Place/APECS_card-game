import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { MODEL_PROFILE, MODEL_VERSION, defaultSettings } from "../src/game/policy-catalogue";
import { adminActivity, adminRecords, actOnRun, attemptStatus, deleteRecord, editRecord, getRun, leaderboard, resetPlayerAttempts, saveModelStatus, startRun } from "../src/server/store";

process.env.DATABASE_PATH = `./data/admin-records-${randomUUID()}.sqlite`;

test("permanent deletion erases the selected game and blocks a stale start retry", () => {
  const browser = { token: randomUUID(), requestId: randomUUID() };
  const first = startRun("Erase Me", "GB", browser);
  const sibling = startRun("Shared Browser", "PK", { ...browser, requestId: randomUUID() });
  const id = first.run.id;
  actOnRun(id, first.token, "save", 0, randomUUID());
  editRecord(id, 0, { nickname: "Corrected Alias" });
  assert.equal(adminRecords(1, id).records[0].playsUsed, 2);
  assert.throws(() => deleteRecord(id, 0), /Record changed/);
  assert.equal(adminActivity(id).events.length, 2);
  deleteRecord(id, 1);
  deleteRecord(id, 1);
  assert.equal(adminRecords(1, id).total, 0);
  assert.throws(() => getRun(id, first.token), /not found/);
  assert.throws(() => startRun("Erase Me", "GB", browser), /permanently deleted/);
  assert.equal(attemptStatus(browser.token).used, 2);
  assert.equal(getRun(sibling.run.id, sibling.token).nickname, "Shared Browser");
  assert.equal(resetPlayerAttempts(sibling.run.id).remaining, 2);
  const db = new DatabaseSync(process.env.DATABASE_PATH!);
  try {
    for (const table of ["actions", "run_controls", "admin_audit", "run_attempts"]) {
      assert.equal(db.prepare(`SELECT run_id FROM ${table} WHERE run_id=?`).get(id), undefined);
    }
  } finally { db.close(); }
  assert.equal(startRun("Erase Me", "GB").run.nickname, "Erase Me");
});

test("manual placement reorders verified results while retaining the model temperature", () => {
  const first = startRun("Automatic Rank", "FR"), second = startRun("Manual Rank", "AQ");
  assert.throws(() => editRecord(second.run.id, 0, { manualRank: 1 }), /verified leaderboard result/);
  for (const session of [first, second]) {
    let run = session.run;
    while (!run.finishedAt) run = actOnRun(run.id, session.token, "save", run.revision, randomUUID());
  }
  const settings = defaultSettings();
  saveModelStatus(settings, "complete", { temperatureC: 3.3, modelVersion: MODEL_VERSION, profile: MODEL_PROFILE,
    provider: "public-ui-experimental", sourceUrl: `https://en-roads.climateinteractive.org/scenario.html?v=${MODEL_VERSION}`,
    evaluatedAt: new Date().toISOString(), readback: settings });
  const automaticOrder = leaderboard().map(entry => entry.id);
  const moved = automaticOrder[1];
  editRecord(moved, 0, { manualRank: 1, country: "GB" });
  assert.equal(leaderboard()[0].id, moved);
  assert.equal(leaderboard()[0].temperatureC, 3.3);
  assert.equal(leaderboard()[0].manualRank, 1);
  assert.equal(leaderboard()[0].country, "GB");
  assert.throws(() => editRecord(moved, 1, { score: 5 }), /Model temperatures/);
  editRecord(moved, 1, { manualRank: null });
  assert.deepEqual(leaderboard().map(entry => entry.id), automaticOrder);
});
