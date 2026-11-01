import type { SpecialKind } from "./types";

export const CHALLENGE_FRAMES = 1080; // 18 seconds at a fixed 60 Hz, independent of display refresh rate.
export type FlightState = { frame: number; y: number; velocity: number; passed: number; dead: boolean };
export const initialFlight = (): FlightState => ({ frame: 0, y: 180, velocity: 0, passed: 0, dead: false });
// Authored public course; unrelated to the private policy/offer seed.
export function flightGate(index: number, frame: number) {
  const distance = 2.2 * frame + .001 * frame * frame;
  return { x: 390 + index * 155 - distance, centre: 116 + ((index * 73 + 31) % 145), gap: Math.max(92, 148 - frame * .045) };
}
export function stepFlight(current: FlightState, flap: boolean): FlightState {
  if (current.dead || current.frame >= CHALLENGE_FRAMES) return current;
  const frame = current.frame + 1;
  const velocity = flap ? -4.8 : Math.min(6.5, current.velocity + .27);
  const y = current.y + velocity;
  let dead = y < 14 || y > 346, passed = 0;
  for (let i = 0; i < 26; i++) {
    const gate = flightGate(i, frame);
    if (gate.x + 43 < 65) passed++;
    if (gate.x < 87 && gate.x + 43 > 57 && Math.abs(y - gate.centre) > gate.gap / 2 - 10) dead = true;
  }
  return { frame, y, velocity, passed, dead };
}
export function pulsePosition(frame: number, hit: number) { return (Math.sin(frame * (.034 + hit * .007) + hit * 1.13) + 1) / 2; }
export function pulseCentre(hit: number) { return [.5, .32, .68, .42, .6][hit] ?? .5; }
export function pulseAccuracy(frame: number, hit: number) {
  const tolerance = .2 - hit * .025;
  return Math.max(0, 1 - Math.abs(pulsePosition(frame, hit) - pulseCentre(hit)) / tolerance);
}
export function challengeScore(kind: SpecialKind, frames: number[], endFrame: number) {
  if (kind === "pulse") return Math.round(frames.slice(0, 5).reduce((sum, frame, index) => sum + pulseAccuracy(frame, index), 0) * 20);
  let state = initialFlight(); const input = new Set(frames);
  for (let frame = 1; frame <= endFrame && !state.dead; frame++) state = stepFlight(state, input.has(frame));
  return Math.min(100, Math.round(state.passed * 7 + state.frame / CHALLENGE_FRAMES * 15));
}
export function validChallengeInput(kind: SpecialKind, frames: number[], endFrame: number) {
  if (!Number.isInteger(endFrame) || endFrame < 1 || endFrame > CHALLENGE_FRAMES || !Array.isArray(frames) || frames.length > (kind === "pulse" ? 5 : 150)) return false;
  return frames.every((frame, index) => Number.isInteger(frame) && frame >= 1 && frame <= endFrame && (!index || frame - frames[index - 1] >= (kind === "pulse" ? 24 : 3)));
}
