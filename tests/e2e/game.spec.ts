import { test,expect,type Page } from "@playwright/test";
import type { PublicRun } from "../../src/game/types";
async function join(page:Page,name:string,{skipTutorial=true}={}){await page.goto("/");await page.getByLabel("Name",{exact:true}).fill(name);await page.getByRole("button",{name:"Country: Select",exact:true}).click();await page.getByRole("searchbox",{name:"Search countries"}).fill("Pakistan");await expect(page.getByRole("option",{name:"Pakistan",exact:true}).locator("img")).toHaveAttribute("src","/flags/pk.svg");await page.getByRole("option",{name:"Pakistan",exact:true}).click();const response=page.waitForResponse(r=>r.url().endsWith("/api/runs")&&r.request().method()==="POST");await page.getByRole("button",{name:"Play",exact:true}).click();const {run}=await(await response).json() as {run:PublicRun};if(skipTutorial)await page.getByRole("button",{name:"Skip tutorial",exact:true}).click();return run;}
async function act(page:Page,click:()=>Promise<void>){const response=page.waitForResponse(r=>r.url().includes("/actions")&&r.request().method()==="POST");await click();const raw=await response;expect(raw.status(),await raw.text()).toBe(200);return await raw.json() as PublicRun;}
async function skip(page:Page,run:PublicRun){return act(page,()=>page.getByRole("button",{name:run.specialRound?"Skip challenge":"Skip",exact:true}).click());}

test("each new game spotlights the board and remembers its own dismissal",async({page})=>{
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.setViewportSize({width:375,height:667});
  await page.goto("/");
  await page.evaluate(()=>localStorage.setItem("cop-spotlight-tour-v1","1"));
  const run=await join(page,"Tutorial Player",{skipTutorial:false});
  const guide=page.getByRole("dialog",{name:"How to play"});
  await expect(guide.getByRole("button",{name:"Next"})).toBeFocused();
  await expect(guide).toContainText(`You have ${run.resources.credits} coins`);
  await guide.getByRole("button",{name:"Next",exact:true}).click();
  await expect(guide).toContainText(`You earn ${run.nextIncome} coins per round`);
  await guide.getByRole("button",{name:"Back",exact:true}).click();
  const steps = [["Your coins","coins"],["Revenue growth","economy"],["Politics","support"],["Public engagement","awareness"],
    ["Choose your cards","cards"],["Play","play"],["Shuffle","shuffle"],["Skip","skip"],["Rounds","rounds"],["Library","library"],["History","history"]];
  for(const [title,target] of steps){
    await expect(guide.getByRole("heading",{name:title})).toBeVisible();
    for(const [width,height] of [[320,568],[844,390]]){
      await page.setViewportSize({width,height});
      await expect.poll(()=>page.evaluate(selector=>{
        const box=(name:string)=>document.querySelector(name)!.getBoundingClientRect();
        const t=box(selector),s=box(".tutorial-spotlight"),p=box(".tutorial-panel");
        return s.left<=t.left+1&&s.right>=t.right-1&&s.top<=t.top+1&&s.bottom>=t.bottom-1
          &&p.left>=0&&p.top>=0&&p.right<=innerWidth&&p.bottom<=innerHeight
          &&(p.right<=t.left||p.left>=t.right||p.bottom<=t.top||p.top>=t.bottom);
      },`[data-tutorial="${target}"]`),{message:`${title} at ${width}×${height}`}).toBe(true);
      if(title==="Choose your cards")await page.screenshot({path:`screenshots/tutorial-${width}.png`});
    }
    await guide.getByRole("button",{name:target==="history"?"Start playing":"Next",exact:true}).click();
  }
  await expect(guide).toHaveCount(0);
  await expect(page.locator(".v9-rounds .current")).toHaveText("1");
  await page.reload();
  const help=page.getByRole("button",{name:"How to play",exact:true});
  await expect(help).toBeVisible();
  await expect(guide).toHaveCount(0);
  await help.click();
  await expect(guide).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(guide).toHaveCount(0);
  await expect(help).toBeFocused();
  const next=await join(page,"Tutorial Replay",{skipTutorial:false});
  expect(next.id).not.toBe(run.id);
  await expect(guide.getByRole("heading",{name:"Your coins"})).toBeVisible();
  await guide.getByRole("button",{name:"Skip tutorial",exact:true}).click();
  await page.reload();
  await expect(help).toBeVisible();
  await expect(guide).toHaveCount(0);
});
test("phone hand, resources, library, selection, saved state and pending result",async({page})=>{
 const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));await page.setViewportSize({width:390,height:844});let run=await join(page,"Mobile Player");expect(run.rulesVersion).toBe("prototype-0.10");
 await expect(page.locator(".v9-rounds .current")).toHaveText("1");await expect(page.locator(".v9-resource")).toHaveCount(3);await expect(page.locator(".v9-hud")).toContainText("Revenue growth");await expect(page.locator(".v9-hud")).not.toContainText("Fairness");
 await page.locator(".v9-hand img").evaluateAll(async images=>{await Promise.all(images.map(img=>(img as HTMLImageElement).decode()));});
 for(const[width,height]of[[320,568],[360,640],[390,844],[430,932],[844,390],[1366,768]]){await page.setViewportSize({width,height});await expect(page.locator(".v9-card")).toHaveCount(3);expect(await page.evaluate(()=>{const cards=Array.from(document.querySelectorAll(".v9-card")).map(c=>c.getBoundingClientRect());return cards.every((c,i)=>c.left>=0&&c.right<=innerWidth&&c.bottom<=innerHeight&&(!i||c.left>=cards[i-1].right))&&document.documentElement.scrollHeight<=innerHeight+1&&document.documentElement.scrollWidth<=innerWidth;}),`${width}x${height} upright/nonoverlapping/one screen`).toBe(true);if(width===320||height===390)await page.screenshot({path:`screenshots/v9-${width}x${height}.png`,animations:"disabled"});await expect(page.getByRole("button",{name:"Skip",exact:true})).toBeInViewport();await expect(page.getByRole("button",{name:"Mute sound",exact:true})).toBeInViewport();expect(await page.locator(".v9-card").evaluateAll(cards=>cards.every(card=>{const box=(s:string)=>card.querySelector(s)!.getBoundingClientRect();return box(".v9-card-art").height>=30&&box("h2").bottom<=box(".v9-card-face>p").top+1&&box(".v9-card-face>p").bottom<=box(".v9-odds").top+1&&box(".v9-odds").bottom<=box(".v9-select").top+1;})),`nonoverlapping card content ${width}x${height}`).toBe(true);}
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:"screenshots/v9-phone.png",animations:"disabled"});await page.getByRole("button",{name:"Mute sound",exact:true}).click();await expect(page.getByRole("button",{name:"Enable sound",exact:true})).toBeVisible();
 await page.locator(".v9-resource button").first().click();await expect(page.locator(".v9-stat-tip")).toContainText("separate from En-ROADS");await page.locator(".v9-resource button").first().click();
 await page.getByRole("button",{name:"Library",exact:true}).click();await expect(page.locator(".v9-library-card")).toHaveCount(67);expect(new Set(await page.locator(".v9-library img").evaluateAll(images=>images.map(i=>i.getAttribute("src")))).size).toBe(67);await page.getByRole("combobox").selectOption("population");await expect(page.locator(".v9-library-card")).toHaveCount(4);await page.screenshot({path:"screenshots/v9-library.png",animations:"disabled"});await page.getByRole("button",{name:"Close Library",exact:true}).click();
 const affordable=run.offers.find(c=>c.affordable)!;await page.getByRole("button",{name:`Inspect ${affordable.title}`,exact:true}).click();await expect(page.getByRole("dialog")).toContainText("approval");await page.getByRole("dialog").getByRole("button",{name:"Select",exact:true}).click();await expect(page.locator(".v9-select[aria-pressed=true]")).toHaveCount(1);run=await act(page,()=>page.locator(".v9-controls").getByRole("button",{name:/^Play/}).click());expect(run.round).toBe(1);await page.reload();await expect(page.locator(".v9-rounds .current")).toHaveText("2");
 const model=page.waitForResponse(r=>r.url().endsWith("/model")&&r.request().method()==="POST");
 while(!run.finishedAt){if(run.specialRound){await expect(page.locator(".arcade-boosts button")).toHaveCount(0);await expect(page.locator(".arcade-reward-tag")).toContainText("5 coins");await expect(page.getByRole("button",{name:run.specialRound==="flight"?"Start Flappy Flight":"Start Reef Rescue",exact:true})).toBeVisible();}run=await skip(page,run);}
 await expect(page.getByRole("heading",{name:"Calculation paused",exact:true})).toBeVisible();expect(run.score).toBeNull();expect(run.elapsedMs).toBeGreaterThan(0);expect((await model).status()).toBe(503);await expect(page.getByRole("button",{name:"Calculate temperature",exact:true})).toHaveCount(0);await expect(page.locator(".v9-result [role=alert]")).toContainText("not configured");await page.getByRole("button",{name:"History",exact:true}).first().click();await expect(page.getByRole("dialog")).toContainText(affordable.title);await page.keyboard.press("Escape");expect(errors).toEqual([]);
});
test("keyboard, reduced motion and read-only library prerequisites",async({page})=>{
 await page.emulateMedia({reducedMotion:"reduce"});await page.setViewportSize({width:1440,height:900});await page.goto("/");await page.keyboard.press("Tab");await expect(page.getByRole("link",{name:"Skip to content"})).toBeFocused();await join(page,"Keyboard Player");const select=page.locator(".v9-select:not(:disabled)").first();await select.focus();await page.keyboard.press("Enter");await expect(select).toHaveAttribute("aria-pressed","true");await page.keyboard.press("Enter");await expect(select).toHaveAttribute("aria-pressed","false");await page.getByRole("button",{name:"Library",exact:true}).click();await page.getByRole("combobox").selectOption("coal");await expect(page.locator(".v9-library-card")).toHaveCount(3);await expect(page.locator(".v9-library-card").nth(1)).toContainText("Needs");await page.locator(".v9-library-card").nth(2).click();await expect(page.getByRole("button",{name:"Not in this hand",exact:true})).toBeDisabled();await page.keyboard.press("Escape");await page.screenshot({path:"screenshots/v9-desktop.png",animations:"disabled"});
});
test("every catalogue card remains readable in a three-card 320px hand",async({page})=>{
 await page.emulateMedia({reducedMotion:"reduce"});await page.setViewportSize({width:320,height:568});const run=await join(page,"Layout Catalogue"),library=run.library!;await page.waitForURL("**/play");await expect(page.locator(".v9-board")).toBeVisible();
 let offers=library.slice(0,3);await page.route(`**/api/runs/${run.id}`,route=>route.fulfill({json:{...run,resources:{...run.resources,credits:20},offers,specialRound:null}}));
 // Presentation-only fixtures; no forged hand is submitted to the authoritative server.
 for(let n=0;n<library.length;n+=3){offers=library.slice(n,n+3);while(offers.length<3)offers.push(library[offers.length]);await page.reload();await page.getByRole("button",{name:`Inspect ${offers[0].title}`,exact:true}).waitFor();expect(await page.locator(".v9-card").evaluateAll(cards=>cards.every(card=>{const el=(s:string)=>card.querySelector(s)!as HTMLElement,b=(s:string)=>el(s).getBoundingClientRect();return b(".v9-card-art").height>=30&&b("h2").bottom<=b(".v9-card-face>p").top+1&&b(".v9-card-face>p").bottom<=b(".v9-odds").top+1&&b(".v9-odds").bottom<=b(".v9-select").top+1&&el("h2").scrollWidth<=el("h2").clientWidth+1;})),offers.map(c=>c.title).join(" / ")).toBe(true);}
});
test("40 simultaneous games finish without trusting client temperatures or ranking pending scenarios",async({request})=>{
 const players=await Promise.all(Array.from({length:40},async(_,i)=>{const response=await request.post("/api/runs",{headers:{Cookie:`cop-player=${String(i+1).padStart(64,"0")}`},data:{nickname:`Load Player ${i}`,country:"AQ",consent:true}});expect(response.status()).toBe(201);return await response.json()as{run:PublicRun;token:string};}));const times:number[]=[];
 for(let round=0;round<10;round++)await Promise.all(players.map(async player=>{let budget=player.run.resources.credits;const factors=new Set<string>();const ids=player.run.offers.filter(c=>{const factor=(c as typeof c&{factor?:string}).factor;if(c.cost>budget||factor&&factors.has(factor))return false;if(factor)factors.add(factor);budget-=c.cost;return true;}).map(c=>c.id);const data={...(ids.length?{cardIds:ids}:{cardId:"save"}),revision:player.run.revision,requestId:`round-${round}-${player.run.id}`,score:-100,temperatureC:0};const before=Date.now();const response=await request.post(`/api/runs/${player.run.id}/actions`,{headers:{Authorization:`Bearer ${player.token}`},data});expect(response.status()).toBe(200);player.run=await response.json();times.push(Date.now()-before);expect(player.run.round).toBe(round+1);expect(player.run.score).toBeNull();expect(player.run.resources.credits).toBeLessThanOrEqual(20);expect(JSON.stringify(player.run)).not.toContain('"seed":');if(round===0)expect(await(await request.post(`/api/runs/${player.run.id}/actions`,{headers:{Authorization:`Bearer ${player.token}`},data})).json()).toEqual(player.run);}));expect(players.every(p=>p.run.finishedAt&&p.run.elapsedMs!==undefined&&!p.run.projection.temperatureC)).toBe(true);expect((await(await request.get("/api/leaderboard")).json()).entries).toEqual([]);times.sort((a,b)=>a-b);console.log(`0.10 40 players /400 rounds: p95 ${times[Math.floor(times.length*.95)]}ms, max ${times.at(-1)}ms; no model jobs`);
});
test("admin moderates pending records without editable temperature; projector temperature/time layout",async({page})=>{
let run=await join(page,"Organiser Test");while(!run.finishedAt)run=await skip(page,run);await page.goto("/admin");await page.getByLabel("Password").fill("playwright-local-key");await page.getByRole("button",{name:"Log in",exact:true}).click();await page.getByRole("textbox",{name:"Search records"}).fill("Organiser Test");await page.getByRole("button",{name:"Search",exact:true}).click();await page.getByRole("button",{name:"Edit Organiser Test",exact:true}).click();await expect(page.getByLabel("Score correction")).toHaveCount(0);await page.getByLabel("Name",{exact:true}).fill("Corrected Player");await page.getByRole("button",{name:"Save changes",exact:true}).click();await expect(page.getByRole("dialog")).not.toBeVisible();await expect(page.getByRole("textbox",{name:"Search records"})).toBeEnabled();await page.getByRole("textbox",{name:"Search records"}).fill("Corrected Player");await page.getByRole("button",{name:"Search",exact:true}).click();await page.getByRole("button",{name:"Remove Corrected Player",exact:true}).click();await page.getByRole("button",{name:"Remove record",exact:true}).click();await page.getByRole("button",{name:"Restore removed Corrected Player",exact:true}).click();
 await page.getByRole("button",{name:"History for Corrected Player",exact:true}).click();await expect(page.getByText("Browser starts",{exact:true})).toBeVisible();await page.getByRole("button",{name:"Reset player’s plays",exact:true}).click();await page.getByRole("button",{name:"Restore two plays",exact:true}).click();await expect(page.getByRole("status")).toContainText("Two plays restored");expect((await(await page.request.get("/api/attempts")).json()).remaining).toBe(2);const download=page.waitForEvent("download");await page.getByRole("button",{name:"Export all",exact:true}).click();expect((await download).suggestedFilename()).toBe("event-records.csv");expect((await page.request.get("/api/admin")).status()).toBe(401);
 // Display-layout fixture only; no synthetic temperatures are saved to any database.
 await page.route("**/api/leaderboard",route=>route.fulfill({json:{entries:Array.from({length:10},(_,i)=>({id:`layout-${i}`,nickname:`Player ${i+1}`,country:i%2?"PK":"FR",score:2+i/10,temperatureC:2+i/10,elapsedMs:60000+i*100,finishedAt:"2026-10-31"}))}}));await page.setViewportSize({width:1366,height:768});await page.goto("/leaderboard");await expect(page.locator(".display-table tbody tr")).toHaveCount(10);await expect(page.locator("th")).toContainText(["Rank","","Name","2100 °C","Time"]);expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1)).toBe(true);await page.screenshot({path:"screenshots/v9-projector.png",animations:"disabled"});
});
