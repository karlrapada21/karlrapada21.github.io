/* ============================================================
   Rapada Isle — core utilities
   Small math / drawing / colour helpers shared by everything.
   ============================================================ */

export const TAU = Math.PI * 2;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (t) => t * t * (3 - 2 * t);
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);
export const pingpong = (t) => 1 - Math.abs(((t % 2) + 2) % 2 - 1);

/* Deterministic PRNG (mulberry32) so the island is the same every visit. */
export function rng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Range helpers bound to a prng */
export const rr = (rand, a, b) => a + rand() * (b - a);
export const ri = (rand, a, b) => Math.floor(a + rand() * (b - a + 1));
export const pick = (rand, arr) => arr[Math.floor(rand() * arr.length)];

/* ---------- colour ---------- */
export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h,
    16
  );
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/** amount > 0 lightens, < 0 darkens */
export function shade(hex, amount, alpha = 1) {
  const [r, g, b] = hexToRgb(hex);
  const f = (c) =>
    Math.round(clamp(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount), 0, 255));
  return `rgba(${f(r)},${f(g)},${f(b)},${alpha})`;
}

/* ---------- geometry ---------- */
export function pointInPolygon(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0] !== undefined ? poly[i][0] : poly[i].x;
    const yi = poly[i][1] !== undefined ? poly[i][1] : poly[i].y;
    const xj = poly[j][0] !== undefined ? poly[j][0] : poly[j].x;
    const yj = poly[j][1] !== undefined ? poly[j][1] : poly[j].y;
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = clamp(t, 0, 1);
  const cx = x1 + dx * t;
  const cy = y1 + dy * t;
  return Math.hypot(px - cx, py - cy);
}

export function distToPolyline(px, py, pts) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const d = distToSegment(px, py, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
    if (d < best) best = d;
  }
  return best;
}

/* ---------- canvas helpers ---------- */
export function roundRect(ctx, x, y, w, h, r) {
  const rr2 = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr2, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr2);
  ctx.arcTo(x + w, y + h, x, y + h, rr2);
  ctx.arcTo(x, y + h, x, y, rr2);
  ctx.arcTo(x, y, x + w, y, rr2);
  ctx.closePath();
}

export function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
}

/** soft radial blob used all over the watercolour look */
export function blob(ctx, x, y, r, color, alpha = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(0.55, rgba(color, alpha * 0.55));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

/** cubic bezier sampler -> array of {x,y} */
export function bez(p0, c1, c2, p3, steps = 48) {
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const a = mt * mt * mt;
    const b = 3 * mt * mt * t;
    const c = 3 * mt * t * t;
    const d = t * t * t;
    out.push({
      x: a * p0[0] + b * c1[0] + c * c2[0] + d * p3[0],
      y: a * p0[1] + b * c1[1] + c * c2[1] + d * p3[1],
      t,
    });
  }
  return out;
}
