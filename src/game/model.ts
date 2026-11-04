import type { Decision, Projection } from "./types";

export interface ClimateAdapter {
  readonly id: string;
  project(history: Decision[]): Projection;
}

export const demoAdapter: ClimateAdapter = {
  id: "illustrative-transition-index",
  project(history) {
    let transition = 0;
    const trajectory = [{ year: 2026, pressure: 100 }];
    for (const action of history) {
      transition += action.transition;
      trajectory.push({ year: action.year, pressure: Math.max(0, Math.round(100 - transition)) });
    }
    const pressure = Math.max(0, Math.round(100 - transition));
    trajectory.push({ year: 2100, pressure });
    return {
      kind: "illustrative", model: "Illustrative game index", version: "0.1",
      pressure, trajectory,
      caveat: "Game points, not a climate forecast. No En-ROADS connection or temperature prediction is active. Social effects and costs are designer assumptions.",
    };
  },
};

// Replace this adapter only after verifying model access, terms, card-to-input
// mappings, time semantics, and cached scenario accuracy. Keep provenance here.
export const climateAdapter: ClimateAdapter = demoAdapter;

export function projectFor(history: Decision[], rulesVersion: string): Projection {
  if(modelRules(rulesVersion))return {kind:"pending",model:"En-ROADS awaiting evaluation",version:"26.10.0",trajectory:[],caveat:"No temperature has been calculated. Evaluate the full scenario; social and financial values are game assumptions."};
  if (["prototype-0.5", "prototype-0.6", "prototype-0.7", "prototype-0.8"].includes(rulesVersion)) {
    const transition = history.reduce((sum, action) => sum + action.transition, 0);
    return { ...demoAdapter.project([]), version: rulesVersion.replace("prototype-", ""), pressure: Math.max(0, Math.round(100 - transition / 150 * 100)), trajectory: [], caveat: "2026 policy package: game points, not a climate forecast. No physical time series or 2100 temperature has been calculated. En-ROADS input targets are documented separately; the licensed model is not connected." };
  }
  if (rulesVersion !== "prototype-0.4") return climateAdapter.project(history);
  let transition = 0;
  const pressureFor = (value: number) => Math.max(0, Math.round(100 - value / 180 * 100));
  const trajectory = [{ year: 2026, pressure: 100 }];
  for (const action of history) { transition += action.transition; trajectory.push({ year: action.year, pressure: pressureFor(transition) }); }
  trajectory.push({ year: 2100, pressure: pressureFor(transition) });
  return { ...demoAdapter.project([]), version: "0.4", pressure: pressureFor(transition), trajectory };
}
import { modelRules } from "@/game/model-rules";
