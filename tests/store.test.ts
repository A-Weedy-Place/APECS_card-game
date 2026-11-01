import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { startRun, getRun, actOnRun, leaderboard, moderate, adminRecords } from "../src/server/store";
process.env.DATABASE_PATH = `./data/test-${randomUUID()}.sqlite`;

test("ownership keys, revisions and idempotency protect saved turns", () => {
  const { run, token } = startRun("Store Tester", "PK");
  assert.throws(() => getRun(run.id, "incorrect"), /session key invalid/);
  const key = randomUUID();
  const one = actOnRun(run.id, token, "save", 0, key);
  const replay = actOnRun(run.id, token, "save", 0, key);
  assert.deepEqual(replay, one); assert.equal(getRun(run.id, token).round, 1);
  assert.throws(() => actOnRun(run.id, token, "save", 0, randomUUID()), /board changed/);
  assert.equal(getRun(run.id, token).round, 1);
});
test("finished results persist, can be hidden and restored without deletion", () => {
  const { run, token } = startRun("Moderation Tester", "GB");
  for (let revision = 0; revision < (run.totalRounds ?? 7); revision++) actOnRun(run.id, token, "save", revision, randomUUID());
  assert.ok(getRun(run.id, token).finishedAt);
  assert.equal(leaderboard().some(entry => entry.id === run.id),false); // Uncalculated games cannot become temperature scores.
  moderate(run.id, true); assert.equal(leaderboard().some(entry => entry.id === run.id), false);
  assert.ok(adminRecords(1,"Moderation Tester").records[0].hidden);
  moderate(run.id, false); assert.equal(adminRecords(1,"Moderation Tester").records[0].hidden,false);
});

test("redraw is persisted and idempotent, then a turn uses its new revision", () => {
  const { run, token } = startRun("Redraw Store", "PK");
  const key = randomUUID(); const next = actOnRun(run.id, token, "redraw", 0, key);
  assert.equal(next.round, 0); assert.equal(next.revision, 1);
  assert.equal(next.resources.credits, run.resources.credits - (run.redrawCost ?? 0));
  assert.deepEqual(actOnRun(run.id, token, "redraw", 0, key), next);
  assert.equal(actOnRun(run.id, token, "save", 1, randomUUID()).round, 1);
});
