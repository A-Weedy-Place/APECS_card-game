import { randomBytes } from "node:crypto";
import { LEGACY_MODEL_PROFILE, MODEL_PROFILE, MODEL_VERSION, validSettings, type PolicySettings } from "@/game/policy-catalogue";
import { scenarioKey, validateModelResult, type ModelResult } from "./model-result";
import { evaluationFromRow, type EvaluationRow } from "./evaluation";
import { transaction } from "./postgres";
import { GameError } from "@/game/errors";
type Job={scenario_key:string;settings:string;status:string;attempts:number;lease_until:number|null;now_ms:string};
const databaseClock = "floor(extract(epoch FROM statement_timestamp()) * 1000)::bigint";
const databaseUtc = `to_char(statement_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;
export async function enqueueModel(settings:PolicySettings){
 const key=scenarioKey(settings);
 return transaction(async db=>{
  await db.query(`INSERT INTO apecs.model_jobs(scenario_key,settings,status,created_at,updated_at) VALUES ($1,$2,'queued',${databaseUtc},${databaseUtc}) ON CONFLICT DO NOTHING`,[key,JSON.stringify(settings)]);
  const job=(await db.query<Job>(`SELECT *,${databaseClock} AS now_ms FROM apecs.model_jobs WHERE scenario_key=$1 FOR UPDATE`,[key])).rows[0];
  const result=await db.query<EvaluationRow>("SELECT * FROM apecs.model_evaluations WHERE scenario_key=$1",[key]);
  const cached=evaluationFromRow(result.rows[0],settings);if(cached.status==="complete")return cached;
  if(job.status==="queued"&&cached.status==="queued")return cached;
  const milliseconds=Number(job.now_ms);
  if(job.status==="running"&&Number(job.lease_until)>milliseconds)return {status:"running" as const};
  const now=new Date(milliseconds).toISOString();
  await db.query("UPDATE apecs.model_jobs SET status='queued',lease_token=NULL,lease_until=NULL,updated_at=$2 WHERE scenario_key=$1",[key,now]);
  await db.query("INSERT INTO apecs.model_evaluations VALUES ($1,'queued',NULL,NULL,$2) ON CONFLICT(scenario_key) DO UPDATE SET status='queued',result=NULL,error=NULL,updated_at=excluded.updated_at",[key,now]);
  return {status:"queued" as const};
 });
}
export async function claimModel(minimumQueueAgeMs=0){
 return transaction(async db=>{
  const job=(await db.query<Job>(`SELECT *,${databaseClock} AS now_ms FROM apecs.model_jobs
    WHERE (status='queued' AND ($1::integer=0 OR updated_at::timestamptz <= statement_timestamp() - $1 * interval '1 millisecond'))
       OR (status='running' AND lease_until<${databaseClock})
    ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED`,[minimumQueueAgeMs])).rows[0];
  if(!job)return null;
  const now=Number(job.now_ms),date=new Date(now).toISOString();
  const settings=JSON.parse(job.settings) as PolicySettings;
  if(!validSettings(settings))throw new Error("Invalid queued model package.");
  if(scenarioKey(settings)!==job.scenario_key){
    if(scenarioKey(settings,LEGACY_MODEL_PROFILE)!==job.scenario_key)throw new Error("Invalid queued model package.");
    await db.query("UPDATE apecs.model_jobs SET status='failed',lease_token=NULL,lease_until=NULL,updated_at=$2 WHERE scenario_key=$1",[job.scenario_key,date]);
    await db.query("UPDATE apecs.model_evaluations SET status='failed',error='The simulator was updated. Retry calculation.',updated_at=$2 WHERE scenario_key=$1",[job.scenario_key,date]);
    return null;
  }
  const lease=randomBytes(24).toString("hex");
  await db.query("UPDATE apecs.model_jobs SET status='running',attempts=attempts+1,lease_token=$2,lease_until=$3,updated_at=$4 WHERE scenario_key=$1",[job.scenario_key,lease,now+240000,date]);
  await db.query("UPDATE apecs.model_evaluations SET status='running',error=NULL,updated_at=$2 WHERE scenario_key=$1",[job.scenario_key,date]);
  return {key:job.scenario_key,settings,lease,modelVersion:MODEL_VERSION,profile:MODEL_PROFILE};
 });
}
export async function finishModel(job:{key:string;settings:PolicySettings;lease:string},result?:ModelResult,error?:string){
 if(result&&!validateModelResult(result,job.settings))throw new GameError("Model readback did not match the complete queued scenario.");
 return transaction(async db=>{
  const locked=await db.query<{now_ms:string}>(`SELECT ${databaseClock} AS now_ms FROM apecs.model_jobs WHERE scenario_key=$1 AND lease_token=$2 AND status='running' AND lease_until>${databaseClock} FOR UPDATE`,[job.key,job.lease]);
  if(!locked.rowCount)return false;
  const status=result?"complete":"failed",now=new Date(Number(locked.rows[0].now_ms)).toISOString();
  await db.query("UPDATE apecs.model_evaluations SET status=$2,result=$3,error=$4,updated_at=$5 WHERE scenario_key=$1",[job.key,status,result?JSON.stringify(result):null,error?.slice(0,400)??null,now]);
  await db.query("UPDATE apecs.model_jobs SET status=$2,lease_token=NULL,lease_until=NULL,updated_at=$3 WHERE scenario_key=$1",[job.key,status,now]);return true;
 });
}
