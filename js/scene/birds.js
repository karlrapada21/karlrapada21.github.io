/** A handful of distant birds on slow circular paths. One instanced draw call. */

import { InstancedMesh, Matrix4, Quaternion, Euler, Vector3, Group } from 'three';
import { toon } from '../core/materials.js';
import { GeoBuilder } from '../core/geo.js';
import { mulberry32 } from '../core/util.js';

function birdGeometry() {
  const b = new GeoBuilder(8181);
  b.box(0.5, 0.03, 0.15, '#4a4239', { pos: [-0.26, 0.07, 0], rot: [0, 0, 0.3], flat: true });
  b.box(0.5, 0.03, 0.15, '#4a4239', { pos: [0.26, 0.07, 0], rot: [0, 0, -0.3], flat: true });
  b.box(0.2, 0.09, 0.1, '#403a33', { pos: [0, 0.02, 0], flat: true });
  return b.build();
}

export function createBirds(count = 6) {
  const rnd = mulberry32(9210);
  const geo = birdGeometry();
  const mat = toon({ vcolors: true, rim: 0.3, ambient: 1.15 });
  const mesh = new InstancedMesh(geo, mat, count);
  mesh.name = 'birds';
  mesh.frustumCulled = false;

  const birds = [];
  for (let i = 0; i < count; i++) {
    birds.push({
      radius: 19 + rnd() * 17,
      height: 13 + rnd() * 11,
      speed: (0.045 + rnd() * 0.045) * (rnd() > 0.4 ? 1 : -1),
      phase: rnd() * Math.PI * 2,
      scale: 0.75 + rnd() * 0.6,
      flap: 6 + rnd() * 4,
    });
  }

  const m = new Matrix4();
  const q = new Quaternion();
  const e = new Euler();
  const p = new Vector3();
  const s = new Vector3();

  const group = new Group();
  group.add(mesh);

  return {
    group,
    update(t) {
      for (let i = 0; i < birds.length; i++) {
        const b = birds[i];
        const a = b.phase + t * b.speed;
        p.set(Math.cos(a) * b.radius, b.height + Math.sin(t * 0.6 + b.phase) * 0.8, Math.sin(a) * b.radius);

        // heading is tangent to the circle
        e.set(0, -a + (b.speed > 0 ? 0 : Math.PI), 0);
        q.setFromEuler(e);
        const flap = 0.45 + 0.55 * Math.abs(Math.sin(t * b.flap + b.phase));
        s.set(b.scale, b.scale * flap, b.scale);
        m.compose(p, q, s);
        mesh.setMatrixAt(i, m);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
