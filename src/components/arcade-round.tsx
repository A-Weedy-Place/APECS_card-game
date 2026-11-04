"use client";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { ArcadeGame, ARCADE_INFO } from "./arcade-game";
import { playSound } from "@/lib/sound";
import type { ArcadeKind, ArcadeResult } from "@/game/arcade";
import type { PublicRun, RewardStat, SpecialCommand } from "@/game/types";
const boosts:{id:RewardStat;title:string}[]=[{id:"support",title:"Politics"},{id:"economy",title:"Economy"},{id:"awareness",title:"Awareness"},{id:"justice",title:"Fairness"},{id:"credits",title:"Coins"}];
export function ArcadeRound({run,busy,onAction,onSkip}:{run:PublicRun;busy:boolean;onAction:(command:SpecialCommand)=>Promise<void>;onSkip:()=>void}) {
  const coinsOnly=run.rulesVersion==="prototype-0.10";
  const options=coinsOnly?boosts.filter(b=>b.id==="credits"):run.rulesVersion==="prototype-0.9"?boosts.filter(b=>b.id!=="justice").map(b=>({...b,title:b.id==="economy"?"Revenue":b.id==="awareness"?"Engagement":b.title})):boosts;
  const kind=run.specialRound as ArcadeKind,attempt=run.specialAttempt;
  const [reward,setReward]=useState<RewardStat>(coinsOnly?"credits":"support"),[result,setResult]=useState<ArcadeResult|null>(null);
  const amount=attempt&&result?Math.min(Math.floor(result.score/(coinsOnly?20:attempt.reward==="credits"?25:6)),(attempt.reward==="credits"?20:100)-run.resources[attempt.reward]):0;
  const boostName=options.find(item=>item.id===(attempt?.reward??reward))!.title;
  return <section className={`arcade-round ${attempt?"arcade-active":""}`} aria-labelledby="arcade-title">
    <div className="arcade-heading"><span><Sparkles size={13} aria-hidden="true"/> SPECIAL ROUND {run.round+1}</span><h2 id="arcade-title">{ARCADE_INFO[kind].title}</h2><p>{ARCADE_INFO[kind].hint}</p></div>
    {coinsOnly?<p className="arcade-reward-tag">Earn up to <b>5 coins</b> · speed increases</p>:!attempt?<div className="arcade-boosts" role="group" aria-label="Choose your boost"><small>Boost</small>{options.map(option=><button key={option.id} aria-pressed={reward===option.id} disabled={busy} onClick={()=>{setReward(option.id);playSound("select");}}>{option.title}</button>)}</div>:<p className="arcade-reward-tag">Playing for <b>{boostName}</b></p>}
    <ArcadeGame key={attempt?.startedAt??"preview"} kind={kind} variant={coinsOnly?"rising":"classic"} autoStart={!!attempt} disabled={busy} onStart={attempt?undefined:()=>onAction({kind:"begin-special",reward})} onFinish={setResult}/>
    <div className="arcade-round-footer">{result&&attempt?<><p role="status">+{amount} {boostName}</p><button className="game-button gold" disabled={busy} onClick={()=>onAction({kind:"finish-special",frames:result.frames,endFrame:result.endFrame,...(result.moves?{moves:result.moves}:{})})}>Collect & continue</button></>:<button className="game-button quiet" disabled={busy} onClick={onSkip}>Skip challenge</button>}</div>
  </section>;
}
