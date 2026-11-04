import { randomBytes } from "node:crypto";
export function browserPass(request: Request) {
  return request.headers.get("cookie")?.match(/(?:^|;\s*)cop-player=([a-f0-9]{64})(?:;|$)/)?.[1] ?? randomBytes(32).toString("hex");
}
export function withBrowserPass(response: Response, request: Request, token: string) {
  response.headers.append("Set-Cookie", `cop-player=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${process.env.VERCEL || new URL(request.url).protocol === "https:" ? "; Secure" : ""}`);
  return response;
}
