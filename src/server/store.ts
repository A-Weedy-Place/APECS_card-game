import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { createRun, GameError, publicRun, redactPublicRun, takeAction, takeCardBatch, takeSpecialAction } from "@/game/engine";
import type { AdminActivity, AdminData, AdminRecord, AttemptStatus, LeaderboardEntry, PublicRun, RunState, SpecialCommand } from "@/game/types";
import { journalModeFor } from "./database-config";
import { RULES_VERSION } from "@/game/config";
import { settingsFor } from "@/game/catalogues";
import { orderLeaderboard } from "@/game/ranking";
import { STAGED_VERSIONS, stagedRules } from "@/game/v11-schedule";
import { scenarioKey, validateModelResult, type ModelResult } from "./model-result";
import { LEGACY_MODEL_PROFILE } from "@/game/policy-catalogue";
import { evaluationFromRow } from "./evaluation";
import { assertPlayerNameAvailable, cleanPlayerName, playerNameKey, type NameRecord } from "./player-name";

const databases = globalThis as typeof globalThis & { copDatabases?: Map<string, DatabaseSync> };
const upgraded = new WeakSet<DatabaseSync>();
function db() {
  // Runtime database files must not be traced into a deployment bundle.
  const path = resolve(/* turbopackIgnore: true */ process.env.DATABASE_PATH ?? "./data/game.sqlite");
  databases.copDatabases ??= new Map();
  let connection = databases.copDatabases.get(path);
  if (!connection) {
    mkdirSync(dirname(path), { recursive: true });
    connection = new DatabaseSync(path);
    const version = (connection.prepare("SELECT sqlite_version() AS version").get() as { version: string }).version;
    connection.exec(`PRAGMA journal_mode=${journalModeFor(version)};`);
    connection.exec(`
      PRAGMA busy_timeout=5000;
      PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS runs (
        id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, state TEXT NOT NULL,
        score INTEGER, finished_at TEXT, hidden INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS scores ON runs(score DESC, finished_at ASC);
      CREATE TABLE IF NOT EXISTS actions (
        run_id TEXT NOT NULL REFERENCES runs(id), request_id TEXT NOT NULL,
        response TEXT NOT NULL, PRIMARY KEY(run_id, request_id)
      );
    `);
    databases.copDatabases.set(path, connection);
  }
  if (!upgraded.has(connection)) {
    connection.exec(`
      CREATE TABLE IF NOT EXISTS run_controls (
        run_id TEXT PRIMARY KEY REFERENCES runs(id), display_name TEXT, country TEXT,
        score_override INTEGER, deleted INTEGER NOT NULL DEFAULT 0, revision INTEGER NOT NULL DEFAULT 0,
        manual_rank INTEGER CHECK (manual_rank BETWEEN 1 AND 10)
      );
      CREATE TABLE IF NOT EXISTS browser_passes (group_hash TEXT PRIMARY KEY, used INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS run_attempts (
        group_hash TEXT NOT NULL, request_id TEXT NOT NULL, run_id TEXT REFERENCES runs(id),
        PRIMARY KEY(group_hash, request_id)
      );
      CREATE TABLE IF NOT EXISTS admin_audit (id TEXT PRIMARY KEY, run_id TEXT, action TEXT NOT NULL, changes TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS event_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS model_evaluations (scenario_key TEXT PRIMARY KEY, status TEXT NOT NULL, result TEXT, error TEXT, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, until_ms INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS attempts_run ON run_attempts(run_id);
    `);
    const columns = connection.prepare("PRAGMA table_info(actions)").all() as {name:string}[];
    if (!columns.some(column => column.name === "created_at")) connection.exec("ALTER TABLE actions ADD COLUMN created_at TEXT");
    const controlColumns = connection.prepare("PRAGMA table_info(run_controls)").all() as {name:string}[];
    if (!controlColumns.some(column => column.name === "manual_rank")) {
      connection.exec("ALTER TABLE run_controls ADD COLUMN manual_rank INTEGER CHECK (manual_rank BETWEEN 1 AND 10)");
    }
    const attemptColumns = connection.prepare("PRAGMA table_info(run_attempts)").all() as {name:string;notnull:number}[];
    if (attemptColumns.some(column => column.name === "run_id" && column.notnull)) {
      connection.exec("BEGIN IMMEDIATE");
      try {
        connection.exec(`
          ALTER TABLE run_attempts RENAME TO previous_run_attempts;
          CREATE TABLE run_attempts (
            group_hash TEXT NOT NULL, request_id TEXT NOT NULL, run_id TEXT REFERENCES runs(id),
            PRIMARY KEY(group_hash, request_id)
          );
          INSERT INTO run_attempts SELECT group_hash, request_id, run_id FROM previous_run_attempts;
          DROP TABLE previous_run_attempts;
          CREATE INDEX attempts_run ON run_attempts(run_id);
          COMMIT;
        `);
      } catch (error) { connection.exec("ROLLBACK"); throw error; }
    }
    upgraded.add(connection);
  }
  return connection;
}
const hash = (token: string) => createHash("sha256").update(token).digest("hex");
type Row = { id: string; token_hash: string; state: string; hidden: number };
type Control = { display_name: string | null; country: string | null; score_override: number | null; deleted: number; revision: number; manual_rank: number | null };
const controls = (id: string) => db().prepare("SELECT * FROM run_controls WHERE run_id = ?").get(id) as Control | undefined;
function visibleRun(state: RunState | PublicRun): PublicRun {
  const control = controls(state.id);
  if (control?.deleted) throw new GameError("This game was removed by the organiser.", 410);
  const visible = "phase" in state ? redactPublicRun(state as PublicRun) : publicRun(state as RunState);
  const evaluation=modelRules(visible.rulesVersion)&&visible.finishedAt?modelStatus(settingsFor(visible.history),!stagedRules(visible.rulesVersion)):undefined;
  return { ...visible, nickname: control?.display_name ?? visible.nickname, country: control?.country ?? visible.country, score: modelRules(visible.rulesVersion)?null:visible.finishedAt ? control?.score_override ?? visible.score : visible.score,
    ...(evaluation?{modelEvaluation:evaluation,...(evaluation.status==="complete"?{projection:{...visible.projection,kind:"model" as const,model:"En-ROADS",version:evaluation.modelVersion!,temperatureC:evaluation.temperatureC,caveat:"Experimental public-UI evaluation of the full scenario. Conditional projection, not a prediction or vendor endorsement."}}:{})}:{}) };
}
function ownedRun(id: string, token: string): Row {
  const row = db().prepare("SELECT * FROM runs WHERE id = ?").get(id) as Row | undefined;
  if (!row || !token || !timingSafeEqual(Buffer.from(row.token_hash), Buffer.from(hash(token)))) throw new GameError("Run not found or session key invalid.", 401);
  if (controls(id)?.deleted) throw new GameError("This game was removed by the organiser.", 410);
  return row;
}
export const PLAY_LIMIT = 2;
export function attemptStatus(browserToken?: string): AttemptStatus {
  const used = browserToken ? (db().prepare("SELECT used FROM browser_passes WHERE group_hash = ?").get(hash(browserToken)) as { used: number } | undefined)?.used ?? 0 : 0;
  return { used, remaining: Math.max(0, PLAY_LIMIT - used), limit: PLAY_LIMIT };
}
export function resetAttempts(browserToken: string) {
  db().prepare("UPDATE browser_passes SET used = 0 WHERE group_hash = ?").run(hash(browserToken));
  db().prepare("INSERT INTO admin_audit VALUES (?, NULL, ?, ?, ?)").run(randomUUID(), "reset-browser-plays", "{}", new Date().toISOString());
  return attemptStatus(browserToken);
}
export function startRun(nickname: string, country: string, browser?: { token: string; requestId: string }) {
  const connection = db(), group = browser ? hash(browser.token) : "";
  connection.exec("BEGIN IMMEDIATE");
  try {
    let token: string | undefined;
    if (browser) {
      const previous = connection.prepare("SELECT run_id FROM run_attempts WHERE group_hash = ? AND request_id = ?").get(group, browser.requestId) as { run_id: string | null } | undefined;
      token = createHmac("sha256", browser.token).update(browser.requestId).digest("hex");
      if (previous) {
        if (previous.run_id === null) throw new GameError("This game was permanently deleted.", 410);
        const run = getRun(previous.run_id, token);
        connection.exec("COMMIT");
        return { run, token };
      }
      if (!attemptStatus(browser.token).remaining) throw new GameError("Both plays are used. You can still view your history and the leaderboard.", 403);
    }
    const name = cleanPlayerName(nickname);
    assertPlayerNameAvailable(name, nameRecords());
    const result = insertRun(name, country, token);
    if (browser) {
      connection.prepare("INSERT INTO browser_passes VALUES (?, 1) ON CONFLICT(group_hash) DO UPDATE SET used = used + 1").run(group);
      connection.prepare("INSERT INTO run_attempts VALUES (?, ?, ?)").run(group, browser.requestId, result.run.id);
    }
    connection.exec("COMMIT"); return result;
  } catch (error) { connection.exec("ROLLBACK"); throw error; }
}
function nameRecords() {
  return db().prepare("SELECT r.id,json_extract(r.state,'$.nickname') AS original_name,c.display_name FROM runs r LEFT JOIN run_controls c ON c.run_id=r.id").all() as NameRecord[];
}
function insertRun(nickname: string, country: string, suppliedToken?: string) {
  const id = randomUUID();
  const token = suppliedToken ?? randomBytes(32).toString("hex");
  const state = createRun(id, nickname, country, randomBytes(4).readUInt32LE());
  db().prepare("INSERT INTO runs(id, token_hash, state, created_at) VALUES (?, ?, ?, ?)").run(id, hash(token), JSON.stringify(state), state.startedAt);
  return { run: publicRun(state), token };
}
export function getRun(id: string, token: string) { return visibleRun(JSON.parse(ownedRun(id, token).state) as RunState); }
export function actOnRun(id: string, token: string, cardId: string | string[] | SpecialCommand, revision: number, requestId: string) {
  const connection = db();
  connection.exec("BEGIN IMMEDIATE");
  try {
    const row = ownedRun(id, token);
    const previous = connection.prepare("SELECT response FROM actions WHERE run_id = ? AND request_id = ?").get(id, requestId) as { response: string } | undefined;
    if (previous) { const visible = visibleRun(JSON.parse(previous.response)); connection.exec("COMMIT"); return visible; }
    const current = JSON.parse(row.state) as RunState;
    if (current.revision !== revision) throw new GameError("The board changed. Refresh to continue from the latest turn.", 409);
    const next = Array.isArray(cardId) ? takeCardBatch(current, cardId) : typeof cardId === "string" ? takeAction(current, cardId) : takeSpecialAction(current, cardId);
    connection.prepare("UPDATE runs SET state = ?, score = ?, finished_at = ? WHERE id = ?").run(JSON.stringify(next), next.score, next.finishedAt, id);
    const visible = visibleRun(next);
    connection.prepare("INSERT INTO actions(run_id, request_id, response, created_at) VALUES (?, ?, ?, ?)").run(id, requestId, JSON.stringify(visible), new Date().toISOString());
    connection.exec("COMMIT");
    return visible;
  } catch (error) { connection.exec("ROLLBACK"); throw error; }
}
export function leaderboard(includeHidden = false): LeaderboardEntry[] {
  if(!includeHidden){
    const placeholders = STAGED_VERSIONS.map(() => "?").join(",");
    const rows = db().prepare(`SELECT r.id,r.state,c.display_name,c.country,c.manual_rank FROM runs r LEFT JOIN run_controls c ON c.run_id=r.id WHERE r.finished_at IS NOT NULL AND r.hidden=0 AND COALESCE(c.deleted,0)=0 AND json_extract(r.state,'$.rulesVersion') IN (${placeholders})`).all(...STAGED_VERSIONS) as (Row & Partial<Control>)[];
    const entries = rows.flatMap(row => {
      const state = JSON.parse(row.state) as RunState;
      const model = modelStatus(settingsFor(state.history));
      if (model.status !== "complete") return [];
      return [{ id: row.id, nickname: row.display_name ?? state.nickname, country: row.country ?? state.country,
        score: model.temperatureC!, temperatureC: model.temperatureC!, elapsedMs: state.elapsedMs ?? 0,
        finishedAt: state.finishedAt!, rulesVersion: state.rulesVersion, manualRank: row.manual_rank ?? undefined }];
    });
    return orderLeaderboard(entries).slice(0, 100);
  }
  const rows = db().prepare(`SELECT r.id, r.state, r.hidden, c.display_name, c.country, c.score_override FROM runs r LEFT JOIN run_controls c ON c.run_id = r.id WHERE r.score IS NOT NULL AND COALESCE(c.deleted, 0) = 0 ${includeHidden ? "" : "AND r.hidden = 0 AND json_extract(r.state, '$.rulesVersion') = ?"} ORDER BY COALESCE(c.score_override, r.score) DESC, r.finished_at ASC LIMIT 100`).all(...(includeHidden ? [] : [RULES_VERSION])) as (Row & Partial<Control>)[];
  return rows.map(row => {
    const state = JSON.parse(row.state) as RunState;
    return { id: row.id, nickname: row.display_name ?? state.nickname, country: row.country ?? state.country, score: row.score_override ?? state.score!, finishedAt: state.finishedAt!, rulesVersion: state.rulesVersion, ...(includeHidden ? { hidden: Boolean(row.hidden) } : {}) };
  });
}
export function stats() {
  return db().prepare("SELECT COUNT(*) AS runs, COALESCE(SUM(CASE WHEN finished_at IS NOT NULL THEN 1 ELSE 0 END),0) AS completed, COALESCE(SUM(hidden),0) AS hidden, (SELECT COUNT(*) FROM run_controls WHERE deleted = 1) AS deleted FROM runs").get() as AdminData["stats"];
}
export function displayUrl() { return (db().prepare("SELECT value FROM event_settings WHERE key = 'join-url'").get() as { value: string } | undefined)?.value ?? ""; }
export function setDisplayUrl(value: string) { db().prepare("INSERT INTO event_settings VALUES ('join-url', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(value); }
export function moderate(id: string, hidden: boolean) {
  const row = db().prepare("SELECT id FROM runs WHERE id = ? AND finished_at IS NOT NULL").get(id);
  if (!row) throw new GameError("Completed run not found.", 404);
  editRecord(id, controls(id)?.revision ?? 0, { hidden });
}
export function adminRecords(page = 1, query = ""): AdminData {
  const where = query ? "WHERE instr(lower(COALESCE(c.display_name, json_extract(r.state, '$.nickname'))), ?) > 0 OR r.id = ?" : "";
  const args = query ? [query.toLowerCase(), query] : [];
  const total = (db().prepare(`SELECT COUNT(*) AS count FROM runs r LEFT JOIN run_controls c ON c.run_id = r.id ${where}`).get(...args) as { count: number }).count;
  const pages = Math.max(1, Math.ceil(total / 30)); page = Math.max(1, Math.min(pages, Math.floor(page)));
  const rows = db().prepare(`SELECT r.*, c.display_name, c.country, c.score_override, c.manual_rank, p.used AS plays_used,
    COALESCE(c.deleted,0) AS deleted, COALESCE(c.revision,0) AS control_revision
    FROM runs r LEFT JOIN run_controls c ON c.run_id = r.id
    LEFT JOIN run_attempts a ON a.run_id = r.id LEFT JOIN browser_passes p ON p.group_hash = a.group_hash
    ${where} ORDER BY r.created_at DESC, r.id LIMIT 30 OFFSET ?`).all(...args, (page - 1) * 30) as (Row & Control & { control_revision: number; plays_used: number | null })[];
  const records: AdminRecord[] = rows.map(row => {
    const state = JSON.parse(row.state) as RunState;
    const model = modelRules(state.rulesVersion) && state.finishedAt ? modelStatus(settingsFor(state.history), !stagedRules(state.rulesVersion)) : null;
    return { id: row.id, nickname: row.display_name ?? state.nickname, country: row.country ?? state.country,
      score: row.score_override ?? state.score, originalScore: state.score, hidden: !!row.hidden, deleted: !!row.deleted,
      finishedAt: state.finishedAt, startedAt: state.startedAt, round: state.round, rulesVersion: state.rulesVersion,
      revision: row.control_revision, elapsedMs: state.elapsedMs, manualRank: row.manual_rank ?? undefined,
      playsUsed: row.plays_used ?? undefined, temperatureC: model?.status === "complete" ? model.temperatureC : undefined };
  });
  return { records, total, page, pages, stats: stats(), entries: leaderboard(true) };
}
export function adminRun(id: string) {
  const row = db().prepare("SELECT state FROM runs WHERE id = ?").get(id) as { state: string } | undefined;
  if (!row) throw new GameError("Game not found.", 404);
  const state=JSON.parse(row.state) as RunState;return {...publicRun(state),...(modelRules(state.rulesVersion)&&state.finishedAt?{modelEvaluation:modelStatus(settingsFor(state.history),!stagedRules(state.rulesVersion))}:{})};
}
export function adminActivity(id: string): AdminActivity {
  const run = adminRun(id);
  const group = db().prepare("SELECT group_hash FROM run_attempts WHERE run_id=? LIMIT 1").get(id) as {group_hash:string}|undefined;
  const used = group ? (db().prepare("SELECT used FROM browser_passes WHERE group_hash=?").get(group.group_hash) as {used:number}).used : null;
  const related = group ? db().prepare("SELECT r.id,r.state FROM runs r JOIN run_attempts a ON a.run_id=r.id WHERE a.group_hash=? ORDER BY r.created_at DESC").all(group.group_hash) as {id:string;state:string}[] : [];
  const events = (db().prepare("SELECT request_id,response,created_at FROM actions WHERE run_id=? ORDER BY rowid").all(id) as {request_id:string;response:string;created_at:string|null}[]).map(row => {
    const response=JSON.parse(row.response) as PublicRun;
    return {id:row.request_id,kind:"action",at:row.created_at,summary:response.lastActions?.map(action=>action.title).join(" · ") || `Round ${response.round+1}`};
  });
  const audit=(db().prepare("SELECT id,action,changes,created_at FROM admin_audit WHERE run_id=? ORDER BY created_at DESC").all(id) as {id:string;action:string;changes:string;created_at:string}[]).map(row=>({id:row.id,action:row.action,createdAt:row.created_at,changes:JSON.parse(row.changes)}));
  return {attempts:used===null?null:{used,remaining:Math.max(0,PLAY_LIMIT-used),limit:PLAY_LIMIT},games:related.map(row=>{const state=JSON.parse(row.state) as RunState;return {id:row.id,nickname:state.nickname,startedAt:state.startedAt,finishedAt:state.finishedAt};}),events:[{id:"start",kind:"start",at:run.startedAt,summary:"Game started"},...events],audit};
}
export function resetPlayerAttempts(id:string) {
  const connection=db();connection.exec("BEGIN IMMEDIATE");
  try {
    const row=connection.prepare("SELECT group_hash FROM run_attempts WHERE run_id=? LIMIT 1").get(id) as {group_hash:string}|undefined;
    if(!row)throw new GameError("No browser allowance is linked to this game.",404);
    const before=(connection.prepare("SELECT used FROM browser_passes WHERE group_hash=?").get(row.group_hash) as {used:number}).used;
    connection.prepare("UPDATE browser_passes SET used=0 WHERE group_hash=?").run(row.group_hash);
    connection.prepare("INSERT INTO admin_audit VALUES (?,?,?,?,?)").run(randomUUID(),id,"reset-player-plays",JSON.stringify({usedBefore:before,usedAfter:0}),new Date().toISOString());
    connection.exec("COMMIT");return {used:0,remaining:PLAY_LIMIT,limit:PLAY_LIMIT};
  } catch(error){connection.exec("ROLLBACK");throw error;}
}
/** Persisted fixed windows shared by all API workers; keys are hashed, never raw IPs. */
export function rateLimit(key:string,maximum=30,windowMs=60000) {
  const now=Date.now(),connection=db();
  const row=connection.prepare("INSERT INTO rate_limits VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN until_ms<=? THEN 1 ELSE count+1 END, until_ms=CASE WHEN until_ms<=? THEN excluded.until_ms ELSE until_ms END RETURNING count").get(hash(key),1,now+windowMs,now,now) as {count:number};
  if(row.count>maximum)throw new GameError("Too many requests. Please wait and try again.",429);
}
export function editRecord(id: string, expectedRevision: number, update: { nickname?: string; country?: string; score?: number | null; manualRank?: number | null; hidden?: boolean; deleted?: boolean }) {
  const connection = db(); connection.exec("BEGIN IMMEDIATE");
  try {
    const row = connection.prepare("SELECT state, hidden FROM runs WHERE id = ?").get(id) as { state: string; hidden: number } | undefined;
    if (!row) throw new GameError("Game not found.", 404);
    const previous = controls(id);
    if ((previous?.revision ?? 0) !== expectedRevision) throw new GameError("Record changed. Refresh before editing.", 409);
    const state = JSON.parse(row.state) as RunState;
    if (update.nickname !== undefined) {
      update = { ...update, nickname: cleanPlayerName(update.nickname) };
      if (playerNameKey(update.nickname!) !== playerNameKey(previous?.display_name ?? state.nickname)) assertPlayerNameAvailable(update.nickname!, nameRecords(), id);
    }
    if(modelRules(state.rulesVersion)&&update.score!==undefined)throw new GameError("Model temperatures cannot be edited as game points.");
    if (update.score !== undefined && (!state.finishedAt || update.score !== null && (!Number.isInteger(update.score) || update.score < 0 || update.score > 1000))) throw new GameError("Only completed games accept a score correction from 0 to 1000.");
    if (update.manualRank != null && (!stagedRules(state.rulesVersion) || !state.finishedAt || modelStatus(settingsFor(state.history)).status !== "complete")) {
      throw new GameError("Only a verified leaderboard result can be placed manually.");
    }
    const next = { display_name: update.nickname ?? previous?.display_name ?? null, country: update.country ?? previous?.country ?? null, score_override: update.score === undefined ? previous?.score_override ?? null : update.score, deleted: update.deleted === undefined ? previous?.deleted ?? 0 : Number(update.deleted), revision: expectedRevision + 1, manual_rank: update.manualRank === undefined ? previous?.manual_rank ?? null : update.manualRank };
    connection.prepare(`INSERT INTO run_controls(run_id,display_name,country,score_override,deleted,revision,manual_rank) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(run_id) DO UPDATE SET display_name=excluded.display_name, country=excluded.country, score_override=excluded.score_override,
      deleted=excluded.deleted, revision=excluded.revision, manual_rank=excluded.manual_rank`).run(id, next.display_name, next.country, next.score_override, next.deleted, next.revision, next.manual_rank);
    if (update.hidden !== undefined) connection.prepare("UPDATE runs SET hidden = ? WHERE id = ?").run(Number(update.hidden), id);
    connection.prepare("INSERT INTO admin_audit VALUES (?, ?, ?, ?, ?)").run(randomUUID(), id, update.deleted ? "trash" : update.deleted === false ? "restore" : "edit", JSON.stringify({ before: { ...previous, hidden: !!row.hidden }, after: { ...next, hidden: update.hidden ?? !!row.hidden } }), new Date().toISOString());
    connection.exec("COMMIT");
  } catch (error) { connection.exec("ROLLBACK"); throw error; }
}

export function deleteRecord(id: string, expectedRevision: number) {
  const connection = db();
  connection.exec("BEGIN IMMEDIATE");
  try {
    if (connection.prepare("SELECT id FROM runs WHERE id = ?").get(id)) {
      if ((controls(id)?.revision ?? 0) !== expectedRevision) throw new GameError("Record changed. Refresh before deleting.", 409);
      connection.prepare("UPDATE run_attempts SET run_id = NULL WHERE run_id = ?").run(id);
      for (const table of ["actions", "run_controls", "admin_audit"]) {
        connection.prepare(`DELETE FROM ${table} WHERE run_id = ?`).run(id);
      }
      connection.prepare("DELETE FROM runs WHERE id = ?").run(id);
    }
    connection.exec("COMMIT");
  } catch (error) { connection.exec("ROLLBACK"); throw error; }
}

export function modelSettings(id:string,token:string){const state=JSON.parse(ownedRun(id,token).state) as RunState;if(!modelRules(state.rulesVersion)||!state.finishedAt)throw new GameError("Finish a new game before evaluating its scenario.",409);return settingsFor(state.history);}
type EvaluationRow={status:"queued"|"running"|"failed"|"complete";result:string|null;error:string|null;updated_at:string};
export function modelStatus(settings:Record<string,number>,allowLegacy=false):NonNullable<RunState["modelEvaluation"]>{
 const row=db().prepare("SELECT * FROM model_evaluations WHERE scenario_key=?").get(scenarioKey(settings)) as EvaluationRow|undefined;
 const current=evaluationFromRow(row,settings);
 if(allowLegacy){
  const old=db().prepare("SELECT * FROM model_evaluations WHERE scenario_key=?").get(scenarioKey(settings,LEGACY_MODEL_PROFILE)) as EvaluationRow|undefined;
  const legacy=evaluationFromRow(old,settings,LEGACY_MODEL_PROFILE);
  if(legacy.status==="complete")return legacy;
 }
 return current;
}
export function saveModelStatus(settings:Record<string,number>,status:"queued"|"running"|"failed"|"complete",result?:ModelResult,error?:string){
 if(status==="complete"&&!validateModelResult(result,settings))throw new GameError("Invalid model readback.");
 db().prepare("INSERT INTO model_evaluations VALUES (?,?,?,?,?) ON CONFLICT(scenario_key) DO UPDATE SET status=excluded.status,result=excluded.result,error=excluded.error,updated_at=excluded.updated_at").run(scenarioKey(settings),status,result?JSON.stringify(result):null,error??null,new Date().toISOString());
}
import { modelRules } from "@/game/model-rules";
