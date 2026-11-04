// Run after `vercel link`. Credentials travel over stdin, never argv or logs.
import {spawn} from 'node:child_process';
import {join} from 'node:path';
process.loadEnvFile('.env.local');process.loadEnvFile('.env.deploy.local');
const cli=process.env.VERCEL_CLI_ENTRY??join(process.env.APPDATA??'','npm/node_modules/vercel/dist/vc.js');
const entries={DATABASE_URL:process.env.DATABASE_URL,ADMIN_PASSWORD_HASH:process.env.ADMIN_PASSWORD_HASH,ADMIN_SESSION_SECRET:process.env.ADMIN_SESSION_SECRET,ENROADS_BROWSER_ENABLED:'0',MODEL_QUEUE_ENABLED:'1'};
for(const [key,value] of Object.entries(entries)){
  if(!value)throw new Error(`Missing ${key}`);
  await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[cli,'env','add',key,'--environment','production','--sensitive','--force','--yes','--non-interactive'],{windowsHide:true,stdio:['pipe','inherit','inherit']});
    child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(`Could not set ${key}`)));child.stdin.end(value);
  });
}
