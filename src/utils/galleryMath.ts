import {
  CELL_HEIGHT,
  CELL_WIDTH,
  CURRENCY_META,
  PRINTS,
  SHEET_COLUMNS,
  SHEET_HEIGHT,
  SHEET_WIDTH,
  type CurrencyCode,
} from '../data/prints';

export const RING_OUTER_RADIUS = 18;
export const RING_INNER_RADIUS = 12.2;
export const WALL_HEIGHT = 6.2;
export const PRINT_WIDTH = 1.36;
export const PRINT_HEIGHT = (1.36 * 763) / 567;
export const PRINT_CENTER_Y = 1.95;

export const OUTER_PRINT_COUNT = 36;
export const INNER_PRINT_COUNT = 24;
export const WALK_STEP = (Math.PI * 2) / OUTER_PRINT_COUNT;

export type WallSide = 'outer' | 'inner';

export interface CameraPose {
  th: number;
  r: number;
  yaw: number;
  y: number;
  pitch: number;
}

export interface PrintCropBox {
  col: number;
  row: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export function getPrintCrop(index: number): PrintCropBox {
  const count = PRINTS.length;
  const safeIndex = ((index % count) + count) % count;
  const col = safeIndex % SHEET_COLUMNS;
  const row = Math.floor(safeIndex / SHEET_COLUMNS);

  return {
    col,
    row,
    x: col * CELL_WIDTH,
    y: row * CELL_HEIGHT,
    w: CELL_WIDTH,
    h: CELL_HEIGHT,
  };
}

export function getWebGLUV(index: number): {
  repeatX: number;
  repeatY: number;
  offsetX: number;
  offsetY: number;
} {
  const { x, y, w, h } = getPrintCrop(index);
  return {
    repeatX: w / SHEET_WIDTH,
    repeatY: h / SHEET_HEIGHT,
    offsetX: x / SHEET_WIDTH,
    offsetY: 1 - (y + h) / SHEET_HEIGHT,
  };
}

export function getDomCropStyle(
  index: number,
  width: number,
  height: number,
): {
  backgroundSize: string;
  backgroundPosition: string;
} {
  const { x, y, w, h } = getPrintCrop(index);
  const safeW = Math.max(1, width);
  const safeH = Math.max(1, height);
  const sx = safeW / w;
  const sy = safeH / h;

  return {
    backgroundSize: `${(SHEET_WIDTH * sx).toFixed(3)}px ${(SHEET_HEIGHT * sy).toFixed(3)}px`,
    backgroundPosition: `${(-x * sx).toFixed(3)}px ${(-y * sy).toFixed(3)}px`,
  };
}

export function getWalkOffset(isPortraitSmall: boolean): number {
  return isPortraitSmall ? 0.14 + 0.9 * WALK_STEP : 0.14;
}

export function getWalkPose(th: number, isPortraitSmall: boolean): CameraPose {
  if (isPortraitSmall) {
    return {
      th,
      r: 15.4,
      yaw: -0.42,
      y: 1.9,
      pitch: -0.1,
    };
  }
  return {
    th,
    r: 15.6,
    yaw: -0.3,
    y: 1.92,
    pitch: -0.12,
  };
}

export function getFocusPose(
  wall: WallSide,
  th: number,
  isPortraitSmall: boolean,
): CameraPose {
  if (wall === 'outer') {
    return {
      th,
      r: RING_OUTER_RADIUS - (isPortraitSmall ? 5.2 : 4.26),
      yaw: Math.PI / 2,
      y: PRINT_CENTER_Y - (isPortraitSmall ? 1.05 : 0.52),
      pitch: 0,
    };
  }
  return {
    th,
    r: RING_INNER_RADIUS + (isPortraitSmall ? 5.2 : 4.26),
    yaw: -Math.PI / 2,
    y: PRINT_CENTER_Y - (isPortraitSmall ? 1.05 : 0.52),
    pitch: 0,
  };
}

export function shortestAngleCopy(baseAngle: number, referenceAngle: number): number {
  const twoPi = Math.PI * 2;
  let diff = (baseAngle - referenceAngle) % twoPi;
  if (diff > Math.PI) diff -= twoPi;
  if (diff < -Math.PI) diff += twoPi;
  return referenceAngle + diff;
}

export function nearestOuterAngleForPrint(
  printIndex: number,
  currentAngle: number,
): number {
  // The outer wall shows one product per slot; wrap oversized catalogs.
  const slot = ((printIndex % OUTER_PRINT_COUNT) + OUTER_PRINT_COUNT) % OUTER_PRINT_COUNT;
  const base = (slot * Math.PI * 2) / OUTER_PRINT_COUNT;
  return shortestAngleCopy(base, currentAngle);
}

export function computeWalkSlotTarget(
  currentTarget: number,
  walkOffset: number,
  deltaSlots: number,
): number {
  return (
    (Math.round((currentTarget - walkOffset) / WALK_STEP) - deltaSlots) *
      WALK_STEP +
    walkOffset
  );
}

export function evaluateCameraPose(pose: CameraPose): {
  position: [number, number, number];
  lookAt: [number, number, number];
} {
  const cosTh = Math.cos(pose.th);
  const sinTh = Math.sin(pose.th);

  const px = pose.r * cosTh;
  const py = pose.y;
  const pz = pose.r * sinTh;

  // Tangent points forward along decreasing th; outward normal points radially outward
  const tx = sinTh;
  const tz = -cosTh;
  const nx = cosTh;
  const nz = sinTh;

  const cosYaw = Math.cos(pose.yaw);
  const sinYaw = Math.sin(pose.yaw);
  const dx = cosYaw * tx + sinYaw * nx;
  const dz = cosYaw * tz + sinYaw * nz;

  return {
    position: [px, py, pz],
    lookAt: [px + dx, py + pose.pitch, pz + dz],
  };
}

export function interpolateFocusPose(
  from: CameraPose,
  to: CameraPose,
  rawT: number,
): CameraPose {
  const t = Math.max(0, Math.min(1, rawT));
  const easeQuart = 1 - Math.pow(1 - t, 4);
  const easeQuad = 1 - Math.pow(1 - t, 2);
  const easeCubic = 1 - Math.pow(1 - t, 3);

  return {
    th: from.th + (to.th - from.th) * easeQuart,
    yaw: from.yaw + (to.yaw - from.yaw) * easeQuad,
    r: from.r + (to.r - from.r) * easeCubic,
    y: from.y + (to.y - from.y) * easeCubic,
    pitch: from.pitch + (to.pitch - from.pitch) * easeCubic,
  };
}

export function easeExpoOut(rawT: number): number {
  const t = Math.max(0, Math.min(1, rawT));
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function formatPrice(
  amount: number,
  currency: CurrencyCode,
  spaced = false,
): string {
  const { symbol, rate } = CURRENCY_META[currency];
  const converted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
  }).format(amount * rate);
  return spaced ? `${symbol} ${converted}` : `${symbol}${converted}`;
}
