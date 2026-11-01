// Local, experimental adapter to the public UI. No SDK, private API, or model code is bundled.
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
const controls=JSON.parse(await readFile(new URL('../src/game/enroads-controls.json',import.meta.url),'utf8'));
const version='26.10.0',profile='enroads-main-26.10.0-defaults-2026-10-31';
let input='';for await(const chunk of process.stdin){input+=chunk;if(input.length>4096)throw new Error('Input too large');}
const settings=JSON.parse(input);
if(!settings||Object.keys(settings).length!==controls.length||controls.some(c=>!Number.isFinite(settings[c.id])||settings[c.id]<c.min||settings[c.id]>c.max)||!Number.isInteger(settings['new-zero']))throw new Error('Invalid scenario settings');
const browser=await chromium.launch({channel:process.env.ENROADS_BROWSER_CHANNEL||'msedge',headless:true});
const deadline=setTimeout(()=>{void browser.close();},165000);
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},locale:'en-US'});page.setDefaultTimeout(15000);
 async function load(url){await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});await page.locator('#basic63').waitFor({state:'attached',timeout:60000});await page.locator('.primary-temp-value').waitFor({timeout:60000});}
 const read=async()=>Object.fromEntries(await Promise.all(controls.map(async c=>[c.id,Number(await page.locator(`#${c.input}`).getAttribute('data-value'))])));
 await load(`https://en-roads.climateinteractive.org/scenario.html?v=${version}`);
 if(!((await page.locator('body').innerText()).includes('v26.10')))throw new Error('Unexpected simulator version');
 const initial=await read();
 for(const c of controls){const handle=page.locator(`#${c.input}`).locator('..').locator('.min-slider-handle');if(initial[c.id]!==c.baseline||Number(await handle.getAttribute('aria-valuemin'))!==c.min||Number(await handle.getAttribute('aria-valuemax'))!==c.max)throw new Error(`Default or range changed: ${c.id}`);}
 const welcome=page.getByText('Get Started',{exact:true});if(await welcome.isVisible())await welcome.click();
 for(const c of controls){
  const target=settings[c.id];if(target===c.baseline)continue;
  const field=page.locator(`#${c.input}`),handle=field.locator('..').locator('.min-slider-handle');await handle.focus();
  await handle.press('ArrowRight');let current=Number(await field.getAttribute('data-value'));const step=current-c.baseline;
  if(step<=0)throw new Error(`Keyboard step changed: ${c.id}`);
  const distance=(target-current)/step,count=Math.round(Math.abs(distance));
  if(Math.abs(Math.abs(distance)-count)>1e-5||count>1000)throw new Error(`Unreachable target: ${c.id}`);
  for(let n=0;n<count;n++)await handle.press(distance>0?'ArrowRight':'ArrowLeft');
  current=Number(await field.getAttribute('data-value'));if(Math.abs(current-target)>1e-7)throw new Error(`Entry mismatch: ${c.id}`);
 }
 // Reload the share URL produced by the UI to verify the complete package survives serialization.
 const sourceUrl=page.url();if(new URL(sourceUrl).searchParams.get('v')!==version)throw new Error('Version changed');
 await load(sourceUrl);const readback=await read();
 if(controls.some(c=>Math.abs(readback[c.id]-settings[c.id])>1e-7))throw new Error('Complete scenario readback mismatch');
 const started=Date.now();let last='',stable=0;
 while(Date.now()-started<20000){const value=(await page.locator('.primary-temp-value').innerText()).trim();stable=value===last?stable+1:0;last=value;if(stable>=5&&Date.now()-started>=2500)break;await page.waitForTimeout(500);}
 const temperatureC=Number(last.replace('−','-'));if(stable<5||!Number.isFinite(temperatureC))throw new Error('Temperature did not settle');
 process.stdout.write(JSON.stringify({temperatureC,modelVersion:version,profile,provider:'public-ui-experimental',sourceUrl,evaluatedAt:new Date().toISOString(),readback}));
}finally{clearTimeout(deadline);await browser.close();}
