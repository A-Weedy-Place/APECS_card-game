import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
const controls=JSON.parse(await readFile(new URL('../src/game/enroads-controls.json',import.meta.url),'utf8'));
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.goto('https://en-roads.climateinteractive.org/scenario.html?v=26.10.0',{waitUntil:'domcontentloaded',timeout:60000});
 await page.locator('#basic63').waitFor({state:'attached',timeout:60000});
 const welcome=page.getByText('Get Started',{exact:true});if(await welcome.isVisible())await welcome.click();
 console.log('STRUCTURE',await page.locator('#basic516').evaluate(n=>n.parentElement.parentElement.parentElement.outerHTML));
 for(const id of ['new-zero','nature-removal','tech-removal','coal']){
  const control=controls.find(c=>c.id===id);
  const slider=page.locator(`#${control.input}`).locator('..').locator('.min-slider-handle');
  console.log('SLIDER',id,await slider.count());
  await slider.focus();await slider.press('ArrowRight');
  console.log('KEY',id,await page.locator(`#${control.input}`).getAttribute('data-value'),page.url());
 }
}finally{await browser.close();}
