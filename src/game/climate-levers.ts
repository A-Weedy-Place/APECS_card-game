/**
 * Policy-input descriptions adapted from Climate Interactive's CC BY 4.0 guide.
 * Exact control bounds were checked in the public En-ROADS v26.9.0 UI on 2026-10-13.
 * Card targets and card-to-control mappings are OUR scenario assumptions, not
 * En-ROADS results. No simulator, emissions conversion or temperature arithmetic
 * runs here. See context/09-enroads-mapping.md for sources and limitations.
 */
export const POLICY_ADOPTION_YEAR = 2026;
export const ENROADS_REFERENCE_VERSION = "26.9.0";
// Current public model controls begin in 2027. Adoption in 2026 is distinct from
// implementation, construction, capital turnover and later physical outcomes.
export const ENROADS_EARLIEST_START_YEAR = 2027;
export const ENROADS_REFERENCE_URL = "https://en-roads.climateinteractive.org/scenario.html?v=26.9.0";

const guide = "https://docs.climateinteractive.org/projects/en-roads/en/latest/guide/";

export interface ClimateLeverDefinition {
  label: string;
  unit: string;
  min: number;
  max: number;
  baseline: number | null;
  /** More ambitious policy target, NOT guaranteed monotonic temperature impact. */
  stronger: "higher" | "lower";
  source: string;
  interpretation: string;
}

export const CLIMATE_LEVERS = {
  "renewables-price": { label: "Renewables price adjustment", unit: "% of levelized cost", min: -100, max: 50, baseline: -25, stronger: "lower", source: `${guide}renewables.html`, interpretation: "Net taxes minus subsidies for the global renewable mix; negative means subsidy. Solar and wind share this lever, so their subsidies do not add." },
  "nuclear-price": { label: "Nuclear price adjustment", unit: "% of levelized cost", min: -100, max: 50, baseline: -30, stronger: "lower", source: `${guide}nuclear.html`, interpretation: "A net subsidy changes the competitiveness of nuclear generation. It is not a guaranteed electricity share or construction schedule." },
  "coal-new-capacity": { label: "Reduce new coal infrastructure", unit: "%", min: 0, max: 100, baseline: 0, stronger: "higher", source: `${guide}coal.html`, interpretation: "Discourages investment in new coal infrastructure. Existing plants require a separate retirement policy." },
  "coal-retirement": { label: "Coal plant accelerated retirement", unit: "%/year", min: 0, max: 10, baseline: 0, stronger: "higher", source: `${guide}coal.html`, interpretation: "Additional annual retirement of coal infrastructure; not an immediate percentage cut in global emissions." },
  "clean-electricity-standard": { label: "Clean electricity standard", unit: "% qualifying electricity", min: 60, max: 100, baseline: null, stronger: "higher", source: `${guide}carbonprice.html`, interpretation: "Enable the standard; this scenario counts renewables and nuclear, and excludes bioenergy and fossil generation even with CCS. The baseline is disabled, not a 60% mandate." },
  "buildings-efficiency": { label: "Buildings & industry efficiency", unit: "%/year", min: 0, max: 3, baseline: 1.2, stronger: "higher", source: `${guide}buildings_ee.html`, interpretation: "Annual improvement in the energy intensity of new buildings and industrial capital; existing stock changes gradually. A global aggregate proxy, not a measured effect of a single retrofit programme." },
  "buildings-electrification": { label: "Electric equipment subsidy", unit: "% purchase cost", min: 0, max: 50, baseline: 0, stronger: "higher", source: `${guide}buildings_elec.html`, interpretation: "Purchase incentive for electric equipment across buildings and industry. A heat-only or industry-only card is represented by a broad aggregate proxy; actual adoption depends on the power mix and stock turnover." },
  "transport-efficiency": { label: "Transport efficiency", unit: "%/year", min: 0, max: 3, baseline: 0.5, stronger: "higher", source: `${guide}transport_ee.html`, interpretation: "Annual improvement in the energy intensity of new transport capital; includes system efficiency. It is not an immediate cut in transport emissions." },
  "transport-electrification": { label: "Electric transport subsidy", unit: "% purchase cost", min: 0, max: 50, baseline: 7, stronger: "higher", source: `${guide}transport_elec.html`, interpretation: "Road and rail purchase subsidy with charging infrastructure. Does not include ships or aircraft; cleaner electricity strengthens its effect." },
  "energy-methane": { label: "Energy methane leak controls", unit: "% of reduction potential", min: 0, max: 100, baseline: 0, stronger: "higher", source: `${guide}waste.html`, interpretation: "Detailed energy-system methane control only; not the combined waste/F-gas slider. Percentage of technical reduction potential, not percentage of all methane emissions." },
  "industrial-processes": { label: "Industrial process CO₂ controls", unit: "% of reduction potential", min: 0, max: 100, baseline: 0, stronger: "higher", source: ENROADS_REFERENCE_URL, interpretation: "Detailed industrial-process CO₂ reduction control verified in v26.9.0. Separate from fossil energy combustion and from methane; does not eliminate every industrial emission." },
  "deforestation": { label: "Deforestation & degradation trend", unit: "%/year", min: -10, max: 1, baseline: 0, stronger: "lower", source: `${guide}deforestation.html`, interpretation: "Annual change in the deforestation/degradation trend, not percent of existing forest removed or percentage of global emissions." },
  "forest-restoration": { label: "Land for new forests", unit: "% of available land", min: 0, max: 100, baseline: 0, stronger: "higher", source: `${guide}nature_based_removal.html`, interpretation: "Detailed afforestation/reforestation control. Model available land is 550 million hectares; carbon uptake follows land access, planting and growth. Does not automatically represent wetlands." },
  "agricultural-emissions": { label: "Agricultural best practices", unit: "% of reduction potential", min: 0, max: 100, baseline: 0, stronger: "higher", source: `${guide}ag_emissions.html`, interpretation: "Adoption of livestock and crop practices reducing methane and nitrous oxide intensity. Even 100% potential is not zero agricultural emissions." },
  "food-waste": { label: "Food waste target", unit: "% of food produced in 2100", min: 10, max: 40, baseline: 30, stronger: "lower", source: `${guide}ag_emissions.html`, interpretation: "Final share of food production wasted, not percentage reduction from the baseline. The public control targets 2100 and begins changing food choices in 2027." },
  "daccs-price": { label: "Direct air capture payment", unit: "$/ton CO₂ captured", min: 0, max: 1000, baseline: 0, stronger: "higher", source: `${guide}tech_removal.html`, interpretation: "Revenue per captured ton for DACCS, not achieved tons or removal capacity. Net removal depends on energy, infrastructure and durable storage; OAE and mineralization remain separate." },
  "carbon-price": { label: "Carbon price", unit: "$/ton CO₂", min: 0, max: 250, baseline: 5, stronger: "higher", source: `${guide}carbonprice.html`, interpretation: "Initial global price on energy CO₂. Not a price on every greenhouse gas. Keep final-price, bioenergy and CCS switches explicit when connecting a model." },
} satisfies Record<string, ClimateLeverDefinition>;

export type ClimateLeverId = keyof typeof CLIMATE_LEVERS;
export type ClimateInputTiming =
  | { kind: "phase-in"; years: number; targetYear: number; description: string }
  | { kind: "annual-rate"; description: string }
  | { kind: "model-dynamics"; description: string }
  | { kind: "target-year"; targetYear: number; description: string };

export interface ClimateLeverSetting extends ClimateLeverDefinition {
  leverId: ClimateLeverId;
  value: number;
  /** Decision year, not a claim that infrastructure appears instantly. */
  startYear: typeof POLICY_ADOPTION_YEAR;
  adoptionYear: typeof POLICY_ADOPTION_YEAR;
  modelStartYear: typeof ENROADS_EARLIEST_START_YEAR;
  sourceVersion: typeof ENROADS_REFERENCE_VERSION;
  timing: ClimateInputTiming;
  /** The numeric target is selected by the game designer inside official bounds. */
  evidence: "documented-control-designer-target";
}

const phaseIn = (years: number): ClimateInputTiming => ({ kind: "phase-in", years, targetYear: ENROADS_EARLIEST_START_YEAR + years, description: `Phase in over ${years} years from ${ENROADS_EARLIEST_START_YEAR}; capital turnover and physical response take additional time.` });
const annual: ClimateInputTiming = { kind: "annual-rate", description: "The annual rate starts in 2027; physical effects accumulate as the model changes its capital or land stocks." };
const dynamics: ClimateInputTiming = { kind: "model-dynamics", description: "Policy starts in 2027; deployment and physical outcomes are determined by the simulator, not by the turn number." };

function setting(leverId: ClimateLeverId, value: number, timing: ClimateInputTiming): ClimateLeverSetting {
  const lever = CLIMATE_LEVERS[leverId];
  if (value < lever.min || value > lever.max) throw new Error(`Climate input outside verified range: ${leverId}`);
  return { ...lever, leverId, value, startYear: POLICY_ADOPTION_YEAR, adoptionYear: POLICY_ADOPTION_YEAR, modelStartYear: ENROADS_EARLIEST_START_YEAR, sourceVersion: ENROADS_REFERENCE_VERSION, timing, evidence: "documented-control-designer-target" };
}

// These targets are a deliberately small, inspectable scenario vocabulary.
// They describe what each accepted card proposes, not what En-ROADS has run.
const CARD_CLIMATE_INPUTS: Readonly<Record<string, readonly ClimateLeverSetting[]>> = {
  solar: [setting("renewables-price", -50, phaseIn(10))],
  wind: [setting("renewables-price", -60, phaseIn(10))],
  "community-power": [setting("renewables-price", -40, phaseIn(10))],
  nuclear: [setting("nuclear-price", -60, phaseIn(10))],
  "coal-exit": [setting("coal-new-capacity", 100, dynamics), setting("coal-retirement", 5, annual)],
  "clean-power-standard": [setting("clean-electricity-standard", 90, phaseIn(15))],
  efficiency: [setting("buildings-efficiency", 2, annual)],
  heat: [setting("buildings-electrification", 25, dynamics)],
  "deep-retrofit": [setting("buildings-efficiency", 3, annual)],
  "clean-transit": [setting("transport-efficiency", 2, annual), setting("transport-electrification", 25, dynamics)],
  "clean-industry": [setting("buildings-electrification", 35, dynamics), setting("industrial-processes", 40, phaseIn(30))],
  "circular-materials": [setting("buildings-efficiency", 2.5, annual), setting("industrial-processes", 70, phaseIn(30))],
  methane: [setting("energy-methane", 50, phaseIn(30))],
  "methane-standard": [setting("energy-methane", 80, phaseIn(30))],
  "forest-protection": [setting("deforestation", -5, annual)],
  "restore-land": [setting("forest-restoration", 30, { kind: "model-dynamics", description: "Start in 2027 with 10 years to secure land and 10 years planting, retaining those separate default controls. Tree growth and removals occur later; this is not instant forest or guaranteed full planting in 2047." })],
  "food-waste": [setting("food-waste", 15, { kind: "target-year", targetYear: 2100, description: "Adopt in 2026; food-choice action starts in 2027 and targets this waste share in 2100, as defined by the official control." })],
  food: [setting("agricultural-emissions", 40, phaseIn(30))],
  agroecology: [setting("agricultural-emissions", 70, phaseIn(30))],
  removal: [setting("daccs-price", 300, dynamics)],
  "carbon-price": [setting("carbon-price", 100, phaseIn(10))],
};

const UNMAPPED_NOTES: Readonly<Record<string, string>> = {
  shipping: "Clean freight spans logistics, ports and maritime fuels. The global transport-efficiency or road/rail subsidy slider is not a validated maritime-only mapping; no numeric input is assigned.",
  grid: "Grid capacity enables clean generation and electrification. No validated numerical grid-only mapping has been assigned; a storage cost breakthrough is not an interchangeable proxy.",
  wetlands: "Wetlands protect ecosystems and communities. The inspected nature-removal controls do not provide a direct wetlands setting; no temperature effect is assigned.",
  "international-deal": "A pact enables delivery but has no independent temperature slider. Its concrete policies must set the physical inputs without counting those effects twice.",
  "energy-access": "Access and distribution are not captured by a single global mitigation slider. No numerical temperature mapping is assigned.",
  adaptation: "Adaptation protects people and infrastructure; it does not automatically reduce global temperature.",
  "coastal-protection": "Coastal protection reduces exposure to impacts; it does not automatically reduce global temperature.",
  "loss-damage": "Compensation and recovery finance are distinct from emissions reduction and carry no automatic temperature effect.",
};

const PROXY_NOTES: Readonly<Record<string, string>> = {
  solar: "The documented slider covers the whole global renewable mix, not solar alone. This card's subsidy target is a broad game scenario proxy.",
  wind: "The documented slider covers the whole global renewable mix, not wind alone. This card's subsidy target is a broad game scenario proxy.",
  "community-power": "Global renewable subsidy is a broad scenario proxy; En-ROADS does not separately model community ownership or the justice bonus.",
  efficiency: "The documented efficiency control combines buildings and industry. Its value is a global target, not a measured effect of this single upgrade programme.",
  heat: "The documented subsidy covers buildings AND industry, not heat pumps alone. This is an aggregate scenario proxy, not a heat-only forecast.",
  "deep-retrofit": "The control changes global new-capital efficiency across buildings and industry, not just retrofits. The card-to-control mapping is an assumption.",
  "clean-transit": "The efficiency target is global transport-wide; the electrification subsidy covers road and rail. Neither isolates public transit, so both targets are scenario proxies.",
  "clean-industry": "Electric-equipment subsidy also affects buildings; process-CO₂ reduction covers more than steel and cement. These global targets are broad scenario proxies.",
  "circular-materials": "Global energy efficiency and process-CO₂ targets are proxies for material efficiency, not a calibrated recycling/material-reuse model.",
};

/** No inputs for enabling, adaptation or unmapped cards. Safe for client display. */
export function climateLeversForCard(cardId: string): ClimateLeverSetting[] {
  return (CARD_CLIMATE_INPUTS[cardId] ?? []).map(input => ({ ...input, timing: { ...input.timing } }));
}

export function climateMappingNote(cardId: string): string {
  if (PROXY_NOTES[cardId]) return `${PROXY_NOTES[cardId]} No temperature result has been simulated.`;
  if (CARD_CLIMATE_INPUTS[cardId]) return "Input targets informed by documented En-ROADS controls; target choices are game assumptions. Not a simulated temperature result.";
  return UNMAPPED_NOTES[cardId] ?? "Finance, participation, skills and public support enable implementation. No direct En-ROADS temperature input is assigned; the game effects are design assumptions.";
}

/**
 * A proposal for later SDK/manual scenario evaluation, NOT a climate model.
 * Overlapping cards select the strongest target for a shared control. They do
 * not add percentages, subsidy rates or temperature changes. Store one combined
 * scenario and run it together once authorised model access is available.
 */
export function combineClimateLevers(cardIds: readonly string[]): ClimateLeverSetting[] {
  const combined = new Map<ClimateLeverId, ClimateLeverSetting>();
  for (const cardId of cardIds) {
    for (const input of climateLeversForCard(cardId)) {
      const previous = combined.get(input.leverId);
      if (!previous || (input.stronger === "higher" ? input.value > previous.value : input.value < previous.value)) combined.set(input.leverId, input);
    }
  }
  return [...combined.values()].sort((a, b) => a.leverId.localeCompare(b.leverId));
}

export function climateSettingSummary(input: ClimateLeverSetting): string {
  if (input.leverId === "renewables-price" || input.leverId === "nuclear-price") return `${Math.abs(input.value)}% net subsidy`;
  if (input.leverId === "carbon-price") return `$${input.value}/t CO₂`;
  if (input.leverId === "daccs-price") return `$${input.value}/t captured`;
  return `${input.value}${input.unit.startsWith("%") ? "" : " "}${input.unit}`;
}
