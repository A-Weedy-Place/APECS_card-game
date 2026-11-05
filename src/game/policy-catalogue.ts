import controls from "./enroads-controls.json";
import type { Card, Effects } from "./types";
export const MODEL_VERSION="26.11.0";
export const MODEL_PROFILE="enroads-main-26.11.0-defaults-2026-11-05";
export const LEGACY_MODEL_PROFILE="enroads-main-26.10.0-defaults-2026-10-31";
export const CONTROLS=controls;
export type PolicySettings=Record<string,number>;
export type PolicyCardV9=Card&{factor?:string;target?:number;setting:string;photo:string;branch?:string;wildcard?:boolean};
export const defaultSettings=():PolicySettings=>Object.fromEntries(CONTROLS.map(control=>[control.id,control.baseline]));
export const controlFor=(id:string)=>CONTROLS.find(control=>control.id===id)!;
export const guideFor=(id:string)=>`https://docs.climateinteractive.org/projects/en-roads/en/latest/guide/${controlFor(id).guide}`;
export function settingLabel(id:string,value:number){
  if(id==="new-zero")return value===2?"Huge breakthrough":value===1?"Breakthrough":"Status quo";
  if(id==="population")return `${value}bn in 2100`;
  if(id==="gdp")return `${value}% GDP/person growth`;
  if(id==="carbon-price")return `$${value}/t CO₂`;
  if(["coal","oil","gas","bioenergy","renewables","nuclear"].includes(id))return `${Math.abs(value)}% ${value<0?"subsidy":"net tax"}`;
  if(id.includes("efficiency"))return `${value}%/year efficiency`;
  if(id.includes("electric"))return `${value}% purchase subsidy`;
  if(id==="deforestation")return `${value}%/year forest-loss trend`;
  return `${value}% of potential`;
}
const result:PolicyCardV9[]=[];
function branch(factor:string,titles:string[],targets:number[],photos:string[],options:{branch?:string;effects?:Effects;costs?:number[]}={}){
  const name=options.branch??"main";
  titles.forEach((title,index)=>{
    const id=`${factor}-${name}-${index+1}`,requires=index?`${factor}-${name}-${index}`:undefined;
    const growth=["population","gdp"].includes(factor);
    result.push({id,title,factor,target:targets[index],setting:settingLabel(factor,targets[index]),photo:photos[index],branch:name,
      description:growth?`Explore a ${title.toLowerCase()} scenario. A model assumption, not a guaranteed policy outcome.`:`Set ${controlFor(factor).label.toLowerCase()} to ${settingLabel(factor,targets[index])}.`,
      category:"technology",pathway:factor,cost:options.costs?.[index]??[5,8,11][index],difficulty:8+index*8,
      tier:(index+1)as 1|2|3,role:"action",phases:["Foundation","Momentum","Transformation"],...(requires?{requires}:{}),
      effects:options.effects??{support:-4-index*2},icon:"leaf",note:`En-ROADS ${MODEL_VERSION} main control. All other advanced settings stay at this version's defaults. Costs and approval are game assumptions. Adoption is in 2026; implementation follows the model's timing, not round numbers.`});
  });
}
branch("coal",["End coal subsidies","Coal price reform","Strong coal tax"],[0,75,160],["coal-exit","coal-mine","clean-industry"]);
branch("renewables",["Renewable support","Scale clean power","Renewables at scale"],[-40,-65,-90],["solar","wind","community-power"]);
branch("oil",["Oil demand reform","Oil price signal","Strong oil tax"],[50,100,180],["oil-platform","oil-pump","oil-refinery"]);
branch("nuclear",["Nuclear support","Firm power programme","Nuclear build-out"],[-45,-70,-95],["nuclear","nuclear-build","nuclear-control"]);
branch("gas",["End gas subsidies","Gas price reform","Strong gas tax"],[0,75,160],["methane","gas-plant","lng-terminal"]);
branch("new-zero",["Energy breakthrough","Huge breakthrough"],[1,2],["innovation-fund","skills-training"],{costs:[9,14]});
branch("bioenergy",["Bioenergy reform","Limit bioenergy subsidies","Strong bioenergy tax"],[0,70,150],["biofuel","biogas","biomass"]);
branch("carbon-price",["Carbon price: low","Carbon price: medium","Carbon price: high"],[20,60,100],["carbon-price","international-deal","revenue-reform"]);
branch("transport-efficiency",["Efficient transport","Transport standards","High-efficiency fleets"],[1.5,2.2,3],["transit-planning","clean-transit","cycling"]);
branch("transport-electric",["Electric mobility","EV infrastructure","Electrified transport"],[20,35,50],["electric-car","ev-charger","electric-train"]);
branch("buildings-efficiency",["Efficient buildings","Retrofit programme","Deep efficiency"],[1.8,2.4,3],["efficiency","deep-retrofit","insulation"]);
branch("buildings-electric",["Clean heat grants","Industry electrifies","Electric equipment"],[15,30,50],["heat","electric-motor","induction"]);
branch("population",["Low population growth","Lowest population growth"],[9.7,9.1],["climate-solidarity","climate-literacy"],{branch:"low",costs:[6,10],effects:{awareness:4,support:-3}});
branch("population",["High population growth","Highest population growth"],[10.8,11.3],["trusted-media","open-science"],{branch:"high",costs:[4,7],effects:{support:-3}});
branch("gdp",["Low consumption growth","Lowest consumption growth"],[1,0.5],["green-bank","social-dividend"],{branch:"low",effects:{economy:-9,support:-8}});
branch("gdp",["High economic growth","Highest economic growth"],[2,2.5],["emergency-levy","clean-contracts"],{branch:"high",effects:{economy:9,support:3}});
branch("agriculture",["Farm emissions plan","Food-system programme","Agriculture transformation"],[30,60,90],["food","agroecology","food-waste"]);
branch("waste",["Leak & waste controls","Waste-system overhaul","Deep leakage cuts"],[30,60,90],["circular-materials","landfill","refrigerants"]);
branch("deforestation",["Slow forest loss","Protect standing forests","End forest-loss pressure"],[-2,-5,-9],["forest-protection","restore-land","rewilding-leap"]);
branch("nature-removal",["Nature removal: low","Nature removal: medium","Nature removal: high"],[25,55,85],["wetlands","afforestation","forest-soil"]);
branch("tech-removal",["Removal research","Removal scale-up","Removal deployment"],[25,55,85],["removal","capture-research","capture-plant"]);
const support=(id:string,title:string,group:"politics"|"awareness"|"economics",cost:number,effects:Effects,photo:string,description:string,requires?:string):PolicyCardV9=>({id,title,category:group,cost,effects,photo,description,setting:group==="economics"?"Revenue growth":group==="awareness"?"Public engagement":"Political support",difficulty:0,phases:["Foundation","Momentum","Transformation"],role:"enabler",tier:requires?2:1,...(requires?{requires}:{}),repeatable:!requires,icon:"people",note:"Enabling game mechanic. No direct En-ROADS slider or temperature effect."});
result.push(
  support("coalition-v9","Build a coalition","politics",4,{support:20},"coalition","Secure support for harder policies."),
  support("assembly-v9","Cross-party agreement","politics",7,{support:30,awareness:4},"citizens-assembly","Build a durable negotiating majority.","coalition-v9"),
  support("listen-v9","Community dialogue","awareness",3,{awareness:18,support:6},"participatory-budget","Listen, explain and build public trust."),
  support("fair-v9","Fair transition","awareness",5,{awareness:16,support:12},"worker-transition","Protect affected workers and share the benefits. Justice is broader than awareness."),
  support("participate-v9","Inclusive decisions","awareness",6,{awareness:24,support:10},"indigenous-leadership","Give affected communities a real voice.","listen-v9"),
  support("revenue-v9","Revenue programme","economics",4,{economy:18},"resilience-fund","Increase the game budget's income, not model GDP."),
  support("finance-v9","Long-term finance","economics",7,{economy:26,support:-4},"loss-damage","Expand future round allocations.","revenue-v9"),
  support("access-v9","Public services","awareness",4,{awareness:12,economy:5},"energy-access","Build trust through accessible public services."),
  {...support("mandate-v9","Win an election mandate","politics",18,{support:20},"clean-power-standard","Fund a lawful campaign for a climate platform. Success makes later policy approval at least 96%.","coalition-v9"),wildcard:true,rarity:"rare",role:"action",difficulty:30,risk:"Election defeat",repeatable:false,note:"Designer wildcard, not bribery or an En-ROADS input. Rejection refunds 25% and loses 15 politics. No guarantee of real-world political outcomes."},
);
export const POLICY_CARDS=result;
export const POLICY_BY_ID=new Map(result.map(card=>[card.id,card]));
export function settingsFor(history:{cardId:string;accepted:boolean;kind?:string}[]):PolicySettings{
  const settings=defaultSettings();for(const action of history){const card=POLICY_BY_ID.get(action.cardId);if(action.kind==="policy"&&action.accepted&&card?.factor)settings[card.factor]=card.target!;}return settings;
}
export function validSettings(value:unknown):value is PolicySettings{
  return !!value&&typeof value==="object"&&!Array.isArray(value)&&Object.keys(value).length===CONTROLS.length&&CONTROLS.every(control=>{const n=(value as PolicySettings)[control.id];return typeof n==="number"&&Number.isFinite(n)&&n>=control.min&&n<=control.max&&(control.id!=="new-zero"||Number.isInteger(n));});
}
export const scenarioCanonical=(settings:PolicySettings,profile=MODEL_PROFILE)=>JSON.stringify({profile,settings:CONTROLS.map(control=>[control.id,settings[control.id]])});
