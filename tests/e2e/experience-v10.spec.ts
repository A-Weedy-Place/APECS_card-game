import { test,expect } from "@playwright/test";
import type { PublicRun } from "../../src/game/types";

test("0.12 has twelve numbered rounds, two stars, risk cards and server-replayed survival rewards",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const response=await page.request.post("/api/runs",{data:{nickname:"Survival Test",country:"AQ",consent:true}});
 const session=await response.json() as {run:PublicRun;token:string};
 expect(session.run.rulesVersion).toBe("prototype-0.12");expect(session.run.library).toHaveLength(35);
 await page.goto("/");const {SESSION_KEY}=await import("../../src/lib/client");
 await page.evaluate(({key,s})=>localStorage.setItem(key,JSON.stringify({id:s.run.id,token:s.token})),{key:SESSION_KEY,s:session});
 let run=session.run;
 while(run.round<4){const next=await page.request.post(`/api/runs/${run.id}/actions`,{headers:{Authorization:`Bearer ${session.token}`},data:{cardId:"save",revision:run.revision,requestId:crypto.randomUUID()}});run=await next.json();}
 await page.goto("/play");
 await expect(page.locator(".v11-rounds>span")).toHaveText(["1","2","3","4","★","5","6","7","8","★","9","10","11","12"]);
 await expect(page.getByText("SURVIVE AS LONG AS YOU CAN",{exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Start Flappy Flight",exact:true}).click();
 await expect(page.getByRole("button",{name:"Collect & continue",exact:true})).toBeVisible({timeout:20000});
 const finish=page.waitForResponse(r=>r.url().endsWith("/actions")&&r.request().postData()?.includes("finish-special")===true);
 await page.getByRole("button",{name:"Collect & continue",exact:true}).click();
 expect((await finish).status()).toBe(200);await expect(page.locator(".v11-rounds>.current")).toHaveText("5");
 await page.getByRole("button",{name:"Library",exact:true}).click();
 await expect(page.locator(".v9-library-card.risky")).toHaveCount(2);
 await expect(page.locator(".v9-library-card.gold-rare")).toHaveCount(3);
 await page.getByRole("combobox").selectOption("population");
 await expect(page.locator(".v9-library-card")).toHaveCount(1);
 await page.locator(".v9-library-card").click();
 await expect(page.getByRole("dialog")).toContainText("Politics");
 await expect(page.getByRole("dialog").locator(".negative")).toHaveCount(2);
 await page.screenshot({path:"screenshots/v11-risk-card.png",animations:"disabled"});
});
test("entry identity and country popup stay centred and fit phone/desktop",async({page})=>{
 for(const [width,height] of [[320,568],[390,844],[844,390],[1440,900]]){
  await page.setViewportSize({width,height});await page.goto("/");
  expect(await page.locator(".join-box .lobby-title").count()).toBe(0);await expect(page.locator(".join-stage>.lobby-title")).toBeVisible();
  await expect(page.getByRole("heading",{name:"APECS",exact:true})).toBeVisible();
  await expect(page.locator(".lobby-cop")).toHaveText("COP31");
  await expect(page.locator(".world-photo")).toHaveCSS("background-image",/everest-nuptse\.webp/);
  expect(await page.locator(".join-box").evaluate(e=>{const r=e.getBoundingClientRect();return Math.abs(r.x+r.width/2-innerWidth/2)<2||innerWidth>650&&innerHeight<450;})).toBe(true);
  await page.getByRole("button",{name:"Country: Select",exact:true}).click();
  expect(await page.locator(".country-dropdown").evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;})).toBe(true);
  const search=page.getByRole("searchbox",{name:"Search countries"});
  await expect(search).toBeFocused();await expect(search).toHaveCSS("outline-style","none");
  await expect(page.locator(".country-dropdown .country-search")).toHaveCSS("outline-style","solid");
  await page.getByRole("searchbox",{name:"Search countries"}).fill("Pakistan");await expect(page.getByRole("option",{name:"Pakistan",exact:true}).locator("img")).toHaveAttribute("src","/flags/pk.svg");await page.keyboard.press("Escape");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight+1)).toBe(true);
  await page.screenshot({path:`screenshots/v10-entry-${width}.png`});
 }
});
test("new arcade fills the playfield, auto-calculation and official scenario window",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const response=await page.request.post("/api/runs",{data:{nickname:"Experience Test",country:"AQ",consent:true}});expect(response.status()).toBe(201);
 const session=await response.json() as {run:PublicRun;token:string};await page.goto("/");
 const {SESSION_KEY}=await import("../../src/lib/client");await page.evaluate(({key,s})=>localStorage.setItem(key,JSON.stringify({id:s.run.id,token:s.token})),{key:SESSION_KEY,s:session});
 let run=session.run;
 while(run.round<4){const r=await page.request.post(`/api/runs/${run.id}/actions`,{headers:{Authorization:`Bearer ${session.token}`},data:{cardId:"save",revision:run.revision,requestId:crypto.randomUUID()}});run=await r.json();}
 await page.goto("/play");await expect(page.getByRole("button",{name:"Start Flappy Flight",exact:true})).toBeVisible();
 for(const [width,height] of [[320,568],[390,844],[844,390],[1440,900]]){
  await page.setViewportSize({width,height});await expect(page.locator(".v9-hud")).toBeHidden();
  expect(await page.locator(".arcade-stage").evaluate(e=>{const r=e.getBoundingClientRect();return r.width>=150&&r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&& (innerHeight<450||Math.abs(r.x+r.width/2-innerWidth/2)<3);})).toBe(true);
  await expect(page.getByRole("button",{name:"Start Flappy Flight",exact:true})).toBeInViewport();await page.screenshot({path:`screenshots/v10-arcade-${width}.png`});
 }
 // Render-only completed scenario fixture; no synthetic temperature enters storage.
 await page.route(`**/api/runs/${run.id}`,route=>route.fulfill({json:{...run,round:14,finishedAt:new Date().toISOString(),elapsedMs:120000,specialRound:null,modelEvaluation:{status:"idle"}}}));
 let posts=0;const evaluation={status:"complete",temperatureC:3.3,modelVersion:"26.11.0",sourceUrl:"https://en-roads.climateinteractive.org/scenario.html?v=26.11.0"};
 await page.route(`**/api/runs/${run.id}/model`, route => {
   if (route.request().method() === "POST") {
     posts++;
     return route.fulfill({ json: { status: "queued" } });
   }
   return route.fulfill({ json: evaluation });
 });
 let frameLoads=0;await page.route("https://en-roads.climateinteractive.org/**",route=>{frameLoads++;return route.fulfill({body:"<html><body><h1>Official simulator fixture</h1></body></html>",contentType:"text/html"});});
 await page.setViewportSize({width:390,height:844});await page.reload();await expect(page.getByRole("status").filter({hasText:"Waiting for the model"})).toBeVisible();await expect(page.getByRole("heading",{name:"+3.3°C",exact:true})).toBeVisible();expect(posts).toBe(1);
 await page.getByRole("button",{name:"Results & graphs",exact:true}).click();await expect(page.getByRole("dialog",{name:"En-ROADS scenario results"})).toBeVisible();await expect(page.locator(".scenario-dialog iframe")).toHaveAttribute("src",evaluation.sourceUrl);
 await expect(page.getByRole("link",{name:"Open En-ROADS"})).toHaveAttribute("href",evaluation.sourceUrl);await expect.poll(()=>frameLoads).toBe(1);await page.setViewportSize({width:844,height:390});await expect.poll(()=>frameLoads).toBe(2);await page.keyboard.press("Escape");await expect(page.locator(".scenario-dialog")).toHaveCount(0);
});
