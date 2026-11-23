/* ============================================================
   Layout — the geometry of Rapada Isle.
   Everything here is world-space (pixels, y grows downward).
   ============================================================ */

import { TAU, rng, rr, bez, pointInPolygon, distToPolyline } from './core.js';
import { PODIUMS } from './resume-data.js';

export const WORLD = { w: 2600, h: 1900 };

/* ---------------- island silhouette ---------------- */
function makeIsland(cx, cy, rx, ry, seed, scale = 1, n = 160) {
  const rand = rng(seed);
  const harms = [
    { f: 2, a: 0.045, p: rr(rand, 0, TAU) },
    { f: 3, a: 0.03, p: rr(rand, 0, TAU) },
    { f: 5, a: 0.022, p: rr(rand, 0, TAU) },
    { f: 9, a: 0.014, p: rr(rand, 0, TAU) },
    { f: 14, a: 0.008, p: rr(rand, 0, TAU) },
  ];
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    let k = 1;
    for (const h of harms) k += h.a * Math.sin(a * h.f + h.p);
    k *= scale;
    pts.push({ x: cx + Math.cos(a) * rx * k, y: cy + Math.sin(a) * ry * k });
  }
  return pts;
}

export const CENTER = { x: 1300, y: 930 };
export const SAND = makeIsland(CENTER.x, CENTER.y, 1180, 815, 31);
export const GRASS = makeIsland(CENTER.x, CENTER.y, 1112, 768, 77);
export const FOAM = makeIsland(CENTER.x, CENTER.y, 1214, 843, 31);

export function shrink(poly, k, cx = CENTER.x, cy = CENTER.y) {
  return poly.map((p) => ({ x: cx + (p.x - cx) * k, y: cy + (p.y - cy) * k }));
}
export const WALK = shrink(GRASS, 0.955);

/* ---------------- the river ---------------- */
const RIVER_SEGMENTS = [
  [
    [-420, 940],
    [380, 742],
    [700, 1010],
    [1080, 884],
  ],
  [
    [1080, 884],
    [1400, 792],
    [1640, 1006],
    [1960, 906],
  ],
  [
    [1960, 906],
    [2200, 838],
    [2440, 962],
    [3020, 892],
  ],
];

const rndRiver = rng(1207);
const RAW = [];
RIVER_SEGMENTS.forEach((seg) => {
  const pts = bez(seg[0], seg[1], seg[2], seg[3], 40);
  pts.forEach((p, i) => {
    if (RAW.length && i === 0) return;
    RAW.push(p);
  });
});

export function riverWidthAt(t) {
  return 68 + 20 * Math.sin(t * Math.PI * 3.2 + 0.7) + 8 * Math.sin(t * Math.PI * 8.1);
}

/* centreline with a gentle side-to-side drift, plus normals */
export const RIVER_CENTER = (() => {
  const out = [];
  const n = RAW.length;
  for (let i = 0; i < n; i++) {
    const p = RAW[i];
    const a = RAW[Math.max(0, i - 1)];
    const b = RAW[Math.min(n - 1, i + 1)];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const t = i / (n - 1);
    const hw = riverWidthAt(t);
    // wobble the banks so it never looks extruded
    const wob = Math.sin(t * Math.PI * 11.3 + 0.4) * 8;
    out.push({
      x: p.x,
      y: p.y,
      t,
      hw: hw + wob,
      nx: -dy / len,
      ny: dx / len,
      tx: dx / len,
      ty: dy / len,
    });
  }
  return out;
})();

export const RIVER_LEFT = RIVER_CENTER.map((p) => ({
  x: p.x + p.nx * p.hw,
  y: p.y + p.ny * p.hw,
}));
export const RIVER_RIGHT = RIVER_CENTER.map((p) => ({
  x: p.x - p.nx * p.hw,
  y: p.y - p.ny * p.hw,
}));
export const RIVER_POLY = [...RIVER_LEFT, ...RIVER_RIGHT.slice().reverse()];

export function riverSampleAtX(x) {
  let best = null;
  for (const p of RIVER_CENTER) {
    if (!best || Math.abs(p.x - x) < Math.abs(best.x - x)) best = p;
  }
  return best;
}

/* ---------------- the bridge ---------------- */
/* World units are the old 2D pixel space; a pixel is 1/27 of a three.js
   unit, so anything that should be a sensible physical size is sized in
   world units here and divided down by WU_SPAN. */
const bridgeSample = riverSampleAtX(830);
const BRIDGE_SPAN = 132; // deck width in world units (~4.9 three.js units)
const BRIDGE_Y0 = bridgeSample.y - bridgeSample.hw - 62;
const BRIDGE_Y1 = bridgeSample.y + bridgeSample.hw + 62;
export const BRIDGE = {
  cx: 830,
  cy: bridgeSample.y,
  /** half deck width, in world units */
  halfW: BRIDGE_SPAN / 2,
  y0: BRIDGE_Y0,
  y1: BRIDGE_Y1,
  w: BRIDGE_SPAN,
  h: BRIDGE_Y1 - BRIDGE_Y0,
};

/* ---------------- plaza ---------------- */
export const PLAZA = { x: 980, y: 1400, r: 282 };
export const PODIUM_RING = 300;

const PODIUM_ANGLES = [-72, -24, 24, 72, 120, 168];
export const PODIUM_SPOTS = PODIUM_ANGLES.map((deg, i) => {
  const a = (deg / 180) * Math.PI;
  return {
    ...PODIUMS[i],
    index: i,
    x: PLAZA.x + Math.cos(a) * PODIUM_RING,
    y: PLAZA.y + Math.sin(a) * PODIUM_RING * 0.94,
    angle: a,
  };
});

/* ---------------- house ---------------- */
export const HOUSE = {
  x: 600,
  y: 648, // door / footprint baseline
  w: 430,
  h: 372,
};

/* ---------------- paths ---------------- */
const bridgeSouth = BRIDGE.y1 - 6;
const bridgeNorth = BRIDGE.y0 + 6;

export const PATHS = [
  // house door -> bridge
  {
    w: 62,
    pts: [
      { x: HOUSE.x + 8, y: HOUSE.y + 6 },
      { x: HOUSE.x + 62, y: HOUSE.y + 62 },
      { x: 706, y: 730 },
      { x: 792, y: bridgeNorth - 40 },
      { x: BRIDGE.cx, y: bridgeNorth + 4 },
    ],
  },
  // bridge -> plaza
  {
    w: 58,
    pts: [
      { x: BRIDGE.cx, y: bridgeSouth },
      { x: 852, y: bridgeSouth + 62 },
      { x: 900, y: 1120 },
      { x: 960, y: PLAZA.y - PLAZA.r - 6 },
    ],
  },
  // plaza ring
  {
    w: 46,
    ring: { x: PLAZA.x, y: PLAZA.y, rx: 232, ry: 218 },
  },
  // branch to the turnip patch
  {
    w: 40,
    pts: [
      { x: 690, y: 726 },
      { x: 612, y: 800 },
      { x: 528, y: 838 },
      { x: 452, y: 852 },
      { x: 424, y: 872 },
    ],
  },
  // branch up the hill to the windmill
  {
    w: 34,
    pts: [
      { x: HOUSE.x + 40, y: HOUSE.y - 20 },
      { x: 748, y: 560 },
      { x: 860, y: 480 },
      { x: 960, y: 400 },
      { x: 1010, y: 340 },
    ],
  },
  // south trail to the campsite
  {
    w: 36,
    pts: [
      { x: PLAZA.x + 150, y: PLAZA.y + 192 },
      { x: 1260, y: 1660 },
      { x: 1350, y: 1668 },
      { x: 1420, y: 1600 },
    ],
  },
];

export const PATH_LINES = PATHS.map((p) => {
  if (p.ring) {
    const pts = [];
    for (let i = 0; i <= 72; i++) {
      const a = (i / 72) * TAU;
      pts.push({ x: p.ring.x + Math.cos(a) * p.ring.rx, y: p.ring.y + Math.sin(a) * p.ring.ry });
    }
    return { w: p.w, pts };
  }
  return { w: p.w, pts: p.pts };
});

/* ---------------- props ---------------- */
export const PROPS = [];
export const COLLIDERS = [];

function addProp(type, x, y, opts = {}) {
  const p = {
    type,
    x,
    y,
    scale: opts.scale ?? 1,
    seed: opts.seed ?? Math.floor(x * 7 + y * 13),
    variant: opts.variant ?? 0,
    sway: opts.sway ?? 1,
    ...opts,
  };
  PROPS.push(p);
  return p;
}

export function addCollider(c) {
  COLLIDERS.push(c);
}

/* main landmarks */
addProp('house', HOUSE.x, HOUSE.y, { scale: 1, variant: 0, sway: 0 });
addCollider({ kind: 'rect', x: HOUSE.x - 176, y: HOUSE.y - 128, w: 352, h: 128 });

addProp('windmill', 1046, 262, { scale: 1.05, sway: 0 });
addCollider({ kind: 'circle', x: 1046, y: 262, r: 40 });

addProp('mailbox', 742, 690, { scale: 1, sway: 0 });
addCollider({ kind: 'circle', x: 742, y: 690, r: 16 });

addProp('signpost', 906, 762, { scale: 1, sway: 0, text: 'River' });
addCollider({ kind: 'circle', x: 906, y: 762, r: 14 });

addProp('garden', 430, 902, { scale: 1, sway: 0 });
addCollider({ kind: 'rect', x: 430 - 108, y: 902 - 34, w: 216, h: 44 });

addProp('tent', 1420, 1650, { scale: 1, sway: 0 });
addCollider({ kind: 'circle', x: 1420, y: 1650, r: 52 });

addProp('bench', 700, 700, { scale: 1, sway: 0, flip: false });
addCollider({ kind: 'circle', x: 700, y: 700, r: 26 });

addProp('bench', 1180, 1120, { scale: 1, sway: 0, flip: true });
addCollider({ kind: 'circle', x: 1180, y: 1120, r: 26 });

addProp('lamp', 792, 776, { scale: 1, sway: 0 });
addCollider({ kind: 'circle', x: 792, y: 776, r: 13 });
addProp('lamp', 908, 1086, { scale: 1, sway: 0 });
addCollider({ kind: 'circle', x: 908, y: 1086, r: 13 });
addProp('lamp', 1090, 1300, { scale: 1, sway: 0 });
addCollider({ kind: 'circle', x: 1090, y: 1300, r: 13 });

/* podium exhibits */
PODIUM_SPOTS.forEach((spot) => {
  addProp('podium', spot.x, spot.y, {
    scale: 1,
    sway: 0,
    podium: spot,
    variant: spot.index,
    angle: spot.angle,
  });
  addCollider({ kind: 'circle', x: spot.x, y: spot.y - 4, r: 40 });
});

/* sakura ring around the plaza */
[-150, -108, -60, 12, 62, 108, 154, 196].forEach((deg, i) => {
  const a = (deg / 180) * Math.PI;
  const x = PLAZA.x + Math.cos(a) * (PLAZA.r + 46);
  const y = PLAZA.y + Math.sin(a) * (PLAZA.r + 40);
  addProp('sakura', x, y, { scale: rr(rng(i + 9), 0.86, 1.04), sway: 1.3, variant: i });
  addCollider({ kind: 'circle', x, y, r: 30 });
});

/* waiting-area decor */
addProp('flowerbed', 486, 712, { scale: 1, sway: 0 });
addProp('flowerbed', 928, 700, { scale: 1, sway: 0 });
addProp('rock', 340, 700, { scale: 1.1, sway: 0 });
addCollider({ kind: 'circle', x: 340, y: 700, r: 26 });
addProp('bush', 250, 830, { scale: 1, sway: 2.2 });
addCollider({ kind: 'circle', x: 250, y: 830, r: 24 });

/* procedural forest */
(() => {
  const rand = rng(20260101);
  const placed = [];
  const nearPlaza = (x, y) => Math.hypot(x - PLAZA.x, (y - PLAZA.y) * 1.05) < PLAZA.r + 70;
  const nearHouse = (x, y) => Math.abs(x - HOUSE.x) < 300 && y > HOUSE.y - 360 && y < HOUSE.y + 150;
  const nearPath = (x, y) =>
    PATH_LINES.some((line) => distToPolyline(x, y, line.pts) < line.w * 0.55 + 34);

  let tries = 0;
  while (placed.length < 96 && tries < 4000) {
    tries++;
    const x = rr(rand, 60, WORLD.w - 60);
    const y = rr(rand, 120, WORLD.h - 80);
    if (!pointInPolygon(x, y, WALK)) continue;
    if (nearPlaza(x, y) || nearHouse(x, y) || nearPath(x, y)) continue;
    const rp = riverSampleAtX(x);
    if (Math.abs(rp.y - y) < rp.hw + 74) continue;
    if (Math.hypot(x - BRIDGE.cx, y - BRIDGE.cy) < 220) continue;
    if (placed.some((p) => Math.hypot(p.x - x, p.y - y) < 104)) continue;
    placed.push({ x, y });
  }

  placed.forEach((p, i) => {
    const r = rng(i * 977 + 13);
    const north = p.y < 860;
    const roll = r();
    let type;
    if (roll < 0.42) type = 'tree';
    else if (roll < 0.6) type = 'pine';
    else if (roll < 0.74) type = 'sakura';
    else if (roll < 0.88) type = 'bush';
    else type = 'rock';
    if (type === 'sakura' && r() < 0.55) type = 'tree';
    addProp(type, p.x, p.y, {
      scale: rr(r, 0.78, 1.12) * (north ? 1.04 : 1),
      sway: type === 'rock' ? 0 : rr(r, 0.7, 1.5),
      variant: Math.floor(r() * 4),
      seed: i * 131 + 7,
    });
    if (type === 'rock') addCollider({ kind: 'circle', x: p.x, y: p.y, r: 24 * 0.9 });
    else if (type === 'bush') addCollider({ kind: 'circle', x: p.x, y: p.y, r: 22 });
    else addCollider({ kind: 'circle', x: p.x, y: p.y - 4, r: 22 });
  });

  // dense tree wall at the northern rim for depth
  for (let i = 0; i < 34; i++) {
    const x = rr(rand, 260, WORLD.w - 260);
    const y = rr(rand, 150, 330);
    if (!pointInPolygon(x, y, GRASS)) continue;
    addProp(rand() < 0.5 ? 'pine' : 'tree', x, y, {
      scale: rr(rand, 0.9, 1.25),
      sway: rr(rand, 0.8, 1.5),
      variant: Math.floor(rand() * 4),
      seed: 9000 + i,
    });
    addCollider({ kind: 'circle', x, y: y - 4, r: 24 });
  }
})();

/* ---------------- player spawn ---------------- */
export const SPAWN = { x: 806, y: 760 };

/* ---------------- query helpers ---------------- */
export function inRiver(x, y) {
  return pointInPolygon(x, y, RIVER_POLY);
}

export function onBridge(x, y) {
  return (
    x > BRIDGE.cx - BRIDGE.halfW + 6 &&
    x < BRIDGE.cx + BRIDGE.halfW - 6 &&
    y > BRIDGE.y0 - 14 &&
    y < BRIDGE.y1 + 14
  );
}

const RIVER_SAFE = RIVER_POLY;

/** The deck itself — narrower than the collision box so railings block you. */
export function onBridgeDeck(x, y) {
  return (
    x > BRIDGE.cx - BRIDGE.halfW * 0.82 + PLAYER_HALF &&
    x < BRIDGE.cx + BRIDGE.halfW * 0.82 - PLAYER_HALF &&
    y > BRIDGE.y0 - 14 &&
    y < BRIDGE.y1 + 14
  );
}

export function blockedByProp(x, y, pad = 0) {
  for (let i = 0; i < COLLIDERS.length; i++) {
    const c = COLLIDERS[i];
    if (c.kind === 'circle') {
      const dx = x - c.x;
      const dy = y - c.y;
      const r = c.r + pad;
      if (dx * dx + dy * dy < r * r) return true;
    } else {
      if (x > c.x - pad && x < c.x + c.w + pad && y > c.y - pad && y < c.y + c.h + pad)
        return true;
    }
  }
  return false;
}

/** half-width of the player's footprint, in world units */
export const PLAYER_HALF = 14;

/** true when the villager can stand here (feet position) */
export function isWalkable(x, y) {
  if (x < 20 || y < 20 || x > WORLD.w - 20 || y > WORLD.h - 20) return false;
  const bridge = onBridgeDeck(x, y);
  if (bridge) return true;
  if (!pointInPolygon(x, y, WALK)) return false;
  if (pointInPolygon(x, y, RIVER_SAFE)) return false;
  if (blockedByProp(x, y, 0)) return false;
  return true;
}

/** Water depth factor for a point (0 outside, 1 deep inside) — used for foam. */
export function riverProximity(x, y) {
  return pointInPolygon(x, y, RIVER_POLY);
}
