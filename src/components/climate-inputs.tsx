import { climateSettingSummary, type ClimateLeverSetting } from "@/game/climate-levers";

/** These are proposed simulator inputs, never precomputed per-card warming. */
export function ClimateInputs({ inputs, note, combined = false }: { inputs?: ClimateLeverSetting[]; note?: string; combined?: boolean }) {
  if (!inputs) return null;
  return <details className="model-setting">
    <summary>{combined ? `Policy targets · ${inputs.length} model inputs` : inputs.length ? "En-ROADS input targets" : "Climate mapping"}</summary>
    <p>{note ?? "Accepted policies, combined without adding overlapping slider values. These targets have not been run in En-ROADS."}</p>
    {inputs.length > 0 && <><ul>{inputs.map(input => <li key={input.leverId}><b>{input.label}: {climateSettingSummary(input)}</b><p>{input.interpretation}</p><p>{input.timing.description}</p><a href={input.source} target="_blank" rel="noreferrer">Official control · v{input.sourceVersion}</a></li>)}</ul><p>Adopted in 2026; the referenced model starts implementation in 2027. Target sizes and card mappings are designer assumptions within documented control ranges. No temperature result is calculated.</p><p>Control descriptions adapted from <a href="https://docs.climateinteractive.org/projects/en-roads/en/latest/" target="_blank" rel="noreferrer">Climate Interactive’s guide</a>, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>. No endorsement implied.</p></>}
  </details>;
}
