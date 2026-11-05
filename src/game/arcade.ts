// Public, deterministic arcade courses. Independent of private policy RNG.
// Replayed by the server; these are game points, never climate-model outputs.
export const ARCADE_FRAMES = 1080;
export const ARCADE_SIZE = 420;
export type ArcadeKind = "flight" | "cleanup";
export type ArcadeVariant = "classic" | "rising" | "endless";
export type Lane = 0 | 1 | 2;
export type SwimMove = { frame: number; lane: Lane };
export type ArcadeResult = { frames: number[]; moves?: SwimMove[]; endFrame: number; score: number };
export type PuffinState = { frame: number; y: number; velocity: number; passed: number; beacons: number; collected: number; dead: boolean; lastCollected?: number };
export const initialPuffin = (): PuffinState => ({ frame: 0, y: 210, velocity: -2.8, passed: 0, beacons: 0, collected: 0, dead: false });
export function iceGate(index: number, frame: number,variant:ArcadeVariant="classic") {
  const rising=variant!=="classic";
  return { x: 500 + index * 194 - gateDistance(frame,variant), centre: 144 + ((index * 61 + 29) % 130), gap: Math.max(variant==="endless"?84:rising?112:132, (rising?176:180) - frame * (rising?.055:.044)), width: 52 };
}
function gateDistance(frame:number,variant:ArcadeVariant) {
  if(variant!=="endless")return (variant==="rising"?2.05:2.15)*frame+(variant==="rising"?.00155:.00095)*frame*frame;
  const accelerating=Math.min(frame,6000);
  return 2.05*accelerating+.00155*accelerating*accelerating+Math.max(0,frame-6000)*20.65;
}
export function gateIndices(frame:number,variant:ArcadeVariant="classic") {
  if(variant!=="endless")return Array.from({length:22},(_,index)=>index);
  const first=Math.max(0,Math.floor((gateDistance(frame,variant)-552)/194));
  return Array.from({length:5},(_,index)=>first+index);
}
export const endlessCoins=(frame:number)=>Math.min(8,Math.floor(frame/240));
export function stepPuffin(current: PuffinState, flap: boolean,variant:ArcadeVariant="classic"): PuffinState {
  if (current.dead || variant!=="endless" && current.frame >= ARCADE_FRAMES) return current;
  const frame = current.frame + 1, velocity = flap ? -4.35 : Math.min(6, current.velocity + .23), y = current.y + velocity;
  let dead = y < 17 || y > 394, passed = 0, collected = current.collected, beacons = current.beacons;
  let lastCollected=current.lastCollected;
  for (const index of gateIndices(frame,variant)) {
    const gate = iceGate(index, frame,variant);
    if (gate.x + gate.width < 84) passed++;
    if (gate.x < 109 && gate.x + gate.width > 85 && Math.abs(y - gate.centre) > gate.gap / 2 - 11) dead = true;
    if ((variant==="endless"?lastCollected!==index:!(collected & (1 << index))) && gate.x + 26 <= 98 && iceGate(index, frame - 1,variant).x + 26 > 98 && Math.abs(y - gate.centre) < 25) {
      if(variant==="endless")lastCollected=index;else collected |= 1 << index;
      beacons++;
    }
  }
  if(variant==="endless")passed=Math.max(0,Math.ceil((gateDistance(frame,variant)-468)/194));
  return { frame, y, velocity, passed, beacons, collected, dead,...(variant==="endless"?{lastCollected}:{}) };
}
export const puffinScore = (state: PuffinState) => Math.min(100, Math.round(state.passed * 5 + state.beacons * 2 + state.frame / ARCADE_FRAMES * 15));

export const laneY = (lane: Lane) => 110 + lane * 100;
export type TrashKind = "bottle" | "bag" | "can" | "net";
export type Trash = { id: number; lane: Lane; x: number; hp: number; kind: TrashKind };
export type Bubble = { x: number; y: number };
export type Splash = { x: number; y: number; frame: number; hit: boolean };
export type ReefState = { frame: number; lane: Lane; y: number; trash: Trash[]; bubbles: Bubble[]; splashes: Splash[]; spawned: number; nextSpawn: number; nextShot: number; cleared: number; combo: number; bestCombo: number; hits: number; invulnerableUntil: number; boostUntil: number; dead: boolean };
export const initialReef = (): ReefState => ({ frame: 0, lane: 1, y: 210, trash: [], bubbles: [], splashes: [], spawned: 0, nextSpawn: 45, nextShot: 1, cleared: 0, combo: 0, bestCombo: 0, hits: 0, invulnerableUntil: 0, boostUntil: 0, dead: false });
export function reefSpawn(index: number): Pick<Trash, "lane" | "kind" | "hp"> {
  const lane = ((index * 7 + Math.floor(index / 3)) % 3) as Lane;
  const kind: TrashKind = index % 7 === 5 ? "net" : index % 4 === 2 ? "bag" : index % 3 === 1 ? "can" : "bottle";
  return { lane, kind, hp: kind === "bag" ? 2 : 1 };
}
export function stepReef(current: ReefState, lane: Lane = current.lane,variant:ArcadeVariant="classic"): ReefState {
  if (current.dead || variant!=="endless" && current.frame >= ARCADE_FRAMES) return current;
  const frame = current.frame + 1, target = laneY(lane);
  const speed=variant==="endless"?Math.min(26,2+frame*.0032):variant==="rising"?2+frame*.0032:2.1+frame*.0019;
  const state: ReefState = { ...current, frame, lane, y: current.y + Math.max(-8, Math.min(8, target - current.y)), trash: current.trash.map(item => ({ ...item, x: item.x - speed })), bubbles: current.bubbles.map(bubble => ({ ...bubble, x: bubble.x + 8 })).filter(bubble => bubble.x < 445), splashes: current.splashes.filter(splash => frame - splash.frame < 25) };
  if (frame >= state.nextSpawn) {
    state.trash.push({ id: state.spawned, x: 452, ...reefSpawn(state.spawned) }); state.spawned++;
    state.nextSpawn = frame + (variant==="endless"?Math.max(8,60-Math.floor(frame/23)):variant==="rising"?Math.max(18,60-Math.floor(frame/23)):Math.max(23, 56 - Math.floor(frame / 30)));
  }
  if (frame >= state.nextShot) { state.bubbles.push({ x: 99, y: state.y }); state.nextShot = frame + (frame < state.boostUntil ? 8 : 15); }
  const popped = new Set<Bubble>();
  for (const bubble of state.bubbles) {
    const item = state.trash.find(item => item.hp > 0 && Math.abs(item.x - bubble.x) < 24 && Math.abs(laneY(item.lane) - bubble.y) < 24);
    if (!item) continue;
    popped.add(bubble);
    if (item.kind === "net") continue;
    item.hp--;
    if (!item.hp) {
      state.cleared++; state.combo++; state.bestCombo = Math.max(state.bestCombo, state.combo);
      if (state.combo && state.combo % 4 === 0) state.boostUntil = frame + 180;
      state.splashes.push({ x: item.x, y: laneY(item.lane), frame, hit: false });
    }
  }
  state.bubbles = state.bubbles.filter(bubble => !popped.has(bubble));
  for (const item of state.trash) {
    if (item.hp <= 0) continue;
    if (item.x < 101 && item.x > 39 && Math.abs(laneY(item.lane) - state.y) < 32) {
      item.hp = 0;
      if (frame >= state.invulnerableUntil) {
        state.hits++; state.combo = 0; state.invulnerableUntil = frame + 65;
        state.splashes.push({ x: 73, y: state.y, frame, hit: true });
      }
    } else if (item.x < -26 && item.kind !== "net") state.combo = 0;
  }
  state.trash = state.trash.filter(item => item.hp > 0 && item.x > -28);
  state.dead = state.hits >= 3;
  return state;
}
export const reefScore = (state: ReefState) => Math.max(0, Math.min(100, Math.round(state.cleared * 4 + state.bestCombo * 2 + state.frame / ARCADE_FRAMES * 20 - state.hits * 3)));

export function validArcadeInput(kind: ArcadeKind, frames: number[], endFrame: number, moves?: SwimMove[],variant:ArcadeVariant="classic") {
  if (!Number.isSafeInteger(endFrame) || endFrame < 1 || variant!=="endless"&&endFrame > ARCADE_FRAMES || !Array.isArray(frames)) return false;
  const maximum=variant==="endless"?Math.ceil(endFrame/3):0;
  if (kind === "flight") return moves === undefined && frames.length <= (maximum||150) && frames.every((frame,index) => Number.isInteger(frame) && frame >= 1 && frame <= endFrame && (!index || frame - frames[index - 1] >= 3));
  return !frames.length && Array.isArray(moves) && moves.length <= (maximum||180) && moves.every((move,index) => move && Number.isInteger(move.frame) && move.frame >= 1 && move.frame <= endFrame && [0,1,2].includes(move.lane) && (!index || move.frame - moves[index - 1].frame >= 3));
}
export function replaySurvival(kind:ArcadeKind,frames:number[],endFrame:number,moves:SwimMove[]=[]):{frame:number;dead:boolean} {
  if(kind==="flight"){
    let state=initialPuffin();const flaps=new Set(frames);
    for(let frame=1;frame<=endFrame&&!state.dead;frame++)state=stepPuffin(state,flaps.has(frame),"endless");
    return state;
  }
  let state=initialReef(),index=0,lane:Lane=1;
  for(let frame=1;frame<=endFrame&&!state.dead;frame++){
    if(moves[index]?.frame===frame)lane=moves[index++].lane;
    state=stepReef(state,lane,"endless");
  }
  return state;
}
export function replayArcade(kind: ArcadeKind, frames: number[], endFrame: number, moves: SwimMove[] = [],variant:ArcadeVariant="classic") {
  if (kind === "flight") {
    let state = initialPuffin(); const flaps = new Set(frames);
    for (let frame=1; frame<=endFrame && !state.dead; frame++) state=stepPuffin(state,flaps.has(frame),variant);
    return puffinScore(state);
  }
  let state=initialReef(), index=0, lane:Lane=1;
  for (let frame=1;frame<=endFrame && !state.dead;frame++) {
    if(moves[index]?.frame===frame) { lane=moves[index].lane; index++; }
    state=stepReef(state,lane,variant);
  }
  return reefScore(state);
}
