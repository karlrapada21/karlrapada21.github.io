/**
 * Trees, grass, flowers and stones — all instanced, all wind-driven in the
 * vertex shader. Adding ten thousand blades costs zero extra draw calls.
 */

import {
  Group,
  InstancedMesh,
  InstancedBufferAttribute,
  Matrix4,
  Quaternion,
  Euler,
  Vector3,
  Color,
} from 'three';

import { toon } from '../core/materials.js';
import { GeoBuilder, grassTuftGeometry } from '../core/geo.js';
import { mulberry32 } from '../core/util.js';
import { heightAt, POND } from './island.js';
import { isFree } from './layout.js';

const rnd = mulberry32(880123);

/* ─────────────────────────────── tree recipes ───────────────────────────── */

const LEAF = ['#8fc05a', '#7fb350', '#6ea447', '#5d9440', '#96c663'];
const LEAF_DEEP = ['#5f9440', '#548638', '#4a7a33', '#68a047'];
const TRUNK = '#7a5540';
const TRUNK_DARK = '#63432f';

function broadleaf(seed) {
  const b = new GeoBuilder(seed);
  const h = 1.55;

  b.cyl(0.085, 0.17, h, 7, TRUNK, { pos: [0, h / 2, 0] });
  b.cyl(0.05, 0.075, 0.75, 5, TRUNK_DARK, { pos: [0.16, h + 0.2, 0.05], rot: [0, 0, -0.55] });
  b.cyl(0.045, 0.07, 0.6, 5, TRUNK_DARK, { pos: [-0.14, h + 0.28, -0.05], rot: [0, 0, 0.6] });

  b.blob(1.02, LEAF[0], { pos: [0, h + 1.05, 0], squash: 0.83, jitter: 0.11 });
  b.blob(0.76, LEAF[1], { pos: [0.72, h + 0.72, 0.2], squash: 0.86, jitter: 0.1 });
  b.blob(0.7, LEAF[2], { pos: [-0.66, h + 0.8, -0.24], squash: 0.86, jitter: 0.1 });
  b.blob(0.6, LEAF[3], { pos: [0.2, h + 1.5, 0.18], squash: 0.9, jitter: 0.1 });
  b.blob(0.52, LEAF[4], { pos: [-0.2, h + 0.5, 0.62], squash: 0.84, jitter: 0.1 });

  return b.build();
}

function tallTree(seed) {
  const b = new GeoBuilder(seed);
  const h = 2.5;
  b.cyl(0.1, 0.2, h, 7, TRUNK, { pos: [0, h / 2, 0] });
  b.blob(1.05, LEAF_DEEP[0], { pos: [0, h + 0.5, 0], squash: 0.8, jitter: 0.1 });
  b.blob(0.92, LEAF_DEEP[1], { pos: [0.12, h + 1.3, -0.1], squash: 0.84, jitter: 0.1 });
  b.blob(0.72, LEAF_DEEP[2], { pos: [-0.1, h + 2.0, 0.1], squash: 0.88, jitter: 0.1 });
  b.blob(0.5, LEAF_DEEP[3], { pos: [0.06, h + 2.55, 0], squash: 0.92, jitter: 0.1 });
  return b.build();
}

function bushTree(seed) {
  const b = new GeoBuilder(seed);
  b.cyl(0.07, 0.13, 0.7, 6, TRUNK_DARK, { pos: [0, 0.35, 0] });
  b.blob(1.18, LEAF[1], { pos: [0, 1.15, 0], squash: 0.72, jitter: 0.12 });
  b.blob(0.72, LEAF[3], { pos: [0.68, 0.95, 0.22], squash: 0.76, jitter: 0.12 });
  b.blob(0.62, LEAF[0], { pos: [-0.6, 1.02, -0.18], squash: 0.78, jitter: 0.12 });
  return b.build();
}

function pine(seed) {
  const b = new GeoBuilder(seed);
  b.cyl(0.07, 0.14, 1.15, 6, TRUNK_DARK, { pos: [0, 0.57, 0] });
  b.cone(1.15, 1.7, 8, '#4f8a3b', { pos: [0, 1.75, 0], flat: true, jitter: 0.08 });
  b.cone(0.92, 1.45, 8, '#589540', { pos: [0, 2.5, 0], flat: true, jitter: 0.08 });
  b.cone(0.63, 1.15, 8, '#63a248', { pos: [0, 3.15, 0], flat: true, jitter: 0.08 });
  return b.build();
}

/* ──────────────────────────── instancing helper ─────────────────────────── */

const _m = new Matrix4();
const _q = new Quaternion();
const _e = new Euler();
const _pos = new Vector3();
const _scale = new Vector3();

function makeInstanced(geo, material, transforms, name) {
  const mesh = new InstancedMesh(geo, material, transforms.length);
  mesh.name = name;
  mesh.frustumCulled = false;

  const tints = new Float32Array(transforms.length * 3);

  transforms.forEach((t, i) => {
    _e.set(0, t.rotY ?? 0, 0);
    _q.setFromEuler(_e);
    _pos.set(t.x, t.y, t.z);
    const s = t.scale ?? 1;
    _scale.set(s * (t.sx ?? 1), s * (t.sy ?? 1), s * (t.sz ?? 1));
    _m.compose(_pos, _q, _scale);
    mesh.setMatrixAt(i, _m);

    const tint = t.tint ?? [1, 1, 1];
    tints[i * 3] = tint[0];
    tints[i * 3 + 1] = tint[1];
    tints[i * 3 + 2] = tint[2];
  });

  mesh.instanceMatrix.needsUpdate = true;
  mesh.geometry.setAttribute('aTint', new InstancedBufferAttribute(tints, 3));
  mesh.computeBoundingSphere();
  return mesh;
}

/* ───────────────────────────────── scatter ──────────────────────────────── */

function scatter({ count, minR, maxR, margin = 0, pathClearance = 1.4, tries = 40, filter }) {
  const out = [];
  let guard = count * tries;

  while (out.length < count && guard-- > 0) {
    const a = rnd() * Math.PI * 2;
    // bias outward so the middle of the village stays open
    const r = minR + Math.pow(rnd(), 0.72) * (maxR - minR);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;

    if (!isFree(x, z, margin, pathClearance)) continue;
    if (filter && !filter(x, z)) continue;

    // don't stack two items on the same spot
    let clash = false;
    for (const o of out) {
      if ((o.x - x) ** 2 + (o.z - z) ** 2 < 0.7) {
        clash = true;
        break;
      }
    }
    if (clash) continue;

    out.push({ x, z });
  }
  return out;
}

/* ──────────────────────────────── assembly ──────────────────────────────── */

export function createVegetation(quality = 'high') {
  const group = new Group();
  group.name = 'vegetation';

  const treeCounts =
    quality === 'high'
      ? { broad: 16, tall: 9, bush: 13, pine: 8 }
      : quality === 'medium'
      ? { broad: 11, tall: 6, bush: 9, pine: 5 }
      : { broad: 7, tall: 4, bush: 6, pine: 3 };

  /* --- trees --- */
  const variants = [
    { geo: broadleaf(101), count: treeCounts.broad, s: [0.85, 1.25], name: 'trees-broadleaf' },
    { geo: tallTree(202), count: treeCounts.tall, s: [0.8, 1.15], name: 'trees-tall' },
    { geo: bushTree(303), count: treeCounts.bush, s: [0.85, 1.3], name: 'trees-bush' },
    { geo: pine(404), count: treeCounts.pine, s: [0.85, 1.2], name: 'trees-pine' },
  ];

  for (const v of variants) {
    const spots = scatter({
      count: v.count,
      minR: 3.1,
      maxR: 12.2,
      margin: 0.9,
      pathClearance: 1.7,
    });

    const transforms = spots.map((s) => {
      const scale = v.s[0] + rnd() * (v.s[1] - v.s[0]);
      return {
        x: s.x,
        z: s.z,
        y: heightAt(s.x, s.z) - 0.12,
        rotY: rnd() * Math.PI * 2,
        scale,
        tint: [0.92 + rnd() * 0.16, 0.94 + rnd() * 0.14, 0.92 + rnd() * 0.16],
      };
    });

    const mat = toon({
      vcolors: true,
      sway: true,
      itint: true,
      swayAmp: 0.06,
      swaySpeed: 0.75,
      swayTop: 4.5,
      rim: 0.14,
    });

    group.add(makeInstanced(v.geo, mat, transforms, v.name));
  }

  /* --- grass tufts --- */
  const grassCount = quality === 'high' ? 5200 : quality === 'medium' ? 2600 : 1200;
  const tuftGeo = grassTuftGeometry(3, 0.85, 0.36, '#b6db7b', '#5b8c40');
  const tuftMat = toon({
    vcolors: true,
    wind: true,
    itint: true,
    windAmp: 0.17,
    windBase: 0.02,
    windTop: 0.85,
    rim: 0.22,
    doubleSide: true,
  });

  const grassTransforms = [];
  for (let i = 0; i < grassCount; i++) {
    const a = rnd() * Math.PI * 2;
    // denser toward the middle, thinning out at the very rim
    const r = 1.0 + Math.pow(rnd(), 0.55) * 12.2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const dp = Math.hypot(x - POND.x, z - POND.z);
    if (dp < POND.r * 1.08) continue;
    if (Math.hypot(x, z) > 12.8) continue;

    grassTransforms.push({
      x,
      z,
      y: heightAt(x, z) - 0.05,
      rotY: rnd() * Math.PI,
      scale: 0.7 + rnd() * 0.85,
      tint: [0.9 + rnd() * 0.2, 0.94 + rnd() * 0.14, 0.88 + rnd() * 0.16],
    });
  }
  group.add(makeInstanced(tuftGeo, tuftMat, grassTransforms, 'grass'));

  /* --- flowers --- */
  const flowerCount = quality === 'high' ? 320 : quality === 'medium' ? 180 : 90;
  const fb = new GeoBuilder(555);
  fb.cyl(0.012, 0.016, 0.3, 4, '#6fa14a', { pos: [0, 0.15, 0] });
  fb.blob(0.062, '#fff4e2', { pos: [0, 0.32, 0], squash: 1, wSeg: 7, hSeg: 5 });
  const flowerGeo = fb.build();

  const flowerSpots = scatter({
    count: flowerCount,
    minR: 1.4,
    maxR: 12.0,
    margin: -0.4,
    pathClearance: 0.8,
  });

  const flowerTints = ['#ffd9e2', '#fff3c4', '#e8f0ff', '#ffd0b8', '#f0d8ff', '#fffbe8'];
  const nf = flowerSpots.length;
  const flowerTransforms = flowerSpots.map((s) => ({
    x: s.x,
    z: s.z,
    y: heightAt(s.x, s.z) + 0.02,
    rotY: rnd() * Math.PI * 2,
    scale: 0.75 + rnd() * 0.7,
    tint: hexTint(flowerTints[Math.floor(rnd() * flowerTints.length)]),
  }));

  const flowerMat = toon({ vcolors: true, wind: true, itint: true, windAmp: 0.09, windTop: 0.34, rim: 0.2 });
  if (flowerTransforms.length) group.add(makeInstanced(flowerGeo, flowerMat, flowerTransforms, 'flowers'));

  /* --- stones --- */
  const stoneCount = quality === 'high' ? 46 : quality === 'medium' ? 28 : 14;
  const stoneGeo = plainRock(616);
  const stoneSpots = scatter({ count: stoneCount, minR: 2.0, maxR: 12.4, margin: 0.1, pathClearance: 1.1 });
  const stoneTransforms = stoneSpots.map((s) => ({
    x: s.x,
    z: s.z,
    y: heightAt(s.x, s.z) - 0.04,
    rotY: rnd() * Math.PI * 2,
    scale: 0.22 + rnd() * 0.42,
    tint: [0.94 + rnd() * 0.1, 0.94 + rnd() * 0.1, 0.92 + rnd() * 0.12],
  }));
  const stoneMat = toon({ vcolors: true, itint: true, rim: 0.18 });
  if (stoneTransforms.length) group.add(makeInstanced(stoneGeo, stoneMat, stoneTransforms, 'stones'));

  /* --- shrubs --- */
  const shrubSpots = scatter({ count: quality === 'low' ? 10 : 20, minR: 2.2, maxR: 12.0, margin: 0.2, pathClearance: 1.3 });
  const shrubGeo = shrub(717);
  const shrubTransforms = shrubSpots.map((s) => ({
    x: s.x,
    z: s.z,
    y: heightAt(s.x, s.z) - 0.08,
    rotY: rnd() * Math.PI * 2,
    scale: 0.5 + rnd() * 0.55,
    tint: [0.9 + rnd() * 0.2, 0.95 + rnd() * 0.12, 0.9 + rnd() * 0.16],
  }));
  const shrubMat = toon({ vcolors: true, sway: true, itint: true, swayAmp: 0.035, swayTop: 1.4, rim: 0.16 });
  if (shrubTransforms.length) group.add(makeInstanced(shrubGeo, shrubMat, shrubTransforms, 'shrubs'));

  return { group, counts: { grass: grassTransforms.length, trees: variants.reduce((n, v) => n + v.count, 0) } };
}

/* ─────────────────────────────── small props ────────────────────────────── */

function plainRock(seed) {
  const b = new GeoBuilder(seed);
  b.ico(0.5, '#9a9384', { detail: 0, scale: [1, 0.72, 1.1], jitter: 0.14 });
  b.ico(0.3, '#8b8475', { detail: 0, pos: [0.34, 0.06, 0.2], scale: [1, 0.8, 1], jitter: 0.14 });
  return b.build();
}

function shrub(seed) {
  const b = new GeoBuilder(seed);
  b.blob(0.52, '#6ba24a', { pos: [0, 0.34, 0], squash: 0.7, jitter: 0.12 });
  b.blob(0.36, '#7cb356', { pos: [0.38, 0.26, 0.12], squash: 0.72, jitter: 0.12 });
  b.blob(0.3, '#5c9440', { pos: [-0.32, 0.28, -0.1], squash: 0.74, jitter: 0.12 });
  return b.build();
}

function hexTint(hex) {
  const c = new Color(hex);
  return [c.r, c.g, c.b];
}
