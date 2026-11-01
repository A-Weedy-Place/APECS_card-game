"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { History, Trophy } from "lucide-react";
import type { AttemptStatus, PublicRun } from "@/game/types";
import { Flag } from "./country-picker";
import { resourcePips } from "./resource-bars";
import { api, SESSION_KEY } from "@/lib/client";
export function Results({ run, onHistory }: { run: PublicRun; onHistory: () => void }) {
  const [attempts, setAttempts] = useState<AttemptStatus | null>(null);
  useEffect(() => { api<AttemptStatus>("/api/attempts").then(setAttempts).catch(() => {}); }, []);
  function restart() { localStorage.removeItem(SESSION_KEY); window.location.href = "/"; }
  return <section className="final-screen result-box" aria-labelledby="results-title"><h1 id="results-title">Your result</h1><div className="result-medallion"><Trophy size={36}/><strong>{run.score}</strong><small>/ 1000</small></div><p className="result-player"><Flag code={run.country}/> {run.nickname}</p>
    <div className="final-stats"><span>Climate action <b>{resourcePips(run.transition, run.transitionTarget ?? 150)} / 7</b></span><span>Fairness <b>{resourcePips(run.resources.justice)} / 7</b></span><span>Policies passed <b>{run.history.filter(h => h.accepted && h.kind === "policy").length}</b></span></div>
    <div className="final-actions"><Link className="game-button gold" href="/leaderboard">Leaderboard</Link>{attempts && attempts.remaining > 0 && <button className="game-button" onClick={restart}>Play again <small>{attempts.remaining} play{attempts.remaining === 1 ? "" : "s"} left</small></button>}<button className="game-button quiet" onClick={onHistory}><History size={17}/> History</button></div><small className="result-caveat">Game score, not a climate forecast.</small>
  </section>;
}
