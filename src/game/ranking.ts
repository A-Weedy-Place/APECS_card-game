import type { LeaderboardEntry } from "./types";
/** Rank at the precision actually displayed by the simulator and game clock. */
export const temperatureKey=(value:number)=>Math.round(value*10);
export const timeKey=(value:number)=>Math.round(value/10);
export function compareResults(a:LeaderboardEntry,b:LeaderboardEntry){return temperatureKey(a.temperatureC??a.score)-temperatureKey(b.temperatureC??b.score)||timeKey(a.elapsedMs??0)-timeKey(b.elapsedMs??0)||a.finishedAt.localeCompare(b.finishedAt)||a.id.localeCompare(b.id);}
export function sameResult(a:LeaderboardEntry,b:LeaderboardEntry){return temperatureKey(a.temperatureC??a.score)===temperatureKey(b.temperatureC??b.score)&&timeKey(a.elapsedMs??0)===timeKey(b.elapsedMs??0);}
/** The positions available for manual placement. */
export const DISPLAY_PLACES = 10;

/** Assign display ranks to already ordered results. */
export function rankLeaderboard(entries: LeaderboardEntry[]) {
  let lastRank = 0;
  return entries.map((entry, index) => {
    const previous = entries[index - 1];
    const tied = previous && entry.manualRank === undefined && previous.manualRank === undefined && sameResult(entry, previous);
    const rank = tied ? lastRank : index + 1;
    lastRank = rank;
    return { ...entry, rank };
  });
}

/** Place manual entries in requested order, breaking position conflicts by the normal result order. */
export function orderLeaderboard(entries: LeaderboardEntry[]) {
  const automaticOrder = [...entries].sort(compareResults);
  const ranked = automaticOrder.filter(entry => entry.manualRank === undefined);
  const manual = automaticOrder.filter(entry => entry.manualRank !== undefined)
    .sort((a, b) => a.manualRank! - b.manualRank!);
  let nextPosition = 0;
  for (const entry of manual) {
    const index = Math.min(ranked.length, Math.max(nextPosition, entry.manualRank! - 1));
    ranked.splice(index, 0, entry);
    nextPosition = index + 1;
  }
  return ranked;
}
export function formatTime(ms:number){const cs=Math.max(0,timeKey(ms)),seconds=Math.floor(cs/100);return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,"0")}.${String(cs%100).padStart(2,"0")}`;}
