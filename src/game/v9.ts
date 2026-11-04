import { GameError } from "./errors";
import { randomAt } from "./random";
import { arcadeForRound } from "./v8";
import { replayArcade, validArcadeInput } from "./arcade";
import { POLICY_CARDS, POLICY_BY_ID, CONTROLS, defaultSettings, settingsFor, type PolicyCardV9 } from "./policy-catalogue";
import type { Decision, Effects, OfferedCard, PublicRun, RunState, SpecialCommand } from "./types";
import { modelRules } from "./model-rules";
export const v9Rules=(state:Pick<RunState,"rulesVersion">)=>modelRules(state.rulesVersion);
const cap=(n:number,max=100)=>Math.max(0,Math.min(max,n));
const adopted=(state:RunState,id:string)=>state.history.some(action=>action.kind==="policy"&&action.accepted&&action.cardId===id);
export const v9Income=(state:RunState)=>Math.max(1,Math.min(8,3+Math.floor(state.resources.economy/25)));
export function v9Approval(state:RunState,card:PolicyCardV9){
  if(card.role==="enabler")return 100;
  if(state.electionMandate&&!card.wildcard)return Math.min(99,Math.round(96+state.resources.support*.03));
  return Math.round(Math.max(5,Math.min(95,40+state.resources.support*.6+state.resources.awareness*.12-card.difficulty-state.round*2.6)));
}
export function v9Locked(state:RunState,card:PolicyCardV9){
  if(!card.repeatable&&adopted(state,card.id))return "Already adopted";
  if(card.requires&&!adopted(state,card.requires))return `Needs ${POLICY_BY_ID.get(card.requires)?.title}`;
  if(card.factor&&card.requires&&state.policySettings?.[card.factor]!==POLICY_BY_ID.get(card.requires)?.target)return `Needs the previous ${card.branch??"main"} stage active`;
  return null;
}
export function v9Effects(state:RunState,card:PolicyCardV9):Effects{
  const effects={...card.effects};
  if(card.role==="action"&&!card.wildcard)effects.support=(effects.support??0)-Math.max(2,4+(card.tier??1)*2-(state.resources.awareness>=60?2:0));
  return effects;
}
export function v9Quote(state:RunState,card:PolicyCardV9):OfferedCard{
  return {...card,baseCost:card.cost,affordable:card.cost<=state.resources.credits,approval:v9Approval(state,card),effects:v9Effects(state,card),transitionGain:0,bonuses:[],rejectionRefund:Math.floor(card.cost*(card.wildcard ? .25 : .5)),rejectionSupport:card.wildcard?15:4};
}
export function v9Offers(state:RunState,exclude:string[]=[]){
  if(state.finishedAt||arcadeForRound(state.round))return [];
  const eligible=POLICY_CARDS.filter(card=>!v9Locked(state,card));
  const ranked=eligible.map((card,index)=>({card,rank:randomAt(state.seed,1100000+state.round*1000+(state.redrawsUsed??0)*300+index)})).sort((a,b)=>a.rank-b.rank).map(item=>item.card);
  const pool=ranked.filter(card=>!exclude.includes(card.id));const source=pool.length>=3?pool:ranked;
  const selected:PolicyCardV9[]=[];
  const add=(card:PolicyCardV9|undefined)=>{if(card&&!selected.some(item=>item.id===card.id))selected.push(card);};
  add(source.find(card=>card.role==="enabler"&&card.cost<=state.resources.credits)??source.find(card=>card.role==="enabler"));
  for(const card of source.filter(card=>card.factor)){if(selected.length>=3)break;add(card);}
  for(const card of source){if(selected.length>=3)break;add(card);}
  const wildcard=source.find(card=>card.wildcard);
  if(wildcard&&state.round>0&&randomAt(state.seed,1300000+state.round+(state.redrawsUsed??0)*11)<.22)selected[2]=wildcard;
  return selected.map(card=>card.id);
}
const projection=()=>({kind:"pending" as const,model:"En-ROADS awaiting evaluation",version:"26.10.0",trajectory:[],caveat:"No temperature has been calculated. Evaluate the full scenario with En-ROADS; game resource values are designer assumptions."});
export function v9Create(id:string,nickname:string,country:string,seed:number):RunState{
  const state:RunState={id,nickname,country,seed,rulesVersion:"prototype-0.9",round:0,revision:0,resources:{credits:8,economy:55,support:70,awareness:30,justice:0},transition:0,offers:[],history:[],startedAt:new Date().toISOString(),finishedAt:null,score:null,projection:projection(),policySettings:defaultSettings(),redrawsUsed:0,redrawsThisTurn:0,electionMandate:false};
  state.offers=v9Offers(state);return state;
}
function apply(state:RunState,effects:Effects){for(const key of ["credits","economy","support","awareness"]as const)state.resources[key]=cap(state.resources[key]+(effects[key]??0),key==="credits"?20:100);}
export function v9Settle(state:RunState,outcomes:Decision[]):RunState{
  const ending:Decision={kind:"round-end",planningRound:state.round+1,year:2026,cardId:"end-round",title:outcomes.length?"Round complete":"Skipped",category:"save",accepted:true,probability:100,spent:0,refund:0,income:0,transition:0,effects:{}};
  state.history.push(ending);state.round++;state.revision++;state.redrawsThisTurn=0;delete state.specialAttempt;
  if(state.round===10){state.finishedAt=new Date().toISOString();state.elapsedMs=Math.max(0,Date.parse(state.finishedAt)-Date.parse(state.startedAt));state.score=null;}
  else {const old={...state.resources};apply(state,{support:-(4+(state.resources.economy<25?3:0)),awareness:-2});ending.decay={support:state.resources.support-old.support,awareness:state.resources.awareness-old.awareness};ending.income=Math.min(v9Income(state),20-state.resources.credits);apply(state,{credits:ending.income});}
  state.lastActions=outcomes.length?outcomes.map((action,index)=>index?action:{...action,income:ending.income,decay:ending.decay}):[ending];state.policySettings=settingsFor(state.history);state.offers=v9Offers(state);return state;
}
export function v9Batch(current:RunState,ids:string[]):RunState{
  if(current.finishedAt||arcadeForRound(current.round))throw new GameError("This is not a policy round.",409);
  if(!ids.length||ids.length>3||new Set(ids).size!==ids.length||ids.some(id=>!current.offers.includes(id)))throw new GameError("Choose offered cards only.");
  const cards=ids.map(id=>POLICY_BY_ID.get(id)!);
  if(cards.some(card=>!card||v9Locked(current,card)))throw new GameError("A prerequisite is missing.");
  const factors=cards.filter(card=>card.factor).map(card=>card.factor);if(new Set(factors).size!==factors.length)throw new GameError("Choose only one stage per En-ROADS factor each round.");
  const quotes=cards.sort((a,b)=>current.offers.indexOf(a.id)-current.offers.indexOf(b.id)).map(card=>v9Quote(current,card));
  const cost=quotes.reduce((sum,card)=>sum+card.cost,0);if(cost>current.resources.credits)throw new GameError("Not enough coins for this selection.");
  const state=structuredClone(current);state.resources.credits-=cost;const outcomes:Decision[]=[];
  for(const card of quotes){const original=POLICY_BY_ID.get(card.id)!;const accepted=randomAt(current.seed,1400000+current.history.length+outcomes.length)*100<card.approval;
    const effects=accepted?card.effects:{support:original.wildcard?-15:-4},refund=accepted?0:card.rejectionRefund!;apply(state,{credits:refund});apply(state,effects);
    if(accepted&&original.wildcard)state.electionMandate=true;
    const action:Decision={kind:"policy",planningRound:current.round+1,year:2026,cardId:card.id,title:card.title,category:card.category,accepted,probability:card.approval,spent:card.cost,refund,income:0,transition:0,effects};state.history.push(action);outcomes.push(action);
  }return v9Settle(state,outcomes);
}
export function v9Action(current:RunState,id:string):RunState{
  if(current.finishedAt)throw new GameError("The game is complete.",409);
  if(["save","end-round","skip-special"].includes(id))return v9Settle(structuredClone(current),[]);
  if(id!=="redraw")return v9Batch(current,[id]);
  if(arcadeForRound(current.round))throw new GameError("No cards to shuffle.");
  const cost=(current.redrawsThisTurn??0)+1;if(cost>current.resources.credits)throw new GameError("Not enough coins to shuffle.");
  const state=structuredClone(current);state.resources.credits-=cost;state.redrawsThisTurn=cost;state.redrawsUsed=(state.redrawsUsed??0)+1;state.revision++;state.lastActions=[];state.offers=v9Offers(state,current.offers);return state;
}
export function v9Special(current:RunState,command:SpecialCommand,now=Date.now()):RunState{
  const kind=arcadeForRound(current.round);if(!kind||current.finishedAt)throw new GameError("No arcade round is active.",409);
  if(command.kind==="begin-special"){if(current.specialAttempt||!["credits","economy","support","awareness"].includes(command.reward))throw new GameError("Choose a boost.");const state=structuredClone(current);state.specialAttempt={kind,reward:command.reward,startedAt:now};state.revision++;state.lastActions=[];return state;}
  const attempt=current.specialAttempt;if(!attempt||attempt.kind!==kind||!validArcadeInput(kind,command.frames,command.endFrame,command.moves))throw new GameError("Invalid arcade inputs.");
  if(now-attempt.startedAt<command.endFrame/60*1000-250)throw new GameError("The challenge is still running.",409);
  const score=replayArcade(kind,command.frames,command.endFrame,command.moves),state=structuredClone(current),amount=Math.min(Math.floor(score/(attempt.reward==="credits"?25:6)),(attempt.reward==="credits"?20:100)-state.resources[attempt.reward]);apply(state,{[attempt.reward]:amount});
  const action:Decision={kind:"special",planningRound:current.round+1,year:2026,cardId:`challenge-${kind}`,title:kind==="flight"?"Flappy Flight":"Reef Rescue",category:"save",accepted:true,probability:100,spent:0,refund:0,income:0,transition:0,effects:{[attempt.reward]:amount},challengeScore:score};state.history.push(action);return v9Settle(state,[action]);
}
export function v9Public(state:RunState):PublicRun{
  const {seed:_secret,offers,...safe}=state;
  return {...safe,phase:state.round<3?"Foundation":state.round<7?"Momentum":"Transformation",year:2026,planningYear:2026,resultYear:2100,totalRounds:10,nextIncome:v9Income(state),perks:[],worldEvent:null,canRedraw:!state.finishedAt&&!arcadeForRound(state.round)&&state.resources.credits>=(state.redrawsThisTurn??0)+1,redrawCost:(state.redrawsThisTurn??0)+1,offers:offers.map(id=>v9Quote(state,POLICY_BY_ID.get(id)!)),library:POLICY_CARDS.map(card=>({...v9Quote(state,card),lockedReason:v9Locked(state,card),taken:adopted(state,card.id)})),pathways:CONTROLS.map(control=>({id:control.id,title:control.label,description:control.unit})),specialRound:state.finishedAt?null:arcadeForRound(state.round),generalApproval:v9Approval(state,POLICY_CARDS[0]),bankLimit:20,roundSaveBonus:0};
}
