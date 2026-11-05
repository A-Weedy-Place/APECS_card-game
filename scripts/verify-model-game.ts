/** Opt-in real hosted UI/model smoke. Cleans only its uniquely named game. */
import {chromium,expect} from "@playwright/test";
import {randomBytes} from "node:crypto";
import {Pool} from "pg";
import {SUPABASE_CA} from "../src/server/supabase-ca";
import {CONTROLS} from "../src/game/policy-catalogue";
import type {PublicRun} from "../src/game/types";
import {writeFile} from "node:fs/promises";
async function main(){
 process.loadEnvFile(".env.deploy.local");const base="https://apecs-card-game.vercel.app",name=`Model verify ${randomBytes(3).toString("hex")}`;
 const browser=await chromium.launch({channel:"msedge",headless:true});const page=await browser.newPage({baseURL:base,viewport:{width:390,height:844}});let id:string|undefined;
 try{
  await page.goto(base);await page.getByLabel("Name",{exact:true}).fill(name);await page.getByRole("button",{name:"Country: Select",exact:true}).click();await page.getByRole("searchbox",{name:"Search countries"}).fill("Antarctica");await page.getByRole("option",{name:"Antarctica",exact:true}).click();
  const start=page.waitForResponse(r=>r.url().endsWith("/api/runs")&&r.request().method()==="POST");await page.getByRole("button",{name:"Play",exact:true}).click();const session=await(await start).json() as {run:PublicRun;token:string};let run=session.run;id=run.id;
  if(run.rulesVersion!=="prototype-0.11")throw new Error("Expected current published rules.");let automaticPosts=0;page.on("response",r=>{if(r.url().endsWith("/model")&&r.request().method()==="POST")automaticPosts++;});
  while(!run.finishedAt){
   const response=page.waitForResponse(r=>r.url().includes(`/api/runs/${id}/actions`)&&r.request().method()==="POST");
   if(run.specialRound)await page.getByRole("button",{name:"Skip challenge",exact:true}).click();
   else {
    const index=process.argv.includes("--baseline")?-1:run.offers.findIndex(card=>(card as typeof card&{factor?:string}).factor&&card.cost<=run.resources.credits);
    if(index>=0){await page.locator(".v9-select").nth(index).click();await page.locator(".v9-controls").getByRole("button",{name:/^Play/}).click();}else await page.getByRole("button",{name:"Skip",exact:true}).click();
   }
   const result=await response;if(!result.ok())throw new Error(`Policy request ${result.status()}`);run=await result.json();
  }
  const stoppedTime=run.elapsedMs,started=Date.now();
  await page.locator(".v9-result h1").filter({hasText:/^\+\d+\.\d°C$/}).waitFor({timeout:240000});
  const modelResponse=await page.request.get(`/api/runs/${id}/model`,{headers:{Authorization:`Bearer ${session.token}`}});const model=await modelResponse.json();
  if(model.status!=="complete"||run.modelEvaluation?.status!=="complete"&&!automaticPosts)throw new Error("Automatic model calculation did not complete.");
  await page.screenshot({path:"screenshots/v10-live-result.png"});await page.getByRole("button",{name:"Results & graphs",exact:true}).click();
  const frame=page.frameLocator(".scenario-dialog iframe");await expect.poll(async()=>Number((await frame.locator(".primary-temp-value").innerText()).trim().replace("−","-")),{timeout:60000}).toBe(model.temperatureC);
  const shown=Number((await frame.locator(".primary-temp-value").innerText()).trim().replace("−","-"));if(shown!==model.temperatureC)throw new Error("Embedded official model temperature mismatch.");
  for(const c of CONTROLS){const actual=Number(await frame.locator(`#${c.input}`).getAttribute("data-value"));if(Math.abs(actual-run.policySettings![c.id])>1e-7)throw new Error(`Embedded input mismatch: ${c.id}`);}
  const welcome=frame.getByText("Get Started",{exact:true});if(await welcome.isVisible())await welcome.click();
  const resized=page.waitForEvent("framenavigated",{predicate:f=>f.url().startsWith("https://en-roads.climateinteractive.org/scenario.html"),timeout:30000});
  await page.setViewportSize({width:1440,height:900});await resized;await expect(frame.locator(".primary-temp-value")).toBeVisible({timeout:60000});await expect.poll(async()=>Number((await frame.locator(".primary-temp-value").innerText()).trim().replace("−","-")),{timeout:60000}).toBe(model.temperatureC);
  await expect.poll(async()=>frame.locator(".primary-temp-value").evaluate(e=>e.getBoundingClientRect().width),{timeout:60000}).toBeGreaterThan(30);
  try{await welcome.waitFor({state:"visible",timeout:10000});await welcome.click();await expect(welcome).not.toBeVisible();}catch(error){if(await welcome.isVisible())throw error;}
  // Let the external tool's welcome fade finish before visual capture.
  await page.waitForTimeout(1500);
  await frame.locator("body").evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  await page.screenshot({path:"screenshots/v10-live-enroads.png"});
  const final=await(await page.request.get(`/api/runs/${id}`,{headers:{Authorization:`Bearer ${session.token}`}})).json();if(final.elapsedMs!==stoppedTime)throw new Error("Calculation changed the play clock.");
  const board=await(await page.request.get("/api/leaderboard")).json();if(!board.entries.some((entry:{id:string})=>entry.id===id))throw new Error("Evaluated run missing from standings.");
  const report={rules:run.rulesVersion,temperatureC:model.temperatureC,modelVersion:model.modelVersion,sourceUrl:model.sourceUrl,calculationWaitMs:Date.now()-started,automaticPosts,cachedInitially:run.modelEvaluation?.status==="complete",matchedInputs:19,playTimeUnchanged:true,leaderboard:true};
  await writeFile("data/live-model-verification.json",JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{
  await browser.close();
  if(id){const url=new URL(process.env.DATABASE_URL!);url.username="postgres.shdiharlumvykiaeaddt";url.password=process.env.PROVISION_DB_PASSWORD!;url.search="";const db=new Pool({connectionString:url.toString(),ssl:{ca:SUPABASE_CA,rejectUnauthorized:true},max:1});
   try{await db.query("BEGIN");const row=(await db.query("SELECT state FROM apecs.runs WHERE id=$1 FOR UPDATE",[id])).rows[0];if(!row||JSON.parse(row.state).nickname!==name)throw new Error("Generated-game cleanup identity mismatch.");const groups=(await db.query("SELECT group_hash FROM apecs.run_attempts WHERE run_id=$1",[id])).rows.map(r=>r.group_hash);
    for(const table of ["actions","run_controls","admin_audit","run_attempts"])await db.query(`DELETE FROM apecs.${table} WHERE run_id=$1`,[id]);await db.query("DELETE FROM apecs.runs WHERE id=$1",[id]);await db.query("DELETE FROM apecs.browser_passes p WHERE group_hash=ANY($1::text[]) AND NOT EXISTS(SELECT 1 FROM apecs.run_attempts a WHERE a.group_hash=p.group_hash)",[groups]);await db.query("COMMIT");console.log("Generated verification game cleaned; real model cache preserved.");
   }catch(error){await db.query("ROLLBACK");throw error;}finally{await db.end();}
  }
 }
}
main().catch(error=>{console.error(error instanceof Error?error.message:"Live model check failed.");process.exitCode=1;});
