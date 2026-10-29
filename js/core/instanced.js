/** Small helper for building InstancedMeshes with per-instance tint. */

import { InstancedMesh, InstancedBufferAttribute, Matrix4, Quaternion, Euler, Vector3 } from 'three';

const _m = new Matrix4();
const _q = new Quaternion();
const _e = new Euler();
const _p = new Vector3();
const _s = new Vector3();

/**
 * @param {import('three').BufferGeometry} geo
 * @param {import('three').Material} material must declare USE_ITINT
 * @param {Array<{x,y,z,rotY?,scale?,sx?,sy?,sz?,tint?}>} transforms
 */
export function makeInstanced(geo, material, transforms, name) {
  const mesh = new InstancedMesh(geo, material, transforms.length);
  mesh.name = name;
  mesh.frustumCulled = false;

  const tints = new Float32Array(transforms.length * 3);

  transforms.forEach((t, i) => {
    _e.set(0, t.rotY || 0, 0);
    _q.setFromEuler(_e);
    _p.set(t.x, t.y, t.z);
    const s = t.scale == null ? 1 : t.scale;
    _s.set(s * (t.sx == null ? 1 : t.sx), s * (t.sy == null ? 1 : t.sy), s * (t.sz == null ? 1 : t.sz));
    _m.compose(_p, _q, _s);
    mesh.setMatrixAt(i, _m);

    const tint = t.tint || [1, 1, 1];
    tints[i * 3] = tint[0];
    tints[i * 3 + 1] = tint[1];
    tints[i * 3 + 2] = tint[2];
  });

  mesh.instanceMatrix.needsUpdate = true;
  mesh.geometry.setAttribute('aTint', new InstancedBufferAttribute(tints, 3));
  mesh.computeBoundingSphere();
  return mesh;
}
