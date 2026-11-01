import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import photoManifest from "../public/art/cards/credits.json";
import { DatabaseSync } from "node:sqlite";
import { createRun, publicRun, takeAction, takeCardBatch } from "../src/game/engine";
import { v7Create, v7Approval, v7Effects, v7Income, v7Preview, v7Special } from "../src/game/v7";
import { v6Create, V6_CARDS } from "../src/game/v6";
import { startRun, attemptStatus, getRun, actOnRun, adminRecords, editRecord, adminRun, leaderboard, resetAttempts } from "../src/server/store";
process.env.DATABASE_PATH = `./data/v7-${randomUUID()}.sqlite`;
const fresh = (seed = 1) => v7Create("v7", "Player", "PK", seed);
test("all 51 cards have distinct local photographs with attribution and licence records",()=>{
  const photos=photoManifest as Record<string,{file:string;credit:string;source:string;licence:string;licenceUrl:string;modification:string}>;
  assert.ok(V6_CARDS.every(card=>Object.hasOwn(photos,card.id)));
  const hashes=V6_CARDS.map(card=>{const photo=photos[card.id];assert.ok(photo.credit&&photo.licence&&photo.modification&&photo.licenceUrl);assert.match(photo.source,/^https:\/\//);assert.ok(existsSync("public/art/cards/"+card.id+".licence.txt"));return createHash("sha256").update(readFileSync("public"+photo.file)).digest("hex");});
  assert.equal(new Set(hashes).size,51);
});
test("new 0.7 games use scarce coins, seven-dot-ready resources and no skip bonus", () => {
  let state = fresh(); assert.equal(state.rulesVersion,"prototype-0.7"); assert.equal(state.resources.credits,8); assert.equal(v7Income(state),5);
  state = takeAction(state,"save"); assert.equal(state.resources.credits,13); assert.deepEqual(state.history.at(-1)!.effects,{});
  while(!state.finishedAt) state=takeAction(state,"save");
  assert.equal(state.resources.credits,20); assert.equal(state.history.length,10); assert.ok(state.history.every(action=>action.year===2026));
  assert.equal(state.projection.temperatureC,undefined); assert.deepEqual(state.projection.trajectory,[]);
  const old=v6Create("old","Old","PK",1); assert.equal(old.resources.credits,14); assert.equal(takeAction(old,"save").resources.credits,21);
});
test("politics dominates awareness in action approval and neglect reaches genuinely low odds",()=>{
  const state=fresh(), card=V6_CARDS.find(card=>card.id==="coal-exit")!;
  const base=v7Approval(state,card), politics=structuredClone(state), aware=structuredClone(state);
  politics.resources.support+=20; aware.resources.awareness+=20;
  assert.ok(v7Approval(politics,card)-base > 4*(v7Approval(aware,card)-base));
  state.round=9;state.resources.support=0;state.resources.economy=0;state.resources.awareness=0;assert.equal(v7Approval(state,card),5);
  assert.ok((v7Effects(fresh(),card).support??0)<-15);
});
test("package affordability, canonical order, quote parity and rejection preserve server authority",()=>{
  for(const card of V6_CARDS){
    let passed=false;
    for(let seed=0;seed<100&&!passed;seed++){
      const state=fresh(seed);state.round=4;state.resources.credits=20;
      state.history=V6_CARDS.filter(c=>c.id!==card.id).map(c=>({kind:"policy",planningRound:1,year:2026,cardId:c.id,title:c.title,category:c.category,accepted:true,probability:100,spent:0,refund:0,income:0,transition:0,effects:{}}));
      state.offers=[card.id]; const quote=v7Preview(state,card), next=takeCardBatch(state,[card.id]), receipt=next.lastActions![0];
      assert.equal(receipt.spent,quote.cost);assert.equal(receipt.probability,quote.approval);
      if(receipt.accepted){passed=true;assert.deepEqual(receipt.effects,quote.effects);assert.equal(receipt.transition,quote.transitionGain);}else{assert.equal(receipt.transition,0);assert.deepEqual(receipt.effects,{support:-4});assert.equal(receipt.surprise,undefined);}
    }
    assert.ok(passed,card.id);
  }
  const state=fresh();state.offers=["local-campaign","citizens-assembly","solar"];state.resources.credits=20;
  assert.deepEqual(takeCardBatch(state,["local-campaign","solar"]),takeCardBatch(state,["solar","local-campaign"]));
  state.resources.credits=1;const before=structuredClone(state);assert.throws(()=>takeCardBatch(state,["solar"]));assert.deepEqual(state,before);
});
test("500 complete new sessions remain bounded with affordable packages, skips and paid shuffles",()=>{
  for(let seed=0;seed<500;seed++){
    let state=fresh(seed);
    while(!state.finishedAt){
      let view=publicRun(state);
      if(!view.specialRound&&seed%7===0&&view.canRedraw){state=takeAction(state,"redraw");view=publicRun(state);}
      let budget=state.resources.credits;const ids=view.offers.filter(card=>{if(card.cost>budget)return false;budget-=card.cost;return true;}).map(card=>card.id);
      state=ids.length?takeCardBatch(state,ids):takeAction(state,"save");
      assert.ok(state.resources.credits>=0&&state.resources.credits<=20);assert.ok(Object.entries(state.resources).every(([key,value])=>value>=0&&value<=(key==="credits"?20:100)));
      assert.equal(state.offers.length,state.finishedAt||[3,6].includes(state.round)?0:3);
    }
    assert.ok(state.score!>=0&&state.score!<=1000);assert.equal(state.round,10);assert.equal(JSON.stringify(publicRun(state)).includes('"seed":'),false);
  }
});
test("new challenge rewards are replayed, coin-capped and settled exactly once",()=>{
  let state=fresh();state.round=6;state.offers=[];state.resources.credits=20;
  state=v7Special(state,{kind:"begin-special",reward:"credits"},100000);
  assert.throws(()=>v7Special(state,{kind:"finish-special",frames:[],endFrame:1080},100001));
  const next=v7Special(state,{kind:"finish-special",frames:[1,31,61,91,121],endFrame:121},103000);
  assert.equal(next.round,7);assert.equal(next.resources.credits,20);assert.equal(next.lastActions![0].effects.credits,0);
  assert.throws(()=>v7Special(next,{kind:"finish-special",frames:[1],endFrame:121},104000));
});
test("two-start browser quota is persisted, idempotent and independent across browsers",()=>{
  const token=randomBytes(32).toString("hex"), browser={token,requestId:randomUUID()};
  const first=startRun("Quota One","PK",browser), replay=startRun("Quota One","PK",browser);
  assert.deepEqual(first,replay);assert.equal(attemptStatus(token).remaining,1);
  startRun("Quota Two","PK",{token,requestId:randomUUID()});
  assert.throws(()=>startRun("Quota Three","PK",{token,requestId:randomUUID()}),/Both plays/);
  assert.equal(attemptStatus(token).remaining,0);assert.equal(attemptStatus(randomBytes(32).toString("hex")).remaining,2);
  assert.equal(resetAttempts(token).remaining,2);
});
test("organiser corrections and recoverable trash do not overwrite original results or leak seeds",()=>{
  const {run,token}=startRun("Correct Me","PK");
  // Explicit archived fixture: new starts are 0.9, but saved 0.7 corrections remain supported.
  const legacyFixture=new DatabaseSync(process.env.DATABASE_PATH!);legacyFixture.prepare("UPDATE runs SET state=? WHERE id=?").run(JSON.stringify(v7Create(run.id,"Correct Me","PK",7)),run.id);legacyFixture.close();let next=getRun(run.id,token);
  while(!next.finishedAt)next=actOnRun(run.id,token,"save",next.revision,randomUUID());
  const original=next.score, first=adminRecords(1,"Correct Me").records[0];
  editRecord(first.id,first.revision,{nickname:"Corrected",country:"FR",score:777});
  assert.equal(getRun(run.id,token).score,777);assert.equal(getRun(run.id,token).nickname,"Corrected");assert.equal(adminRun(run.id).score,original);assert.equal(leaderboard(true).find(e=>e.id===run.id)?.country,"FR");
  assert.throws(()=>editRecord(first.id,0,{score:999}),/changed/);
  editRecord(first.id,1,{deleted:true});assert.equal(leaderboard().some(e=>e.id===run.id),false);assert.throws(()=>getRun(run.id,token),/removed/);
  editRecord(first.id,2,{deleted:false,score:null});assert.equal(getRun(run.id,token).score,original);
  const fixture=new DatabaseSync(process.env.DATABASE_PATH!);assert.equal((fixture.prepare("SELECT COUNT(*) AS n FROM admin_audit WHERE run_id = ?").get(run.id) as {n:number}).n,3);fixture.close();
  assert.equal(JSON.stringify(adminRun(run.id)).includes('"seed":'),false);
  const ongoing=startRun("Unfinished","PK");assert.throws(()=>editRecord(ongoing.run.id,0,{score:10}),/completed|cannot be edited/);
});
test("all records including unfinished games are paginated and no token hashes enter admin data",()=>{
  for(let index=0;index<35;index++)startRun(`Paged ${index}`,"PK");
  const first=adminRecords(1,"Paged"), second=adminRecords(2,"Paged");
  assert.equal(first.total,35);assert.equal(first.records.length,30);assert.equal(second.records.length,5);assert.equal(first.pages,2);
  assert.equal(JSON.stringify(first).includes("token_hash"),false);
});
