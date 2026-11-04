-- Server-only game storage. No client key can read seeds, session hashes or records.
create schema if not exists apecs;
revoke all on schema apecs from public, anon, authenticated;
do $$ begin
  if not exists (select 1 from pg_roles where rolname='apecs_server') then
    create role apecs_server login noinherit;
  end if;
end $$;
grant usage on schema apecs to apecs_server;
create table apecs.runs (
  id text primary key, token_hash text not null, state text not null,
  score integer, finished_at text, hidden integer not null default 0 check(hidden in (0,1)), created_at text not null
);
create index runs_finished on apecs.runs(created_at desc,id);
create index runs_current on apecs.runs((state::jsonb->>'rulesVersion')) where finished_at is not null and hidden=0;
create table apecs.actions (
  run_id text not null references apecs.runs(id), request_id text not null,
  response text not null, created_at text, primary key(run_id,request_id)
);
create index actions_activity on apecs.actions(run_id,created_at);
create table apecs.run_controls (
  run_id text primary key references apecs.runs(id), display_name text, country text,
  score_override integer, deleted integer not null default 0 check(deleted in (0,1)), revision integer not null default 0
);
create table apecs.browser_passes (group_hash text primary key,used integer not null default 0 check(used>=0));
create table apecs.run_attempts (
  group_hash text not null references apecs.browser_passes(group_hash),request_id text not null,
  run_id text not null references apecs.runs(id),primary key(group_hash,request_id),unique(run_id)
);
create table apecs.admin_audit (id text primary key,run_id text,action text not null,changes text not null,created_at text not null);
create index audit_activity on apecs.admin_audit(run_id,created_at desc);
create table apecs.event_settings (key text primary key,value text not null);
create table apecs.model_evaluations (
  scenario_key text primary key,status text not null check(status in ('queued','running','failed','complete')),result text,error text,updated_at text not null
);
create table apecs.rate_limits (key text primary key,count integer not null,until_ms bigint not null);
-- Only this dedicated server role can use the private tables. No DDL or hard-delete grant.
do $$ declare t text; begin
  foreach t in array array['runs','actions','run_controls','browser_passes','run_attempts','admin_audit','event_settings','model_evaluations','rate_limits'] loop
    execute format('alter table apecs.%I enable row level security',t);
    execute format('revoke all on apecs.%I from public,anon,authenticated',t);
    execute format('grant select,insert,update on apecs.%I to apecs_server',t);
    execute format('create policy server_access on apecs.%I to apecs_server using (true) with check (true)',t);
  end loop;
end $$;
-- Set apecs_server's generated password separately; never include credentials in migrations.
