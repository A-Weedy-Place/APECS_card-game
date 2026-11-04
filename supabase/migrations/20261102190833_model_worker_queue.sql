-- Durable complete-scenario jobs. No player identities, run seeds or recovery keys.
create table apecs.model_jobs (
 scenario_key text primary key, settings text not null,
 status text not null check(status in ('queued','running','failed','complete')),
 attempts integer not null default 0, lease_token text, lease_until bigint,
 created_at text not null, updated_at text not null
);
create index model_jobs_claim on apecs.model_jobs(status,created_at);
alter table apecs.model_jobs enable row level security;
revoke all on apecs.model_jobs from public,anon,authenticated;
grant select,insert,update on apecs.model_jobs to apecs_server;
create policy server_access on apecs.model_jobs to apecs_server using (true) with check (true);
do $$ begin
 if not exists(select 1 from pg_roles where rolname='apecs_worker') then create role apecs_worker login noinherit; end if;
end $$;
grant usage on schema apecs to apecs_worker;
grant select,update on apecs.model_jobs to apecs_worker;
grant select,insert,update on apecs.model_evaluations to apecs_worker;
create policy worker_jobs on apecs.model_jobs to apecs_worker using (true) with check (true);
create policy worker_results on apecs.model_evaluations to apecs_worker using (true) with check (true);
-- The separately generated worker password never enters migration history.
