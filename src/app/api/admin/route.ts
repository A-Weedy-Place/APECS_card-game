import { GameError } from "@/game/engine";
import { failure, jsonBody, requireAdmin, respond } from "@/server/http";
import { adminRecords, adminRun, adminActivity, resetPlayerAttempts, editRecord, deleteRecord, moderate, rateLimit } from "@/server/persistence";
import { DISPLAY_PLACES } from "@/game/ranking";
import { COUNTRY_CODES } from "@/lib/countries";
import { cleanPlayerName } from "@/server/player-name";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    requireAdmin(request);
    await rateLimit(`admin:${request.headers.get("x-forwarded-for") ?? "local"}`, 120);
    const params = new URL(request.url).searchParams;
    if (params.get("id")) return respond(params.get("activity")==="1"?await adminActivity(params.get("id")!):await adminRun(params.get("id")!));
    const page = Number(params.get("page") ?? 1);
    if (!Number.isInteger(page) || page < 1) throw new GameError("Invalid page.");
    return respond(await adminRecords(page, (params.get("q") ?? "").slice(0, 100)));
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    requireAdmin(request);
    await rateLimit(`admin-edit:${request.headers.get("x-forwarded-for") ?? "local"}`, 60);
    const body = await jsonBody(request);
    if (body.action==="reset-plays" && typeof body.id==="string") return respond(await resetPlayerAttempts(body.id));
    if (typeof body.id !== "string" || typeof body.hidden !== "boolean") throw new GameError("Invalid moderation request.");
    await moderate(body.id, body.hidden);
    return respond(await adminRecords());
  } catch (error) { return failure(error); }
}
export async function PATCH(request: Request) {
  try {
    requireAdmin(request);
    await rateLimit(`admin-edit:${request.headers.get("x-forwarded-for") ?? "local"}`, 60);
    const body = await jsonBody(request);
    if (typeof body.id !== "string" || !Number.isInteger(body.revision) || (body.revision as number) < 0) throw new GameError("Invalid record revision.");
    const update: Parameters<typeof editRecord>[2] = {};
    if (body.nickname !== undefined) {
      if (typeof body.nickname !== "string" || !/^[\p{L}\p{N} ._'’-]{2,24}$/u.test(cleanPlayerName(body.nickname))) throw new GameError("Use a display name of 2–24 characters.");
      update.nickname = cleanPlayerName(body.nickname);
    }
    if (body.country !== undefined) {
      if (typeof body.country !== "string" || body.country !== "" && !COUNTRY_CODES.includes(body.country)) throw new GameError("Choose a valid country, or leave it blank.");
      update.country = body.country;
    }
    if (body.score !== undefined) {
      if (body.score !== null && (typeof body.score !== "number" || !Number.isInteger(body.score) || body.score < 0 || body.score > 1000)) throw new GameError("Score must be 0–1000, or null to restore the calculated score.");
      update.score = body.score as number | null;
    }
    if (body.manualRank !== undefined) {
      if (body.manualRank !== null && (typeof body.manualRank !== "number" || !Number.isInteger(body.manualRank) || body.manualRank < 1 || body.manualRank > DISPLAY_PLACES)) {
        throw new GameError(`Choose a leaderboard position from 1 to ${DISPLAY_PLACES}, or clear the field.`);
      }
      update.manualRank = body.manualRank as number | null;
    }
    if (body.hidden !== undefined) {
      if (typeof body.hidden !== "boolean") throw new GameError("Invalid record status.");
      update.hidden = body.hidden;
    }
    if (!Object.keys(update).length) throw new GameError("No changes supplied.");
    await editRecord(body.id, body.revision as number, update);
    return respond({ ok: true });
  } catch (error) { return failure(error); }
}
export async function DELETE(request: Request) {
  try {
    requireAdmin(request);
    await rateLimit(`admin-edit:${request.headers.get("x-forwarded-for") ?? "local"}`, 60);
    const body = await jsonBody(request);
    if (typeof body.id !== "string" || !Number.isInteger(body.revision) || (body.revision as number) < 0) throw new GameError("Invalid record revision.");
    await deleteRecord(body.id, body.revision as number);
    return respond({ ok: true });
  } catch (error) { return failure(error); }
}
