import { GameError } from "./errors";
import { projectFor } from "./model";
import { replayArcade, validArcadeInput, type ArcadeKind } from "./arcade";
import { v7Create, v7Public, v7Settle, V7_BANK_LIMIT } from "./v7";
import type { Decision, PublicRun, RunState, SpecialCommand } from "./types";

// Policy mechanics are unchanged from 0.7. Only the separately replayed arcade
// courses change. Saved 0.6/0.7 attempts continue using their original physics.
export const v8Rules = (state: Pick<RunState,"rulesVersion">) => state.rulesVersion === "prototype-0.8";
export const arcadeForRound = (round:number):ArcadeKind|null => round===3 ? "flight" : round===6 ? "cleanup" : null;
export function v8Create(id:string,name:string,country:string,seed:number) {
  const state=v7Create(id,name,country,seed); state.rulesVersion="prototype-0.8";
  state.projection=projectFor([],state.rulesVersion); return state;
}
export function v8Public(state:RunState):PublicRun { return {...v7Public(state),specialRound:state.finishedAt ? null : arcadeForRound(state.round)}; }
export function v8Special(current:RunState,command:SpecialCommand,now=Date.now()):RunState {
  const kind=arcadeForRound(current.round);
  if(!v8Rules(current)||current.finishedAt||!kind)throw new GameError("No arcade round is active.",409);
  if(command.kind==="begin-special") {
    if(current.specialAttempt||!["credits","economy","support","awareness","justice"].includes(command.reward))throw new GameError("Choose one boost before starting.",409);
    const state=structuredClone(current);state.specialAttempt={kind,reward:command.reward,startedAt:now};state.revision++;state.lastActions=[];return state;
  }
  const attempt=current.specialAttempt;
  if(!attempt||attempt.kind!==kind||!validArcadeInput(kind,command.frames,command.endFrame,command.moves))throw new GameError("Invalid arcade inputs.");
  if(now-attempt.startedAt<command.endFrame/60*1000-250)throw new GameError("The challenge is still running.",409);
  const score=replayArcade(kind,command.frames,command.endFrame,command.moves),state=structuredClone(current);
  const amount=attempt.reward==="credits" ? Math.min(Math.floor(score/25),V7_BANK_LIMIT-state.resources.credits) : Math.min(Math.floor(score/6),100-state.resources[attempt.reward]);
  state.resources[attempt.reward]+=amount;
  const decision:Decision={kind:"special",planningRound:current.round+1,year:2026,cardId:`challenge-${kind}`,title:kind==="flight"?"Flappy Flight":"Reef Rescue",category:"save",accepted:true,probability:100,spent:0,refund:0,income:0,transition:0,effects:{[attempt.reward]:amount},challengeScore:score};
  state.history.push(decision);return v7Settle(state,[decision]);
}
