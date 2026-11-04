// Experimental adapter to the public En-ROADS UI.
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';

const controls = JSON.parse(await readFile(new URL('../src/game/enroads-controls.json', import.meta.url), 'utf8'));
const version = '26.10.0';
const profile = 'enroads-main-26.10.0-defaults-2026-10-31';
let browser;

async function numericAttribute(locator, name) {
  const value = await locator.getAttribute(name);
  if (value === null || !value.trim() || !Number.isFinite(Number(value))) {
    throw new Error(`Missing or invalid ${name}`);
  }
  return Number(value);
}

async function evaluate(settings) {
  if (!settings || Object.keys(settings).length !== controls.length || controls.some(c =>
    !Number.isFinite(settings[c.id]) || settings[c.id] < c.min || settings[c.id] > c.max
  ) || !Number.isInteger(settings['new-zero'])) throw new Error('Invalid scenario settings');

  if (!browser?.isConnected()) {
    browser = await chromium.launch({ channel: process.env.ENROADS_BROWSER_CHANNEL || 'msedge', headless: true });
  }
  // Each scenario starts in a fresh context with its own storage and defaults.
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' });
  const deadline = setTimeout(() => { void context.close().catch(() => {}); }, 145000);
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const temperature = page.locator('.primary-temp-value');
    async function load(url) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.locator('#basic63').waitFor({ state: 'attached', timeout: 60000 });
      await temperature.waitFor({ timeout: 60000 });
    }
    const fieldFor = c => page.locator(`#${c.input}`);
    const handleFor = c => fieldFor(c).locator('..').locator('.min-slider-handle');
    const read = async () => Object.fromEntries(await Promise.all(controls.map(async c => [
      c.id, await numericAttribute(fieldFor(c), 'data-value'),
    ])));

    await load(`https://en-roads.climateinteractive.org/scenario.html?v=${version}`);
    if (!(await page.locator('body').innerText()).includes('v26.10')) throw new Error('Unexpected simulator version');
    const initial = await read();
    await Promise.all(controls.map(async c => {
      const handle = handleFor(c);
      const [min, max] = await Promise.all([numericAttribute(handle, 'aria-valuemin'), numericAttribute(handle, 'aria-valuemax')]);
      if (initial[c.id] !== c.baseline || min !== c.min || max !== c.max) {
        throw new Error(`Default or range changed: ${c.id}`);
      }
    }));
    const welcome = page.getByText('Get Started', { exact: true });
    if (await welcome.isVisible()) await welcome.click();

    for (const c of controls) {
      const target = settings[c.id];
      if (target === c.baseline) continue;
      const field = fieldFor(c);
      await handleFor(c).focus();
      await page.keyboard.press('ArrowRight');
      const current = await numericAttribute(field, 'data-value');
      const step = current - c.baseline;
      if (step <= 0) throw new Error(`Keyboard step changed: ${c.id}`);
      const distance = (target - current) / step;
      const count = Math.round(Math.abs(distance));
      if (Math.abs(Math.abs(distance) - count) > 1e-5 || count > 1000) throw new Error(`Unreachable target: ${c.id}`);
      const key = distance > 0 ? 'ArrowRight' : 'ArrowLeft';
      for (let n = 0; n < count; n++) await page.keyboard.press(key);
      if (Math.abs(await numericAttribute(field, 'data-value') - target) > 1e-7) {
        throw new Error(`Entry mismatch: ${c.id}`);
      }
    }

    // Reopen the public share URL and verify that it carries all 19 settings.
    const sourceUrl = page.url();
    if (new URL(sourceUrl).searchParams.get('v') !== version) throw new Error('Version changed');
    await load(sourceUrl);
    const readback = await read();
    if (controls.some(c => Math.abs(readback[c.id] - settings[c.id]) > 1e-7)) {
      throw new Error('Complete scenario readback mismatch');
    }
    const started = Date.now();
    let last = '', stable = 0;
    while (Date.now() - started < 20000) {
      const value = (await temperature.innerText()).trim();
      stable = value === last ? stable + 1 : 0;
      last = value;
      if (stable >= 5 && Date.now() - started >= 2500) break;
      await page.waitForTimeout(500);
    }
    const temperatureC = Number(last.replace('−', '-'));
    if (stable < 5 || !last || !Number.isFinite(temperatureC)) throw new Error('Temperature did not settle');
    return { temperatureC, modelVersion: version, profile, provider: 'public-ui-experimental', sourceUrl,
      evaluatedAt: new Date().toISOString(), readback };
  } finally {
    clearTimeout(deadline);
    await context.close().catch(() => {});
  }
}

if (process.argv.includes('--worker') && process.send) {
  // The parent submits at most one job at a time and supplies a restricted environment.
  process.on('message', async settings => {
    try {
      const result = await evaluate(settings);
      if (process.connected) process.send({ result });
    } catch (error) {
      if (process.connected) process.send({ error: error.message });
    }
  });
  process.on('disconnect', () => { void browser?.close().catch(() => {}); });
} else {
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
    if (input.length > 4096) throw new Error('Input too large');
  }
  try { process.stdout.write(JSON.stringify(await evaluate(JSON.parse(input)))); }
  finally { await browser?.close(); }
}
