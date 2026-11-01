// Read-only visual research in an isolated browser profile; no game assets copied.
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
await mkdir('screenshots/references', { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  for (const [name, url] of [['spire', 'https://store.steampowered.com/app/646570/Slay_the_Spire/'], ['paladins', 'https://store.steampowered.com/app/444090/Paladins/'], ['balatro', 'https://store.steampowered.com/app/2379780/Balatro/']]) {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
      const blocked = /captcha|verify you are human/i.test(await page.locator('body').innerText());
      if (blocked) { console.log(`${name}: verification page; stopped`); await page.close(); continue; }
      await page.locator('.highlight_strip_item').first().waitFor({ timeout: 15000 }).catch(() => {});
      await page.screenshot({ path: `screenshots/references/${name}-store.png` });
      const shots = page.locator('.highlight_strip_item.highlight_screenshot');
      if (await shots.count()) {
        await shots.first().click();
        await page.waitForTimeout(1200);
        await page.screenshot({ path: `screenshots/references/${name}-gameplay.png` });
      } else {
        const app = name === 'spire' ? '646570' : name === 'paladins' ? '444090' : '2379780';
        const info = await (await page.request.get(`https://store.steampowered.com/api/appdetails?appids=${app}`)).json().catch(() => ({}));
        const source = info[app]?.data?.screenshots?.[name === 'paladins' ? 4 : 0]?.path_full;
        if (source) {
          const imagePage = await browser.newPage({ viewport: { width: 1366, height: 900 } });
          await imagePage.goto(source, { waitUntil: 'load', timeout: 30000 });
          await imagePage.screenshot({ path: `screenshots/references/${name}-gameplay.png` });
          await imagePage.close();
        }
      }
      const videos = page.locator('video');
      if (await videos.count()) {
        const played = await videos.first().evaluate(async video => { video.muted = true; try { await video.play(); return true; } catch { return false; } });
        if (played) {
          await page.waitForTimeout(4500);
          console.log(`${name}: trailer playback ${await videos.first().evaluate(video => video.currentTime)} seconds; zero means playback unavailable`);
          await page.screenshot({ path: `screenshots/references/${name}-trailer.png` });
        }
      }
      console.log(`${name}: inspected official store/trailer layout`);
    } catch (error) { console.log(`${name}: ${error.message.split('\n')[0]}`); }
    await page.close();
  }
} finally { await browser.close(); }
