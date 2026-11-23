/* ============================================================
   Villager — the player character.
   Chibi proportions, four facing directions, walk cycle with
   squash/bounce, blinking, and a soft watercolour outline.
   ============================================================ */

import { TAU } from './core.js';

export const PALETTES = {
  skin: [
    { id: 'porcelain', base: '#ffe0c9', shade: '#f2c4a6', line: '#d9a184', blush: 'rgba(255,150,140,0.42)' },
    { id: 'peach', base: '#ffd0a8', shade: '#eeb389', line: '#cd9268', blush: 'rgba(255,140,120,0.42)' },
    { id: 'honey', base: '#e8b184', shade: '#d2966b', line: '#b47a52', blush: 'rgba(240,130,110,0.36)' },
    { id: 'caramel', base: '#c98d61', shade: '#b1774e', line: '#915c39', blush: 'rgba(230,120,100,0.30)' },
    { id: 'cocoa', base: '#a9714b', shade: '#915e3c', line: '#75472a', blush: 'rgba(220,115,95,0.26)' },
    { id: 'espresso', base: '#7d4f34', shade: '#67402a', line: '#4f2f1e', blush: 'rgba(210,110,90,0.22)' },
  ],
  hair: [
    { id: 'ink', base: '#3b3230', light: '#584b47' },
    { id: 'chestnut', base: '#7a4a2c', light: '#9c6238' },
    { id: 'honey', base: '#c08a4a', light: '#dcae6f' },
    { id: 'sunset', base: '#c96a3d', light: '#e58e5e' },
    { id: 'plum', base: '#6b4a6e', light: '#8a6390' },
    { id: 'sea', base: '#3f6b7d', light: '#5c8fa3' },
    { id: 'mint', base: '#6c9c7a', light: '#8dbd98' },
    { id: 'silver', base: '#9aa0a6', light: '#c2c8cd' },
    { id: 'bubblegum', base: '#d97fa0', light: '#f0a7bf' },
    { id: 'dandelion', base: '#d9b45a', light: '#efd07e' },
  ],
  shirt: [
    { id: 'sky', base: '#7fc4d8', light: '#a7dcec', dark: '#5fa3b8' },
    { id: 'leaf', base: '#8cc06a', light: '#aedb8b', dark: '#6d9e50' },
    { id: 'peach', base: '#f2a08c', light: '#ffbeab', dark: '#d17f6c' },
    { id: 'lavender', base: '#b3a2dc', light: '#cdc0ef', dark: '#9182bd' },
    { id: 'butter', base: '#f3cf72', light: '#ffe49a', dark: '#d1ad53' },
    { id: 'rose', base: '#ec8fa8', light: '#ffb3c6', dark: '#c86f88' },
    { id: 'charcoal', base: '#5a6470', light: '#7a8492', dark: '#414a54' },
    { id: 'cream', base: '#f2e7d5', light: '#fff8ec', dark: '#d2c5b0' },
  ],
  pants: [
    { id: 'denim', base: '#5b7fa6', dark: '#456485' },
    { id: 'olive', base: '#7d8a5e', dark: '#636e49' },
    { id: 'sand', base: '#c9b18a', dark: '#a8926c' },
    { id: 'clay', base: '#a96a58', dark: '#8b5445' },
    { id: 'slate', base: '#5f6873', dark: '#464e57' },
  ],
};

export const HAIRSTYLES = ['bob', 'bangs', 'ponytail', 'messy', 'bun', 'long'];

export const DEFAULT_LOOK = {
  skin: 1,
  hair: 1,
  hairStyle: 1,
  shirt: 0,
  pants: 0,
  hat: 0, // 0 = none, 1 = straw, 2 = cap, 3 = beanie
};

export const HATS = ['None', 'Straw Hat', 'Cap', 'Beanie'];

/* ---------------- drawing helpers ---------------- */

function oval(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
}

function softShadow(ctx, w = 22, h = 7, a = 0.22) {
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w);
  g.addColorStop(0, `rgba(58,76,56,${a})`);
  g.addColorStop(1, 'rgba(58,76,56,0)');
  ctx.fillStyle = g;
  oval(ctx, 0, 0, w, h);
  ctx.fill();
}

/* ---------------- the villager ---------------- */

/**
 * @param ctx   canvas context already translated? NO — pass world coords
 * @param state { x, y, dir, t, walk (0..1 amplitude), look, blink, hairFlop }
 */
export function drawVillager(ctx, state) {
  const { x, y, dir = 'down', t = 0, walk = 0, look = DEFAULT_LOOK, blink = 0 } = state;
  const skin = PALETTES.skin[look.skin % PALETTES.skin.length];
  const hair = PALETTES.hair[look.hair % PALETTES.hair.length];
  const shirt = PALETTES.shirt[look.shirt % PALETTES.shirt.length];
  const pants = PALETTES.pants[look.pants % PALETTES.pants.length];

  const bob = Math.sin(t * 11) * walk * 2.4;
  const lean = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
  const faceDown = dir === 'down';
  const faceUp = dir === 'up';
  const faceSide = dir === 'left' || dir === 'right';

  ctx.save();
  ctx.translate(x, y);

  /* shadow */
  softShadow(ctx, 24, 8, 0.24);

  ctx.translate(0, -bob);

  /* ---- legs ---- */
  const swing = Math.sin(t * 11) * walk;
  const legSpread = 8;
  const legs = [
    { ox: -legSpread, ph: swing },
    { ox: legSpread, ph: -swing },
  ];
  legs.forEach((l) => {
    if (faceSide) {
      // legs overlap in profile
      const off = l === legs[0] ? -3 : 3;
      ctx.fillStyle = pants.base;
      ctx.beginPath();
      ctx.roundRect?.(-6 + off, -22, 12, 24, 5);
      if (!ctx.roundRect) ctx.rect(-6 + off, -22, 12, 24);
      ctx.fill();
      ctx.fillStyle = pants.dark;
      ctx.fillRect(-6 + off, -6, 12, 6);
    } else {
      ctx.fillStyle = pants.base;
      ctx.beginPath();
      ctx.roundRect?.(l.ox - 5, -22 + Math.max(0, -l.ph * 2), 10, 23, 5);
      if (!ctx.roundRect) ctx.rect(l.ox - 5, -22 + Math.max(0, -l.ph * 2), 10, 23);
      ctx.fill();
      ctx.fillStyle = pants.dark;
      ctx.fillRect(l.ox - 5, -4, 10, 4);
    }
    /* shoe */
    const shoeY = faceSide ? -2 : -2 + Math.max(0, -l.ph * 2);
    const shoeX = faceSide ? (l === legs[0] ? -11 : -1) : l.ox;
    ctx.fillStyle = '#7b5a48';
    oval(ctx, shoeX, shoeY - 1, 7, 4.4);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    oval(ctx, shoeX - 1.5, shoeY - 2.6, 3.4, 1.8);
    ctx.fill();
  });

  /* ---- body / shirt ---- */
  ctx.save();
  ctx.translate(lean * 1.6, 0);
  ctx.fillStyle = shirt.base;
  ctx.beginPath();
  ctx.moveTo(-13, -20);
  ctx.quadraticCurveTo(-17, -42, -11, -47);
  ctx.lineTo(11, -47);
  ctx.quadraticCurveTo(17, -42, 13, -20);
  ctx.quadraticCurveTo(0, -15, -13, -20);
  ctx.closePath();
  ctx.fill();
  /* shirt shading */
  ctx.fillStyle = shirt.dark;
  ctx.beginPath();
  ctx.moveTo(4, -46);
  ctx.lineTo(11, -47);
  ctx.quadraticCurveTo(17, -42, 13, -20);
  ctx.quadraticCurveTo(8, -17, 5, -18);
  ctx.closePath();
  ctx.globalAlpha = 0.5;
  ctx.fill();
  ctx.globalAlpha = 1;
  /* collar */
  ctx.strokeStyle = shirt.light;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(0, -46, 7, 0.18, Math.PI - 0.18);
  ctx.stroke();

  /* arms */
  const armSwing = Math.sin(t * 11 + Math.PI) * walk * 5;
  if (faceSide) {
    ctx.fillStyle = shirt.base;
    ctx.beginPath();
    ctx.roundRect?.(-6, -44, 8, 20, 4);
    if (!ctx.roundRect) ctx.rect(-6, -44, 8, 20);
    ctx.fill();
    ctx.fillStyle = skin.base;
    oval(ctx, -2, -24, 4.6, 4.6);
    ctx.fill();
  } else {
    [-1, 1].forEach((s) => {
      ctx.save();
      ctx.translate(s * 15, -42);
      ctx.rotate(s * armSwing * 0.045);
      ctx.fillStyle = shirt.base;
      ctx.beginPath();
      ctx.roundRect?.(-4.5, 0, 9, 21, 4.5);
      if (!ctx.roundRect) ctx.rect(-4.5, 0, 9, 21);
      ctx.fill();
      ctx.fillStyle = shirt.dark;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(1, 1, 4, 18);
      ctx.globalAlpha = 1;
      /* hand */
      ctx.fillStyle = skin.base;
      oval(ctx, 0, 22, 5, 4.6);
      ctx.fill();
      ctx.restore();
    });
  }
  ctx.restore();

  /* ---- head ---- */
  const headY = -70;
  const headR = 20;

  /* neck */
  ctx.fillStyle = skin.shade;
  ctx.beginPath();
  ctx.roundRect?.(-6, -54, 12, 10, 4);
  if (!ctx.roundRect) ctx.rect(-6, -54, 12, 10);
  ctx.fill();

  /* far-side hair mass (behind head) */
  if (faceUp) {
    ctx.fillStyle = hair.base;
    oval(ctx, 0, headY + 1, headR + 1.6, headR + 1, 0);
    ctx.fill();
  }

  /* head base */
  ctx.fillStyle = skin.base;
  oval(ctx, 0, headY, headR, headR * 1.02);
  ctx.fill();
  /* chin shading */
  ctx.fillStyle = skin.shade;
  ctx.globalAlpha = 0.35;
  oval(ctx, 0, headY + 12, headR * 0.72, headR * 0.42);
  ctx.fill();
  ctx.globalAlpha = 1;

  /* ears (side view only) */
  if (faceSide) {
    ctx.fillStyle = skin.base;
    oval(ctx, -headR * 0.82, headY + 3, 5.4, 6.4);
    ctx.fill();
    ctx.fillStyle = skin.shade;
    oval(ctx, -headR * 0.86, headY + 3.5, 2.4, 3.4);
    ctx.fill();
  } else {
    [-1, 1].forEach((s) => {
      ctx.fillStyle = skin.base;
      oval(ctx, s * (headR - 1), headY + 3, 4.4, 5.4);
      ctx.fill();
    });
  }

  /* ---- face ---- */
  if (!faceUp) {
    const eyeY = headY + 3.5;
    const eyeDx = faceSide ? 2 : 7.4;
    const eyeR = 2.9;
    const open = 1 - blink;

    const drawEye = (ex, isFar) => {
      if (open < 0.22) {
        ctx.strokeStyle = '#3a2e2a';
        ctx.lineWidth = 1.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(ex, eyeY, 3.1, 0.25, Math.PI - 0.25);
        ctx.stroke();
        return;
      }
      ctx.fillStyle = '#3a2e2a';
      oval(ctx, ex, eyeY, eyeR * (faceSide && isFar ? 0.72 : 1), eyeR * open, 0);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      oval(ctx, ex - 0.9, eyeY - 1.1, 1.05, 1.05);
      ctx.fill();
    };

    if (faceSide) {
      drawEye(-1, true);
      drawEye(7, false);
      /* mouth */
      ctx.strokeStyle = 'rgba(140,90,80,0.85)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(3.4, headY + 9.5, 2.6, 0.2, Math.PI - 0.2);
      ctx.stroke();
      /* blush */
      ctx.fillStyle = skin.blush;
      oval(ctx, 8, headY + 8, 4.6, 2.8);
      ctx.fill();
    } else {
      drawEye(-eyeDx, false);
      drawEye(eyeDx, false);
      /* smile */
      ctx.strokeStyle = 'rgba(150,95,85,0.9)';
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, headY + 7.4, 3.4, 0.32, Math.PI - 0.32);
      ctx.stroke();
      /* blush */
      ctx.fillStyle = skin.blush;
      oval(ctx, -13.5, headY + 7.4, 4.4, 2.6);
      ctx.fill();
      oval(ctx, 13.5, headY + 7.4, 4.4, 2.6);
      ctx.fill();
    }
  } else {
    /* back of head: just hair, drawn below */
  }

  /* ---- hair ---- */
  drawHair(ctx, {
    style: look.hairStyle % HAIRSTYLES.length,
    hair,
    headY,
    headR,
    dir,
    t,
    walk,
  });

  /* ---- hat ---- */
  if (look.hat) drawHat(ctx, look.hat, hair, headY, headR, dir);

  ctx.restore();
}

function drawHair(ctx, { style, hair, headY, headR, dir, t, walk }) {
  const y = headY;
  const R = headR;
  const backLit = hair.light;
  ctx.save();

  if (dir === 'up') {
    /* full back of head covered */
    ctx.fillStyle = hair.base;
    oval(ctx, 0, y + 1, R + 1.2, R + 1.4);
    ctx.fill();
    ctx.fillStyle = backLit;
    ctx.globalAlpha = 0.5;
    oval(ctx, -R * 0.25, y - R * 0.3, R * 0.6, R * 0.5, -0.4);
    ctx.fill();
    ctx.globalAlpha = 1;
    // long hair tail
    if (style === 2 || style === 5) {
      ctx.fillStyle = hair.base;
      ctx.beginPath();
      ctx.moveTo(-9, y + 12);
      ctx.quadraticCurveTo(-4, y + 34, 0, y + 40 + Math.sin(t * 3) * 2);
      ctx.quadraticCurveTo(4, y + 34, 9, y + 12);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  if (dir === 'left' || dir === 'right') {
    /* profile hair: cap over head, fringe at the front */
    ctx.fillStyle = hair.base;
    ctx.beginPath();
    ctx.moveTo(-R - 1.2, y + 4);
    ctx.quadraticCurveTo(-R - 2, y - R - 3, 0, y - R - 2.4);
    ctx.quadraticCurveTo(R + 2, y - R - 2, R + 1.4, y + 2);
    ctx.quadraticCurveTo(R - 3, y - R * 0.2, R - 8, y - 4);
    ctx.quadraticCurveTo(0, y - R * 0.35, -R + 4, y - 2);
    ctx.quadraticCurveTo(-R - 1, y + 2, -R - 1.2, y + 4);
    ctx.closePath();
    ctx.fill();
    /* sideburn / fringe tip */
    ctx.beginPath();
    ctx.moveTo(R - 2, y - 8);
    ctx.quadraticCurveTo(R + 4, y + 2, R - 1, y + 9);
    ctx.quadraticCurveTo(R - 7, y + 1, R - 3, y - 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = backLit;
    ctx.globalAlpha = 0.45;
    oval(ctx, -R * 0.3, y - R * 0.55, R * 0.5, R * 0.28, -0.25);
    ctx.fill();
    ctx.globalAlpha = 1;

    if (style === 2) {
      ctx.fillStyle = hair.base;
      ctx.beginPath();
      ctx.moveTo(-R + 2, y - 2);
      ctx.quadraticCurveTo(-R - 16, y + 4, -R - 13, y + 22 + Math.sin(t * 3) * 3);
      ctx.quadraticCurveTo(-R - 4, y + 14, -R + 3, y + 10);
      ctx.closePath();
      ctx.fill();
    } else if (style === 5) {
      ctx.fillStyle = hair.base;
      ctx.beginPath();
      ctx.moveTo(-R + 1, y);
      ctx.quadraticCurveTo(-R - 5, y + 18, -R + 2, y + 30 + Math.sin(t * 2.4) * 2);
      ctx.quadraticCurveTo(-R + 9, y + 16, -R + 6, y - 2);
      ctx.closePath();
      ctx.fill();
    } else if (style === 4) {
      ctx.fillStyle = hair.base;
      oval(ctx, -R * 0.55, y - R * 0.92, 8, 7.4, -0.3);
      ctx.fill();
      ctx.fillStyle = backLit;
      oval(ctx, -R * 0.6, y - R * 0.98, 3.4, 3, -0.3);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  /* ---- front view ---- */
  const fringe = {
    0: (ctx2) => {
      // bob: rounded fringe with a centre part
      ctx2.beginPath();
      ctx2.moveTo(-R - 0.8, y + 2);
      ctx2.quadraticCurveTo(-R - 1.6, y - R - 3.4, 0, y - R - 2.6);
      ctx2.quadraticCurveTo(R + 1.6, y - R - 3.4, R + 0.8, y + 2);
      ctx2.quadraticCurveTo(R - 1, y - 6, R - 6.5, y - 7.5);
      ctx2.quadraticCurveTo(0, y - 1.5, -R + 6.5, y - 7.5);
      ctx2.quadraticCurveTo(-R + 1, y - 6, -R - 0.8, y + 2);
      ctx2.closePath();
      ctx2.fill();
    },
    1: (ctx2) => {
      // bangs: soft loopy fringe
      ctx2.beginPath();
      ctx2.moveTo(-R - 0.8, y + 1);
      ctx2.quadraticCurveTo(-R - 1.6, y - R - 3.6, 0, y - R - 2.8);
      ctx2.quadraticCurveTo(R + 1.6, y - R - 3.6, R + 0.8, y + 1);
      ctx2.quadraticCurveTo(R - 2.4, y - 10, R * 0.5, y - 9);
      ctx2.quadraticCurveTo(R * 0.2, y - 3, 0, y - 3.4);
      ctx2.quadraticCurveTo(-R * 0.2, y - 3, -R * 0.5, y - 9);
      ctx2.quadraticCurveTo(-R + 2.4, y - 10, -R - 0.8, y + 1);
      ctx2.closePath();
      ctx2.fill();
    },
    2: (ctx2) => {
      // ponytail: swept fringe
      ctx2.beginPath();
      ctx2.moveTo(-R - 1, y + 2);
      ctx2.quadraticCurveTo(-R - 2, y - R - 3.4, 0, y - R - 2.6);
      ctx2.quadraticCurveTo(R + 2, y - R - 3.4, R + 1, y + 3);
      ctx2.quadraticCurveTo(R - 2, y - 8, -2, y - 8.5);
      ctx2.quadraticCurveTo(-R + 3, y - 7, -R - 1, y + 2);
      ctx2.closePath();
      ctx2.fill();
    },
    3: (ctx2) => {
      // messy spikes
      ctx2.beginPath();
      ctx2.moveTo(-R - 1, y + 1);
      ctx2.lineTo(-R - 2.4, y - R * 0.7);
      ctx2.lineTo(-R + 1.6, y - R * 0.5);
      ctx2.lineTo(-R + 0.2, y - R - 2);
      ctx2.lineTo(-3, y - R + 1);
      ctx2.lineTo(2, y - R - 3.4);
      ctx2.lineTo(6, y - R + 0.5);
      ctx2.lineTo(R - 0.5, y - R - 2.2);
      ctx2.lineTo(R + 1, y - R * 0.4);
      ctx2.lineTo(R + 1.2, y + 1);
      ctx2.quadraticCurveTo(R - 2, y - 7, 0, y - 6.5);
      ctx2.quadraticCurveTo(-R + 2, y - 7, -R - 1, y + 1);
      ctx2.closePath();
      ctx2.fill();
    },
    4: (ctx2) => {
      // bun / short
      ctx2.beginPath();
      ctx2.moveTo(-R - 0.8, y + 1);
      ctx2.quadraticCurveTo(-R - 1.4, y - R - 3, 0, y - R - 2.4);
      ctx2.quadraticCurveTo(R + 1.4, y - R - 3, R + 0.8, y + 1);
      ctx2.quadraticCurveTo(R - 2, y - 6, R * 0.45, y - 7);
      ctx2.quadraticCurveTo(0, y - 3, -R * 0.45, y - 7);
      ctx2.quadraticCurveTo(-R + 2, y - 6, -R - 0.8, y + 1);
      ctx2.closePath();
      ctx2.fill();
    },
    5: (ctx2) => {
      // long: centre-part long hair
      ctx2.beginPath();
      ctx2.moveTo(-R - 1, y + 2);
      ctx2.quadraticCurveTo(-R - 2, y - R - 3.4, 0, y - R - 2.8);
      ctx2.quadraticCurveTo(R + 2, y - R - 3.4, R + 1, y + 2);
      ctx2.quadraticCurveTo(R - 1.6, y - 4, 2.4, y - 6);
      ctx2.quadraticCurveTo(0, y - 2, -2.4, y - 6);
      ctx2.quadraticCurveTo(-R + 1.6, y - 4, -R - 1, y + 2);
      ctx2.closePath();
      ctx2.fill();
    },
  }[style];

  ctx.fillStyle = hair.base;
  fringe(ctx);
  ctx.fill();

  /* highlight sweep */
  ctx.fillStyle = backLit;
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.ellipse(-R * 0.28, y - R * 0.52, R * 0.52, R * 0.22, -0.34, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;

  /* side locks */
  if (style === 0 || style === 5) {
    ctx.fillStyle = hair.base;
    [-1, 1].forEach((s) => {
      ctx.beginPath();
      ctx.moveTo(s * (R - 1), y - 6);
      ctx.quadraticCurveTo(s * (R + 4), y + 8, s * (R - 2), y + 20 + (style === 5 ? 8 : 0));
      ctx.quadraticCurveTo(s * (R - 6), y + 6, s * (R - 5), y - 6);
      ctx.closePath();
      ctx.fill();
    });
  }
  if (style === 2) {
    /* ponytail behind */
    ctx.fillStyle = hair.base;
    ctx.beginPath();
    ctx.moveTo(R - 2, y - 2);
    ctx.quadraticCurveTo(R + 15, y + 2, R + 13, y + 24 + Math.sin(t * 3) * 3);
    ctx.quadraticCurveTo(R + 3, y + 14, R - 4, y + 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = backLit;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.ellipse(R + 7, y + 8, 3, 8, 0.3, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (style === 4) {
    ctx.fillStyle = hair.base;
    oval(ctx, 0, y - R - 5, 9, 8);
    ctx.fill();
    ctx.fillStyle = backLit;
    oval(ctx, -2, y - R - 7, 3.6, 3.2);
    ctx.fill();
  }

  ctx.restore();
}

function drawHat(ctx, kind, hair, headY, headR, dir) {
  const y = headY;
  const R = headR;
  ctx.save();
  if (kind === 1) {
    /* straw hat */
    ctx.fillStyle = '#e8cf94';
    ctx.beginPath();
    ctx.ellipse(0, y - R * 0.72, R * 1.62, R * 0.42, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#f2dca8';
    ctx.beginPath();
    ctx.ellipse(0, y - R * 0.78, R * 1.58, R * 0.38, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#e0c383';
    ctx.beginPath();
    ctx.ellipse(0, y - R * 0.95, R * 0.82, R * 0.56, 0, Math.PI, TAU);
    ctx.fill();
    ctx.fillStyle = '#c9756b';
    ctx.beginPath();
    ctx.ellipse(0, y - R * 0.92, R * 0.84, R * 0.14, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(180,150,100,0.5)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse(0, y - R * 0.78, R * (1.4 - i * 0.22), R * 0.34, 0, 0, TAU);
      ctx.stroke();
    }
  } else if (kind === 2) {
    /* cap — worn backwards-ish */
    ctx.fillStyle = '#e2705f';
    ctx.beginPath();
    ctx.ellipse(0, y - R * 0.82, R * 0.98, R * 0.66, 0, Math.PI * 0.98, TAU * 0.02);
    ctx.fill();
    ctx.fillStyle = '#c9584a';
    ctx.beginPath();
    ctx.ellipse(0, y - R * 0.66, R * 1.12, R * 0.22, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#f5e7d8';
    ctx.beginPath();
    ctx.arc(0, y - R * 1.2, R * 0.16, 0, TAU);
    ctx.fill();
  } else if (kind === 3) {
    /* beanie */
    ctx.fillStyle = hair.base;
    ctx.beginPath();
    ctx.ellipse(0, y - R * 0.72, R * 1.02, R * 0.7, 0, Math.PI * 0.95, TAU * 0.05);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.ellipse(0, y - R * 0.7, R * 0.86, R * 0.5, 0, Math.PI * 1.1, TAU * -0.1);
    ctx.fill();
    ctx.fillStyle = '#f2e7d5';
    ctx.beginPath();
    ctx.roundRect?.(-R * 1.0, y - R * 0.86, R * 2.0, R * 0.3, R * 0.14);
    if (!ctx.roundRect) ctx.rect(-R * 1.0, y - R * 0.86, R * 2.0, R * 0.3);
    ctx.fill();
  }
  ctx.restore();
}

/* ---------------- preview portrait (for the customiser) ---------------- */

export function drawPortrait(ctx, look, w, h, t = 0) {
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.translate(w / 2, h * 0.92);
  const scale = Math.min(w / 70, h / 100);
  ctx.scale(scale, scale);
  drawVillager(ctx, { x: 0, y: 0, dir: 'down', t, walk: 0, look, blink: 0 });
  ctx.restore();
}

/* ---------------- the island cat ---------------- */

export function drawCat(ctx, x, y, t, dir = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  /* shadow */
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 18);
  g.addColorStop(0, 'rgba(58,76,56,0.22)');
  g.addColorStop(1, 'rgba(58,76,56,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, 18, 6, 0, 0, TAU);
  ctx.fill();

  const breathe = Math.sin(t * 2) * 0.6;
  /* tail */
  const tailSwing = Math.sin(t * 1.5) * 0.5;
  ctx.strokeStyle = '#e8dcc8';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-13, -10);
  ctx.quadraticCurveTo(-24, -14 + Math.sin(t * 2) * 3, -22, -28 + tailSwing * 6);
  ctx.stroke();
  ctx.strokeStyle = '#d8c8ae';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-24, -24);
  ctx.quadraticCurveTo(-22 + tailSwing * 4, -26, -21, -28 + tailSwing * 7);
  ctx.stroke();

  /* body */
  ctx.fillStyle = '#f2e7d3';
  ctx.beginPath();
  ctx.ellipse(-2, -13 + breathe * 0.3, 15, 12, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#e6d8bf';
  ctx.beginPath();
  ctx.ellipse(-2, -8, 13, 7, 0, 0, TAU);
  ctx.fill();

  /* head */
  ctx.fillStyle = '#f7eedd';
  ctx.beginPath();
  ctx.ellipse(9, -24 + breathe * 0.4, 12, 11, 0, 0, TAU);
  ctx.fill();
  /* ears */
  [[-1.5, -1], [7, -3]].forEach(([ox, oy]) => {
    ctx.fillStyle = '#f7eedd';
    ctx.beginPath();
    ctx.moveTo(9 + ox, -24 + oy - 9);
    ctx.lineTo(9 + ox + 7, -24 + oy - 1);
    ctx.lineTo(9 + ox - 3, -24 + oy - 1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f3bcc6';
    ctx.beginPath();
    ctx.moveTo(9 + ox + 1, -24 + oy - 7);
    ctx.lineTo(9 + ox + 5, -24 + oy - 2);
    ctx.lineTo(9 + ox - 1, -24 + oy - 2);
    ctx.closePath();
    ctx.fill();
  });
  /* stripes */
  ctx.strokeStyle = 'rgba(200,175,140,0.7)';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(2, -34);
  ctx.lineTo(6, -30);
  ctx.moveTo(10, -35);
  ctx.lineTo(13, -31);
  ctx.stroke();
  /* eyes — blink occasionally */
  const blink = Math.sin(t * 1.1) > 0.985 ? 0.15 : 1;
  ctx.fillStyle = '#3b3230';
  ctx.beginPath();
  ctx.ellipse(5, -25, 1.9, 2.4 * blink, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(13, -25, 1.9, 2.4 * blink, 0, 0, TAU);
  ctx.fill();
  /* nose + mouth */
  ctx.fillStyle = '#e2909c';
  ctx.beginPath();
  ctx.moveTo(9, -20.5);
  ctx.lineTo(11, -20.5);
  ctx.lineTo(10, -19);
  ctx.closePath();
  ctx.fill();
  /* whiskers */
  ctx.strokeStyle = 'rgba(150,140,125,0.55)';
  ctx.lineWidth = 1;
  [-2, 1].forEach((k) => {
    ctx.beginPath();
    ctx.moveTo(14, -21 + k);
    ctx.lineTo(24, -23 + k * 2);
    ctx.stroke();
  });
  /* paws */
  ctx.fillStyle = '#f7eedd';
  oval(ctx, 8, -3.5, 5, 3.4);
  ctx.fill();
  ctx.restore();
}
