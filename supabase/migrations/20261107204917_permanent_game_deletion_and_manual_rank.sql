alter table apecs.run_controls
  add column manual_rank integer check (manual_rank between 1 and 10);

alter table apecs.actions drop constraint actions_run_id_fkey,
  add constraint actions_run_id_fkey foreign key (run_id) references apecs.runs(id) on delete cascade;
alter table apecs.run_controls drop constraint run_controls_run_id_fkey,
  add constraint run_controls_run_id_fkey foreign key (run_id) references apecs.runs(id) on delete cascade;
alter table apecs.admin_audit
  add constraint admin_audit_run_id_fkey foreign key (run_id) references apecs.runs(id) on delete cascade not valid;

-- Keep the browser allowance and request receipt. Remove their link to the deleted game.
alter table apecs.run_attempts alter column run_id drop not null,
  drop constraint run_attempts_run_id_fkey,
  add constraint run_attempts_run_id_fkey foreign key (run_id) references apecs.runs(id) on delete set null;

-- The authenticated application admin endpoint is the only application caller of DELETE.
-- Foreign keys clean up the dependent rows without separate DELETE grants.
grant delete on apecs.runs to apecs_server;
