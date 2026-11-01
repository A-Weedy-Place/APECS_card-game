// Archived0.8 UI reference. Current UI tests are in game.spec.ts; legacy engine regressions remain active.
import { test, expect, type Page } from "@playwright/test";
import type { PublicRun } from "../../src/game/types";
import { replayArcade } from "../../src/game/arcade";
async function join(page: Page, name: string) {
  await page.goto("/"); await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Country: Select", exact: true }).click();
  await page.getByRole("searchbox", { name: "Search countries" }).fill("Pakistan");
  await expect(page.getByRole("option", { name: "Pakistan", exact: true }).locator("img")).toHaveAttribute("src", "/flags/pk.svg");
  await page.getByRole("option", { name: "Pakistan", exact: true }).click();
  const response = page.waitForResponse(r => r.url().endsWith("/api/runs") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  return (await (await response).json()).run as PublicRun;
}
async function action(page: Page, click: () => Promise<void>, receipt = true) {
  const response = page.waitForResponse(r => r.url().includes("/actions") && r.request().method() === "POST");
  await click(); const raw = await response; expect(raw.status(), await raw.text()).toBe(200);
  const run = await raw.json() as PublicRun;
  if (receipt) await page.locator(".game-receipt").getByRole("button", { name: run.finishedAt ? "View result" : "Next round", exact: true }).click();
  return run;
}
async function skip(page: Page, run: PublicRun) { return action(page, () => page.getByRole("button", { name: run.specialRound ? "Skip challenge" : "Skip", exact: true }).click()); }

test("phone-first lobby, real flags, tap selection, readable cards, mute, rewards and moderation", async ({ page, request }) => {
  test.setTimeout(150000); const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto("/");
  await expect(page.locator(".lobby-title")).toContainText("APECS"); await expect(page.locator(".lobby-title h1")).toContainText("COP31");
  await expect(page.locator("header, footer, input[type=checkbox]")).toHaveCount(0);
  await page.screenshot({ path: "screenshots/v7-home.png", animations: "disabled" });
  let run = await join(page, "Mobile Explorer");
  await expect(page.locator(".round-gems .current")).toHaveText("1");
  expect((await page.locator(".stat-row b").allTextContents()).every(value => !/^\d+$/.test(value))).toBe(true);
  await expect(page.locator(".photo-art").first()).toHaveCSS("background-size", "cover");
  await page.getByRole("button", { name: "Mute sound effects" }).click();
  await expect(page.getByRole("button", { name: "Enable sound effects" })).toBeVisible();
  await page.getByRole("button", { name: "Library", exact: true }).click();
  await expect(page.locator(".shelf-card")).toHaveCount(51);
  expect(new Set(await page.locator(".shelf-card .photo-art img").evaluateAll(images=>images.map(image=>(image as HTMLImageElement).getAttribute("src")))).size).toBe(51);
  // Wait for every visible shelf photograph, not only the first lazy image.
  await page.locator(".shelf-card .photo-art img").evaluateAll(async images => {
    await Promise.all(images.filter(image => {
      const bounds=image.getBoundingClientRect(); return bounds.top<innerHeight && bounds.bottom>0;
    }).map(image => (image as HTMLImageElement).decode()));
  });
  await page.screenshot({path:"screenshots/v7-library-grid.png",animations:"disabled"});
  await page.locator(".combination-guide>summary").click(); await expect(page.locator(".combination-recipes>div")).toHaveCount(11);
  await page.screenshot({ path: "screenshots/v7-library.png" });
  await page.getByRole("button", { name: "Close details", exact: true }).click();
  for (const [width, height] of [[320,568],[360,640],[375,667],[390,844],[430,932],[844,390],[1366,768]]) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1 && document.documentElement.scrollWidth <= innerWidth), `one screen ${width}x${height}`).toBe(true);
    await expect(page.getByRole("button", { name: /^Shuffle for/ })).toBeInViewport();
    await expect.poll(() => page.evaluate(() => {
      const card = document.querySelector(".focused-card .card-inner")!.getBoundingClientRect(), stage = document.querySelector(".card-stage")!.getBoundingClientRect();
      const approval = document.querySelector(".focused-card .card-approval")!.getBoundingClientRect();
      const picture = document.querySelector(".focused-card .card-picture")!.getBoundingClientRect();
      return card.top >= stage.top - 1 && card.bottom <= stage.bottom + 1 && card.left >= 0 && card.right <= innerWidth && approval.bottom <= card.bottom + 1 && picture.height >= 15;
    }), { message: `whole card ${width}x${height}` }).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const index of [0,2,1]) {
    await page.locator(".card-inner").nth(index).focus();
    await expect(page.locator(".game-card").nth(index)).toHaveClass(/focused-card/);
    await expect.poll(()=>page.locator(".focused-card").evaluate(card=>{
      const bounds=card.getBoundingClientRect();return bounds.left>=0 && bounds.right<=innerWidth;
    }),{message:"keyboard focus centres each phone card"}).toBe(true);
    expect(await page.locator(".card-stage").evaluate(stage=>stage.scrollLeft)).toBe(0);
  }
  let budget = run.resources.credits;
  const selected = run.offers.map((card,index) => ({card,index})).sort((a,b) => a.card.cost - b.card.cost).filter(({card})=>{if(card.cost>budget)return false;budget-=card.cost;return true;});
  expect(selected.reduce((total,x) => total+x.card.cost,0)).toBeLessThanOrEqual(run.resources.credits);
  for (const {card,index} of selected) {
    await page.getByRole("button", { name: `Focus ${card.title}`, exact:true }).click();
    await page.locator(".card-pick").nth(index).click();
    await expect(page.locator(".card-pick").nth(index)).toHaveAttribute("aria-pressed","true");
    await expect.poll(()=>page.locator(".focused-card").evaluate(card=>{
      const bounds=card.getBoundingClientRect();return bounds.left>=0 && bounds.right<=innerWidth;
    }),{message:"selected phone card remains centred"}).toBe(true);
  }
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await page.screenshot({ path:"screenshots/v7-mobile-game.png",animations:"disabled" });
  run = await action(page, () => page.getByRole("button",{name:/^Play(?: ·|$)/}).click()); expect(run.round).toBe(1);
  await page.reload(); await expect(page.locator(".round-gems .current")).toHaveText("2");
  await expect(page.getByRole("button",{name:"Enable sound effects"})).toBeVisible();
  run = await skip(page,run); run = await skip(page,run); expect(run.specialRound).toBe("flight");
  await page.setViewportSize({width:320,height:568});
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1)).toBe(true);
  await expect(page.getByRole("button",{name:"Start Flappy Flight",exact:true})).toBeInViewport();
  await page.screenshot({path:"screenshots/v7-small-special.png",animations:"disabled"});
  await page.setViewportSize({width:390,height:844});
  await expect(page.getByRole("heading",{name:"Flappy Flight",exact:true})).toBeVisible();
  await page.locator(".arcade-boosts").getByRole("button",{name:"Politics",exact:true}).click();
  run = await action(page,()=>page.getByRole("button",{name:"Start Flappy Flight",exact:true}).click(),false);
  const course = page.getByRole("group",{name:/^Flappy Flight playfield/});
  await expect(page.locator(".arcade-game")).toHaveClass(/phase-playing/);await course.focus(); await page.keyboard.press("Space");
  await expect(page.getByRole("button",{name:"Collect & continue",exact:true})).toBeVisible({timeout:22000});
  await page.screenshot({path:"screenshots/v7-flight.png",animations:"disabled"});
  run = await action(page,()=>page.getByRole("button",{name:"Collect & continue",exact:true}).click()); expect(run.round).toBe(4);
  const rare = run.offers.find(card=>card.rarity)!; expect(rare).toBeDefined();
  await page.getByRole("button",{name:`Focus ${rare.title}`,exact:true}).click();
  await page.getByRole("button",{name:new RegExp(`^Inspect ${rare.title},`)}).click();
  await expect(page.locator(".card-detail .risk-warning")).toContainText("Exact consequence is revealed");
  await page.getByRole("button",{name:"Close details"}).click();
  await page.locator(".rare-card .card-pick").click();
  await page.screenshot({path:"screenshots/v7-rare.png",animations:"disabled"});
  run=await action(page,()=>page.getByRole("button",{name:/^Play(?: ·|$)/}).click());
  run = await skip(page,run); expect(run.specialRound).toBe("cleanup");
  run = await action(page,()=>page.getByRole("button",{name:"Start Reef Rescue",exact:true}).click(),false);
  const reef = page.getByRole("group",{name:/^Reef Rescue playfield/});
  await expect(page.locator(".arcade-game")).toHaveClass(/phase-playing/);await reef.focus();
  await page.keyboard.press("ArrowUp");await page.waitForTimeout(350);await page.keyboard.press("ArrowDown");
  await page.screenshot({path:"screenshots/v8-reef-playing.png",animations:"disabled"});
  await expect(page.getByRole("button",{name:"Collect & continue",exact:true})).toBeVisible({timeout:23000});
  const claim=page.waitForRequest(request=>request.url().includes("/actions")&&request.method()==="POST");
  run = await action(page,()=>page.getByRole("button",{name:"Collect & continue",exact:true}).click());
  const command=(await claim).postDataJSON().special;
  expect(run.lastActions![0].challengeScore).toBe(replayArcade("cleanup",command.frames,command.endFrame,command.moves));
  while(!run.finishedAt) run = await skip(page,run);
  await expect(page.locator(".result-medallion strong")).toHaveText(String(run.score));
  expect(run.history.filter(h=>h.kind==="round-end")).toHaveLength(10); expect(run.history.every(h=>h.year===2026)).toBe(true);
  await expect(page.locator(".result-player img")).toHaveAttribute("src","/flags/pk.svg");
  await page.screenshot({path:"screenshots/v7-result.png",animations:"disabled"});
  await page.goto("/admin"); await page.getByLabel("Organiser key").fill("playwright-local-key"); await page.getByRole("button",{name:"Log in"}).click();
  await page.getByRole("button",{name:"Hide Mobile Explorer",exact:true}).click();
  const standings = await(await request.get("/api/leaderboard")).json(); expect(standings.entries.some((entry:{nickname:string})=>entry.nickname==="Mobile Explorer")).toBe(false);
  await page.getByRole("button",{name:"Restore Mobile Explorer",exact:true}).click(); expect(errors).toEqual([]);
});

test("two-play phone limit, authenticated corrections, trash/restore and clean display",async({page})=>{
  test.setTimeout(180000);await page.setViewportSize({width:390,height:844});
  let run=await join(page,"Quota First");while(!run.finishedAt)run=await skip(page,run);
  await expect(page.getByRole("button",{name:/Play again/})).toContainText("1 play left");
  await page.getByRole("button",{name:/Play again/}).click();
  run=await join(page,"Quota Second");while(!run.finishedAt)run=await skip(page,run);
  await expect(page.getByRole("button",{name:/Play again/})).toHaveCount(0);
  expect((await page.request.post("/api/runs",{data:{nickname:"Quota Third",country:"PK",consent:true}})).status()).toBe(403);
  expect((await page.request.get("/api/admin")).status()).toBe(401);
  expect((await page.request.patch("/api/admin",{data:{id:run.id,revision:0,score:999}})).status()).toBe(401);
  expect((await page.request.post("/api/attempts",{data:{}})).status()).toBe(401);
  await page.goto("/");await expect(page.getByText("Both plays used",{exact:true})).toBeVisible();
  await page.goto("/admin");await page.getByLabel("Organiser key").fill("playwright-local-key");await page.getByRole("button",{name:"Log in",exact:true}).click();
  await page.getByRole("textbox",{name:"Search records"}).fill("Quota Second");await page.getByRole("button",{name:"Search",exact:true}).click();
  await page.getByRole("button",{name:"Edit Quota Second",exact:true}).click();
  await page.getByLabel("Score correction").fill("777");
  await page.getByRole("button",{name:"Country: Pakistan",exact:true}).click();
  await page.getByRole("searchbox",{name:"Search countries"}).fill("France");await page.getByRole("option",{name:"France",exact:true}).click();
  await page.getByRole("button",{name:"Save changes",exact:true}).click();
  await expect(page.locator(".admin-table tbody tr")).toHaveCount(1);
  await expect(page.locator(".admin-table tbody tr")).toContainText("777");
  await page.screenshot({path:"screenshots/v7-admin.png",animations:"disabled"});
  await page.getByRole("button",{name:"Remove Quota Second",exact:true}).click();
  await page.getByRole("button",{name:"Remove record",exact:true}).click();
  expect((await page.request.get("/api/leaderboard")).ok()).toBe(true);
  let board=await(await page.request.get("/api/leaderboard")).json();expect(board.entries.some((e:{id:string})=>e.id===run.id)).toBe(false);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("cryosphere-session-v1")!));
  expect((await page.request.get("/api/runs/"+run.id,{headers:{Authorization:"Bearer "+saved.token}})).status()).toBe(410);
  await page.getByRole("button",{name:"Restore removed Quota Second",exact:true}).click();
  board=await(await page.request.get("/api/leaderboard")).json();expect(board.entries.find((e:{id:string})=>e.id===run.id)?.score).toBe(777);
  await page.getByRole("button",{name:"Reset my plays",exact:true}).click();await expect(page.getByText("Two plays restored for this browser.",{exact:true})).toBeVisible();
  expect((await(await page.request.get("/api/attempts")).json()).remaining).toBe(2);
  await page.setViewportSize({width:1366,height:900});await page.goto("/leaderboard");
  await expect(page.getByRole("heading",{name:"Leaderboard",exact:true})).toBeVisible();
  await expect(page.getByText("Updates every 5s")).toHaveCount(0);
  const row=page.locator(".display-table tr").filter({hasText:"Quota Second"});await expect(row.locator("td").nth(1).locator("img")).toHaveAttribute("src","/flags/fr.svg");await expect(row.locator("td").nth(2)).toHaveText("Quota Second");await expect(row.locator("td").nth(3)).toHaveText("777");
  await page.screenshot({path:"screenshots/v7-display.png",animations:"disabled"});
});

test("desktop, keyboard and reduced motion layouts with actual photos and country search",async({page})=>{
  await page.setViewportSize({width:1440,height:1000}); await page.goto("/"); await page.keyboard.press("Tab"); await expect(page.getByRole("link",{name:"Skip to content"})).toBeFocused();
  await page.emulateMedia({reducedMotion:"reduce"}); let run=await join(page,"Keyboard Player");
  await page.locator(".card-pick").nth(1).focus(); await page.keyboard.press("Enter"); await expect(page.locator(".card-pick").nth(1)).toHaveAttribute("aria-pressed","true");
  await page.keyboard.press("Enter"); await expect(page.locator(".selected-card")).toHaveCount(0);
  await page.getByRole("button",{name:new RegExp(`^Inspect ${run.offers[1].title},`)}).click(); await expect(page.locator(".card-detail")).toContainText("approval"); await page.getByRole("button",{name:"Close details"}).click();
  await page.screenshot({path:"screenshots/v7-desktop-game.png",animations:"disabled"});
  for(const width of [375,768,1440]) { await page.setViewportSize({width,height:900}); for(const path of ["/","/about","/credits","/leaderboard"]) {await page.goto(path); expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${path} ${width}`).toBe(true);} }
  await page.goto("/leaderboard"); await expect(page.locator(".qr-code svg")).toBeVisible();
});

test("three full policy strategies reach results using actual tap and play controls",async({page})=>{
  test.setTimeout(180000); await page.setViewportSize({width:1100,height:900});
  for(const strategy of ["technology","nature","justice"]) {
    let run=await join(page,`Playtest ${strategy}`); let actions=0;
    while(!run.finishedAt) {
      if(run.specialRound) {run=await skip(page,run);continue;}
      let budget=run.resources.credits;
      const cards=[...run.offers].sort((a,b)=>((b.category===strategy?16:0)+b.transitionGain+b.approval*.1-b.cost)-((a.category===strategy?16:0)+a.transitionGain+a.approval*.1-a.cost)).filter(card=>{if(card.cost>budget)return false;budget-=card.cost;return true;});
      if(!cards.length){run=await skip(page,run);continue;}
      for(const card of cards) await page.locator(".card-pick").nth(run.offers.findIndex(c=>c.id===card.id)).click();
      const before=run.round; run=await action(page,()=>page.getByRole("button",{name:/^Play(?: ·|$)/}).click()); expect(run.round).toBe(before+1);actions+=cards.length;
    }
    expect(actions).toBeGreaterThan(2); await expect(page.locator(".result-medallion strong")).toHaveText(String(run.score));
    console.log(`v7 UI ${strategy}: ${run.score}; ${actions} policies attempted; ${run.activeSynergies?.length??0} combinations`);
    await page.request.post("/api/attempts",{headers:{Authorization:"Bearer playwright-local-key"},data:{}});
  }
});

test("40 simultaneous players complete ten rounds with atomic packages, skips and idempotency",async({request})=>{
  const players=await Promise.all(Array.from({length:40},async(_,i)=>{const response=await request.post("/api/runs",{headers:{Cookie:`cop-player=${String(i+1).padStart(64,"0")}`},data:{nickname:`Load Tester ${i}`,country:"AQ",consent:true}});expect(response.status()).toBe(201);return await response.json()as{run:PublicRun;token:string};}));
  const first=players[0];
  for(const fields of [{cardIds:[]},{cardIds:["not-a-card"]},{cardId:"save",cardIds:[first.run.offers[0].id]},{special:{kind:"finish-special",frames:[1],endFrame:1}}]) expect([400,409]).toContain((await request.post(`/api/runs/${first.run.id}/actions`,{headers:{Authorization:`Bearer ${first.token}`},data:{...fields,revision:0,requestId:"invalid-test-action"}})).status());
  const times:number[]=[];let policies=0;
  for(let round=0;round<10;round++) await Promise.all(players.map(async player=>{
    let budget=player.run.resources.credits;const ids:string[]=[];for(const card of player.run.offers)if(card.cost<=budget){ids.push(card.id);budget-=card.cost;}
    const fields=player.run.specialRound||!ids.length?{cardId:"save"}:{cardIds:ids};
    const data={...fields,revision:player.run.revision,requestId:`round-${round}-${player.run.id}`,score:999999,effects:{credits:999999}};
    const started=Date.now();const response=await request.post(`/api/runs/${player.run.id}/actions`,{headers:{Authorization:`Bearer ${player.token}`},data});expect(response.status()).toBe(200);player.run=await response.json();times.push(Date.now()-started);policies+=ids.length;
    expect(player.run.round).toBe(round+1);expect(player.run.resources.credits).toBeLessThan(200);expect(JSON.stringify(player.run)).not.toContain('"seed":');expect(JSON.stringify(player.run)).not.toContain('"roll":');
    if(round===0) expect(await(await request.post(`/api/runs/${player.run.id}/actions`,{headers:{Authorization:`Bearer ${player.token}`},data})).json()).toEqual(player.run);
  }));
  expect(players.every(player=>player.run.finishedAt&&player.run.score!<=1000)).toBe(true);
  const board=await(await request.get("/api/leaderboard")).json();expect(board.entries.filter((entry:{nickname:string})=>entry.nickname.startsWith("Load Tester")).length).toBe(40);
  times.sort((a,b)=>a-b);console.log(`v7 40 players /400 rounds /${policies} policy attempts: p95 ${times[Math.floor(times.length*.95)]}ms, max ${times.at(-1)}ms (local only)`);
});
test("country dropdown fallback and a full ten-place projector display fit",async({page})=>{
  await page.addInitScript(()=>{Object.defineProperty(HTMLElement.prototype,"showPopover",{value:undefined,configurable:true});Object.defineProperty(HTMLElement.prototype,"hidePopover",{value:undefined,configurable:true});});
  await page.setViewportSize({width:390,height:844});await page.goto("/");
  await page.getByRole("button",{name:"Country: Select",exact:true}).click();
  await expect(page.locator(".country-dropdown")).toBeVisible();
  const popup=await page.locator(".country-dropdown").boundingBox();expect(popup!.height).toBeLessThanOrEqual(282);
  await page.getByRole("searchbox",{name:"Search countries"}).fill("Pakistan");
  await page.keyboard.press("ArrowDown");await page.keyboard.press("Enter");
  await expect(page.getByRole("button",{name:"Country: Pakistan",exact:true})).toBeFocused();
  await expect(page.locator(".country-trigger img")).toHaveAttribute("src","/flags/pk.svg");
  await page.getByRole("button",{name:"Country: Pakistan",exact:true}).click();await page.keyboard.press("Escape");
  await expect(page.getByRole("button",{name:"Country: Pakistan",exact:true})).toHaveAttribute("aria-expanded","false");
  await page.screenshot({path:"screenshots/v7-country-fallback.png",animations:"disabled"});
  await page.setViewportSize({width:1366,height:768});await page.goto("/leaderboard");
  await expect(page.locator(".display-table tbody tr")).toHaveCount(10);
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1)).toBe(true);
  await page.screenshot({path:"screenshots/v7-full-display.png",animations:"disabled"});
});
