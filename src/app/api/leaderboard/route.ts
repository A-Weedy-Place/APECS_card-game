import { failure, respond } from "@/server/http";
import { leaderboard, displayUrl } from "@/server/store";
import { RULES_VERSION } from "@/game/config";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try { return respond({ entries: leaderboard(), rulesVersion: RULES_VERSION, joinUrl: displayUrl() }); } catch (error) { return failure(error); }
}
