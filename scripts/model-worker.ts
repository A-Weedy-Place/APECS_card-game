/** Outbound-only experimental worker. Exposes no Codex, browser or laptop port. */
import { fork, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { claimModel,finishModel } from "../src/server/model-queue";
import { validateModelResult, type ModelResult } from "../src/server/model-result";
import { pool } from "../src/server/postgres";
import type { PolicySettings } from "../src/game/policy-catalogue";
const hosted = process.argv.includes("--hosted");
if (hosted) {
  const url = process.env.MODEL_WORKER_DATABASE_URL;
  if (process.env.MODEL_HOSTED_UI_AUTHORIZED !== "1" || !url) {
    throw new Error("Hosted scoring requires explicit authorization and a worker database connection.");
  }
  process.env.DATABASE_URL = url;
} else {
  process.loadEnvFile(".env.worker.local");
}
let stopping=false;process.on("SIGINT",()=>{stopping=true;});process.on("SIGTERM",()=>{stopping=true;});
let calculator: ChildProcess | undefined;

function browserProcess() {
  if (calculator?.connected) return calculator;
  const child = fork(resolve("scripts/enroads-browser.mjs"), ["--worker"], {
    windowsHide: true, execArgv: [], stdio: ["ignore", "ignore", "ignore", "ipc"],
    env: { NODE_ENV: "production", PATH: process.env.PATH, SystemRoot: process.env.SystemRoot,
      TEMP: process.env.TEMP, USERPROFILE: process.env.USERPROFILE, LOCALAPPDATA: process.env.LOCALAPPDATA,
      HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH,
      ENROADS_BROWSER_CHANNEL: process.env.ENROADS_BROWSER_CHANNEL },
  });
  child.on("error", () => { if (calculator === child) calculator = undefined; });
  calculator = child;
  return child;
}

function evaluate(settings: PolicySettings): Promise<ModelResult> {
  const child = browserProcess();
  return new Promise((resolveResult, reject) => {
    function cleanup() {
      clearTimeout(timer);
      child.off("message", reply);
      child.off("disconnect", disconnected);
    }
    function disconnected() {
      cleanup();
      reject(new Error("The En-ROADS browser disconnected. Retry calculation."));
    }
    function reply(message: unknown) {
      cleanup();
      const { result, error } = message as { result?: ModelResult; error?: string };
      if (result && validateModelResult(result, settings)) resolveResult(result);
      else {
        if (error) console.error(`En-ROADS browser: ${error.slice(0, 400)}`);
        reject(new Error("En-ROADS could not verify the complete scenario. Retry calculation."));
      }
    }
    const timer = setTimeout(() => {
      cleanup();
      if (calculator === child) calculator = undefined;
      child.kill();
      reject(new Error("Simulator timed out. Retry calculation."));
    }, 180000);
    child.once("message", reply);
    child.once("disconnect", disconnected);
    child.send(settings, error => { if (error) disconnected(); });
  });
}

async function processJob(job: NonNullable<Awaited<ReturnType<typeof claimModel>>>) {
  const key = job.key.slice(0, 12);
  const started = performance.now();
  console.log(`Evaluating ${key}`);
  let result: ModelResult | undefined;
  let failure: string | undefined;
  try { result = await evaluate(job.settings); }
  catch (error) { failure = error instanceof Error ? error.message : "Model calculation failed."; }

  for (let attempt = 1; ; attempt++) {
    try {
      const saved = await finishModel(job, result, failure);
      if (!saved) console.log(`Lease ended before saving ${key}`);
      else if (result) console.log(`Complete ${key}: +${result.temperatureC.toFixed(1)} C in ${((performance.now() - started) / 1000).toFixed(1)}s`);
      else console.log(`Failed ${key}`);
      return;
    } catch (error) {
      if (attempt === 3) throw error;
      await delay(1000 * attempt);
    }
  }
}

async function main(){
 if (hosted) {
  const { rows } = await pool().query<{ role: string }>("SELECT current_user AS role");
  if (rows[0]?.role !== "apecs_worker") {
   console.error("Hosted scoring refused a database role other than apecs_worker.");
   process.exitCode = 1;
   return;
  }
  console.log("Hosted scoring connected with the restricted apecs_worker role.");
 }
 console.log("APECS experimental model worker started. Reusing a hidden browser across jobs.");
 while(!stopping){
  try{const job=await claimModel();if(job){await processJob(job);if(process.argv.includes("--once"))break;continue;}}
  catch{console.error("Worker connection unavailable; retrying shortly.");}
  if(process.argv.includes("--once"))break;
  await delay(3000);
 }
}
main().catch(()=>{console.error("Model worker stopped.");process.exitCode=1;})
  .finally(()=>{if(calculator?.connected) calculator.disconnect();});
