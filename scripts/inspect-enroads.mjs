// Read-only inspection of the public simulator UI. Never used by game runtime.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.goto('https://en-roads.climateinteractive.org/scenario.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.getByText('Population',{exact:true}).first().waitFor({timeout:60000});
  await mkdir('screenshots/enroads-2026-10-31',{recursive:true});
  const snapshot=await page.locator('body').innerText();
  const structure=await page.locator('[role=slider],input[type=range]').first().evaluate(node=>[node,node.parentElement,node.parentElement?.parentElement,node.parentElement?.parentElement?.parentElement].map(element=>element?.outerHTML.slice(0,5000)));
  console.log(JSON.stringify({structure}));
  const sliders=await page.locator('[role=slider],input[type=range]').evaluateAll(nodes=>nodes.map(node=>({id:node.id,label:node.getAttribute('aria-label'),value:node.getAttribute('aria-valuenow')??node.value,min:node.getAttribute('aria-valuemin')??node.min,max:node.getAttribute('aria-valuemax')??node.max})));
  await writeFile('screenshots/enroads-2026-10-31/main.json',JSON.stringify({url:page.url(),snapshot,sliders},null,2));
  await page.screenshot({path:'screenshots/enroads-2026-10-31/main.png',fullPage:true});
  console.log(JSON.stringify({url:page.url(),snapshot,sliders}));
  const welcome=page.getByText('Get Started',{exact:true});if(await welcome.isVisible())await welcome.click();
  await page.getByText('Population',{exact:true}).first().click();
  console.log('DETAIL '+JSON.stringify({text:await page.locator('body').innerText(),inputs:await page.locator('input').evaluateAll(nodes=>nodes.map(node=>({type:node.type,value:node.value,min:node.min,max:node.max,step:node.step,label:node.getAttribute('aria-label'),html:node.outerHTML.slice(0,450)})))}));
  await page.screenshot({path:'screenshots/enroads-2026-10-31/population.png',fullPage:true});
  await page.locator('input:visible').first().fill('9.7');await page.locator('input:visible').first().press('Enter');await page.locator('input:visible').first().press('Tab');
  console.log('CHANGED '+JSON.stringify({url:page.url(),temperatureNodes:await page.getByText(/ºC/).evaluateAll(nodes=>nodes.map(node=>node.outerHTML.slice(0,1500))),buttons:await page.locator('button').evaluateAll(nodes=>nodes.filter(node=>node.getBoundingClientRect().width>0).map(node=>({text:node.textContent,title:node.title,label:node.getAttribute('aria-label'),html:node.outerHTML.slice(0,500)})))}));
  await page.keyboard.press('Escape');console.log('ESC '+(await page.locator('input:visible').count()));
  console.log('CLOSE '+JSON.stringify(await page.locator('a,[role=button],.close').evaluateAll(nodes=>nodes.filter(node=>node.getBoundingClientRect().width>0).map(node=>({text:node.textContent?.slice(0,65),title:node.getAttribute('title'),label:node.getAttribute('aria-label'),html:node.outerHTML.slice(0,300)})))));
  console.log('TEMP '+await page.locator('.primary-temp-units').evaluate(node=>node.parentElement.outerHTML));
  console.log('PANEL '+await page.locator('input:visible').first().evaluate(node=>{let a=node;for(let i=0;i<7;i++)a=a.parentElement;return a.outerHTML.slice(0,9000);}));
}finally{await browser.close();}
