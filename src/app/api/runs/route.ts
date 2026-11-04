import { COUNTRY_CODES } from "@/lib/countries";
import { GameError } from "@/game/engine";
import { failure, jsonBody, respond } from "@/server/http";
import { startRun, rateLimit } from "@/server/persistence";
import { randomUUID } from "node:crypto";
import { browserPass, withBrowserPass } from "@/server/browser-pass";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const body = await jsonBody(request);
    const nickname = typeof body.nickname === "string" ? body.nickname.trim().replace(/\s+/g, " ") : "";
    const country = typeof body.country === "string" ? body.country.toUpperCase() : "";
    if (!/^[\p{L}\p{N} ._'’-]{2,24}$/u.test(nickname)) throw new GameError("Use a display name of 2–24 letters, numbers or simple punctuation.");
    if (!COUNTRY_CODES.includes(country)) throw new GameError("Choose a country from the list.");
    if (body.consent !== true) throw new GameError("Agree to display your name, flag, temperature and time.");
    await rateLimit(`start:${request.headers.get("x-forwarded-for") ?? "local"}`, 120);
    if (body.requestId !== undefined && (typeof body.requestId !== "string" || !/^[a-zA-Z0-9-]{8,80}$/.test(body.requestId))) throw new GameError("Invalid start request.");
    const token = browserPass(request);
    return withBrowserPass(respond(await startRun(nickname, country, { token, requestId: typeof body.requestId === "string" ? body.requestId : randomUUID() }), 201), request, token);
  } catch (error) { return failure(error); }
}
