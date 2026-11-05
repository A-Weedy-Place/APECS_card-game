"use client";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { Bird, Fish, Heart, Pause, Play, RotateCcw, Timer, Trophy } from "lucide-react";
import { ARCADE_FRAMES, ARCADE_SIZE, endlessCoins, initialPuffin, initialReef, puffinScore, reefScore, stepPuffin, stepReef, type ArcadeKind, type ArcadeResult, type ArcadeVariant, type Lane, type SwimMove } from "@/game/arcade";
import { drawPuffin, drawReef, prepareCanvas } from "./arcade-art";
import { playSound } from "@/lib/sound";

export const ARCADE_INFO = {
  flight:{title:"Flappy Flight",hint:"Tap to fly. Find the gaps. Catch the beacons.",control:"Tap anywhere or press Space to flap"},
  cleanup:{title:"Reef Rescue",hint:"Pop trash. Dodge nets. Bubbles fire automatically.",control:"Drag up or down to move · or use ↑ ↓"},
};
type Phase="ready"|"countdown"|"playing"|"paused"|"done";
export function ArcadeGame({kind,onStart,onFinish,autoStart=false,disabled=false,practice=false,variant="endless"}:{kind:ArcadeKind;onStart?:()=>Promise<void>;onFinish?:(result:ArcadeResult)=>void;autoStart?:boolean;disabled?:boolean;practice?:boolean;variant?:ArcadeVariant}) {
  const info=ARCADE_INFO[kind],reduced=useReducedMotion();
  const endless=variant==="endless";
  const secondsFor=(frame:number)=>endless?Math.floor(frame/60):Math.max(0,Math.ceil((ARCADE_FRAMES-frame)/60));
  const canvas=useRef<HTMLCanvasElement>(null),stage=useRef<HTMLDivElement>(null),puffin=useRef(initialPuffin()),reef=useRef(initialReef());
  const phaseRef=useRef<Phase>(autoStart?"countdown":"ready"),resumePhase=useRef<"playing"|"countdown">("playing");
  const flaps=useRef<number[]>([]),moves=useRef<SwimMove[]>([]),desiredLane=useRef<Lane>(1),lastTick=useRef(0),accumulator=useRef(0),countdownTime=useRef(2400),countdownValue=useRef(3);
  const previousY=useRef(210),starting=useRef(false),mounted=useRef(true),finishListener=useRef(onFinish),reduceRef=useRef(!!reduced);
  const [phase,setPhase]=useState<Phase>(phaseRef.current),[countdown,setCountdown]=useState(3),[pending,setPending]=useState(false);
  const [hud,setHud]=useState({score:0,seconds:endless?0:18,hearts:3,combo:0,boost:false});
  useEffect(()=>{finishListener.current=onFinish;reduceRef.current=!!reduced;},[onFinish,reduced]);
  const changePhase=(next:Phase)=>{phaseRef.current=next;setPhase(next);lastTick.current=0;};
  function reset() {
    puffin.current=initialPuffin();reef.current=initialReef();flaps.current=[];moves.current=[];desiredLane.current=1;previousY.current=210;accumulator.current=0;countdownTime.current=2400;countdownValue.current=3;setCountdown(3);setHud({score:0,seconds:endless?0:18,hearts:3,combo:0,boost:false});
  }
  async function start() {
    if(starting.current||disabled)return;
    starting.current=true;setPending(true);playSound("select");
    try {
      // In a real run, wait for the authoritative begin response. Its timestamp
      // remounts an auto-started game; an unsuccessful request never starts play.
      if(onStart)await onStart();
      else{reset();changePhase("countdown");stage.current?.focus({preventScroll:true});}
    }finally{starting.current=false;if(mounted.current)setPending(false);}
  }
  function pause() {if(phaseRef.current==="playing"||phaseRef.current==="countdown"){resumePhase.current=phaseRef.current;changePhase("paused");}}
  function resume() {if(phaseRef.current==="paused"){changePhase(resumePhase.current);stage.current?.focus({preventScroll:true});}}
  function flap() {
    if(phaseRef.current!=="playing"||disabled)return;
    const tick=puffin.current.frame+1;
    if(flaps.current.length&&tick-flaps.current.at(-1)!<3)return;
    flaps.current.push(tick);playSound("tap");
  }
  function swim(direction:number) {if(phaseRef.current==="playing")desiredLane.current=Math.max(0,Math.min(2,desiredLane.current+direction))as Lane;}
  function aim(clientY:number) {
    const bounds=stage.current!.getBoundingClientRect(),worldY=(clientY-bounds.top)/bounds.height*ARCADE_SIZE;
    desiredLane.current=Math.max(0,Math.min(2,Math.round((worldY-110)/100)))as Lane;
  }
  useEffect(()=>{
    mounted.current=true;
    const ctx=canvas.current&&prepareCanvas(canvas.current);if(!ctx)return;
    let animation=0;
    const finish=()=>{
      if(phaseRef.current==="done")return;
      const state=kind==="flight"?puffin.current:reef.current,score=endless?endlessCoins(state.frame):kind==="flight"?puffinScore(puffin.current):reefScore(reef.current);
      changePhase("done");setHud({score,seconds:secondsFor(state.frame),hearts:3-reef.current.hits,combo:reef.current.combo,boost:false});
      finishListener.current?.({frames:[...flaps.current],...(kind==="cleanup"?{moves:moves.current.map(move=>({...move}))}:{}),endFrame:Math.max(1,state.frame),score});playSound("pass");
    };
    function draw(now:number) {
      const elapsed=lastTick.current?Math.min(100,now-lastTick.current):0;lastTick.current=now;
      if(phaseRef.current==="countdown"){
        countdownTime.current-=elapsed;
        const digit=Math.max(1,Math.ceil(countdownTime.current/800));
        if(digit!==countdownValue.current){countdownValue.current=digit;setCountdown(digit);}
        if(countdownTime.current<=0){changePhase("playing");stage.current?.focus({preventScroll:true});}
      }else if(phaseRef.current==="playing"){
        accumulator.current+=elapsed;
        while(accumulator.current>=1000/60&&phaseRef.current==="playing"){
          accumulator.current-=1000/60;
          if(kind==="flight"){
            previousY.current=puffin.current.y;const before=puffin.current.beacons;
            puffin.current=stepPuffin(puffin.current,flaps.current.at(-1)===puffin.current.frame+1,variant);
            if(puffin.current.beacons>before)playSound("select");
          }else{
            const tick=reef.current.frame+1;
            if(desiredLane.current!==reef.current.lane&&(!moves.current.length||tick-moves.current.at(-1)!.frame>=3))moves.current.push({frame:tick,lane:desiredLane.current});
            const lane=moves.current.at(-1)?.lane??1,before=reef.current;
            previousY.current=before.y;reef.current=stepReef(before,lane,variant);
            if(reef.current.hits>before.hits)playSound("fail");else if(reef.current.cleared>before.cleared)playSound("tap");
          }
          const state=kind==="flight"?puffin.current:reef.current;
          if(state.dead||!endless&&state.frame>=ARCADE_FRAMES)finish();
          else if(state.frame%6===0)setHud({score:endless?endlessCoins(state.frame):kind==="flight"?puffinScore(puffin.current):reefScore(reef.current),seconds:secondsFor(state.frame),hearts:3-reef.current.hits,combo:reef.current.combo,boost:reef.current.boostUntil>state.frame});
        }
      }
      const state=kind==="flight"?puffin.current:reef.current,alpha=phaseRef.current==="playing"?Math.min(1,accumulator.current/(1000/60)):1;
      const y=previousY.current+(state.y-previousY.current)*alpha,time=state.frame+(phaseRef.current==="playing"?alpha:0);
      if(kind==="flight")drawPuffin(ctx!,puffin.current,time,reduceRef.current,y,variant);else drawReef(ctx!,reef.current,time,reduceRef.current,y);
      animation=requestAnimationFrame(draw);
    }
    const visibility=()=>{if(document.hidden)pause();};document.addEventListener("visibilitychange",visibility);
    animation=requestAnimationFrame(draw);
    return()=>{mounted.current=false;cancelAnimationFrame(animation);document.removeEventListener("visibilitychange",visibility);};
    // Physics/input logs live in refs. HUD and pointer updates never restart RAF.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[kind,variant]);

  return <div className={`arcade-game arcade-${kind} phase-${phase}`}>
    <div className="arcade-hud"><span className="arcade-points"><Trophy size={15} aria-hidden="true"/><b>{hud.score}</b></span>{kind==="cleanup"&&<span className="arcade-hearts" aria-label={`${hud.hearts} of 3 hearts`}>{[0,1,2].map(i=><Heart key={i} size={16} fill={i<hud.hearts?"currentColor":"none"} className={i<hud.hearts?"":"lost"} aria-hidden="true"/>)}</span>}<span><Timer size={15} aria-hidden="true"/>{hud.seconds}s</span><button type="button" className="arcade-pause" aria-label={phase==="paused"?"Resume game":"Pause game"} disabled={!["playing","countdown","paused"].includes(phase)} onClick={phase==="paused"?resume:pause}>{phase==="paused"?<Play size={18}/>:<Pause size={18}/>}</button></div>
    <div className="arcade-course-slot"><div className="arcade-stage" ref={stage} role="group" tabIndex={0} aria-label={`${info.title} playfield. ${info.control}`} onKeyDown={event=>{
      if(event.target!==event.currentTarget)return;
      if(["p","P","Escape"].includes(event.key)){event.preventDefault();if(phaseRef.current==="paused")resume();else pause();return;}
      if(kind==="flight"&&[" ","Enter"].includes(event.key)){event.preventDefault();if(!event.repeat)flap();}
      if(kind==="cleanup"&&["ArrowUp","w","W","ArrowDown","s","S"].includes(event.key)){event.preventDefault();if(!event.repeat)swim(["ArrowUp","w","W"].includes(event.key)?-1:1);}
    }} onPointerDown={event=>{
      if(phaseRef.current!=="playing"||(event.target as HTMLElement).closest("button"))return;
      event.preventDefault();event.currentTarget.focus({preventScroll:true});event.currentTarget.setPointerCapture(event.pointerId);
      if(kind==="flight")flap();else aim(event.clientY);
    }} onPointerMove={event=>{if(kind==="cleanup"&&phaseRef.current==="playing"&&event.currentTarget.hasPointerCapture(event.pointerId))aim(event.clientY);}} onPointerUp={event=>{if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);}}>
      <canvas ref={canvas} width={420} height={420} role="img" aria-label={kind==="flight"?"A puffin flying through an Arctic ice course":"A fish firing bubbles at floating litter; orange nets must be avoided"}/>
      {phase==="ready"&&<div className="arcade-overlay arcade-intro"><span className="arcade-badge">{endless?"SURVIVE AS LONG AS YOU CAN":"18 SECOND CHALLENGE"}</span>{kind==="flight"?<Bird size={32}/>:<Fish size={32}/>}<b>{info.title}</b><small>{endless?"The longer you survive, the faster it gets.":kind==="flight"?"Find your rhythm. Keep flying.":"Little fish. Big clean-up."}</small></div>}
      {phase==="countdown"&&<div className="arcade-overlay arcade-countdown"><b key={countdown}>{countdown}</b><small>{kind==="flight"?"Get ready to flap":"Get ready to swim"}</small></div>}
      {phase==="paused"&&<div className="arcade-overlay"><b>Paused</b><button type="button" className="game-button gold" onClick={resume}><Play size={18}/> Resume</button></div>}
      {phase==="done"&&<div className="arcade-overlay arcade-finish"><span className="arcade-badge">{endless?`${hud.seconds}s SURVIVED`:(kind==="flight"?puffin.current:reef.current).frame>=ARCADE_FRAMES?"COURSE COMPLETE":"NICE RUN"}</span><b>{hud.score}<small>{endless?"coins":"/ 100"}</small></b><p>{kind==="flight"?`${puffin.current.passed} passages · ${puffin.current.beacons} beacons`:`${reef.current.cleared} trash cleared · ${reef.current.bestCombo} best streak`}</p></div>}
      {phase==="playing"&&hud.boost&&<span className="arcade-streak">Bubble burst!</span>}
    </div></div>
    <p className="arcade-controls-hint">{phase==="done"?"":info.control}</p>
    {phase==="ready"?<button className="game-button gold arcade-start" disabled={disabled||pending} onClick={start}><Play size={18}/>{pending?"Starting…":`Start ${info.title}`}</button>:phase==="done"?practice?<button className="game-button gold arcade-start" onClick={start}><RotateCcw size={18}/> Play again</button>:null:kind==="flight"?<button className="arcade-control flap-control" disabled={phase!=="playing"||disabled} onClick={event=>{if(event.detail===0)flap();}} onPointerDown={event=>{event.preventDefault();flap();}} onKeyDown={event=>{if([" ","Enter"].includes(event.key)){event.preventDefault();if(!event.repeat)flap();}}}><Bird size={19}/> Flap</button>:null}
    <span className="sr-only" role="status">{phase==="done"?`${info.title}: ${endless?`${hud.seconds} seconds survived, ${hud.score} coins`:`${hud.score} points out of 100`}.`:phase==="paused"?"Game paused.":""}</span>
  </div>;
}
