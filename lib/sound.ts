// The sound of the desk, synthesised on the spot with the Web Audio API — no
// audio files to download, nothing to decode, every hit slightly different so
// repeats never sound like a sample on loop.
//
// The palette is small and physical: a rubber stamp landing, a page turning,
// a hand of index cards being dealt, pencil ticks while the analyst writes, a
// desk bell when a wallet connects, a low double knock when something fails.
// Everything is quiet by design and sits in a short, dry room.
//
// Rules the rest of the app can rely on:
// - Nothing sounds before the visitor has touched the page. Browsers refuse to
//   start audio without a gesture; rather than queue sounds for later, sounds
//   asked for before then are simply dropped.
// - Off means off. The visitor's choice is remembered in localStorage and
//   every call checks it.
// - Callers ask for a sound by name and never touch audio nodes themselves.

export type SoundName = "stamp" | "stampSoft" | "flip" | "deal" | "tick" | "bell" | "error" | "tap";

const STORAGE_KEY = "folio:sound";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let roomSend: GainNode | null = null;
let noise: AudioBuffer | null = null;
let unlocked = false;
let enabled = readEnabled();
const listeners = new Set<() => void>();
const lastPlayed = new Map<SoundName, number>();

// Minimum gap between two plays of the same sound, in ms. Twelve stamps
// landing in one stagger should read as a confident thud or two, not a drum
// roll; streamed text should tick, not buzz.
const MIN_GAP: Record<SoundName, number> = {
  stamp: 110,
  stampSoft: 140,
  flip: 120,
  deal: 400,
  tick: 55,
  bell: 600,
  error: 400,
  tap: 60,
};

function readEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function isSoundEnabled() {
  return enabled;
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // Blocked storage: the choice holds for this visit only.
  }
  if (on) void ctx?.resume();
  listeners.forEach((l) => l());
}

export function subscribeSound(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function build(): AudioContext | null {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC({ latencyHint: "interactive" });

  // master → gentle compressor → speakers. The compressor keeps a stamp and
  // the bell from clipping when they land together.
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.knee.value = 12;
  comp.ratio.value = 4;
  comp.attack.value = 0.003;
  comp.release.value = 0.18;
  comp.connect(ctx.destination);

  master = ctx.createGain();
  master.gain.value = 0.55;
  master.connect(comp);

  // A small wooden room: a generated impulse response, about 0.7 s, darker
  // at the tail. Sent to at a low level so sounds sit somewhere without
  // turning wet.
  const room = ctx.createConvolver();
  room.buffer = impulse(ctx, 0.7, 3.2);
  const roomTone = ctx.createBiquadFilter();
  roomTone.type = "lowpass";
  roomTone.frequency.value = 3200;
  roomSend = ctx.createGain();
  roomSend.gain.value = 0.22;
  roomSend.connect(room);
  room.connect(roomTone);
  roomTone.connect(master);

  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return ctx;
}

function impulse(c: AudioContext, seconds: number, decay: number) {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

/**
 * Called once from the app shell. Unlocks audio on the visitor's first
 * gesture, which is the only moment a browser allows it.
 */
export function installSoundUnlock() {
  if (typeof window === "undefined") return () => {};
  const unlock = () => {
    const c = build();
    if (!c) return;
    // Marked unlocked at the gesture itself, not when resume() settles: the
    // click that unlocks audio is often the same click that should make the
    // first sound, and it lands before the promise does. Sounds scheduled on
    // a context that is still starting simply play the moment it runs.
    unlocked = true;
    void c.resume();
  };
  const opts = { capture: true, passive: true } as const;
  window.addEventListener("pointerdown", unlock, opts);
  window.addEventListener("keydown", unlock, opts);
  window.addEventListener("touchstart", unlock, opts);
  return () => {
    window.removeEventListener("pointerdown", unlock, opts);
    window.removeEventListener("keydown", unlock, opts);
    window.removeEventListener("touchstart", unlock, opts);
  };
}

const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

/** Plays a sound by name. Silently does nothing when it shouldn't sound. */
export function play(name: SoundName, opts: { volume?: number; delayMs?: number } = {}) {
  if (!enabled || !unlocked || !ctx || ctx.state === "closed") return;
  const now = performance.now() + (opts.delayMs ?? 0);
  const prev = lastPlayed.get(name) ?? -Infinity;
  if (now - prev < MIN_GAP[name]) return;
  lastPlayed.set(name, now);

  const at = ctx.currentTime + (opts.delayMs ?? 0) / 1000 + 0.005;
  const v = opts.volume ?? 1;
  switch (name) {
    case "stamp":
      return stamp(at, v);
    case "stampSoft":
      return stamp(at, 0.45 * v, true);
    case "flip":
      return flip(at, v);
    case "deal":
      return deal(at, v);
    case "tick":
      return tick(at, v);
    case "bell":
      return bell(at, v);
    case "error":
      return knock(at, v);
    case "tap":
      return tap(at, v);
  }
}

// ——— building blocks ———

function out(pan: number, send = 1): AudioNode {
  const c = ctx!;
  const p = c.createStereoPanner();
  p.pan.value = pan;
  p.connect(master!);
  if (send > 0) {
    const s = c.createGain();
    s.gain.value = send;
    p.connect(s);
    s.connect(roomSend!);
  }
  return p;
}

function env(g: GainNode, at: number, peak: number, attack: number, decay: number) {
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
}

function noiseBurst(
  at: number,
  dest: AudioNode,
  { type, freq, q, peak, attack, decay }: { type: BiquadFilterType; freq: number; q: number; peak: number; attack: number; decay: number }
) {
  const c = ctx!;
  const src = c.createBufferSource();
  src.buffer = noise;
  src.playbackRate.value = rand(0.9, 1.1);
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  env(g, at, peak, attack, decay);
  src.connect(f);
  f.connect(g);
  g.connect(dest);
  src.start(at, Math.random() * 0.5);
  src.stop(at + attack + decay + 0.05);
  return f;
}

// ——— the sounds ———

/**
 * A rubber stamp on paper over a wooden desk: a short low body that drops in
 * pitch, the slap of rubber meeting paper, and a dull thump of the desk under
 * it. `soft` is the same hand, pressing lighter.
 */
function stamp(at: number, v: number, soft = false) {
  const c = ctx!;
  const dest = out(rand(-0.08, 0.08), soft ? 0.6 : 1);
  const detune = rand(0.94, 1.06);

  const body = c.createOscillator();
  body.type = "sine";
  body.frequency.setValueAtTime(150 * detune, at);
  body.frequency.exponentialRampToValueAtTime(46 * detune, at + 0.12);
  const bg = c.createGain();
  env(bg, at, 0.85 * v, 0.002, soft ? 0.12 : 0.2);
  body.connect(bg);
  bg.connect(dest);
  body.start(at);
  body.stop(at + 0.3);

  noiseBurst(at, dest, { type: "bandpass", freq: 1700 * detune, q: 0.9, peak: 0.5 * v, attack: 0.001, decay: 0.07 });
  noiseBurst(at, dest, { type: "highpass", freq: 4200, q: 0.7, peak: 0.14 * v, attack: 0.0008, decay: 0.022 });
  noiseBurst(at + 0.004, dest, { type: "lowpass", freq: 520, q: 0.8, peak: 0.28 * v, attack: 0.003, decay: soft ? 0.09 : 0.16 });
}

/** A page turning over: filtered air sweeping up, panned across. */
function flip(at: number, v: number) {
  const dest = out(rand(-0.3, 0.3), 0.5);
  const f = noiseBurst(at, dest, { type: "bandpass", freq: 800, q: 1.1, peak: 0.2 * v, attack: 0.05, decay: 0.2 });
  f.frequency.setValueAtTime(700, at);
  f.frequency.exponentialRampToValueAtTime(3600, at + 0.22);
}

/** A hand of index cards dealt onto the desk: quick ticks, rising, left to right. */
function deal(at: number, v: number) {
  const n = 7;
  for (let i = 0; i < n; i++) {
    const t = at + i * 0.048 + rand(-0.006, 0.006);
    const dest = out(-0.35 + (0.7 * i) / (n - 1), 0.4);
    noiseBurst(t, dest, { type: "bandpass", freq: 2100 + i * 160, q: 1.6, peak: 0.13 * v, attack: 0.002, decay: 0.035 });
    noiseBurst(t + 0.008, dest, { type: "lowpass", freq: 700, q: 0.7, peak: 0.05 * v, attack: 0.002, decay: 0.03 });
  }
}

/**
 * A pencil tick while the analyst writes. Barely there, never the same twice,
 * and not on every piece of text: a quarter are skipped so a long answer has
 * the uneven rhythm of a hand writing rather than the even buzz of a motor.
 */
function tick(at: number, v: number) {
  if (Math.random() < 0.25) return;
  const dest = out(rand(-0.15, 0.15), 0.15);
  noiseBurst(at, dest, { type: "bandpass", freq: rand(2800, 4200), q: 2.2, peak: 0.05 * v, attack: 0.0015, decay: rand(0.012, 0.022) });
}

/**
 * A desk bell: a struck metal partial series (fundamental plus the two
 * inharmonic overtones that make a bell a bell), the high ones dying first.
 */
function bell(at: number, v: number) {
  const c = ctx!;
  const dest = out(0.1, 1.4);
  const base = 1046.5;
  const partials: [number, number, number][] = [
    [1, 0.16, 1.4],
    [2.76, 0.06, 0.7],
    [5.4, 0.025, 0.35],
  ];
  for (const [ratio, peak, decay] of partials) {
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.value = base * ratio;
    const g = c.createGain();
    env(g, at, peak * v, 0.003, decay);
    o.connect(g);
    g.connect(dest);
    o.start(at);
    o.stop(at + decay + 0.1);
  }
  noiseBurst(at, dest, { type: "highpass", freq: 6000, q: 0.7, peak: 0.04 * v, attack: 0.0008, decay: 0.012 });
}

/** Two low knocks, the second lower: something didn't go through. */
function knock(at: number, v: number) {
  const c = ctx!;
  const dest = out(0, 0.5);
  [
    [0, 196],
    [0.13, 155],
  ].forEach(([offset, freq]) => {
    const o = c.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(freq, at + offset);
    o.frequency.exponentialRampToValueAtTime(freq * 0.8, at + offset + 0.12);
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900;
    const g = c.createGain();
    env(g, at + offset, 0.16 * v, 0.004, 0.14);
    o.connect(lp);
    lp.connect(g);
    g.connect(dest);
    o.start(at + offset);
    o.stop(at + offset + 0.25);
  });
}

/** A fingertip on a card: the acknowledgement for picking something. */
function tap(at: number, v: number) {
  const c = ctx!;
  const dest = out(rand(-0.1, 0.1), 0.25);
  noiseBurst(at, dest, { type: "bandpass", freq: 1500, q: 2.5, peak: 0.1 * v, attack: 0.001, decay: 0.03 });
  const o = c.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(520, at);
  o.frequency.exponentialRampToValueAtTime(380, at + 0.04);
  const g = c.createGain();
  env(g, at, 0.06 * v, 0.002, 0.045);
  o.connect(g);
  g.connect(dest);
  o.start(at);
  o.stop(at + 0.08);
}
