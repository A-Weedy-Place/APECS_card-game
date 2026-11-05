import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { startRun, attemptStatus, editRecord, getRun } from "../src/server/store";
import { playerNameKey, playerNameLock } from "../src/server/player-name";
import { countryName } from "../src/lib/countries";

process.env.DATABASE_PATH = `./data/registration-${randomUUID()}.sqlite`;

test("names are unique after case, whitespace and Unicode normalization; failed starts consume no play", () => {
  const browser = { token: randomUUID(), requestId: randomUUID() };
  const first = startRun("  Test   Player  ", "", browser);
  assert.equal(first.run.nickname, "Test Player");
  assert.equal(first.run.country, "");
  assert.equal(countryName(""), "Not specified");
  assert.equal(startRun("Test Player", "", browser).run.id, first.run.id);
  assert.equal(attemptStatus(browser.token).used, 1);
  const other = { token: randomUUID(), requestId: randomUUID() };
  assert.throws(() => startRun("test player", "PK", other), /already taken/);
  assert.throws(() => startRun("Ｔｅｓｔ Ｐｌａｙｅｒ", "PK", other), /already taken/);
  assert.equal(attemptStatus(other.token).used, 0);
  assert.equal(startRun("Different Player", "", other).run.country, "");
  assert.equal(attemptStatus(other.token).used, 1);
  assert.equal(playerNameLock("Test Player"), playerNameLock(" test  PLAYER "));
  assert.equal(playerNameKey("Amélie"), playerNameKey("Ame\u0301lie"));
});

test("admin renames cannot duplicate another name and originals remain reserved", () => {
  const first = startRun("Reserved One", "GB"), second = startRun("Reserved Two", "");
  assert.throws(() => editRecord(second.run.id, 0, { nickname: "reserved one" }), /already taken/);
  assert.equal(getRun(second.run.id, second.token).nickname, "Reserved Two");
  editRecord(first.run.id, 0, { nickname: "New Identity", country: "" });
  assert.equal(getRun(first.run.id, first.token).country, "");
  assert.throws(() => startRun("Reserved One", ""), /already taken/);
  assert.throws(() => startRun("new identity", ""), /already taken/);
  editRecord(first.run.id, 1, { nickname: "NEW IDENTITY" });
});
