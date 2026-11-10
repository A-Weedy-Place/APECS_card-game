import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID,createHash } from "node:crypto";
import { readFileSync,existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { publicRun,takeAction,takeCardBatch,calculateScore } from "../src/game/engine";
import { v10Create as createRun } from "../src/game/v10";
import { v9Approval,v9Locked,v9Quote } from "../src/game/v9";
import { CONTROLS,POLICY_CARDS,POLICY_BY_ID,MODEL_PROFILE,MODEL_VERSION,defaultSettings,settingsFor,validSettings } from "../src/game/policy-catalogue";
import { compareResults,sameResult,formatTime } from "../src/game/ranking";
import { projectFor } from "../src/game/model";
import { scenarioKey,validateModelResult,type ModelResult } from "../src/server/model-result";
import { startRun,actOnRun,getRun,modelSettings,saveModelStatus,modelStatus,leaderboard,editRecord,adminRecords } from "../src/server/store";
import photos from "../public/art/cards/credits.json";
process.env.DATABASE_PATH=`./data/v9-${randomUUID()}.sqlite`;
const fresh=(seed=1)=>createRun("test","Player","PK",seed);
const card=(id:string)=>POLICY_BY_ID.get(id)!;
test("19 bounded control families have progressive prerequisites and 67 distinct attributed pictures",()=>{
 assert.equal(CONTROLS.length,19);assert.equal(POLICY_CARDS.length,67);assert.ok(validSettings(defaultSettings()));
 const hashes=POLICY_CARDS.map(c=>{if(c.factor){const control=CONTROLS.find(f=>f.id===c.factor)!;assert.ok(c.target!>=control.min&&c.target!<=control.max);assert.ok(c.tier===1||c.requires);if(c.requires)assert.equal(card(c.requires).factor,c.factor);}if(c.requires)assert.ok(card(c.requires));const photo=(photos as Record<string,{file:string;credit:string;licence:string}>)[c.photo];assert.ok(photo?.credit&&photo.licence,c.photo);assert.ok(existsSync(`public/art/cards/${c.photo}.licence.txt`));return createHash("sha256").update(readFileSync("public"+photo.file)).digest("hex");});
 assert.equal(new Set(hashes).size,67);for(const control of CONTROLS)assert.ok(POLICY_CARDS.filter(c=>c.factor===control.id).length>=2);
});
test("ten 2026 rounds stop the server clock without inventing a temperature or game-point score",()=>{
 let state=fresh();assert.equal(state.rulesVersion,"prototype-0.10");state.startedAt=new Date(Date.now()-60000).toISOString();
 while(!state.finishedAt)state=takeAction(state,"save");
 assert.equal("pressure"in state.projection,false);assert.equal("pressure"in projectFor([],"prototype-0.9"),false);
 assert.equal(state.round,10);assert.equal(state.score,null);assert.ok(state.elapsedMs!>=60000);assert.equal(state.projection.kind,"pending");assert.equal(state.projection.temperatureC,undefined);assert.deepEqual(state.projection.trajectory,[]);assert.ok(state.history.every(h=>h.year===2026));assert.throws(()=>calculateScore(state),/requires a completed/);assert.throws(()=>takeAction(state,"save"),/complete/);
});
test("politics dominates engagement, ambitious action can reach 5%, mandate can fail and then boosts later approval",()=>{
 const state=fresh(),action=card("coal-main-3"),p=structuredClone(state),a=structuredClone(state);p.resources.support+=20;a.resources.awareness+=20;
 assert.ok(v9Approval(p,action)-v9Approval(state,action)>4*(v9Approval(a,action)-v9Approval(state,action)));
 state.round=9;state.resources.support=0;state.resources.awareness=0;assert.equal(v9Approval(state,action),5);state.electionMandate=true;assert.ok(v9Approval(state,action)>=96);
 assert.equal(v9Quote(fresh(),card("mandate-v9")).rejectionRefund,4);assert.ok(v9Approval(fresh(),card("mandate-v9"))<100);
});
test("only successfully adopted controls change a full scenario; upgrades replace rather than add values",()=>{
 const history=[{kind:"policy",accepted:true,cardId:"coal-main-1"},{kind:"policy",accepted:false,cardId:"coal-main-2"},{kind:"policy",accepted:true,cardId:"listen-v9"}];
 assert.equal(settingsFor(history).coal,0);assert.equal(settingsFor(history).population,10.2);
 history.push({kind:"policy",accepted:true,cardId:"coal-main-2"});assert.equal(settingsFor(history).coal,75);
 assert.deepEqual(settingsFor([{kind:"policy",accepted:true,cardId:"fair-v9"}]),defaultSettings());
 const state=fresh();assert.ok(v9Locked(state,card("coal-main-2")));state.history=history.map(h=>({...h,kind:"policy",year:2026,title:"fixture",category:"technology",probability:100,spent:0,refund:0,income:0,transition:0,effects:{}}));state.policySettings=settingsFor(history);assert.equal(v9Locked(state,card("coal-main-3")),null);
});
test("packages quote before effects, settle once, preserve input state and reject forged or unaffordable cards",()=>{
 const state=fresh();state.offers=["coalition-v9","coal-main-1","listen-v9"];state.resources.credits=20;const original=structuredClone(state);
 const next=takeCardBatch(state,["coal-main-1","coalition-v9"]);assert.equal(next.round,1);assert.equal(next.revision,1);assert.deepEqual(state,original);assert.equal(next.history.filter(h=>h.kind==="policy").find(h=>h.cardId==="coal-main-1")!.probability,v9Approval(state,card("coal-main-1")));
 const reversed=takeCardBatch(state,["coalition-v9","coal-main-1"]);assert.deepEqual(next,reversed);
 for(const ids of [["not-offered"],["coal-main-1","coal-main-1"]])assert.throws(()=>takeCardBatch(state,ids));
 state.resources.credits=0;assert.throws(()=>takeCardBatch(state,["coal-main-1"]));
});
test("500 sessions keep three eligible random offers, bounded purses and no client seed",()=>{
 for(let seed=0;seed<500;seed++){let state=fresh(seed);while(!state.finishedAt){const view=publicRun(state);assert.equal("seed"in view,false);assert.equal(state.offers.length,[3,6].includes(state.round)?0:3);assert.ok(view.offers.every(c=>!v9Locked(state,card(c.id))));let budget=state.resources.credits;const factors=new Set<string>();const ids=view.offers.filter(c=>{const policy=card(c.id);if(c.cost>budget||policy.factor&&factors.has(policy.factor))return false;if(policy.factor)factors.add(policy.factor);budget-=c.cost;return true;}).map(c=>c.id);state=ids.length?takeCardBatch(state,ids):takeAction(state,"save");assert.ok(state.resources.credits>=0&&state.resources.credits<=20);assert.equal(state.score,null);assert.equal(state.projection.temperatureC,undefined);}assert.ok(validSettings(state.policySettings));}
});
test("full-package cache validation rejects wrong versions, incomplete inputs, invented precision and unsafe URLs",()=>{
 const settings=defaultSettings(),result:ModelResult={temperatureC:3.3,modelVersion:MODEL_VERSION,profile:MODEL_PROFILE,provider:"public-ui-experimental",sourceUrl:`https://en-roads.climateinteractive.org/scenario.html?v=${MODEL_VERSION}`,evaluatedAt:new Date().toISOString(),readback:settings};
 assert.ok(validateModelResult(result,settings));for(const bad of [{...result,temperatureC:3.31},{...result,modelVersion:"26.9"},{...result,sourceUrl:"https://evil.test/"},{...result,readback:{...settings,coal:0}}])assert.equal(validateModelResult(bad,settings),false);assert.equal(scenarioKey(settings),scenarioKey({...settings}));assert.notEqual(scenarioKey(settings),scenarioKey({...settings,coal:0}));
});
test("temperature is primary, displayed-equal temperatures use time, exact displayed ties share rank",()=>{
 const base={id:"a",nickname:"a",country:"PK",finishedAt:"2026-10-31",score:2,temperatureC:2,elapsedMs:50000};assert.ok(compareResults({...base,temperatureC:1.9,elapsedMs:90000},base)<0);assert.ok(compareResults({...base,elapsedMs:49000},base)<0);assert.ok(sameResult(base,{...base,elapsedMs:50001}));assert.equal(formatTime(61230),"1:01.23");
});
test("owned completed runs alone request evaluation, pending cannot rank, validated cached results rank and cannot be edited",()=>{
 const a=startRun("Cached One","PK"),b=startRun("Cached Two","GB");assert.throws(()=>modelSettings(a.run.id,a.token),/Finish/);assert.throws(()=>modelSettings(a.run.id,"wrong"),/invalid/);
 // Isolated test database only. Different fixture start times exercise server-measured ordering.
 const fixture=new DatabaseSync(process.env.DATABASE_PATH!);for(const[item,ms]of[[a,90000],[b,30000]]as const){const state=JSON.parse((fixture.prepare("SELECT state FROM runs WHERE id=?").get(item.run.id)as{state:string}).state);state.startedAt=new Date(Date.now()-ms).toISOString();fixture.prepare("UPDATE runs SET state=? WHERE id=?").run(JSON.stringify(state),item.run.id);}fixture.close();
 for(const item of [a,b])for(let n=0;n<item.run.totalRounds!;n++)actOnRun(item.run.id,item.token,"save",n,randomUUID());assert.equal(leaderboard().length,0);
 const settings=modelSettings(a.run.id,a.token);assert.equal(modelStatus(settings).status,"idle");
 // Synthetic result is strictly a provider-contract fixture, never a real model run or preview record.
 saveModelStatus(settings,"complete",{temperatureC:3.3,modelVersion:MODEL_VERSION,profile:MODEL_PROFILE,provider:"public-ui-experimental",sourceUrl:`https://en-roads.climateinteractive.org/scenario.html?v=${MODEL_VERSION}`,evaluatedAt:new Date().toISOString(),readback:settings});
 assert.deepEqual(leaderboard().map(e=>e.id),[b.run.id,a.run.id]);assert.equal(getRun(a.run.id,a.token).modelEvaluation?.temperatureC,3.3);assert.equal(getRun(a.run.id,a.token).score,null);assert.throws(()=>editRecord(a.run.id,0,{score:100}),/cannot be edited/);
 editRecord(a.run.id,0,{nickname:"Corrected",hidden:true});assert.equal(leaderboard().length,1);assert.equal(adminRecords(1,"Corrected").records[0].temperatureC,3.3);editRecord(a.run.id,1,{hidden:false});assert.equal(leaderboard().length,2);
 // Expand the isolated fixture beyond the former 100-entry API cap.
 const boardFixture=new DatabaseSync(process.env.DATABASE_PATH!);
 try {
  const completed=JSON.parse((boardFixture.prepare("SELECT state FROM runs WHERE id=?").get(a.run.id) as {state:string}).state);
  const insert=boardFixture.prepare("INSERT INTO runs(id,token_hash,state,finished_at,created_at) VALUES (?,?,?,?,?)");
  for(let index=0;index<103;index++){
   const id=`full-board-${index}`;
   insert.run(id,id,JSON.stringify({...completed,id,nickname:`Full board ${index}`}),completed.finishedAt,completed.startedAt);
  }
 } finally { boardFixture.close(); }
 assert.equal(leaderboard().length,105);
});
