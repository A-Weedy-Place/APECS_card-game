import test from "node:test";
import assert from "node:assert/strict";
import { ARCADE_FRAMES, initialPuffin, initialReef, iceGate, stepPuffin, stepReef, puffinScore, reefScore, replayArcade, validArcadeInput, type Lane, type SwimMove } from "../src/game/arcade";
import { publicRun, takeAction, takeSpecialAction } from "../src/game/engine";
import { v8Create as createRun, v8Special } from "../src/game/v8";
import { v7Create, v7Special } from "../src/game/v7";
import { challengeScore } from "../src/game/challenges";

test("0.8 retains the 0.7 policy economy and routes the second arcade to cleanup",()=>{
  let current=createRun("new","New","PK",12),old=v7Create("old","Old","PK",12);
  assert.equal(current.rulesVersion,"prototype-0.8");
  for(let round=0;round<10;round++){
    const view=publicRun(current),previous=publicRun(old);
    assert.deepEqual(current.resources,old.resources);assert.deepEqual(view.offers,previous.offers);
    assert.equal(view.specialRound,round===3?"flight":round===6?"cleanup":null);
    assert.equal(view.planningYear,2026);assert.deepEqual(view.projection.trajectory,[]);assert.equal(view.projection.temperatureC,undefined);
    current=takeAction(current,"save");old=takeAction(old,"save");
  }
  assert.ok(current.finishedAt);assert.equal(current.score,old.score);
});
test("puffin course accelerates, narrows fairly and replays actual flap inputs exactly",()=>{
  let state=initialPuffin();const frames:number[]=[];
  while(!state.dead&&state.frame<ARCADE_FRAMES){
    const gate=Array.from({length:22},(_,i)=>iceGate(i,state.frame)).find(g=>g.x+g.width>85)!;
    const flap=state.y>gate.centre+5&&state.velocity>0;
    if(flap)frames.push(state.frame+1);state=stepPuffin(state,flap);
  }
  assert.equal(state.frame,ARCADE_FRAMES);assert.ok(state.passed>=14);assert.ok(state.beacons>3);
  assert.ok(validArcadeInput("flight",frames,state.frame));assert.equal(replayArcade("flight",frames,state.frame),puffinScore(state));
  assert.ok(puffinScore(state)>80);assert.ok(replayArcade("flight",[],1080)<10);
  assert.ok(iceGate(0,900).gap<iceGate(0,100).gap);
  assert.ok(iceGate(0,900).x-iceGate(0,901).x>iceGate(0,100).x-iceGate(0,101).x);
});
test("reef auto-fire, steering, three hearts, bursts and score replay stay bounded",()=>{
  let best=0;const scores=new Set<number>();
  for(let strategy=0;strategy<60;strategy++){
    let state=initialReef();const moves:SwimMove[]=[];
    while(!state.dead&&state.frame<ARCADE_FRAMES){
      let lane=state.lane;
      const target=state.trash.find(item=>item.kind!=="net"&&item.x>110&&item.x<350);
      if(strategy===0&&target)lane=target.lane;
      else if(strategy&&state.frame%(18+strategy*3)===0)lane=((state.lane+1)%3)as Lane;
      const net=state.trash.find(item=>item.kind==="net"&&item.lane===lane&&item.x<155&&item.x>35);
      if(net&&strategy%2===0)lane=((lane+1)%3)as Lane;
      if(lane!==state.lane&&(!moves.length||state.frame+1-moves.at(-1)!.frame>=3))moves.push({frame:state.frame+1,lane});else lane=state.lane;
      state=stepReef(state,lane);
      assert.ok(state.trash.length<30&&state.bubbles.length<50&&state.splashes.length<30);assert.ok(state.hits<=3);assert.ok(Number.isFinite(state.y));
    }
    assert.ok(validArcadeInput("cleanup",[],state.frame,moves),`valid steering strategy ${strategy}`);assert.equal(replayArcade("cleanup",[],state.frame,moves),reefScore(state));
    assert.ok(reefScore(state)>=0&&reefScore(state)<=100);scores.add(reefScore(state));best=Math.max(best,reefScore(state));
  }
  assert.ok(scores.size>10,`${scores.size} distinct scores`);assert.ok(best>=65,`best score ${best}`);
  const state=initialReef();state.frame=100;state.combo=3;state.trash=[{id:0,lane:1,x:150,hp:1,kind:"can"}];state.bubbles=[{x:140,y:210}];state.nextSpawn=200;
  const burst=stepReef(state);assert.equal(burst.combo,4);assert.ok(burst.boostUntil>burst.frame);
});
test("arcade inputs reject malformed, oversized, cross-game and impossible ordering",()=>{
  assert.equal(validArcadeInput("cleanup",[],1080,[]),true);
  for(const moves of [[{frame:1,lane:3}],[{frame:0,lane:0}],[{frame:1.2,lane:0}],[{frame:5,lane:0},{frame:4,lane:1}],Array.from({length:181},(_,i)=>({frame:i*3+1,lane:0}))])assert.equal(validArcadeInput("cleanup",[],1080,moves as SwimMove[]),false);
  assert.equal(validArcadeInput("cleanup",[1],1080,[]),false);assert.equal(validArcadeInput("cleanup",[],1080),false);
  assert.equal(validArcadeInput("flight",[1],1080,[]),false);assert.equal(validArcadeInput("flight",[1,2],1080),false);
  assert.equal(validArcadeInput("flight",[],1081),false);assert.equal(validArcadeInput("flight",[100],99),false);
});
test("authoritative cleanup rewards lock, reject early claims, settle once and never cool the model",()=>{
  let state=createRun("new","Tester","AQ",1);state.round=6;state.offers=[];
  state=v8Special(state,{kind:"begin-special",reward:"credits"},100000);
  assert.equal(state.specialAttempt?.kind,"cleanup");
  assert.throws(()=>v8Special(state,{kind:"begin-special",reward:"justice"},100100));
  assert.throws(()=>v8Special(state,{kind:"finish-special",frames:[],moves:[],endFrame:1080},100500),/still running/);
  assert.throws(()=>v8Special(state,{kind:"finish-special",frames:[],moves:[{frame:1,lane:4 as Lane}],endFrame:1080},119000),/Invalid/);
  const next=v8Special(state,{kind:"finish-special",frames:[],moves:[],endFrame:1080},119000);
  const decision=next.lastActions![0];assert.equal(decision.challengeScore,replayArcade("cleanup",[],1080,[]));assert.equal(decision.effects.credits,Math.floor(decision.challengeScore!/25));
  assert.equal(next.round,7);assert.equal(next.revision,state.revision+1);assert.equal(next.specialAttempt,undefined);assert.equal(next.transition,0);assert.deepEqual(next.projection.trajectory,[]);
  assert.throws(()=>takeSpecialAction(next,{kind:"finish-special",frames:[],moves:[],endFrame:1080}));
});
test("saved 0.7 pulse attempts still use the original five-tap scoring",()=>{
  let state=v7Create("saved","Old","AQ",1);state.round=6;
  state=v7Special(state,{kind:"begin-special",reward:"justice"},100000);
  const frames=[1,31,61,91,121],next=v7Special(state,{kind:"finish-special",frames,endFrame:121},103000);
  assert.equal(next.lastActions![0].challengeScore,challengeScore("pulse",frames,121));assert.equal(next.rulesVersion,"prototype-0.7");assert.equal(next.lastActions![0].title,"Grid pulse");
});
