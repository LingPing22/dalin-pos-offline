import { test } from "node:test";
import assert from "node:assert/strict";
import { FRAME_H, MAX_ZOOM, START, clampCrop, coverScale, minZoom, placement, turn, zoomAt } from "../src/lib/photo-crop";

const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≈ ${b}`);

/** The frame (in frame units: 1 × 0.75) that the drawn photo covers */
function covered(c: typeof START, w: number, h: number) {
  const p = placement(c, w, h, 1);
  const [dw, dh] = c.r % 180 ? [p.h, p.w] : [p.w, p.h];
  return { left: p.cx - dw / 2, right: p.cx + dw / 2, top: p.cy - dh / 2, bottom: p.cy + dh / 2 };
}

test("a 4:3 photo at the start fills the frame exactly", () => {
  const b = covered(START, 4000, 3000);
  near(b.left, 0);
  near(b.right, 1);
  near(b.top, 0);
  near(b.bottom, FRAME_H);
});

test("a tall phone photo fills the width; the top and bottom are what gets cut", () => {
  const b = covered(START, 3000, 4000);
  near(b.left, 0);
  near(b.right, 1);
  assert.ok(b.top < 0 && b.bottom > FRAME_H);
});

test("dragging stops at the edge so no white gap shows while the photo fills the frame", () => {
  const c = clampCrop({ ...START, x: 5, y: -5 }, 3000, 4000);
  near(c.x, 0); // exactly as wide as the frame: can't move sideways
  const b = covered(c, 3000, 4000);
  near(b.bottom, FRAME_H); // dragged all the way up: the photo's bottom edge sits on the frame's bottom
  assert.ok(b.top < 0);
  assert.equal(clampCrop({ ...START, y: 5 }, 3000, 4000).y, -c.y);
});

test("zooming out shows the whole photo, which then stays inside the frame", () => {
  const z = minZoom(3000, 4000, 0);
  assert.ok(z < 1);
  const c = clampCrop({ ...START, z: 0.01, x: 3 }, 3000, 4000);
  near(c.z, z);
  const b = covered(c, 3000, 4000);
  near(b.top, 0);
  near(b.bottom, FRAME_H);
  near(b.right, 1); // pushed to the right edge, not past it
  assert.ok(b.left > 0);
  assert.equal(minZoom(4000, 3000, 0), 1); // a 4:3 photo can't be shown smaller than the frame
});

test("zoom stays within range", () => {
  assert.equal(clampCrop({ ...START, z: 99 }, 4000, 3000).z, MAX_ZOOM);
});

test("pinch zoom keeps the point under the fingers still", () => {
  const c0 = clampCrop({ ...START, z: 2, x: 0.1, y: 0.05 }, 4000, 3000);
  const at = { x: 0.2, y: -0.1 };
  const c1 = zoomAt(c0, 3, at.x, at.y, 4000, 3000);
  assert.equal(c1.z, 3);
  // the photo point under `at`, in photo pixels from its centre, before and after
  const under = (c: typeof c0) => [(at.x - c.x) / (coverScale(4000, 3000, 0) * c.z), (at.y - c.y) / (coverScale(4000, 3000, 0) * c.z)];
  under(c0).forEach((v, i) => near(v, under(c1)[i]));
});

test("turning a sideways photo a quarter swaps which side gets cut", () => {
  const c = turn(START);
  assert.equal(c.r, 90);
  const b = covered(c, 4000, 3000); // landscape turned upright = tall
  near(b.left, 0);
  near(b.right, 1);
  assert.ok(b.top < 0);
  assert.equal(turn(turn(turn(c))).r, 0);
});
