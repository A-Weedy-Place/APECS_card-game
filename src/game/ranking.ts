import type { LeaderboardEntry } from "./types";
/** Rank at the precision actually displayed by the simulator and game clock. */
export const temperatureKey=(value:number)=>Math.round(value*10);
export const timeKey=(value:number)=>Math.round(value/10);
export function compareResults(a:LeaderboardEntry,b:LeaderboardEntry){return temperatureKey(a.temperatureC??a.score)-temperatureKey(b.temperatureC??b.score)||timeKey(a.elapsedMs??0)-timeKey(b.elapsedMs??0)||a.finishedAt.localeCompare(b.finishedAt)||a.id.localeCompare(b.id);}
export function sameResult(a:LeaderboardEntry,b:LeaderboardEntry){return temperatureKey(a.temperatureC??a.score)===temperatureKey(b.temperatureC??b.score)&&timeKey(a.elapsedMs??0)===timeKey(b.elapsedMs??0);}
export function formatTime(ms:number){const cs=Math.max(0,timeKey(ms)),seconds=Math.floor(cs/100);return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,"0")}.${String(cs%100).padStart(2,"0")}`;}
