/* ============================================================
   World — ocean, island terrain (pre-rendered once), paths,
   plaza, and the sorted prop layer.
   ============================================================ */

import { TAU, rng, rr, pick, blob } from './core.js';
import {
  WORLD,
  SAND,
  GRASS,
  FOAM,
  PATH_LINES,
  PLAZA,
  PROPS,
} from './layout.js';
import { DRAWERS, PROP_EXTENT } from './props.js';
import { drawRiver, drawBridge, drawBridgeReflection } from './river.js';

/* ---------------- ocean ---------------- */

const OCEAN_BANDS = [];
(() => {
  const rand = rng(4242);
  for (let i = 0; i < 220; i++) {
    OCEAN_BANDS.push({
      x: rr(rand, -200, WORLD.w + 200),
      y: rr(rand, -200, WORLD.h + 200),
      len: rr(rand, 30, 120),
      ph: rand() * TAU,
      sp: rr(rand, 0.3, 0.9),
      a: rr(rand, 0.05, 0.16),
    });
  }
})();

export function drawOcean(ctx, cam, t) {
  const g = ctx.createLinearGradient(0, cam.y - 200, 0, cam.y + cam.h + 200);
  g.addColorStop(0, '#3f9fb0');
  g.addColorStop(0.42, '#4fb3c0');
  g.addColorStop(0.75, '#63c3cb');
  g.addColorStop(1, '#7fd4d6');
  ctx.fillStyle = g;
  ctx.fillRect(cam.x - 240, cam.y - 240, cam.w + 480, cam.h + 480);

  /* broad tonal blooms for a painted feel */
  ctx.save();
  blob(ctx, cam.x + cam.w * 0.2, cam.y + cam.h * 0.15, cam.h * 0.7, '#8fe0dd', 0.22);
  blob(ctx, cam.x + cam.w * 0.85, cam.y + cam.h * 0.8, cam.h * 0.6, '#2f8ea3', 0.16);
  ctx.restore();

  /* drifting wave lines */
  ctx.save();
  ctx.lineCap = 'round';
  for (const b of OCEAN_BANDS) {
    if (
      b.x < cam.x - 160 ||
      b.x > cam.x + cam.w + 160 ||
      b.y < cam.y - 160 ||
      b.y > cam.y + cam.h + 160
    )
      continue;
    const drift = Math.sin(t * b.sp + b.ph) * 18;
    const yo = Math.cos(t * b.sp * 0.7 + b.ph) * 5;
    ctx.strokeStyle = `rgba(255,255,255,${b.a})`;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(b.x + drift, b.y + yo);
    ctx.quadraticCurveTo(b.x + drift + b.len / 2, b.y + yo - 4, b.x + drift + b.len, b.y + yo);
    ctx.stroke();
  }
  ctx.restore();

  /* sun glitter */
  ctx.save();
  for (let i = 0; i < 40; i++) {
    const gx = cam.x + ((i * 137.5) % (cam.w + 120)) - 60;
    const gy = cam.y + ((i * 271.3) % (cam.h + 120)) - 60;
    const a = 0.1 + 0.16 * Math.sin(t * 2 + i * 1.7);
    ctx.fillStyle = `rgba(255,255,255,${Math.max(0, a)})`;
    ctx.beginPath();
    ctx.ellipse(gx, gy, 16, 3, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/* ---------------- island terrain (baked) ---------------- */

let TERRAIN = null;

function polyPath(ctx, poly) {
  ctx.beginPath();
  ctx.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
  ctx.closePath();
}

export function buildTerrain() {
  if (TERRAIN) return TERRAIN;
  const c = document.createElement('canvas');
  c.width = WORLD.w;
  c.height = WORLD.h;
  const ctx = c.getContext('2d');

  /* ---- sand ---- */
  ctx.save();
  polyPath(ctx, SAND);
  ctx.clip();
  const sandGrad = ctx.createLinearGradient(0, 120, 0, WORLD.h);
  sandGrad.addColorStop(0, '#f4e6c8');
  sandGrad.addColorStop(0.5, '#efe0be');
  sandGrad.addColorStop(1, '#e6d4ae');
  ctx.fillStyle = sandGrad;
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);

  const rand = rng(880);
  for (let i = 0; i < 900; i++) {
    const x = rr(rand, 0, WORLD.w);
    const y = rr(rand, 0, WORLD.h);
    ctx.fillStyle = `rgba(214,192,152,${rr(rand, 0.05, 0.16)})`;
    ctx.beginPath();
    ctx.ellipse(x, y, rr(rand, 6, 30), rr(rand, 3, 12), rand() * TAU, 0, TAU);
    ctx.fill();
  }
  for (let i = 0; i < 500; i++) {
    const x = rr(rand, 0, WORLD.w);
    const y = rr(rand, 0, WORLD.h);
    ctx.fillStyle = `rgba(255,250,235,${rr(rand, 0.2, 0.5)})`;
    ctx.beginPath();
    ctx.arc(x, y, rr(rand, 0.8, 2), 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  /* ---- shore foam ---- */
  ctx.save();
  polyPath(ctx, FOAM);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 18;
  ctx.stroke();
  polyPath(ctx, SAND);
  ctx.strokeStyle = 'rgba(255,252,242,0.85)';
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.restore();

  /* ---- grass ---- */
  ctx.save();
  polyPath(ctx, GRASS);
  ctx.clip();
  const grassGrad = ctx.createLinearGradient(300, 200, 1800, WORLD.h);
  grassGrad.addColorStop(0, '#a6d180');
  grassGrad.addColorStop(0.32, '#9ac773');
  grassGrad.addColorStop(0.62, '#8dbd6a');
  grassGrad.addColorStop(1, '#7fb05f');
  ctx.fillStyle = grassGrad;
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);

  /* painted mottling */
  const r2 = rng(1234);
  const greens = ['#b6db92', '#8cbb68', '#a3cf7d', '#79aa5b', '#c0e29c'];
  for (let i = 0; i < 1500; i++) {
    const x = rr(r2, 0, WORLD.w);
    const y = rr(r2, 0, WORLD.h);
    blob(ctx, x, y, rr(r2, 24, 130), pick(r2, greens), rr(r2, 0.06, 0.2));
  }

  /* sun-dappled highlights in the north */
  for (let i = 0; i < 70; i++) {
    const x = rr(r2, 300, 2200);
    const y = rr(r2, 220, 800);
    blob(ctx, x, y, rr(r2, 60, 180), '#d3ecac', rr(r2, 0.06, 0.14));
  }

  /* grass blades */
  for (let i = 0; i < 2600; i++) {
    const x = rr(r2, 0, WORLD.w);
    const y = rr(r2, 0, WORLD.h);
    const h = rr(r2, 4, 11);
    const lean = rr(r2, -3, 3);
    ctx.strokeStyle = r2() < 0.5 ? 'rgba(110,160,88,0.45)' : 'rgba(168,205,130,0.45)';
    ctx.lineWidth = rr(r2, 1.1, 2.1);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + lean * 0.5, y - h * 0.6, x + lean, y - h);
    ctx.stroke();
  }

  /* wildflowers */
  const flowerCols = ['#fff3ab', '#ffd6e2', '#ffffff', '#d8c4f5', '#ffd9a0'];
  for (let i = 0; i < 420; i++) {
    const x = rr(r2, 0, WORLD.w);
    const y = rr(r2, 0, WORLD.h);
    const col = pick(r2, flowerCols);
    ctx.fillStyle = col;
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * 1.8, y + Math.sin(a) * 1.8, 1.6, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(246,196,84,0.9)';
    ctx.beginPath();
    ctx.arc(x, y, 1.1, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  /* ---- grassy rim (cliff lip) ---- */
  ctx.save();
  polyPath(ctx, GRASS);
  ctx.strokeStyle = 'rgba(96,138,74,0.55)';
  ctx.lineWidth = 13;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(184,220,140,0.75)';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();

  /* ---- paths ---- */
  ctx.save();
  polyPath(ctx, GRASS);
  ctx.clip();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  PATH_LINES.forEach((line, idx) => {
    if (line.pts.length < 2) return;
    const drawLine = (width, color, blur = 0) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(line.pts[0].x, line.pts[0].y);
      for (let i = 1; i < line.pts.length; i++) {
        const prev = line.pts[i - 1];
        const cur = line.pts[i];
        const mx = (prev.x + cur.x) / 2;
        const my = (prev.y + cur.y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
      }
      ctx.stroke();
    };
    drawLine(line.w + 16, 'rgba(132,168,104,0.55)');
    drawLine(line.w + 8, 'rgba(198,176,132,0.75)');
    drawLine(line.w, 'rgba(226,207,166,0.95)');
    drawLine(line.w * 0.62, 'rgba(238,223,188,0.9)');
  });
  ctx.restore();

  /* path pebbles */
  ctx.save();
  polyPath(ctx, GRASS);
  ctx.clip();
  const r3 = rng(999);
  for (let i = 0; i < 620; i++) {
    const line = pick(r3, PATH_LINES);
    const pt = pick(r3, line.pts);
    const a = r3() * TAU;
    const rad = r3() * line.w * 0.46;
    const x = pt.x + Math.cos(a) * rad;
    const y = pt.y + Math.sin(a) * rad;
    ctx.fillStyle = r3() < 0.5 ? 'rgba(190,172,138,0.55)' : 'rgba(245,236,214,0.55)';
    ctx.beginPath();
    ctx.ellipse(x, y, rr(r3, 1.2, 3.4), rr(r3, 1, 2.4), rand() * TAU, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  /* ---- plaza ---- */
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(PLAZA.x, PLAZA.y, PLAZA.r, PLAZA.r * 0.94, 0, 0, TAU);
  ctx.clip();
  const pg = ctx.createRadialGradient(PLAZA.x - 60, PLAZA.y - 90, 40, PLAZA.x, PLAZA.y, PLAZA.r);
  pg.addColorStop(0, '#f0e7d2');
  pg.addColorStop(0.6, '#e6dbc2');
  pg.addColorStop(1, '#d9ccb0');
  ctx.fillStyle = pg;
  ctx.beginPath();
  ctx.ellipse(PLAZA.x, PLAZA.y, PLAZA.r, PLAZA.r * 0.94, 0, 0, TAU);
  ctx.fill();

  /* tile rings */
  ctx.strokeStyle = 'rgba(178,164,138,0.5)';
  ctx.lineWidth = 2;
  for (let rBall = 40; rBall < PLAZA.r; rBall += 46) {
    ctx.beginPath();
    ctx.ellipse(PLAZA.x, PLAZA.y, rBall, rBall * 0.94, 0, 0, TAU);
    ctx.stroke();
  }
  const spokes = 24;
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * TAU;
    ctx.beginPath();
    ctx.moveTo(PLAZA.x + Math.cos(a) * 40, PLAZA.y + Math.sin(a) * 37.6);
    ctx.lineTo(PLAZA.x + Math.cos(a) * PLAZA.r, PLAZA.y + Math.sin(a) * PLAZA.r * 0.94);
    ctx.stroke();
  }
  /* stone speckle */
  const r4 = rng(31337);
  for (let i = 0; i < 700; i++) {
    const a = r4() * TAU;
    const rad = Math.sqrt(r4()) * PLAZA.r;
    const x = PLAZA.x + Math.cos(a) * rad;
    const y = PLAZA.y + Math.sin(a) * rad * 0.94;
    ctx.fillStyle = r4() < 0.5 ? 'rgba(255,252,240,0.35)' : 'rgba(160,148,126,0.22)';
    ctx.beginPath();
    ctx.arc(x, y, rr(r4, 0.8, 2.6), 0, TAU);
    ctx.fill();
  }

  /* central medallion */
  const med = ctx.createRadialGradient(PLAZA.x, PLAZA.y, 4, PLAZA.x, PLAZA.y, 90);
  med.addColorStop(0, 'rgba(174,206,152,0.85)');
  med.addColorStop(1, 'rgba(174,206,152,0)');
  ctx.fillStyle = med;
  ctx.beginPath();
  ctx.arc(PLAZA.x, PLAZA.y, 90, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(140,176,120,0.7)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(PLAZA.x, PLAZA.y, 62, 0, TAU);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    ctx.beginPath();
    ctx.ellipse(
      PLAZA.x + Math.cos(a) * 40,
      PLAZA.y + Math.sin(a) * 40,
      12,
      6,
      a,
      0,
      TAU
    );
    ctx.stroke();
  }
  ctx.restore();

  /* plaza rim */
  ctx.save();
  ctx.strokeStyle = 'rgba(168,150,118,0.65)';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.ellipse(PLAZA.x, PLAZA.y, PLAZA.r, PLAZA.r * 0.94, 0, 0, TAU);
  ctx.stroke();
  ctx.restore();

  TERRAIN = c;
  return c;
}

/* ---------------- layered world drawing ---------------- */

export function drawGround(ctx, cam, t) {
  const terrain = buildTerrain();
  ctx.drawImage(terrain, 0, 0);

  /* soft ambient occlusion around the island rim inside the water handled by river/foam */
}

/* props sorted by baseline, drawn between the back and front layers */
export function visibleProps(cam, pad = 240) {
  const out = [];
  for (let i = 0; i < PROPS.length; i++) {
    const p = PROPS[i];
    const ext = PROP_EXTENT[p.type] || 120;
    if (
      p.x + ext < cam.x - pad ||
      p.x - ext > cam.x + cam.w + pad ||
      p.y + 40 < cam.y - pad ||
      p.y - ext * 1.8 > cam.y + cam.h + pad
    )
      continue;
    out.push(p);
  }
  return out;
}

export function drawProp(ctx, p, t, highlight) {
  const fn = DRAWERS[p.type];
  if (!fn) return;
  fn(ctx, p, t, highlight);
}

export { drawRiver, drawBridge, drawBridgeReflection };
