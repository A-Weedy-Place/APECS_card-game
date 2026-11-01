// Opt-in real network smoke test. Separate port/database; never touches player preview records.
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:3002',database=`./data/model-runtime-${Date.now()}.sqlite`;
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3002'],{windowsHide:true,env:{...process.env,DATABASE_PATH:database,ADMIN_TOKEN:'model-runtime-test-only',ENROADS_BROWSER_ENABLED:'1'},stdio:['ignore','pipe','pipe']});
let log='',listening=false;server.stdout.on('data',c=>{log=(log+c).slice(-3000);if(String(c).includes('Ready'))listening=true;});server.stderr.on('data',c=>{log=(log+c).slice(-3000);});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function call(path,method='GET',body,token){const response=await fetch(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await response.json();assert.ok(response.ok,JSON.stringify(data));return data;}
try{
 let ready=false;for(let i=0;i<100;i++){assert.equal(server.exitCode,null,log);try{if(listening&&(await fetch(base)).ok){ready=true;break;}}catch{}await wait(300);}assert.ok(ready,log);
 const run=await call('/api/runs','POST',{nickname:'Model runtime test',country:'AQ',consent:true});let game=run.run;
 assert.equal((await fetch(`${base}/api/runs/${game.id}/model`)).status,401);
 for(let n=0;n<10;n++)game=await call(`/api/runs/${game.id}/actions`,'POST',{cardId:'save',revision:game.revision,requestId:`runtime-test-round-${n}`},run.token);
 assert.equal(game.score,null);assert.equal((await call('/api/leaderboard')).entries.length,0);
 const clock=game.elapsedMs,started=Date.now();let result=await call(`/api/runs/${game.id}/model`,'POST',{},run.token);
 for(let n=0;n<100&&['queued','running'].includes(result.status);n++){await wait(2000);result=await call(`/api/runs/${game.id}/model`,'GET',undefined,run.token);}
 assert.equal(result.status,'complete',JSON.stringify(result));assert.equal(result.temperatureC,3.3);assert.equal(result.modelVersion,'26.10.0');
 const saved=await call(`/api/runs/${game.id}`,'GET',undefined,run.token);assert.equal(saved.elapsedMs,clock);assert.equal(saved.projection.kind,'model');assert.equal(saved.projection.temperatureC,3.3);assert.equal('pressure'in saved.projection,false);
 const cached=await call(`/api/runs/${game.id}/model`,'POST',{},run.token);assert.deepEqual(cached,result);
 const board=await call('/api/leaderboard');assert.equal(board.entries[0].temperatureC,3.3);assert.equal(board.entries[0].elapsedMs,clock);
 console.log(JSON.stringify({verified:true,database,temperatureC:result.temperatureC,modelVersion:result.modelVersion,modelSeconds:(Date.now()-started)/1000,playTimeUnchanged:true,cachedRepeat:true,leaderboard:true,sourceUrl:result.sourceUrl}));
}finally{server.kill();}
