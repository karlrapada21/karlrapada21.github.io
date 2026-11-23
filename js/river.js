/* ============================================================
   River & bridge — the heart of the little island.
   ============================================================ */

import { TAU, rgba, rng, rr } from './core.js';
import { RIVER_CENTER, RIVER_LEFT, RIVER_RIGHT, BRIDGE } from './layout.js';

/* ---------- pre-baked static bits (built once) ---------- */

let BAKED = null;

function buildBaked() {
  const n = RIVER_CENTER.length;
  // bank pebbles
  const rand = rng(555);
  const pebbles = [];
  for (let i = 4; i < n - 4; i += 1) {
    if (rand() < 0.45) continue;
    const p = RIVER_CENTER[i];
    [-1, 1].forEach((side) => {
      const off = p.hw + rr(rand, 0, 8);
      pebbles.push({
        x: p.x + p.nx * off * side,
        y: p.y + p.ny * off * side,
        r: rr(rand, 2.4, 5.6),
        a: rand(),
      });
    });
  }
  // reeds / grass tufts along the bank
  const reeds = [];
  for (let i = 3; i < n - 3; i += 2) {
    if (rand() < 0.35) continue;
    const p = RIVER_CENTER[i];
    const side = rand() < 0.5 ? -1 : 1;
    if (Math.abs(p.x - BRIDGE.cx) < 130) continue;
    const off = p.hw + rr(rand, 4, 16);
    reeds.push({
      x: p.x + p.nx * off * side,
      y: p.y + p.ny * off * side,
      h: rr(rand, 10, 22),
      ph: rand() * TAU,
      side,
    });
  }
  // stationary foam patches (the sparkling stuff gets drawn per frame)
  const glints = [];
  for (let i = 0; i < 130; i++) {
    const p = RIVER_CENTER[Math.floor(rand() * n)];
    const off = rr(rand, -p.hw * 0.85, p.hw * 0.85);
    glints.push({
      x: p.x + p.nx * off,
      y: p.y + p.ny * off,
      ph: rand() * TAU,
      sp: rr(rand, 0.6, 1.9),
      len: rr(rand, 5, 16),
    });
  }
  // lily pads
  const lilies = [];
  for (let i = 0; i < 22; i++) {
    const p = RIVER_CENTER[Math.floor(rand() * n)];
    const off = rr(rand, -p.hw * 0.7, p.hw * 0.7);
    const x = p.x + p.nx * off;
    const y = p.y + p.ny * off;
    if (Math.abs(x - BRIDGE.cx) < 90) continue;
    lilies.push({ x, y, r: rr(rand, 7, 13), ph: rand() * TAU, flower: rand() < 0.3 });
  }
  // bank grass tufts on the outer bank line
  const tufts = [];
  for (let i = 0; i < n; i += 1) {
    [-1, 1].forEach((side) => {
      const p = RIVER_CENTER[i];
      const off = p.hw + rr(rand, 10, 26);
      tufts.push({
        x: p.x + p.nx * off * side,
        y: p.y + p.ny * off * side,
        h: rr(rand, 6, 15),
        ph: rand() * TAU,
      });
    });
  }
  return { pebbles, reeds, glints, lilies, tufts };
}

/* ---------- river bank shape ---------- */

function bankPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(RIVER_LEFT[0].x, RIVER_LEFT[0].y);
  for (let i = 1; i < RIVER_LEFT.length; i++) ctx.lineTo(RIVER_LEFT[i].x, RIVER_LEFT[i].y);
  for (let i = RIVER_RIGHT.length - 1; i >= 0; i--) ctx.lineTo(RIVER_RIGHT[i].x, RIVER_RIGHT[i].y);
  ctx.closePath();
}

/* ---------- the animated water ---------- */

/**
 * @param opts.back  {x,y,h}: only draw the part of the water inside this
 *                   world-space rect (used to split the layer around props)
 * @param opts.mode  'all' | 'bed' | 'detail'
 */
export function drawRiver(ctx, t, camera, opts = {}) {
  if (!BAKED) BAKED = buildBaked();
  const back = opts.back;
  const withBed = opts.mode !== 'detail';

  if (back) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(back.x, back.y, back.w, back.h);
    ctx.clip();
  }

  /* --- bed (sand / mud under the water) --- */
  if (withBed) {
    ctx.save();
    bankPath(ctx);
    ctx.clip();

    const bed = ctx.createLinearGradient(0, 700, 0, 1200);
    bed.addColorStop(0, '#7fb0a8');
    bed.addColorStop(0.5, '#6aa39c');
    bed.addColorStop(1, '#5f9a94');
    ctx.fillStyle = bed;
    ctx.fillRect(camera.x - 100, camera.y - 100, camera.w + 200, camera.h + 200);

    /* deep middle band */
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(RIVER_CENTER[0].x, RIVER_CENTER[0].y);
    for (const p of RIVER_CENTER) ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = 'rgba(56,104,110,0.35)';
    ctx.lineWidth = 74;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();

    /* animated flow bands — two layers drifting downstream */
    for (let layer = 0; layer < 3; layer++) {
      const speed = 26 + layer * 12;
      ctx.save();
      bankPath(ctx);
      ctx.clip();

      ctx.strokeStyle = `rgba(226,248,246,${0.16 - layer * 0.04})`;
      ctx.lineWidth = 7 - layer;
      ctx.lineCap = 'round';
      const step = 5;
      for (let i = 2 + layer; i < RIVER_CENTER.length - 2; i += step) {
        const p = RIVER_CENTER[i];
        const nxt = RIVER_CENTER[Math.min(RIVER_CENTER.length - 1, i + 2)];
        const ph = Math.sin(t * 1.6 + i * 0.42 + layer) * 0.5 + 0.5;
        const spread = (i % 3) - 1;
        const ox = p.nx * p.hw * 0.52 * spread;
        const oy = p.ny * p.hw * 0.52 * spread;
        ctx.globalAlpha = 0.28 + ph * 0.5;
        ctx.beginPath();
        ctx.moveTo(p.x + ox, p.y + oy);
        ctx.quadraticCurveTo(
          (p.x + nxt.x) / 2 + p.tx * 16,
          (p.y + nxt.y) / 2 + p.ty * 16,
          nxt.x + ox,
          nxt.y + oy
        );
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    /* sparkles */
    ctx.save();
    for (const g of BAKED.glints) {
      const a = 0.5 + 0.5 * Math.sin(t * g.sp * 2.4 + g.ph);
      if (a < 0.35) continue;
      const drift = Math.sin(t * 0.6 + g.ph) * 4;
      ctx.strokeStyle = `rgba(255,255,255,${0.16 + a * 0.5})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(g.x + drift - g.len / 2, g.y);
      ctx.lineTo(g.x + drift + g.len / 2, g.y);
      ctx.stroke();
    }
    ctx.restore();

    /* lily pads */
    for (const l of BAKED.lilies) {
      const bob = Math.sin(t * 1.1 + l.ph) * 1.6;
      ctx.save();
      ctx.translate(l.x, l.y + bob);
      ctx.rotate(Math.sin(t * 0.5 + l.ph) * 0.08);
      ctx.fillStyle = '#69a565';
      ctx.beginPath();
      ctx.arc(0, 0, l.r, 0.32, TAU - 0.32);
      ctx.lineTo(0, 0);
      ctx.fill();
      ctx.fillStyle = 'rgba(140,200,140,0.55)';
      ctx.beginPath();
      ctx.arc(-l.r * 0.22, -l.r * 0.24, l.r * 0.5, 0, TAU);
      ctx.fill();
      if (l.flower) {
        ctx.fillStyle = '#fbe3ef';
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * TAU + l.ph;
          ctx.beginPath();
          ctx.ellipse(Math.cos(a) * 4, Math.sin(a) * 4, 4, 2.6, a, 0, TAU);
          ctx.fill();
        }
        ctx.fillStyle = '#f6c85f';
        ctx.beginPath();
        ctx.arc(0, 0, 2.2, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.restore(); // clip
  }

  /* --- bank shading (soft inner shadow) --- */
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(RIVER_LEFT[0].x, RIVER_LEFT[0].y);
  for (const p of RIVER_LEFT) ctx.lineTo(p.x, p.y);
  ctx.strokeStyle = 'rgba(52,88,84,0.30)';
  ctx.lineWidth = 26;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(RIVER_RIGHT[0].x, RIVER_RIGHT[0].y);
  for (const p of RIVER_RIGHT) ctx.lineTo(p.x, p.y);
  ctx.stroke();
  ctx.restore();

  /* --- wet sand lip --- */
  ctx.save();
  for (const line of [RIVER_LEFT, RIVER_RIGHT]) {
    for (let i = 0; i < line.length - 1; i += 1) {
      const a = line[i];
      const b = line[i + 1];
      const wob = Math.sin(t * 2 + i * 0.5) * 2.5;
      ctx.strokeStyle = 'rgba(240,236,220,0.55)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y + wob);
      ctx.lineTo(b.x, b.y + wob);
      ctx.stroke();
    }
  }
  ctx.restore();

  /* --- pebbles + reeds on the banks --- */
  for (const pb of BAKED.pebbles) {
    ctx.fillStyle = pb.a > 0.5 ? '#cfc8b6' : '#b6b3a4';
    ctx.beginPath();
    ctx.ellipse(pb.x, pb.y, pb.r, pb.r * 0.75, pb.a * 3, 0, TAU);
    ctx.fill();
  }
  for (const r of BAKED.reeds) {
    const sw = Math.sin(t * 1.9 + r.ph) * 4;
    ctx.strokeStyle = '#7fae67';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath();
      ctx.moveTo(r.x + k * 3, r.y);
      ctx.quadraticCurveTo(r.x + k * 3 + sw, r.y - r.h * 0.6, r.x + k * 3 + sw * 2.2, r.y - r.h);
      ctx.stroke();
    }
  }

  /* --- ambient animated white foam along the banks --- */
  ctx.save();
  ctx.lineCap = 'round';
  for (const line of [RIVER_LEFT, RIVER_RIGHT]) {
    for (let i = 0; i < line.length; i++) {
      const ph = Math.sin(t * 2.2 + i * 0.55) * 0.5 + 0.5;
      if (ph < 0.55) continue;
      const p = line[i];
      const a = (ph - 0.55) / 0.45;
      ctx.fillStyle = `rgba(255,255,255,${a * 0.7})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y + Math.sin(t + i) * 2, 1.6 + a * 2.2, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();

  if (back) ctx.restore();
}

/* ============================================================
   BRIDGE — arched wooden bridge over the river
   ============================================================ */

export function drawBridge(ctx, t) {
  const cx = BRIDGE.cx;
  const halfW = BRIDGE.halfW;
  const y0 = BRIDGE.y0;
  const y1 = BRIDGE.y1;
  const h = y1 - y0;

  /* shadow under the bridge */
  ctx.save();
  ctx.fillStyle = 'rgba(40,70,70,0.28)';
  ctx.beginPath();
  ctx.ellipse(cx, (y0 + y1) / 2, halfW + 16, h * 0.34, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  /* --- support posts --- */
  ctx.save();
  [y0 + 22, y1 - 22].forEach((py) => {
    [-1, 1].forEach((side) => {
      ctx.fillStyle = '#8a6244';
      ctx.beginPath();
      ctx.roundRect?.(
        cx + side * (halfW - 4) - 6,
        py - 5,
        12,
        34,
        4
      );
      if (!ctx.roundRect) ctx.rect(cx + side * (halfW - 4) - 6, py - 5, 12, 34);
      ctx.fill();
      ctx.fillStyle = 'rgba(90,60,40,0.4)';
      ctx.fillRect(cx + side * (halfW - 4) - 1, py - 4, 3, 32);
    });
  });
  ctx.restore();

  /* --- deck --- */
  const deck = ctx.createLinearGradient(cx - halfW, 0, cx + halfW, 0);
  deck.addColorStop(0, '#c69a6c');
  deck.addColorStop(0.35, '#dcb083');
  deck.addColorStop(0.62, '#cfa274');
  deck.addColorStop(1, '#a97e56');
  ctx.fillStyle = deck;
  ctx.beginPath();
  ctx.roundRect?.(cx - halfW, y0, halfW * 2, h, 16);
  if (!ctx.roundRect) ctx.rect(cx - halfW, y0, halfW * 2, h);
  ctx.fill();

  /* planks (crosswise) */
  ctx.save();
  ctx.beginPath();
  ctx.roundRect?.(cx - halfW, y0, halfW * 2, h, 16);
  if (!ctx.roundRect) ctx.rect(cx - halfW, y0, halfW * 2, h);
  ctx.clip();
  for (let y = y0 + 10; y < y1; y += 17) {
    ctx.strokeStyle = 'rgba(122,83,52,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - halfW, y);
    ctx.lineTo(cx + halfW, y);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,236,205,0.30)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(cx - halfW, y + 2);
    ctx.lineTo(cx + halfW, y + 2);
    ctx.stroke();
  }
  /* subtle arch shading */
  const arch = ctx.createLinearGradient(0, y0, 0, y1);
  arch.addColorStop(0, 'rgba(120,90,60,0.28)');
  arch.addColorStop(0.18, 'rgba(255,245,220,0.22)');
  arch.addColorStop(0.5, 'rgba(255,255,255,0.05)');
  arch.addColorStop(0.86, 'rgba(130,100,70,0.12)');
  arch.addColorStop(1, 'rgba(110,80,55,0.32)');
  ctx.fillStyle = arch;
  ctx.fill();
  ctx.restore();

  /* --- railings --- */
  ctx.save();
  [-1, 1].forEach((side) => {
    const rx = cx + side * (halfW - 8);
    ctx.strokeStyle = '#a1754f';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(rx, y0 + 16);
    ctx.lineTo(rx, y1 - 16);
    ctx.stroke();
    ctx.strokeStyle = '#c69a6c';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(rx, y0 + 16);
    ctx.lineTo(rx, y1 - 16);
    ctx.stroke();

    /* balusters */
    ctx.strokeStyle = 'rgba(160,120,85,0.85)';
    ctx.lineWidth = 4;
    for (let y = y0 + 30; y < y1 - 20; y += 26) {
      ctx.beginPath();
      ctx.moveTo(rx, y);
      ctx.lineTo(rx + side * -13, y + 3);
      ctx.stroke();
    }
    /* posts */
    ctx.fillStyle = '#8d6544';
    [y0 + 14, (y0 + y1) / 2, y1 - 14].forEach((py) => {
      ctx.beginPath();
      ctx.roundRect?.(rx - 7, py - 9, 14, 20, 5);
      if (!ctx.roundRect) ctx.rect(rx - 7, py - 9, 14, 20);
      ctx.fill();
      ctx.fillStyle = '#d9b78c';
      ctx.beginPath();
      ctx.arc(rx, py - 11, 5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#8d6544';
    });
  });
  ctx.restore();

  /* --- lanterns at both ends --- */
  ctx.save();
  [
    [cx - halfW - 4, y0 + 4],
    [cx + halfW + 4, y0 + 4],
    [cx - halfW - 4, y1 - 4],
    [cx + halfW + 4, y1 - 4],
  ].forEach(([lx, ly], i) => {
    ctx.fillStyle = '#8d6544';
    ctx.beginPath();
    ctx.roundRect?.(lx - 3, ly - 30, 6, 32, 3);
    if (!ctx.roundRect) ctx.rect(lx - 3, ly - 30, 6, 32);
    ctx.fill();
    const pulse = 0.6 + Math.sin(t * 1.7 + i) * 0.12;
    const g = ctx.createRadialGradient(lx, ly - 36, 1, lx, ly - 36, 28);
    g.addColorStop(0, `rgba(255,232,160,${pulse})`);
    g.addColorStop(0.55, `rgba(255,200,110,${pulse * 0.35})`);
    g.addColorStop(1, 'rgba(255,200,110,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(lx, ly - 36, 28, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fff2c4';
    ctx.beginPath();
    ctx.roundRect?.(lx - 6, ly - 44, 12, 15, 5);
    if (!ctx.roundRect) ctx.rect(lx - 6, ly - 44, 12, 15);
    ctx.fill();
  });
  ctx.restore();

  /* --- falling petals over the bridge --- */
  ctx.save();
  for (let i = 0; i < 10; i++) {
    const ph = (t * 0.16 + i * 0.17) % 1;
    const px = cx + Math.sin(ph * 7 + i) * 62;
    const py = y0 + ph * h;
    ctx.fillStyle = `rgba(255,208,225,${0.75 * (1 - ph)})`;
    ctx.beginPath();
    ctx.ellipse(px, py, 3.2, 2, ph * 6 + i, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** water reflection of the bridge (drawn under the bridge) */
export function drawBridgeReflection(ctx, t) {
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.translate(BRIDGE.cx, (BRIDGE.y0 + BRIDGE.y1) / 2);
  ctx.scale(1, 0.72);
  ctx.fillStyle = '#c69a6c';
  ctx.beginPath();
  ctx.roundRect?.(-BRIDGE.halfW + 6, -(BRIDGE.h) / 2 + 4, BRIDGE.w - 12, BRIDGE.h - 8, 16);
  if (!ctx.roundRect) ctx.rect(-BRIDGE.halfW + 6, -(BRIDGE.h) / 2 + 4, BRIDGE.w - 12, BRIDGE.h - 8);
  ctx.fill();
  ctx.restore();
}
