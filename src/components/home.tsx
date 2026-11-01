"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { api, requestId, writeSession } from "@/lib/client";
import { CountryPicker } from "./country-picker";
import { playSound } from "@/lib/sound";
import type { AttemptStatus, PublicRun } from "@/game/types";
import { WorldBackground } from "./game-world";

export function Home({ countries }: { countries: { code: string; name: string }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [country, setCountry] = useState("");
  const [attempts, setAttempts] = useState<AttemptStatus | null>(null);
  const startKey = useRef("");
  useEffect(() => { api<AttemptStatus>("/api/attempts").then(setAttempts).catch(err => setError(err.message)); }, []);
  async function start(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!country) { setError("Choose your country."); return; } setBusy(true); setError(""); playSound("pass");
    const values = new FormData(event.currentTarget);
    try {
      localStorage.setItem("cop-storage-test", "1"); localStorage.removeItem("cop-storage-test");
      const result = await api<{ run: PublicRun; token: string }>("/api/runs", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: values.get("nickname"), country: values.get("country"), consent: true, requestId: startKey.current ||= requestId() }),
      });
      writeSession({ id: result.run.id, token: result.token }); router.push("/play");
    } catch (err) { setError(err instanceof Error ? err.message : "Try again."); setBusy(false); }
  }
  return <div className="game-lobby"><WorldBackground/><main id="main-content" className="join-stage">
    <form onSubmit={start} className="join-box" aria-label="Enter the game">
      <div className="lobby-title"><h1>COP31</h1><p>Cryosphere Pavilion</p><span>APECS</span></div>
      <label htmlFor="nickname">Name</label>
      <input id="nickname" name="nickname" minLength={2} maxLength={24} required placeholder="Your name" autoComplete="off" aria-describedby="join-disclosure"/>
      <label htmlFor="country">Country</label>
      <CountryPicker countries={countries} value={country} onChange={setCountry}/>
      {error && <p className="error-message" role="alert">{error}</p>}
      {attempts?.remaining === 0 ? <><p className="plays-used">Both plays used</p><Link className="game-button gold" href="/leaderboard">Leaderboard</Link><Link className="game-button quiet" href="/play">Last game & history</Link></> : <button className="game-button gold" type="submit" disabled={busy || !attempts} aria-describedby="join-disclosure">{busy || !attempts ? <LoaderCircle size={20} className="spin" aria-label="Loading"/> : "Play"}</button>}
      <small id="join-disclosure">An alias is fine. Name, flag, temperature & time appear on the board.</small>
    </form>
  </main></div>;
}
