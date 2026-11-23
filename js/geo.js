/* ============================================================
   Geo — 3D building blocks.

   Everything on the island is assembled from primitives that are
   baked into a few vertex-coloured meshes. That keeps the scene at
   a handful of draw calls while still letting each prop keep its
   own silhouette, palette, and faceting.
   ============================================================ */

import * as THREE from './vendor/three.module.min.js';
import { rng } from './core.js';

export { THREE };

/* ---------------- canvas helpers ---------------- */

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** Wrap a 2D canvas as an sRGB texture with sane filtering. */
export function canvasTexture(canvas, { srgb = true, repeat = 1, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (Array.isArray(repeat)) t.repeat.set(repeat[0], repeat[1]);
  else t.repeat.set(repeat, repeat);
  t.anisotropy = aniso;
  t.needsUpdate = true;
  return t;
}

/* ---------------- merged, vertex-coloured geometry ---------------- */

const _m4 = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();

export class GeoBuilder {
  constructor(seed = 7) {
    this.pos = [];
    this.nor = [];
    this.col = [];
    this.baseY = [];
    this.phase = [];
    this.windBase = 0;
    this.windPhase = 0;
    this.rand = rng(seed);
    this._c = new THREE.Color();
  }

  /**
   * Everything added after this call sways from `baseY` upward. Used by the
   * foliage shader so leaves move and trunks stay planted.
   */
  setWind(baseY, phase = 0) {
    this.windBase = baseY;
    this.windPhase = phase;
    return this;
  }

  get vertexCount() {
    return this.pos.length / 3;
  }

  get triangleCount() {
    return this.pos.length / 9;
  }

  _tint(color, variance) {
    this._c.set(color);
    if (variance) this._c.multiplyScalar(1 + (this.rand() - 0.5) * variance * 2);
    return this._c;
  }

  _matrix(x, y, z, o) {
    _e.set(o.rx || 0, o.ry || 0, o.rz || 0, 'XYZ');
    _q.setFromEuler(_e);
    const s = o.scale ?? 1;
    _s.set(o.sx ?? s, o.sy ?? s, o.sz ?? s);
    _v.set(x, y, z);
    return _m4.compose(_v, _q, _s);
  }

  /** Bake one geometry into the buffer. `flat` gives it faceted normals. */
  add(geom, color, x = 0, y = 0, z = 0, opts = {}) {
    const g = geom.index ? geom.toNonIndexed() : geom;
    if (opts.flat || !g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(this._matrix(x, y, z, opts));

    if (!g.attributes.color) {
      const tint = this._tint(color, opts.variance ?? 0.05);
      const count = g.attributes.position.count;
      const arr = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        arr[i * 3] = tint.r;
        arr[i * 3 + 1] = tint.g;
        arr[i * 3 + 2] = tint.b;
      }
      g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    }

    const p = g.attributes.position;
    const n = g.attributes.normal;
    const c = g.attributes.color;
    for (let i = 0; i < p.count; i++) {
      this.pos.push(p.getX(i), p.getY(i), p.getZ(i));
      if (n) this.nor.push(n.getX(i), n.getY(i), n.getZ(i));
      this.col.push(c.getX(i), c.getY(i), c.getZ(i));
      this.baseY.push(this.windBase);
      this.phase.push(this.windPhase);
    }
    g.dispose();
    return this;
  }

  /* ---------- primitive sugar ---------- */

  box(w, h, d, color, x = 0, y = 0, z = 0, o = {}) {
    return this.add(new THREE.BoxGeometry(w, h, d), color, x, y, z, o);
  }

  cyl(rTop, rBottom, h, seg, color, x = 0, y = 0, z = 0, o = {}) {
    return this.add(new THREE.CylinderGeometry(rTop, rBottom, h, seg, 1), color, x, y, z, o);
  }

  /** Cylinder with rounded caps, used for limbs and posts. */
  capsule(r, h, color, x = 0, y = 0, z = 0, o = {}) {
    const b = new GeoBuilder();
    b.cyl(r, r, Math.max(h - r, 0.1), 10, color, 0, 0, 0, { flat: false });
    b.sphere(r, color, 0, Math.max(h - r, 0.1) / 2, 0, { variance: 0 });
    b.sphere(r, color, 0, -Math.max(h - r, 0.1) / 2, 0, { variance: 0 });
    return this.add(b.toGeometry(), color, x, y, z, { ...o, variance: 0 });
  }

  sphere(r, color, x = 0, y = 0, z = 0, o = {}) {
    const g = new THREE.SphereGeometry(
      r,
      o.ws ?? 12,
      o.hs ?? 9,
      o.phiStart ?? 0,
      o.phiLength ?? Math.PI * 2,
      o.thetaStart ?? 0,
      o.thetaLength ?? Math.PI
    );
    return this.add(g, color, x, y, z, o);
  }

  ico(r, color, x = 0, y = 0, z = 0, o = {}) {
    return this.add(new THREE.IcosahedronGeometry(r, o.detail ?? 1), color, x, y, z, o);
  }

  dodeca(r, color, x = 0, y = 0, z = 0, o = {}) {
    return this.add(new THREE.DodecahedronGeometry(r, o.detail ?? 0), color, x, y, z, o);
  }

  cone(r, h, seg, color, x = 0, y = 0, z = 0, o = {}) {
    return this.add(new THREE.ConeGeometry(r, h, seg), color, x, y, z, o);
  }

  torus(r, tube, color, x = 0, y = 0, z = 0, o = {}) {
    return this.add(
      new THREE.TorusGeometry(r, tube, o.rs ?? 8, o.ts ?? 16, o.arc ?? Math.PI * 2),
      color,
      x,
      y,
      z,
      o
    );
  }

  plane(w, h, color, x = 0, y = 0, z = 0, o = {}) {
    return this.add(new THREE.PlaneGeometry(w, h), color, x, y, z, o);
  }

  toGeometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('aBaseY', new THREE.Float32BufferAttribute(this.baseY, 1));
    g.setAttribute('aPhase', new THREE.Float32BufferAttribute(this.phase, 1));
    g.computeBoundingSphere();
    return g;
  }
}

/* ---------------- materials ---------------- */

export function standardMat(opts = {}) {
  return new THREE.MeshStandardMaterial({
    roughness: 0.94,
    metalness: 0,
    vertexColors: true,
    ...opts,
  });
}

export function solidMat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.9, metalness: 0, ...opts });
}

export function basicMat(color, opts = {}) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color), ...opts });
}

/* ---------------- mesh helpers ---------------- */

export function addMesh(parent, geom, material, { x = 0, y = 0, z = 0, cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geom, material);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = receive;
  parent.add(m);
  return m;
}
