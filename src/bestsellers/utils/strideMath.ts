import { SH, SW, type CropBox } from '../data/flavors';

export function clamp(v: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/**
 * Evaluates a CSS-style cubic-bezier(x1, y1, x2, y2) at input progress t in [0, 1].
 */
export function cubicBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  t: number
): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;

  const sampleX = (u: number) =>
    ((1 - 3 * x2 + 3 * x1) * u + (3 * x2 - 6 * x1)) * u * u + 3 * x1 * u;
  const sampleDX = (u: number) =>
    (3 * (1 - 3 * x2 + 3 * x1) * u + 2 * (3 * x2 - 6 * x1)) * u + 3 * x1;
  const sampleY = (u: number) =>
    ((1 - 3 * y2 + 3 * y1) * u + (3 * y2 - 6 * y1)) * u * u + 3 * y1 * u;

  let u = t;
  for (let i = 0; i < 6; i++) {
    const err = sampleX(u) - t;
    if (Math.abs(err) < 1e-5) break;
    const dx = sampleDX(u);
    if (Math.abs(dx) < 1e-6) break;
    u -= err / dx;
  }
  u = clamp(u, 0, 1);

  // Fallback bisection if Newton stepped off
  if (Math.abs(sampleX(u) - t) > 1e-4) {
    let lo = 0;
    let hi = 1;
    u = t;
    for (let i = 0; i < 16; i++) {
      const x = sampleX(u);
      if (Math.abs(x - t) < 1e-5) break;
      if (t > x) lo = u;
      else hi = u;
      u = 0.5 * (lo + hi);
    }
  }

  return sampleY(u);
}

export function slideEase(t: number): number {
  return cubicBezier(0.25, 0.75, 0.2, 1, t);
}

export function entranceEase(t: number): number {
  return cubicBezier(0.16, 1, 0.3, 1, t);
}

export function sineEaseInOut(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

export interface SpriteCropStyle {
  backgroundSize: string;
  backgroundPosition: string;
}

export function computeSpriteCrop(
  box: CropBox,
  pad = 0,
  sheetW = SW,
  sheetH = SH
): SpriteCropStyle {
  const x = box[0] - pad;
  const y = box[1] - pad;
  const w = box[2] + 2 * pad;
  const h = box[3] + 2 * pad;

  const sizeX = (sheetW / w) * 100;
  const sizeY = (sheetH / h) * 100;
  const posX = (x / (sheetW - w)) * 100;
  const posY = (y / (sheetH - h)) * 100;

  return {
    backgroundSize: `${sizeX.toFixed(4)}% ${sizeY.toFixed(4)}%`,
    backgroundPosition: `${posX.toFixed(4)}% ${posY.toFixed(4)}%`,
  };
}

export const CRIMP_BAND = 0.062;

export function computeWrapperZ(u: number, v: number): number {
  const ex = Math.abs(2 * u - 1);
  const ev = Math.min(v, 1 - v);

  if (ev < CRIMP_BAND) {
    return 0.006 + 0.006 * Math.abs(Math.sin(u * Math.PI * 34));
  }
  const across = Math.pow(Math.max(0, 1 - Math.pow(ex, 2.6)), 0.62);
  const along = Math.pow(clamp((ev - CRIMP_BAND) / 0.11, 0, 1), 0.7);
  return (
    0.012 +
    0.118 * across * along +
    0.004 * Math.sin(23 * u + 31 * v) * across
  );
}

const ARC_TABLE = [
  { dx: 0, dy: 0, h: 430, rz: 0, ry: 0 },
  { dx: 245, dy: 24, h: 330, rz: 4, ry: 16 },
  { dx: 452, dy: 44, h: 312, rz: 8, ry: 26 },
  { dx: 660, dy: 80, h: 296, rz: 12, ry: 34 },
  { dx: 860, dy: 118, h: 280, rz: 15, ry: 40 },
] as const;

export interface BarScreenState {
  x: number;
  y: number;
  h: number;
  rz: number;
  ry: number;
  rx: number;
  z: number;
  op: number;
  sx: number;
  sy: number;
  shadow: number;
}

export function computeArcSlot(
  k: number,
  cx: number,
  cy: number,
  u: number,
  spreadX = 1,
  fadeMul = 1
): BarScreenState {
  const ak = Math.min(Math.abs(k), 4);
  const sign = k < 0 ? -1 : k > 0 ? 1 : 0;
  const i0 = Math.min(Math.floor(ak), 3);
  const i1 = i0 + 1;
  const frac = ak - i0;

  const s0 = ARC_TABLE[i0];
  const s1 = ARC_TABLE[i1];

  const dx = lerp(s0.dx, s1.dx, frac) * sign * u * spreadX;
  const dy = lerp(s0.dy, s1.dy, frac) * u;
  const h = lerp(s0.h, s1.h, frac) * u;
  const rz = lerp(s0.rz, s1.rz, frac) * sign;
  const ry = lerp(s0.ry, s1.ry, frac) * sign;
  const z = -ak * 34 * u;

  const baseOp =
    ak <= 3.3 ? 1 : 1 - clamp((ak - 3.3) / (3.9 - 3.3), 0, 1);

  return {
    x: cx + dx,
    y: cy + dy,
    h,
    rz,
    ry,
    rx: 0,
    z,
    op: baseOp * fadeMul,
    sx: 1,
    sy: 1,
    shadow: 1,
  };
}

export function lerpBarState(
  a: BarScreenState,
  b: BarScreenState,
  t: number
): BarScreenState {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    h: lerp(a.h, b.h, t),
    rz: lerp(a.rz, b.rz, t),
    ry: lerp(a.ry, b.ry, t),
    rx: lerp(a.rx, b.rx, t),
    z: lerp(a.z, b.z, t),
    op: lerp(a.op, b.op, t),
    sx: lerp(a.sx, b.sx, t),
    sy: lerp(a.sy, b.sy, t),
    shadow: lerp(a.shadow, b.shadow, t),
  };
}

export function computeTravellerState(
  A: BarScreenState,
  B: BarScreenState,
  C: BarScreenState,
  p1: number,
  p3: number
): BarScreenState {
  let state = A;
  if (p1 > 0) {
    state = lerpBarState(A, B, sineEaseInOut(clamp(p1, 0, 1)));
  }
  if (p3 > 0) {
    state = lerpBarState(state, C, sineEaseInOut(clamp(p3, 0, 1)));
  }
  return state;
}

export interface Section2ScrollState {
  p: number;
  step: number;
  q: number;
  pinY: number;
  visible: boolean;
}

export function computeSection2Scroll(
  sectionTop: number,
  sectionHeight: number,
  vh: number
): Section2ScrollState {
  const denom = Math.max(1, sectionHeight - vh);
  const p = clamp(-sectionTop / denom, 0, 1);
  const step = Math.min(3, Math.floor(Math.min(p, 0.759) / 0.19));
  const q = clamp((p - 0.76) / 0.24, 0, 1);

  const sectionBottom = sectionTop + sectionHeight;
  let pinY = 0;
  if (sectionTop > 0) {
    pinY = sectionTop;
  } else if (sectionBottom < vh) {
    pinY = sectionBottom - vh;
  }

  const visible = sectionBottom > 0 && sectionTop < vh;

  return { p, step, q, pinY, visible };
}

export function seededRand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export interface StormPieceSpec {
  angle: number;
  phase: number;
  spin: number;
  sizeFactor: number;
  useActiveBit: boolean;
  fallbackBitOffset: number;
}

export function createStormPieces(count = 20): StormPieceSpec[] {
  const rand = seededRand(847291);
  const pieces: StormPieceSpec[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (rand() - 0.5) * 0.45;
    const phase = i / count + rand() * 0.03;
    const dir = rand() < 0.5 ? -1 : 1;
    const spin = dir * (220 + rand() * 140);
    const sizeFactor = 0.7 + rand() * 0.7; // 0.7 - 1.4
    const useActiveBit = i % 10 < 7; // 70% active flavour's ingredient bit
    const fallbackBitOffset = 1 + Math.floor(rand() * 4);
    pieces.push({
      angle,
      phase,
      spin,
      sizeFactor,
      useActiveBit,
      fallbackBitOffset,
    });
  }
  return pieces;
}

export interface StormPieceTransform {
  visible: boolean;
  x: number;
  y: number;
  sizePx: number;
  scale: number;
  rotDeg: number;
  opacity: number;
  bit: number;
}

export function computeStormPieceTransform(
  spec: StormPieceSpec,
  q: number,
  vw: number,
  vh: number,
  activeBit: number,
  totalBits = 5
): StormPieceTransform {
  const bit = spec.useActiveBit
    ? activeBit
    : (activeBit + spec.fallbackBitOffset) % totalBits;
  const baseSize = 0.085 * Math.min(vw, vh);

  if (q <= 0 || q >= 1) {
    return {
      visible: false,
      x: vw / 2,
      y: vh / 2,
      sizePx: baseSize * spec.sizeFactor,
      scale: 0,
      rotDeg: 0,
      opacity: 0,
      bit,
    };
  }

  const s = clamp((q - 0.45 * spec.phase) / 0.55, 0, 1);
  if (s <= 0 || s >= 1) {
    return {
      visible: false,
      x: vw / 2,
      y: vh / 2,
      sizePx: baseSize * spec.sizeFactor,
      scale: 0,
      rotDeg: 0,
      opacity: 0,
      bit,
    };
  }

  const R = 0.55 * Math.hypot(vw, vh);
  const radius = (0.06 + Math.pow(s, 1.5) * 0.95) * R;
  const x = vw / 2 + Math.cos(spec.angle) * radius;
  const y = vh / 2 + Math.sin(spec.angle) * radius * 0.8;
  const scale = 0.2 + 1.7 * s;
  const rotDeg = spec.spin * s;
  const opacity =
    Math.sin(Math.PI * s) * clamp(5 * q, 0, 1) * clamp(6 * (1 - q), 0, 1);

  return {
    visible: opacity > 0.005,
    x,
    y,
    sizePx: baseSize * spec.sizeFactor,
    scale,
    rotDeg,
    opacity,
    bit,
  };
}

export function mixHexColor(hexA: string, hexB: string, ratioB: number): string {
  const parse = (h: string) => {
    const clean = h.replace('#', '');
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
    ];
  };
  const [r1, g1, b1] = parse(hexA);
  const [r2, g2, b2] = parse(hexB);
  const r = Math.round(lerp(r1, r2, ratioB));
  const g = Math.round(lerp(g1, g2, ratioB));
  const b = Math.round(lerp(b1, b2, ratioB));
  return `rgb(${r}, ${g}, ${b})`;
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
