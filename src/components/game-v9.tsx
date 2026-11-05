"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { BookOpen, Check, CircleHelp, Clock3, History, LoaderCircle, Shuffle, Volume2, VolumeX, X } from "lucide-react";
import { api, requestId, SESSION_KEY, type Session } from "@/lib/client";
import { playSound, setSoundEnabled, soundEnabled } from "@/lib/sound";
import { controlFor, guideFor, settingLabel, type PolicyCardV9 } from "@/game/policy-catalogue";
import type { PolicyCardV11 } from "@/game/v11-catalogue";
import { catalogueFor } from "@/game/catalogues";
import { V11_ROUND_LABELS, v11RoundLabel } from "@/game/v11-schedule";
import { formatTime } from "@/game/ranking";
import type { AttemptStatus, Decision, LibraryCard, OfferedCard, PublicRun, SpecialCommand } from "@/game/types";
import { WorldBackground } from "./game-world";
import { CardArt, CardPhotoCaption } from "./card-art";
import { ClimateCoin } from "./climate-coin";
import { ArcadeRound } from "./arcade-round";
import { Flag } from "./country-picker";
import { ScenarioResults } from "./scenario-results";
import { GameTutorial } from "./game-tutorial";
import { PolicyHistory, PolicyLibrary, PolicyRoundResults, policyTint } from "./policy-journal";
type QuotedPolicy=OfferedCard & PolicyCardV11;
const resourceNames={economy:"Revenue growth",support:"Politics",awareness:"Public engagement",credits:"Coins"};
function Sheet({title,onClose,children,className=""}:{title:string;onClose:()=>void;children:ReactNode;className?:string}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const dialog=ref.current!;dialog.showModal();return()=>dialog.close();},[]);
 return <dialog className={`v9-sheet ${className}`} ref={ref} onCancel={event=>{event.preventDefault();onClose();}} aria-label={title}><header><h2>{title}</h2><button className="icon-button" aria-label={`Close ${title}`} onClick={onClose}><X size={20}/></button></header>{children}</dialog>;
}
function Effects({card}:{card:OfferedCard}){return <div className="v9-effects">{(["economy","support","awareness","credits"]as const).filter(key=>card.effects[key]).map(key=><span key={key} className={card.effects[key]!>0?"positive":"negative"}>{resourceNames[key]} {card.effects[key]!>0?"+":""}{card.effects[key]}</span>)}</div>;}
function Clock({run}:{run:PublicRun}){const[now,setNow]=useState(()=>Date.now());useEffect(()=>{if(run.finishedAt)return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[run.finishedAt]);return <span className="v9-clock"><Clock3 size={13}/>{formatTime(run.elapsedMs??Math.max(0,now-Date.parse(run.startedAt)))}</span>;}
export function GameV9({initialRun,session}:{initialRun:PublicRun;session:Session}){
 const[run,setRun]=useState(initialRun),[chosen,setChosen]=useState<string[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const[inspect,setInspect]=useState<QuotedPolicy|null>(null),[panel,setPanel]=useState<"Library"|"History"|null>(null),[filter,setFilter]=useState("all"),[stat,setStat]=useState<string|null>(null),[sound,setSound]=useState(true),[notice,setNotice]=useState("");
 const [receipt, setReceipt] = useState<{ round: string; outcomes: Decision[] } | null>(null);
 const modern = run.rulesVersion === "prototype-0.11";
 const { byId } = catalogueFor(run.rulesVersion);
 const roundLabels = modern ? V11_ROUND_LABELS : Array.from({length:10},(_,index)=>String(index+1));
 const acting=useRef(false),pending=useRef<{key:string;body:Record<string,unknown>}|null>(null);
 const board = useRef<HTMLElement>(null);
 const [tutorial, setTutorial] = useState(false);
 const tutorialKey = `cop-spotlight-tour-seen:${initialRun.id}`;
 useEffect(()=>{setSound(soundEnabled());},[]);
 useEffect(() => {
  if (initialRun.round !== 0 || initialRun.finishedAt) return;
  try { if (!localStorage.getItem(tutorialKey)) setTutorial(true); }
  catch { setTutorial(true); }
 }, [initialRun.round, initialRun.finishedAt, tutorialKey]);
 function closeTutorial() {
  try { localStorage.setItem(tutorialKey, "1"); } catch { /* Storage may be unavailable. */ }
  setTutorial(false);
 }
 const cost=run.offers.filter(c=>chosen.includes(c.id)).reduce((sum,c)=>sum+c.cost,0);
 const library = (run.library ?? []) as (LibraryCard & PolicyCardV9)[];
 const headers={"Content-Type":"application/json",Authorization:`Bearer ${session.token}`};
 async function act(value:string|string[]|SpecialCommand){
  if(acting.current)return;acting.current=true;setBusy(true);setError("");
  const payload=typeof value==="string"?{cardId:value}:Array.isArray(value)?{cardIds:value}:{special:value};const key=JSON.stringify([run.revision,payload]);
  if(pending.current?.key!==key)pending.current={key,body:{...payload,revision:run.revision,requestId:requestId()}};
  try{const next=await api<PublicRun>(`/api/runs/${session.id}/actions`,{method:"POST",headers,body:JSON.stringify(pending.current.body)});setRun(next);setChosen([]);setInspect(null);pending.current=null;
   const outcomes = next.lastActions?.filter(action => action.kind !== "round-end") ?? [];
   const policies = outcomes.filter(action => action.kind === "policy");
   if (Array.isArray(value) && policies.length) setReceipt({ round: modern ? v11RoundLabel(next.round - 1) : String(next.round), outcomes: policies });
   setNotice(value === "redraw" ? "Shuffled" : policies.length ? "" : outcomes.length ? "Challenge complete" : "Round skipped");
   playSound(value === "redraw" ? "shuffle" : policies.some(action => !action.accepted) ? "fail" : "pass");
  }catch(err){setError((err as Error).message);}finally{acting.current=false;setBusy(false);}
 }
 function toggle(card:QuotedPolicy){if(busy)return;if(chosen.includes(card.id)){setChosen(chosen.filter(id=>id!==card.id));setInspect(null);setPanel(null);playSound("select");return;}
  if(cost+card.cost>run.resources.credits){setError("Not enough coins for this selection.");return;}
  if(card.factor&&run.offers.some(c=>chosen.includes(c.id)&&byId.get(c.id)?.factor===card.factor)){setError("Choose one stage per factor.");return;}
  setChosen([...chosen,card.id]);setInspect(null);setPanel(null);setError("");playSound("select");
 }
 const pips=(value:number)=>Math.max(0,Math.min(7,Math.round(value/100*7)));
 const explanations:Record<string,string>={economy:`+${run.nextIncome} coins each round. Revenue funds the game budget; it is separate from En-ROADS economic growth.`,support:`Reference approval ${run.generalApproval}%. Politics has the strongest effect on approval. Difficult policies and negotiation fatigue consume support.`,awareness:"Public engagement adds a smaller approval boost. At 60+ it also reduces political effort. Fair transition and inclusive participation help build support; they do not directly cool the planet."};
 return <div className="v9-experience"><WorldBackground/><main ref={board} id="main-content" className={`v9-board ${run.specialRound&&!run.finishedAt?"has-arcade":""}`} aria-label="2026 policy planning">
  <div className="v9-top"><Clock run={run}/><div className={`v9-rounds ${modern?"v11-rounds":""}`} data-tutorial="rounds" aria-label={modern?`Policy round ${v11RoundLabel(run.round)} of 9`:`Round ${Math.min(10,run.round+1)} of 10`}>{roundLabels.map((label,i)=><span key={i} className={`${i<run.round?"done":""} ${i===run.round?"current":""} ${(modern?label==="★":[3,6].includes(i))?"special":""}`} aria-current={i===run.round?"step":undefined}>{label}</span>)}</div><button className="icon-button" aria-label={sound?"Mute sound":"Enable sound"} onClick={()=>{setSound(!sound);setSoundEnabled(!sound);}}>{sound?<Volume2 size={18}/>:<VolumeX size={18}/>}</button></div>
  {run.finishedAt?<TemperatureResult run={run} session={session} onHistory={()=>setPanel("History")} onUpdate={evaluation=>setRun(current=>({...current,modelEvaluation:evaluation}))}/>:<>
   <div className="v9-hud"><div className="v9-resources">{(["economy","support","awareness"]as const).map(key=><div key={key} className="v9-resource"><button data-tutorial={key} onClick={()=>setStat(stat===key?null:key)} aria-expanded={stat===key}><span>{resourceNames[key]}</span><span className={`v9-pips ${pips(run.resources[key])<3?"low":""}`} aria-label={`${pips(run.resources[key])} of 7`}>{Array.from({length:7},(_,i)=><i key={i} className={i<pips(run.resources[key])?"lit":""}/>)}</span><b>{key==="economy"?`+${run.nextIncome}/round`:key==="support"?`${run.generalApproval}%`:""}</b></button>{stat===key&&<p className="v9-stat-tip">{explanations[key]}</p>}</div>)}</div><div className="v9-wallet" data-tutorial="coins" aria-label={`${run.resources.credits} coins`}><ClimateCoin/><strong>{run.resources.credits}</strong></div></div>
   {run.electionMandate&&<div className="v9-mandate">Election mandate · 96%+ approval</div>}
   {run.specialRound?<ArcadeRound key={run.round} run={run} busy={busy} onAction={act} onSkip={()=>void act("save")}/>:<section className="v9-table" aria-label="Offered cards">
    <div className="v9-hand" data-tutorial="cards" key={`${run.round}-${run.redrawsUsed}`}>
     {(run.offers as QuotedPolicy[]).map(card=><article key={card.id} className={`v9-card ${chosen.includes(card.id)?"selected":""} ${card.wildcard?"wildcard":""} ${card.riskCard?"risky":""} ${card.rarity==="rare"?"gold-rare":""}`} style={policyTint(card)}>
      <button className="v9-card-face" onPointerEnter={()=>playSound("hover")} onClick={()=>{setInspect(card);playSound("tap");}} aria-label={`Inspect ${card.title}`}>
       <div className="v9-card-art"><CardArt eager card={{id:card.photo,category:card.category}}/><span className="v9-cost">{card.cost}<span className="sr-only"> coins</span></span>{chosen.includes(card.id)&&<span className="v9-check"><Check size={18}/></span>}{(card.riskCard||card.rarity==="rare")&&<span className={`v11-card-badge ${card.riskCard?"risk":"rare"}`}>{card.riskCard?"High risk":"Rare"}</span>}</div>
       <small className="v9-family">{card.factor?controlFor(card.factor).label:card.setting}</small><h2>{card.title}</h2><p>{card.setting}</p><span className="v9-odds">{card.approval}% approval</span>
      </button>
      <button className="v9-select" disabled={busy||!chosen.includes(card.id)&&cost+card.cost>run.resources.credits} aria-pressed={chosen.includes(card.id)} onClick={()=>toggle(card)}>{chosen.includes(card.id)?"Selected":"Select"}</button>
     </article>)}
    </div>
    <div className="v9-controls">
      <button className="game-button gold" data-tutorial="play" disabled={busy||!chosen.length||cost>run.resources.credits} onClick={()=>void act(chosen)}>{busy?<LoaderCircle className="spin" size={18}/>:"Play"}{!!chosen.length&&<small>{cost} coins</small>}</button>
      <button className="game-button" data-tutorial="shuffle" disabled={busy||!run.canRedraw} onClick={()=>void act("redraw")}><Shuffle size={15}/><span>Shuffle<small>{run.redrawCost} coin{run.redrawCost===1?"":"s"}</small></span></button>
      <button className="game-button" data-tutorial="skip" disabled={busy} onClick={()=>void act("save")}>Skip</button>
    </div>
   </section>}
   <p className="v9-notice" role="status">{error||notice||""}</p>
  </>}
  <nav className="v9-tools"><button data-tutorial="library" disabled={busy} onClick={()=>setPanel("Library")}><BookOpen size={17}/> Library</button>{!run.finishedAt&&<button data-tutorial="history" disabled={busy} onClick={()=>setPanel("History")}><History size={17}/> History</button>}{!run.finishedAt&&!run.specialRound&&<button disabled={busy} onClick={()=>{setStat(null);setTutorial(true);}}><CircleHelp size={17} aria-hidden="true"/> How to play</button>}</nav>
 </main>
 {tutorial&&!run.finishedAt&&!run.specialRound&&<GameTutorial board={board} run={run} onClose={closeTutorial}/>}
 {inspect&&<Sheet title={inspect.title} onClose={()=>setInspect(null)}><div className="v9-inspection" style={policyTint(inspect)}><CardArt card={{id:inspect.photo,category:inspect.category}}/><p>{inspect.description}</p>{inspect.factor&&<div className="v9-target"><small>{controlFor(inspect.factor).label}</small><span>{settingLabel(inspect.factor,run.policySettings?.[inspect.factor]??controlFor(inspect.factor).baseline)}</span><b>→ {inspect.setting}</b></div>}<Effects card={inspect}/><div className="v9-quote"><b>{inspect.cost} coins</b><b>{inspect.approval}% approval</b></div>{inspect.requires&&<p className="v9-fine">Requires {byId.get(inspect.requires)?.title}</p>}{inspect.approval<100&&<p className="v9-fine">Rejected: lose {inspect.cost-(inspect.rejectionRefund??0)} coins and {inspect.rejectionSupport} politics.</p>}<button className="game-button gold" disabled={busy||!run.offers.some(c=>c.id===inspect.id)||!chosen.includes(inspect.id)&&cost+inspect.cost>run.resources.credits} onClick={()=>toggle(inspect)}>{!run.offers.some(c=>c.id===inspect.id)?"Not in this hand":chosen.includes(inspect.id)?"Deselect":"Select"}</button><details><summary>Model & photo sources</summary><p>{inspect.note}</p>{inspect.factor&&<a href={guideFor(inspect.factor)} target="_blank" rel="noreferrer">En-ROADS control guide ↗</a>}<CardPhotoCaption id={inspect.photo}/></details></div></Sheet>}
 {panel&&!inspect&&<Sheet title={panel} className="policy-journal-sheet" onClose={()=>setPanel(null)}>
   {panel==="Library"
     ? <PolicyLibrary version={run.rulesVersion} cards={library} filter={filter} onFilter={setFilter} onInspect={setInspect}/>
     : <PolicyHistory run={run} cards={library} onInspect={setInspect}/>}
 </Sheet>}
 {receipt&&<Sheet title={`Round ${receipt.round} results`} className="policy-receipt-sheet" onClose={()=>setReceipt(null)}>
   <PolicyRoundResults outcomes={receipt.outcomes} finished={!!run.finishedAt} onContinue={()=>setReceipt(null)}/>
 </Sheet>}
 </div>;
}
function TemperatureResult({run,session,onHistory,onUpdate}:{run:PublicRun;session:Session;onHistory:()=>void;onUpdate:(evaluation:NonNullable<PublicRun["modelEvaluation"]>)=>void}){
 const[attempts,setAttempts]=useState<AttemptStatus|null>(null),[error,setError]=useState(""),[showScenario,setShowScenario]=useState(false);
 const evaluation=run.modelEvaluation??{status:"idle"},waiting=evaluation.status==="queued"||evaluation.status==="running",complete=evaluation.status==="complete";
 const started=useRef(false),update=useRef(onUpdate);update.current=onUpdate;
 async function calculate(){setError("");try{update.current(await api(`/api/runs/${session.id}/model`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.token}`},body:"{}"}));}catch(err){setError((err as Error).message);}}
 useEffect(()=>{if(!complete&&!started.current){started.current=true;void calculate();}},[session.id]);
 useEffect(()=>{api<AttemptStatus>("/api/attempts").then(setAttempts).catch(()=>{});},[]);
 useEffect(()=>{if(!waiting)return;let alive=true;const timer=setInterval(()=>{api<NonNullable<PublicRun["modelEvaluation"]>>(`/api/runs/${session.id}/model`,{headers:{Authorization:`Bearer ${session.token}`}}).then(value=>{if(alive)update.current(value);}).catch(()=>{});},2500);return()=>{alive=false;clearInterval(timer);};},[waiting,session.id,session.token]);
 return <section className="v9-result" aria-label="Your result"><p className="v9-eyebrow">YOUR 2100 SCENARIO</p><h1>{complete?`+${evaluation.temperatureC!.toFixed(1)}°C`:error||evaluation.status==="failed"?"Calculation paused":"Calculating…"}</h1>
 <p className="v9-result-player"><Flag code={run.country}/>{run.nickname}<span>{formatTime(run.elapsedMs??0)}</span></p>
 {!complete&&!error&&evaluation.status!=="failed"&&<p className="v9-result-status"><LoaderCircle className="spin" size={17}/>{evaluation.status==="queued"?"Waiting for the calculation laptop…":"Evaluating your policies…"}</p>}
 {(error||evaluation.error)&&<p role="alert" className="error-message">{error||evaluation.error}</p>}
 {(error||evaluation.status==="failed")&&<button className="game-button gold" onClick={calculate}>Retry calculation</button>}
 <div className="v9-result-actions">{complete&&evaluation.sourceUrl&&<button className="game-button gold" onClick={()=>setShowScenario(true)}>Results & graphs</button>}<Link className="game-button" href="/leaderboard">Leaderboard</Link><button className="game-button" onClick={onHistory}>History</button>{!!attempts?.remaining&&<button className="game-button quiet" onClick={()=>{localStorage.removeItem(SESSION_KEY);window.location.href="/";}}>Play again · {attempts.remaining} left</button>}</div>
 <small className="v9-fine">{complete?<><a href="https://www.climateinteractive.org/" target="_blank" rel="noreferrer">Climate Interactive</a> / <a href="https://mitsloan.mit.edu/" target="_blank" rel="noreferrer">MIT Sloan</a> · En-ROADS {evaluation.modelVersion}<br/>Conditional projection · experimental browser connection.</>:"Your game is saved. Calculation does not count toward play time."}</small>
 {showScenario&&evaluation.sourceUrl&&<ScenarioResults url={evaluation.sourceUrl} onClose={()=>setShowScenario(false)}/>}
 </section>;
}
