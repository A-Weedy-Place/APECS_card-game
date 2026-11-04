import { Pool, type PoolClient } from "pg";
import { SUPABASE_CA } from "./supabase-ca";
const global = globalThis as typeof globalThis & { copPostgres?: Map<string, Pool> };
export function pool() {
  const url=process.env.DATABASE_URL;
  if(!url)throw new Error("DATABASE_URL is required.");
  global.copPostgres??=new Map();let value=global.copPostgres.get(url);
  if(!value){
    // Use Supabase's transaction pooler with unnamed queries, never named prepares.
    const connection=new URL(url),supabase=connection.hostname.endsWith(".pooler.supabase.com");
    if(supabase){for(const key of ["ssl","sslmode","sslrootcert","sslcert","sslkey","uselibpqcompat"])connection.searchParams.delete(key);}
    value=new Pool({connectionString:connection.toString(),...(supabase?{ssl:{ca:SUPABASE_CA,rejectUnauthorized:true}}:{}),max:3,idleTimeoutMillis:10000,connectionTimeoutMillis:10000,allowExitOnIdle:true,statement_timeout:10000,application_name:"apecs-game"});
    value.on("error",()=>console.error("Hosted database connection closed unexpectedly."));
    global.copPostgres.set(url,value);
  }
  return value;
}
export async function transaction<T>(fn:(client:PoolClient)=>Promise<T>) {
  const client = await pool().connect();
  let discard = false;
  // The pool's idle error listener is detached while the client is checked out.
  const connectionLost = () => { discard = true; };
  client.on("error", connectionLost);
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout='5s'");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    if (!discard) {
      try { await client.query("ROLLBACK"); }
      catch { discard = true; }
    }
    throw error;
  } finally {
    client.release(discard);
    client.off("error", connectionLost);
  }
}
