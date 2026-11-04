"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Download, Eye, EyeOff, History, Pencil, RefreshCw, ShieldCheck, Trash2, Undo2, X } from "lucide-react";
import type { AdminActivity, AdminData, AdminRecord, PublicRun } from "@/game/types";
import { api } from "@/lib/client";
import { formatTime } from "@/game/ranking";
import { COUNTRY_CODES, countryName } from "@/lib/countries";
import { CountryPicker, Flag } from "./country-picker";
const countries = COUNTRY_CODES.map(code => ({ code, name: countryName(code) })).sort((a,b) => a.name.localeCompare(b.name));
export function Admin() {
  const [token, setToken] = useState(""), [password,setPassword]=useState(""), [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState(""), [notice, setNotice] = useState(""), [busy, setBusy] = useState(false), [query, setQuery] = useState("");
  const [editing, setEditing] = useState<AdminRecord | null>(null), [removing, setRemoving] = useState<AdminRecord | null>(null), [detail, setDetail] = useState<PublicRun | null>(null);
  const [name, setName] = useState(""), [country, setCountry] = useState(""), [score, setScore] = useState(""), [joinUrl, setJoinUrl] = useState("");
  const [activity,setActivity]=useState<AdminActivity|null>(null),[resetting,setResetting]=useState<AdminRecord|null>(null);
  const date=(value:string|null)=>value?new Date(value).toLocaleString():"Time not recorded";
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (editing || removing || detail || resetting) dialog.current?.showModal(); }, [editing, removing, detail,resetting]);
  function close() { dialog.current?.close(); setEditing(null); setRemoving(null); setDetail(null);setActivity(null);setResetting(null); }
  async function login(){
    setBusy(true);setError("");
    try{const result=await api<{token:string}>("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password})});setToken(result.token);setPassword("");await load(1,result.token);}catch(err){setError((err as Error).message);}finally{setBusy(false);}
  }
  async function load(page = 1,accessToken=token) {
    setBusy(true); setError("");
    try { const [records,display]=await Promise.all([api<AdminData>(`/api/admin?page=${page}&q=${encodeURIComponent(query)}`, { headers: { Authorization: `Bearer ${accessToken}` } }),api<{joinUrl:string}>("/api/admin/display", { headers: { Authorization: `Bearer ${accessToken}` } })]);setData(records);setJoinUrl(display.joinUrl); }
    catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  async function update(record: AdminRecord, fields: Record<string, unknown>) {
    setBusy(true); setError("");
    try { await api("/api/admin", { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ id: record.id, revision: record.revision, ...fields }) }); close(); await load(data?.page); }
    catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  async function inspect(record: AdminRecord) {
    setBusy(true); setError("");
    try { const [run,log]=await Promise.all([api<PublicRun>(`/api/admin?id=${record.id}`, { headers: { Authorization: `Bearer ${token}` } }),api<AdminActivity>(`/api/admin?id=${record.id}&activity=1`,{headers:{Authorization:`Bearer ${token}`}})]);setDetail(run);setActivity(log); }
    catch(err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  async function resetPlays() {
    setBusy(true); setError("");
    try { await api("/api/attempts", {method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:"{}"}); setNotice("Two plays restored for this browser."); } catch(err) {setError((err as Error).message);} finally {setBusy(false);}
  }
  async function resetPlayer(record:AdminRecord){
    setBusy(true);setError("");
    try{await api("/api/admin",{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({id:record.id,action:"reset-plays"})});close();setNotice(`Two plays restored for ${record.nickname}’s browser.`);await load(data?.page);}catch(err){setError((err as Error).message);}finally{setBusy(false);}
  }
  async function saveUrl(event: React.FormEvent) {
    event.preventDefault();setBusy(true);setError("");
    try { await api("/api/admin/display", {method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({joinUrl})});setNotice("Display QR updated."); } catch(err) {setError((err as Error).message);} finally{setBusy(false);}
  }
  async function exportCsv() {
    if (!data) return;
    setBusy(true);setError("");
    try{
    const all:AdminRecord[]=[];let page=1,pages=1;
    do{const result=await api<AdminData>(`/api/admin?page=${page}`,{headers:{Authorization:`Bearer ${token}`}});all.push(...result.records);pages=result.pages;page++;}while(page<=pages);
    const field=(value: unknown)=>{let text=String(value??"");if(/^\s*[=+@-]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};
    const rows=[["id","name","country","score","original_score","temperature_c","elapsed_ms","started_at","finished_at","status","rules"],...Array.from(new Map(all.map(e=>[e.id,e])).values()).map(e=>[e.id,e.nickname,e.country,e.score,e.originalScore,e.temperatureC,e.elapsedMs,e.startedAt,e.finishedAt,e.deleted?"removed":e.hidden?"hidden":e.finishedAt?"completed":"playing",e.rulesVersion])];
    const url=URL.createObjectURL(new Blob(["\uFEFF"+rows.map(row=>row.map(field).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"}));const link=document.createElement("a");link.href=url;link.download="event-records.csv";link.click();URL.revokeObjectURL(url);
    setNotice(`Exported ${all.length} games.`);
    }catch(err){setError((err as Error).message);}finally{setBusy(false);}
  }
  return <div className="admin-shell"><main id="main-content" className="admin-main"><header className="admin-heading"><h1><ShieldCheck size={26}/> Admin</h1><nav><Link href="/">Play</Link><Link href="/leaderboard" target="_blank">Display</Link></nav></header>
    {!data ? <form className="admin-login" onSubmit={event=>{event.preventDefault();void login();}}><label htmlFor="admin-token">Password</label><input type="password" id="admin-token" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required maxLength={256}/><button className="button primary" disabled={busy}>{busy?"Logging in…":"Log in"}</button></form> : <>
      <div className="admin-stats"><div><strong>{data.stats.runs}</strong><span>All games</span></div><div><strong>{data.stats.completed}</strong><span>Completed</span></div><div><strong>{data.stats.hidden}</strong><span>Hidden</span></div><div><strong>{data.stats.deleted}</strong><span>Removed</span></div></div>
      <div className="admin-actions"><button className="button secondary" disabled={busy} onClick={()=>load(data.page)}><RefreshCw size={15}/> Refresh</button><button className="button secondary" disabled={busy} onClick={exportCsv}><Download size={15}/> Export all</button><button className="button secondary" disabled={busy} onClick={resetPlays}>Reset my plays</button><button className="button text-button" onClick={()=>{close();setData(null);setToken("");setPassword("");setNotice("");}}>Log out</button></div>
      <details className="admin-display-settings"><summary>Display QR address</summary><form onSubmit={saveUrl}><label htmlFor="display-url">Game URL reachable by phones</label><input id="display-url" type="url" value={joinUrl} onChange={event=>setJoinUrl(event.target.value)} placeholder="https://…"/><button className="button secondary" disabled={busy}>Save QR</button><small>Blank uses the display’s current address. Localhost cannot be reached by other phones.</small></form></details>
      <form className="admin-search" onSubmit={event=>{event.preventDefault();void load();}}><input disabled={busy} aria-label="Search records" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Name or game ID"/><button className="button secondary" disabled={busy}>Search</button></form>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Name</th><th>Country</th><th>Score</th><th>Status</th><th>Controls</th></tr></thead><tbody>{data.records.map(record=><tr key={record.id} className={record.deleted?"removed-entry":record.hidden?"hidden-entry":""}><td>{record.nickname}<small>{record.rulesVersion} · {record.finishedAt?"Finished":"Round "+(record.round+1)}</small></td><td><Flag code={record.country}/> {countryName(record.country)}</td><td>{modelRules(record.rulesVersion)?record.temperatureC===undefined?"Pending":`+${record.temperatureC.toFixed(1)}°C`:record.score??"—"}{record.elapsedMs!==undefined&&<small>{formatTime(record.elapsedMs)}</small>}{record.score!==record.originalScore&&<small>Originally {record.originalScore}</small>}</td><td>{record.deleted?"Removed":record.hidden?"Hidden":record.finishedAt?"Completed":"Playing"}</td><td><div className="record-controls"><button aria-label={`History for ${record.nickname}`} onClick={()=>inspect(record)} disabled={busy}><History size={16}/></button><button aria-label={`Edit ${record.nickname}`} onClick={()=>{setName(record.nickname);setCountry(record.country);setScore(record.score===record.originalScore?"":String(record.score??""));setEditing(record);}} disabled={busy}><Pencil size={16}/></button>{!record.deleted&&<button aria-label={`${record.hidden?"Restore":"Hide"} ${record.nickname}`} onClick={()=>update(record,{hidden:!record.hidden})} disabled={busy}>{record.hidden?<Eye size={16}/>:<EyeOff size={16}/>}</button>}<button aria-label={`${record.deleted?"Restore removed":"Remove"} ${record.nickname}`} disabled={busy} onClick={()=>record.deleted?update(record,{deleted:false}):setRemoving(record)}>{record.deleted?<Undo2 size={16}/>:<Trash2 size={16}/>}</button></div></td></tr>)}</tbody></table>{!data.records.length&&<p className="empty-panel">No games found.</p>}</div>
      <div className="admin-pagination"><button className="button secondary" disabled={busy||data.page<=1} onClick={()=>load(data.page-1)}>Previous</button><span>{data.page} / {data.pages} · {data.total} games</span><button className="button secondary" disabled={busy||data.page>=data.pages} onClick={()=>load(data.page+1)}>Next</button></div>
    </>}
    {notice&&<p className="admin-notice" role="status">{notice}</p>}{error&&<p className="error-message" role="alert">{error}</p>}
    <dialog ref={dialog} className="journal-dialog admin-dialog" onCancel={close}><button className="dialog-close" aria-label="Close admin details" onClick={close}><X size={20}/></button>
      {editing&&<form onSubmit={event=>{event.preventDefault();void update(editing,{nickname:name,country,...(editing.finishedAt&&!modelRules(editing.rulesVersion)?{score:score===""?null:Number(score)}:{})});}}><h2>Edit record</h2><label htmlFor="edit-name">Name</label><input id="edit-name" value={name} onChange={event=>setName(event.target.value)} required minLength={2} maxLength={24}/><label htmlFor="country">Country</label><CountryPicker countries={countries} value={country} onChange={setCountry}/>{editing.finishedAt&&!modelRules(editing.rulesVersion)&&<><label htmlFor="edit-score">Score correction</label><input id="edit-score" type="number" min={0} max={1000} step={1} value={score} onChange={event=>setScore(event.target.value)} placeholder={String(editing.originalScore)}/><small>Blank restores the calculated score: {editing.originalScore}.</small></>}<button className="button primary" disabled={busy}>Save changes</button></form>}
      {removing&&<><h2>Remove {removing.nickname}?</h2><p>The game leaves the board and cannot continue. It stays in admin trash and can be restored.</p><div className="admin-actions"><button className="button secondary" onClick={close}>Cancel</button><button className="button danger" disabled={busy} onClick={()=>update(removing,{deleted:true})}>Remove record</button></div></>}
      {resetting&&<><h2>Reset plays for {resetting.nickname}?</h2><p>Restores two starts for the browser linked to this game. Existing games and results stay saved.</p><div className="admin-actions"><button className="button secondary" onClick={close}>Cancel</button><button className="button primary" disabled={busy} onClick={()=>resetPlayer(resetting)}>Restore two plays</button></div></>}
      {detail&&<><h2>{detail.nickname}</h2><p>{detail.rulesVersion} · {detail.modelEvaluation?.status==="complete"?`+${detail.modelEvaluation.temperatureC!.toFixed(1)}°C`:modelRules(detail.rulesVersion)&&detail.finishedAt?"Temperature pending":detail.score??"In progress"}</p><dl className="admin-metadata"><dt>Started</dt><dd>{date(detail.startedAt)}</dd><dt>Finished</dt><dd>{detail.finishedAt?date(detail.finishedAt):"Playing"}</dd><dt>Play time</dt><dd>{detail.elapsedMs!==undefined?formatTime(detail.elapsedMs):"—"}</dd><dt>Browser starts</dt><dd>{activity?.attempts?`${activity.attempts.used} used · ${activity.attempts.remaining} left`:"Unlinked"}</dd></dl>{activity?.attempts&&<button className="button secondary" disabled={busy} onClick={()=>{const record=data?.records.find(r=>r.id===detail.id);if(record){setDetail(null);setResetting(record);}}}>Reset player’s plays</button>}
      <details open><summary>Policies</summary><div className="played-list">{detail.history.map((action,index)=><div key={index} className="history-row"><b>Round {action.planningRound??index+1} · {action.title}</b><p>{action.accepted?"Passed":"Rejected"} · {action.spent} spent · {action.refund} refunded{action.surprise?` · ${action.surprise.title}`:""}</p></div>)}</div></details>
      <details><summary>Activity · {activity?.events.length??0}</summary><ol className="admin-activity">{activity?.events.map(event=><li key={event.id}><time>{date(event.at)}</time><span>{event.summary}</span></li>)}</ol></details>
      <details><summary>Games from the same browser · {activity?.games.length??0}</summary><ul className="admin-activity">{activity?.games.map(game=><li key={game.id}><b>{game.nickname}</b><time>{date(game.startedAt)}</time><code>{game.id}</code></li>)}</ul></details>
      <details><summary>Admin changes · {activity?.audit.length??0}</summary><ol className="admin-activity">{activity?.audit.map(entry=><li key={entry.id}><time>{date(entry.createdAt)}</time><b>{entry.action}</b><pre>{JSON.stringify(entry.changes,null,2)}</pre></li>)}</ol></details></>}
      {error&&<p className="error-message" role="alert">{error}</p>}
    </dialog>
  </main></div>;
}
import { modelRules } from "@/game/model-rules";
