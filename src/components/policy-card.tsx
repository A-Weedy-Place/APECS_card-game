"use client";
import { motion, useReducedMotion } from "motion/react";
import { Check, Sparkles } from "lucide-react";
import { playSound } from "@/lib/sound";
import { CATEGORY_LABELS } from "@/game/config";
import { FAMILY_INFO } from "@/game/perks";
import type { Effects, OfferedCard } from "@/game/types";
import { PolicyIcon } from "./icons";
import { CardArt } from "./card-art";
import { climateSettingSummary } from "@/game/climate-levers";
const labels = { economy: "Economy", support: "Politics", awareness: "Awareness", justice: "Fairness", transition: "Climate action", credits: "Coins" };
const icons = { economy: "bank", support: "people", awareness: "megaphone", justice: "scale", transition: "leaf", credits: "credits" };
export function EffectChips({ effects, qualitative = false }: { effects: Effects; qualitative?: boolean }) {
  return <span className="effect-chips">{Object.entries(effects).filter(([, value]) => value !== 0).map(([key, value]) => <span key={key} className={value < 0 ? "negative" : "positive"} title={`${labels[key as keyof typeof labels]} ${value > 0 ? "+" : ""}${value} points`}><PolicyIcon name={icons[key as keyof typeof icons]} size={14}/><b>{`${value > 0 ? "+" : ""}${value}`}</b> {labels[key as keyof typeof labels]}</span>)}</span>;
}
export function PolicyCard({ card, index, disabled, position, familyCount, onChoose, selected = false, onToggle, direct = false, onInspect, onCardFocus }: { card: OfferedCard; index: number; disabled: boolean; position: number; familyCount: number; onChoose: () => void; selected?: boolean; onToggle?: () => void; direct?: boolean; onInspect?: () => void; onCardFocus?: () => void }) {
  const reduce = useReducedMotion();
  return <motion.article className={`policy-card game-card category-${card.category} ${card.rarity ? "rare-card" : ""} ${selected ? "selected-card" : ""} ${!card.affordable ? "unaffordable" : ""} ${position === 0 ? "focused-card" : position < 0 ? "hand-left" : "hand-right"}`} data-position={position} initial={reduce ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : .2, delay: index * .035 }}>
    <button className="card-inner" onClick={direct ? onInspect : onChoose} onPointerEnter={event => { if (event.pointerType === "mouse") playSound("hover"); }} onFocus={() => { onCardFocus?.(); playSound("hover"); }} disabled={disabled} aria-label={`Inspect ${card.title}, ${card.cost} coins, ${card.approval}% approval chance`}>
      <span className="card-cost" aria-label={`${card.cost} coins`}>{card.cost}</span>
      <span className="card-family"><PolicyIcon name={FAMILY_INFO[card.category].icon} size={15}/>{CATEGORY_LABELS[card.category].replace("Climate ", "")}</span>
      <span className="card-picture"><CardArt card={card}/></span>
      <span className="card-title">{card.title}</span>
      {direct && <span className="card-flavour">{card.description}</span>}
      <span className="card-effect-list"><EffectChips qualitative={direct} effects={{ ...card.effects, ...(card.transitionGain ? { transition: card.transitionGain } : {}) }}/></span>
      <span className="card-seal" title={card.climateInputs?.[0]?.label}><Sparkles size={13}/>{card.rarity ? "RARE · Hidden consequence" : card.climateInputs?.length ? climateSettingSummary(card.climateInputs[0]) : card.tier ? `Tier ${card.tier}${card.repeatable ? " · Repeatable" : card.bonuses.length ? " · Modified" : ""}` : familyCount >= 2 ? "Buff active" : `${Math.min(familyCount + 1, 2)}/2 to buff`}</span>
      <span className={`card-approval ${card.approval < 60 ? "risky" : ""}`}><b>{card.approval}%</b> approval{!card.affordable && <span>Too costly</span>}</span>
    </button>
    {direct ? <button className="card-pick" aria-label={`${selected ? "Deselect" : "Select"} ${card.title}`} aria-pressed={selected} disabled={disabled || (!selected && !card.affordable)} onFocus={onCardFocus} onClick={onChoose}><Check size={18} aria-hidden="true"/><span>{selected ? "Selected" : "Select"}</span></button> : onToggle && <button className="card-select" aria-label={`${selected ? "Deselect" : "Select"} ${card.title}`} aria-pressed={selected} disabled={disabled || (!selected && !card.affordable)} onClick={onToggle}><Check size={18}/><span>{selected ? "Selected" : "Select"}</span></button>}
  </motion.article>;
}
