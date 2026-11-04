import { attemptStatus, resetAttempts } from "@/server/persistence";
import { browserPass, withBrowserPass } from "@/server/browser-pass";
import { failure, jsonBody, requireAdmin, respond } from "@/server/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try { const token = browserPass(request); return withBrowserPass(respond(await attemptStatus(token)), request, token); }
  catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    requireAdmin(request); await jsonBody(request);
    const token = browserPass(request);
    return withBrowserPass(respond(await resetAttempts(token)), request, token);
  } catch (error) { return failure(error); }
}
