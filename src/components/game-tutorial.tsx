"use client";

import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import type { PublicRun } from "@/game/types";

function tutorialSteps({ resources, nextIncome, redrawCost }: PublicRun) {
  const shufflePrice = `${redrawCost} ${redrawCost === 1 ? "coin" : "coins"}`;
  return [
    { target: "coins", title: "Your coins", text: `You have ${resources.credits} coins. The number on each card is its price.` },
    { target: "economy", title: "Revenue growth", text: `You earn ${nextIncome} coins per round at your current rate. Higher revenue growth gives you more coins.` },
    { target: "support", title: "Politics", text: "More political support improves the chance your policies pass. Check each card for its own approval percentage." },
    { target: "awareness", title: "Public engagement", text: "Public engagement also improves approval. It has a smaller effect than politics." },
    { target: "cards", title: "Choose your cards", text: "Tap for details. Select up to three cards you can afford." },
    { target: "play", title: "Play", text: "Spend the shown coins and submit your selected cards. Each card has its own chance of passing." },
    { target: "shuffle", title: "Shuffle", text: `Pay ${shufflePrice} for a new hand. You stay in the same round, and the next shuffle that round costs one more coin.` },
    { target: "skip", title: "Skip", text: "End the round without playing a card. Keep any coins you have left for later rounds." },
    { target: "rounds", title: "Rounds", text: "Rounds 4 and 7 are arcade breaks. After round 10, your policies determine your 2100 temperature result." },
    { target: "library", title: "Library", text: "Browse all the cards, see what they do, and check what unlocks each upgrade." },
    { target: "history", title: "History", text: "See which cards passed or failed and review your current En-ROADS settings." },
  ];
}

export function GameTutorial({ board, run, onClose }: {
  board: RefObject<HTMLElement | null>;
  run: PublicRun;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const steps = tutorialSteps(run);
  const { target: targetName, title, text } = steps[index];
  const last = index === steps.length - 1;

  useLayoutEffect(() => {
    const dialog = dialogRef.current!;
    dialog.showModal();
    nextRef.current?.focus({ preventScroll: true });
    return () => { dialog.close(); };
  }, []);

  useLayoutEffect(() => {
    const dialog = dialogRef.current!;
    const panel = panelRef.current!;
    const spotlight = spotlightRef.current!;
    const target = board.current?.querySelector(`[data-tutorial="${targetName}"]`);
    if (!target) return;

    const position = () => {
      const area = dialog.getBoundingClientRect();
      const box = target.getBoundingClientRect();
      const left = Math.max(4, box.left - area.left - 4);
      const right = Math.min(area.width - 4, box.right - area.left + 4);
      const top = Math.max(4, box.top - area.top - 4);
      const bottom = Math.min(area.height - 4, box.bottom - area.top + 4);
      Object.assign(spotlight.style, {
        left: `${left}px`, top: `${top}px`, width: `${right - left}px`, height: `${bottom - top}px`,
      });

      const { width, height } = panel.getBoundingClientRect();
      const gap = 12;
      const maxX = area.width - width - gap;
      const maxY = area.height - height - gap;
      const centreX = Math.max(gap, Math.min(maxX, (left + right - width) / 2));
      const centreY = Math.max(gap, Math.min(maxY, (top + bottom - height) / 2));
      const candidates = [
        { x: centreX, y: bottom + gap },
        { x: centreX, y: top - height - gap },
        { x: right + gap, y: centreY },
        { x: left - width - gap, y: centreY },
      ];
      const placement = candidates.find(({ x, y }) => x >= gap && x <= maxX && y >= gap && y <= maxY);
      panel.style.left = `${placement?.x ?? centreX}px`;
      panel.style.top = `${placement?.y ?? (top > area.height - bottom ? gap : Math.max(gap, maxY))}px`;
    };

    position();
    const resize = new ResizeObserver(position);
    resize.observe(dialog);
    resize.observe(target);
    resize.observe(panel);
    window.addEventListener("scroll", position, { passive: true });
    return () => {
      resize.disconnect();
      window.removeEventListener("scroll", position);
    };
  }, [board, targetName]);

  return (
    <dialog className="game-tutorial" ref={dialogRef} aria-label="How to play"
      onCancel={event => { event.preventDefault(); onClose(); }}>
      <div className="tutorial-spotlight" ref={spotlightRef} aria-hidden="true" />
      <section className="tutorial-panel" ref={panelRef}>
        <div aria-live="polite" aria-atomic="true">
          <div className="tutorial-progress">
            <span>Step {index + 1} of {steps.length}</span>
            <span className="tutorial-track" aria-hidden="true"><i style={{ width: `${(index + 1) / steps.length * 100}%` }}/></span>
          </div>
          <h2>{title}</h2>
          <p>{text}</p>
        </div>
        <div className="tutorial-actions">
          <button className="tutorial-skip" onClick={onClose}>Skip tutorial</button>
          <div className="tutorial-navigation">
            {index > 0 && <button className="tutorial-back" onClick={() => { if (index === 1) nextRef.current?.focus(); setIndex(index - 1); }}>Back</button>}
            <button className="tutorial-next" ref={nextRef} onClick={() => last ? onClose() : setIndex(index + 1)}>
              {last ? "Start playing" : "Next"}
            </button>
          </div>
        </div>
      </section>
    </dialog>
  );
}
