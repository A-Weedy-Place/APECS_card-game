/** Opt-in live smoke/load test. Creates and cleans ONLY its own generated records. */
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { Pool } from "pg";
import { SUPABASE_CA } from "../src/server/supabase-ca";
import type { PublicRun } from "../src/game/types";
async function main(){
process.loadEnvFile(".env.deploy.local");
const base=process.argv[2];if(!base||!/^https:\/\/[^/]+\.vercel\.app$/.test(base))throw new Error("Supply the verified deployment HTTPS origin.");
let password="";for await(const chunk of process.stdin)password+=chunk;password=password.replace(/\r?\n$/,"");
if(!password)throw new Error("Admin password required on stdin.");
const prefix=`Test ${randomBytes(3).toString("hex")} `,ids:string[]=[],groups:string[]=[],times:number[]=[];
async function request(path:string,body?:unknown,token?:string,cookie?:string){
 const before=performance.now();const response=await fetch(base+path,{method:body===undefined?"GET":"POST",headers:{...(body===undefined?{}:{"Content-Type":"application/json"}),...(token?{Authorization:`Bearer ${token}`}:{ }),...(cookie?{Cookie:`cop-player=${cookie}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const json=await response.json();if(!response.ok)throw new Error(`${path}: ${response.status} ${json.error}`);return {json,ms:performance.now()-before};
}
try{
 const login=await request("/api/admin/login",{password}),adminToken=login.json.token as string;password="";
 const starts=await Promise.allSettled(Array.from({length:30},async(_,i)=>{
  const cookie=randomBytes(32).toString("hex");groups.push(createHash("sha256").update(cookie).digest("hex"));
  const result=await request("/api/runs",{nickname:prefix+i,country:"AQ",consent:true,requestId:randomUUID()},undefined,cookie);ids.push(result.json.run.id);return {run:result.json.run as PublicRun,token:result.json.token as string,cookie};
 }));
 const failed=starts.find(result=>result.status==="rejected");if(failed?.status==="rejected")throw failed.reason;
 const players=starts.map(result=>{if(result.status!=="fulfilled")throw new Error("Start failed.");return result.value;});
 for(let round=0;round<players[0].run.totalRounds!;round++){const outcomes=await Promise.allSettled(players.map(async player=>{
  let budget=player.run.resources.credits;const factors=new Set<string>();
  const cards=player.run.offers.filter(card=>{const factor=(card as typeof card&{factor?:string}).factor;if(card.cost>budget||factor&&factors.has(factor))return false;if(factor)factors.add(factor);budget-=card.cost;return true;}).map(card=>card.id);
  const action={...(cards.length?{cardIds:cards}:{cardId:"save"}),revision:player.run.revision,requestId:randomUUID()};
  const result=await request(`/api/runs/${player.run.id}/actions`,action,player.token);player.run=result.json;times.push(result.ms);
  if(player.run.round!==round+1||player.run.score!==null||JSON.stringify(player.run).includes('"seed":'))throw new Error("Authoritative game state mismatch.");
  if(round===0&&player===players[0]){const retry=await request(`/api/runs/${player.run.id}/actions`,action,player.token);if(JSON.stringify(retry.json)!==JSON.stringify(result.json))throw new Error("Idempotency mismatch.");}
 }));const failure=outcomes.find(result=>result.status==="rejected");if(failure?.status==="rejected")throw failure.reason;}
 const player=players[0];if(!players.every(p=>p.run.finishedAt))throw new Error("A game did not finish.");
 const board=await request("/api/leaderboard");if(board.json.entries.some((entry:{id:string})=>ids.includes(entry.id)))throw new Error("Pending result ranked.");
 await request("/api/admin",{action:"reset-plays",id:player.run.id},adminToken);
 const attempts=await request("/api/attempts",undefined,undefined,player.cookie);if(attempts.json.remaining!==2)throw new Error("Player reset failed.");
 const activity=await request(`/api/admin?id=${player.run.id}&activity=1`,undefined,adminToken);if(activity.json.events.length!==11||activity.json.audit[0]?.action!=="reset-player-plays")throw new Error("Admin activity/audit mismatch.");
 const unauthorised=await fetch(base+"/api/admin");if(unauthorised.status!==401)throw new Error("Admin endpoint is not protected.");
 times.sort((a,b)=>a-b);console.log(JSON.stringify({players:30,actions:times.length,p50Ms:Math.round(times[Math.floor(times.length*.5)]),p95Ms:Math.round(times[Math.floor(times.length*.95)]),maxMs:Math.round(times.at(-1)!),errors:0,modelJobs:0,adminReset:"passed",activity:"passed",idempotency:"passed"}));
}finally{
 if(ids.length){
  const url=new URL(process.env.DATABASE_URL!);url.username="postgres.shdiharlumvykiaeaddt";url.password=process.env.PROVISION_DB_PASSWORD!;url.search="";
  const connection=new Pool({connectionString:url.toString(),ssl:{ca:SUPABASE_CA,rejectUnauthorized:true},max:1,connectionTimeoutMillis:15000});
  try{
   await connection.query("BEGIN");const found=await connection.query("SELECT id,state FROM apecs.runs WHERE id=ANY($1::text[]) FOR UPDATE",[ids]);
   if(found.rows.length!==ids.length||found.rows.some(row=>!JSON.parse(row.state).nickname.startsWith(prefix)))throw new Error("Cleanup refused: generated record identity mismatch.");
   const linked=await connection.query("SELECT group_hash FROM apecs.run_attempts WHERE run_id=ANY($1::text[])",[ids]);if(linked.rows.some(row=>!groups.includes(row.group_hash)))throw new Error("Cleanup refused: browser identity mismatch.");
   for(const table of ["actions","run_controls","admin_audit","run_attempts"])await connection.query(`DELETE FROM apecs.${table} WHERE run_id=ANY($1::text[])`,[ids]);
   await connection.query("DELETE FROM apecs.runs WHERE id=ANY($1::text[])",[ids]);
   await connection.query("DELETE FROM apecs.browser_passes p WHERE group_hash=ANY($1::text[]) AND NOT EXISTS(SELECT 1 FROM apecs.run_attempts a WHERE a.group_hash=p.group_hash)",[groups]);
   await connection.query("COMMIT");console.log(`Cleaned ${ids.length} generated test games; attendee records untouched.`);
  }catch(error){await connection.query("ROLLBACK");throw error;}finally{await connection.end();}
 }
}
}
main().catch(error=>{console.error(error instanceof Error?error.message:"Deployment test failed.");process.exitCode=1;});
