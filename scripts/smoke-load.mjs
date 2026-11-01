// Local API verification. Creates only identifiable probe runs and hides their
// finished entries in finally; it never removes or modifies attendee results.
import assert from 'node:assert/strict';
const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3000';
const admin = process.env.TEST_ADMIN_TOKEN ?? 'polar-local';
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw new Error('This smoke check is restricted to a local server.');
const label = `Probe ${Date.now().toString(36)}`;
const players = [];
const durations = [];
async function call(path, body, token) {
  const response = await fetch(base + path, { method: body ? 'POST' : 'GET', headers: { ...(body ? {'Content-Type':'application/json'} : {}), ...(token ? {Authorization:`Bearer ${token}`} : {}) }, ...(body ? {body:JSON.stringify(body)} : {}), signal:AbortSignal.timeout(15000) });
  const data = await response.json();
  if (!response.ok) throw new Error(`${response.status}: ${data.error}`);
  return data;
}
try {
  await call('/api/admin', null, admin); // Do not create probes without cleanup access.
  await Promise.all(Array.from({length:40}, async (_, index) => {
    const player = await call('/api/runs', {nickname:`${label} ${index}`,country:'AQ',consent:true});
    players.push(player);
  }));
  for (let round=0;round<7;round++) {
    await Promise.all(players.map(async player => {
      const started = performance.now();
      player.run = await call(`/api/runs/${player.run.id}/actions`, {cardId:'save',revision:round,requestId:`probe-${round}-${player.run.id}`}, player.token);
      durations.push(performance.now()-started);
      assert.equal(player.run.round,round+1);
    }));
  }
  const board = await call('/api/leaderboard');
  assert.equal(board.entries.filter(entry=>entry.nickname.startsWith(label)).length,40);
  durations.sort((a,b)=>a-b);
  console.log(JSON.stringify({players:40,actions:durations.length,p95Ms:Math.round(durations[Math.floor(durations.length*.95)]),maxMs:Math.round(durations.at(-1)),server:'local development',venueNetworkTested:false}));
} finally {
  let hidden=0;
  for (const player of players) {
    const run = await call(`/api/runs/${player.run.id}`,null,player.token);
    if (run.finishedAt) { await call('/api/admin',{id:run.id,hidden:true},admin); hidden++; }
  }
  console.log(`Hidden ${hidden} completed probe entries; attendee results untouched.`);
}
