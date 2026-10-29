/**
 * Clouds as one draw call: every cloud puff is a camera-facing quad in a single
 * geometry, and each of the three depth layers is its own slowly rotating group.
 */

import { Group, Mesh, CanvasTexture, LinearFilter, SRGBColorSpace } from 'three';
import { billboard, buildBillboardGeometry, G } from '../core/materials.js';
import { palette } from '../core/palette.js';
import { mulberry32 } from '../core/util.js';

/** Paint a puffy cumulus with a bright top and a shaded belly. */
function cloudTexture(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const rnd = mulberry32(4242);

  const cx = size / 2;
  const cy = size / 2;

  const puffs = [];
  const rows = 3;
  for (let row = 0; row < rows; row++) {
    const count = 4 + row;
    const ry = cy - size * 0.06 + row * size * 0.075;
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      const x = cx + (t - 0.5) * size * (0.62 - row * 0.05);
      const y = ry + (rnd() - 0.5) * size * 0.045;
      const r = size * (0.13 + rnd() * 0.07) * (1 - row * 0.16);
      puffs.push([x, y, r]);
    }
  }

  // soft body
  if ('filter' in ctx) ctx.filter = `blur(${size * 0.022}px)`;

  for (const [x, y, r] of puffs) {
    const g = ctx.createRadialGradient(x, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.62, 'rgba(253,252,250,0.98)');
    g.addColorStop(1, 'rgba(250,250,252,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // shaded underside so the shape reads as volume, not a smudge
  ctx.globalCompositeOperation = 'source-atop';
  const shade = ctx.createLinearGradient(0, cy - size * 0.12, 0, cy + size * 0.3);
  shade.addColorStop(0, 'rgba(255,255,255,0)');
  shade.addColorStop(0.55, 'rgba(190,205,224,0.28)');
  shade.addColorStop(1, 'rgba(150,170,198,0.52)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'source-over';

  if ('filter' in ctx) ctx.filter = 'none';

  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

function makeLayer(cards, texture, { spin = 0.004, bob = 0.5, bobPhase = 0 } = {}) {
  const geo = buildBillboardGeometry(cards);
  const mat = billboard(texture, { opacity: 1, tint: '#ffffff' });
  // clouds are far away; keep them from washing out into the fog
  mat.uniforms.uFogNear.value = 150;
  mat.uniforms.uFogFar.value = 460;

  const mesh = new Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;

  const group = new Group();
  group.add(mesh);
  group.userData.spin = spin;
  group.userData.bob = bob;
  group.userData.bobPhase = bobPhase;
  return group;
}

export function createClouds(quality = 'high') {
  const root = new Group();
  root.name = 'clouds';
  const texture = cloudTexture(256);
  const rnd = mulberry32(778899);

  const layers = [
    // high, far and small: leaves plenty of open sky between them
    { count: quality === 'low' ? 4 : 7, radius: [120, 215], y: [34, 72], size: [16, 30], spin: 0.0035, alpha: 0.9 },
    { count: quality === 'low' ? 4 : 6, radius: [66, 118], y: [17, 36], size: [10, 21], spin: -0.0055, alpha: 0.95 },
    { count: quality === 'low' ? 2 : 3, radius: [44, 74], y: [7, 17], size: [5.5, 12], spin: 0.0085, alpha: 1 },
    // sea of clouds below the island — this is what stops the underside reading
    // as an empty coloured void
    { count: quality === 'low' ? 6 : 10, radius: [26, 120], y: [-34, -11], size: [20, 46], spin: -0.0026, alpha: 0.85, below: true },
  ];

  const groups = [];

  layers.forEach((layer, li) => {
    const cards = [];
    for (let i = 0; i < layer.count; i++) {
      const a = (i / layer.count) * Math.PI * 2 + rnd() * 0.7;
      const r = layer.radius[0] + rnd() * (layer.radius[1] - layer.radius[0]);
      const y = layer.y[0] + rnd() * (layer.y[1] - layer.y[0]);
      const s = layer.size[0] + rnd() * (layer.size[1] - layer.size[0]);
      cards.push({
        pos: [Math.cos(a) * r, y, Math.sin(a) * r],
        size: [s * 1.55, s],
        rot: (rnd() - 0.5) * 0.1,
        alpha: layer.alpha * (0.8 + rnd() * 0.2),
        tint: [1, 1, 1],
      });
      // a second, smaller puff trailing the first gives the cluster some mass
      if (rnd() > 0.35) {
        cards.push({
          pos: [Math.cos(a) * r + (rnd() - 0.5) * s * 1.1, y - s * 0.2, Math.sin(a) * r + (rnd() - 0.5) * s * 1.1],
          size: [s * 0.85, s * 0.62],
          rot: (rnd() - 0.5) * 0.2,
          alpha: layer.alpha * 0.9,
          tint: [0.98, 0.99, 1],
        });
      }
    }
    const g = makeLayer(cards, texture, { spin: layer.spin, bob: 0.4 + li * 0.25, bobPhase: li * 1.7 });
    groups.push(g);
    root.add(g);
  });

  // per-cloud tint follows the palette
  for (const g of groups) {
    const mesh = g.children[0];
    mesh.material.uniforms.uTint = { value: palette.cloudTint };
  }

  return {
    group: root,
    update(dt, t) {
      for (const g of groups) {
        g.rotation.y += g.userData.spin * dt;
        g.position.y = Math.sin(t * 0.13 + g.userData.bobPhase) * g.userData.bob;
      }
    },
  };
}
