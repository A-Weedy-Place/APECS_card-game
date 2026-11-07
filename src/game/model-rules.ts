import { stagedRules } from "./v11-schedule";

/** Versions that score only a validated complete climate-model scenario. */
export const modelRules = (version: string) => stagedRules(version) || version === "prototype-0.9" || version === "prototype-0.10";
