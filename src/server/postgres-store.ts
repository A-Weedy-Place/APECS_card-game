import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import type { PoolClient } from "pg";
import { createRun, GameError, publicRun, redactPublicRun, takeAction, takeCardBatch, takeSpecialAction } from "@/game/engine";
import type { AdminActivity, AdminData, AdminRecord, AttemptStatus, LeaderboardEntry, PublicRun, RunState, SpecialCommand } from "@/game/types";
import { RULES_VERSION } from "@/game/config";
import { settingsFor } from "@/game/catalogues";
import { orderLeaderboard } from "@/game/ranking";
import { V11_VERSION, stagedRules } from "@/game/v11-schedule";
import { scenarioKey, validateModelResult, type ModelResult } from "./model-result";
import { evaluationFromRow, type EvaluationRow } from "./evaluation";
import { LEGACY_MODEL_PROFILE } from "@/game/policy-catalogue";
import { pool, transaction } from "./postgres";
import { assertPlayerNameAvailable, cleanPlayerName, playerNameKey, playerNameLock, type NameRecord } from "./player-name";
const hash=(value:string)=>createHash("sha256").update(value).digest("hex");
export const PLAY_LIMIT=2;
type DB=Pick<PoolClient,"query">;
type Row={id:string;token_hash:string;state:string;hidden:number;finished_at:string|null;created_at:string;display_name?:string|null;country?:string|null;score_override?:number|null;deleted?:number;control_revision?:number;manual_rank?:number|null;plays_used?:number|null};
type Update={nickname?:string;country?:string;score?:number|null;manualRank?:number|null;hidden?:boolean;deleted?:boolean};
async function rows<T>(sql:string,args:unknown[]=[],db:DB=pool()):Promise<T[]>{return (await db.query(sql,args)).rows as T[];}
async function one<T>(sql:string,args:unknown[]=[],db:DB=pool()){return (await rows<T>(sql,args,db))[0];}
async function checkPlayerName(name:string,db:DB,exceptId?:string){
  // Transaction-scoped locks also work through the transaction pooler. Different names do not block each other.
  await db.query("SELECT pg_advisory_xact_lock($1::bigint)",[playerNameLock(name)]);
  const records=await rows<NameRecord>("SELECT r.id,r.state::jsonb->>'nickname' AS original_name,c.display_name FROM apecs.runs r LEFT JOIN apecs.run_controls c ON c.run_id=r.id",[],db);
  assertPlayerNameAvailable(name,records,exceptId);
}
async function ownedRun(id:string,token:string,db:DB=pool(),lock=false){
  const row=await one<Row>(`SELECT r.*,c.deleted FROM apecs.runs r LEFT JOIN apecs.run_controls c ON c.run_id=r.id WHERE r.id=$1${lock?" FOR UPDATE OF r":""}`,[id],db);
  if(!row||!token||!timingSafeEqual(Buffer.from(row.token_hash),Buffer.from(hash(token))))throw new GameError("Run not found or session key invalid.",401);
  if(row.deleted)throw new GameError("This game was removed by the organiser.",410);
  return row;
}
async function visibleRun(state:RunState|PublicRun,db:DB=pool()):Promise<PublicRun>{
  const control=await one<{display_name:string|null;country:string|null;score_override:number|null;deleted:number}>("SELECT * FROM apecs.run_controls WHERE run_id=$1",[state.id],db);
  if(control?.deleted)throw new GameError("This game was removed by the organiser.",410);
  const visible="phase" in state?redactPublicRun(state as PublicRun):publicRun(state as RunState);
  const evaluation=modelRules(visible.rulesVersion)&&visible.finishedAt?await modelStatus(settingsFor(visible.history),!stagedRules(visible.rulesVersion),db):undefined;
  return {...visible,nickname:control?.display_name??visible.nickname,country:control?.country??visible.country,score:modelRules(visible.rulesVersion)?null:visible.finishedAt?control?.score_override??visible.score:visible.score,
    ...(evaluation?{modelEvaluation:evaluation,...(evaluation.status==="complete"?{projection:{...visible.projection,kind:"model" as const,model:"En-ROADS",version:evaluation.modelVersion!,temperatureC:evaluation.temperatureC,caveat:"Experimental public-UI evaluation of the full scenario. Conditional projection, not a prediction or vendor endorsement."}}:{})}:{})};
}
export async function attemptStatus(token?:string,db:DB=pool()):Promise<AttemptStatus>{const used=token?(await one<{used:number}>("SELECT used FROM apecs.browser_passes WHERE group_hash=$1",[hash(token)],db))?.used??0:0;return {used,remaining:Math.max(0,PLAY_LIMIT-used),limit:PLAY_LIMIT};}
export async function startRun(nickname:string,country:string,browser?:{token:string;requestId:string}){
  return transaction(async db=>{
    let token=randomBytes(32).toString("hex");
    if(browser){
      const group=hash(browser.token);
      await db.query("INSERT INTO apecs.browser_passes(group_hash,used) VALUES ($1,0) ON CONFLICT DO NOTHING",[group]);
      await db.query("SELECT used FROM apecs.browser_passes WHERE group_hash=$1 FOR UPDATE",[group]);
      token=createHmac("sha256",browser.token).update(browser.requestId).digest("hex");
      const previous=await one<{run_id:string|null}>("SELECT run_id FROM apecs.run_attempts WHERE group_hash=$1 AND request_id=$2",[group,browser.requestId],db);
      if (previous) {
        if (previous.run_id === null) throw new GameError("This game was permanently deleted.", 410);
        return { run: await visibleRun(JSON.parse((await ownedRun(previous.run_id, token, db)).state), db), token };
      }
      if(!(await attemptStatus(browser.token,db)).remaining)throw new GameError("Both plays are used. You can still view your history and the leaderboard.",403);
    }
    nickname=cleanPlayerName(nickname);
    await checkPlayerName(nickname,db);
    const id=randomUUID(),state=createRun(id,nickname,country,randomBytes(4).readUInt32LE());
    await db.query("INSERT INTO apecs.runs(id,token_hash,state,created_at) VALUES ($1,$2,$3,$4)",[id,hash(token),JSON.stringify(state),state.startedAt]);
    if(browser){const group=hash(browser.token);await db.query("UPDATE apecs.browser_passes SET used=used+1 WHERE group_hash=$1",[group]);await db.query("INSERT INTO apecs.run_attempts VALUES ($1,$2,$3)",[group,browser.requestId,id]);}
    return {run:publicRun(state),token};
  });
}
export async function getRun(id:string,token:string){return visibleRun(JSON.parse((await ownedRun(id,token)).state));}
export async function actOnRun(id:string,token:string,cardId:string|string[]|SpecialCommand,revision:number,requestId:string){
  return transaction(async db=>{
    const row=await ownedRun(id,token,db,true);
    const previous=await one<{response:string}>("SELECT response FROM apecs.actions WHERE run_id=$1 AND request_id=$2",[id,requestId],db);
    if(previous)return visibleRun(JSON.parse(previous.response),db);
    const current=JSON.parse(row.state) as RunState;
    if(current.revision!==revision)throw new GameError("The board changed. Refresh to continue from the latest turn.",409);
    const next=Array.isArray(cardId)?takeCardBatch(current,cardId):typeof cardId==="string"?takeAction(current,cardId):takeSpecialAction(current,cardId);
    await db.query("UPDATE apecs.runs SET state=$1,score=$2,finished_at=$3 WHERE id=$4",[JSON.stringify(next),next.score,next.finishedAt,id]);
    const visible=await visibleRun(next,db);
    await db.query("INSERT INTO apecs.actions(run_id,request_id,response,created_at) VALUES ($1,$2,$3,$4)",[id,requestId,JSON.stringify(visible),new Date().toISOString()]);
    return visible;
  });
}
export async function leaderboard(includeHidden=false):Promise<LeaderboardEntry[]>{
  const found=await rows<Row>(`SELECT r.*,c.display_name,c.country,c.score_override,c.manual_rank FROM apecs.runs r LEFT JOIN apecs.run_controls c ON c.run_id=r.id WHERE r.finished_at IS NOT NULL AND COALESCE(c.deleted,0)=0 ${includeHidden?"AND r.score IS NOT NULL":"AND r.hidden=0 AND r.state::jsonb->>'rulesVersion' IN ($1,$2)"}`,includeHidden?[]:[RULES_VERSION,V11_VERSION]);
  if(includeHidden)return found.map(row=>{const s=JSON.parse(row.state) as RunState;return {id:row.id,nickname:row.display_name??s.nickname,country:row.country??s.country,score:row.score_override??s.score!,finishedAt:s.finishedAt!,rulesVersion:s.rulesVersion,hidden:!!row.hidden};}).sort((a,b)=>b.score-a.score).slice(0,100);
  const states=found.map(row=>JSON.parse(row.state) as RunState),keys=states.map(s=>scenarioKey(settingsFor(s.history)));
  const cache=keys.length?await rows<EvaluationRow&{scenario_key:string}>("SELECT * FROM apecs.model_evaluations WHERE scenario_key=ANY($1::text[])",[keys]):[];
  const byKey=new Map(cache.map(row=>[row.scenario_key,row]));
  const entries = found.flatMap((row, index) => {
    const state = states[index];
    const evaluation = evaluationFromRow(byKey.get(keys[index]), settingsFor(state.history));
    if (evaluation.status !== "complete") return [];
    return [{ id: row.id, nickname: row.display_name ?? state.nickname, country: row.country ?? state.country,
      score: evaluation.temperatureC!, temperatureC: evaluation.temperatureC!, elapsedMs: state.elapsedMs ?? 0,
      finishedAt: state.finishedAt!, rulesVersion: state.rulesVersion, manualRank: row.manual_rank ?? undefined }];
  });
  return orderLeaderboard(entries).slice(0, 100);
}
export async function stats():Promise<AdminData["stats"]>{return (await one<AdminData["stats"]>("SELECT COUNT(*)::int AS runs,COUNT(finished_at)::int AS completed,COALESCE(SUM(hidden),0)::int AS hidden,(SELECT COUNT(*)::int FROM apecs.run_controls WHERE deleted=1) AS deleted FROM apecs.runs"))!;}
export async function displayUrl(){return (await one<{value:string}>("SELECT value FROM apecs.event_settings WHERE key='join-url'"))?.value??"";}
export async function setDisplayUrl(value:string){await pool().query("INSERT INTO apecs.event_settings VALUES ('join-url',$1) ON CONFLICT(key) DO UPDATE SET value=excluded.value",[value]);}
export async function adminRecords(page=1,query=""):Promise<AdminData>{
  const where=query?"WHERE position(lower($1) in lower(COALESCE(c.display_name,r.state::jsonb->>'nickname')))>0 OR r.id=$1":"",args=query?[query]:[];
  const total=(await one<{n:number}>(`SELECT COUNT(*)::int AS n FROM apecs.runs r LEFT JOIN apecs.run_controls c ON c.run_id=r.id ${where}`,args))!.n;
  const pages=Math.max(1,Math.ceil(total/30));page=Math.max(1,Math.min(pages,Math.floor(page)));
  const found = await rows<Row>(`SELECT r.*, c.display_name, c.country, c.score_override, c.manual_rank, p.used AS plays_used,
    COALESCE(c.deleted,0) AS deleted, COALESCE(c.revision,0) AS control_revision
    FROM apecs.runs r LEFT JOIN apecs.run_controls c ON c.run_id=r.id
    LEFT JOIN apecs.run_attempts a ON a.run_id=r.id LEFT JOIN apecs.browser_passes p ON p.group_hash=a.group_hash
    ${where} ORDER BY r.created_at DESC,r.id LIMIT 30 OFFSET $${args.length+1}`, [...args, (page-1)*30]);
  const records: AdminRecord[] = await Promise.all(found.map(async row => {
    const state = JSON.parse(row.state) as RunState;
    const model = modelRules(state.rulesVersion) && state.finishedAt ? await modelStatus(settingsFor(state.history), !stagedRules(state.rulesVersion)) : null;
    return { id: row.id, nickname: row.display_name ?? state.nickname, country: row.country ?? state.country,
      score: row.score_override ?? state.score, originalScore: state.score, hidden: !!row.hidden, deleted: !!row.deleted,
      finishedAt: state.finishedAt, startedAt: state.startedAt, round: state.round, rulesVersion: state.rulesVersion,
      revision: row.control_revision ?? 0, elapsedMs: state.elapsedMs, manualRank: row.manual_rank ?? undefined,
      playsUsed: row.plays_used ?? undefined, temperatureC: model?.status === "complete" ? model.temperatureC : undefined };
  }));
  return {records,total,page,pages,stats:await stats(),entries:await leaderboard(true)};
}
export async function adminRun(id:string){const row=await one<{state:string}>("SELECT state FROM apecs.runs WHERE id=$1",[id]);if(!row)throw new GameError("Game not found.",404);const s=JSON.parse(row.state) as RunState;return {...publicRun(s),...(modelRules(s.rulesVersion)&&s.finishedAt?{modelEvaluation:await modelStatus(settingsFor(s.history),!stagedRules(s.rulesVersion))}:{})};}
export async function adminActivity(id:string):Promise<AdminActivity>{
  const run=await adminRun(id);
  const group=await one<{group_hash:string;used:number}>("SELECT a.group_hash,p.used FROM apecs.run_attempts a JOIN apecs.browser_passes p ON p.group_hash=a.group_hash WHERE a.run_id=$1 LIMIT 1",[id]);
  const games=group?await rows<{id:string;state:string}>("SELECT r.id,r.state FROM apecs.runs r JOIN apecs.run_attempts a ON a.run_id=r.id WHERE a.group_hash=$1 ORDER BY r.created_at DESC",[group.group_hash]):[];
  const events=(await rows<{request_id:string;response:string;created_at:string|null}>("SELECT request_id,response,created_at FROM apecs.actions WHERE run_id=$1 ORDER BY created_at NULLS FIRST,request_id",[id])).map(row=>{const response=JSON.parse(row.response) as PublicRun;return {id:row.request_id,kind:"action",at:row.created_at,summary:response.lastActions?.map(a=>a.title).join(" · ")||`Round ${response.round+1}`};});
  const audit=(await rows<{id:string;action:string;changes:string;created_at:string}>("SELECT * FROM apecs.admin_audit WHERE run_id=$1 ORDER BY created_at DESC",[id])).map(row=>({id:row.id,action:row.action,createdAt:row.created_at,changes:JSON.parse(row.changes)}));
  return {attempts:group?{used:group.used,remaining:Math.max(0,PLAY_LIMIT-group.used),limit:PLAY_LIMIT}:null,games:games.map(row=>{const s=JSON.parse(row.state) as RunState;return {id:row.id,nickname:s.nickname,startedAt:s.startedAt,finishedAt:s.finishedAt};}),events:[{id:"start",kind:"start",at:run.startedAt,summary:"Game started"},...events],audit};
}
export async function resetAttempts(token:string){return transaction(async db=>{await db.query("UPDATE apecs.browser_passes SET used=0 WHERE group_hash=$1",[hash(token)]);await db.query("INSERT INTO apecs.admin_audit VALUES ($1,NULL,$2,$3,$4)",[randomUUID(),"reset-browser-plays","{}",new Date().toISOString()]);return attemptStatus(token,db);});}
export async function resetPlayerAttempts(id:string){return transaction(async db=>{
  if (!await one("SELECT id FROM apecs.runs WHERE id=$1 FOR UPDATE", [id], db)) throw new GameError("No browser allowance is linked to this game.", 404);
  const row=await one<{group_hash:string;used:number}>("SELECT a.group_hash,p.used FROM apecs.run_attempts a JOIN apecs.browser_passes p ON p.group_hash=a.group_hash WHERE a.run_id=$1 LIMIT 1 FOR UPDATE OF p",[id],db);
  if(!row)throw new GameError("No browser allowance is linked to this game.",404);
  await db.query("UPDATE apecs.browser_passes SET used=0 WHERE group_hash=$1",[row.group_hash]);
  await db.query("INSERT INTO apecs.admin_audit VALUES ($1,$2,$3,$4,$5)",[randomUUID(),id,"reset-player-plays",JSON.stringify({usedBefore:row.used,usedAfter:0}),new Date().toISOString()]);return {used:0,remaining:PLAY_LIMIT,limit:PLAY_LIMIT};
});}
export async function editRecord(id:string,expectedRevision:number,update:Update){return transaction(async db=>{
  const row=await one<Row>("SELECT * FROM apecs.runs WHERE id=$1 FOR UPDATE",[id],db);if(!row)throw new GameError("Game not found.",404);
  const previous=await one<{display_name:string|null;country:string|null;score_override:number|null;deleted:number;revision:number;manual_rank:number|null}>("SELECT * FROM apecs.run_controls WHERE run_id=$1",[id],db);
  if((previous?.revision??0)!==expectedRevision)throw new GameError("Record changed. Refresh before editing.",409);
  const s=JSON.parse(row.state) as RunState;
  if(update.nickname!==undefined){update={...update,nickname:cleanPlayerName(update.nickname)};if(playerNameKey(update.nickname!)!==playerNameKey(previous?.display_name??s.nickname))await checkPlayerName(update.nickname!,db,id);}
  if(modelRules(s.rulesVersion)&&update.score!==undefined)throw new GameError("Model temperatures cannot be edited as game points.");
  if(update.score!==undefined&&(!s.finishedAt||update.score!==null&&(!Number.isInteger(update.score)||update.score<0||update.score>1000)))throw new GameError("Only completed games accept a score correction from 0 to 1000.");
  if (update.manualRank != null && (!stagedRules(s.rulesVersion) || !s.finishedAt || (await modelStatus(settingsFor(s.history), false, db)).status !== "complete")) {
    throw new GameError("Only a verified leaderboard result can be placed manually.");
  }
  const next={display_name:update.nickname??previous?.display_name??null,country:update.country??previous?.country??null,score_override:update.score===undefined?previous?.score_override??null:update.score,deleted:update.deleted===undefined?previous?.deleted??0:Number(update.deleted),revision:expectedRevision+1,manual_rank:update.manualRank===undefined?previous?.manual_rank??null:update.manualRank};
  await db.query(`INSERT INTO apecs.run_controls(run_id,display_name,country,score_override,deleted,revision,manual_rank) VALUES ($1,$2,$3,$4,$5,$6,$7)
    ON CONFLICT(run_id) DO UPDATE SET display_name=excluded.display_name,country=excluded.country,score_override=excluded.score_override,
    deleted=excluded.deleted,revision=excluded.revision,manual_rank=excluded.manual_rank`,[id,next.display_name,next.country,next.score_override,next.deleted,next.revision,next.manual_rank]);
  if(update.hidden!==undefined)await db.query("UPDATE apecs.runs SET hidden=$1 WHERE id=$2",[Number(update.hidden),id]);
  await db.query("INSERT INTO apecs.admin_audit VALUES ($1,$2,$3,$4,$5)",[randomUUID(),id,update.deleted?"trash":update.deleted===false?"restore":"edit",JSON.stringify({before:{...previous,hidden:!!row.hidden},after:{...next,hidden:update.hidden??!!row.hidden}}),new Date().toISOString()]);
});}
export async function deleteRecord(id: string, expectedRevision: number) {
  return transaction(async db => {
    if (!await one("SELECT id FROM apecs.runs WHERE id=$1 FOR UPDATE", [id], db)) return;
    const control = await one<{ revision: number }>("SELECT revision FROM apecs.run_controls WHERE run_id=$1", [id], db);
    if ((control?.revision ?? 0) !== expectedRevision) throw new GameError("Record changed. Refresh before deleting.", 409);
    await db.query("DELETE FROM apecs.runs WHERE id=$1", [id]);
  });
}
export async function moderate(id:string,hidden:boolean){const row=await one<{revision:number}>("SELECT COALESCE(c.revision,0) AS revision FROM apecs.runs r LEFT JOIN apecs.run_controls c ON c.run_id=r.id WHERE r.id=$1 AND r.finished_at IS NOT NULL",[id]);if(!row)throw new GameError("Completed run not found.",404);await editRecord(id,row.revision,{hidden});}
export async function modelSettings(id:string,token:string){const s=JSON.parse((await ownedRun(id,token)).state) as RunState;if(!modelRules(s.rulesVersion)||!s.finishedAt)throw new GameError("Finish a new game before evaluating its scenario.",409);return settingsFor(s.history);}
export async function modelStatus(settings:Record<string,number>,allowLegacy=false,db:DB=pool()){
  const current=evaluationFromRow(await one<EvaluationRow>("SELECT * FROM apecs.model_evaluations WHERE scenario_key=$1",[scenarioKey(settings)],db),settings);
  if(allowLegacy){
    const row=await one<EvaluationRow>("SELECT * FROM apecs.model_evaluations WHERE scenario_key=$1",[scenarioKey(settings,LEGACY_MODEL_PROFILE)],db);
    const legacy=evaluationFromRow(row,settings,LEGACY_MODEL_PROFILE);
    if(legacy.status==="complete")return legacy;
  }
  return current;
}
export async function saveModelStatus(settings:Record<string,number>,status:"queued"|"running"|"failed"|"complete",result?:ModelResult,error?:string){if(status==="complete"&&!validateModelResult(result,settings))throw new GameError("Invalid model readback.");await pool().query("INSERT INTO apecs.model_evaluations VALUES ($1,$2,$3,$4,$5) ON CONFLICT(scenario_key) DO UPDATE SET status=excluded.status,result=excluded.result,error=excluded.error,updated_at=excluded.updated_at",[scenarioKey(settings),status,result?JSON.stringify(result):null,error??null,new Date().toISOString()]);}
export async function rateLimit(key:string,maximum=30,windowMs=60000){const now=Date.now();const row=await one<{count:number}>("INSERT INTO apecs.rate_limits VALUES ($1,1,$2) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limits.until_ms<=$3 THEN 1 ELSE rate_limits.count+1 END,until_ms=CASE WHEN rate_limits.until_ms<=$3 THEN excluded.until_ms ELSE rate_limits.until_ms END RETURNING count",[hash(key),now+windowMs,now]);if(row!.count>maximum)throw new GameError("Too many requests. Please wait and try again.",429);}
import { modelRules } from "@/game/model-rules";
