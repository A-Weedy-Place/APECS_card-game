let context: AudioContext | null = null;
let enabled = true;
let loaded = false;
export function soundEnabled() { try { enabled = localStorage.getItem("cop-sound") !== "off"; loaded = true; } catch {} return enabled; }
export function setSoundEnabled(value: boolean) { enabled = value; loaded = true; try { localStorage.setItem("cop-sound", value ? "on" : "off"); } catch {} }
let lastHover = 0;
export function playSound(kind: "select" | "shuffle" | "pass" | "fail" | "rare" | "tap" | "hover") {
  if (typeof window === "undefined") return;
  if (!loaded) soundEnabled();
  if (!enabled) return;
  if (kind === "hover") { if (!context || Date.now() - lastHover < 140) return; lastHover = Date.now(); }
  try {
    const Audio = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Audio) return;
    context ??= new Audio(); void context.resume().catch(() => {});
    const notes = kind === "pass" ? [523, 659, 784] : kind === "rare" ? [392, 587, 880] : kind === "fail" ? [220, 165] : kind === "shuffle" ? [330, 440, 550] : kind === "hover" ? [390] : kind === "tap" ? [620] : [520, 700];
    notes.forEach((frequency, i) => {
      const start = context!.currentTime + i * .045;
      const oscillator = context!.createOscillator(), gain = context!.createGain();
      oscillator.type = "sine"; oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(.0001, start); gain.gain.exponentialRampToValueAtTime(.035, start + .008); gain.gain.exponentialRampToValueAtTime(.0001, start + .1);
      oscillator.connect(gain); gain.connect(context!.destination); oscillator.start(start); oscillator.stop(start + .11);
    });
  } catch { /* Audio is optional; it never gates a game action. */ }
}
