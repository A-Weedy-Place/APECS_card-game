"use client";
import { useState } from "react";
import { LockKeyhole, Check, ArrowLeft } from "lucide-react";
import type { PublicRun } from "@/game/types";
import { CATEGORY_LABELS } from "@/game/config";
import { CardArt, CardPhotoCaption } from "./card-art";
import { EffectChips } from "./policy-card";
import { ClimateInputs } from "./climate-inputs";

export function CardLibrary({ run }: { run: PublicRun }) {
  const [path, setPath] = useState(""), [query, setQuery] = useState(""), [selected, setSelected] = useState("");
  const cards = (run.library ?? []).filter(card => (!path || card.pathway === path) && `${card.title} ${card.description}`.toLowerCase().includes(query.toLowerCase()));
  const card = run.library?.find(card => card.id === selected);
  if (card) return <div className="shelf-detail">
    <button className="game-button library-back" onClick={() => setSelected("")}><ArrowLeft size={17}/> All cards</button>
    <div className={`shelf-detail-card category-${card.category}`}><div className="detail-photo"><CardArt card={card}/></div><CardPhotoCaption id={card.id}/><small>{CATEGORY_LABELS[card.category]} · Tier {card.tier ?? 1}</small><h3>{card.title}</h3><p>{card.description}</p><EffectChips effects={{ ...card.effects, transition: card.transitionGain }}/><p>{card.cost} coins · {card.approval}% approval</p>{card.lockedReason && <p className="library-lock">{card.lockedReason}</p>}{!!card.resilience && <p>Resilience +{card.resilience}</p>}{!!card.upkeep && <p>Upkeep: {card.upkeep} coin / round</p>}{card.risk && <p className="risk-warning">{card.risk}. Exact consequence revealed after adoption.</p>}{card.bonuses.map(bonus => <p key={bonus}>{bonus}</p>)}
      {(run.library ?? []).some(c => c.requiresAll?.includes(card.id) || c.requiresAny?.includes(card.id)) && <p><b>Unlocks:</b> {(run.library ?? []).filter(c => c.requiresAll?.includes(card.id) || c.requiresAny?.includes(card.id)).map(c => c.title).join(" · ")}</p>}
      <ClimateInputs inputs={card.climateInputs} note={card.climateNote}/>
    </div>
  </div>;
  return <div className="card-library shelf-library">
    <div className="library-filters"><label>Path<select value={path} onChange={e => setPath(e.target.value)}><option value="">All paths</option>{run.pathways?.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label><label>Search<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a card"/></label></div>
    {run.synergyLibrary && <details className="combination-guide"><summary>Combinations <small>{run.activeSynergies?.length ?? 0} / {run.synergyLibrary.length}</small></summary><div className="combination-recipes">{run.synergyLibrary.map(combo => <div key={combo.id} className={combo.active ? "active" : ""}><b>{combo.title}{combo.active ? " · Active" : ""}</b><p className="recipe-parts">{combo.requires.map((id, i) => <span key={id}>{i > 0 && " + "}<span className={run.library?.find(c => c.id === id)?.taken ? "complete" : ""}>{run.library?.find(c => c.id === id)?.title ?? id}</span></span>)}</p><p>{combo.description.replaceAll("credits","coins").replaceAll("credit","coin")}</p></div>)}</div></details>}
    <p className="library-count">{cards.length} cards</p>
    <div className="library-shelf">{cards.map(card => <button key={card.id} className={`shelf-card category-${card.category} ${card.rarity ? "rare-shelf" : ""}`} onClick={() => setSelected(card.id)} aria-label={`View ${card.title}`}>
      <span className="shelf-cost">{card.cost}</span><span className="shelf-category">{CATEGORY_LABELS[card.category].replace("Climate ", "")}</span><span className="shelf-photo"><CardArt card={card}/></span><b>{card.title}</b><span className="shelf-state">{card.taken && !card.repeatable ? <><Check size={12}/> Played</> : card.lockedReason ? <><LockKeyhole size={12}/> Locked</> : `Tier ${card.tier ?? 1} · ${card.approval}%`}</span>
    </button>)}</div>
    {!cards.length && <p>No matching cards.</p>}
  </div>;
}
