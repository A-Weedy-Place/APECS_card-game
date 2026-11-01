"use client";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Expand, Radio } from "lucide-react";
import { api } from "@/lib/client";
import { countryName } from "@/lib/countries";
import { Flag } from "./country-picker";
import type { LeaderboardEntry } from "@/game/types";
import { sameResult, formatTime } from "@/game/ranking";

export function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [joinUrl, setJoinUrl] = useState(""), [screenError, setScreenError] = useState("");
  useEffect(() => {
    let alive = true;
    async function refresh() {
      if (document.hidden) return;
      try {
        const data = await api<{ entries: LeaderboardEntry[]; joinUrl?: string }>("/api/leaderboard");
        if (alive) { setEntries(data.entries); setJoinUrl(data.joinUrl || process.env.NEXT_PUBLIC_GAME_URL || window.location.origin); setError(""); }
      } catch { if (alive) setError("Reconnecting…"); } finally { if (alive) setLoading(false); }
    }
    refresh(); const timer = setInterval(refresh, 5000);
    const visible = () => { if (!document.hidden) refresh(); }; document.addEventListener("visibilitychange", visible);
    return () => { alive = false; clearInterval(timer); document.removeEventListener("visibilitychange", visible); };
  }, []);
  async function fullscreen() {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); setScreenError(""); } catch { setScreenError("Use your browser’s fullscreen control."); }
  }
  let last:LeaderboardEntry|undefined, lastRank = 0;
  const ranked = entries.slice(0, 10).map((entry, index) => { const rank = last&&sameResult(entry,last) ? lastRank : index + 1; last=entry; lastRank = rank; return { ...entry, rank }; });
  return <div className="board-shell display-only"><main id="main-content" className="board-main">
    <header className="display-heading"><div><p>APECS · COP31 · CRYOSPHERE PAVILION</p><h1>Leaderboard</h1></div><button className="icon-button" onClick={fullscreen} aria-label="Toggle fullscreen leaderboard"><Expand size={20}/></button></header>
    <div className="board-layout"><section className="standings-panel" aria-label="Leaderboard"><div className="standings-head"><span><Radio size={14} aria-hidden="true"/> Live standings</span>{error && <span role="status">{error}</span>}</div>
      {loading ? <div className="board-empty">Loading…</div> : !ranked.length ? <div className="board-empty"><h2>Be the first to play</h2></div> : <table className="display-table temperature-table"><thead><tr><th>Rank</th><th><span className="sr-only">Country</span></th><th>Name</th><th>2100 °C</th><th>Time</th></tr></thead><tbody>{ranked.map(entry => <tr key={entry.id} className={entry.rank <= 3 ? `podium rank-${entry.rank}` : ""}><td>{String(entry.rank).padStart(2, "0")}</td><td><span aria-label={countryName(entry.country)}><Flag code={entry.country}/></span></td><td>{entry.nickname}</td><td>+{entry.temperatureC!.toFixed(1)}°C</td><td>{formatTime(entry.elapsedMs??0)}</td></tr>)}</tbody></table>}
    </section><aside className="qr-panel"><h2>Scan and shape<br/>your future</h2><div className="qr-code">{joinUrl ? <QRCodeSVG value={joinUrl} size={210} level="M" marginSize={2} title="Scan to play"/> : <div className="qr-placeholder"/>}</div><p>Open your phone’s camera. No install.</p></aside></div>
    {screenError && <p role="status">{screenError}</p>}
  </main></div>;
}
