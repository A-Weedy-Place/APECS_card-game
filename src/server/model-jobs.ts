import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { GameError } from "@/game/errors";
import type { PolicySettings } from "@/game/policy-catalogue";
import { scenarioKey, validateModelResult, type ModelResult } from "./model-result";
import { getRun, modelSettings, modelStatus, saveModelStatus } from "./persistence";
import { enqueueModel } from "./model-queue";
const runtime=globalThis as typeof globalThis & {copModelQueue?:{active:Set<string>;tail:Promise<void>}};
export function browserModelEnabled(){return process.env.ENROADS_BROWSER_ENABLED==="1"||(process.env.NODE_ENV==="development"&&process.env.ENROADS_BROWSER_ENABLED!=="0");}
/** No user URLs, executable paths, tokens, names or client-supplied temperatures reach the process. */
function evaluate(settings:PolicySettings):Promise<ModelResult>{return new Promise((resolveResult,reject)=>{
 const child=spawn(process.execPath,[resolve(/* turbopackIgnore: true */ "scripts/enroads-browser.mjs")],{cwd:process.cwd(),windowsHide:true,stdio:["pipe","pipe","pipe"],env:{...process.env,ENROADS_BROWSER_CHANNEL:process.env.ENROADS_BROWSER_CHANNEL??"msedge"}});
 let output="",errors="";const timeout=setTimeout(()=>{child.kill();reject(new Error("Model browser timed out."));},180000);
 child.stdout.on("data",chunk=>{output+=chunk.toString();if(output.length>50000){child.kill();reject(new Error("Unexpected model output."));}});
 child.stderr.on("data",chunk=>{errors=(errors+chunk.toString()).slice(-2000);});
 child.on("error",error=>{clearTimeout(timeout);reject(error);});
 child.on("close",code=>{clearTimeout(timeout);if(code!==0){console.error("En-ROADS bridge:",errors);reject(new Error("The experimental simulator connection failed. Your game is saved; retry later."));return;}try{const result=JSON.parse(output);if(!validateModelResult(result,settings))throw new Error("Model controls or version did not match. No temperature was saved.");resolveResult(result);}catch(error){reject(error);}});
 child.stdin.on("error",()=>{});child.stdin.end(JSON.stringify(settings));
});}
export async function requestModel(id:string,token:string){
 const settings=await modelSettings(id,token),run=await getRun(id,token),status=run.modelEvaluation??await modelStatus(settings);
 if(status.status==="complete")return status;
 if(process.env.DATABASE_URL && process.env.MODEL_QUEUE_ENABLED==="1")return enqueueModel(settings);
 if(process.env.VERCEL||!browserModelEnabled())throw new GameError("Temperature evaluation is not configured on this server. Your game is saved; SDK access is pending.",503);
 runtime.copModelQueue??={active:new Set(),tail:Promise.resolve()};const queue=runtime.copModelQueue,key=scenarioKey(settings);
 if(queue.active.has(key))return modelStatus(settings);
 if(queue.active.size>=10)throw new GameError("The simulator queue is full. Retry shortly; your game is saved.",429);
 queue.active.add(key);try{await saveModelStatus(settings,"queued");}catch(error){queue.active.delete(key);throw error;}
 queue.tail=queue.tail.then(async()=>{try{await saveModelStatus(settings,"running");await saveModelStatus(settings,"complete",await evaluate(settings));}catch(error){await saveModelStatus(settings,"failed",undefined,error instanceof Error?error.message:"Model evaluation failed.");}finally{queue.active.delete(key);}});
 return modelStatus(settings);
}
