import type { PublicRun } from "@/game/types";
export const SESSION_KEY = "cryosphere-session-v1";
export type Session = { id: string; token: string };
export function readSession(): Session | null {
  try {
    const data = JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null");
    return data && typeof data.id === "string" && typeof data.token === "string" ? data : null;
  } catch { return null; }
}
export function writeSession(session: Session) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch { throw new Error("Browser storage is unavailable. Enable site storage to keep your game safe."); }
}
export async function api<T>(url: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Request failed.");
    return data as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("The server took too long. Retry or refresh; your saved turn is safe.");
    throw error;
  } finally { clearTimeout(timeout); }
}
export const getSessionRun = (session: Session) => api<PublicRun>(`/api/runs/${session.id}`, { headers: { Authorization: `Bearer ${session.token}` } });
export function requestId() {
  // getRandomValues works on HTTP LAN origins too; randomUUID does not.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
}
