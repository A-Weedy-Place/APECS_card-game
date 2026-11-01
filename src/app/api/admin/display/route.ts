import { GameError } from "@/game/engine";
import { failure, jsonBody, requireAdmin, respond } from "@/server/http";
import { displayUrl, setDisplayUrl } from "@/server/store";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try { requireAdmin(request); return respond({ joinUrl: displayUrl() }); } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    requireAdmin(request); const body = await jsonBody(request);
    if (typeof body.joinUrl !== "string" || body.joinUrl.length > 1000) throw new GameError("Enter a valid game URL.");
    if (body.joinUrl) { let url: URL; try { url = new URL(body.joinUrl); } catch { throw new GameError("Enter a full http or https URL."); } if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new GameError("Use http or https without credentials."); }
    setDisplayUrl(body.joinUrl); return respond({ joinUrl: displayUrl() });
  } catch (error) { return failure(error); }
}
