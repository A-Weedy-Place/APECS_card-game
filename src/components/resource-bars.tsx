import { ClimateCoin } from "./climate-coin";
import type { PublicRun } from "@/game/types";
const metrics = [
  { key: "economy", label: "Economy", family: "economics" },
  { key: "support", label: "Politics", family: "politics" },
  { key: "awareness", label: "Awareness", family: "awareness" },
  { key: "justice", label: "Justice", family: "justice" },
  { key: "transition", label: "Transition", family: "technology" },
] as const;
export const resourceBand = (value: number, max = 100) => value / max < .2 ? "Very low" : value / max < .4 ? "Low" : value / max < .7 ? "Steady" : value / max < .9 ? "Strong" : "Very high";
export const resourcePips = (value: number, max = 100) => Math.max(0, Math.min(7, Math.round(value / max * 7)));
export function ResourceBars({ run, onDetails }: { run: PublicRun; onDetails: () => void }) {
  return <div className="battle-hud">
    <button className="stat-strips" onClick={onDetails} aria-label="Stats: effects and rules">{metrics.map(({ key, label, family }) => {
      const max = key === "transition" ? run.transitionTarget ?? 100 : 100;
      const value = key === "transition" ? Math.min(max, Math.round(run.transition)) : run.resources[key];
      const pips = resourcePips(value, max);
      return <span className={`stat-row category-${family} ${pips <= 2 ? "resource-low" : pips >= 5 ? "resource-high" : "resource-mid"}`} key={key}><span>{key === "transition" ? "Climate action" : key === "justice" ? "Fairness" : label}</span><span className="stat-pips" role="meter" aria-label={key === "transition" ? "Climate action progress" : label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-valuetext={`${pips} of 7${key === "economy" ? `, ${run.nextIncome} coins per round` : key === "support" && run.generalApproval !== undefined ? `, ${run.generalApproval}% reference approval` : ""}`}>{Array.from({ length: 7 }, (_, index) => <i key={index} className={index < pips ? "filled" : ""}/>)}</span><b>{key === "economy" ? `+${run.nextIncome}/round` : key === "support" && run.generalApproval !== undefined ? `${run.generalApproval}% base` : `${pips}/7`}</b></span>;
    })}</button>
    <div className="credit-reserve coin-purse" aria-label={`${run.resources.credits} coins`}><ClimateCoin/><strong>{run.resources.credits}</strong><span>Coins</span></div>
  </div>;
}
