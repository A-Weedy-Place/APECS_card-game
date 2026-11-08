// Real Postgres integration, isolated to the dedicated loopback Docker test port.
import test from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { randomBytes,randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import * as store from "../src/server/postgres-store";
import { enqueueModel,claimModel,finishModel } from "../src/server/model-queue";
import { CONTROLS,MODEL_PROFILE,MODEL_VERSION } from "../src/game/policy-catalogue";
const url=new URL(process.env.TEST_DATABASE_URL??"postgresql://postgres:apecs-local-test-only@127.0.0.1:54322/apecs_test");
assert.equal(url.hostname,"127.0.0.1");assert.equal(url.port,"54322");assert.equal(url.pathname,"/apecs_test");
const root=new Pool({connectionString:url.toString(),max:1});
const database=`apecs_test_${randomBytes(8).toString("hex")}`;
test("real Postgres ownership, concurrent quota/actions, admin audit, private role and 30-player load",async()=>{
  await root.query(`CREATE DATABASE ${database}`);const adminUrl=new URL(url);adminUrl.pathname=`/${database}`;
  const admin=new Pool({connectionString:adminUrl.toString(),max:1});
  try{
    await admin.query("DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF; IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF; END $$");
    await admin.query(await readFile("supabase/migrations/20261102180114_apecs_hosted_storage.sql","utf8"));
    await admin.query(await readFile("supabase/migrations/20261102190833_model_worker_queue.sql","utf8"));
    await admin.query(await readFile("supabase/migrations/20261107204917_permanent_game_deletion_and_manual_rank.sql","utf8"));
    await admin.query("ALTER ROLE apecs_server PASSWORD 'apecs-local-runtime-only'");
    const runtime=new URL(adminUrl);runtime.username="apecs_server";runtime.password="apecs-local-runtime-only";process.env.DATABASE_URL=runtime.toString();
    const cookie=randomBytes(32).toString("hex"),requestId=randomUUID();
    const [first,retry]=await Promise.all([store.startRun("Concurrent Start","PK",{token:cookie,requestId}),store.startRun("Concurrent Start","PK",{token:cookie,requestId})]);
    assert.equal(first.run.id,retry.run.id);assert.equal((await store.attemptStatus(cookie)).used,1);
    const outcomes=await Promise.allSettled(Array.from({length:5},()=>store.startRun("Quota Race","PK",{token:cookie,requestId:randomUUID()})));
    assert.equal(outcomes.filter(o=>o.status==="fulfilled").length,1);assert.equal((await store.attemptStatus(cookie)).used,2);
    await assert.rejects(store.getRun(first.run.id,"wrong"),/session key invalid/);
    const actionKey=randomUUID();const [one,two]=await Promise.all([store.actOnRun(first.run.id,first.token,"save",0,actionKey),store.actOnRun(first.run.id,first.token,"save",0,actionKey)]);assert.deepEqual(one,two);
    const races=await Promise.allSettled([store.actOnRun(first.run.id,first.token,"save",1,randomUUID()),store.actOnRun(first.run.id,first.token,"save",1,randomUUID())]);assert.equal(races.filter(r=>r.status==="fulfilled").length,1);
    await store.resetPlayerAttempts(first.run.id);assert.equal((await store.attemptStatus(cookie)).remaining,2);assert.equal((await store.adminActivity(first.run.id)).audit[0].action,"reset-player-plays");
    await store.editRecord(first.run.id,0,{nickname:"Corrected Player",deleted:true});await assert.rejects(store.getRun(first.run.id,first.token),/removed/);await assert.rejects(store.editRecord(first.run.id,0,{deleted:false}),/changed/);await store.editRecord(first.run.id,1,{deleted:false});
    assert.equal((await store.adminRun(first.run.id)).nickname,"Concurrent Start");assert.equal((await store.getRun(first.run.id,first.token)).nickname,"Corrected Player");
    await store.rateLimit("quota-test",1);await assert.rejects(store.rateLimit("quota-test",1),/Too many/);
    const players=await Promise.all(Array.from({length:30},(_,i)=>store.startRun(`Load ${i}`,"AQ",{token:randomBytes(32).toString("hex"),requestId:randomUUID()})));
    const timings:number[]=[];for(let round=0;round<players[0].run.totalRounds!;round++)await Promise.all(players.map(async p=>{const start=performance.now();p.run=await store.actOnRun(p.run.id,p.token,"save",p.run.revision,randomUUID());timings.push(performance.now()-start);}));
    assert.ok(players.every(p=>p.run.finishedAt&&p.run.score===null));assert.deepEqual(await store.leaderboard(),[]);
    const settings=await store.modelSettings(players[0].run.id,players[0].token);
    const result={temperatureC:3.3,modelVersion:MODEL_VERSION,profile:MODEL_PROFILE,provider:"public-ui-experimental" as const,sourceUrl:`https://en-roads.climateinteractive.org/scenario.html?v=${MODEL_VERSION}`,evaluatedAt:new Date().toISOString(),readback:settings};
    // Synthetic validation fixture, only in this isolated database; never a scientific result.
    await store.saveModelStatus(settings,"complete",result);assert.equal((await store.leaderboard()).length,30);
    await assert.rejects(store.editRecord(players[0].run.id,0,{score:1}),/cannot be edited/);
    const activity=await store.adminActivity(players[0].run.id);assert.equal(activity.events.length,15);assert.ok(activity.events.every(e=>e.at));assert.ok(!JSON.stringify(activity).includes("group_hash"));
    const queuedSettings={...settings,coal:CONTROLS.find(c=>c.id==="coal")!.max};
    await Promise.all([enqueueModel(queuedSettings),enqueueModel(queuedSettings)]);
    const jobs=await Promise.all([claimModel(),claimModel()]);assert.equal(jobs.filter(Boolean).length,1);const job=jobs.find(Boolean)!;
    const queuedResult={...result,readback:queuedSettings};
    assert.equal(await finishModel({...job,lease:"wrong"},queuedResult),false);
    await assert.rejects(finishModel(job,{...queuedResult,modelVersion:"wrong"}),/readback/);
    assert.equal(await finishModel(job,queuedResult),true);assert.equal((await enqueueModel(queuedSettings)).status,"complete");assert.equal(await claimModel(),null);

    const cloudSettings={...settings,oil:CONTROLS.find(c=>c.id==="oil")!.max};
    const overflowSettings={...settings,gas:CONTROLS.find(c=>c.id==="gas")!.max};
    await enqueueModel(cloudSettings);
    assert.equal(await claimModel(8000),null);
    const cloudJob=await claimModel();assert.ok(cloudJob);assert.deepEqual(cloudJob.settings,cloudSettings);
    await enqueueModel(overflowSettings);
    assert.equal(await claimModel(8000),null);
    await admin.query("UPDATE apecs.model_jobs SET updated_at=(statement_timestamp()-interval '10 seconds')::text WHERE status='queued'");
    assert.equal((await enqueueModel(overflowSettings)).status,"queued");
    const laptopJob=await claimModel(8000);assert.ok(laptopJob);assert.deepEqual(laptopJob.settings,overflowSettings);
    assert.equal(await claimModel(),null);

    await admin.query("UPDATE apecs.model_jobs SET lease_until=1 WHERE scenario_key=$1",[cloudJob.key]);
    const recovered=await claimModel(8000);assert.ok(recovered);assert.equal(recovered.key,cloudJob.key);
    assert.notEqual(recovered.lease,cloudJob.lease);
    assert.equal(await finishModel(cloudJob,{...result,readback:cloudSettings}),false);
    assert.equal(await finishModel(recovered,{...result,readback:cloudSettings}),true);
    assert.equal(await finishModel(laptopJob,{...result,readback:overflowSettings}),true);
    assert.equal(await claimModel(),null);

    const permissions=await admin.query("SELECT has_schema_privilege('anon','apecs','USAGE') AS anon,has_schema_privilege('authenticated','apecs','USAGE') AS authenticated,(SELECT count(*)::int FROM pg_tables WHERE schemaname='apecs' AND rowsecurity) AS rls");assert.deepEqual(permissions.rows[0],{anon:false,authenticated:false,rls:10});
    await admin.query("ALTER ROLE apecs_worker PASSWORD 'apecs-worker-test-only'");const workerUrl=new URL(runtime);workerUrl.username="apecs_worker";workerUrl.password="apecs-worker-test-only";
    const worker=new Pool({connectionString:workerUrl.toString(),max:1});try{await worker.query("SELECT * FROM apecs.model_jobs");await assert.rejects(worker.query("SELECT * FROM apecs.runs"),/permission denied/);await assert.rejects(worker.query("UPDATE apecs.browser_passes SET used=0"),/permission denied/);}finally{await worker.end();}
    const runtimePool=new Pool({connectionString:runtime.toString(),max:1});try{await assert.rejects(runtimePool.query("DELETE FROM apecs.model_evaluations"),/permission denied/);await assert.rejects(runtimePool.query("CREATE TABLE apecs.unauthorised(id int)"),/permission denied/);}finally{await runtimePool.end();}
    await store.deleteRecord(first.run.id, 2);
    await assert.rejects(store.getRun(first.run.id, first.token), /not found/);
    await assert.rejects(store.startRun("Concurrent Start", "PK", { token: cookie, requestId }), /permanently deleted/);
    assert.equal(Object.keys(settings).length,CONTROLS.length);timings.sort((a,b)=>a-b);console.log(`Postgres 30 players /420 actions: p95 ${Math.round(timings[Math.floor(timings.length*.95)])}ms; max ${Math.round(timings.at(-1)!)}ms; direct DB, no model jobs.`);
  }finally{
    const global=globalThis as typeof globalThis&{copPostgres?:Map<string,Pool>};for(const connection of global.copPostgres?.values()??[])await connection.end();global.copPostgres?.clear();
    await admin.end();await root.query(`DROP DATABASE ${database}`);await root.end();delete process.env.DATABASE_URL;
  }
});
