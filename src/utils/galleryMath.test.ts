import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeWalkSlotTarget,
  easeExpoOut,
  evaluateCameraPose,
  formatPrice,
  getDomCropStyle,
  getFocusPose,
  getPrintCrop,
  getWalkOffset,
  getWalkPose,
  getWebGLUV,
  interpolateFocusPose,
  nearestOuterAngleForPrint,
  shortestAngleCopy,
  WALK_STEP,
} from './galleryMath';

test('getPrintCrop maps catalog indices to sheet grid cells', () => {
  assert.deepEqual(getPrintCrop(0), { col: 0, row: 0, x: 0, y: 0, w: 300, h: 400 });
  assert.deepEqual(getPrintCrop(4), { col: 4, row: 0, x: 1200, y: 0, w: 300, h: 400 });
  assert.deepEqual(getPrintCrop(14), { col: 2, row: 1, x: 600, y: 400, w: 300, h: 400 });
});

test('getWebGLUV flips V coordinate and computes repeat/offset accurately', () => {
  const uv0 = getWebGLUV(0);
  assert.ok(Math.abs(uv0.repeatX - 300 / 3600) < 1e-6);
  assert.ok(Math.abs(uv0.repeatY - 400 / 3600) < 1e-6);
  assert.ok(Math.abs(uv0.offsetX - 0) < 1e-6);
  assert.ok(Math.abs(uv0.offsetY - (1 - 400 / 3600)) < 1e-6);
});

test('getDomCropStyle scales sheet and positions print inside container', () => {
  const style = getDomCropStyle(0, 300, 400);
  assert.equal(style.backgroundSize, '3600.000px 3600.000px');
  assert.equal(style.backgroundPosition, '0.000px 0.000px');
});

test('shortestAngleCopy picks the copy within +/- PI of reference', () => {
  const base = 0.2;
  const ref = Math.PI * 2 + 0.1;
  const copy = shortestAngleCopy(base, ref);
  assert.ok(Math.abs(copy - (Math.PI * 2 + 0.2)) < 1e-6);
  assert.ok(Math.abs(copy - ref) <= Math.PI);
});

test('nearestOuterAngleForPrint wraps catalog indices onto the outer wall', () => {
  // Each catalog index maps to one outer-wall slot; oversized catalogs wrap.
  const nearest0 = nearestOuterAngleForPrint(0, 0.14);
  assert.ok(Math.abs(nearest0 - 0) < 1e-6);

  const wrapped = nearestOuterAngleForPrint(36, 0.14);
  assert.ok(Math.abs(wrapped - 0) < 1e-6);

  // A copy is always chosen within +/- PI of the current angle
  const other = nearestOuterAngleForPrint(9, Math.PI + 0.05);
  assert.ok(Math.abs(other - Math.PI / 2) < 1e-6);
  assert.ok(Math.abs(other - (Math.PI + 0.05)) <= Math.PI);
});

test('computeWalkSlotTarget advances forward along decreasing theta', () => {
  const D = getWalkOffset(false);
  const next = computeWalkSlotTarget(D, D, 1);
  assert.ok(Math.abs(next - (D - WALK_STEP)) < 1e-6);

  const prev = computeWalkSlotTarget(D, D, -1);
  assert.ok(Math.abs(prev - (D + WALK_STEP)) < 1e-6);
});

test('evaluateCameraPose places camera at polar coordinate and aims correctly', () => {
  const pose = getFocusPose('outer', 0, false);
  const { position, lookAt } = evaluateCameraPose(pose);
  assert.ok(Math.abs(position[0] - (18 - 4.26)) < 1e-6);
  assert.ok(Math.abs(position[2]) < 1e-6);
  // yaw = +PI/2 looks along outward normal (+X at th=0)
  assert.ok(lookAt[0] > position[0]);
  assert.ok(Math.abs(lookAt[2]) < 1e-6);
});

test('interpolateFocusPose respects endpoints and asymmetric easing', () => {
  const from = getWalkPose(0.5, false);
  const to = getFocusPose('outer', 0.2, false);

  const start = interpolateFocusPose(from, to, 0);
  assert.deepEqual(start, from);

  const end = interpolateFocusPose(from, to, 1);
  assert.deepEqual(end, to);

  // At t=0.5, quartic ease-out for th (0.9375) leads quadratic ease-out for yaw (0.75)
  const mid = interpolateFocusPose(from, to, 0.5);
  const thProgress = (mid.th - from.th) / (to.th - from.th);
  const yawProgress = (mid.yaw - from.yaw) / (to.yaw - from.yaw);
  assert.ok(thProgress > yawProgress);
});

test('easeExpoOut starts at 0 and finishes at 1', () => {
  assert.equal(easeExpoOut(0), 0);
  assert.equal(easeExpoOut(1), 1);
  assert.ok(easeExpoOut(0.5) > 0.9);
});

test('formatPrice formats INR prices with Indian digit grouping', () => {
  assert.equal(formatPrice(60, 'INR', true), '₹ 60');
  assert.equal(formatPrice(1000, 'INR', false), '₹1,000');
});
