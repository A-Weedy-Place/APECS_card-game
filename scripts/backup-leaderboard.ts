import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { formatTime, rankLeaderboard } from "../src/game/ranking";
import type { LeaderboardEntry } from "../src/game/types";

function csvField(value: unknown) {
  let text = String(value ?? "");
  if (typeof value === "string" && /^\s*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}

async function main() {
  const source = "https://apecs-card-game.vercel.app/api/leaderboard";
  const response = await fetch(source, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Leaderboard request failed (${response.status}).`);
  const { entries, rulesVersion } = await response.json() as { entries: LeaderboardEntry[]; rulesVersion: string };
  if (!Array.isArray(entries) || typeof rulesVersion !== "string") throw new Error("Unexpected leaderboard response.");

  const ranked = rankLeaderboard(entries);
  const capturedAt = new Date();
  const stamp = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Karachi", dateStyle: "short", timeStyle: "medium" })
    .format(capturedAt).replace(" ", "_").replaceAll(":", "-");
  const directory = resolve("data", "leaderboard-backups");
  await mkdir(directory, { recursive: true });
  const base = resolve(directory, `leaderboard-${stamp}`);
  const columns = ["rank", "name", "country", "temperature_c", "play_time", "elapsed_ms", "finished_at", "manual_rank", "rules", "game_id"];
  const rows = ranked.map(entry => [entry.rank, entry.nickname, entry.country, entry.temperatureC,
    formatTime(entry.elapsedMs ?? 0), entry.elapsedMs, entry.finishedAt, entry.manualRank, entry.rulesVersion, entry.id]);
  const csv = "\uFEFF" + [columns, ...rows].map(row => row.map(csvField).join(",")).join("\r\n") + "\r\n";
  const json = JSON.stringify({ capturedAt: capturedAt.toISOString(), source, rulesVersion, entries: ranked }, null, 2) + "\n";
  await Promise.all([
    writeFile(`${base}.csv`, csv, { flag: "wx" }),
    writeFile(`${base}.json`, json, { flag: "wx" }),
  ]);
  console.log(JSON.stringify({ rows: ranked.length, csv: `${base}.csv`, json: `${base}.json` }));
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
