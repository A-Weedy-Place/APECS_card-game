import { createHash } from "node:crypto";
import { CONTROLS, LEGACY_MODEL_PROFILE, MODEL_PROFILE, MODEL_VERSION, scenarioCanonical, validSettings, type PolicySettings } from "@/game/policy-catalogue";
export type ModelResult={temperatureC:number;modelVersion:string;profile:string;provider:"public-ui-experimental";sourceUrl:string;evaluatedAt:string;readback:PolicySettings};
export const scenarioKey=(settings:PolicySettings,profile=MODEL_PROFILE)=>createHash("sha256").update(scenarioCanonical(settings,profile)).digest("hex");
export function validateModelResult(value:unknown,settings:PolicySettings,profile=MODEL_PROFILE):value is ModelResult{
 if(!value||typeof value!=="object")return false;
 const result=value as ModelResult;
 let url:URL;try{url=new URL(result.sourceUrl);}catch{return false;}
 const version=profile===MODEL_PROFILE?MODEL_VERSION:profile===LEGACY_MODEL_PROFILE?"26.10.0":null;
 return !!version&&result.modelVersion===version&&result.profile===profile&&result.provider==="public-ui-experimental"&&Number.isFinite(result.temperatureC)&&result.temperatureC>=-1&&result.temperatureC<=12&&Math.abs(result.temperatureC*10-Math.round(result.temperatureC*10))<1e-8&&Number.isFinite(Date.parse(result.evaluatedAt))&&url.protocol==="https:"&&url.hostname==="en-roads.climateinteractive.org"&&url.pathname==="/scenario.html"&&url.searchParams.get("v")===version&&validSettings(result.readback)&&CONTROLS.every(c=>Math.abs(result.readback[c.id]-settings[c.id])<1e-7);
}
