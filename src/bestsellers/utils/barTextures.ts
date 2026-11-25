import * as THREE from 'three';
import {
  BAR_ASPECT,
  FLAVORS,
  NUTRITION_ROWS,
  SH,
  SW,
  type FlavorSpec,
} from '../data/flavors';
import {
  computeWrapperZ,
  hexToRgba,
  mixHexColor,
  seededRand,
} from './strideMath';

export interface WrapperGeometries {
  front: THREE.PlaneGeometry;
  back: THREE.PlaneGeometry;
  shadow: THREE.PlaneGeometry;
}

export function createWrapperGeometries(): WrapperGeometries {
  const front = new THREE.PlaneGeometry(1, BAR_ASPECT, 30, 64);
  const fPos = front.attributes.position;
  const fUv = front.attributes.uv;
  for (let i = 0; i < fPos.count; i++) {
    const u = fUv.getX(i);
    const v = fUv.getY(i);
    const z = computeWrapperZ(u, v);
    fPos.setZ(i, z);
  }
  fPos.needsUpdate = true;
  front.computeVertexNormals();

  const back = new THREE.PlaneGeometry(1, BAR_ASPECT, 30, 64);
  const bPos = back.attributes.position;
  const bUv = back.attributes.uv;
  for (let i = 0; i < bPos.count; i++) {
    const u = bUv.getX(i);
    const v = bUv.getY(i);
    const z = computeWrapperZ(u, v);
    bPos.setZ(i, -z);
    bUv.setX(i, 1 - u);
  }
  bPos.needsUpdate = true;
  bUv.needsUpdate = true;

  // Reverse triangle winding so back faces outward (-z)
  const index = back.getIndex();
  if (index) {
    const arr = index.array as Uint16Array | Uint32Array;
    for (let i = 0; i < arr.length; i += 3) {
      const tmp = arr[i + 1];
      arr[i + 1] = arr[i + 2];
      arr[i + 2] = tmp;
    }
    index.needsUpdate = true;
  }
  back.computeVertexNormals();

  const shadow = new THREE.PlaneGeometry(1.25, 1.04 * BAR_ASPECT);

  return { front, back, shadow };
}

export function createShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 512);

  ctx.save();
  ctx.translate(128, 256);
  ctx.scale(1, 2);
  const grad = ctx.createRadialGradient(0, 0, 12, 0, 0, 120);
  grad.addColorStop(0, 'rgba(30, 18, 40, 0.55)');
  grad.addColorStop(0.45, 'rgba(30, 18, 40, 0.25)');
  grad.addColorStop(1, 'rgba(30, 18, 40, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export interface FlavorTexturePair {
  front: THREE.CanvasTexture;
  back: THREE.CanvasTexture;
}

export async function ensureBackFontsLoaded(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load('400 24px "Archivo Black"'),
      document.fonts.load('400 24px "DM Mono"'),
      document.fonts.load('500 24px "DM Mono"'),
      document.fonts.load('700 24px "Inter"'),
    ]);
  } catch {
    // Font fallback if any font load rejects
  }
}

export function buildFlavorTextures(
  img: HTMLImageElement,
  flavor: FlavorSpec
): FlavorTexturePair {
  const [, , bw] = flavor.box;
  const W = Math.round((bw + 8) * 1.5 * 0.75);
  const H = Math.round(W * BAR_ASPECT);

  const imgScale = (img.naturalWidth || SW) / SW;
  const sx = (flavor.box[0] - 4) * imgScale;
  const sy = (flavor.box[1] - 4) * imgScale;
  const sw = (flavor.box[2] + 8) * imgScale;
  const sh = (flavor.box[3] + 8) * imgScale;

  // Front texture
  const fCanvas = document.createElement('canvas');
  fCanvas.width = W;
  fCanvas.height = H;
  const fCtx = fCanvas.getContext('2d')!;
  fCtx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
  const frontTex = new THREE.CanvasTexture(fCanvas);
  frontTex.colorSpace = THREE.SRGBColorSpace;
  frontTex.anisotropy = 8;
  frontTex.needsUpdate = true;

  // Back texture
  const bCanvas = document.createElement('canvas');
  bCanvas.width = W;
  bCanvas.height = H;
  const ctx = bCanvas.getContext('2d')!;

  // 1. Mirrored crop gives alpha outline + crimp shading
  ctx.save();
  ctx.translate(W, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
  ctx.restore();

  // 2. source-atop fill body & seal bands
  const sealH = H * 0.075;
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = hexToRgba(flavor.color, 0.9);
  ctx.fillRect(0, sealH, W, H - sealH * 2);

  ctx.fillStyle = hexToRgba(flavor.color, 0.35);
  ctx.fillRect(0, 0, W, sealH);
  ctx.fillRect(0, H - sealH, W, sealH);

  // 3. Horizontal sheen gradient over body
  const sheen = ctx.createLinearGradient(0, 0, W, 0);
  sheen.addColorStop(0, 'rgba(0,0,0,0.10)');
  sheen.addColorStop(0.28, 'rgba(255,255,255,0.14)');
  sheen.addColorStop(0.5, 'rgba(255,255,255,0)');
  sheen.addColorStop(0.8, 'rgba(0,0,0,0.04)');
  sheen.addColorStop(1, 'rgba(0,0,0,0.14)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, sealH, W, H - sealH * 2);

  // 4. Text & panels
  const ink = mixHexColor(flavor.color, '#1c1a1f', 0.78);
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // "MADHUKUNJ" at 15% height
  ctx.font = `400 ${Math.round(0.062 * W)}px "Archivo Black", sans-serif`;
  ctx.fillText('MADHUKUNJ', W * 0.5, H * 0.15);

  // "<PRODUCT> · 80 G" at 18.5% height
  ctx.font = `500 ${Math.round(0.042 * W)}px "DM Mono", monospace`;
  ctx.fillText(`${flavor.name.toUpperCase()} · ${flavor.weight}`, W * 0.5, H * 0.185);

  // Nutrition panel: x 15%..85%, y 21.5%..57.5%, radius 0.03W
  const px = W * 0.15;
  const py = H * 0.215;
  const pw = W * 0.7;
  const ph = H * 0.36;
  drawRoundedRect(ctx, px, py, pw, ph, 0.03 * W);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.fill();

  const padX = px + pw * 0.08;
  const rightX = px + pw * 0.92;
  let curY = py + ph * 0.095;

  ctx.fillStyle = ink;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `400 ${Math.round(0.05 * W)}px "Archivo Black", sans-serif`;
  ctx.fillText('PRODUCT DETAILS', padX, curY);

  curY += ph * 0.07;
  ctx.font = `400 ${Math.round(0.032 * W)}px "DM Mono", monospace`;
  ctx.fillText(`Incense sticks · ${flavor.weight} pack`, padX, curY);

  curY += ph * 0.038;
  ctx.fillStyle = ink;
  ctx.fillRect(padX, curY, rightX - padX, Math.max(1.5, H * 0.0022));

  const rowStep = H * 0.034;
  curY += rowStep * 0.95;

  NUTRITION_ROWS.forEach((row, idx) => {
    ctx.fillStyle = ink;
    ctx.font = `${row.bold ? 500 : 400} ${Math.round(0.033 * W)}px "DM Mono", monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(row.label, padX, curY);
    ctx.textAlign = 'right';
    ctx.fillText(row.value, rightX, curY);

    if (idx < NUTRITION_ROWS.length - 1) {
      ctx.fillStyle = 'rgba(28, 26, 31, 0.16)';
      ctx.fillRect(padX, curY + rowStep * 0.28, rightX - padX, 1);
    }
    curY += rowStep;
  });

  // About
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `500 ${Math.round(0.038 * W)}px "DM Mono", monospace`;
  ctx.fillText('ABOUT', W * 0.5, H * 0.62);

  ctx.font = `400 ${Math.round(0.034 * W)}px "DM Mono", monospace`;
  const lines = wrapText(ctx, flavor.ingredients, W * 0.7);
  const lineSpacing = H * 0.022;
  lines.forEach((ln, i) => {
    ctx.fillText(ln, W * 0.5, H * 0.648 + i * lineSpacing);
  });

  // Barcode on white rounded card at 73.5% height
  const bcW = W * 0.52;
  const bcH = H * 0.105;
  const bcX = (W - bcW) * 0.5;
  const bcY = H * 0.735;
  drawRoundedRect(ctx, bcX, bcY, bcW, bcH, 0.022 * W);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
  ctx.fill();

  const rand = seededRand(flavor.barcodeSeed);
  let bx = bcX + bcW * 0.1;
  const bxMax = bcX + bcW * 0.9;
  const barTop = bcY + bcH * 0.14;
  const barH = bcH * 0.56;
  ctx.fillStyle = '#1c1a1f';
  while (bx < bxMax - 2) {
    const bwBar = Math.max(1.2, Math.floor(rand() * 3.5 + 1) * (W * 0.0045));
    const gap = Math.max(1.2, Math.floor(rand() * 2.5 + 1) * (W * 0.0045));
    if (bx + bwBar <= bxMax) {
      ctx.fillRect(bx, barTop, bwBar, barH);
    }
    bx += bwBar + gap;
  }
  ctx.font = `400 ${Math.round(0.026 * W)}px "DM Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(
    `5 060921 ${String(flavor.barcodeSeed).slice(0, 5)}`,
    W * 0.5,
    bcY + bcH * 0.88
  );

  // Tagline at 88.5% height
  ctx.fillStyle = ink;
  ctx.textBaseline = 'middle';
  ctx.font = `500 ${Math.round(0.036 * W)}px "DM Mono", monospace`;
  ctx.fillText('CRAFTED IN KALINGA', W * 0.5, H * 0.885);

  ctx.restore();

  const backTex = new THREE.CanvasTexture(bCanvas);
  backTex.colorSpace = THREE.SRGBColorSpace;
  backTex.anisotropy = 8;
  backTex.needsUpdate = true;

  return { front: frontTex, back: backTex };
}

export async function buildAllFlavorTextures(
  img: HTMLImageElement
): Promise<FlavorTexturePair[]> {
  await ensureBackFontsLoaded();
  return FLAVORS.map((f) => buildFlavorTextures(img, f));
}
