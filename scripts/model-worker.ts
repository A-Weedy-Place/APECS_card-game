/** Outbound-only experimental worker. Exposes no Codex, browser or laptop port. */
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { claimModel,finishModel } from "../src/server/model-queue";
import { validateModelResult, type ModelResult } from "../src/server/model-result";
import type { PolicySettings } from "../src/game/policy-catalogue";
process.loadEnvFile(".env.worker.local");
let stopping=false;process.on("SIGINT",()=>{stopping=true;});process.on("SIGTERM",()=>{stopping=true;});
async function evaluate(settings:PolicySettings):Promise<ModelResult>{return new Promise((resolveResult,reject)=>{
 const child=spawn(process.execPath,[resolve("scripts/enroads-browser.mjs")],{windowsHide:true,stdio:["pipe","pipe","pipe"],env:{NODE_ENV:"production",PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,TEMP:process.env.TEMP,USERPROFILE:process.env.USERPROFILE,LOCALAPPDATA:process.env.LOCALAPPDATA,ENROADS_BROWSER_CHANNEL:"msedge"}});
 let output="";const timer=setTimeout(()=>{child.kill();reject(new Error("Simulator timed out. Retry calculation."));},180000);
 child.stdout.on("data",chunk=>{output+=chunk.toString();if(output.length>50000){child.kill();reject(new Error("Unexpected simulator output."));}});
 child.stderr.on("data",()=>{});child.on("error",error=>{clearTimeout(timer);reject(error);});
 child.on("close",code=>{clearTimeout(timer);try{if(code!==0)throw new Error("The experimental En-ROADS browser connection failed. Retry calculation.");const result=JSON.parse(output);if(!validateModelResult(result,settings))throw new Error("Model readback mismatch; no temperature saved.");resolveResult(result);}catch(error){reject(error);}});
 child.stdin.on("error",()=>{});child.stdin.end(JSON.stringify(settings));
});}
async function main(){
 console.log("APECS experimental model worker started. Outbound database connection only.");
 while(!stopping){
  try{const job=await claimModel();if(job){console.log(`Evaluating ${job.key.slice(0,12)}`);try{const result=await evaluate(job.settings);await finishModel(job,result);console.log(`Complete ${job.key.slice(0,12)}: +${result.temperatureC.toFixed(1)} C`);}catch(error){await finishModel(job,undefined,error instanceof Error?error.message:"Model calculation failed.");console.log(`Failed ${job.key.slice(0,12)}`);}if(process.argv.includes("--once"))break;continue;}}
  catch{console.error("Worker connection unavailable; retrying shortly.");}
  if(process.argv.includes("--once"))break;
  await new Promise(resolve=>setTimeout(resolve,3000));
 }
}
main().catch(()=>{console.error("Model worker stopped.");process.exitCode=1;});
