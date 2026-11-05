import { GameError } from "@/game/engine";
import { bearer, failure, jsonBody, respond } from "@/server/http";
import { actOnRun, rateLimit } from "@/server/persistence";
import type { SpecialCommand } from "@/game/types";
export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await jsonBody(request, 131072);
    const single = typeof body.cardId === "string" && body.cardId.length > 0 && body.cardId.length <= 80 && body.cardIds === undefined && body.special === undefined;
    const batch = body.cardId === undefined && body.special === undefined && Array.isArray(body.cardIds) && body.cardIds.length >= 1 && body.cardIds.length <= 3 && body.cardIds.every(id => typeof id === "string" && id.length > 0 && id.length <= 80) && new Set(body.cardIds).size === body.cardIds.length;
    const command = body.special as Record<string, unknown> | undefined;
    const special = body.cardId === undefined && body.cardIds === undefined && command && typeof command === "object" && !Array.isArray(command) && (command.kind === "begin-special" ? ["credits", "economy", "support", "awareness", "justice"].includes(command.reward as string) : command.kind === "finish-special" && Array.isArray(command.frames) && command.frames.every(Number.isInteger) && Number.isSafeInteger(command.endFrame) && (command.moves === undefined || Array.isArray(command.moves)));
    if ((!single && !batch && !special) || !Number.isInteger(body.revision) || (body.revision as number) < 0 || typeof body.requestId !== "string" || !/^[a-zA-Z0-9-]{8,80}$/.test(body.requestId)) throw new GameError("Invalid game request.");
    await rateLimit(`action:${id}`, 90);
    return respond(await actOnRun(id, bearer(request), single ? body.cardId as string : batch ? body.cardIds as string[] : command as SpecialCommand, body.revision as number, body.requestId));
  } catch (error) { return failure(error); }
}
