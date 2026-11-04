"use client";
import { Snowflake } from "lucide-react";
import type { PublicRun } from "@/game/types";
export function WorldBackground() {
  return <div className="world-background" aria-hidden="true"><div className="world-art world-photo"/><div className="world-shade"/></div>;
}
export function WorldProgress({ run }: { run: PublicRun }) {
  const value = Math.min(100, Math.round(run.transition));
  return <div className="world-progress"><div className="world-progress-copy"><span><Snowflake size={15}/> YOUR TRANSITION</span><strong>{value}<small>/100</small></strong></div><div className="world-progress-track" role="meter" aria-label="Illustrative transition game points" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}><span style={{ transform: `scaleX(${value / 100})` }}/></div><span className="world-progress-hint">Game points—not ice loss or temperature.</span></div>;
}
