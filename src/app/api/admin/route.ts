import { GameError } from "@/game/engine";
import { failure, jsonBody, limit, requireAdmin, respond } from "@/server/http";
import { adminRecords, adminRun, editRecord, moderate } from "@/server/store";
import { COUNTRY_CODES } from "@/lib/countries";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    limit(`admin:${request.headers.get("x-forwarded-for") ?? "local"}`, 30);
    requireAdmin(request);
    const params = new URL(request.url).searchParams;
    if (params.get("id")) return respond(adminRun(params.get("id")!));
    const page = Number(params.get("page") ?? 1);
    if (!Number.isInteger(page) || page < 1) throw new GameError("Invalid page.");
    return respond(adminRecords(page, (params.get("q") ?? "").slice(0, 100)));
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    requireAdmin(request);
    const body = await jsonBody(request);
    if (typeof body.id !== "string" || typeof body.hidden !== "boolean") throw new GameError("Invalid moderation request.");
    moderate(body.id, body.hidden);
    return respond(adminRecords());
  } catch (error) { return failure(error); }
}
export async function PATCH(request: Request) {
  try {
    requireAdmin(request);
    limit(`admin-edit:${request.headers.get("x-forwarded-for") ?? "local"}`, 60);
    const body = await jsonBody(request);
    if (typeof body.id !== "string" || !Number.isInteger(body.revision) || (body.revision as number) < 0) throw new GameError("Invalid record revision.");
    const update: Parameters<typeof editRecord>[2] = {};
    if (body.nickname !== undefined) {
      if (typeof body.nickname !== "string" || !/^[\p{L}\p{N} ._'’-]{2,24}$/u.test(body.nickname.trim())) throw new GameError("Use a display name of 2–24 characters.");
      update.nickname = body.nickname.trim();
    }
    if (body.country !== undefined) {
      if (typeof body.country !== "string" || !COUNTRY_CODES.includes(body.country)) throw new GameError("Choose a valid country.");
      update.country = body.country;
    }
    if (body.score !== undefined) {
      if (body.score !== null && (typeof body.score !== "number" || !Number.isInteger(body.score) || body.score < 0 || body.score > 1000)) throw new GameError("Score must be 0–1000, or null to restore the calculated score.");
      update.score = body.score as number | null;
    }
    for (const key of ["hidden", "deleted"] as const) if (body[key] !== undefined) {
      if (typeof body[key] !== "boolean") throw new GameError("Invalid record status.");
      update[key] = body[key] as boolean;
    }
    if (!Object.keys(update).length) throw new GameError("No changes supplied.");
    editRecord(body.id, body.revision as number, update);
    return respond({ ok: true });
  } catch (error) { return failure(error); }
}
