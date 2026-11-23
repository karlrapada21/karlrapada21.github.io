/* ============================================================
   Props — every hand-drawn thing on the island.
   Each renderer receives (ctx, prop, t) in world space and draws
   with the prop's anchor point at the bottom-centre.
   ============================================================ */

import { TAU, rgba, roundRect, ellipse, rng, rr } from './core.js';

/* ---------- little helpers ---------- */

/** soft wobbly outline — the "hand painted" edge */
function wobble(ctx, x, y, r, n, amp, phase, squash = 1) {
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU;
    const k = 1 + Math.sin(a * 3 + phase) * amp + Math.sin(a * 5 - phase * 1.7) * amp * 0.5;
    const px = x + Math.cos(a) * r * k;
    const py = y + Math.sin(a) * r * k * squash;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function groundShadow(ctx, w, h, alpha = 0.16) {
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w);
  g.addColorStop(0, `rgba(58,82,58,${alpha})`);
  g.addColorStop(0.6, `rgba(58,82,58,${alpha * 0.55})`);
  g.addColorStop(1, 'rgba(58,82,58,0)');
  ctx.save();
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, w, h, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/* ============================================================
   TREES
   ============================================================ */

function canopy(ctx, x, y, r, c1, c2, c3, phase, t) {
  ctx.save();
  ctx.translate(x, y);
  // base mass
  ctx.fillStyle = c1;
  wobble(ctx, 0, 0, r, 22, 0.075, phase, 0.86);
  ctx.fill();
  // mid highlight
  ctx.fillStyle = c2;
  wobble(ctx, -r * 0.16, -r * 0.2, r * 0.76, 18, 0.09, phase + 1.2, 0.82);
  ctx.fill();
  // top highlight
  ctx.fillStyle = c3;
  wobble(ctx, -r * 0.28, -r * 0.38, r * 0.44, 14, 0.1, phase + 2.4, 0.8);
  ctx.fill();

  // leaf clumps on the rim
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + phase;
    const rr2 = r * (0.72 + 0.16 * Math.sin(i * 2.1));
    ctx.beginPath();
    ctx.arc(Math.cos(a) * rr2 * 0.92, Math.sin(a) * rr2 * 0.8, r * 0.16, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawTree(ctx, p, t) {
  const s = p.scale;
  const sway = Math.sin(t * 1.1 + p.seed) * 0.022 * (p.sway ?? 1);
  ctx.save();
  ctx.translate(p.x, p.y);
  groundShadow(ctx, 66 * s, 20 * s, 0.18);

  // trunk
  ctx.save();
  ctx.translate(0, 0);
  ctx.fillStyle = '#8a5f43';
  ctx.beginPath();
  ctx.moveTo(-11 * s, 2);
  ctx.quadraticCurveTo(-7 * s, -34 * s, -8 * s, -62 * s);
  ctx.lineTo(8 * s, -62 * s);
  ctx.quadraticCurveTo(6 * s, -30 * s, 11 * s, 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(90,58,40,0.5)';
  ctx.beginPath();
  ctx.moveTo(2 * s, 0);
  ctx.quadraticCurveTo(4 * s, -30 * s, 3 * s, -62 * s);
  ctx.lineTo(8 * s, -62 * s);
  ctx.quadraticCurveTo(6 * s, -30 * s, 11 * s, 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.rotate(sway);
  const pal = [
    ['#6fa05a', '#89b96a', '#a9d187'],
    ['#5f9b63', '#7cb877', '#9dd394'],
    ['#78a856', '#95c46b', '#b8dc8d'],
    ['#6b9b5e', '#87b673', '#a8cd8a'],
  ][p.variant % 4];

  // two back clumps
  canopy(ctx, -34 * s, -74 * s, 34 * s, pal[0], pal[0], pal[1], p.seed * 0.4, t);
  canopy(ctx, 32 * s, -70 * s, 30 * s, pal[0], pal[0], pal[1], p.seed * 0.7, t);
  // main mass
  canopy(ctx, 0, -104 * s, 48 * s, pal[0], pal[1], pal[2], p.seed * 0.31, t);
  // top tuft
  canopy(ctx, -10 * s, -136 * s, 26 * s, pal[1], pal[2], pal[2], p.seed * 0.5, t);

  ctx.restore();
}

export function drawPine(ctx, p, t) {
  const s = p.scale;
  const sway = Math.sin(t * 0.9 + p.seed * 1.7) * 0.018 * (p.sway ?? 1);
  ctx.save();
  ctx.translate(p.x, p.y);
  groundShadow(ctx, 50 * s, 16 * s, 0.17);

  ctx.fillStyle = '#7d5b40';
  ctx.beginPath();
  ctx.moveTo(-7 * s, 2);
  ctx.lineTo(-5 * s, -46 * s);
  ctx.lineTo(5 * s, -46 * s);
  ctx.lineTo(7 * s, 2);
  ctx.closePath();
  ctx.fill();

  ctx.rotate(sway);
  const layers = [
    { y: -46, w: 46, h: 44, c: '#4f8460' },
    { y: -82, w: 38, h: 40, c: '#5b9269' },
    { y: -114, w: 29, h: 36, c: '#68a071' },
    { y: -142, w: 20, h: 30, c: '#75ac79' },
  ];
  layers.forEach((L, i) => {
    ctx.fillStyle = L.c;
    ctx.beginPath();
    ctx.moveTo(0, (L.y - L.h) * s);
    ctx.quadraticCurveTo(L.w * 0.5 * s, (L.y - L.h * 0.32) * s, L.w * s, (L.y - 2) * s);
    ctx.quadraticCurveTo(L.w * 0.4 * s, (L.y + 5) * s, 0, (L.y + 7) * s);
    ctx.quadraticCurveTo(-L.w * 0.4 * s, (L.y + 5) * s, -L.w * s, (L.y - 2) * s);
    ctx.quadraticCurveTo(-L.w * 0.5 * s, (L.y - L.h * 0.32) * s, 0, (L.y - L.h) * s);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    ctx.beginPath();
    ctx.moveTo(0, (L.y - L.h) * s);
    ctx.quadraticCurveTo(-L.w * 0.5 * s, (L.y - L.h * 0.32) * s, -L.w * s, (L.y - 2) * s);
    ctx.quadraticCurveTo(-L.w * 0.2 * s, (L.y + 2) * s, 0, (L.y + 4) * s);
    ctx.fill();
  });
  ctx.restore();
}

export function drawSakura(ctx, p, t) {
  const s = p.scale;
  const sway = Math.sin(t * 1.25 + p.seed * 0.8) * 0.03 * (p.sway ?? 1);
  ctx.save();
  ctx.translate(p.x, p.y);
  groundShadow(ctx, 62 * s, 19 * s, 0.15);

  ctx.fillStyle = '#8d6b57';
  ctx.beginPath();
  ctx.moveTo(-12 * s, 2);
  ctx.quadraticCurveTo(-6 * s, -28 * s, -9 * s, -54 * s);
  ctx.lineTo(9 * s, -54 * s);
  ctx.quadraticCurveTo(7 * s, -26 * s, 12 * s, 2);
  ctx.closePath();
  ctx.fill();

  ctx.rotate(sway);
  const pal = [
    ['#f3b9c8', '#f8cfda', '#fde5ec'],
    ['#eeb0c2', '#f7c9d6', '#fde3ea'],
  ][p.variant % 2];

  canopy(ctx, -36 * s, -66 * s, 32 * s, pal[0], pal[0], pal[1], p.seed * 0.4, t);
  canopy(ctx, 34 * s, -62 * s, 29 * s, pal[0], pal[0], pal[1], p.seed * 0.6, t);
  canopy(ctx, 0, -96 * s, 45 * s, pal[0], pal[1], pal[2], p.seed * 0.3, t);
  canopy(ctx, -8 * s, -126 * s, 24 * s, pal[1], pal[2], pal[2], p.seed * 0.5, t);

  // a few blossoms
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + p.seed;
    const rx = Math.cos(a) * 40 * s;
    const ry = -96 * s + Math.sin(a) * 34 * s;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.arc(rx, ry, 2.4 * s, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

export function drawBush(ctx, p, t) {
  const s = p.scale;
  const sway = Math.sin(t * 1.6 + p.seed) * 0.02 * (p.sway ?? 1);
  ctx.save();
  ctx.translate(p.x, p.y);
  groundShadow(ctx, 34 * s, 12 * s, 0.16);
  ctx.rotate(sway);
  canopy(ctx, -14 * s, -20 * s, 20 * s, '#6d9c59', '#84b46c', '#9dcb80', p.seed, t);
  canopy(ctx, 14 * s, -18 * s, 18 * s, '#6d9c59', '#84b46c', '#9dcb80', p.seed + 1, t);
  canopy(ctx, 0, -30 * s, 22 * s, '#78a860', '#8fbe72', '#a9d489', p.seed + 2, t);
  // tiny flowers
  for (let i = 0; i < 4; i++) {
    const a = i * 1.9 + p.seed;
    ctx.fillStyle = i % 2 ? '#fff3b0' : '#ffd6e2';
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 16 * s, -26 * s + Math.sin(a) * 12 * s, 2.1 * s, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

export function drawRock(ctx, p) {
  const s = p.scale;
  ctx.save();
  ctx.translate(p.x, p.y);
  groundShadow(ctx, 32 * s, 12 * s, 0.18);
  ctx.fillStyle = '#a9b0b5';
  ctx.beginPath();
  ctx.moveTo(-26 * s, 0);
  ctx.quadraticCurveTo(-28 * s, -20 * s, -12 * s, -26 * s);
  ctx.quadraticCurveTo(2 * s, -32 * s, 16 * s, -24 * s);
  ctx.quadraticCurveTo(28 * s, -16 * s, 26 * s, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.42)';
  ctx.beginPath();
  ctx.moveTo(-14 * s, -24 * s);
  ctx.quadraticCurveTo(-2 * s, -30 * s, 10 * s, -22 * s);
  ctx.quadraticCurveTo(0, -18 * s, -14 * s, -24 * s);
  ctx.fill();
  ctx.fillStyle = 'rgba(120,160,110,0.55)';
  ctx.beginPath();
  ctx.ellipse(8 * s, -6 * s, 11 * s, 4.5 * s, 0.2, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawFlowerbed(ctx, p, t) {
  const s = p.scale;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = 'rgba(120,86,60,0.35)';
  ellipse(ctx, 0, -2, 46 * s, 14 * s);
  ctx.fill();
  const rand = rng(p.seed + 77);
  const cols = ['#fff1a8', '#ffc9d9', '#c9b6ff', '#ffd59e', '#ffffff'];
  for (let i = 0; i < 26; i++) {
    const x = rr(rand, -40, 40) * s;
    const y = rr(rand, -10, 2) * s;
    const h = rr(rand, 8, 18) * s;
    const c = cols[Math.floor(rand() * cols.length)];
    const sw = Math.sin(t * 2 + x * 0.3) * 1.6;
    ctx.strokeStyle = '#7aa85c';
    ctx.lineWidth = 1.6 * s;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + sw, y - h * 0.6, x + sw * 1.6, y - h);
    ctx.stroke();
    ctx.fillStyle = c;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * TAU;
      ctx.beginPath();
      ctx.arc(x + sw * 1.6 + Math.cos(a) * 2.4 * s, y - h + Math.sin(a) * 2.4 * s, 2.1 * s, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#f5b942';
    ctx.beginPath();
    ctx.arc(x + sw * 1.6, y - h, 1.5 * s, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/* ============================================================
   HOUSE — the cottage on the hill
   ============================================================ */

export function drawHouse(ctx, p, t) {
  const x = p.x;
  const y = p.y;
  const W = 168; // half width of the body
  const H = 176; // wall height
  ctx.save();
  ctx.translate(x, y);

  groundShadow(ctx, 210, 44, 0.22);

  /* ---- back wing ---- */
  ctx.save();
  ctx.translate(86, 14);
  ctx.fillStyle = '#e6d8c0';
  ctx.beginPath();
  roundRect(ctx, -58, -128, 116, 130, 10);
  ctx.fill();
  ctx.fillStyle = '#c9a17c';
  ctx.beginPath();
  ctx.moveTo(-76, -126);
  ctx.quadraticCurveTo(0, -186, 76, -126);
  ctx.quadraticCurveTo(0, -152, -76, -126);
  ctx.fill();
  ctx.fillStyle = 'rgba(120,90,60,0.35)';
  ctx.fillRect(-40, -96, 32, 38);
  ctx.fillStyle = 'rgba(255,240,205,0.9)';
  ctx.fillRect(-38, -94, 28, 34);
  ctx.restore();

  /* ---- main body ---- */
  const bodyGrad = ctx.createLinearGradient(-W, -H, W, 0);
  bodyGrad.addColorStop(0, '#f3e6cf');
  bodyGrad.addColorStop(0.5, '#fbf3e2');
  bodyGrad.addColorStop(1, '#e8d8bc');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  roundRect(ctx, -W, -H, W * 2, H + 4, 8);
  ctx.fill();

  /* timber framing */
  ctx.strokeStyle = 'rgba(150,110,78,0.55)';
  ctx.lineWidth = 5;
  ctx.strokeRect(-W + 4, -H + 4, W * 2 - 8, H - 2);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-W, -92);
  ctx.lineTo(W, -92);
  ctx.moveTo(-W, -150);
  ctx.lineTo(W, -150);
  ctx.stroke();

  /* ---- roof ---- */
  const roofGrad = ctx.createLinearGradient(0, -H - 150, 0, -H + 10);
  roofGrad.addColorStop(0, '#9c6b8e');
  roofGrad.addColorStop(0.45, '#b87fa0');
  roofGrad.addColorStop(1, '#8a5c7e');
  ctx.fillStyle = roofGrad;
  ctx.beginPath();
  ctx.moveTo(-W - 46, -H + 16);
  ctx.quadraticCurveTo(-W - 60, -H - 6, -W - 20, -H - 20);
  ctx.quadraticCurveTo(-40, -H - 104, 0, -H - 128);
  ctx.quadraticCurveTo(40, -H - 104, W + 20, -H - 20);
  ctx.quadraticCurveTo(W + 60, -H - 6, W + 46, -H + 16);
  ctx.quadraticCurveTo(W * 0.5, -H - 6, 0, -H - 8);
  ctx.quadraticCurveTo(-W * 0.5, -H - 6, -W - 46, -H + 16);
  ctx.closePath();
  ctx.fill();

  /* roof shingle rows */
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    const yy = -H - 120 + i * 20;
    ctx.beginPath();
    ctx.moveTo(-W - 50, yy + 6);
    ctx.quadraticCurveTo(0, yy - 16, W + 50, yy + 6);
    ctx.stroke();
  }
  ctx.restore();

  /* ridge highlight */
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-W - 40, -H + 12);
  ctx.quadraticCurveTo(0, -H - 122, W + 40, -H + 12);
  ctx.stroke();

  /* ---- chimney ---- */
  ctx.fillStyle = '#cf9a7a';
  ctx.beginPath();
  roundRect(ctx, W - 96, -H - 118, 34, 70, 5);
  ctx.fill();
  ctx.fillStyle = '#b5855f';
  ctx.beginPath();
  roundRect(ctx, W - 102, -H - 124, 46, 12, 4);
  ctx.fill();
  /* smoke */
  for (let i = 0; i < 5; i++) {
    const ph = (t * 0.28 + i * 0.2) % 1;
    const sx = W - 79 + Math.sin(ph * 5 + i) * 14;
    const sy = -H - 128 - ph * 96;
    ctx.fillStyle = `rgba(255,255,255,${0.34 * (1 - ph)})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 6 + ph * 17, 0, TAU);
    ctx.fill();
  }

  /* ---- windows ---- */
  function windowAt(wx, wy, ww, wh, glow) {
    ctx.fillStyle = '#f2e3c4';
    ctx.beginPath();
    roundRect(ctx, wx - 4, wy - 4, ww + 8, wh + 8, 5);
    ctx.fill();
    const g = ctx.createLinearGradient(wx, wy, wx, wy + wh);
    g.addColorStop(0, glow ? '#ffe9a8' : '#bfd9e0');
    g.addColorStop(1, glow ? '#f7c86a' : '#9fc0cc');
    ctx.fillStyle = g;
    ctx.beginPath();
    roundRect(ctx, wx, wy, ww, wh, 3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(140,102,70,0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(wx + ww / 2, wy);
    ctx.lineTo(wx + ww / 2, wy + wh);
    ctx.moveTo(wx, wy + wh / 2);
    ctx.lineTo(wx + ww, wy + wh / 2);
    ctx.stroke();
    if (glow) {
      ctx.fillStyle = 'rgba(255,220,140,0.18)';
      ctx.beginPath();
      ctx.arc(wx + ww / 2, wy + wh / 2, ww * 0.85, 0, TAU);
      ctx.fill();
    }
  }
  windowAt(-W + 24, -H + 22, 62, 54, true);
  windowAt(W - 92, -H + 22, 62, 54, true);

  /* flower boxes */
  ctx.fillStyle = '#8b6244';
  ctx.beginPath();
  roundRect(ctx, -W + 18, -H + 78, 74, 13, 3);
  ctx.fill();
  ctx.beginPath();
  roundRect(ctx, W - 98, -H + 78, 74, 13, 3);
  ctx.fill();
  for (let i = 0; i < 12; i++) {
    const fx = -W + 24 + (i % 6) * 12 + (i > 5 ? W * 2 - 116 : 0);
    ctx.fillStyle = i % 3 === 0 ? '#ff9fb8' : i % 3 === 1 ? '#ffd166' : '#e2a8ff';
    ctx.beginPath();
    ctx.arc(fx, -H + 76, 3.4, 0, TAU);
    ctx.fill();
  }

  /* ---- door ---- */
  const doorX = 6;
  ctx.fillStyle = '#8b5e3c';
  ctx.beginPath();
  ctx.moveTo(doorX - 34, 0);
  ctx.lineTo(doorX - 34, -58);
  ctx.quadraticCurveTo(doorX, -96, doorX + 34, -58);
  ctx.lineTo(doorX + 34, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#a2704a';
  ctx.beginPath();
  ctx.moveTo(doorX - 27, 0);
  ctx.lineTo(doorX - 27, -55);
  ctx.quadraticCurveTo(doorX, -88, doorX + 27, -55);
  ctx.lineTo(doorX + 27, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(140,190,170,0.85)';
  ctx.beginPath();
  ctx.moveTo(doorX - 17, -56);
  ctx.quadraticCurveTo(doorX, -78, doorX + 17, -56);
  ctx.lineTo(doorX + 17, -34);
  ctx.lineTo(doorX - 17, -34);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f0c96b';
  ctx.beginPath();
  ctx.arc(doorX + 18, -24, 4, 0, TAU);
  ctx.fill();
  /* step */
  ctx.fillStyle = '#cfc3ae';
  ctx.beginPath();
  roundRect(ctx, doorX - 44, -2, 88, 10, 4);
  ctx.fill();

  /* ---- climbing vines ---- */
  ctx.strokeStyle = '#6f9a5a';
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    const bx = -W + 12 + i * 10;
    ctx.moveTo(bx, -4);
    ctx.bezierCurveTo(bx - 12, -50, bx + 16, -90, bx - 4, -128);
    ctx.stroke();
  }
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = i % 2 ? '#7fb265' : '#95c77a';
    ctx.beginPath();
    ctx.ellipse(-W + 10 + (i % 3) * 11 + Math.sin(i) * 6, -16 - i * 13, 6, 4, i, 0, TAU);
    ctx.fill();
  }

  /* ---- porch light glow (dusk-friendly) ---- */
  ctx.fillStyle = 'rgba(255,206,120,0.22)';
  ctx.beginPath();
  ctx.arc(doorX, -66, 34, 0, TAU);
  ctx.fill();

  ctx.restore();
}

/* ============================================================
   WINDMILL
   ============================================================ */

export function drawWindmill(ctx, p, t) {
  ctx.save();
  ctx.translate(p.x, p.y);
  groundShadow(ctx, 62, 18, 0.2);

  /* tower */
  ctx.fillStyle = '#efe4d1';
  ctx.beginPath();
  ctx.moveTo(-34, 0);
  ctx.lineTo(-22, -132);
  ctx.lineTo(22, -132);
  ctx.lineTo(34, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(190,170,140,0.35)';
  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.lineTo(8, -132);
  ctx.lineTo(22, -132);
  ctx.lineTo(34, 0);
  ctx.closePath();
  ctx.fill();

  /* cap */
  ctx.fillStyle = '#c98a72';
  ctx.beginPath();
  ctx.moveTo(-30, -130);
  ctx.quadraticCurveTo(0, -176, 30, -130);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e0aa8d';
  ctx.beginPath();
  ctx.moveTo(-18, -132);
  ctx.quadraticCurveTo(0, -160, 18, -132);
  ctx.closePath();
  ctx.fill();

  /* door + window */
  ctx.fillStyle = '#8d6244';
  ctx.beginPath();
  ctx.moveTo(-13, 0);
  ctx.lineTo(-13, -34);
  ctx.quadraticCurveTo(0, -50, 13, -34);
  ctx.lineTo(13, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffe9ad';
  ctx.beginPath();
  ctx.roundRect?.(-10, -108, 20, 18, 3);
  if (!ctx.roundRect) ctx.rect(-10, -108, 20, 18);
  ctx.fill();

  /* sails */
  ctx.save();
  ctx.translate(0, -142);
  ctx.rotate(t * 0.45);
  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.rotate((i / 4) * TAU);
    ctx.strokeStyle = '#9b7b5c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -76);
    ctx.stroke();
    ctx.fillStyle = 'rgba(252,246,232,0.94)';
    ctx.beginPath();
    ctx.moveTo(2, -14);
    ctx.lineTo(24, -20);
    ctx.lineTo(24, -72);
    ctx.lineTo(2, -76);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(160,140,115,0.6)';
    ctx.lineWidth = 1.4;
    for (let k = 1; k < 4; k++) {
      ctx.beginPath();
      ctx.moveTo(2, -14 - k * 15);
      ctx.lineTo(24, -20 - k * 13);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.fillStyle = '#6f8f8a';
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

/* ============================================================
   SMALL DECOR
   ============================================================ */

export function drawMailbox(ctx, p, t) {
  ctx.save();
  ctx.translate(p.x, p.y);
  groundShadow(ctx, 16, 6, 0.2);
  ctx.fillStyle = '#8b6244';
  ctx.beginPath();
  roundRect(ctx, -4, -46, 8, 46, 3);
  ctx.fill();
  ctx.fillStyle = '#e2705f';
  ctx.beginPath();
  roundRect(ctx, -17, -74, 34, 32, 13);
  ctx.fill();
  ctx.fillStyle = '#c9584a';
  ctx.beginPath();
  roundRect(ctx, -17, -74, 34, 12, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,60,50,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-9, -68);
  ctx.lineTo(9, -68);
  ctx.stroke();
  /* flag */
  ctx.save();
  ctx.translate(15, -66);
  ctx.rotate(-0.4 + Math.sin(t * 2) * 0.06);
  ctx.fillStyle = '#f2c94c';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(16, 5);
  ctx.lineTo(0, 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

export function drawSignpost(ctx, p, t) {
  ctx.save();
  ctx.translate(p.x, p.y);
  groundShadow(ctx, 14, 6, 0.2);
  ctx.fillStyle = '#9a7051';
  ctx.beginPath();
  roundRect(ctx, -4, -70, 8, 70, 3);
  ctx.fill();
  ctx.fillStyle = '#d9b78c';
  ctx.beginPath();
  ctx.moveTo(-40, -74);
  ctx.lineTo(34, -74);
  ctx.lineTo(48, -60);
  ctx.lineTo(34, -46);
  ctx.lineTo(-40, -46);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#7b5b3e';
  ctx.font = 'bold 13px "Baloo 2", "Quicksand", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(p.text ?? 'Isle', -4, -60);
  ctx.restore();
}

export function drawBench(ctx, p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.flip) ctx.scale(-1, 1);
  groundShadow(ctx, 42, 12, 0.18);
  ctx.fillStyle = '#8a6244';
  [-26, 26].forEach((bx) => {
    ctx.beginPath();
    roundRect(ctx, bx - 4, -22, 8, 22, 3);
    ctx.fill();
  });
  ctx.fillStyle = '#c28f5e';
  ctx.beginPath();
  roundRect(ctx, -42, -30, 84, 12, 5);
  ctx.fill();
  ctx.fillStyle = '#a8784d';
  ctx.beginPath();
  roundRect(ctx, -40, -52, 80, 10, 5);
  ctx.fill();
  ctx.beginPath();
  roundRect(ctx, -42, -40, 84, 8, 4);
  ctx.fill();
  ctx.restore();
}

export function drawLamp(ctx, p, t) {
  ctx.save();
  ctx.translate(p.x, p.y);
  groundShadow(ctx, 14, 6, 0.2);
  ctx.fillStyle = '#6c7d78';
  ctx.beginPath();
  roundRect(ctx, -14, -8, 28, 8, 3);
  ctx.fill();
  ctx.beginPath();
  roundRect(ctx, -4, -86, 8, 80, 3);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-12, -86);
  ctx.lineTo(12, -86);
  ctx.lineTo(8, -100);
  ctx.lineTo(-8, -100);
  ctx.closePath();
  ctx.fill();
  /* globe */
  const pulse = 0.72 + Math.sin(t * 1.6 + p.x) * 0.08;
  const g = ctx.createRadialGradient(0, -110, 2, 0, -110, 26);
  g.addColorStop(0, `rgba(255,236,170,${pulse})`);
  g.addColorStop(0.5, `rgba(255,210,120,${pulse * 0.4})`);
  g.addColorStop(1, 'rgba(255,200,110,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, -110, 26, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff4c9';
  ctx.beginPath();
  ctx.arc(0, -110, 9, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawGarden(ctx, p, t) {
  ctx.save();
  ctx.translate(p.x, p.y);
  /* soil bed */
  ctx.fillStyle = 'rgba(126,90,62,0.85)';
  ctx.beginPath();
  roundRect(ctx, -108, -30, 216, 34, 12);
  ctx.fill();
  ctx.fillStyle = 'rgba(150,112,80,0.9)';
  ctx.beginPath();
  roundRect(ctx, -100, -26, 200, 16, 8);
  ctx.fill();
  /* turnips */
  for (let i = 0; i < 5; i++) {
    const gx = -88 + i * 44;
    const bob = Math.sin(t * 1.6 + i) * 1.6;
    // leaves
    ctx.fillStyle = '#79b06a';
    for (let k = 0; k < 3; k++) {
      const a = -Math.PI / 2 + (k - 1) * 0.6;
      ctx.beginPath();
      ctx.ellipse(gx + Math.cos(a) * 9, -34 + bob + Math.sin(a) * 9, 9, 5, a, 0, TAU);
      ctx.fill();
    }
    // bulb
    ctx.fillStyle = '#efe6d8';
    ctx.beginPath();
    ctx.arc(gx, -26 + bob, 9, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#e6d8c4';
    ctx.beginPath();
    ctx.arc(gx + 3, -24 + bob, 5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(200,150,160,0.4)';
    ctx.beginPath();
    ctx.arc(gx - 3, -29 + bob, 3.4, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

export function drawTent(ctx, p, t) {
  ctx.save();
  ctx.translate(p.x, p.y);
  groundShadow(ctx, 70, 20, 0.18);
  /* back */
  ctx.fillStyle = '#f2d9a8';
  ctx.beginPath();
  ctx.moveTo(0, -118);
  ctx.lineTo(58, 0);
  ctx.lineTo(-58, 0);
  ctx.closePath();
  ctx.fill();
  /* stripes */
  ctx.save();
  ctx.clip();
  for (let i = -3; i <= 3; i++) {
    ctx.strokeStyle = 'rgba(201,120,96,0.35)';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(0, -118);
    ctx.lineTo(i * 26, 4);
    ctx.stroke();
  }
  ctx.restore();
  /* opening */
  ctx.fillStyle = '#7d5a44';
  ctx.beginPath();
  ctx.moveTo(0, -96);
  ctx.lineTo(26, 0);
  ctx.lineTo(-26, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e7b06f';
  ctx.beginPath();
  ctx.moveTo(0, -70);
  ctx.lineTo(16, 0);
  ctx.lineTo(-16, 0);
  ctx.closePath();
  ctx.fill();
  /* pennant */
  ctx.strokeStyle = '#a67c52';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -118);
  ctx.lineTo(0, -136);
  ctx.stroke();
  ctx.fillStyle = '#e2705f';
  const w2 = Math.sin(t * 3) * 3;
  ctx.beginPath();
  ctx.moveTo(0, -136);
  ctx.quadraticCurveTo(14, -132 + w2, 26, -132);
  ctx.lineTo(0, -124);
  ctx.fill();
  ctx.restore();
}

/* ============================================================
   PODIUM EXHIBITS
   ============================================================ */

const PODIUM_TINT = ['#a8d48a', '#c9b2f0', '#f0c98a', '#f2a9b5', '#a9c9f0', '#f5d98a'];

export function drawEmblem(ctx, icon, size, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.12;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const s = size;
  switch (icon) {
    case 'leaf': {
      ctx.beginPath();
      ctx.moveTo(-s * 0.42, s * 0.42);
      ctx.quadraticCurveTo(-s * 0.5, -s * 0.4, s * 0.42, -s * 0.42);
      ctx.quadraticCurveTo(s * 0.5, s * 0.4, -s * 0.42, s * 0.42);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = s * 0.07;
      ctx.beginPath();
      ctx.moveTo(-s * 0.3, s * 0.3);
      ctx.lineTo(s * 0.26, -s * 0.26);
      ctx.stroke();
      break;
    }
    case 'gem': {
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.5);
      ctx.lineTo(s * 0.42, -s * 0.16);
      ctx.lineTo(0, s * 0.5);
      ctx.lineTo(-s * 0.42, -s * 0.16);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.5);
      ctx.lineTo(s * 0.42, -s * 0.16);
      ctx.lineTo(0, -s * 0.04);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'book': {
      ctx.beginPath();
      ctx.roundRect?.(-s * 0.44, -s * 0.4, s * 0.88, s * 0.8, s * 0.1);
      if (!ctx.roundRect) ctx.rect(-s * 0.44, -s * 0.4, s * 0.88, s * 0.8);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(-s * 0.06, -s * 0.4, s * 0.06, s * 0.8);
      ctx.fillRect(-s * 0.34, -s * 0.22, s * 0.2, s * 0.05);
      ctx.fillRect(-s * 0.34, -s * 0.06, s * 0.2, s * 0.05);
      ctx.fillRect(s * 0.1, -s * 0.22, s * 0.2, s * 0.05);
      ctx.fillRect(s * 0.1, -s * 0.06, s * 0.2, s * 0.05);
      break;
    }
    case 'star': {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i / 10) * TAU;
        const r = i % 2 ? s * 0.2 : s * 0.5;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'cap': {
      ctx.beginPath();
      ctx.moveTo(-s * 0.5, -s * 0.12);
      ctx.lineTo(0, -s * 0.42);
      ctx.lineTo(s * 0.5, -s * 0.12);
      ctx.lineTo(0, s * 0.16);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect?.(-s * 0.3, 0, s * 0.6, s * 0.3, s * 0.06);
      if (!ctx.roundRect) ctx.rect(-s * 0.3, 0, s * 0.6, s * 0.3);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = s * 0.06;
      ctx.beginPath();
      ctx.moveTo(s * 0.44, -s * 0.1);
      ctx.lineTo(s * 0.44, s * 0.22);
      ctx.stroke();
      break;
    }
    case 'mail': {
      ctx.beginPath();
      ctx.roundRect?.(-s * 0.45, -s * 0.32, s * 0.9, s * 0.64, s * 0.08);
      if (!ctx.roundRect) ctx.rect(-s * 0.45, -s * 0.32, s * 0.9, s * 0.64);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = s * 0.08;
      ctx.beginPath();
      ctx.moveTo(-s * 0.42, -s * 0.26);
      ctx.lineTo(0, s * 0.06);
      ctx.lineTo(s * 0.42, -s * 0.26);
      ctx.stroke();
      break;
    }
    default: {
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.4, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function drawPodium(ctx, p, t, highlight = 0) {
  const spot = p.podium;
  const tint = PODIUM_TINT[p.variant % PODIUM_TINT.length];
  ctx.save();
  ctx.translate(p.x, p.y);
  groundShadow(ctx, 58, 20, 0.2);

  /* stone base */
  ctx.fillStyle = '#cfc6b4';
  ctx.beginPath();
  ctx.ellipse(0, -4, 44, 15, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ded5c2';
  ctx.beginPath();
  roundRect(ctx, -30, -62, 60, 60, 8);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  roundRect(ctx, -26, -60, 20, 56, 6);
  ctx.fill();
  /* carved leaf motif */
  ctx.strokeStyle = 'rgba(150,140,120,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -34, 12, 0.3, Math.PI - 0.3, true);
  ctx.stroke();

  /* top plate */
  ctx.fillStyle = '#ece3d0';
  ctx.beginPath();
  ctx.roundRect?.(-40, -74, 80, 16, 7);
  if (!ctx.roundRect) ctx.rect(-40, -74, 80, 16);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.roundRect?.(-36, -72, 72, 6, 3);
  if (!ctx.roundRect) ctx.rect(-36, -72, 72, 6);
  ctx.fill();

  /* glow column */
  const glow = 0.35 + 0.15 * Math.sin(t * 2 + p.variant) + highlight * 0.5;
  const g = ctx.createLinearGradient(0, -74, 0, -190);
  g.addColorStop(0, rgba(tint, 0.32 * glow));
  g.addColorStop(1, rgba(tint, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-26, -74);
  ctx.quadraticCurveTo(-40, -150, -16, -186);
  ctx.lineTo(16, -186);
  ctx.quadraticCurveTo(40, -150, 26, -74);
  ctx.closePath();
  ctx.fill();

  /* floating emblem */
  const bob = Math.sin(t * 1.5 + p.variant * 1.3) * 6;
  ctx.save();
  ctx.translate(0, -142 + bob);
  ctx.rotate(Math.sin(t * 1.1 + p.variant) * 0.09);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(0, 0, 27, 0, TAU);
  ctx.fill();
  ctx.fillStyle = tint;
  ctx.beginPath();
  ctx.arc(0, 0, 23, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  drawEmblem(ctx, spot.icon, 30, '#ffffff');
  ctx.restore();

  /* orbiting sparkles */
  for (let i = 0; i < 4; i++) {
    const a = t * 0.9 + (i / 4) * TAU + p.variant;
    const rr2 = 34 + Math.sin(t * 1.4 + i) * 6;
    const sx = Math.cos(a) * rr2;
    const sy = -142 + bob + Math.sin(a) * rr2 * 0.55;
    ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.3 * Math.sin(t * 3 + i)})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 2.4, 0, TAU);
    ctx.fill();
  }

  /* label plate on the base */
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath();
  ctx.roundRect?.(-34, -60, 68, 17, 4);
  if (!ctx.roundRect) ctx.rect(-34, -60, 68, 17);
  ctx.fill();
  ctx.fillStyle = '#5b6b58';
  ctx.font = 'bold 10px "Baloo 2", "Quicksand", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(spot.hint.toUpperCase(), 0, -51);

  ctx.restore();
}

/* ============================================================
   dispatch
   ============================================================ */

export const DRAWERS = {
  tree: drawTree,
  pine: drawPine,
  sakura: drawSakura,
  bush: drawBush,
  rock: drawRock,
  flowerbed: drawFlowerbed,
  house: drawHouse,
  windmill: drawWindmill,
  mailbox: drawMailbox,
  signpost: drawSignpost,
  bench: drawBench,
  lamp: drawLamp,
  garden: drawGarden,
  tent: drawTent,
  podium: drawPodium,
};

/** Approximate draw half-width used for culling. */
export const PROP_EXTENT = {
  tree: 130,
  pine: 90,
  sakura: 120,
  bush: 50,
  rock: 40,
  flowerbed: 60,
  house: 230,
  windmill: 100,
  mailbox: 26,
  signpost: 56,
  bench: 50,
  lamp: 30,
  garden: 114,
  tent: 76,
  podium: 60,
};
