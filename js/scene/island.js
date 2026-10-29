/**
 * The floating island: meadow top, stratified cliff wall, tapered rock underside.
 *
 * `heightAt(x, z)` is the single source of truth for ground level, so every prop
 * and every blade of grass is seated on the same surface the mesh uses.
 */

import {
  BufferGeometry,
  BufferAttribute,
  IcosahedronGeometry,
  Mesh,
  Group,
  Vector3,
  Color,
} from 'three';

import { toon } from '../core/materials.js';
import { mergeGeos, GeoBuilder } from '../core/geo.js';
import { mulberry32, smoothstep, clamp, lerp } from '../core/util.js';

export const ISLAND = {
  radius: 13.4,
};

export const POND = { x: 4.3, z: 5.1, r: 2.65 };

const rnd = mulberry32(20260419);

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ shape functions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

/** Irregular coastline: three harmonics, so no visible tiling. */
export function edgeRadius(theta) {
  return (
    ISLAND.radius *
    (1 +
      0.052 * Math.sin(theta * 3 + 1.15) +
      0.034 * Math.sin(theta * 5 - 2.4) +
      0.019 * Math.sin(theta * 8 + 0.6) +
      0.012 * Math.sin(theta * 13 + 3.1))
  );
}

/** Ground height in world space. Also used to seat props. */
export function heightAt(x, z) {
  const r = Math.hypot(x, z);
  const theta = Math.atan2(z, x);
  const er = edgeRadius(theta);
  const t = clamp(r / er);

  let h = 0.38;
  h += 0.28 * Math.sin(x * 0.263 + 1.2) * Math.cos(z * 0.231 - 0.7);
  h += 0.15 * Math.sin(x * 0.547 - 0.4) * Math.sin(z * 0.486 + 1.7);
  h += 0.05 * Math.sin(x * 1.13 + 2.2) * Math.sin(z * 0.97 - 1.1);

  // grassy berm just inside the edge â€” the classic floating-island silhouette
  h += Math.exp(-Math.pow((t - 0.858) / 0.062, 2)) * 0.34;

  // roll off toward the rim, then a soft lip
  h -= smoothstep(0.905, 1.0, t) * 0.62;
  h += 0.1 * Math.sin(theta * 6.0 + 0.9) * smoothstep(0.86, 1.0, t);

  // bowl for the pond
  const dp = Math.hypot(x - POND.x, z - POND.z);
  const bowl = 1 - smoothstep(POND.r * 0.35, POND.r * 1.5, dp);
  h -= bowl * 0.92;

  return h;
}

/** Surface normal by central difference â€” used to tilt grass and props. */
export function normalAt(x, z, out = new Vector3()) {
  const e = 0.35;
  const hL = heightAt(x - e, z);
  const hR = heightAt(x + e, z);
  const hD = heightAt(x, z - e);
  const hU = heightAt(x, z + e);
  return out.set(hL - hR, 2 * e, hD - hU).normalize();
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ colour helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const GRASS = ['#a9cf6b', '#8fba55', '#7aab4a', '#659a42', '#55873b'];
const GRASS_RIM = '#4a7a36';
const BANDS = ['#6f9c46', '#5d8a3d', '#b2905f', '#a07c53', '#8d7050', '#8a8272', '#776f61', '#635d54', '#514c46', '#423e39', '#37342f'];

const _c = new Color();
const _a = new Color();
const _b = new Color();

function grassColorAt(x, z, t, out) {
  const n =
    0.5 +
    0.28 * Math.sin(x * 0.72 + 1.9) * Math.cos(z * 0.64 - 0.6) +
    0.16 * Math.sin(x * 1.61 - 0.3) * Math.sin(z * 1.42 + 2.1) +
    0.1 * Math.sin(x * 3.1 + 0.7) * Math.cos(z * 2.7 + 1.3);

  const f = clamp(n) * (GRASS.length - 1);
  const i = Math.min(GRASS.length - 2, Math.floor(f));
  const k = f - i;
  _c.set(GRASS[i]);
  _a.set(GRASS[i + 1]);
  _c.lerp(_a, k);

  // mossier and cooler right at the rim
  const rim = smoothstep(0.83, 1.0, t);
  if (rim > 0) {
    _b.set(GRASS_RIM);
    _c.lerp(_b, rim * 0.8);
  }
  return out.copy(_c);
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ top surface â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const SEGMENTS = 84;
const RINGS = 22;

function buildTopSurface() {
  const vertCount = 1 + RINGS * SEGMENTS;
  const pos = new Float32Array(vertCount * 3);
  const col = new Float32Array(vertCount * 3);
  const idx = [];

  const c = new Color();

  // centre vertex
  pos[0] = 0;
  pos[1] = heightAt(0, 0);
  pos[2] = 0;
  grassColorAt(0, 0, 0, c);
  col[0] = c.r;
  col[1] = c.g;
  col[2] = c.b;

  for (let ri = 0; ri < RINGS; ri++) {
    // bias sample density toward the rim where detail matters
    const rt = (ri + 1) / RINGS;
    const rFactor = Math.pow(rt, 0.86);

    for (let si = 0; si < SEGMENTS; si++) {
      const theta = (si / SEGMENTS) * Math.PI * 2;
      const er = edgeRadius(theta);
      const r = er * rFactor;
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;

      const vi = 1 + ri * SEGMENTS + si;
      pos[vi * 3] = x;
      pos[vi * 3 + 1] = heightAt(x, z);
      pos[vi * 3 + 2] = z;

      grassColorAt(x, z, rFactor, c);
      col[vi * 3] = c.r;
      col[vi * 3 + 1] = c.g;
      col[vi * 3 + 2] = c.b;
    }
  }

  // fan from the centre to the first ring
  for (let si = 0; si < SEGMENTS; si++) {
    const a = 1 + si;
    const b = 1 + ((si + 1) % SEGMENTS);
    idx.push(0, b, a);
  }

  // ring strips
  for (let ri = 0; ri < RINGS - 1; ri++) {
    const base = 1 + ri * SEGMENTS;
    const next = base + SEGMENTS;
    for (let si = 0; si < SEGMENTS; si++) {
      const s2 = (si + 1) % SEGMENTS;
      const a = base + si;
      const b = base + s2;
      const cc = next + si;
      const d = next + s2;
      idx.push(a, d, cc);
      idx.push(a, b, d);
    }
  }

  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('aColor', new BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ cliff wall â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

/** (radiusFactor, yOffset, colour, wobbleStrength) */
const WALL_PROFILE = [
  [1.0, 0.0, '#4a7a36', 0.0],
  [1.0, -0.22, '#3f6c30', 0.01],
  [0.998, -0.5, '#6f9c46', 0.02],
  [0.992, -0.82, '#5d8a3d', 0.025],
  [0.985, -1.15, '#b2905f', 0.03],
  [0.972, -1.55, '#a07c53', 0.035],
  [0.952, -2.0, '#8d7050', 0.04],
  [0.922, -2.5, '#8a8272', 0.05],
  [0.882, -3.05, '#776f61', 0.06],
  [0.826, -3.65, '#635d54', 0.07],
  [0.752, -4.3, '#514c46', 0.08],
  [0.656, -5.0, '#423e39', 0.09],
  [0.542, -5.75, '#37342f', 0.1],
  [0.412, -6.5, '#302d29', 0.11],
  [0.272, -7.2, '#2a2724', 0.12],
  [0.138, -7.85, '#242220', 0.13],
];

function buildWall() {
  const segs = SEGMENTS;
  const rings = WALL_PROFILE.length;
  const verts = [];

  const rndW = mulberry32(991);

  for (let ri = 0; ri < rings; ri++) {
    const [rf, yOff, hex, wob] = WALL_PROFILE[ri];
    const ring = [];
    for (let si = 0; si < segs; si++) {
      const theta = (si / segs) * Math.PI * 2;
      const er = edgeRadius(theta);

      // vertical ridges that get stronger toward the bottom
      const ridge =
        1 +
        wob * (Math.sin(theta * 7 + ri * 1.31) * 0.8 + Math.sin(theta * 11 - ri * 2.07) * 0.45 + Math.sin(theta * 17 + ri) * 0.25);

      const r = er * rf * ridge;
      const baseY = heightAt(Math.cos(theta) * er, Math.sin(theta) * er);
      const y = baseY + yOff + Math.sin(theta * 5 + ri * 1.7) * yOff * 0.06;

      ring.push([Math.cos(theta) * r, y, Math.sin(theta) * r, hex]);
    }
    verts.push(ring);
  }

  const positions = [];
  const colors = [];
  const color = new Color();

  for (let ri = 0; ri < rings - 1; ri++) {
    for (let si = 0; si < segs; si++) {
      const s2 = (si + 1) % segs;
      const a = verts[ri][si];
      const b = verts[ri][s2];
      const c = verts[ri + 1][s2];
      const d = verts[ri + 1][si];

      for (const tri of [
        [a, b, c],
        [a, c, d],
      ]) {
        for (const p of tri) {
          positions.push(p[0], p[1], p[2]);
          color.set(p[3]);
          // loose per-face shading variation keeps the rock from banding flatly
          const j = 0.93 + rndW() * 0.14;
          colors.push(color.r * j, color.g * j, color.b * j);
        }
      }
    }
  }

  // taper to a point
  const last = verts[rings - 1];
  let cx = 0;
  let cy = 0;
  let cz = 0;
  for (const p of last) {
    cx += p[0];
    cy += p[1];
    cz += p[2];
  }
  cx /= segs;
  cy /= segs;
  cz /= segs;
  const tip = [cx - 0.5, cy - 1.5, cz + 0.4];

  for (let si = 0; si < segs; si++) {
    const s2 = (si + 1) % segs;
    const a = last[si];
    const b = last[s2];
    for (const p of [a, b, tip]) {
      positions.push(p[0], p[1], p[2]);
      color.set(p === tip ? '#211f1d' : p[3]);
      colors.push(color.r, color.g, color.b);
    }
  }

  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  g.setAttribute('aColor', new BufferAttribute(new Float32Array(colors), 3));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ dangling rock spikes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function buildRoots() {
  const b = new GeoBuilder(4242);
  const rocks = ['#4b4640', '#413d38', '#39362f', '#332f2b'];

  for (let i = 0; i < 8; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 2.2 + rnd() * 5.6;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const y = -3.6 - rnd() * 2.8;
    const s = 0.5 + rnd() * 1.15;
    b.add(new IcosahedronGeometry(s, 0), rocks[i % rocks.length], {
      pos: [x, y, z],
      rot: [rnd() * 3, rnd() * 3, rnd() * 3],
      scale: [1, 1.7 + rnd(), 1],
      flat: true,
    });
  }
  return b.build();
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ assembly â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export function createIsland() {
  const group = new Group();
  group.name = 'island';

  const topGeo = buildTopSurface();
  const topMat = toon({ vcolors: true, rim: 0.1 });
  const top = new Mesh(topGeo, topMat);
  top.name = 'meadow';
  top.receiveShadow = false;
  group.add(top);

  const wallGeo = buildWall();
  const wallMat = toon({ vcolors: true, rim: 0.2 });
  const wall = new Mesh(wallGeo, wallMat);
  wall.name = 'cliff';
  group.add(wall);

  const rootsGeo = buildRoots();
  const roots = new Mesh(rootsGeo, toon({ vcolors: true, rim: 0.12 }));
  roots.name = 'roots';
  group.add(roots);

  return { group, top, wall, roots };
}
