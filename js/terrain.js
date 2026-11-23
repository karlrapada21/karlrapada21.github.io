/* ============================================================
   Terrain — the island itself: heightfield, painted ground,
   ocean, sky, and the flowing river.
   ============================================================ */

import { THREE, GeoBuilder, makeCanvas, canvasTexture } from './geo.js';
import { TAU, clamp, lerp, smoothstep, rng, rr, pick } from './core.js';
import {
  WORLD,
  CENTER,
  SAND,
  GRASS,
  PLAZA,
  PATH_LINES,
  RIVER_CENTER,
  RIVER_LEFT,
  RIVER_RIGHT,
} from './layout.js';

/* ---------------- scale ---------------- */

/** World units (the old 2D pixel space) per three.js unit. */
export const WU = 27;
/** Height of the island plateau above the sea. */
export const ISLAND_H = 3.2;

export const toX = (wx) => (wx - CENTER.x) / WU;
export const toZ = (wy) => (wy - CENTER.y) / WU;

/* island-space bounds used by the ground texture */
const BOUNDS = { x0: 60, y0: 90, w: 2480, h: 1720 };
const TEXTURE_SIZE = { w: 2048, h: 1420 };

/* ---------------- signed distance helpers ---------------- */

function polyDistance(px, py, poly) {
  let inside = false;
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
    const dx = xj - xi;
    const dy = yj - yi;
    const len2 = dx * dx + dy * dy || 1;
    let t = ((px - xi) * dx + (py - yi) * dy) / len2;
    t = clamp(t, 0, 1);
    const d = Math.hypot(px - (xi + dx * t), py - (yi + dy * t));
    if (d < best) best = d;
  }
  return inside ? best : -best;
}

/* A coarse grid answers "inside or outside?" cheaply; the true distance is
   then measured exactly against the polygon edges. */
const GRID = 26;
let SAND_GRID = null;
let GRASS_GRID = null;

function buildGrid(poly) {
  const cols = Math.ceil(BOUNDS.w / GRID) + 3;
  const rows = Math.ceil(BOUNDS.h / GRID) + 3;
  const data = new Int8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = BOUNDS.x0 + (c - 1) * GRID;
      const y = BOUNDS.y0 + (r - 1) * GRID;
      data[r * cols + c] = polyDistance(x, y, poly) > 0 ? 1 : -1;
    }
  }
  return { data, cols, rows, poly };
}

function gridInside(grid, x, y) {
  const c = clamp(Math.round((x - BOUNDS.x0) / GRID) + 1, 0, grid.cols - 1);
  const r = clamp(Math.round((y - BOUNDS.y0) / GRID) + 1, 0, grid.rows - 1);
  return grid.data[r * grid.cols + c] > 0;
}

export function sandDistance(x, y) {
  if (!SAND_GRID) SAND_GRID = buildGrid(SAND);
  return polyDistance(x, y, SAND_GRID.poly);
}

export function grassDistance(x, y) {
  if (!GRASS_GRID) GRASS_GRID = buildGrid(GRASS);
  return polyDistance(x, y, GRASS_GRID.poly);
}

/* ---------------- river distance field ---------------- */

const RIVER_SAMPLES = RIVER_CENTER;

/* The centreline has ~120 segments; bucketing them by area makes the
   per-vertex distance query cheap enough for a 236x164 heightfield. */
const RIVER_CELL = 150;
const RIVER_BUCKETS = (() => {
  const map = new Map();
  const key = (cx, cy) => cx + ',' + cy;
  const add = (cx, cy, idx) => {
    const k = key(cx, cy);
    let arr = map.get(k);
    if (!arr) map.set(k, (arr = []));
    if (!arr.includes(idx)) arr.push(idx);
  };
  for (let i = 0; i < RIVER_SAMPLES.length - 1; i++) {
    const a = RIVER_SAMPLES[i];
    const b = RIVER_SAMPLES[i + 1];
    const minCx = Math.floor((Math.min(a.x, b.x) - a.hw) / RIVER_CELL);
    const maxCx = Math.floor((Math.max(a.x, b.x) + a.hw) / RIVER_CELL);
    const minCy = Math.floor((Math.min(a.y, b.y) - a.hw) / RIVER_CELL);
    const maxCy = Math.floor((Math.max(a.y, b.y) + a.hw) / RIVER_CELL);
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) add(cx, cy, i);
    }
  }
  return { map, key };
})();

/* The river's bounding box, padded, lets most of the island skip the whole
   distance query: the height function only cares about the channel's edge. */
const RIVER_BBOX = (() => {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of RIVER_SAMPLES) {
    const pad = p.hw + 60;
    minX = Math.min(minX, p.x - pad);
    maxX = Math.max(maxX, p.x + pad);
    minY = Math.min(minY, p.y - pad);
    maxY = Math.max(maxY, p.y + pad);
  }
  return { minX, maxX, minY, maxY };
})();

/** Cheap upper bound: roughly how far this point is from any river water. */
export function riverFarDistance(x, y) {
  const dx = x < RIVER_BBOX.minX ? RIVER_BBOX.minX - x : x > RIVER_BBOX.maxX ? x - RIVER_BBOX.maxX : 0;
  const dy = y < RIVER_BBOX.minY ? RIVER_BBOX.minY - y : y > RIVER_BBOX.maxY ? y - RIVER_BBOX.maxY : 0;
  return Math.hypot(dx, dy);
}

/**
 * River clearance, but returning `cap` for anything clearly far away. The
 * height function only distinguishes "in the channel", "on the bank", and
 * "nowhere near it", so distant points skip the expensive query entirely.
 */
export function riverClearanceCapped(x, y, cap = 200) {
  if (riverFarDistance(x, y) > cap) return cap;
  return riverClearance(x, y);
}

/** Distance to the river's centreline (positive = outside the water). */
export function riverClearance(x, y) {
  const cx = Math.floor(x / RIVER_CELL);
  const cy = Math.floor(y / RIVER_CELL);

  let best = Infinity;
  let hw = 0;

  const scan = (idx) => {
    const a = RIVER_SAMPLES[idx];
    const b = RIVER_SAMPLES[idx + 1];
    if (!a || !b) return;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy || 1;
    let t = ((x - a.x) * dx + (y - a.y) * dy) / len2;
    t = clamp(t, 0, 1);
    const d = Math.hypot(x - (a.x + dx * t), y - (a.y + dy * t));
    if (d < best) {
      best = d;
      hw = lerp(a.hw, b.hw, t);
    }
  };

  /* Walk outward ring by ring. Once the best distance found is smaller than
     the nearest still-unscanned bucket, no closer segment can exist. */
  const maxRing = Math.ceil(Math.hypot(BOUNDS.w, BOUNDS.h) / RIVER_CELL);
  const seen = new Set();
  for (let ring = 0; ring <= maxRing; ring++) {
    /* the guarantee: any unscanned bucket is at least (ring-1)*CELL away */
    if (best !== Infinity && best <= (ring - 1) * RIVER_CELL) break;
    for (let ox = -ring; ox <= ring; ox++) {
      for (let oy = -ring; oy <= ring; oy++) {
        if (Math.max(Math.abs(ox), Math.abs(oy)) !== ring) continue;
        const arr = RIVER_BUCKETS.map.get(RIVER_BUCKETS.key(cx + ox, cy + oy));
        if (!arr) continue;
        for (const idx of arr) {
          if (seen.has(idx)) continue;
          seen.add(idx);
          scan(idx);
        }
      }
    }
  }

  return best - hw;
}

/* ---------------- the height function ---------------- */

const HILLS = (() => {
  const rand = rng(5150);
  const out = [];
  for (let i = 0; i < 9; i++) {
    out.push({
      x: rr(rand, 260, WORLD.w - 260),
      y: rr(rand, 200, WORLD.h - 200),
      r: rr(rand, 190, 430),
      a: rr(rand, 0.5, 1.5),
    });
  }
  // a broad rise under the cottage and the windmill hill
  out.push({ x: 700, y: 560, r: 520, a: 1.5 });
  out.push({ x: 1046, y: 300, r: 330, a: 1.9 });
  return out;
})();

/** Island-space height in world units (0 = sea level). */
export function heightAtWorld(x, y) {
  const d = sandDistance(x, y);
  if (d <= 0) return -0.55;

  // shoreline slope, then the flat plateau
  const t = smoothstep(clamp(d / 74, 0, 1));
  let h = ISLAND_H * t;

  // rolling hills, damped near the shore and the river
  const river = riverClearanceCapped(x, y, 200);
  const riverGuard = clamp((river + 20) / 90, 0, 1);
  let hill = 0;
  for (const hl of HILLS) {
    const dist = Math.hypot(x - hl.x, (y - hl.y) * 1.15);
    hill += hl.a * Math.exp(-(dist * dist) / (hl.r * hl.r));
  }
  h += hill * 0.55 * riverGuard * t;

  // the river cuts a channel through the plateau
  if (river < 30) {
    const k = smoothstep(clamp((river + 30) / 60, 0, 1));
    const bed = ISLAND_H - 1.3 + Math.sin(x * 0.006 + y * 0.004) * 0.12;
    h = lerp(bed, h, k);
  }

  // the plaza and the paths are graded flat
  const plazaD = Math.hypot(x - PLAZA.x, (y - PLAZA.y) * 1.06) - PLAZA.r;
  if (plazaD < 40) {
    const k = smoothstep(clamp((plazaD + 40) / 80, 0, 1));
    h = lerp(h, ISLAND_H + 0.25, 1 - k);
  }

  let pathD = Infinity;
  for (const line of PATH_LINES) {
    for (let i = 0; i < line.pts.length; i += 3) {
      const p = line.pts[i];
      const dd = Math.hypot(x - p.x, y - p.y) - line.w;
      if (dd < pathD) pathD = dd;
    }
  }
  if (pathD < 26) h = lerp(ISLAND_H + 0.02, h, smoothstep(clamp(pathD / 52, 0, 1)));

  // never let anything but the channel dip below the waterline
  return Math.max(h, ISLAND_H - 0.75);
}

/** Height in three.js units plus the extra lift baked into the mesh. */
const MESH_LIFT = 0.0;
export function terrainHeight(x, y) {
  return heightAtWorld(x, y) + MESH_LIFT;
}

/* ---------------- ground texture ---------------- */

export function paintGround() {
  const { w: TW, h: TH } = TEXTURE_SIZE;
  const c = makeCanvas(TW, TH);
  const ctx = c.getContext('2d');
  const sx = TW / BOUNDS.w;
  const sy = TH / BOUNDS.h;
  const px = (x) => (x - BOUNDS.x0) * sx;
  const py = (y) => (y - BOUNDS.y0) * sy;

  const pathPoly = (poly, fill) => {
    ctx.beginPath();
    ctx.moveTo(px(poly[0].x), py(poly[0].y));
    for (let i = 1; i < poly.length; i++) ctx.lineTo(px(poly[i].x), py(poly[i].y));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };

  /* --- seabed / sand --- */
  ctx.fillStyle = '#e7d6ad';
  ctx.fillRect(0, 0, TW, TH);
  const sandGrad = ctx.createLinearGradient(0, 0, 0, TH);
  sandGrad.addColorStop(0, '#f3e6c9');
  sandGrad.addColorStop(0.55, '#eeddb8');
  sandGrad.addColorStop(1, '#e3cfa4');
  pathPoly(SAND, sandGrad);

  const rand = rng(880);
  for (let i = 0; i < 1600; i++) {
    const x = px(rr(rand, BOUNDS.x0, BOUNDS.x0 + BOUNDS.w));
    const y = py(rr(rand, BOUNDS.y0, BOUNDS.y0 + BOUNDS.h));
    ctx.fillStyle = `rgba(206,182,138,${rr(rand, 0.05, 0.14)})`;
    ctx.beginPath();
    ctx.ellipse(x, y, rr(rand, 5, 26), rr(rand, 3, 11), rand() * TAU, 0, TAU);
    ctx.fill();
  }

  /* --- grass --- */
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(px(GRASS[0].x), py(GRASS[0].y));
  for (let i = 1; i < GRASS.length; i++) ctx.lineTo(px(GRASS[i].x), py(GRASS[i].y));
  ctx.closePath();
  ctx.clip();

  const grassGrad = ctx.createLinearGradient(px(400), py(200), px(1900), py(1700));
  grassGrad.addColorStop(0, '#a9d484');
  grassGrad.addColorStop(0.32, '#9dc976');
  grassGrad.addColorStop(0.62, '#8fbe6b');
  grassGrad.addColorStop(1, '#80b160');
  ctx.fillStyle = grassGrad;
  ctx.fillRect(0, 0, TW, TH);

  const greens = ['#b6db92', '#8cbb68', '#a3cf7d', '#79aa5b', '#c0e29c'];
  for (let i = 0; i < 900; i++) {
    const x = px(rr(rand, BOUNDS.x0, BOUNDS.x0 + BOUNDS.w));
    const y = py(rr(rand, BOUNDS.y0, BOUNDS.y0 + BOUNDS.h));
    const g = ctx.createRadialGradient(x, y, 0, x, y, rr(rand, 20, 90));
    const col = pick(rand, greens);
    g.addColorStop(0, col + '2e');
    g.addColorStop(1, col + '00');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, 90, 0, TAU);
    ctx.fill();
  }

  /* sun-dappled northern meadows */
  for (let i = 0; i < 50; i++) {
    const x = px(rr(rand, 260, 2100));
    const y = py(rr(rand, 200, 760));
    const g = ctx.createRadialGradient(x, y, 0, x, y, rr(rand, 50, 140));
    g.addColorStop(0, 'rgba(211,236,172,0.28)');
    g.addColorStop(1, 'rgba(211,236,172,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, 140, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  /* --- grass blades + wildflowers (tiny, they read as texture) --- */
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(px(GRASS[0].x), py(GRASS[0].y));
  for (let i = 1; i < GRASS.length; i++) ctx.lineTo(px(GRASS[i].x), py(GRASS[i].y));
  ctx.closePath();
  ctx.clip();
  for (let i = 0; i < 5200; i++) {
    const x = px(rr(rand, 240, 2360));
    const y = py(rr(rand, 180, 1640));
    const h = rr(rand, 2.4, 7);
    ctx.strokeStyle = rand() < 0.5 ? 'rgba(108,158,86,0.30)' : 'rgba(170,206,132,0.30)';
    ctx.lineWidth = rr(rand, 0.7, 1.4);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + rr(rand, -2, 2), y - h);
    ctx.stroke();
  }
  const flowerCols = ['#fff3ab', '#ffd6e2', '#ffffff', '#d8c4f5', '#ffd9a0'];
  for (let i = 0; i < 900; i++) {
    const x = px(rr(rand, 240, 2360));
    const y = py(rr(rand, 180, 1640));
    ctx.fillStyle = pick(rand, flowerCols);
    ctx.beginPath();
    ctx.arc(x, y, rr(rand, 0.8, 1.7), 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  /* --- grassy rim --- */
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(px(GRASS[0].x), py(GRASS[0].y));
  for (let i = 1; i < GRASS.length; i++) ctx.lineTo(px(GRASS[i].x), py(GRASS[i].y));
  ctx.closePath();
  ctx.strokeStyle = 'rgba(92,134,70,0.5)';
  ctx.lineWidth = 9;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(186,222,142,0.8)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  /* --- paths --- */
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(px(GRASS[0].x), py(GRASS[0].y));
  for (let i = 1; i < GRASS.length; i++) ctx.lineTo(px(GRASS[i].x), py(GRASS[i].y));
  ctx.closePath();
  ctx.clip();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const strokePts = (pts, width, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(px(pts[0].x), py(pts[0].y));
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const cur = pts[i];
      ctx.quadraticCurveTo(px(prev.x), py(prev.y), px((prev.x + cur.x) / 2), py((prev.y + cur.y) / 2));
    }
    ctx.stroke();
  };

  for (const line of PATH_LINES) {
    strokePts(line.pts, (line.w + 15) * sx, 'rgba(126,162,98,0.5)');
    strokePts(line.pts, (line.w + 7) * sx, 'rgba(196,174,130,0.72)');
    strokePts(line.pts, line.w * sx, 'rgba(226,207,166,0.96)');
    strokePts(line.pts, line.w * 0.6 * sx, 'rgba(240,226,192,0.9)');
  }

  /* pebbles */
  for (let i = 0; i < 1400; i++) {
    const line = pick(rand, PATH_LINES);
    const pt = pick(rand, line.pts);
    const a = rand() * TAU;
    const rad = rand() * line.w * 0.44;
    ctx.fillStyle = rand() < 0.5 ? 'rgba(188,170,136,0.5)' : 'rgba(246,238,216,0.55)';
    ctx.beginPath();
    ctx.ellipse(
      px(pt.x + Math.cos(a) * rad),
      py(pt.y + Math.sin(a) * rad),
      rr(rand, 0.8, 2.6),
      rr(rand, 0.7, 1.9),
      rand() * TAU,
      0,
      TAU
    );
    ctx.fill();
  }
  ctx.restore();

  /* --- plaza --- */
  const pcx = px(PLAZA.x);
  const pcy = py(PLAZA.y);
  const prx = PLAZA.r * sx;
  const pry = PLAZA.r * 0.94 * sy;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(pcx, pcy, prx, pry, 0, 0, TAU);
  ctx.clip();
  const pg = ctx.createRadialGradient(pcx - 40, pcy - 60, 20, pcx, pcy, prx);
  pg.addColorStop(0, '#f2e9d6');
  pg.addColorStop(0.6, '#e7dcc4');
  pg.addColorStop(1, '#dacdb2');
  ctx.fillStyle = pg;
  ctx.fillRect(pcx - prx, pcy - pry, prx * 2, pry * 2);

  ctx.strokeStyle = 'rgba(176,162,136,0.45)';
  ctx.lineWidth = 1.6;
  for (let r = 30; r < PLAZA.r; r += 38) {
    ctx.beginPath();
    ctx.ellipse(pcx, pcy, r * sx, r * 0.94 * sy, 0, 0, TAU);
    ctx.stroke();
  }
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU;
    ctx.beginPath();
    ctx.moveTo(pcx + Math.cos(a) * 30 * sx, pcy + Math.sin(a) * 28 * sy);
    ctx.lineTo(pcx + Math.cos(a) * prx, pcy + Math.sin(a) * pry);
    ctx.stroke();
  }
  for (let i = 0; i < 900; i++) {
    const a = rand() * TAU;
    const rad = Math.sqrt(rand());
    ctx.fillStyle = rand() < 0.5 ? 'rgba(255,252,240,0.3)' : 'rgba(158,146,124,0.2)';
    ctx.beginPath();
    ctx.arc(pcx + Math.cos(a) * rad * prx, pcy + Math.sin(a) * rad * pry, rr(rand, 0.7, 2), 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(166,148,116,0.6)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(pcx, pcy, prx, pry, 0, 0, TAU);
  ctx.stroke();

  /* --- the river's damp bed, painted where the 3D water sits --- */
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(px(RIVER_LEFT[0].x), py(RIVER_LEFT[0].y));
  for (const p of RIVER_LEFT) ctx.lineTo(px(p.x), py(p.y));
  for (let i = RIVER_RIGHT.length - 1; i >= 0; i--) ctx.lineTo(px(RIVER_RIGHT[i].x), py(RIVER_RIGHT[i].y));
  ctx.closePath();
  const riverGrad = ctx.createLinearGradient(0, py(760), 0, py(1080));
  riverGrad.addColorStop(0, '#7d9b86');
  riverGrad.addColorStop(0.5, '#6d917c');
  riverGrad.addColorStop(1, '#618773');
  ctx.fillStyle = riverGrad;
  ctx.fill();

  ctx.lineWidth = 9;
  ctx.strokeStyle = 'rgba(96,126,94,0.35)';
  ctx.stroke();
  ctx.restore();

  /* wet sand lip along both banks */
  ctx.save();
  ctx.lineWidth = 12;
  ctx.strokeStyle = 'rgba(250,244,224,0.34)';
  for (const line of [RIVER_LEFT, RIVER_RIGHT]) {
    ctx.beginPath();
    ctx.moveTo(px(line[0].x), py(line[0].y));
    for (const p of line) ctx.lineTo(px(p.x), py(p.y));
    ctx.stroke();
  }
  ctx.restore();

  return c;
}

/* ---------------- island mesh ---------------- */

export function buildIsland(scene) {
  const SEG_X = 236;
  const SEG_Z = 164;
  const geo = new THREE.PlaneGeometry(BOUNDS.w / WU, BOUNDS.h / WU, SEG_X, SEG_Z);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const rand = rng(6161);
  const col = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const lx = pos.getX(i);
    const lz = pos.getZ(i);
    const wx = CENTER.x + lx * WU;
    const wy = CENTER.y + lz * WU;
    const h = heightAtWorld(wx, wy);
    pos.setY(i, h + MESH_LIFT);

    const sand = sandDistance(wx, wy);
    if (sand < 0) {
      const deep = clamp(-sand / 60, 0, 1);
      col.setRGB(0.79 - deep * 0.16, 0.72 - deep * 0.12, 0.58 - deep * 0.1);
    } else if (sand < 55) {
      col.set('#efe2bf');
    } else {
      const k = (Math.sin(wx * 0.013) + Math.cos(wy * 0.017)) * 0.5;
      col.setRGB(0.62 + k * 0.02, 0.74 + k * 0.02, 0.45 + k * 0.015);
    }
    const tint = 1 + (rand() - 0.5) * 0.05;
    colors[i * 3] = col.r * tint;
    colors[i * 3 + 1] = col.g * tint;
    colors[i * 3 + 2] = col.b * tint;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const texture = canvasTexture(paintGround(), { aniso: 8 });
  /* the ground canvas is painted top-down, but a rotated PlaneGeometry maps
     v = 1 at the far edge, so flip it to line the artwork up with the world */
  texture.flipY = false;
  texture.needsUpdate = true;
  const mat = new THREE.MeshStandardMaterial({
    map: texture,
    vertexColors: true,
    roughness: 0.97,
    metalness: 0,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(0, 0, 0);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.name = 'island';
  scene.add(mesh);
  return mesh;
}

/* ---------------- ocean ---------------- */

export function buildOcean(scene) {
  const geo = new THREE.PlaneGeometry(2400, 2400, 200, 200);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, 0);

  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#57b9c4'),
    roughness: 0.34,
    metalness: 0.18,
    transparent: true,
    opacity: 0.94,
  });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying vec3 vWPos;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         float t = uTime;
         vec3 p = transformed;
         p.y += sin(p.x * 0.09 + t * 0.55) * 0.34
              + sin(p.z * 0.13 - t * 0.42) * 0.28
              + sin((p.x + p.z) * 0.22 + t * 1.1) * 0.12;
         transformed = p;
         vWPos = p;`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform float uTime;\nvarying vec3 vWPos;'
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         float band = sin(vWPos.x * 0.42 + vWPos.z * 0.31 + uTime * 0.5);
         float band2 = sin(vWPos.x * 1.35 - vWPos.z * 1.05 + uTime * 0.9);
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.36, 0.72, 0.78), band * 0.10 + 0.12);
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.74, 0.94, 0.94), smoothstep(0.55, 1.0, band2) * 0.12);`
      );
    mat.userData.shader = shader;
  };
  mat.customProgramCacheKey = () => 'ocean';

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0;
  mesh.receiveShadow = true;
  mesh.name = 'ocean';
  scene.add(mesh);
  return { mesh, mat };
}

/* ---------------- river water ---------------- */

/** The waterline sits a little below the grass so the banks read as banks. */
export const RIVER_LEVEL = ISLAND_H - 0.62;

export function buildRiver(scene) {
  const top = [];
  for (let i = 0; i < RIVER_LEFT.length; i++) top.push(RIVER_LEFT[i]);
  for (let i = RIVER_RIGHT.length - 1; i >= 0; i--) top.push(RIVER_RIGHT[i]);

  const positions = [];
  const uvs = [];
  const indices = [];
  const n = RIVER_LEFT.length;

  for (let i = 0; i < n; i++) {
    for (let s = 0; s < 2; s++) {
      const wp = s === 0 ? RIVER_LEFT[i] : RIVER_RIGHT[i];
      positions.push(toX(wp.x), RIVER_LEVEL, toZ(wp.y));
      uvs.push(s, i / (n - 1));
    }
  }
  for (let i = 0; i < n - 1; i++) {
    const a = i * 2;
    indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#5fb9c6'),
    roughness: 0.18,
    metalness: 0.22,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
  });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying vec2 vRuv;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vRuv = uv;
         transformed.y += sin(uv.y * 62.0 - uTime * 2.2) * 0.05
                        + sin(uv.y * 19.0 + uv.x * 6.0 + uTime * 1.3) * 0.035;`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform float uTime;\nvarying vec2 vRuv;'
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         float flow = sin(vRuv.y * 150.0 - uTime * 3.4);
         float ripple = sin(vRuv.y * 46.0 + vRuv.x * 9.0 - uTime * 1.7);
         float edge = smoothstep(0.34, 0.5, abs(vRuv.x - 0.5));
         float foam = smoothstep(0.55, 0.95, ripple * 0.5 + 0.5) * (0.18 + edge * 0.55);
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.30, 0.62, 0.70), flow * 0.09 + 0.05);
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.94, 0.99, 0.99), foam * 0.75);`
      );
    mat.userData.shader = shader;
  };
  mat.customProgramCacheKey = () => 'river';

  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = 'river';
  scene.add(mesh);
  return { mesh, mat };
}

/* ---------------- sky + light ---------------- */

export function buildSky(scene) {
  const geo = new THREE.SphereGeometry(760, 32, 20);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTop: { value: new THREE.Color('#6fb6d8') },
      uMid: { value: new THREE.Color('#bfe6e0') },
      uBot: { value: new THREE.Color('#f2f2dc') },
      uSun: { value: new THREE.Vector3(0.45, 0.42, -0.62).normalize() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vDir;
      uniform vec3 uTop, uMid, uBot, uSun;
      void main() {
        float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 col = mix(uBot, uMid, smoothstep(0.42, 0.60, h));
        col = mix(col, uTop, smoothstep(0.58, 0.95, h));
        float sun = pow(max(dot(vDir, normalize(uSun)), 0.0), 42.0);
        col += vec3(1.0, 0.94, 0.76) * sun * 0.55;
        float haze = pow(1.0 - clamp(vDir.y, 0.0, 1.0), 3.5);
        col = mix(col, vec3(0.96, 0.97, 0.90), haze * 0.4);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'sky';
  scene.add(mesh);
  return mesh;
}

export function buildLights(scene) {
  const hemi = new THREE.HemisphereLight(0xe8f4ff, 0xa8c489, 1.15);
  hemi.position.set(0, 60, 0);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff4dc, 2.0);
  sun.position.set(48, 74, -40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const d = 62;
  sun.shadow.camera.left = -d;
  sun.shadow.camera.right = d;
  sun.shadow.camera.top = d;
  sun.shadow.camera.bottom = -d;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 220;
  sun.shadow.bias = -0.0009;
  sun.shadow.normalBias = 0.035;
  scene.add(sun);
  scene.add(sun.target);

  const bounce = new THREE.DirectionalLight(0xcfe8d4, 0.42);
  bounce.position.set(-40, 26, 46);
  scene.add(bounce);

  return { hemi, sun, bounce };
}

/* ---------------- clouds ---------------- */

export function buildClouds(scene) {
  const group = new THREE.Group();
  group.name = 'clouds';
  const rand = rng(3121);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1,
    metalness: 0,
    transparent: false,
    vertexColors: true,
    flatShading: false,
  });
  const b = new GeoBuilder(31);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * TAU + rand() * 0.4;
    const radius = rr(rand, 88, 190);
    const cx = Math.cos(a) * radius;
    const cz = Math.sin(a) * radius;
    const cy = rr(rand, 26, 46);
    const puffs = 3 + Math.floor(rand() * 4);
    for (let k = 0; k < puffs; k++) {
      const r = rr(rand, 4.5, 9);
      b.sphere(
        r,
        k % 2 ? '#ffffff' : '#f7fbfa',
        cx + rr(rand, -12, 12),
        cy + rr(rand, -1.6, 2.2),
        cz + rr(rand, -8, 8),
        { ws: 9, hs: 7, variance: 0.03 }
      );
    }
  }
  const mesh = new THREE.Mesh(b.toGeometry(), mat);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  group.add(mesh);
  scene.add(group);
  return group;
}

/* ---------------- palm-ish beach fringe ---------------- */

export function beachFringe() {
  const rand = rng(7788);
  const out = [];
  for (let x = BOUNDS.x0; x < BOUNDS.x0 + BOUNDS.w; x += 34) {
    for (let y = BOUNDS.y0; y < BOUNDS.y0 + BOUNDS.h; y += 34) {
      const d = sandDistance(x, y);
      if (d > 18 && d < 60 && rand() < 0.06) {
        out.push({ x, y, scale: rr(rand, 0.7, 1.15) });
      }
    }
  }
  return out;
}
