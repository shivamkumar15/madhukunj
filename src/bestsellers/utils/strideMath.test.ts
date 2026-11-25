import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeArcSlot,
  computeSection2Scroll,
  computeSpriteCrop,
  computeStormPieceTransform,
  computeTravellerState,
  computeWrapperZ,
  createStormPieces,
  mixHexColor,
  mod,
  sineEaseInOut,
  slideEase,
} from './strideMath';
import { BITS, FLAVORS, SH, SW } from '../data/flavors';

test('computeSpriteCrop calculates wrapper and bit sheet crops accurately', () => {
  const wrapper0 = computeSpriteCrop(FLAVORS[0].box, 4, SW, SH);
  // x=98-4=94, w=403+8=411 -> SW/w = 2688/411 = 654.0146%
  assert.ok(wrapper0.backgroundSize.startsWith('654.0146%'));
  // bit 0 has pad = 0: w=340 -> 2688/340 = 790.5882%
  const bit0 = computeSpriteCrop(BITS[0], 0, SW, SH);
  assert.ok(bit0.backgroundSize.startsWith('790.5882%'));
});

test('computeWrapperZ creates flat crimp bands at ends and puffed pillow in body', () => {
  const crimpLow = computeWrapperZ(0.5, 0.02);
  const crimpPeak = computeWrapperZ(0.5 / 34 + 0.5, 0.02);
  assert.ok(crimpLow >= 0.006 && crimpLow <= 0.012);
  assert.ok(crimpPeak >= 0.006 && crimpPeak <= 0.0121);

  const centerBody = computeWrapperZ(0.5, 0.5);
  const edgeBody = computeWrapperZ(0.0, 0.5);
  assert.ok(centerBody > 0.12 && centerBody < 0.14);
  assert.ok(edgeBody < 0.02);
});

test('computeArcSlot matches slot table, symmetry, depth and edge fade', () => {
  const s0 = computeArcSlot(0, 720, 400, 1);
  assert.equal(s0.x, 720);
  assert.equal(s0.y, 400);
  assert.equal(s0.h, 430);
  assert.equal(s0.rz, 0);
  assert.equal(s0.ry, 0);
  assert.equal(s0.op, 1);

  const sRight = computeArcSlot(1, 720, 400, 1);
  const sLeft = computeArcSlot(-1, 720, 400, 1);
  assert.equal(sRight.x - 720, 245);
  assert.equal(sLeft.x - 720, -245);
  assert.equal(sRight.rz, 4);
  assert.equal(sLeft.rz, -4);
  assert.equal(sRight.z, -34);

  const sFadeMid = computeArcSlot(3.6, 720, 400, 1);
  assert.ok(Math.abs(sFadeMid.op - 0.5) < 0.01);

  const sFadeOut = computeArcSlot(3.9, 720, 400, 1);
  assert.equal(sFadeOut.op, 0);
});

test('computeSection2Scroll maps p, 4 steps, storm q, and sticky pinY', () => {
  const vh = 900;
  const secH = 4500; // 500vh

  const before = computeSection2Scroll(200, secH, vh);
  assert.equal(before.p, 0);
  assert.equal(before.step, 0);
  assert.equal(before.pinY, 200);
  assert.equal(before.visible, true);

  // Mid step 2 (p ~ 0.45 -> floor(0.45 / 0.19) = 2 -> step index 2 -> 03)
  const mid = computeSection2Scroll(-0.45 * (secH - vh), secH, vh);
  assert.equal(mid.step, 2);
  assert.equal(mid.q, 0);
  assert.equal(mid.pinY, 0);

  // Storm start (p = 0.88 -> q = 0.5)
  const storm = computeSection2Scroll(-0.88 * (secH - vh), secH, vh);
  assert.equal(storm.step, 3);
  assert.ok(Math.abs(storm.q - 0.5) < 1e-6);

  // Past bottom
  const past = computeSection2Scroll(-(secH - vh + 150), secH, vh);
  assert.equal(past.pinY, -150);
  assert.equal(past.q, 1);
});

test('computeTravellerState interpolates A -> B -> C cleanly', () => {
  const A = { x: 100, y: 100, h: 400, rz: 0, ry: 0, rx: 0, z: 0, op: 1, sx: 1, sy: 1, shadow: 1 };
  const B = { x: 700, y: 400, h: 600, rz: 14, ry: 180, rx: 0, z: 0, op: 1, sx: 1, sy: 1, shadow: 1 };
  const C = { x: 300, y: 500, h: 255, rz: 0, ry: 360, rx: 5, z: 30, op: 1, sx: 1, sy: 1, shadow: 0.7 };

  const atA = computeTravellerState(A, B, C, 0, 0);
  assert.equal(atA.x, 100);
  assert.equal(atA.ry, 0);

  const midAB = computeTravellerState(A, B, C, 0.5, 0);
  assert.ok(Math.abs(midAB.x - 400) < 1e-9);
  assert.ok(Math.abs(midAB.ry - 90) < 1e-9);

  const atB = computeTravellerState(A, B, C, 1, 0);
  assert.equal(atB.x, 700);
  assert.equal(atB.rz, 14);

  const atC = computeTravellerState(A, B, C, 1, 1);
  assert.equal(atC.x, 300);
  assert.equal(atC.z, 30);
  assert.equal(atC.shadow, 0.7);
});

test('createStormPieces produces 20 deterministic pieces with 70% active bit', () => {
  const pieces = createStormPieces(20);
  assert.equal(pieces.length, 20);
  const activeCount = pieces.filter((p) => p.useActiveBit).length;
  assert.equal(activeCount, 14); // 70% of 20

  const mid = computeStormPieceTransform(pieces[0], 0.5, 1440, 900, 0);
  assert.equal(mid.visible, true);
  assert.ok(mid.opacity > 0);
  assert.equal(mid.bit, 0);

  const end = computeStormPieceTransform(pieces[0], 1, 1440, 900, 0);
  assert.equal(end.visible, false);
});

test('easing curves, mod and mixHexColor behave deterministically', () => {
  assert.equal(slideEase(0), 0);
  assert.equal(slideEase(1), 1);
  assert.ok(slideEase(0.2) > 0.45); // fast start

  assert.equal(sineEaseInOut(0), 0);
  assert.ok(Math.abs(sineEaseInOut(0.5) - 0.5) < 1e-9);
  assert.equal(sineEaseInOut(1), 1);

  assert.equal(mod(-1, 5), 4);
  assert.equal(mod(6, 5), 1);

  const ink = mixHexColor('#ab9ac4', '#1c1a1f', 0.78);
  assert.ok(ink.startsWith('rgb('));
});
