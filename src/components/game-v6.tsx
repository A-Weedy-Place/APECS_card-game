"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BookOpen, Check, ChevronLeft, ChevronRight, History, Shuffle, Volume2, VolumeX, X } from "lucide-react";
import type { PublicRun, SpecialCommand } from "@/game/types";
import { api, getSessionRun, requestId, type Session } from "@/lib/client";
import { playSound, setSoundEnabled, soundEnabled } from "@/lib/sound";
import { WorldBackground } from "./game-world";
import { ResourceBars } from "./resource-bars";
import { PolicyCard, EffectChips } from "./policy-card";
import { CardArt, CardPhotoCaption } from "./card-art";
import { CardLibrary } from "./card-library";
import { ClimateInputs } from "./climate-inputs";
import { SpecialRound } from "./special-round";
import { ArcadeRound } from "./arcade-round";
import { Results } from "./results";

type Action = string | string[] | SpecialCommand;
const statHelp = [
  ["Economy", "Keeps funding coming. Stronger economy means more coins next round."],
  ["Politics", "Your ability to win approval. Low political support makes ambitious cards harder to pass. The base rate refers to a medium-difficulty policy; each card has its own odds."],
  ["Awareness", "Helps people understand and use a policy. Mostly improves policy delivery and climate-action progress; its approval effect is smaller than politics."],
  ["Fairness", "Protects workers and communities. High fairness limits backlash; its family bonus improves rejection refunds."],
  ["Climate action", "Progress from the mitigation policies you pass. The main part of the final game score. Seven dots summarise progress; card effects show exact points."],
];
export function GameV6({ initialRun, session }: { initialRun: PublicRun; session: Session }) {
  const [run, setRun] = useState(initialRun), [chosen, setChosen] = useState<string[]>([]), [focus, setFocus] = useState(1);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [sound, setSound] = useState(true);
  const [panel, setPanel] = useState<"stats" | "library" | "history" | "card" | null>(null), [cardId, setCardId] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null), receipt = useRef<HTMLDialogElement>(null), board = useRef<HTMLElement>(null);
  const acting = useRef(false), pending = useRef<{ signature: string; body: Record<string, unknown> } | null>(null);
  useEffect(() => setSound(soundEnabled()), []);
  useEffect(() => { if (panel) dialog.current?.showModal(); }, [panel]);
  useEffect(() => { if (showReceipt) receipt.current?.showModal(); }, [showReceipt]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(""), 2300); return () => clearTimeout(timer); }, [notice]);
  function closePanel() { dialog.current?.close(); setPanel(null); }
  function closeReceipt() { receipt.current?.close(); setShowReceipt(false); board.current?.focus({ preventScroll: true }); }
  async function act(action: Action) {
    if (acting.current) return;
    acting.current = true; setBusy(true); setError(""); playSound("tap");
    const signature = JSON.stringify([action, run.revision]);
    if (pending.current?.signature !== signature) pending.current = { signature, body: { ...(typeof action === "string" ? { cardId: action } : Array.isArray(action) ? { cardIds: action } : { special: action }), revision: run.revision, requestId: requestId() } };
    try {
      const next = await api<PublicRun>(`/api/runs/${run.id}/actions`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` }, body: JSON.stringify(pending.current.body) });
      setRun(next); setChosen([]); setFocus(1); pending.current = null;
      if (action === "redraw") { playSound(next.offers.some(card => card.rarity) ? "rare" : "shuffle"); setNotice(`Shuffled · ${run.redrawCost} coin${run.redrawCost === 1 ? "" : "s"}`); }
      else if (typeof action === "object" && !Array.isArray(action) && action.kind === "begin-special") playSound("select");
      else { playSound(next.lastActions?.some(outcome => !outcome.accepted || outcome.surprise) ? "fail" : "pass"); setShowReceipt(true); }
    } catch (err) { setError((err as Error).message); }
    finally { acting.current = false; setBusy(false); }
  }
  async function refresh() {
    if (acting.current) return; setBusy(true);
    try { setRun(await getSessionRun(session)); setChosen([]); pending.current = null; setError(""); }
    catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  function toggle(id: string, index: number) {
    if (busy) return;
    const card = run.offers.find(card => card.id === id)!;
    setFocus(index);
    if (!chosen.includes(id) && !card.affordable) { setNotice(`Need ${card.cost - run.resources.credits} more coins`); return; }
    setChosen(ids => ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id]); playSound(card.rarity ? "rare" : "select");
  }
  const cost = run.offers.filter(card => chosen.includes(card.id)).reduce((sum, card) => sum + card.cost, 0);
  const inspected = run.library?.find(card => card.id === cardId);
  const outcomes = run.lastActions ?? [];
  return <div className="game-experience vivid-game"><WorldBackground/>
    <main id="main-content" className={`battle-screen vivid-board ${run.specialRound ? "has-special" : ""}`} ref={board} tabIndex={-1} aria-label={`Round ${Math.min(10, run.round + 1)} of 10`}>
      {run.finishedAt ? <Results run={run} onHistory={() => setPanel("history")}/> : <>
        <div className="round-ribbon"><div className="round-gems" aria-label={`Round ${run.round + 1} of 10`}>{Array.from({ length: 10 }, (_, index) => <span key={index} className={`${index < run.round ? "done" : ""} ${index === run.round ? "current" : ""} ${[3, 6].includes(index) ? "special" : ""}`} aria-current={index === run.round ? "step" : undefined}>{[3, 6].includes(index) ? "✦" : index + 1}</span>)}</div><button className="sound-button" aria-label={sound ? "Mute sound effects" : "Enable sound effects"} aria-pressed={sound} onClick={() => { setSound(!sound); setSoundEnabled(!sound); if (!sound) playSound("select"); }}>{sound ? <Volume2 size={19}/> : <VolumeX size={19}/>}</button></div>
        {!run.specialRound && <ResourceBars run={run} onDetails={() => setPanel("stats")}/>}
        <div className="board-message" aria-live="polite">{error ? <span className="board-error">{error} <button onClick={refresh}>Reload</button></span> : notice || (chosen.length ? `${chosen.length} selected · ${cost > run.resources.credits ? `Need ${cost - run.resources.credits} more coins` : `${run.resources.credits - cost} coins left`}` : run.specialRound ? "" : run.worldEvent ? <button onClick={() => setPanel("stats")}>{run.worldEvent.title} · Details ⓘ</button> : "")}</div>
        {run.specialRound ? run.rulesVersion === "prototype-0.8" ? <ArcadeRound key={run.round} run={run} busy={busy} onAction={act} onSkip={() => act("skip-special")}/> : <SpecialRound key={run.round} run={run} busy={busy} onAction={act} onSkip={() => act("skip-special")}/> : <>
          <section className="card-stage" aria-label="Policy choices">
            <AnimatePresence mode="wait"><motion.div key={`${run.round}-${run.redrawsUsed}`} className="cards-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .15 }}>{run.offers.map((card, index) => <PolicyCard key={card.id} card={card} index={index} position={index - focus} disabled={busy} familyCount={run.perks.find(perk => perk.id === card.category)?.count ?? 0} direct selected={chosen.includes(card.id)} onCardFocus={() => setFocus(index)} onChoose={() => toggle(card.id, index)} onInspect={() => { setFocus(index); setCardId(card.id); setPanel("card"); }}/>)}</motion.div></AnimatePresence>
          </section>
          <div className="hand-controls"><button className="round-button" aria-label="Previous card" disabled={busy || focus === 0} onClick={() => setFocus(focus - 1)}><ChevronLeft/></button><div className="hand-dots">{run.offers.map((card, index) => <button key={card.id} aria-label={`Focus ${card.title}`} aria-pressed={index === focus} onClick={() => setFocus(index)}><span className={chosen.includes(card.id) ? "chosen-dot" : ""}/></button>)}</div><button className="round-button" aria-label="Next card" disabled={busy || focus === 2} onClick={() => setFocus(focus + 1)}><ChevronRight/></button></div>
          <div className="turn-controls three-actions"><button className="game-button gold" disabled={busy || !chosen.length || cost > run.resources.credits} onClick={() => act(chosen)}>{busy ? "Playing…" : `Play${chosen.length ? ` · ${cost} coins` : ""}`}</button><button className="game-button shuffle-main" disabled={busy || !run.canRedraw} aria-label={`Shuffle for ${run.redrawCost} coins`} onClick={() => act("redraw")}><Shuffle size={18}/> Shuffle <small>{run.redrawCost} coin{run.redrawCost === 1 ? "" : "s"}</small></button><button className="game-button skip-main" disabled={busy} onClick={() => act("save")}>Skip</button></div>
          <div className="utility-controls"><button className="game-button quiet" disabled={busy} onClick={() => setPanel("history")}><History size={16}/> History</button><button className="game-button quiet" disabled={busy} onClick={() => setPanel("library")}><BookOpen size={16}/> Library</button></div>
        </>}
      </>}
    </main>
    <dialog ref={dialog} className="journal-dialog vivid-dialog" aria-labelledby="panel-title" onCancel={closePanel}>
      <button className="dialog-close" aria-label="Close details" onClick={closePanel}><X size={20}/></button>
      <h2 id="panel-title">{panel === "library" ? "Card library" : panel === "stats" ? "Your resources" : panel === "card" ? inspected?.title : "History"}</h2>
      {panel === "library" && <CardLibrary run={run}/>}
      {panel === "card" && inspected && <div className={`card-detail category-${inspected.category}`}><div className="detail-photo"><CardArt card={inspected}/></div><CardPhotoCaption id={inspected.id}/><p>{inspected.description}</p><EffectChips qualitative effects={{ ...inspected.effects, transition: inspected.transitionGain }}/>{inspected.risk && <p className="risk-warning"><SparklesLabel/> Rare card · Risk: {inspected.risk}. Exact consequence is revealed after adoption.</p>}<p>{inspected.cost} coins · {inspected.approval}% approval</p><p>{inspected.note.startsWith("Prototype") ? "" : inspected.note}</p>{!!inspected.resilience && <p>Improves resilience and protects your budget.</p>}{!!inspected.upkeep && <p>Upkeep: {inspected.upkeep} coins each round.</p>}{inspected.bonuses.length > 0 && <ul className="combo-list">{inspected.bonuses.map(bonus => <li key={bonus}>{bonus}</li>)}</ul>}<ClimateInputs inputs={inspected.climateInputs} note={inspected.climateNote}/><button className="game-button gold" disabled={busy || !run.offers.some(card => card.id === inspected.id)} onClick={() => { toggle(inspected.id, run.offers.findIndex(card => card.id === inspected.id)); closePanel(); }}>{chosen.includes(inspected.id) ? "Deselect" : "Select card"}</button></div>}
      {panel === "stats" && <div className="stat-rules">{statHelp.map(([title, description]) => <p key={title}><b>{title}</b>{description}</p>)}<p><b>One choice per round</b>Select up to three affordable cards, then confirm once. Unspent coins carry forward. {run.rulesVersion !== "prototype-0.6" ? "Skip collects the normal round income. No extra bonus. Purse limit: 20 coins." : "Skip saves two extra coins."}</p><p><b>Special rounds 4 & 7</b>Choose a resource, play a short challenge, then collect the boost. You can skip either challenge.</p><p><b>Rare cards</b>Powerful, expensive choices. Their risk is named before you play; the precise consequence is a surprise.</p><p><b>Awareness & fairness combinations</b>Two different cards in a family unlock its buff. Explore the Library to build stronger combinations.</p><p><b>Coming challenges</b>Round 6: technology costs one more coin unless economy reaches 70 points. Any surcharge is included in the displayed cost. End of round 8: a budget stress-test reduces economy and politics. Resilience from protection cards softens the loss.</p>{run.worldEvent && <p><b>{run.worldEvent.title}</b>{run.worldEvent.description}</p>}<ClimateInputs inputs={run.climateScenario} combined/><p className="assumptions">All policies are adopted in 2026. Game values are design assumptions. Climate forecasts are not connected. <a href="/about">Rules</a> · <a href="/credits">Photo credits</a></p></div>}
      {panel === "history" && <><div className="active-buffs">{run.activeSynergies?.map(buff => <div key={buff.id}><b>{buff.title}</b><p>{buff.description.replaceAll("credits","coins").replaceAll("credit","coin")}</p></div>)}{run.perks.filter(perk => perk.active).map(perk => <div key={perk.id}><b>{perk.title}</b><p>{perk.description.replaceAll("credits","coins").replaceAll("credit","coin")}</p></div>)}</div><div className="played-list">{run.history.filter(action => action.kind !== "round-end").map((action, index) => <div key={index} className={`history-row category-${action.category}`}><div><small>Round {action.planningRound} · {action.accepted ? "Passed" : "Rejected"}</small><b>{action.title}</b><EffectChips qualitative effects={{ ...action.effects, transition: action.transition }}/>{action.surprise && <p className="risk-warning">{action.surprise.title}<EffectChips qualitative effects={action.surprise.effects}/></p>}</div></div>)}{!run.history.length && <p>No cards played yet.</p>}</div></>}
    </dialog>
    <dialog ref={receipt} className="game-receipt vivid-dialog" aria-labelledby="receipt-title" onCancel={closeReceipt}>
      <button className="dialog-close" aria-label="Close round results" onClick={closeReceipt}><X size={20}/></button><h2 id="receipt-title">{run.finishedAt ? "Last move made." : "Round complete"}</h2>
      <div className="package-outcomes">{outcomes.map((outcome, index) => <div key={index}><b>{outcome.kind === "round-end" ? "Saved" : outcome.kind === "special" ? "Challenge reward" : outcome.accepted ? <><Check size={15}/> Passed</> : "Rejected"} · {outcome.title}</b><EffectChips qualitative effects={{ ...outcome.effects, transition: outcome.transition }}/>{outcome.surprise && <p className="risk-warning"><b>{outcome.surprise.title}</b><EffectChips qualitative effects={outcome.surprise.effects}/></p>}{!outcome.accepted && <small>{outcome.spent - outcome.refund} coins lost · {outcome.refund} returned</small>}{outcome.unlockedPerks?.map(id => <small key={id}><b>{run.perks.find(perk => perk.id === id)?.title} · Active</b>{run.perks.find(perk => perk.id === id)?.description}</small>)}{outcome.unlockedSynergies?.map(id => <small key={id}>{run.activeSynergies?.find(buff => buff.id === id)?.title} · Active</small>)}{!!outcome.resilience && <small>Resilience improved</small>}</div>)}</div>
      {!run.finishedAt && <p className="receipt-income">Next funding <b>+{outcomes[0]?.income ?? run.nextIncome} coins</b></p>}
      <button className="game-button gold" onClick={closeReceipt}>{run.finishedAt ? "View result" : "Next round"}</button>
    </dialog>
  </div>;
}
function SparklesLabel() { return <span aria-hidden="true">✦</span>; }
