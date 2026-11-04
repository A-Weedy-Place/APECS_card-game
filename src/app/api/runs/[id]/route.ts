import { bearer, failure, respond } from "@/server/http";
import { getRun } from "@/server/persistence";
export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try { return respond(await getRun((await context.params).id, bearer(request))); } catch (error) { return failure(error); }
}
