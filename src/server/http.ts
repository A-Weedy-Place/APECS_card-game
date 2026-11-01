import { timingSafeEqual } from "node:crypto";
import { GameError } from "@/game/engine";

export function bearer(request: Request) { return request.headers.get("authorization")?.replace(/^Bearer /, "") ?? ""; }
export function requireAdmin(request: Request) {
  const token = process.env.ADMIN_TOKEN ?? (process.env.NODE_ENV === "development" ? "polar-local" : "");
  if (!token) throw new GameError("Set ADMIN_TOKEN to enable the organiser dashboard.", 503);
  const supplied = bearer(request);
  if (supplied.length > 256 || Buffer.byteLength(supplied) !== Buffer.byteLength(token) || !timingSafeEqual(Buffer.from(token), Buffer.from(supplied))) throw new GameError("Incorrect organiser key.", 401);
}
export async function jsonBody(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.includes("application/json")) throw new GameError("Send JSON content.", 415);
  const origin = request.headers.get("origin");
  // Next may construct an internal localhost URL while the browser uses
  // 127.0.0.1 or a LAN address. Compare against the actual HTTP Host header.
  const url = new URL(request.url);
  const expectedOrigin = `${url.protocol}//${request.headers.get("host") ?? url.host}`;
  if (origin && origin !== expectedOrigin) throw new GameError("Cross-origin requests are not allowed.", 403);
  if (Number(request.headers.get("content-length") ?? 0) > 4096) throw new GameError("Request too large.", 413);
  const text = await request.text();
  if (text.length > 4096) throw new GameError("Request too large.", 413);
  try {
    const body = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return body;
  } catch { throw new GameError("Invalid JSON request."); }
}
export function respond(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
export function failure(error: unknown) {
  if (error instanceof GameError) return respond({ error: error.message }, error.status);
  console.error("COP game request failed", error instanceof Error ? error.message : "unknown error");
  return respond({ error: "A server problem occurred. Your last saved turn is safe; try again." }, 500);
}
const runtime = globalThis as typeof globalThis & { copRateLimits?: Map<string, { count: number; until: number }> };
export function limit(key: string, maximum = 30) {
  runtime.copRateLimits ??= new Map();
  const now = Date.now();
  if (runtime.copRateLimits.size > 2000) for (const [id, value] of runtime.copRateLimits) if (value.until < now) runtime.copRateLimits.delete(id);
  const item = runtime.copRateLimits.get(key);
  if (!item || item.until < now) { runtime.copRateLimits.set(key, { count: 1, until: now + 60000 }); return; }
  if (++item.count > maximum) throw new GameError("Too many requests. Wait a minute and try again.", 429);
}
