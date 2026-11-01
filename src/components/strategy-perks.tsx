import { Check, LockKeyhole, Sparkles } from "lucide-react";
import type { PublicRun } from "@/game/types";
import { FAMILY_INFO } from "@/game/perks";
import { CATEGORY_LABELS } from "@/game/config";
import { PolicyIcon } from "./icons";
export function StrategyPerks({ run }: { run: PublicRun }) {
  return <section className="strategy-perks" aria-labelledby="perks-title"><div className="perks-heading"><h2 id="perks-title"><Sparkles size={16}/> Build your strategy</h2><span>Two successful cards from a family unlock its perk.</span></div><div className="perk-grid">{run.perks.map(perk => <details className={`perk-token category-${perk.id} ${perk.active ? "perk-active" : ""}`} key={perk.id}><summary><PolicyIcon name={FAMILY_INFO[perk.id].icon} size={18}/><span>{CATEGORY_LABELS[perk.id]}<small>{perk.active ? "PERK ACTIVE" : `${Math.min(2, perk.count)}/2 TO UNLOCK`}</small></span><div className="perk-pips" aria-hidden="true">{[1, 2].map(i => <span key={i} className={perk.count >= i ? "filled" : ""}/>)}</div></summary><div className="perk-description"><strong>{perk.active ? <Check size={13}/> : <LockKeyhole size={13}/>} {perk.title}</strong><p>{perk.description}</p></div></details>)}</div></section>;
}
