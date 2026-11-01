// Public, deterministic arcade courses. Independent of private policy RNG.
// Replayed by the server; these are game points, never climate-model outputs.
export const ARCADE_FRAMES = 1080;
export const ARCADE_SIZE = 420;
export type ArcadeKind = "flight" | "cleanup";
export type Lane = 0 | 1 | 2;
export type SwimMove = { frame: number; lane: Lane };
export type ArcadeResult = { frames: number[]; moves?: SwimMove[]; endFrame: number; score: number };
export type PuffinState = { frame: number; y: number; velocity: number; passed: number; beacons: number; collected: number; dead: boolean };
export const initialPuffin = (): PuffinState => ({ frame: 0, y: 210, velocity: -2.8, passed: 0, beacons: 0, collected: 0, dead: false });
export function iceGate(index: number, frame: number) {
  return { x: 500 + index * 194 - (2.15 * frame + .00095 * frame * frame), centre: 144 + ((index * 61 + 29) % 130), gap: Math.max(132, 180 - frame * .044), width: 52 };
}
export function stepPuffin(current: PuffinState, flap: boolean): PuffinState {
  if (current.dead || current.frame >= ARCADE_FRAMES) return current;
  const frame = current.frame + 1, velocity = flap ? -4.35 : Math.min(6, current.velocity + .23), y = current.y + velocity;
  let dead = y < 17 || y > 394, passed = 0, collected = current.collected, beacons = current.beacons;
  for (let index = 0; index < 22; index++) {
    const gate = iceGate(index, frame);
    if (gate.x + gate.width < 84) passed++;
    if (gate.x < 109 && gate.x + gate.width > 85 && Math.abs(y - gate.centre) > gate.gap / 2 - 11) dead = true;
    if (!(collected & (1 << index)) && gate.x + 26 <= 98 && iceGate(index, frame - 1).x + 26 > 98 && Math.abs(y - gate.centre) < 25) {
      collected |= 1 << index; beacons++;
    }
  }
  return { frame, y, velocity, passed, beacons, collected, dead };
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
export function stepReef(current: ReefState, lane: Lane = current.lane): ReefState {
  if (current.dead || current.frame >= ARCADE_FRAMES) return current;
  const frame = current.frame + 1, target = laneY(lane);
  const state: ReefState = { ...current, frame, lane, y: current.y + Math.max(-8, Math.min(8, target - current.y)), trash: current.trash.map(item => ({ ...item, x: item.x - (2.1 + frame * .0019) })), bubbles: current.bubbles.map(bubble => ({ ...bubble, x: bubble.x + 8 })).filter(bubble => bubble.x < 445), splashes: current.splashes.filter(splash => frame - splash.frame < 25) };
  if (frame >= state.nextSpawn) {
    state.trash.push({ id: state.spawned, x: 452, ...reefSpawn(state.spawned) }); state.spawned++;
    state.nextSpawn = frame + Math.max(23, 56 - Math.floor(frame / 30));
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

export function validArcadeInput(kind: ArcadeKind, frames: number[], endFrame: number, moves?: SwimMove[]) {
  if (!Number.isInteger(endFrame) || endFrame < 1 || endFrame > ARCADE_FRAMES || !Array.isArray(frames)) return false;
  if (kind === "flight") return moves === undefined && frames.length <= 150 && frames.every((frame,index) => Number.isInteger(frame) && frame >= 1 && frame <= endFrame && (!index || frame - frames[index - 1] >= 3));
  return !frames.length && Array.isArray(moves) && moves.length <= 180 && moves.every((move,index) => move && Number.isInteger(move.frame) && move.frame >= 1 && move.frame <= endFrame && [0,1,2].includes(move.lane) && (!index || move.frame - moves[index - 1].frame >= 3));
}
export function replayArcade(kind: ArcadeKind, frames: number[], endFrame: number, moves: SwimMove[] = []) {
  if (kind === "flight") {
    let state = initialPuffin(); const flaps = new Set(frames);
    for (let frame=1; frame<=endFrame && !state.dead; frame++) state=stepPuffin(state,flaps.has(frame));
    return puffinScore(state);
  }
  let state=initialReef(), index=0, lane:Lane=1;
  for (let frame=1;frame<=endFrame && !state.dead;frame++) {
    if(moves[index]?.frame===frame) { lane=moves[index].lane; index++; }
    state=stepReef(state,lane);
  }
  return reefScore(state);
}
