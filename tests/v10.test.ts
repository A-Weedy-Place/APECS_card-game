import test from "node:test";
import assert from "node:assert/strict";
import { createRun,takeSpecialAction } from "../src/game/engine";
import { v9Create,v9Special } from "../src/game/v9";
import { initialReef,stepReef,replayArcade,iceGate,type Lane } from "../src/game/arcade";
test("0.10 arcade only accepts coins; 0.9 saved reward choices remain valid",()=>{
 const state=createRun("coins","Player","PK",42);state.round=3;state.offers=[];
 assert.equal(state.rulesVersion,"prototype-0.10");
 for(const reward of ["support","economy","awareness","justice"] as const)assert.throws(()=>takeSpecialAction(state,{kind:"begin-special",reward}),/coins only/);
 const old=v9Create("old","Old","PK",42);old.round=3;old.offers=[];assert.equal(v9Special(old,{kind:"begin-special",reward:"support"}).specialAttempt?.reward,"support");
});
test("rising arcade increases speed, narrows gaps and replays exact capped coin payouts",()=>{
 const early=iceGate(1,101,"rising").x-iceGate(1,102,"rising").x,late=iceGate(1,901,"rising").x-iceGate(1,902,"rising").x;
 assert.ok(late>early*1.8);assert.ok(iceGate(1,900,"rising").gap<iceGate(1,100,"rising").gap);
 let course=initialReef();const moves:{frame:number;lane:Lane}[]=[];
 for(let frame=1;frame<=1080&&!course.dead;frame++){
  const desired=(Math.floor(frame/90)%3) as Lane;if(desired!==course.lane)moves.push({frame,lane:desired});course=stepReef(course,desired,"rising");
 }
 const score=replayArcade("cleanup",[],course.frame,moves,"rising");
 const state=createRun("reef","Player","PK",4);state.round=6;state.offers=[];state.resources.credits=19;
 const started=takeSpecialAction(state,{kind:"begin-special",reward:"credits"});started.specialAttempt!.startedAt=Date.now()-30000;
 const next=takeSpecialAction(started,{kind:"finish-special",frames:[],endFrame:course.frame,moves});
 const outcome=next.history.find(a=>a.kind==="special")!;assert.equal(outcome.challengeScore,score);assert.deepEqual(outcome.effects,{credits:Math.min(1,Math.floor(score/20))});assert.ok(next.resources.credits<=20);assert.equal(next.round,7);
 assert.throws(()=>takeSpecialAction(next,{kind:"finish-special",frames:[],endFrame:course.frame,moves}));
});
