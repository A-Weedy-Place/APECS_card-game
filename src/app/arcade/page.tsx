"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bird, Fish, Volume2, VolumeX } from "lucide-react";
import { ArcadeGame, ARCADE_INFO } from "@/components/arcade-game";
import type { ArcadeKind } from "@/game/arcade";
import { soundEnabled, setSoundEnabled } from "@/lib/sound";
export default function ArcadePage(){
  const [kind,setKind]=useState<ArcadeKind>("flight"),[muted,setMuted]=useState(false);
  useEffect(()=>setMuted(!soundEnabled()),[]);
  return <div className="arcade-practice"><main id="main-content" className="practice-main">
    <header className="practice-header"><Link href="/" aria-label="Back to game"><ArrowLeft size={19}/></Link><div><small>APECS · PRACTICE</small><h1>Arcade</h1></div><button aria-label={muted?"Enable sound effects":"Mute sound effects"} className="sound-button" onClick={()=>{const next=!soundEnabled();setSoundEnabled(next);setMuted(!next);}}>{muted?<VolumeX size={18}/>:<Volume2 size={18}/>}</button></header>
    <nav className="arcade-tabs" aria-label="Choose a practice game"><button aria-pressed={kind==="flight"} onClick={()=>setKind("flight")}><Bird size={18}/> Flappy Flight</button><button aria-pressed={kind==="cleanup"} onClick={()=>setKind("cleanup")}><Fish size={18}/> Reef Rescue</button></nav>
    <section className="practice-course" aria-label={`${ARCADE_INFO[kind].title} practice`}><p className="practice-description">{ARCADE_INFO[kind].hint}</p><ArcadeGame key={kind} kind={kind} practice/></section>
    <p className="practice-note">Practice only · no coins or leaderboard scores</p>
  </main></div>;
}
