// Runs the real browser adapter against a self-contained fixture, outside the game/queue.
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { registerHooks } from 'node:module';
import { chromium as playwright } from 'playwright-core';

const adapter = new URL('./enroads-browser.mjs', import.meta.url);
const controls = JSON.parse(await readFile(new URL('../src/game/enroads-controls.json', import.meta.url), 'utf8'));
const origin = 'https://en-roads.climateinteractive.org';
const trace = phase => { if (process.env.BENCH_TRACE) console.error(phase); };
const fixture = `<!doctype html><meta charset="utf-8"><title>Browser test fixture</title>
<style>
  #controls { display:grid; grid-template-columns:repeat(3,1fr); gap:1em; padding:1em; }
  .slider-track { position:relative; height:24px; background:#ddd; }
  .min-slider-handle { position:absolute; height:100%; pointer-events:none; }
</style>
<p>v26.11 synthetic fixture</p><output class="primary-temp-value">0.0</output><div id="controls"></div>
<script>
  const url = new URL(location.href);
  for (const c of ${JSON.stringify(controls)}) {
    const row = document.createElement('section');
    row.innerHTML = '<input type="hidden"><div class="slider-track"><button class="min-slider-handle"></button></div>';
    const field = row.querySelector('input');
    const track = row.querySelector('.slider-track');
    const handle = row.querySelector('button');
    const step = Number.isInteger(c.baseline) ? 1 : 0.1;
    field.id = c.input;
    handle.setAttribute('aria-valuemin', c.min);
    handle.setAttribute('aria-valuemax', c.max);
    function set(value) {
      const next = Math.min(c.max, Math.max(c.min, Number((Math.round(value / step) * step).toFixed(4))));
      field.dataset.value = next;
      handle.style.left = (100 * (next - c.min) / (c.max - c.min)) + '%';
      url.searchParams.set(c.id, next);
      history.replaceState(null, '', url);
    }
    set(url.searchParams.has(c.id) ? Number(url.searchParams.get(c.id)) : c.baseline);
    track.addEventListener('click', event => {
      const box = track.getBoundingClientRect();
      set(c.min + (c.max - c.min) * (event.clientX - box.left) / box.width);
    });
    handle.addEventListener('keydown', event => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        set(Number(field.dataset.value) + (event.key === 'ArrowRight' ? step : -step));
      }
    });
    document.querySelector('#controls').append(row);
  }
</script>`;

// Redirect adapter navigation to a private fixture. This module is injected
// only in benchmark children, whose browser cannot resolve the real site.
export const chromium = {
  async launch(options) {
    const blockRealHost = `--host-resolver-rules=MAP ${new URL(origin).hostname} ~NOTFOUND`;
    trace('Launching browser');
    const browserOptions = process.platform === 'linux' ? { headless: true } : options;
    const browser = await playwright.launch({ ...browserOptions, args: [blockRealHost], timeout: 15000 });
    trace('Browser ready');
    return {
      isConnected: () => browser.isConnected(),
      close: () => browser.close(),
      async newContext(options) {
        const context = await browser.newContext({ ...options, serviceWorkers: 'block' });
        trace('Browser context ready');
        const fixtureOrigin = `http://127.0.0.1:${process.env.BENCH_FIXTURE_PORT}`;
        return {
          close: () => context.close(),
          async newPage() {
            const page = await context.newPage();
            const goto = page.goto.bind(page);
            page.goto = (url, options) => {
              const target = new URL(url);
              assert.ok([origin, fixtureOrigin].includes(target.origin));
              trace('Loading fixture navigation');
              return goto(new URL(target.pathname + target.search, fixtureOrigin).href, options);
            };
            return page;
          },
        };
      },
    };
  },
};

function evaluate(child, settings) {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const timer = setTimeout(() => finish(new Error('Benchmark scenario timed out')), 45000);
    function finish(error, elapsed) {
      clearTimeout(timer);
      child.off('message', receive);
      child.off('disconnect', disconnected);
      child.off('error', finish);
      if (error) reject(error);
      else resolve(elapsed);
    }
    function disconnected() { finish(new Error('Benchmark browser worker disconnected')); }
    function receive({ result, error }) {
      try {
        assert.ok(result, error);
        assert.equal(result.temperatureC, 0, 'Only fixture output is accepted');
        assert.deepEqual(result.readback, settings);
        finish(null, performance.now() - start);
      } catch (failure) { finish(failure); }
    }
    child.once('message', receive);
    child.once('disconnect', disconnected);
    child.once('error', finish);
    child.send(settings, error => { if (error) finish(error); });
  });
}

async function batch(scenarios, concurrency, port) {
  const start = performance.now();
  const children = Array.from({ length: concurrency }, () => fork(adapter, ['--worker'], {
    execArgv: ['--import', import.meta.url], windowsHide: true,
    stdio: ['ignore', 'ignore', 'inherit', 'ipc'],
    env: { ...process.env, BENCH_FIXTURE_PORT: String(port) },
  }));
  try {
    const samples = await Promise.all(children.map(async (child, index) => {
      const times = [];
      for (let i = index; i < scenarios.length; i += concurrency) times.push(await evaluate(child, scenarios[i]));
      return times;
    }));
    return { wallMs: Math.round(performance.now() - start), jobs: scenarios.length,
      coldMs: samples.map(times => Math.round(times[0])), warmMs: samples.flatMap(times => times.slice(1)).map(Math.round) };
  } finally {
    for (const child of children) if (child.connected) child.disconnect();
  }
}

if (process.argv.includes('--worker')) {
  registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === 'playwright' && context.parentURL === adapter.href) return { url: import.meta.url, shortCircuit: true };
      return nextResolve(specifier, context);
    },
  });
} else {
  assert.equal(controls.length, 19);
  const sparse = new Set(['coal', 'renewables', 'new-zero', 'transport-efficiency']);
  const scenario = (change, useMin) => Object.fromEntries(controls.map(c => [c.id,
    change(c) ? useMin && c.min !== c.baseline ? c.min : c.max : c.baseline]));
  const inputs = [scenario(() => false), scenario(c => sparse.has(c.id)), scenario(() => true, true)];
  const scenarios = [...inputs, inputs[1], inputs[2], inputs[0], inputs[2], inputs[0], inputs[1]];
  const smoke = process.argv.includes('--smoke');
  const server = createServer((_request, response) => {
    trace('Serving fixture');
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'" }).end(fixture);
  });
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  try {
    const { port } = server.address();
    const serial = await batch(smoke ? scenarios.slice(0, 1) : scenarios, 1, port);
    const parallel = smoke ? undefined : await batch(scenarios, 3, port);
    console.log(JSON.stringify({ fixtureOnly: true, platform: process.platform, node: process.version,
      controlsPerJob: controls.length, serial, parallel }));
  } finally { server.close(); }
}
