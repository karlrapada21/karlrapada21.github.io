/* ============================================================
   Props (3D) — every object standing on the island.

   Models are assembled from primitives and baked into a couple of
   merged, vertex-coloured meshes. Foliage gets a wind shader so the
   whole forest breathes in one draw call.
   ============================================================ */

import { THREE, GeoBuilder, makeCanvas, canvasTexture, standardMat } from './geo.js';
import { TAU, clamp, rng, rr, pick } from './core.js';
import { PROPS, PODIUM_SPOTS } from './layout.js';
import { toX, toZ, terrainHeight } from './terrain.js';

/* ---------------- palette ---------------- */

const P = {
  barkLight: '#9a6b4a',
  bark: '#8a5f43',
  barkDark: '#6d4832',
  leaf: ['#6fa05a', '#89b96a', '#a9d187', '#5f9b63', '#78a856'],
  pine: ['#4f8460', '#5b9269', '#68a071', '#75ac79'],
  sakura: ['#f3b9c8', '#f8cfda', '#fde5ec', '#eeb0c2'],
  bush: ['#6d9c59', '#84b46c', '#9dcb80'],
  rock: '#a9b0b5',
  wall: '#f6ecd8',
  wallDark: '#e6d8c0',
  timber: '#a3744f',
  roof: '#a9738f',
  roofDark: '#8a5c7e',
  roofLight: '#c08aa8',
  door: '#8b5e3c',
  window: '#bfd9e0',
  windowWarm: '#ffe1a0',
  stone: '#ded5c2',
  stoneDark: '#c9bfa9',
  metal: '#6c7d78',
};

const EMBLEM_TINTS = ['#a8d48a', '#c9b2f0', '#f0c98a', '#f2a9b5', '#a9c9f0', '#f5d98a'];

/* ---------------- wind shader ---------------- */

function windMaterial(amp = 0.16, height = 7) {
  const mat = standardMat({ flatShading: true });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uAmp = { value: amp };
    shader.uniforms.uHeight = { value: height };
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        [
          '#include <common>',
          'uniform float uTime;',
          'uniform float uAmp;',
          'uniform float uHeight;',
          'attribute float aBaseY;',
          'attribute float aPhase;',
        ].join('\n')
      )
      .replace(
        '#include <begin_vertex>',
        [
          '#include <begin_vertex>',
          'float h = max(transformed.y - aBaseY, 0.0);',
          'float w = pow(clamp(h / uHeight, 0.0, 1.0), 1.6);',
          'float s = sin(uTime * 1.15 + aPhase) * 0.7 + sin(uTime * 2.1 + aPhase * 1.7) * 0.3;',
          'transformed.x += s * w * uAmp;',
          'transformed.z += cos(uTime * 0.9 + aPhase * 1.3) * w * uAmp * 0.65;',
        ].join('\n')
      );
    mat.userData.shader = shader;
  };
  mat.customProgramCacheKey = () => 'wind' + amp;
  return mat;
}

/* ---------------- text plate ---------------- */

function textPlate(text, w, h, bg, fg) {
  const c = makeCanvas(256, 128);
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect?.(0, 0, 256, 128, 22);
  if (!ctx.roundRect) ctx.rect(0, 0, 256, 128);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.font = 'bold 42px "Baloo 2", "Quicksand", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 68, 226);
  const tex = canvasTexture(c, { repeat: 1 });
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, transparent: true });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  return mesh;
}

/* ============================================================
   Individual models — built at local origin, base at y = 0
   ============================================================ */

function modelTree(rand, variant) {
  const b = new GeoBuilder(Math.floor(rand() * 1e6));
  const s = 1;
  const h = rr(rand, 2.1, 2.9) * s;
  const lean = rr(rand, -0.09, 0.09);

  /* trunk */
  b.cyl(0.2, 0.34, h, 7, P.bark, 0, h / 2, 0, { rz: lean, flat: true, variance: 0.08 });
  b.cyl(0.34, 0.42, 0.28, 7, P.barkDark, 0, 0.14, 0, { flat: true });

  const pal = P.leaf.concat(P.leaf);
  const c1 = pick(rand, pal);
  const c2 = pick(rand, pal);
  const c3 = pick(rand, pal);

  const topY = h * 0.92;
  const R = rr(rand, 1.5, 2.0);
  const clumps = [
    { x: 0, y: topY + R * 1.05, z: 0, r: R * 1.12, c: c1 },
    { x: -R * 0.85, y: topY + R * 0.55, z: R * 0.3, r: R * 0.78, c: c2 },
    { x: R * 0.8, y: topY + R * 0.62, z: -R * 0.25, r: R * 0.74, c: c2 },
    { x: R * 0.1, y: topY + R * 0.4, z: R * 0.8, r: R * 0.66, c: c3 },
    { x: -R * 0.3, y: topY + R * 1.6, z: -R * 0.2, r: R * 0.62, c: c3 },
  ];
  if (variant % 3 === 1) {
    clumps.push({ x: -R * 0.5, y: topY + R * 0.5, z: -R * 0.75, r: R * 0.6, c: c1 });
  }
  for (const cl of clumps) {
    b.ico(cl.r, cl.c, cl.x, cl.y, cl.z, { detail: 1, variance: 0.09, sy: rr(rand, 0.82, 1) });
  }
  return b;
}

function modelPine(rand) {
  const b = new GeoBuilder(Math.floor(rand() * 1e6));
  const h = rr(rand, 1.7, 2.3);
  b.cyl(0.16, 0.28, h, 6, P.bark, 0, h / 2, 0, { flat: true, variance: 0.08 });
  const layers = [
    { y: h * 0.9, r: 1.5, hh: 1.9, c: P.pine[0] },
    { y: h * 0.9 + 1.15, r: 1.2, hh: 1.6, c: P.pine[1] },
    { y: h * 0.9 + 2.15, r: 0.92, hh: 1.35, c: P.pine[2] },
    { y: h * 0.9 + 3.0, r: 0.62, hh: 1.0, c: P.pine[3] },
  ];
  for (const L of layers) {
    b.cone(L.r, L.hh, 7, L.c, 0, L.y + L.hh / 2, 0, { flat: true, variance: 0.07, ry: rr(rand, 0, TAU) });
  }
  return b;
}

function modelSakura(rand) {
  const b = new GeoBuilder(Math.floor(rand() * 1e6));
  const h = rr(rand, 1.5, 2.1);
  b.cyl(0.18, 0.3, h, 6, '#8d6b57', 0, h / 2, 0, { flat: true, rz: rr(rand, -0.12, 0.12) });
  const R = rr(rand, 1.4, 1.8);
  const topY = h * 0.9;
  const clumps = [
    { x: 0, y: topY + R, z: 0, r: R * 1.1, c: P.sakura[1] },
    { x: -R, y: topY + R * 0.5, z: R * 0.2, r: R * 0.72, c: P.sakura[0] },
    { x: R * 0.95, y: topY + R * 0.55, z: -R * 0.2, r: R * 0.7, c: P.sakura[0] },
    { x: 0, y: topY + R * 1.6, z: 0, r: R * 0.6, c: P.sakura[2] },
  ];
  for (const cl of clumps) {
    b.ico(cl.r, cl.c, cl.x, cl.y, cl.z, { detail: 1, variance: 0.07, sy: rr(rand, 0.8, 0.95) });
  }
  return b;
}

function modelBush(rand) {
  const b = new GeoBuilder(Math.floor(rand() * 1e6));
  const R = rr(rand, 0.55, 0.85);
  b.ico(R, P.bush[0], -R * 0.5, R * 0.75, 0, { detail: 1, variance: 0.08 });
  b.ico(R * 0.85, P.bush[1], R * 0.55, R * 0.7, R * 0.2, { detail: 1, variance: 0.08 });
  b.ico(R * 1.05, P.bush[2], 0, R * 1.15, -R * 0.15, { detail: 1, variance: 0.08 });
  return b;
}

function modelRock(rand) {
  const b = new GeoBuilder(Math.floor(rand() * 1e6));
  const s = rr(rand, 0.7, 1.15);
  b.dodeca(0.75 * s, P.rock, 0, 0.34 * s, 0, { flat: true, variance: 0.12, sy: 0.72, ry: rand() * TAU });
  b.dodeca(0.36 * s, '#bcc2c6', 0.42 * s, 0.22 * s, 0.2 * s, { flat: true, variance: 0.1 });
  b.dodeca(0.26 * s, '#9aa1a6', -0.44 * s, 0.16 * s, -0.24 * s, { flat: true, variance: 0.1 });
  return b;
}

/* ---------- the cottage ---------- */

function modelHouse() {
  const b = new GeoBuilder(4242);
  const W = 5.4; // half width
  const D = 3.6; // half depth
  const H = 3.5; // wall height

  /* stone footing */
  b.box(W * 2 + 0.5, 0.45, D * 2 + 0.5, P.stoneDark, 0, 0.2, 0, { variance: 0.04 });

  /* walls */
  b.box(W * 2, H, D * 2, P.wall, 0, H / 2 + 0.4, 0, { variance: 0.02 });

  /* timber framing */
  const t = P.timber;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      b.box(0.24, H, 0.24, t, sx * (W - 0.12), H / 2 + 0.4, sz * (D - 0.12), { variance: 0.05 });
    }
  }
  b.box(W * 2 + 0.08, 0.2, 0.16, t, 0, H * 0.62 + 0.4, D, { variance: 0.04 });
  b.box(W * 2 + 0.08, 0.2, 0.16, t, 0, H * 0.62 + 0.4, -D, { variance: 0.04 });
  b.box(0.16, 0.2, D * 2, t, W, H * 0.62 + 0.4, 0, { variance: 0.04 });
  b.box(0.16, 0.2, D * 2, t, -W, H * 0.62 + 0.4, 0, { variance: 0.04 });

  /* roof — two slabs meeting at a ridge */
  const ridgeY = H + 3.0;
  const slope = Math.atan2(ridgeY - (H + 0.3), W + 1.0);
  const slopeLen = Math.hypot(W + 1.0, ridgeY - (H + 0.3));
  for (const s of [-1, 1]) {
    b.box(slopeLen, 0.28, D * 2 + 1.5, P.roof, (s * (W + 1.0)) / 2, (ridgeY + H + 0.3) / 2, 0, {
      rz: s * slope,
      variance: 0.03,
    });
  }
  /* ridge cap */
  b.box(0.42, 0.26, D * 2 + 1.6, P.roofLight, 0, ridgeY + 0.08, 0, { variance: 0.03 });

  /* gable end triangles */
  for (const sz of [-1, 1]) {
    const shape = new THREE.Shape();
    shape.moveTo(-W, 0);
    shape.lineTo(W, 0);
    shape.lineTo(0, ridgeY - H - 0.3);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: false });
    b.add(geo, P.wall, 0, H + 0.3, sz * D - (sz < 0 ? 0.16 : 0) * 0, { variance: 0.02 });
  }

  /* chimney */
  b.box(0.78, 2.0, 0.78, '#cf9a7a', W * 0.52, ridgeY - 0.35, -D * 0.35, { variance: 0.05 });
  b.box(0.95, 0.2, 0.95, '#b5855f', W * 0.52, ridgeY + 0.68, -D * 0.35, { variance: 0.04 });

  /* door */
  b.box(1.5, 2.3, 0.18, P.door, 0, 1.55, D + 0.02, { variance: 0.03 });
  b.box(1.18, 2.0, 0.12, '#a2704a', 0, 1.45, D + 0.1, { variance: 0.03 });
  b.sphere(0.09, '#f0c96b', 0.42, 1.35, D + 0.18, { variance: 0 });
  /* step */
  b.box(2.2, 0.22, 0.8, P.stone, 0, 0.11, D + 0.5, { variance: 0.05 });

  /* windows */
  const win = (wx, wy, ww, wh) => {
    b.box(ww, wh, 0.14, P.window, wx, wy, D + 0.04, { variance: 0.02 });
    b.box(ww + 0.2, 0.14, 0.18, P.timber, wx, wy + wh / 2, D + 0.08, { variance: 0.03 });
    b.box(ww + 0.2, 0.14, 0.18, P.timber, wx, wy - wh / 2, D + 0.08, { variance: 0.03 });
    b.box(0.12, wh, 0.18, P.timber, wx - ww / 2, wy, D + 0.08, { variance: 0.03 });
    b.box(0.12, wh, 0.18, P.timber, wx + ww / 2, wy, D + 0.08, { variance: 0.03 });
    b.box(0.07, wh, 0.06, P.timber, wx, wy, D + 0.1, { variance: 0.02 });
    b.box(ww, 0.07, 0.06, P.timber, wx, wy, D + 0.1, { variance: 0.02 });
  };
  win(-W * 0.55, H * 0.72, 1.35, 1.25);
  win(W * 0.62, H * 0.72, 1.35, 1.25);

  /* flower boxes under the windows */
  const box1 = (wx) => {
    b.box(1.6, 0.32, 0.42, '#8b6244', wx, H * 0.72 - 0.92, D + 0.22, { variance: 0.05 });
    for (let i = 0; i < 7; i++) {
      const fx = wx - 0.66 + (i / 6) * 1.32;
      b.ico(0.14, i % 3 === 0 ? '#ff9fb8' : i % 3 === 1 ? '#ffd166' : '#e2a8ff', fx, H * 0.72 - 0.7, D + 0.24, {
        detail: 0,
        variance: 0.08,
      });
      b.ico(0.1, '#7fb265', fx + 0.06, H * 0.72 - 0.82, D + 0.2, { detail: 0, variance: 0.1 });
    }
  };
  box1(-W * 0.55);
  box1(W * 0.62);

  /* side window */
  b.box(0.14, 1.1, 1.2, P.window, W + 0.04, H * 0.72, 0, { variance: 0.02 });
  b.box(0.18, 0.12, 1.35, P.timber, W + 0.08, H * 0.72 + 0.55, 0, { variance: 0.03 });

  /* climbing vines */
  for (let i = 0; i < 5; i++) {
    const vx = -W + 0.5 + i * 0.42;
    for (let k = 0; k < 7; k++) {
      b.ico(0.17, k % 2 ? '#7fb265' : '#95c77a', vx + Math.sin(k) * 0.2, 0.5 + k * 0.5, D + 0.08, {
        detail: 0,
        variance: 0.14,
      });
    }
  }
  return b;
}

/* ---------- windmill ---------- */

function modelWindmill() {
  const b = new GeoBuilder(1717);
  const H = 5.6;
  b.cyl(1.35, 2.0, H, 10, '#efe4d1', 0, H / 2, 0, { flat: true, variance: 0.03 });
  b.cyl(0.9, 1.25, 0.5, 10, '#e3d6c0', 0, 0.25, 0, { flat: true, variance: 0.04 });
  /* cap */
  b.cone(1.75, 1.5, 10, '#c98a72', 0, H + 0.72, 0, { flat: true, variance: 0.04 });
  /* door + window */
  b.box(1.0, 1.7, 0.3, '#8d6244', 0, 0.9, 1.75, { variance: 0.03 });
  b.box(0.7, 0.7, 0.2, P.windowWarm, 0, H * 0.62, 1.55, { variance: 0.02 });
  return b;
}

function modelWindmillSails() {
  const b = new GeoBuilder(99);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU;
    const g = new GeoBuilder(i + 3);
    /* spar */
    g.box(0.14, 3.1, 0.14, '#9b7b5c', 0, 1.65, 0, { variance: 0.03 });
    /* sail cloth */
    g.box(0.06, 2.2, 0.82, '#fdf8ec', 0.11, 1.75, 0.52, { variance: 0.02 });
    for (let k = 0; k < 4; k++) {
      g.box(0.08, 0.06, 0.9, '#b9a992', 0.16, 0.95 + k * 0.55, 0.52, { variance: 0.02 });
    }
    b.add(g.toGeometry(), '#fff', 0, 0, 0, { ry: a });
  }
  b.sphere(0.34, P.metal, 0, 0, 0.1, { variance: 0.02 });
  return b;
}

/* ---------- small decor ---------- */

function modelMailbox() {
  const b = new GeoBuilder(515);
  b.box(0.16, 1.5, 0.16, P.bark, 0, 0.75, 0, { variance: 0.05 });
  b.box(0.75, 0.5, 0.55, '#e2705f', 0, 1.62, 0, { variance: 0.03 });
  b.cyl(0.28, 0.28, 0.75, 10, '#e2705f', 0, 1.88, 0, { rz: Math.PI / 2, variance: 0.02 });
  b.box(0.6, 0.1, 0.5, '#c9584a', 0, 1.95, 0, { variance: 0.03 });
  b.box(0.1, 0.5, 0.03, '#f2c94c', 0.42, 1.9, 0.22, { variance: 0.03 });
  return b;
}

function modelSignpost() {
  const b = new GeoBuilder(616);
  b.box(0.2, 2.1, 0.2, '#9a7051', 0, 1.05, 0, { variance: 0.04 });
  b.box(1.6, 0.6, 0.16, '#d9b78c', 0, 1.85, 0.06, { variance: 0.03 });
  b.cone(0.3, 0.4, 4, '#d9b78c', 0.85, 1.85, 0.06, { rz: -Math.PI / 2, variance: 0.03 });
  return b;
}

function modelBench() {
  const b = new GeoBuilder(717);
  for (const s of [-1, 1]) {
    b.box(0.16, 0.6, 0.5, '#8a6244', s * 0.72, 0.3, 0, { variance: 0.04 });
  }
  b.box(1.9, 0.16, 0.62, '#c28f5e', 0, 0.66, 0, { variance: 0.03 });
  b.box(1.9, 0.14, 0.42, '#a8784d', 0, 1.02, -0.24, { variance: 0.03 });
  b.box(1.9, 0.14, 0.42, '#b28355', 0, 0.84, -0.28, { variance: 0.03 });
  for (const s of [-1, 1]) {
    b.box(0.14, 0.55, 0.14, '#8a6244', s * 0.72, 0.85, -0.26, { variance: 0.04 });
  }
  return b;
}

function modelLamp() {
  const b = new GeoBuilder(818);
  b.cyl(0.28, 0.34, 0.2, 8, P.metal, 0, 0.1, 0, { flat: true, variance: 0.04 });
  b.cyl(0.1, 0.13, 2.7, 8, P.metal, 0, 1.4, 0, { flat: true, variance: 0.04 });
  b.cyl(0.3, 0.18, 0.22, 8, P.metal, 0, 2.72, 0, { flat: true, variance: 0.04 });
  b.sphere(0.32, '#fff4c9', 0, 2.95, 0, { ws: 12, hs: 10, variance: 0 });
  b.cyl(0.16, 0.3, 0.18, 8, P.metal, 0, 3.28, 0, { flat: true, variance: 0.04 });
  return b;
}

function modelGarden(rand) {
  const b = new GeoBuilder(919);
  b.box(8.0, 0.36, 1.5, '#7e5a3e', 0, 0.18, 0, { variance: 0.04 });
  b.box(7.7, 0.2, 1.3, '#96704e', 0, 0.4, 0, { variance: 0.04 });
  for (let i = 0; i < 9; i++) {
    const gx = -3.4 + i * 0.85;
    for (let k = 0; k < 3; k++) {
      const a = -Math.PI / 2 + (k - 1) * 0.7;
      b.cone(0.16, 0.5, 4, '#79b06a', gx + Math.cos(a) * 0.2, 0.72, Math.sin(a) * 0.2, {
        rz: Math.cos(a) * 0.7,
        rx: -Math.sin(a) * 0.7,
        variance: 0.1,
      });
    }
    b.sphere(0.26, '#efe6d8', gx, 0.55, 0, { ws: 9, hs: 7, variance: 0.03, sy: 0.9 });
    b.sphere(0.1, '#c8969f', gx - 0.1, 0.62, 0.14, { ws: 6, hs: 5, variance: 0 });
  }
  return b;
}

function modelTent() {
  const b = new GeoBuilder(1212);
  b.cone(1.6, 3.0, 4, '#f2d9a8', 0, 1.5, 0, { ry: Math.PI / 4, variance: 0.03, flat: true });
  b.cone(1.62, 3.05, 4, '#e7cfa0', 0, 1.48, 0, { ry: Math.PI / 4, variance: 0.02, flat: true });
  b.box(0.95, 1.5, 0.1, '#7d5a44', 0, 0.75, 1.28, { variance: 0.03 });
  b.box(0.62, 1.1, 0.08, '#e7b06f', 0, 0.55, 1.33, { variance: 0.03 });
  b.cyl(0.06, 0.06, 0.7, 6, '#a67c52', 0, 3.15, 0, { flat: true });
  return b;
}

function modelFlowerbed(rand) {
  const b = new GeoBuilder(1313);
  b.box(3.4, 0.3, 1.1, '#78563c', 0, 0.15, 0, { variance: 0.05 });
  const cols = ['#fff1a8', '#ffc9d9', '#c9b6ff', '#ffd59e', '#ffffff'];
  for (let i = 0; i < 26; i++) {
    const x = rr(rand, -1.55, 1.55);
    const z = rr(rand, -0.42, 0.42);
    const h = rr(rand, 0.3, 0.62);
    b.cyl(0.03, 0.04, h, 4, '#7aa85c', x, 0.25 + h / 2, z, { flat: true });
    b.ico(0.12, pick(rand, cols), x, 0.28 + h, z, { detail: 0, variance: 0.12 });
  }
  return b;
}

/* ---------- podium ---------- */

function modelPodium(spot) {
  const b = new GeoBuilder(1400 + spot.index);
  /* stone base */
  b.cyl(1.05, 1.18, 0.2, 12, P.stoneDark, 0, 0.1, 0, { flat: true, variance: 0.05 });
  b.box(1.35, 1.5, 1.35, P.stone, 0, 0.95, 0, { variance: 0.03 });
  b.box(1.55, 0.16, 1.55, '#ece3d0', 0, 1.78, 0, { variance: 0.03 });
  /* carved band */
  b.box(1.4, 0.12, 1.4, P.stoneDark, 0, 0.42, 0, { variance: 0.04 });
  /* little plinth under the emblem */
  b.cyl(0.26, 0.34, 0.3, 8, '#ece3d0', 0, 1.98, 0, { flat: true, variance: 0.03 });
  return b;
}

/* ============================================================
   Scene assembly
   ============================================================ */

export function buildProps(scene) {
  const rand = rng(20260401);

  const staticB = new GeoBuilder(11);
  const windB = new GeoBuilder(12);
  const animated = [];
  const tickers = [];

  /* ---- walk every prop ---- */
  for (const p of PROPS) {
    const gx = toX(p.x);
    const gz = toZ(p.y);
    const gy = terrainHeight(p.x, p.y);
    const face = (rand() - 0.5) * 1.4;
    const sc = clamp(p.scale ?? 1, 0.7, 1.3);

    switch (p.type) {
      case 'tree':
      case 'pine':
      case 'sakura':
      case 'bush': {
        const model =
          p.type === 'tree'
            ? modelTree(rand, p.variant)
            : p.type === 'pine'
            ? modelPine(rand)
            : p.type === 'sakura'
            ? modelSakura(rand)
            : modelBush(rand);
        windB.setWind(gy, rand() * TAU);
        windB.add(model.toGeometry(), '#fff', gx, gy, gz, { ry: face * 2, scale: sc });
        break;
      }
      case 'rock': {
        staticB.add(modelRock(rand).toGeometry(), '#fff', gx, gy, gz, { ry: face, scale: sc });
        break;
      }
      case 'flowerbed': {
        staticB.add(modelFlowerbed(rand).toGeometry(), '#fff', gx, gy, gz, { ry: face, scale: sc });
        break;
      }
      case 'house': {
        staticB.add(modelHouse().toGeometry(), '#fff', gx, gy, gz, { ry: 0, scale: 1 });
        break;
      }
      case 'windmill': {
        staticB.add(modelWindmill().toGeometry(), '#fff', gx, gy, gz, { ry: 0, scale: 1 });
        const sails = new THREE.Mesh(
          modelWindmillSails().toGeometry(),
          standardMat({ flatShading: true })
        );
        sails.position.set(gx, gy + 7.0, gz + 1.2);
        sails.castShadow = true;
        scene.add(sails);
        animated.push(sails);
        tickers.push((t) => {
          sails.rotation.z = -t * 0.55;
        });
        break;
      }
      case 'mailbox': {
        staticB.add(modelMailbox().toGeometry(), '#fff', gx, gy, gz, { ry: face });
        break;
      }
      case 'signpost': {
        staticB.add(modelSignpost().toGeometry(), '#fff', gx, gy, gz, { ry: -0.5, scale: 1 });
        const plate = textPlate(p.text ?? 'Isle', 1.35, 0.5, '#f4e3c4', '#6b5233');
        plate.position.set(gx + 0.42, gy + 1.86, gz + 0.14);
        plate.rotation.y = -0.5;
        scene.add(plate);
        break;
      }
      case 'bench': {
        staticB.add(modelBench().toGeometry(), '#fff', gx, gy, gz, {
          ry: p.flip ? -0.35 : 0.35,
          scale: 1,
        });
        break;
      }
      case 'lamp': {
        staticB.add(modelLamp().toGeometry(), '#fff', gx, gy, gz, { scale: 1 });
        const glow = new THREE.Mesh(
          new THREE.SphereGeometry(0.55, 10, 8),
          new THREE.MeshBasicMaterial({ color: 0xfff0b8, transparent: true, opacity: 0.34 })
        );
        glow.position.set(gx, gy + 2.95, gz);
        scene.add(glow);
        tickers.push((t) => {
          glow.scale.setScalar(1 + Math.sin(t * 1.7 + gx) * 0.06);
          glow.material.opacity = 0.28 + Math.sin(t * 1.5 + gx) * 0.05;
        });
        break;
      }
      case 'garden': {
        staticB.add(modelGarden(rand).toGeometry(), '#fff', gx, gy, gz, { ry: 0, scale: 1 });
        break;
      }
      case 'tent': {
        staticB.add(modelTent().toGeometry(), '#fff', gx, gy, gz, { ry: face, scale: 1 });
        break;
      }
      case 'podium': {
        staticB.add(modelPodium(p.podium).toGeometry(), '#fff', gx, gy, gz, { ry: p.angle + Math.PI / 2, scale: 1 });
        break;
      }
      default:
        break;
    }
  }

  /* ---- podiums: plinths, emblems, labels ---- */
  PODIUM_SPOTS.forEach((spot) => {
    const gx = toX(spot.x);
    const gz = toZ(spot.y);
    const gy = terrainHeight(spot.x, spot.y);
    const tint = EMBLEM_TINTS[spot.index % EMBLEM_TINTS.length];

    const emblem = new THREE.Group();
    emblem.position.set(gx, gy + 2.6, gz);

    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.52, 20, 16),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(tint),
        emissive: new THREE.Color(tint),
        emissiveIntensity: 0.55,
        roughness: 0.35,
        metalness: 0,
      })
    );
    orb.castShadow = true;
    emblem.add(orb);

    const icon = new THREE.Mesh(
      iconGeometry(spot.icon),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.35,
        roughness: 0.6,
      })
    );
    icon.scale.setScalar(0.42);
    icon.position.z = 0.44;
    emblem.add(icon);

    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.85, 14, 10),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(tint), transparent: true, opacity: 0.14 })
    );
    emblem.add(halo);

    scene.add(emblem);

    const plate = textPlate(spot.hint.toUpperCase(), 1.05, 0.4, '#fffaf0', '#5b6b58');
    plate.position.set(gx, gy + 1.34, gz + 0.72);
    plate.rotation.y = 0;
    scene.add(plate);

    const base = spot.index;
    tickers.push((t) => {
      const bob = Math.sin(t * 1.5 + base * 1.3) * 0.13;
      emblem.position.y = gy + 2.6 + bob;
      emblem.rotation.y = t * 0.5 + base;
      halo.scale.setScalar(1 + Math.sin(t * 2 + base) * 0.07);
    });
  });

  /* ---- merge into meshes ---- */
  const staticMesh = new THREE.Mesh(staticB.toGeometry(), standardMat({ flatShading: false }));
  staticMesh.castShadow = true;
  staticMesh.receiveShadow = true;
  staticMesh.name = 'props-static';
  scene.add(staticMesh);

  const windMat = windMaterial(0.19, 7.5);
  const windMesh = new THREE.Mesh(windB.toGeometry(), windMat);
  windMesh.castShadow = true;
  windMesh.receiveShadow = true;
  windMesh.name = 'props-foliage';
  scene.add(windMesh);

  return {
    staticMesh,
    windMesh,
    update(t) {
      for (const fn of tickers) fn(t);
      if (windMat.userData.shader) windMat.userData.shader.uniforms.uTime.value = t;
    },
    stats: {
      staticVerts: staticB.vertexCount,
      foliageVerts: windB.vertexCount,
      animated: animated.length,
    },
  };
}

/* ---------------- 3D icon shapes ---------------- */

function iconGeometry(icon) {
  switch (icon) {
    case 'leaf': {
      const s = new THREE.SphereGeometry(0.5, 10, 8);
      s.scale(1, 1.35, 0.34);
      return s;
    }
    case 'gem':
      return new THREE.OctahedronGeometry(0.5, 0);
    case 'book':
      return new THREE.BoxGeometry(0.72, 0.52, 0.16);
    case 'star': {
      const shape = new THREE.Shape();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i / 10) * TAU;
        const r = i % 2 ? 0.21 : 0.52;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) shape.moveTo(px, py);
        else shape.lineTo(px, py);
      }
      shape.closePath();
      return new THREE.ExtrudeGeometry(shape, { depth: 0.14, bevelEnabled: false });
    }
    case 'cap': {
      const g = new THREE.BufferGeometry();
      const cap = new THREE.IcosahedronGeometry(0.42, 0);
      cap.scale(1.25, 0.5, 1.25);
      return cap;
    }
    case 'mail': {
      const g = new THREE.BoxGeometry(0.75, 0.55, 0.14);
      return g;
    }
    default:
      return new THREE.SphereGeometry(0.42, 10, 8);
  }
}
