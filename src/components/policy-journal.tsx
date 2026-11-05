import type { CSSProperties } from "react";
import { Check, X } from "lucide-react";
import { CONTROLS, controlFor, defaultSettings, settingLabel, type PolicyCardV9 } from "@/game/policy-catalogue";
import type { Decision, LibraryCard, PublicRun } from "@/game/types";
import { CardArt } from "./card-art";
import { v11RoundLabel } from "@/game/v11-schedule";
import type { PolicyCardV11 } from "@/game/v11-catalogue";

type JournalCard = LibraryCard & PolicyCardV11;
type CardStatus = "Adopted" | "Rejected" | "Unplayed";
const colours: Record<string, string> = {
  Energy: "#f5be5b", Demand: "#78c5fa", Growth: "#bba0f7", Removal: "#73d0b1", "Land & gases": "#a5d66c",
  politics: "#ca9dff", economics: "#eabc5c", awareness: "#5ed5cf",
};
function areasFor(version:string) {
  const controls=CONTROLS.map(control=>({...control,group:version!=="prototype-0.11"?control.group:
    control.group==="Energy"?"Energy supply":control.id.startsWith("transport-")?"Transport":control.id.startsWith("buildings-")?"Buildings & industry":control.group==="Removal"?"Carbon dioxide removal":control.group}));
  return [...new Set(controls.map(control=>control.group))].map(name=>({name,controls:controls.filter(control=>control.group===name)}));
}

export function policyTint(card: PolicyCardV9): CSSProperties {
  const group = card.factor ? controlFor(card.factor).group : card.category;
  return { "--card-accent": colours[group] ?? "#8ed6cf" } as CSSProperties;
}

export function PolicyLibrary({ version, cards, filter, onFilter, onInspect }: {
  version:string;
  cards: JournalCard[];
  filter: string;
  onFilter: (value: string) => void;
  onInspect: (card: JournalCard) => void;
}) {
  const areas=areasFor(version);
  function tiles(items: JournalCard[]) {
    return <div className="v9-library" data-count={items.length}>{items.map(card => (
      <button key={card.id} className={`v9-library-card ${card.riskCard?"risky":""} ${card.rarity==="rare"?"gold-rare":""}`} style={policyTint(card)} onClick={() => onInspect(card)}>
        <CardArt card={{ id: card.photo, category: card.category }}/>
        <strong>{card.title}</strong>
      </button>
    ))}</div>;
  }

  return <>
    <label className="v9-filter">Path
      <select value={filter} onChange={event => onFilter(event.target.value)}>
        <option value="all">All paths</option>
        {areas.map(area => <optgroup key={area.name} label={area.name}>
          {area.controls.map(control => <option key={control.id} value={control.id}>{control.label}</option>)}
        </optgroup>)}
        <option value="support">Support cards</option>
      </select>
    </label>
    {areas.map(area => {
      const paths = area.controls.filter(control => filter === "all" || filter === control.id);
      if (!paths.length) return null;
      return <section key={area.name} className="library-area" style={{ "--area-accent": colours[area.name] } as CSSProperties}>
        <h3>{area.name}</h3>
        {paths.map(control => <section key={control.id} className="library-path">
          <h4>{control.label}</h4>
          {tiles(cards.filter(card => card.factor === control.id))}
        </section>)}
      </section>;
    })}
    {(filter === "all" || filter === "support") && <section className="library-area">
      <h3>Support cards</h3>{tiles(cards.filter(card => !card.factor))}
    </section>}
  </>;
}

export function PolicyHistory({ run, cards, onInspect }: {
  run: PublicRun;
  cards: JournalCard[];
  onInspect: (card: JournalCard) => void;
}) {
  const areas=areasFor(run.rulesVersion);
  const actions = run.history.filter(action => action.kind !== "round-end");
  const attempted = new Set(actions.filter(action => action.kind === "policy").map(action => action.cardId));
  const adopted = new Set(actions.filter(action => action.kind === "policy" && action.accepted).map(action => action.cardId));
  const settings = run.policySettings ?? defaultSettings();

  function nodes(items: JournalCard[], connected = true) {
    return <div className={`policy-nodes${connected ? " connected" : ""}`}>{items.map(card => {
      const status: CardStatus = adopted.has(card.id) ? "Adopted" : attempted.has(card.id) ? "Rejected" : "Unplayed";
      const label = `${card.title} · ${status}`;
      return <button key={card.id} data-status={status} aria-label={label} title={label} onClick={() => onInspect(card)}>
        <span aria-hidden="true">{status === "Adopted" ? <Check size={14}/> : status === "Rejected" ? <X size={14}/> : connected ? card.tier : "·"}</span>
      </button>;
    })}</div>;
  }

  return <>
    <div className="policy-history-columns">
      <section className="policy-round-log">
        <h3>Round log</h3>
        {run.round === 0 && <p>No rounds played.</p>}
        {Array.from({ length: run.round }, (_, index) => {
          const round = index + 1;
          const decisions = actions.filter(action => action.planningRound === round);
          const label=run.rulesVersion==="prototype-0.11"?v11RoundLabel(index):String(round);
          return <section key={round} className="policy-log-round" aria-label={`Round ${label}`}>
            <h4>{label==="★"?"Arcade ★":`Round ${label}`}</h4>
            {decisions.length ? <ul>{decisions.map(decision => (
              <li key={decision.cardId}>
                <span className={`policy-mark ${decision.accepted ? "passed" : "rejected"}`}>
                  {decision.accepted ? <Check size={13}/> : <X size={13}/>}
                  <span className="sr-only">{decision.kind === "special" ? "Completed" : decision.accepted ? "Passed" : "Rejected"}</span>
                </span>{decision.title}
              </li>
            ))}</ul> : <p>Skipped</p>}
          </section>;
        })}
      </section>
      <section className="policy-tree">
        <h3>Policy tree</h3>
        <div className="policy-tree-legend"><span>✓ Adopted</span><span>× Rejected</span><span>○ Unplayed</span></div>
        {areas.map(area => <section key={area.name} className="policy-tree-area">
          <h4 style={{ color: colours[area.name] }}>{area.name}</h4>
          {area.controls.map(control => {
            const path = cards.filter(card => card.factor === control.id);
            const branches = [...new Set(path.map(card => card.branch))];
            return <section key={control.id} className="policy-tree-path">
              <h5>{control.label}</h5>
              {branches.map(branch => <div key={branch ?? "main"} className="policy-tree-branch">
                {branches.length > 1 && <small>{branch}</small>}
                {nodes(path.filter(card => card.branch === branch))}
              </div>)}
            </section>;
          })}
        </section>)}
        <section className="policy-tree-area"><h4>Support cards</h4>{nodes(cards.filter(card => !card.factor), false)}</section>
      </section>
    </div>
    <details><summary>Current model settings</summary>{CONTROLS.map(control => <p className="v9-setting-row" key={control.id}>
      <b>{control.label}</b><span>{settingLabel(control.id, settings[control.id])}</span>
    </p>)}</details>
  </>;
}

export function PolicyRoundResults({ outcomes, finished, onContinue }: {
  outcomes: Decision[];
  finished: boolean;
  onContinue: () => void;
}) {
  return <>
    <ul className="policy-receipt">{outcomes.map(outcome => <li key={outcome.cardId}>
      <strong>{outcome.title}</strong>
      <span className={`policy-mark ${outcome.accepted ? "passed" : "rejected"}`}>
        {outcome.accepted ? <Check size={17} aria-hidden="true"/> : <X size={17} aria-hidden="true"/>}
        {outcome.accepted ? "Passed" : "Rejected"}
      </span>
    </li>)}</ul>
    <button className="game-button gold policy-continue" onClick={onContinue}>{finished ? "View result" : "Continue"}</button>
  </>;
}
