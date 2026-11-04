import { GameError } from "./errors";
import { v9Create, v9Settle } from "./v9";
import { arcadeForRound } from "./v8";
import { replayArcade, validArcadeInput } from "./arcade";
import type { Decision, RunState, SpecialCommand } from "./types";
export function v10Create(id:string,name:string,country:string,seed:number){const state=v9Create(id,name,country,seed);state.rulesVersion="prototype-0.10";return state;}
export function v10Special(current:RunState,command:SpecialCommand,now=Date.now()):RunState{
 const kind=arcadeForRound(current.round);if(!kind||current.finishedAt)throw new GameError("No arcade round is active.",409);
 if(command.kind==="begin-special"){
  if(current.specialAttempt||command.reward!=="credits")throw new GameError("Arcade rewards are coins only.");
  const state=structuredClone(current);state.specialAttempt={kind,reward:"credits",startedAt:now};state.revision++;state.lastActions=[];return state;
 }
 const attempt=current.specialAttempt;
 if(!attempt||attempt.kind!==kind||attempt.reward!=="credits"||!validArcadeInput(kind,command.frames,command.endFrame,command.moves))throw new GameError("Invalid arcade inputs.");
 if(now-attempt.startedAt<command.endFrame/60*1000-250)throw new GameError("The challenge is still running.",409);
 const score=replayArcade(kind,command.frames,command.endFrame,command.moves,"rising"),state=structuredClone(current),amount=Math.min(Math.floor(score/20),20-state.resources.credits);
 state.resources.credits+=amount;
 const action:Decision={kind:"special",planningRound:current.round+1,year:2026,cardId:`challenge-${kind}`,title:kind==="flight"?"Flappy Flight":"Reef Rescue",category:"save",accepted:true,probability:100,spent:0,refund:0,income:0,transition:0,effects:{credits:amount},challengeScore:score};
 state.history.push(action);return v9Settle(state,[action]);
}
