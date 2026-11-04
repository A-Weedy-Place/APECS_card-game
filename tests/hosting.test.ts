import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes,randomUUID,scryptSync,createHmac } from "node:crypto";
import { adminLogin,validAdminToken } from "../src/server/admin-auth";
import { startRun,attemptStatus,actOnRun,adminActivity,resetPlayerAttempts,rateLimit,adminRecords } from "../src/server/store";
process.env.DATABASE_PATH=`./data/hosting-${randomUUID()}.sqlite`;
test("hashed admin login issues expiring, signed tokens without returning the password",async()=>{
  const password="private-test-password",salt=randomBytes(16).toString("hex");
  process.env.ADMIN_PASSWORD_HASH=`${salt}:${scryptSync(password,salt,32).toString("hex")}`;
  process.env.ADMIN_SESSION_SECRET=randomBytes(32).toString("hex");
  process.env.ADMIN_TOKEN="legacy-test-only";
  await assert.rejects(adminLogin("wrong"),/Incorrect password/);
  const token=await adminLogin(password);assert.ok(validAdminToken(token));assert.ok(!token.includes(password));
  assert.equal(validAdminToken("legacy-test-only"),false);assert.equal(validAdminToken(token.slice(0,-2)+"xx"),false);
  const expired=Buffer.from(JSON.stringify({scope:"admin",expires:Date.now()-1})).toString("base64url");
  assert.equal(validAdminToken(`${expired}.${createHmac("sha256",process.env.ADMIN_SESSION_SECRET).update(expired).digest("base64url")}`),false);
  delete process.env.ADMIN_PASSWORD_HASH;delete process.env.ADMIN_SESSION_SECRET;delete process.env.ADMIN_TOKEN;
});
test("admin resets another browser, preserves its games and original allowance isolation",()=>{
  const browser=randomBytes(32).toString("hex"),other=randomBytes(32).toString("hex");
  const first=startRun("Player Alpha","PK",{token:browser,requestId:randomUUID()});
  startRun("Player Beta","PK",{token:browser,requestId:randomUUID()});
  startRun("Other Browser","FR",{token:other,requestId:randomUUID()});
  actOnRun(first.run.id,first.token,"save",0,randomUUID());
  const before=adminActivity(first.run.id);assert.equal(before.attempts?.remaining,0);assert.equal(before.games.length,2);assert.equal(before.events.length,2);assert.ok(before.events[1].at);
  assert.equal(resetPlayerAttempts(first.run.id).remaining,2);assert.equal(attemptStatus(browser).used,0);assert.equal(attemptStatus(other).used,1);
  assert.equal(adminActivity(first.run.id).audit[0].action,"reset-player-plays");assert.equal(adminRecords(1,"Player").total,2);
  const json=JSON.stringify(adminActivity(first.run.id));assert.ok(!json.includes(browser));assert.ok(!json.includes("group_hash"));assert.ok(!json.includes('"seed"'));
  assert.throws(()=>resetPlayerAttempts("missing"),/No browser/);
});
test("persisted rate windows survive calls and keep independent keys",()=>{
  const key=randomUUID();rateLimit(key,2);rateLimit(key,2);assert.throws(()=>rateLimit(key,2),/Too many/);assert.doesNotThrow(()=>rateLimit(randomUUID(),2));
});
