/* ============================================================
   Bridge (3D) — the arched wooden crossing over the river.
   ============================================================ */

import { THREE, GeoBuilder, standardMat } from './geo.js';
import { TAU, clamp, lerp, rng, rr } from './core.js';
import { BRIDGE } from './layout.js';
import { toX, toZ, terrainHeight, ISLAND_H, WU } from './terrain.js';

/* deck measurements, in three.js units */
const DECK_HALF = BRIDGE.halfW / WU;
const RAIL_HALF = DECK_HALF * 0.92;

/** Deck height above the island plateau, as a function of y (world space). */
export function bridgeHeight(wy) {
  const mid = (BRIDGE.y0 + BRIDGE.y1) / 2;
  const half = (BRIDGE.y1 - BRIDGE.y0) / 2;
  const t = clamp((wy - mid) / half, -1, 1);
  const base = terrainHeight(BRIDGE.cx, wy);
  const outdoor = Math.max(base, ISLAND_H - 0.3);
  return outdoor + 1.5 * (1 - t * t) + 0.28;
}

export function buildBridge(scene) {
  const b = new GeoBuilder(3131);
  const cx = BRIDGE.cx;
  const y0 = BRIDGE.y0;
  const y1 = BRIDGE.y1;
  const halfW = DECK_HALF;

  /* ---------- deck planks ---------- */
  const steps = 26;
  for (let i = 0; i < steps; i++) {
    const ya = lerp(y0, y1, i / steps);
    const yb = lerp(y0, y1, (i + 1) / steps);
    const hA = bridgeHeight(ya);
    const hB = bridgeHeight(yb);
    const gx = toX(cx);
    const zA = toZ(ya);
    const zB = toZ(yb);
    const len = Math.hypot(zB - zA, hB - hA);
    const midZ = (zA + zB) / 2;
    const midY = (hA + hB) / 2;
    const angle = Math.atan2(hB - hA, zB - zA);
    b.box(halfW * 2, 0.16, len * 1.06, i % 2 ? '#b98a5e' : '#a97a50', gx, midY, midZ, {
      rx: -angle,
      variance: 0.05,
    });
  }

  /* ---------- side stringers ---------- */
  for (const s of [-1, 1]) {
    for (let i = 0; i < steps; i++) {
      const ya = lerp(y0, y1, i / steps);
      const yb = lerp(y0, y1, (i + 1) / steps);
      const hA = bridgeHeight(ya);
      const hB = bridgeHeight(yb);
      const zA = toZ(ya);
      const zB = toZ(yb);
      const len = Math.hypot(zB - zA, hB - hA);
      const angle = Math.atan2(hB - hA, zB - zA);
      b.box(0.26, 0.42, len * 1.1, '#a97e56', toX(cx) + s * halfW, (hA + hB) / 2 - 0.24, (zA + zB) / 2, {
        rx: -angle,
        variance: 0.04,
      });
    }
  }

  /* ---------- railings ---------- */
  for (const s of [-1, 1]) {
    const rx = toX(cx) + s * (halfW - 0.16);
    /* top rail — segmented along the arch */
    const railSegs = 16;
    for (let i = 0; i < railSegs; i++) {
      const ya = lerp(y0, y1, i / railSegs);
      const yb = lerp(y0, y1, (i + 1) / railSegs);
      const hA = bridgeHeight(ya);
      const hB = bridgeHeight(yb);
      const zA = toZ(ya);
      const zB = toZ(yb);
      const len = Math.hypot(zB - zA, hB - hA);
      const angle = Math.atan2(hB - hA, zB - zA);
      b.box(0.2, 0.16, len * 1.08, '#c69a6c', rx, (hA + hB) / 2 + 1.0, (zA + zB) / 2, {
        rx: -angle,
        variance: 0.04,
      });
    }
    /* balusters + posts */
    for (let i = 0; i <= 14; i++) {
      const wy = lerp(y0 - 6, y1 + 6, i / 14);
      const h = bridgeHeight(wy);
      b.box(0.16, 1.02, 0.16, '#a1754f', rx, h + 0.5, toZ(wy), { variance: 0.05 });
      if (i % 4 === 0) {
        b.box(0.28, 1.5, 0.28, '#8d6544', rx, h + 0.72, toZ(wy), { variance: 0.04 });
        b.sphere(0.16, '#d9b78c', rx, h + 1.52, toZ(wy), { ws: 10, hs: 8, variance: 0.03 });
      }
    }
  }

  /* ---------- support posts down into the river ---------- */
  for (const wy of [y0 + 26, BRIDGE.cy, y1 - 26]) {
    for (const s of [-1, 1]) {
      const h = bridgeHeight(wy);
      b.cyl(0.22, 0.3, h + 1.2, 7, '#8a6244', toX(cx) + s * (halfW - 0.4), (h - 1.2) / 2, toZ(wy), {
        flat: true,
        variance: 0.05,
      });
    }
  }

  const mesh = new THREE.Mesh(b.toGeometry(), standardMat({ flatShading: true }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'bridge';
  scene.add(mesh);

  /* ---------- lanterns at the four corners ---------- */
  const tickers = [];
  const lanterns = [];
  [
    [cx - halfW * WU * 1.04, y0 + 4],
    [cx + halfW * WU * 1.04, y0 + 4],
    [cx - halfW * WU * 1.04, y1 - 4],
    [cx + halfW * WU * 1.04, y1 - 4],
  ].forEach(([wx, wy], i) => {
    const gx = toX(wx);
    const gz = toZ(wy);
    const gy = bridgeHeight(wy);

    const g = new THREE.Group();
    g.position.set(gx, gy, gz);

    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.09, 1.6, 6),
      new THREE.MeshStandardMaterial({ color: 0x8d6544, roughness: 0.9 })
    );
    post.position.y = 0.8;
    post.castShadow = true;
    g.add(post);

    const glass = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 10, 8),
      new THREE.MeshStandardMaterial({
        color: 0xfff2c4,
        emissive: 0xffd07a,
        emissiveIntensity: 2.4,
        roughness: 0.4,
      })
    );
    glass.position.y = 1.72;
    g.add(glass);

    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.95, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xffcf8a, transparent: true, opacity: 0.13 })
    );
    halo.position.y = 1.72;
    g.add(halo);

    scene.add(g);
    lanterns.push(g);
    tickers.push((t) => {
      const k = 0.85 + Math.sin(t * 1.7 + i * 1.3) * 0.15;
      glass.material.emissiveIntensity = 2.0 * k;
      halo.material.opacity = 0.1 + 0.06 * k;
      halo.scale.setScalar(1 + Math.sin(t * 1.4 + i) * 0.05);
    });
  });

  return {
    mesh,
    lanterns,
    update(t) {
      for (const fn of tickers) fn(t);
    },
    /** true when the player is standing on the deck */
    heightAt: bridgeHeight,
  };
}

/* ---------- falling petals over the bridge (instanced) ---------- */

export function buildPetals(scene) {
  const COUNT = 220;
  const geo = new THREE.CircleGeometry(0.09, 6);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffd3e0,
    roughness: 0.8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.95,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, COUNT);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.castShadow = false;
  scene.add(mesh);

  const rand = rng(4242);
  const parts = [];
  const dummy = new THREE.Object3D();
  for (let i = 0; i < COUNT; i++) {
    parts.push({
      x: rr(rand, -95, 95),
      y: rr(rand, 0, 40),
      z: rr(rand, -70, 70),
      vy: rr(rand, -0.55, -1.15),
      sway: rr(rand, 0.3, 1.1),
      phase: rand() * TAU,
      spin: rr(rand, -1.4, 1.4),
      scale: rr(rand, 0.7, 1.5),
      c: rand(),
    });
  }
  const color = new THREE.Color();
  for (let i = 0; i < COUNT; i++) {
    color.set(parts[i].c < 0.6 ? '#ffd3e0' : parts[i].c < 0.85 ? '#ffe9f0' : '#c8e0a0');
    mesh.setColorAt(i, color);
  }
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

  return {
    mesh,
    update(t, dt) {
      for (let i = 0; i < COUNT; i++) {
        const p = parts[i];
        p.y += p.vy * dt;
        p.x += Math.sin(t * 0.9 + p.phase) * p.sway * dt;
        p.phase += p.spin * dt * 0.4;
        if (p.y < -1) {
          p.y = 38;
          p.x = rr(rand, -95, 95);
          p.z = rr(rand, -70, 70);
        }
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(p.phase, p.phase * 0.7, p.phase * 0.5);
        dummy.scale.setScalar(p.scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
