import { failure, respond } from "@/server/http";
import { leaderboard, displayUrl } from "@/server/persistence";
import { RULES_VERSION } from "@/game/config";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try { const [entries,joinUrl]=await Promise.all([leaderboard(),displayUrl()]);return respond({ entries, rulesVersion: RULES_VERSION, joinUrl }); } catch (error) { return failure(error); }
}
