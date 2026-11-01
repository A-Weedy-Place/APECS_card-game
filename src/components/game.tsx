"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, BookOpen, Check, ChevronLeft, ChevronRight, History, LoaderCircle, Shuffle, X } from "lucide-react";
import { RULES_VERSION } from "@/game/config";
import { FAMILY_INFO, familyInfoFor } from "@/game/perks";
import type { Decision, OfferedCard, PublicRun } from "@/game/types";
import { api, getSessionRun, readSession, requestId, type Session } from "@/lib/client";
import { ResourceBars } from "./resource-bars";
import { EffectChips, PolicyCard } from "./policy-card";
import { Results } from "./results";
import { CardArt } from "./card-art";
import { WorldBackground } from "./game-world";
import { PolicyIcon } from "./icons";
import { CardLibrary } from "./card-library";
import { ClimateInputs } from "./climate-inputs";
import { GameV6 } from "./game-v6";
import { GameV9 } from "./game-v9";

export function Game() {
  const [run, setRun] = useState<PublicRun | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<Decision | null>(null);
  const [receipts, setReceipts] = useState<Decision[]>([]);
  const [chosen, setChosen] = useState<string[]>([]);
  const [selected, setSelected] = useState<OfferedCard | null>(null);
  const [focus, setFocus] = useState(1);
  const [notice, setNotice] = useState("");
  const [journal, setJournal] = useState<"played" | "buffs" | "stats" | "library" | null>(null);
  const pending = useRef<{ cardId?: string; cardIds?: string[]; revision: number; requestId: string } | null>(null);
  const acting = useRef(false);
  const receiptDialog = useRef<HTMLDialogElement>(null);
  const inspectDialog = useRef<HTMLDialogElement>(null);
  const journalDialog = useRef<HTMLDialogElement>(null);
  const board = useRef<HTMLElement>(null);
  useEffect(() => {
    const stored = readSession(); setSession(stored);
    if (!stored) { setLoading(false); return; }
    getSessionRun(stored).then(next => { setRun(next); setFocus(Math.min(1, Math.max(0, next.offers.length - 1))); }).catch(err => setError(err.message)).finally(() => setLoading(false));
  }, []);
  useEffect(() => { if (receipt && !receiptDialog.current?.open) receiptDialog.current?.showModal(); }, [receipt]);
  useEffect(() => { if (selected && !inspectDialog.current?.open) inspectDialog.current?.showModal(); }, [selected]);
  useEffect(() => { if (journal && !journalDialog.current?.open) journalDialog.current?.showModal(); }, [journal]);
  useEffect(() => { if (!notice) return; const timeout = setTimeout(() => setNotice(""), 2500); return () => clearTimeout(timeout); }, [notice]);

  function closeInspection() { if (acting.current) return; inspectDialog.current?.close(); setSelected(null); }
  function closeReceipt() { receiptDialog.current?.close(); setReceipt(null); board.current?.focus({ preventScroll: true }); }
  function closeJournal() { journalDialog.current?.close(); setJournal(null); }
  async function refresh() {
    if (!session || acting.current) return;
    setLoading(true); setError(""); closeInspection();
    try { const next = await getSessionRun(session); setRun(next); setFocus(Math.min(1, Math.max(0, next.offers.length - 1))); setChosen([]); pending.current = null; }
    catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  }
  async function choose(cardId: string | string[]) {
    if (!run || !session || acting.current) return;
    acting.current = true; setBusy(true); setError(""); setNotice("");
    const action = Array.isArray(cardId) ? { cardIds: cardId } : { cardId };
    if (!pending.current || JSON.stringify(pending.current.cardIds ?? pending.current.cardId) !== JSON.stringify(cardId) || pending.current.revision !== run.revision) pending.current = { ...action, revision: run.revision, requestId: requestId() };
    try {
      const next = await api<PublicRun>(`/api/runs/${session.id}/actions`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` }, body: JSON.stringify(pending.current),
      });
      setRun(next); setChosen([]); setFocus(Math.min(1, Math.max(0, next.offers.length - 1))); pending.current = null;
      inspectDialog.current?.close(); setSelected(null);
      if (cardId === "redraw") setNotice(run.redrawCost ? `Reshuffled · −${run.redrawCost} credit${run.redrawCost === 1 ? "" : "s"}` : "New cards. Redraw used.");
      else { const outcomes = next.lastActions ?? [next.history.at(-1)!]; setReceipts(outcomes); setReceipt(outcomes[0]); }
    } catch (err) { setError((err as Error).message); }
    finally { acting.current = false; setBusy(false); }
  }
  function inspect(card?: OfferedCard) { if (card && !acting.current) { setError(""); setSelected(card); } }
  function toggleCard(card: OfferedCard) {
    if (acting.current) return;
    setChosen(ids => ids.includes(card.id) ? ids.filter(id => id !== card.id) : [...ids, card.id]);
    closeInspection();
  }
  const years = run?.years ?? [2030, 2040, 2050, 2060, 2070, 2080, 2090];
  const total = run?.totalRounds ?? 7;
  const isV5 = run?.rulesVersion === "prototype-0.5";
  const isV4 = run?.rulesVersion === "prototype-0.4" || isV5;
  const packageCost = run?.offers.filter(c => chosen.includes(c.id)).reduce((sum, c) => sum + c.cost, 0) ?? 0;

  if(run?.rulesVersion==="prototype-0.9"&&session)return <GameV9 initialRun={run} session={session}/>;
  if (run && ["prototype-0.6", "prototype-0.7", "prototype-0.8"].includes(run.rulesVersion) && session) return <GameV6 initialRun={run} session={session}/>;

  return <div className="game-experience"><WorldBackground/>
    <main id="main-content" ref={board} tabIndex={-1} className={`battle-screen ${isV5 ? "planning-screen" : ""}`} aria-label={run ? isV5 ? `2026 policy planning, round ${Math.min(total, run.round + 1)} of ${total}` : `${run.year}, decision ${Math.min(total, run.round + 1)} of ${total}` : "Game"}>
      {loading ? <div className="loading-state"><LoaderCircle className="spin"/> Loading</div> : !run ? <section className="empty-panel"><h1>{error || "No game saved"}</h1>{session && <button className="game-button" onClick={refresh}>Retry</button>}<Link href="/" className="game-button gold">Play</Link></section> : run.finishedAt ? <Results run={run} onHistory={() => setJournal("played")}/> : <>
        <h1 className="sr-only">{isV5 ? "2026 policy planning" : run.year}</h1>
        {isV5 ? <div className="planning-marker"><span>2026 · Policy planning</span><b>Round {run.round + 1} / {total}</b></div> : <div className="decade-strip" aria-label={`Decision ${run.round + 1} of ${total}, ${run.year}`}>{years.filter((_, index) => !isV4 || index % 2 === 0).map((year, group) => {
          const index = isV4 ? group * 2 : group; const current = isV4 ? Math.floor(run.round / 2) === group : run.round === index;
          return <span key={year} className={`${current ? "current" : index < run.round ? "done" : ""} ${isV4 ? "paired-year" : ""}`} aria-current={current ? "step" : undefined}>{current ? run.year : year}{isV4 && <i className="turn-pips" aria-hidden="true"><i className={index <= run.round ? "lit" : ""}/><i className={index + 1 <= run.round ? "lit" : ""}/></i>}</span>;
        })}<span className="result-year">2100</span></div>}
        <ResourceBars run={run} onDetails={() => setJournal("stats")}/>
        <div className="board-message" aria-live="polite">{error ? <span className="board-error">{error} <button onClick={refresh}>Retry</button></span> : run.rulesVersion !== RULES_VERSION ? <Link href="/">Earlier rules · New game</Link> : chosen.length ? `${chosen.length} selected · ${packageCost > run.resources.credits ? `Need ${packageCost - run.resources.credits} more credits — remove a card` : `${run.resources.credits - packageCost} credits left after play`}` : notice || (run.worldEvent && <button onClick={() => setJournal("stats")}>{run.worldEvent.title} <span>ⓘ</span></button>)}</div>
        <section className="card-stage" aria-label="Policy choices">
          {!run.offers.length && <div className="empty-hand">Hand played<small>Shuffle or end the round</small></div>}
          <AnimatePresence mode="wait"><motion.div className="cards-grid" key={`${run.round}-${run.redrawsUsed ?? 0}`} exit={{ opacity: 0 }} transition={{ duration: .1 }}>{run.offers.map((card, index) => <PolicyCard
            key={card.id} card={card} index={index} position={index - focus} disabled={busy} selected={chosen.includes(card.id)} onToggle={isV5 ? () => toggleCard(card) : undefined} familyCount={run.perks.find(p => p.id === card.category)?.count ?? 0}
            onChoose={() => { if (window.matchMedia("(max-width: 680px)").matches && index !== focus) setFocus(index); else inspect(card); }}/>)}</motion.div></AnimatePresence>
        </section>
        <div className="hand-controls"><button className="round-button" aria-label="Previous card" disabled={focus === 0 || busy || !run.offers.length} onClick={() => setFocus(focus - 1)}><ChevronLeft size={22}/></button><div className="hand-dots" aria-label="Focus a card">{run.offers.map((card, index) => <button key={card.id} aria-label={`Focus card ${index + 1}: ${card.title}`} aria-pressed={index === focus} onClick={() => setFocus(index)} disabled={busy}><span className={chosen.includes(card.id) ? "chosen-dot" : ""}/></button>)}</div><button className="round-button" aria-label="Next card" disabled={focus >= run.offers.length - 1 || busy} onClick={() => setFocus(focus + 1)}><ChevronRight size={22}/></button></div>
        <div className="turn-controls"><button className="game-button gold play-focused" disabled={busy || !run.offers.length || packageCost > run.resources.credits} onClick={() => isV5 && chosen.length ? choose(chosen) : inspect(run.offers[focus])}>{busy ? "Working…" : isV5 ? chosen.length ? `Play ${chosen.length} · ${packageCost} credits` : "Select cards" : "Play card"}</button><button className="game-button skip-button" disabled={busy || chosen.length > 0} onClick={() => choose(isV5 ? "end-round" : "save")}>{isV5 ? run.round === total - 1 ? "Finish" : "End round" : "Skip"}<small>{isV5 ? run.roundSaveBonus ? "No cards played · Save +2" : "Keep unspent credits" : "Save +2 credits"}</small></button></div>
        <div className="utility-controls"><button className="game-button quiet" disabled={busy} onClick={() => setJournal("played")}><History size={17}/> Played / Buffs</button>{run.library && <button className="game-button quiet" disabled={busy} onClick={() => setJournal("library")}><BookOpen size={17}/> Library</button>}<button className="game-button quiet" disabled={!run.canRedraw || busy} onClick={() => choose("redraw")} aria-label={isV4 ? `Reshuffle for ${run.redrawCost} credits` : "Redraw the three offers once, free"}><Shuffle size={17}/>{isV4 ? `Shuffle · ${run.redrawCost}` : run.canRedraw ? "Redraw" : "Used"}</button></div>
      </>}
    </main>

    <dialog ref={inspectDialog} className={`inspect-dialog category-${selected?.category ?? "technology"}`} onCancel={event => { if (acting.current) event.preventDefault(); else closeInspection(); }} aria-labelledby="inspect-title">{selected && run && <>
      <button className="dialog-close" disabled={busy} aria-label="Close card inspection" onClick={closeInspection}><X size={20}/></button>
      <div className="inspect-art"><CardArt card={selected}/></div><div className="inspect-body">
        <h2 id="inspect-title">{selected.title}</h2><p>{selected.description}</p>
        <EffectChips effects={{ ...selected.effects, ...(selected.transitionGain ? { transition: selected.transitionGain } : {}) }}/>
        {isV4 ? <><p className="inspect-perk"><b>{run.pathways?.find(p => p.id === selected.pathway)?.title} · Tier {selected.tier}</b>{!selected.note.startsWith("Prototype game values") && selected.note}{run.library?.some(c => c.requiresAll?.includes(selected.id) || c.requiresAny?.includes(selected.id)) && <span className="next-upgrades">Leads to: {run.library.filter(c => c.requiresAll?.includes(selected.id) || c.requiresAny?.includes(selected.id)).map(c => c.title).join(" · ")}</span>}</p>{selected.bonuses.length > 0 && <ul className="combo-list">{selected.bonuses.map(b => <li key={b}>{b}</li>)}</ul>}{!!selected.resilience && <p>Resilience +{selected.resilience}</p>}{!!selected.upkeep && <p>Upkeep: {selected.upkeep} credit / turn</p>}</> : <p className="inspect-perk">{familyInfoFor(run, selected.category).description} <b>{run.perks.find(p => p.id === selected.category)?.active ? "Active" : `${Math.min(2, (run.perks.find(p => p.id === selected.category)?.count ?? 0) + 1)}/2 if passed`}</b></p>}
        {!!selected.mandateCost && <p className="risk-caption">Political effort: −{selected.mandateCost} support, included above.</p>}
        <div className="inspect-odds"><span><b>{selected.approval}%</b> approval</span><span><b>{selected.cost}</b> credits</span></div>
        {selected.approval < 100 && <p className="risk-caption">Rejected: lose {selected.cost - (selected.rejectionRefund ?? 0)} credits{selected.rejectionSupport ? ` and ${selected.rejectionSupport} politics` : ""}.{!isV5 && " Turn used."}</p>}
        {isV5 && <p className="risk-caption">A package uses the odds and costs shown now. Play preparation first to improve later plays.</p>}
        <ClimateInputs inputs={selected.climateInputs} note={selected.climateNote}/>
        {!selected.affordable && <p className="error-message">Need {selected.cost - run.resources.credits} more credits.</p>}
        {error && <p className="error-message" role="alert">{error}</p>}
        <button className="game-button gold" disabled={busy || (!chosen.includes(selected.id) && !selected.affordable)} onClick={() => isV5 ? toggleCard(selected) : choose(selected.id)}>{busy ? <LoaderCircle className="spin" size={20}/> : isV5 ? chosen.includes(selected.id) ? "Remove from selection" : "Select" : "Play"}</button>
      </div>
    </>}</dialog>

    <dialog ref={receiptDialog} className="receipt-dialog game-receipt" onCancel={closeReceipt} aria-labelledby="receipt-title">{receipt && <>
      <button className="dialog-close" aria-label="Close turn summary" onClick={closeReceipt}><X size={20}/></button>
      <div className={`receipt-symbol ${receipt.accepted ? "success" : "blocked"}`}>{receipt.accepted ? <Check size={28}/> : <X size={28}/>}</div>
      <h2 id="receipt-title">{receipts.length > 1 ? "Package resolved" : receipt.kind === "round-end" ? "Round complete" : receipt.cardId === "save" ? "Saved" : receipt.accepted ? "Passed" : "Rejected"}</h2>
      {receipts.length > 1 ? <div className="package-outcomes">{receipts.map((outcome, index) => <div key={`${outcome.cardId}-${index}`}><b>{outcome.accepted ? "✓ Passed" : "✕ Rejected"} · {outcome.title}</b><EffectChips effects={{ ...outcome.effects, ...(outcome.transition ? { transition: outcome.transition } : {}) }}/>{!outcome.accepted && <small>{outcome.spent - outcome.refund} credits lost</small>}{!!outcome.resilience && <small>Resilience +{outcome.resilience}</small>}{outcome.unlockedPerks?.map(id => <small key={id}>{FAMILY_INFO[id as keyof typeof FAMILY_INFO].title} · Active</small>)}{outcome.unlockedSynergies?.map(id => <small key={id}>{run?.activeSynergies?.find(s => s.id === id)?.title ?? id} · Active</small>)}</div>)}</div> : <>
      <p className="receipt-policy">{receipt.title}</p>
      <EffectChips effects={{ ...receipt.effects, ...(receipt.transition ? { transition: receipt.transition } : {}) }}/>
      {!receipt.accepted && <p>{receipt.spent - receipt.refund} credits lost · {receipt.refund} refunded</p>}
      {receipt.unlockedSynergies?.map(id => <p className="perk-unlocked" key={id}>{run?.activeSynergies?.find(s => s.id === id)?.title ?? id} · Active</p>)}
      {!!receipt.resilience && <p>Resilience +{receipt.resilience}</p>}
      {receipt.unlockedPerks?.map(id => <p className="perk-unlocked" key={id}><PolicyIcon name={FAMILY_INFO[id as keyof typeof FAMILY_INFO].icon} size={18}/><span><b>{FAMILY_INFO[id as keyof typeof FAMILY_INFO].title}</b>{familyInfoFor(run!, id as keyof typeof FAMILY_INFO).description}</span></p>)}
      {receipt.income > 0 && <p className="receipt-income">Net income <b>+{receipt.income}</b><small>{receipt.upkeep ? `Upkeep ${receipt.upkeep} · ` : ""}{receipt.decay?.support ? `${receipt.decay.support} politics` : ""}{receipt.decay?.awareness ? ` · ${receipt.decay.awareness} awareness` : ""}{receipt.decay?.economy ? ` · ${receipt.decay.economy} economy` : ""}</small></p>}
      </>}
      <button className="game-button gold" onClick={closeReceipt}>{run?.finishedAt ? "View result" : isV5 ? "Continue" : `Continue to ${run?.year}`} <ArrowRight size={17}/></button>
    </>}</dialog>

    <dialog ref={journalDialog} className="journal-dialog" aria-labelledby="journal-title" onCancel={closeJournal}>{run && <>
      <button className="dialog-close" aria-label="Close played cards and buffs" onClick={closeJournal}><X size={20}/></button><h2 id="journal-title">{journal === "library" ? "Card library" : "Played / Buffs"}</h2>
      <div className="journal-tabs">{(["played", "buffs", "stats", ...(run.library ? ["library" as const] : [])] as const).map(tab => <button key={tab} className={journal === tab ? "active" : ""} aria-pressed={journal === tab} onClick={() => setJournal(tab)}>{tab[0].toUpperCase() + tab.slice(1)}</button>)}</div>
      {journal === "library" && <CardLibrary run={run}/>}
      {journal === "played" && <div className="played-list">{run.history.length ? run.history.map((action, index) => <div className={`history-row category-${action.category}`} key={index}>
        <span className="history-thumbnail">{action.cardId !== "save" && action.kind !== "round-end" && <CardArt card={{ id: action.cardId, category: action.category as OfferedCard["category"] }}/>}</span><div><small>{isV5 ? `Round ${action.planningRound ?? 1}` : action.year} · {action.kind === "round-end" ? "Budget closed" : action.cardId === "save" ? "Skipped" : action.accepted ? "Passed" : "Rejected"}</small><b>{action.title}</b><EffectChips effects={{ ...action.effects, ...(action.transition ? { transition: action.transition } : {}) }}/></div>
      </div>) : <p>No cards played.</p>}</div>}
      {journal === "buffs" && <div className="buff-list">
        {isV4 && <>{run.activeSynergies?.length ? run.activeSynergies.map(s => <div className="buff-row active" key={s.id}><div><b>{s.title}</b><p>{s.description}</p></div></div>) : <p>Build combinations shown in the Library.</p>}<h3>Family bonuses</h3></>}
        {run.perks.map(perk => <div className={`buff-row category-${perk.id} ${perk.active ? "active" : ""}`} key={perk.id}><PolicyIcon name={FAMILY_INFO[perk.id].icon} size={21}/><div><b>{perk.title} <small>{Math.min(2, perk.count)}/2</small></b><p>{perk.description}</p></div></div>)}
        <h3>Pressure</h3><p>{isV4 ? `Upkeep: ${run.upkeep ?? 0} credit/round. A weak economy drains political support. Negotiation fatigue makes ambitious policies harder in later rounds; consultation remains reliable.` : "Earlier rules apply to this saved game."}</p>
      </div>}
      {journal === "stats" && <div className="stat-rules">
        {isV5 && <p><b>One policy package, adopted in 2026</b>Ten planning rounds, not ten time periods. Select several affordable cards, Play, then continue spending or End round. Physical implementation would happen gradually; its timing is listed under each model input.</p>}
        <p><b>Economy</b>Funds the next round. Weak finances drain political support. Next allocation: {run.nextIncome}; upkeep: {run.upkeep ?? 0}.</p>
        <p><b>Politics</b>The mandate needed for difficult reforms. Preparation is reliable; ambitious policies can have very low approval.</p>
        <p><b>Awareness</b>Raises approval and transition game points. It does not directly change a model’s physical inputs.</p>
        <p><b>Justice</b>Who benefits, who pays and who has a voice. Worker and community protections reduce disruption and preserve support.</p>
        <p><b>Resilience: {run.resilience ?? 0}</b>Protects against the budget stress-test, not global warming.</p>
        {isV5 && <p><b>Coming challenges</b>Round 6: technology costs +1 unless economy is 70+. End of round 8: −6 economy, −5 politics; resilience 20 halves losses, 40 prevents them.</p>}
        <p><b>Paths & reshuffling</b>Build foundations to unlock upgrades. Shuffle costs 1, then 2, then 3 credits within a round. {isV5 ? "Only End round resets the price and releases the next funding allocation. End without playing to save +2. Preparing before a later play can improve its quote; cards in one package use their current quotes." : "The price resets after a decision."}</p>
        <p><b>Transition</b>{isV5 ? "Designer game points. No bonus for an earlier calendar year: every policy is adopted in 2026." : "Designer game points with an early-action bonus."}</p>
        {run.scoreBreakdown && <div className="score-breakdown">{run.scoreBreakdown.map(s => <span key={s.label}>{s.label}<b>{s.value} / {s.max}</b></span>)}</div>}
        <ClimateInputs inputs={run.climateScenario} combined/>
        {run.worldEvent && <p><b>{run.worldEvent.title}</b>{run.worldEvent.description}</p>}
        <p className="assumptions">Designer assumptions. Not a climate forecast. <Link href="/about">Full rules</Link></p>
      </div>}
    </>}</dialog>
  </div>;
}
