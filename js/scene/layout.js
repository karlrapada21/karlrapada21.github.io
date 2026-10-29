/**
 * Where everything lives on the island.
 * Kept in one place so props, vegetation and the camera all agree.
 */

import { heightAt, POND, edgeRadius } from './island.js';

export const LAYOUT = {
  house: { x: -4.9, z: -4.4, rotY: 0.42 },
  windmill: { x: 6.6, z: -5.0, rotY: -0.5 },
  grove: { x: 0.3, z: -1.4, y: 6.2 },
  signposts: { x: -6.2, z: 3.2, rotY: 0.9 },
  mailbox: { x: 7.7, z: 2.3, rotY: -0.65 },
  character: { x: -2.2, z: -1.7, rotY: 2.5 },
  pier: { x: 5.8, z: 6.9, rotY: -0.5 },
  bell: { x: -1.4, z: -8.4 },
};

export const POND_INFO = POND;

/** Stone path: a polyline from the south rim to the cottage door. */
export const PATH_POINTS = [
  [1.0, 12.4],
  [0.4, 10.2],
  [-0.6, 8.3],
  [-1.8, 6.4],
  [-2.9, 4.5],
  [-3.8, 2.3],
  [-4.4, 0.1],
  [-4.7, -1.9],
  [-4.7, -2.7],
];

export const LANTERNS = [
  { x: -1.35, z: 7.15, h: 1.5 },
  { x: -3.15, z: 3.35, h: 1.6 },
  { x: -4.15, z: 0.05, h: 1.45 },
];

/** Rectangular-ish keep-out zones for scatter placement. */
const KEEP_OUT = [
  { x: POND.x, z: POND.z, r: POND.r * 1.55 },
  { x: LAYOUT.house.x, z: LAYOUT.house.z, r: 4.1 },
  { x: LAYOUT.windmill.x, z: LAYOUT.windmill.z, r: 3.5 },
  { x: LAYOUT.signposts.x, z: LAYOUT.signposts.z, r: 2.9 },
  { x: LAYOUT.mailbox.x, z: LAYOUT.mailbox.z, r: 2.2 },
  { x: LAYOUT.grove.x, z: LAYOUT.grove.z, r: 4.4 },
  { x: LAYOUT.character.x, z: LAYOUT.character.z, r: 1.6 },
  { x: LAYOUT.pier.x, z: LAYOUT.pier.z, r: 2.4 },
];

export function distanceToSegment(px, pz, ax, az, bx, bz) {
  const vx = bx - ax;
  const vz = bz - az;
  const wx = px - ax;
  const wz = pz - az;
  const len2 = vx * vx + vz * vz;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (wx * vx + wz * vz) / len2));
  const dx = px - (ax + vx * t);
  const dz = pz - (az + vz * t);
  return Math.hypot(dx, dz);
}

export function distanceToPath(x, z) {
  let best = Infinity;
  for (let i = 0; i < PATH_POINTS.length - 1; i++) {
    const [ax, az] = PATH_POINTS[i];
    const [bx, bz] = PATH_POINTS[i + 1];
    const d = distanceToSegment(x, z, ax, az, bx, bz);
    if (d < best) best = d;
  }
  return best;
}

/**
 * @param {number} x
 * @param {number} z
 * @param {number} margin extra radius added to every keep-out
 */
export function isFree(x, z, margin = 0, pathClearance = 1.5) {
  const theta = Math.atan2(z, x);
  const er = edgeRadius(theta);
  const r = Math.hypot(x, z);
  if (r > er * 0.93) return false; // keep the rim readable
  if (r < 1.2) return false;

  for (const k of KEEP_OUT) {
    if (Math.hypot(x - k.x, z - k.z) < k.r + margin) return false;
  }
  if (distanceToPath(x, z) < pathClearance) return false;
  return true;
}

/** Ground level with a small safety offset so nothing floats. */
export function seat(x, z, lift = 0) {
  return heightAt(x, z) + lift;
}

/** Y of the water surface inside the pond bowl. */
export const WATER_LEVEL = heightAt(POND.x, POND.z) + 0.62;
