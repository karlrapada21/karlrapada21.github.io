/**
 * Hand-built props: the cottage, the windmill, the mailbox, the signpost grove,
 * paper lanterns, a stone lantern, a bench, a tiny villager, and the stone path.
 *
 * Each prop is baked into as few meshes as possible. Anything that animates or
 * glows gets its own mesh; everything else disappears into a merged blob.
 */

import {
  Group,
  Mesh,
  CanvasTexture,
  SRGBColorSpace,
  LinearFilter,
  PlaneGeometry,
} from 'three';

import { toon } from '../core/materials.js';
import { GeoBuilder } from '../core/geo.js';
import { makeInstanced } from '../core/instanced.js';
import { palette } from '../core/palette.js';
import { mulberry32 } from '../core/util.js';
import { heightAt, POND } from './island.js';
import { LAYOUT, PATH_POINTS, LANTERNS, WATER_LEVEL } from './layout.js';

const rnd = mulberry32(606060);

const mesh = (geo, mat, name) => {
  const m = new Mesh(geo, mat);
  m.name = name;
  return m;
};

/* ───────────────────────────────── cottage ──────────────────────────────── */

const HOUSE_W = 3.5;
const HOUSE_H = 1.95;
const HOUSE_D = 2.9;

function buildHouseGroup() {
  const group = new Group();
  group.name = 'cottage';

  const b = new GeoBuilder(1001);
  const base = 0.44;

  // stone footing
  b.box(HOUSE_W + 0.3, 0.44, HOUSE_D + 0.3, '#a39a8a', { pos: [0, 0.22, 0], flat: true });
  b.box(HOUSE_W + 0.36, 0.1, HOUSE_D + 0.36, '#8f8779', { pos: [0, 0.05, 0], flat: true });

  // stucco walls
  b.box(HOUSE_W, HOUSE_H, HOUSE_D, '#f6ecd8', { pos: [0, base + HOUSE_H / 2, 0] });

  // half-timbering
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      b.box(0.17, HOUSE_H, 0.17, '#6d4c34', {
        pos: [sx * (HOUSE_W / 2 - 0.03), base + HOUSE_H / 2, sz * (HOUSE_D / 2 - 0.03)],
      });
    }
  }
  b.box(HOUSE_W + 0.06, 0.15, HOUSE_D + 0.06, '#7a5539', { pos: [0, base + HOUSE_H - 0.03, 0] });
  b.box(HOUSE_W + 0.06, 0.12, HOUSE_D + 0.06, '#7a5539', { pos: [0, base + 0.06, 0] });
  // a diagonal brace on the facade
  b.box(0.13, 1.1, 0.1, '#6d4c34', { pos: [-1.28, base + 1.1, HOUSE_D / 2 + 0.01], rot: [0, 0, 0.62] });

  // gable roof (prism, ridge along Z)
  b.prism(HOUSE_W + 0.85, 1.62, HOUSE_D + 0.7, '#c06a4e', { pos: [0, base + HOUSE_H - 0.04, 0] });
  b.box(0.24, 0.18, HOUSE_D + 0.78, '#8c4433', { pos: [0, base + HOUSE_H + 1.62 - 0.05, 0] });
  // eave boards
  for (const sx of [-1, 1]) {
    b.box(0.12, 0.2, HOUSE_D + 0.72, '#a4533a', {
      pos: [sx * (HOUSE_W / 2 + 0.36), base + HOUSE_H + 0.12, 0],
    });
  }

  // chimney
  b.box(0.44, 1.15, 0.44, '#b0a392', { pos: [1.05, base + HOUSE_H + 0.95, -0.62], flat: true });
  b.box(0.56, 0.14, 0.56, '#8d8172', { pos: [1.05, base + HOUSE_H + 1.52, -0.62] });

  // door
  b.box(0.9, 1.5, 0.12, '#8a5a3b', { pos: [-0.4, base + 0.75, HOUSE_D / 2 + 0.02] });
  b.box(1.02, 0.14, 0.14, '#6d4c34', { pos: [-0.4, base + 1.53, HOUSE_D / 2 + 0.04] });
  b.sphere(0.045, '#e8b53f', { pos: [-0.12, base + 0.75, HOUSE_D / 2 + 0.09], wSeg: 6, hSeg: 5 });

  // window frames (glass lives on the emissive mesh)
  for (const wx of [0.95, -1.5]) {
    b.box(0.78, 0.78, 0.1, '#6d4c34', { pos: [wx, base + 1.35, HOUSE_D / 2 + 0.01] });
    b.box(0.1, 0.72, 0.06, '#6d4c34', { pos: [wx, base + 1.35, HOUSE_D / 2 + 0.07] });
    b.box(0.72, 0.1, 0.06, '#6d4c34', { pos: [wx, base + 1.35, HOUSE_D / 2 + 0.07] });
  }
  // side window
  b.box(0.1, 0.72, 0.72, '#6d4c34', { pos: [HOUSE_W / 2 + 0.01, base + 1.3, 0.3] });

  // porch
  b.box(2.9, 0.16, 0.95, '#a97d55', { pos: [-0.3, base - 0.02, HOUSE_D / 2 + 0.55], flat: true });
  for (const px of [-1.5, 0.9]) {
    b.cyl(0.065, 0.075, 1.5, 6, '#8a6344', { pos: [px, base + 0.73, HOUSE_D / 2 + 0.9] });
  }
  b.box(3.0, 0.14, 1.15, '#b5644a', { pos: [-0.3, base + 1.55, HOUSE_D / 2 + 0.5], rot: [0.19, 0, 0] });
  b.box(2.9, 0.1, 0.1, '#a4533a', { pos: [-0.3, base + 1.42, HOUSE_D / 2 + 1.02] });

  group.add(mesh(b.build(), toon({ vcolors: true, rim: 0.17 }), 'cottage-body'));

  // glowing panes
  const gb = new GeoBuilder(1002);
  for (const wx of [0.95, -1.5]) {
    gb.box(0.66, 0.66, 0.05, '#ffe3ab', { pos: [wx, base + 1.35, HOUSE_D / 2 + 0.03] });
  }
  gb.box(0.05, 0.6, 0.6, '#ffe3ab', { pos: [HOUSE_W / 2 + 0.03, base + 1.3, 0.3] });
  // porch lamp
  gb.blob(0.13, '#ffe6b8', { pos: [-0.4, base + 1.86, HOUSE_D / 2 + 0.2], squash: 1.1, wSeg: 8, hSeg: 6 });

  const glowMat = toon({ vcolors: true, emissive: 0, rim: 0.05 });
  const glow = mesh(gb.build(), glowMat, 'cottage-glow');
  group.add(glow);

  return { group, glowMat };
}

/* ──────────────────────────────── windmill ──────────────────────────────── */

function buildWindmillGroup() {
  const group = new Group();
  group.name = 'windmill';

  const b = new GeoBuilder(2002);
  b.cyl(1.5, 1.55, 0.5, 12, '#a39a8a', { pos: [0, 0.25, 0], flat: true });
  b.cyl(0.92, 1.32, 4.15, 12, '#f0e4cc', { pos: [0, 2.5, 0] });
  // banding
  b.cyl(1.28, 1.3, 0.13, 12, '#cdbc98', { pos: [0, 1.1, 0] });
  b.cyl(1.12, 1.14, 0.13, 12, '#cdbc98', { pos: [0, 2.6, 0] });
  b.cyl(0.99, 1.01, 0.13, 12, '#cdbc98', { pos: [0, 3.7, 0] });
  // cap
  b.cone(1.12, 1.35, 12, '#b5644a', { pos: [0, 5.25, 0], flat: true });
  b.cyl(0.11, 0.11, 0.4, 6, '#7a5539', { pos: [0, 6.05, 0] });
  // door + window
  b.box(0.72, 1.25, 0.14, '#8a5a3b', { pos: [0, 0.95, 1.22], rot: [-0.18, 0, 0] });
  b.box(0.42, 0.42, 0.1, '#6d4c34', { pos: [0, 3.2, 1.02] });
  // little awning
  b.prism(1.0, 0.3, 0.5, '#b5644a', { pos: [0, 1.72, 1.25], rot: [0, 0, 0] });

  group.add(mesh(b.build(), toon({ vcolors: true, rim: 0.18 }), 'windmill-tower'));

  // blades
  const bb = new GeoBuilder(2003);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const rot = a - Math.PI / 2;

    bb.box(0.09, 2.45, 0.09, '#7a5539', { pos: [ca * 1.28, sa * 1.28, 0], rot: [0, 0, rot] });
    // sail
    bb.box(0.62, 1.5, 0.05, '#f6ecd8', { pos: [ca * 1.72, sa * 1.72, 0.03], rot: [0, 0, rot], flat: true });
    // slats
    for (let s = 0; s < 3; s++) {
      bb.box(0.66, 0.05, 0.04, '#cfb894', {
        pos: [ca * (1.15 + s * 0.48), sa * (1.15 + s * 0.48), 0.05],
        rot: [0, 0, rot],
      });
    }
  }
  bb.cyl(0.16, 0.16, 0.3, 8, '#6d4c34', { pos: [0, 0, 0.02], rot: [Math.PI / 2, 0, 0] });

  const blades = mesh(bb.build(), toon({ vcolors: true, rim: 0.15 }), 'windmill-blades');
  blades.position.set(0, 4.35, 1.08);
  group.add(blades);

  // glowing window
  const gb = new GeoBuilder(2004);
  gb.box(0.32, 0.32, 0.05, '#ffe3ab', { pos: [0, 3.2, 1.08] });
  const glowMat = toon({ vcolors: true, emissive: 0, rim: 0.05 });
  group.add(mesh(gb.build(), glowMat, 'windmill-glow'));

  return { group, blades, glowMat };
}

/* ──────────────────────────────── mailbox ───────────────────────────────── */

function buildMailbox() {
  const b = new GeoBuilder(3001);
  b.cyl(0.07, 0.1, 1.0, 6, '#8a6344', { pos: [0, 0.5, 0] });
  b.box(0.42, 0.32, 0.6, '#e0756c', { pos: [0, 1.15, 0] });
  b.cyl(0.21, 0.21, 0.6, 10, '#e0756c', { pos: [0, 1.31, 0], rot: [Math.PI / 2, 0, 0] });
  b.box(0.3, 0.16, 0.04, '#fdf5e6', { pos: [0, 1.16, 0.315] });
  b.box(0.05, 0.26, 0.1, '#e8b53f', { pos: [0.24, 1.3, 0] });
  b.box(0.34, 0.06, 0.06, '#b8574f', { pos: [0, 0.98, 0] });
  return b.build();
}

/* ─────────────────────────────── signposts ──────────────────────────────── */

const SIGN_texts = ['MARIKINA', 'SINGAPORE', 'SINCE 2024', 'REMOTE'];

function signAtlas() {
  const w = 512;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  ctx.clearRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  SIGN_texts.forEach((text, i) => {
    const rowH = h / SIGN_texts.length;
    const cy = i * rowH + rowH / 2;
    ctx.font = '700 34px "Baloo 2", Nunito, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(58, 38, 22, 0.92)';
    ctx.fillText(text, w / 2, cy);
    ctx.fillStyle = 'rgba(255, 250, 235, 0.55)';
    ctx.fillText(text, w / 2, cy + 2);
    ctx.fillStyle = 'rgba(58, 38, 22, 0.92)';
    ctx.fillText(text, w / 2, cy);
  });

  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

function buildSignposts() {
  const group = new Group();
  group.name = 'signposts';

  const planks = [
    { y: 1.72, rot: 0.12, w: 1.25 },
    { y: 1.3, rot: -0.36, w: 1.25 },
    { y: 0.92, rot: 0.3, w: 1.25 },
    { y: 0.56, rot: -0.14, w: 1.25 },
  ];

  const b = new GeoBuilder(3002);
  // posts
  b.cyl(0.075, 0.1, 2.1, 6, '#8a6344', { pos: [-0.18, 1.05, 0] });
  b.cyl(0.065, 0.09, 1.5, 6, '#7d5a3e', { pos: [0.22, 0.75, 0.16], rot: [0, 0, 0.05] });

  for (const p of planks) {
    b.box(p.w, 0.27, 0.07, '#d0a877', { pos: [0, p.y, 0.09], rot: [0, p.rot, 0], flat: true });
    b.box(p.w + 0.04, 0.05, 0.08, '#b08b5e', { pos: [0, p.y + 0.13, 0.09], rot: [0, p.rot, 0] });
  }
  // a hanging rope + small bell
  b.cyl(0.012, 0.012, 0.42, 4, '#7a5539', { pos: [0.7, 1.5, 0.1] });
  b.sphere(0.08, '#e8b53f', { pos: [0.7, 1.26, 0.1], wSeg: 8, hSeg: 6 });

  group.add(mesh(b.build(), toon({ vcolors: true, rim: 0.16 }), 'signposts-body'));

  // text quads, one merged mesh sharing the atlas
  const tb = new GeoBuilder(3003);
  const atlas = signAtlas();
  const rows = SIGN_texts.length;

  planks.forEach((p, i) => {
    const g = new PlaneGeometry(p.w * 0.94, 0.19);
    const uv = g.attributes.uv;
    const v0 = 1 - (i + 1) / rows;
    const v1 = 1 - i / rows;
    for (let k = 0; k < uv.count; k++) {
      uv.setXY(k, uv.getX(k) * 0.98 + 0.01, v0 + uv.getY(k) * (v1 - v0));
    }
    tb.add(g, '#ffffff', { pos: [0, p.y, 0.128], rot: [0, p.rot, 0] });
  });

  const signMat = toon({ vcolors: true, map: atlas, alphaTest: 0.35, transparent: true, rim: 0 });
  group.add(mesh(tb.build(), signMat, 'signposts-text'));

  return { group, atlas, signMat };
}

/* ──────────────────────────────── lanterns ──────────────────────────────── */

function buildLanterns() {
  const group = new Group();
  group.name = 'lanterns';

  const poles = new GeoBuilder(3004);
  const glows = new GeoBuilder(3005);

  LANTERNS.forEach((l) => {
    const y = heightAt(l.x, l.z);
    poles.cyl(0.055, 0.075, l.h, 6, '#7a5539', { pos: [l.x, y + l.h / 2, l.z] });
    poles.box(0.52, 0.07, 0.07, '#7a5539', { pos: [l.x + 0.22, y + l.h - 0.03, l.z] });
    poles.cyl(0.02, 0.02, 0.14, 4, '#6b4b33', { pos: [l.x + 0.44, y + l.h - 0.1, l.z] });

    glows.blob(0.19, '#ffe0a3', { pos: [l.x + 0.44, y + l.h - 0.34, l.z], squash: 1.14, wSeg: 9, hSeg: 7 });
    glows.cyl(0.11, 0.14, 0.05, 8, '#ffe9c0', { pos: [l.x + 0.44, y + l.h - 0.19, l.z] });
  });

  group.add(mesh(poles.build(), toon({ vcolors: true, rim: 0.15 }), 'lantern-poles'));
  const glowMat = toon({ vcolors: true, emissive: 0, rim: 0.25 });
  group.add(mesh(glows.build(), glowMat, 'lantern-glows'));

  return { group, glowMat };
}

/* ────────────────────────────── stone lantern ──────────────────────────── */

function buildStoneLantern(x, z) {
  const b = new GeoBuilder(3006);
  const y = heightAt(x, z);
  b.cyl(0.17, 0.22, 0.46, 6, '#b0a89a', { pos: [0, y + 0.23, 0], flat: true });
  b.cyl(0.3, 0.26, 0.1, 6, '#a89f90', { pos: [0, y + 0.5, 0], flat: true });
  b.cyl(0.16, 0.16, 0.42, 6, '#b0a89a', { pos: [0, y + 0.74, 0] });
  b.box(0.42, 0.34, 0.42, '#a89f90', { pos: [0, y + 1.12, 0], flat: true });
  b.cone(0.44, 0.26, 6, '#9a9182', { pos: [0, y + 1.42, 0], flat: true });
  b.sphere(0.07, '#8f8779', { pos: [0, y + 1.58, 0], wSeg: 7, hSeg: 5 });
  return b.build();
}

/* ───────────────────────────────── bench ───────────────────────────────── */

function buildBench(x, z, rotY) {
  const b = new GeoBuilder(3007);
  const y = heightAt(x, z);
  b.box(1.25, 0.09, 0.36, '#b08457', { pos: [0, y + 0.46, 0], flat: true });
  b.box(1.25, 0.32, 0.07, '#a1734a', { pos: [0, y + 0.68, -0.17], rot: [-0.12, 0, 0] });
  for (const sx of [-0.48, 0.48]) {
    b.box(0.1, 0.46, 0.3, '#8a6344', { pos: [sx, y + 0.23, 0] });
  }
  const m = mesh(b.build(), toon({ vcolors: true, rim: 0.16 }), 'bench');
  m.position.set(x, 0, z);
  m.rotation.y = rotY;
  return m;
}

/* ─────────────────────────────── villager ───────────────────────────────── */

function buildVillager() {
  const b = new GeoBuilder(3008);

  // legs
  b.cyl(0.055, 0.05, 0.3, 6, '#6b5b4a', { pos: [-0.085, 0.15, 0] });
  b.cyl(0.055, 0.05, 0.3, 6, '#6b5b4a', { pos: [0.085, 0.15, 0] });
  // tunic
  b.cyl(0.19, 0.25, 0.4, 10, '#8fc0d8', { pos: [0, 0.5, 0] });
  b.cyl(0.2, 0.21, 0.1, 10, '#f2e3c8', { pos: [0, 0.72, 0] });
  // arms
  b.cyl(0.055, 0.05, 0.3, 6, '#8fc0d8', { pos: [-0.24, 0.58, 0], rot: [0, 0, 0.3] });
  b.cyl(0.055, 0.05, 0.3, 6, '#8fc0d8', { pos: [0.24, 0.58, 0], rot: [0, 0, -0.3] });
  // hands
  b.sphere(0.048, '#f7d7b8', { pos: [-0.28, 0.42, 0], wSeg: 6, hSeg: 5 });
  b.sphere(0.048, '#f7d7b8', { pos: [0.28, 0.42, 0], wSeg: 6, hSeg: 5 });
  // head
  b.sphere(0.2, '#f7d7b8', { pos: [0, 0.94, 0], wSeg: 12, hSeg: 10 });
  // hair
  b.sphere(0.205, '#4a3728', { pos: [0, 0.98, -0.03], squash: 0.82, wSeg: 12, hSeg: 8 });
  // eyes
  b.sphere(0.024, '#3b2f26', { pos: [-0.068, 0.95, 0.185], wSeg: 6, hSeg: 5 });
  b.sphere(0.024, '#3b2f26', { pos: [0.068, 0.95, 0.185], wSeg: 6, hSeg: 5 });
  // cheeks
  b.sphere(0.036, '#f5b2a0', { pos: [-0.115, 0.9, 0.16], squash: 0.7, wSeg: 6, hSeg: 5 });
  b.sphere(0.036, '#f5b2a0', { pos: [0.115, 0.9, 0.16], squash: 0.7, wSeg: 6, hSeg: 5 });
  // straw hat
  b.cyl(0.33, 0.33, 0.03, 14, '#e8c88a', { pos: [0, 1.09, 0] });
  b.cone(0.2, 0.17, 12, '#f0d79c', { pos: [0, 1.19, 0] });
  b.cyl(0.205, 0.205, 0.045, 12, '#c9a86c', { pos: [0, 1.11, 0] });

  return b.build();
}

/* ───────────────────────────── path & shore ─────────────────────────────── */

function buildPathStones() {
  const transforms = [];
  const step = 0.78;

  for (let i = 0; i < PATH_POINTS.length - 1; i++) {
    const [ax, az] = PATH_POINTS[i];
    const [bx, bz] = PATH_POINTS[i + 1];
    const segLen = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.round(segLen / step));

    for (let k = 0; k < n; k++) {
      const t = (k + rnd() * 0.6) / n;
      const x = ax + (bx - ax) * t + (rnd() - 0.5) * 0.24;
      const z = az + (bz - az) * t + (rnd() - 0.5) * 0.24;
      transforms.push({
        x,
        z,
        y: heightAt(x, z) + 0.015,
        rotY: rnd() * Math.PI,
        scale: 0.16 + rnd() * 0.1,
        sy: 0.42 + rnd() * 0.2,
        tint: [0.94 + rnd() * 0.1, 0.93 + rnd() * 0.1, 0.9 + rnd() * 0.1],
      });
    }
  }

  const gb = new GeoBuilder(3009);
  gb.cyl(1, 1, 0.34, 7, '#b9b2a2', { flat: true, jitter: 0.12 });
  const geo = gb.build();

  const mat = toon({ vcolors: true, itint: true, rim: 0.2 });
  return makeInstanced(geo, mat, transforms, 'path-stones');
}

function buildShore() {
  const b = new GeoBuilder(3010);
  // sandy bank just under the water
  b.cyl(POND.r * 1.34, POND.r * 1.42, 0.5, 28, '#d8c49a', { pos: [0, WATER_LEVEL - 0.34, 0], flat: true });
  b.cyl(POND.r * 1.12, POND.r * 1.3, 0.3, 28, '#c9b189', { pos: [0, WATER_LEVEL - 0.06, 0], flat: true });
  const m = mesh(b.build(), toon({ vcolors: true, rim: 0.1 }), 'shore');
  m.position.set(POND.x, 0, POND.z);
  m.scale.y = 1;
  return m;
}

function buildReeds(count) {
  const transforms = [];
  for (let i = 0; i < count; i++) {
    const a = rnd() * Math.PI * 2;
    const r = POND.r * (1.02 + rnd() * 0.22);
    const x = POND.x + Math.cos(a) * r;
    const z = POND.z + Math.sin(a) * r;
    transforms.push({
      x,
      z,
      y: heightAt(x, z) - 0.05,
      rotY: rnd() * Math.PI,
      scale: 0.7 + rnd() * 0.6,
      tint: [0.9 + rnd() * 0.2, 0.95 + rnd() * 0.1, 0.85 + rnd() * 0.2],
    });
  }

  const gb = new GeoBuilder(3011);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    gb.cyl(0.012, 0.02, 0.75 + (i % 2) * 0.2, 4, '#7f9a52', {
      pos: [Math.cos(a) * 0.07, 0.38, Math.sin(a) * 0.07],
      rot: [Math.sin(a) * 0.14, 0, -Math.cos(a) * 0.14],
    });
  }
  gb.cyl(0.035, 0.03, 0.16, 5, '#8a6a3f', { pos: [0.03, 0.82, 0.02] });

  const mat = toon({ vcolors: true, wind: true, itint: true, windAmp: 0.1, windTop: 0.9, rim: 0.2, doubleSide: true });
  return makeInstanced(gb.build(), mat, transforms, 'reeds');
}

/* ───────────────────────────── floating islets ──────────────────────────── */

function buildIslet(seed, size) {
  const b = new GeoBuilder(seed);
  b.cyl(size, size * 1.15, size * 0.55, 9, '#7cad4e', { pos: [0, 0, 0], flat: true, jitter: 0.1 });
  b.cone(size * 1.1, size * 1.9, 9, '#8d7050', { pos: [0, -size * 0.6, 0], rot: [Math.PI, 0, 0], flat: true });
  b.cyl(size * 0.9, size * 0.62, size * 0.7, 9, '#635d54', { pos: [0, -size * 1.5, 0], flat: true });
  b.cone(size * 0.62, size * 1.2, 9, '#4a4640', { pos: [0, -size * 2.3, 0], rot: [Math.PI, 0, 0], flat: true });

  // a tiny tree on top
  b.cyl(0.05, 0.08, size * 0.7, 5, '#7a5540', { pos: [size * 0.1, size * 0.55, 0] });
  b.blob(size * 0.45, '#7fb350', { pos: [size * 0.1, size * 0.95, 0], squash: 0.85, jitter: 0.12 });
  b.blob(size * 0.3, '#8fc05a', { pos: [size * 0.42, size * 0.8, 0.1], squash: 0.85, jitter: 0.12 });
  return b.build();
}

/* ───────────────────────────────── assembly ─────────────────────────────── */

export function createProps(quality = 'high') {
  const root = new Group();
  root.name = 'props';
  const parts = {};
  const updaters = [];

  /* cottage */
  const house = buildHouseGroup();
  house.group.position.set(LAYOUT.house.x, heightAt(LAYOUT.house.x, LAYOUT.house.z) - 0.12, LAYOUT.house.z);
  house.group.rotation.y = LAYOUT.house.rotY;
  root.add(house.group);
  parts.house = house.group;

  /* windmill */
  const mill = buildWindmillGroup();
  mill.group.position.set(LAYOUT.windmill.x, heightAt(LAYOUT.windmill.x, LAYOUT.windmill.z) - 0.15, LAYOUT.windmill.z);
  mill.group.rotation.y = LAYOUT.windmill.rotY;
  root.add(mill.group);
  parts.windmill = mill.group;
  parts.windmillBlades = mill.blades;

  /* mailbox */
  const mailbox = mesh(buildMailbox(), toon({ vcolors: true, rim: 0.18 }), 'mailbox');
  mailbox.position.set(LAYOUT.mailbox.x, heightAt(LAYOUT.mailbox.x, LAYOUT.mailbox.z) - 0.05, LAYOUT.mailbox.z);
  mailbox.rotation.y = LAYOUT.mailbox.rotY;
  root.add(mailbox);
  parts.mailbox = mailbox;

  /* signposts */
  const signs = buildSignposts();
  signs.group.position.set(LAYOUT.signposts.x, heightAt(LAYOUT.signposts.x, LAYOUT.signposts.z) - 0.06, LAYOUT.signposts.z);
  signs.group.rotation.y = LAYOUT.signposts.rotY;
  root.add(signs.group);
  parts.signposts = signs.group;

  /* lanterns */
  const lanterns = buildLanterns();
  root.add(lanterns.group);
  parts.lanterns = lanterns.group;

  /* stone lantern */
  const stone = mesh(buildStoneLantern(LAYOUT.bell.x, LAYOUT.bell.z), toon({ vcolors: true, rim: 0.2 }), 'stone-lantern');
  root.add(stone);

  /* bench by the pond */
  root.add(buildBench(6.4, 7.6, -0.9));

  /* villager */
  const villager = mesh(buildVillager(), toon({ vcolors: true, rim: 0.2 }), 'villager');
  const vx = LAYOUT.character.x;
  const vz = LAYOUT.character.z;
  const vy = heightAt(vx, vz);
  villager.position.set(vx, vy, vz);
  villager.rotation.y = 0.35;
  root.add(villager);
  parts.villager = villager;

  updaters.push((t) => {
    villager.position.y = vy + Math.sin(t * 1.15) * 0.018;
    villager.rotation.z = Math.sin(t * 0.62) * 0.022;
  });

  /* path, shore, reeds */
  root.add(buildPathStones());
  root.add(buildShore());
  root.add(buildReeds(quality === 'low' ? 22 : 46));

  /* floating islets */
  const islets = new Group();
  islets.name = 'islets';
  const isletSpecs = [
    { seed: 4001, size: 1.5, pos: [17.5, 8.5, -9], spin: 0.055 },
    { seed: 4002, size: 1.05, pos: [-18.5, 12.5, 5.5], spin: -0.04 },
    { seed: 4003, size: 0.85, pos: [7.5, 4.2, 16.5], spin: 0.075 },
  ];
  const isletGroups = [];
  for (const spec of isletSpecs) {
    const g = new Group();
    const m = mesh(buildIslet(spec.seed, spec.size), toon({ vcolors: true, rim: 0.22 }), 'islet');
    g.add(m);
    g.position.set(...spec.pos);
    g.userData = { base: spec.pos.slice(), spin: spec.spin, phase: rnd() * 6.28 };
    islets.add(g);
    isletGroups.push(g);
  }
  root.add(islets);
  parts.islets = islets;

  updaters.push((t) => {
    for (const g of isletGroups) {
      g.position.y = g.userData.base[1] + Math.sin(t * 0.4 + g.userData.phase) * 0.55;
      g.rotation.y += g.userData.spin * 0.016;
    }
  });

  /* windmill blades */
  updaters.push((t, dt) => {
    mill.blades.rotation.z -= dt * 0.55;
  });

  /* palette-driven emissives */
  const glowTargets = [
    { mat: house.glowMat, k: 1.0 },
    { mat: mill.glowMat, k: 0.9 },
    { mat: lanterns.glowMat, k: 1.15 },
  ];

  return {
    group: root,
    parts,
    update(dt, t) {
      const night = palette.windowGlow;
      for (const g of glowTargets) {
        g.mat.uniforms.uEmissive.value = night * g.k;
      }
      for (const fn of updaters) fn(t, dt);
    },
  };
}
