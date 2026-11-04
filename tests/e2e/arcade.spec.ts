import {test,expect} from "@playwright/test";

test("practice arcade fits phones, has crisp canvas art, pause/resume and a real flying course",async({page})=>{
  test.setTimeout(75000);const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  await page.setViewportSize({width:390,height:844});await page.goto("/arcade");
  await expect(page.getByRole("button",{name:"Start Flappy Flight",exact:true})).toBeVisible();
  for(const[width,height]of[[320,568],[375,667],[390,844],[430,932],[844,390],[1366,768]]){
    await page.setViewportSize({width,height});
    expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1&&document.documentElement.scrollWidth<=innerWidth),`${width}×${height} one screen`).toBe(true);
    await expect(page.getByRole("button",{name:"Start Flappy Flight",exact:true})).toBeInViewport();
    const bounds=await page.locator(".arcade-stage").boundingBox();expect(bounds!.width).toBeGreaterThan(150);expect(bounds!.height).toBeGreaterThan(150);
    expect(await page.locator("canvas").evaluate(canvas=>(canvas as HTMLCanvasElement).width)).toBeGreaterThanOrEqual(420);
  }
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:"screenshots/v8-flappy-ready.png",animations:"disabled"});
  await page.getByRole("button",{name:"Start Flappy Flight",exact:true}).click();
  await expect(page.locator(".arcade-game")).toHaveClass(/phase-countdown/);
  await expect(page.locator(".arcade-game")).toHaveClass(/phase-playing/);
  await page.getByRole("button",{name:"Pause game",exact:true}).click();
  await expect(page.locator(".arcade-game")).toHaveClass(/phase-paused/);
  const hud=await page.locator(".arcade-hud").innerText();await page.waitForTimeout(600);expect(await page.locator(".arcade-hud").innerText()).toBe(hud);
  await page.getByRole("button",{name:"Resume",exact:true}).click();
  const field=page.getByRole("group",{name:/^Flappy Flight playfield/});await field.focus();
  for(let i=0;i<6;i++){await page.keyboard.press("Space");await page.waitForTimeout(600);}
  await page.screenshot({path:"screenshots/v8-flappy-playing.png",animations:"disabled"});
  await expect(page.getByRole("button",{name:"Play again",exact:true})).toBeVisible({timeout:22000});
  await expect(page.getByRole("status")).toContainText("Flappy Flight:");
  await page.screenshot({path:"screenshots/v8-flappy-finish.png",animations:"disabled"});
  await page.getByRole("button",{name:"Play again",exact:true}).click();await expect(page.locator(".arcade-game")).toHaveClass(/phase-countdown/);
  await page.getByRole("button",{name:"Reef Rescue",exact:true}).click();await expect(page.getByRole("button",{name:"Start Reef Rescue",exact:true})).toBeVisible();expect(errors).toEqual([]);
});

test("reef practice supports dragging, keyboard and reduced-motion play",async({page})=>{
  test.setTimeout(75000);await page.emulateMedia({reducedMotion:"reduce"});await page.setViewportSize({width:375,height:667});await page.goto("/arcade");
  await page.getByRole("button",{name:"Reef Rescue",exact:true}).click();
  await expect(page.getByText(/Drag up or down to move/)).toBeVisible();
  await page.screenshot({path:"screenshots/v8-reef-ready.png",animations:"disabled"});
  await page.getByRole("button",{name:"Start Reef Rescue",exact:true}).click();
  await expect(page.locator(".arcade-game")).toHaveClass(/phase-playing/);
  await expect(page.getByRole("button",{name:/Swim (up|down)/})).toHaveCount(0);
  const field=page.getByRole("group",{name:/^Reef Rescue playfield/});const bounds=await field.boundingBox();
  await page.mouse.move(bounds!.x+bounds!.width*.65,bounds!.y+bounds!.height*.3);await page.mouse.down();await page.mouse.move(bounds!.x+bounds!.width*.65,bounds!.y+bounds!.height*.75);await page.mouse.up();
  await page.waitForTimeout(180);await field.focus();await page.keyboard.press("ArrowUp");await page.waitForTimeout(180);await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(2800);await page.getByRole("button",{name:"Pause game",exact:true}).click();
  await page.screenshot({path:"screenshots/v8-reef-paused.png",animations:"disabled"});
  await page.getByRole("button",{name:"Resume",exact:true}).click();
  await expect(page.getByRole("button",{name:"Play again",exact:true})).toBeVisible({timeout:23000});
  await expect(page.getByRole("status")).toContainText("Reef Rescue:");
  await page.screenshot({path:"screenshots/v8-reef-finish.png",animations:"disabled"});
  await page.getByRole("button",{name:"Play again",exact:true}).click();await expect(page.locator(".arcade-points b")).toHaveText("0");
});
