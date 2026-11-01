import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { jsonBody, limit, requireAdmin } from "../src/server/http";

test("JSON mutations reject malformed bodies and cross-origin browser requests", async () => {
  const make = (body: string, origin = "http://localhost:3000") => new Request("http://localhost:3000/api/runs", { method: "POST", headers: { "content-type": "application/json", origin }, body });
  await assert.rejects(jsonBody(make("[]")), /Invalid JSON/);
  await assert.rejects(jsonBody(make("not json")), /Invalid JSON/);
  await assert.rejects(jsonBody(make("{}", "https://untrusted.example")), /Cross-origin/);
  await assert.rejects(jsonBody(make(JSON.stringify({ content: "x".repeat(5000) }))), /too large/);
  assert.deepEqual(await jsonBody(make('{"consent":true}')), { consent: true });
  const local = new Request("http://localhost:3000/api/runs", { method: "POST", headers: { "content-type": "application/json", host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" }, body: "{}" });
  assert.deepEqual(await jsonBody(local), {});
});
test("organiser key is required and compared without exposing it", () => {
  process.env.ADMIN_TOKEN = "private-test-admin-token";
  const request = (key: string) => new Request("http://localhost/api/admin", { headers: { authorization: `Bearer ${key}` } });
  assert.throws(() => requireAdmin(request("wrong")), /Incorrect organiser key/);
  assert.doesNotThrow(() => requireAdmin(request("private-test-admin-token")));
});
test("local request limits reject excess requests", () => {
  const key = randomUUID(); limit(key, 2); limit(key, 2);
  assert.throws(() => limit(key, 2), /Too many requests/);
});
