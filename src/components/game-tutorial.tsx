"use client";

import { useLayoutEffect, useRef, useState, type RefObject } from "react";

export const TUTORIAL_SEEN_KEY = "cop-spotlight-tour-v1";

const steps = [
  {
    target: ".v9-hud",
    title: "Check your budget",
    text: "Coins buy cards. Revenue earns coins each round. Politics and public engagement help policies pass.",
  },
  {
    target: ".v9-hand",
    title: "Choose your cards",
    text: "Tap for details. Select up to three cards within your budget.",
  },
  {
    target: ".v9-controls",
    title: "Play your choices",
    text: "Play submits your picks. Shuffle costs coins. Skip keeps your coins for later.",
  },
];

export function GameTutorial({ board, onClose }: {
  board: RefObject<HTMLElement | null>;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const step = steps[index];
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
    const target = board.current?.querySelector(step.target);
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
  }, [board, step]);

  return (
    <dialog className="game-tutorial" ref={dialogRef} aria-label="How to play"
      onCancel={event => { event.preventDefault(); onClose(); }}>
      <div className="tutorial-spotlight" ref={spotlightRef} aria-hidden="true" />
      <section className="tutorial-panel" ref={panelRef}>
        <div aria-live="polite" aria-atomic="true">
          <span className="tutorial-step">{index + 1} / {steps.length}</span>
          <h2>{step.title}</h2>
          <p>{step.text}</p>
        </div>
        <div className="tutorial-actions">
          <button className="game-button quiet" onClick={onClose}>Skip tutorial</button>
          <button className="game-button gold" ref={nextRef} onClick={() => last ? onClose() : setIndex(index + 1)}>
            {last ? "Start playing" : "Next"}
          </button>
        </div>
      </section>
    </dialog>
  );
}
