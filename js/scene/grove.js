/**
 * The projects grove: four little floating islands orbiting above the meadow,
 * each carrying an emblem for one project. They drift slowly while you are on
 * the menu and settle into an arc when the Projects panel opens.
 */

import { Group, Mesh, Vector3, Color } from 'three';
import { toon } from '../core/materials.js';
import { GeoBuilder } from '../core/geo.js';
import { damp } from '../core/util.js';
import { LAYOUT } from './layout.js';

/* ─────────────────────────────── emblems ─────────────────────────────────── */

function emblemBus() {
  const b = new GeoBuilder(11);
  // body
  b.box(1.05, 0.5, 0.55, '#f6ecd8', { pos: [0, 0.34, 0], flat: true });
  b.box(1.05, 0.14, 0.55, '#e2b06a', { pos: [0, 0.14, 0], flat: true });
  // windows
  b.box(0.86, 0.2, 0.05, '#9ecfe6', { pos: [0, 0.42, 0.28] });
  b.box(0.86, 0.2, 0.05, '#9ecfe6', { pos: [0, 0.42, -0.28] });
  // roof
  b.box(0.92, 0.07, 0.5, '#e0756c', { pos: [0, 0.62, 0] });
  // wheels
  for (const sx of [-0.32, 0.34]) {
    b.cyl(0.13, 0.13, 0.1, 10, '#4a4038', { pos: [sx, 0.13, 0.29], rot: [Math.PI / 2, 0, 0] });
    b.cyl(0.13, 0.13, 0.1, 10, '#4a4038', { pos: [sx, 0.13, -0.29], rot: [Math.PI / 2, 0, 0] });
  }
  // headlights
  b.sphere(0.05, '#ffe9a8', { pos: [0.5, 0.3, 0.22], wSeg: 6, hSeg: 5 });
  b.sphere(0.05, '#ffe9a8', { pos: [0.5, 0.3, -0.22], wSeg: 6, hSeg: 5 });
  return b.build();
}

function emblemScope() {
  const b = new GeoBuilder(12);
  // magnifier ring
  b.torus(0.33, 0.075, 8, 20, '#f2f6f0', { pos: [0, 0.62, 0], rot: [0.55, -0.35, 0] });
  // handle
  b.cyl(0.06, 0.075, 0.52, 7, '#7a5540', { pos: [0.34, 0.28, 0.07], rot: [0.55, 0, -0.72] });
  // lens
  b.cyl(0.27, 0.27, 0.03, 18, '#bfe6d8', { pos: [0, 0.62, 0], rot: [Math.PI / 2 - 0.55, -0.35, 0] });
  // a leaf under the lens
  b.blob(0.13, '#7fb069', { pos: [-0.05, 0.16, 0.12], squash: 0.32, wSeg: 8, hSeg: 6 });
  return b.build();
}

function emblemCards() {
  const b = new GeoBuilder(13);
  b.box(0.72, 0.1, 0.5, '#cfe3f2', { pos: [0, 0.06, 0], rot: [0, 0.16, 0], flat: true });
  b.box(0.72, 0.1, 0.5, '#a9cfe8', { pos: [0, 0.16, 0], rot: [0, -0.1, 0], flat: true });
  b.box(0.72, 0.1, 0.5, '#f6ecd8', { pos: [0, 0.27, 0], rot: [0, 0.05, 0], flat: true });
  // question mark built from a hook + dot
  b.torus(0.12, 0.035, 6, 12, '#3c6f92', { pos: [0, 0.48, 0.02], rot: [Math.PI / 2, 0, 0] });
  b.box(0.07, 0.12, 0.05, '#3c6f92', { pos: [0, 0.36, 0.02] });
  b.sphere(0.045, '#3c6f92', { pos: [0, 0.62, 0.02], wSeg: 6, hSeg: 5 });
  return b.build();
}

function emblemClipboard() {
  const b = new GeoBuilder(14);
  b.box(0.62, 0.78, 0.07, '#f2e3c8', { pos: [0, 0.42, 0], rot: [0.12, 0, 0], flat: true });
  b.box(0.66, 0.82, 0.04, '#c98b5e', { pos: [0, 0.42, -0.045], rot: [0.12, 0, 0], flat: true });
  b.box(0.26, 0.09, 0.1, '#8a6344', { pos: [0, 0.83, 0.01], rot: [0.12, 0, 0] });
  for (let i = 0; i < 3; i++) {
    b.box(0.36, 0.045, 0.03, '#a9cfe8', { pos: [-0.06, 0.6 - i * 0.15, 0.06], rot: [0.12, 0, 0] });
  }
  b.sphere(0.05, '#e0756c', { pos: [0.18, 0.56, 0.07], wSeg: 6, hSeg: 5 });
  return b.build();
}

const EMBLEMS = {
  bus: emblemBus,
  scope: emblemScope,
  flag: emblemCards,
  clipboard: emblemClipboard,
};

/* ─────────────────────────────--- shard build ───────────────────────────── */

function buildShard(project, index) {
  const group = new Group();
  group.name = `shard-${project.id}`;

  const accent = new Color(project.accent);
  const accent2 = new Color(project.accent2);

  // mini floating island
  const b = new GeoBuilder(500 + index);
  b.cyl(1.12, 1.28, 0.24, 6, '#8dc258', { pos: [0, 0, 0], flat: true, jitter: 0.1 });
  b.cyl(1.28, 1.16, 0.18, 6, '#a98a5f', { pos: [0, -0.2, 0], flat: true, jitter: 0.1 });
  b.cyl(1.16, 1.0, 0.34, 6, '#8d7050', { pos: [0, -0.45, 0], flat: true, jitter: 0.1 });
  b.cone(1.0, 1.15, 6, '#6b6257', { pos: [0, -1.18, 0], rot: [Math.PI, 0, 0], flat: true });
  b.cone(0.55, 0.8, 6, '#4f4a43', { pos: [0, -1.85, 0], rot: [Math.PI, 0, 0], flat: true });
  // little tufts on the rim
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    b.blob(0.13, '#a9cf6b', { pos: [Math.cos(a) * 0.95, 0.16, Math.sin(a) * 0.95], squash: 0.55, wSeg: 6, hSeg: 5 });
  }
  b.cyl(0.55, 0.6, 0.1, 6, '#7cad4e', { pos: [0, 0.13, 0], flat: true });

  const islandMat = toon({ vcolors: true, rim: 0.3 });
  const island = new Mesh(b.build(), islandMat);
  island.userData.shard = index;

  // glowing ring
  const rg = new GeoBuilder(600 + index);
  rg.torus(0.72, 0.035, 5, 24, '#ffffff', { pos: [0, 0.2, 0], rot: [Math.PI / 2, 0, 0] });
  const ringMat = toon({ vcolors: true, emissive: 0.55, rim: 0.6 });
  ringMat.uniforms.uEmissive.value = 0.35;
  ringMat.uniforms.uColor.value.copy(accent);
  const ring = new Mesh(rg.build(), ringMat);
  ring.userData.shard = index;
  ring.renderOrder = 3;

  // emblem
  const buildEmblem = EMBLEMS[project.emblem] || emblemCards;
  const emblemMat = toon({ vcolors: true, rim: 0.24 });
  emblemMat.uniforms.uColor.value.lerp(accent, 0.12);
  const emblem = new Mesh(buildEmblem(), emblemMat);
  emblem.userData.shard = index;

  // base pedestal under the emblem
  const pb = new GeoBuilder(700 + index);
  pb.cyl(0.62, 0.7, 0.1, 8, '#f6ecd8', { pos: [0, 0.22, 0], flat: true });
  const plinth = new Mesh(pb.build(), toon({ vcolors: true, rim: 0.2 }));
  plinth.userData.shard = index;

  group.add(island, ring, plinth, emblem);
  group.userData = {
    index,
    project,
    island,
    emblem,
    ring,
    ringMat,
    accent,
    accent2,
    hover: 0,
    active: 0,
    offset: new Vector3(),
    scale: 1,
    lift: 0,
  };

  return group;
}

/* ──────────────────────────────→ grove model ────────────────────────────── */

export function createGrove(projects) {
  const group = new Group();
  group.name = 'grove';
  const origin = new Vector3(LAYOUT.grove.x, LAYOUT.grove.y, LAYOUT.grove.z);
  group.position.copy(origin);

  const shards = projects.map((p, i) => {
    const s = buildShard(p, i);
    group.add(s);
    return s;
  });

  let mode = 'orbit';
  let modeT = 0; // 0 = orbit, 1 = arc
  let activeIndex = -1;
  let hoverIndex = -1;

  // orbit parameters
  const ORBIT_R = 3.9;
  const N = shards.length;

  // arc parameters: a shallow fan facing the camera
  const arcPositions = shards.map((_, i) => {
    const t = N === 1 ? 0 : i / (N - 1) - 0.5;
    return new Vector3(t * 7.4, 0.35 - Math.abs(t) * 0.7, Math.abs(t) * 1.4 - 0.6);
  });

  const target = new Vector3();

  return {
    group,
    shards,
    origin,

    setMode(next) {
      mode = next;
    },

    setActive(i) {
      activeIndex = i;
    },

    setHover(i) {
      hoverIndex = i;
    },

    get activeIndex() {
      return activeIndex;
    },

    /** Nearest shard to a screen-space pointer, for cheap non-raycast picking. */
    update(dt, t) {
      modeT = damp(modeT, mode === 'arc' ? 1 : 0, 4.2, dt);

      shards.forEach((s, i) => {
        const u = s.userData;

        const isActive = i === activeIndex;
        const isHover = i === hoverIndex;

        u.hover = damp(u.hover, isHover || isActive ? 1 : 0, 8, dt);
        u.active = damp(u.active, isActive ? 1 : 0, 6, dt);

        // orbit position
        const a = (i / N) * Math.PI * 2 + t * 0.09;
        const ox = Math.cos(a) * ORBIT_R;
        const oz = Math.sin(a) * ORBIT_R;
        const oy = Math.sin(a * 2 + i) * 0.4;

        // arc position
        const arc = arcPositions[i];

        target.set(
          ox + (arc.x - ox) * modeT,
          oy + (arc.y - oy) * modeT,
          oz + (arc.z - oz) * modeT
        );

        // the chosen one steps forward and up
        target.y += u.active * 0.55;
        target.z += u.active * 1.15 + u.hover * 0.35;

        s.position.lerp(target, 1 - Math.exp(-6 * dt));

        // face outward while orbiting, face the viewer once settled into the arc
        const targetRot = (1 - modeT) * (Math.PI / 2 - a);
        s.rotation.y = damp(s.rotation.y, targetRot, 2.4, dt);

        const scale = 1 + u.hover * 0.09 + u.active * 0.16;
        s.scale.setScalar(scale);

        // gentle individual bob + tilt so they feel buoyant
        s.position.y += Math.sin(t * 0.7 + i * 1.3) * 0.06;
        s.rotation.z = Math.sin(t * 0.5 + i) * 0.035;

        // ring pulse
        u.ringMat.uniforms.uEmissive.value = 0.28 + u.hover * 0.7 + u.active * 0.9 + Math.sin(t * 1.6 + i) * 0.06;
        u.island.material.uniforms.uRim.value = 0.28 + u.hover * 0.35 + u.active * 0.5;

        // emblem spins a little faster when picked
        u.emblem.rotation.y += dt * (0.18 + u.active * 1.1);
      });
    },

    /** Which shard the pointer is over, given the camera and pointer NDC. */
    closestToPointer(raycaster, camera) {
      let best = -1;
      let bestDist = Infinity;
      const p = new Vector3();

      for (let i = 0; i < shards.length; i++) {
        shards[i].getWorldPosition(p);
        const d = raycaster.ray.distanceToPoint(p);
        const distToCam = camera.position.distanceTo(p);
        // angular tolerance scales with distance
        if (d < Math.max(0.9, distToCam * 0.045) && d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      return best;
    },
  };
}
