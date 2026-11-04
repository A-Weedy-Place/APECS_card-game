import { randomBytes } from "node:crypto";
import { MODEL_PROFILE, MODEL_VERSION, validSettings, type PolicySettings } from "@/game/policy-catalogue";
import { scenarioKey, validateModelResult, type ModelResult } from "./model-result";
import { evaluationFromRow, type EvaluationRow } from "./evaluation";
import { transaction } from "./postgres";
import { GameError } from "@/game/errors";
type Job={scenario_key:string;settings:string;status:string;attempts:number;lease_until:number|null};
export async function enqueueModel(settings:PolicySettings){
 const key=scenarioKey(settings),now=new Date().toISOString();
 return transaction(async db=>{
  await db.query("INSERT INTO apecs.model_jobs(scenario_key,settings,status,created_at,updated_at) VALUES ($1,$2,'queued',$3,$3) ON CONFLICT DO NOTHING",[key,JSON.stringify(settings),now]);
  const job=(await db.query<Job>("SELECT * FROM apecs.model_jobs WHERE scenario_key=$1 FOR UPDATE",[key])).rows[0];
  const result=await db.query<EvaluationRow>("SELECT * FROM apecs.model_evaluations WHERE scenario_key=$1",[key]);
  const cached=evaluationFromRow(result.rows[0],settings);if(cached.status==="complete")return cached;
  if(job.status==="running"&&Number(job.lease_until)>Date.now())return {status:"running" as const};
  await db.query("UPDATE apecs.model_jobs SET status='queued',lease_token=NULL,lease_until=NULL,updated_at=$2 WHERE scenario_key=$1",[key,now]);
  await db.query("INSERT INTO apecs.model_evaluations VALUES ($1,'queued',NULL,NULL,$2) ON CONFLICT(scenario_key) DO UPDATE SET status='queued',result=NULL,error=NULL,updated_at=excluded.updated_at",[key,now]);
  return {status:"queued" as const};
 });
}
export async function claimModel(){
 return transaction(async db=>{
  const now=Date.now(),date=new Date(now).toISOString();
  const job=(await db.query<Job>("SELECT * FROM apecs.model_jobs WHERE (status='queued' OR (status='running' AND lease_until<$1)) ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED",[now])).rows[0];
  if(!job)return null;
  const settings=JSON.parse(job.settings) as PolicySettings;
  if(!validSettings(settings)||scenarioKey(settings)!==job.scenario_key)throw new Error("Invalid queued model package.");
  const lease=randomBytes(24).toString("hex");
  await db.query("UPDATE apecs.model_jobs SET status='running',attempts=attempts+1,lease_token=$2,lease_until=$3,updated_at=$4 WHERE scenario_key=$1",[job.scenario_key,lease,now+240000,date]);
  await db.query("UPDATE apecs.model_evaluations SET status='running',error=NULL,updated_at=$2 WHERE scenario_key=$1",[job.scenario_key,date]);
  return {key:job.scenario_key,settings,lease,modelVersion:MODEL_VERSION,profile:MODEL_PROFILE};
 });
}
export async function finishModel(job:{key:string;settings:PolicySettings;lease:string},result?:ModelResult,error?:string){
 if(result&&!validateModelResult(result,job.settings))throw new GameError("Model readback did not match the complete queued scenario.");
 return transaction(async db=>{
  const locked=await db.query("SELECT scenario_key FROM apecs.model_jobs WHERE scenario_key=$1 AND lease_token=$2 AND status='running' AND lease_until>$3 FOR UPDATE",[job.key,job.lease,Date.now()]);
  if(!locked.rowCount)return false;
  const status=result?"complete":"failed",now=new Date().toISOString();
  await db.query("UPDATE apecs.model_evaluations SET status=$2,result=$3,error=$4,updated_at=$5 WHERE scenario_key=$1",[job.key,status,result?JSON.stringify(result):null,error?.slice(0,400)??null,now]);
  await db.query("UPDATE apecs.model_jobs SET status=$2,lease_token=NULL,lease_until=NULL,updated_at=$3 WHERE scenario_key=$1",[job.key,status,now]);return true;
 });
}
