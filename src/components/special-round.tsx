"use client";
import { useEffect, useRef, useState } from "react";
import { Bird, Crosshair, Play, Sparkles } from "lucide-react";
import { CHALLENGE_FRAMES, challengeScore, flightGate, initialFlight, pulseAccuracy, pulseCentre, pulsePosition, stepFlight } from "@/game/challenges";
import type { PublicRun, RewardStat, SpecialCommand } from "@/game/types";
import { playSound } from "@/lib/sound";

const rewards: { id: RewardStat; title: string; hint: string }[] = [
  { id: "support", title: "Politics", hint: "Pass harder policies" },
  { id: "economy", title: "Economy", hint: "Earn more coins" },
  { id: "awareness", title: "Awareness", hint: "Improve delivery" },
  { id: "justice", title: "Fairness", hint: "Protect public support" },
  { id: "credits", title: "Coins", hint: "Fund your next move" },
];
export function SpecialRound({ run, busy, onAction, onSkip }: { run: PublicRun; busy: boolean; onAction: (command: SpecialCommand) => Promise<void>; onSkip: () => void }) {
  const kind = run.specialRound!, attempt = run.specialAttempt;
  const canvas = useRef<HTMLCanvasElement>(null), frame = useRef(0), inputs = useRef<number[]>([]), flight = useRef(initialFlight());
  const playing = useRef(false), finished = useRef(false), lastTime = useRef(0), accumulator = useRef(0);
  const [reward, setReward] = useState<RewardStat>("support"), [phase, setPhase] = useState<"ready" | "playing" | "done">("ready");
  const [score, setScore] = useState(0), [seconds, setSeconds] = useState(18), [hits, setHits] = useState(0);
  const title = kind === "flight" ? "Ice courier" : "Grid pulse";
  function finish() { if (finished.current) return; finished.current = true; playing.current = false; setScore(challengeScore(kind, inputs.current, Math.max(1, frame.current))); setPhase("done"); playSound("pass"); }
  function tap() {
    if (!attempt || finished.current || busy) return;
    if (!playing.current) { playing.current = true; lastTime.current = performance.now(); setPhase("playing"); }
    const tick = Math.max(1, frame.current + 1);
    if (inputs.current.length && tick - inputs.current.at(-1)! < (kind === "pulse" ? 24 : 3)) return;
    inputs.current.push(tick); playSound("tap");
    if (kind === "pulse") { setHits(inputs.current.length); setScore(challengeScore(kind, inputs.current, tick)); if (inputs.current.length === 5) { frame.current = tick; finish(); } }
  }
  useEffect(() => {
    if (!attempt) return;
    let animation = 0;
    function draw(now: number) {
      const ctx = canvas.current?.getContext("2d");
      if (!ctx) return;
      if (playing.current) {
        accumulator.current += Math.min(100, now - (lastTime.current || now)); lastTime.current = now;
        while (accumulator.current >= 1000 / 60 && playing.current) {
          accumulator.current -= 1000 / 60; frame.current++;
          if (kind === "flight") { flight.current = stepFlight(flight.current, inputs.current.includes(frame.current)); if (flight.current.dead) finish(); }
          if (frame.current >= CHALLENGE_FRAMES) finish();
        }
        setSeconds(Math.max(0, Math.ceil((CHALLENGE_FRAMES - frame.current) / 60)));
      }
      const bg = ctx.createLinearGradient(0, 0, 0, 360); bg.addColorStop(0, "#072b52"); bg.addColorStop(1, "#146b8a"); ctx.fillStyle = bg; ctx.fillRect(0, 0, 360, 360);
      ctx.globalAlpha = .24; ctx.fillStyle = "#a9edff";
      for (let i = 0; i < 10; i++) { ctx.beginPath(); ctx.arc((i * 71 + 30) % 360, (i * 97 + 30) % 360, 2, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1;
      if (kind === "flight") {
        for (let i = 0; i < 26; i++) {
          const gate = flightGate(i, frame.current); if (gate.x < -50 || gate.x > 380) continue;
          const top = gate.centre - gate.gap / 2, bottom = gate.centre + gate.gap / 2;
          ctx.fillStyle = "#a9f2ec"; ctx.fillRect(gate.x, 0, 43, top); ctx.fillRect(gate.x, bottom, 43, 360 - bottom);
          ctx.fillStyle = "#5bbfd4"; ctx.fillRect(gate.x + 29, 0, 14, top); ctx.fillRect(gate.x + 29, bottom, 14, 360 - bottom);
          ctx.fillStyle = "#dcfffa"; ctx.fillRect(gate.x - 3, top - 8, 49, 8); ctx.fillRect(gate.x - 3, bottom, 49, 8);
        }
        const y = flight.current.y;
        ctx.save(); ctx.translate(72, y); ctx.rotate(Math.max(-.3, Math.min(.5, flight.current.velocity / 15)));
        ctx.fillStyle = "#f9cd58"; ctx.beginPath(); ctx.ellipse(0, 0, 14, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fff4c9"; ctx.beginPath(); ctx.ellipse(-5, 3, 8, 5, -.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#ff8a65"; ctx.beginPath(); ctx.moveTo(12, -1); ctx.lineTo(23, 2); ctx.lineTo(12, 5); ctx.fill();
        ctx.fillStyle = "#112c43"; ctx.beginPath(); ctx.arc(7, -3, 2.6, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        ctx.font = "bold 16px Arial"; ctx.fillStyle = "#e9ffff"; ctx.fillText(`${flight.current.passed} gates`, 18, 30);
      } else {
        const hit = Math.min(inputs.current.length, 4), position = pulsePosition(frame.current, hit), centre = pulseCentre(hit), tolerance = .2 - hit * .025;
        ctx.strokeStyle = "#52c6f7"; ctx.lineWidth = 3;
        for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(40 + i * 54, 55); ctx.lineTo(40 + i * 54, 125); ctx.lineTo(70 + i * 48, 155); ctx.stroke(); }
        ctx.fillStyle = "#173c59"; ctx.fillRect(24, 165, 312, 50);
        ctx.fillStyle = "#63e6ae"; ctx.fillRect(24 + (centre - tolerance) * 312, 165, tolerance * 2 * 312, 50);
        ctx.fillStyle = "#ffda6c"; ctx.fillRect(24 + position * 312 - 3, 155, 6, 70);
        ctx.fillStyle = "#e9ffff"; ctx.font = "bold 18px Arial"; ctx.textAlign = "center"; ctx.fillText(`Charge ${Math.min(inputs.current.length + 1, 5)} / 5`, 180, 270); ctx.textAlign = "left";
        for (let i = 0; i < inputs.current.length; i++) { ctx.fillStyle = pulseAccuracy(inputs.current[i], i) > .65 ? "#64edb6" : "#f4c062"; ctx.beginPath(); ctx.arc(116 + i * 32, 300, 7, 0, Math.PI * 2); ctx.fill(); }
      }
      animation = requestAnimationFrame(draw);
    }
    animation = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animation);
    // The course runs in refs so tapping does not restart its animation loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt?.startedAt, kind]);

  const earned = attempt ? run.rulesVersion === "prototype-0.7" ? attempt.reward === "credits" ? Math.min(Math.floor(score / 25), 20 - run.resources.credits) : Math.min(Math.floor(score / 6), 100 - run.resources[attempt.reward]) : attempt.reward === "credits" ? Math.floor(score / 14) : Math.floor(score / 5) : 0;
  return <section className="special-round" aria-labelledby="special-title">
    <div className="special-heading"><span><Sparkles size={15}/> SPECIAL ROUND {run.round + 1}</span><h2 id="special-title">{kind === "flight" ? <Bird/> : <Crosshair/>}{title}</h2><p>{kind === "flight" ? "Tap to stay aloft. Slip through the ice. The pace keeps rising." : "Tap when the pulse hits green. Five charges. The target gets tighter."}</p></div>
    {!attempt ? <><p className="reward-label">Choose what to boost</p><div className="reward-options">{rewards.map(option => <button key={option.id} aria-pressed={reward === option.id} onClick={() => { setReward(option.id); playSound("select"); }}><b>{option.title}</b><small>{run.rulesVersion === "prototype-0.7" && option.id === "credits" && run.resources.credits === 20 ? "Purse full · choose another boost" : option.hint}</small></button>)}</div><button className="game-button gold" disabled={busy} onClick={() => onAction({ kind: "begin-special", reward })}><Play size={18}/> Start challenge</button><button className="game-button quiet" disabled={busy} onClick={onSkip}>Skip challenge</button></> : <>
      <div className="challenge-hud"><span>{rewards.find(r => r.id === attempt.reward)?.title} boost</span><b>{seconds}s</b></div>
      <button className="challenge-canvas" aria-label={kind === "flight" ? "Tap or press Space to fly" : "Tap or press Space when the pulse is in green"} onPointerDown={event => { event.preventDefault(); tap(); }} onKeyDown={event => { if ([" ", "Enter"].includes(event.key)) { event.preventDefault(); if (!event.repeat) tap(); } }} disabled={busy || phase === "done"}>
        <canvas width="360" height="360" ref={canvas}/>
        {phase === "ready" && <span className="challenge-overlay"><Play size={34}/>Tap to {kind === "flight" ? "fly" : "charge"}</span>}
        {phase === "done" && <span className="challenge-overlay"><b>{score}</b><small>challenge points</small></span>}
      </button>
      <p className="challenge-hint" aria-live="polite">{phase === "done" ? `${score} points · ${earned} ${rewards.find(r => r.id === attempt.reward)?.title} earned` : kind === "pulse" ? `${hits} of 5 charges · tap the green zone` : "Tap anywhere on the course · Space also works"}</p>
      {phase === "done" ? <button className="game-button gold" disabled={busy} onClick={() => onAction({ kind: "finish-special", frames: inputs.current, endFrame: Math.max(1, frame.current) })}>Collect & continue</button> : <button className="game-button quiet" disabled={busy} onClick={onSkip}>Skip challenge</button>}
    </>}
  </section>;
}
