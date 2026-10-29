/**
 * Geometry toolkit.
 *
 * The whole island is built out of primitives that get baked into single merged,
 * vertex-coloured geometries. Each prop therefore costs one draw call no matter
 * how many pieces it is made of.
 */

import {
  BufferGeometry,
  BufferAttribute,
  BoxGeometry,
  CylinderGeometry,
  ConeGeometry,
  SphereGeometry,
  IcosahedronGeometry,
  DodecahedronGeometry,
  TorusGeometry,
  PlaneGeometry,
  LatheGeometry,
  Vector2,
  Vector3,
  Euler,
  Matrix4,
  Quaternion,
  Color,
} from 'three';

import { mulberry32 } from './util.js';

const _m = new Matrix4();
const _q = new Quaternion();
const _e = new Euler();
const _v = new Vector3();
const _s = new Vector3();

/** Bake a solid colour into a geometry's colour attribute. */
export function paint(geo, hex, tintJitter = 0, rnd = Math.random) {
  const count = geo.attributes.position.count;
  const arr = new Float32Array(count * 3);
  const c = new Color(hex);
  for (let i = 0; i < count; i++) {
    const j = tintJitter ? 1 + (rnd() - 0.5) * tintJitter : 1;
    arr[i * 3] = c.r * j;
    arr[i * 3 + 1] = c.g * j;
    arr[i * 3 + 2] = c.b * j;
  }
  geo.setAttribute('aColor', new BufferAttribute(arr, 3));
  return geo;
}

function ensureColor(geo) {
  if (!geo.attributes.aColor) {
    const count = geo.attributes.position.count;
    const arr = new Float32Array(count * 3).fill(1);
    geo.setAttribute('aColor', new BufferAttribute(arr, 3));
  }
  return geo;
}

/**
 * Concatenate geometries into one non-indexed BufferGeometry with
 * position / normal / uv / color. Everything stays draw-call cheap.
 */
export function mergeGeos(geos) {
  const parts = geos.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    ensureColor(n);
    if (!n.attributes.uv) {
      const c = n.attributes.position.count;
      n.setAttribute('uv', new BufferAttribute(new Float32Array(c * 2), 2));
    }
    return n;
  });

  let total = 0;
  for (const p of parts) total += p.attributes.position.count;

  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  const uv = new Float32Array(total * 2);
  const col = new Float32Array(total * 3);

  let o = 0;
  for (const p of parts) {
    const c = p.attributes.position.count;
    pos.set(p.attributes.position.array, o * 3);
    nor.set(p.attributes.normal.array, o * 3);
    uv.set(p.attributes.uv.array.subarray(0, c * 2), o * 2);
    col.set(p.attributes.aColor.array, o * 3);
    o += c;
  }

  const out = new BufferGeometry();
  out.setAttribute('position', new BufferAttribute(pos, 3));
  out.setAttribute('normal', new BufferAttribute(nor, 3));
  out.setAttribute('uv', new BufferAttribute(uv, 2));
  out.setAttribute('aColor', new BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}

/**
 * Fluent geometry packer.
 *
 *   const b = new GeoBuilder();
 *   b.box(1, 2, 1, '#c98b5e', { pos: [0, 1, 0] });
 *   mesh = b.build();
 */
export class GeoBuilder {
  constructor(seed = 1337) {
    this.parts = [];
    this.rnd = mulberry32(seed);
  }

  /** Add an arbitrary geometry with a transform + colour. */
  add(geo, hex, opts = {}) {
    const { pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1], flat = false, jitter = 0, quat = null } = opts;

    paint(geo, hex, jitter, this.rnd);

    if (quat) _q.copy(quat);
    else _q.setFromEuler(_e.set(rot[0], rot[1], rot[2], 'YXZ'));

    _m.compose(_v.set(pos[0], pos[1], pos[2]), _q, _s.set(scale[0], scale[1], scale[2]));
    geo.applyMatrix4(_m);

    let g = geo.index ? geo.toNonIndexed() : geo;
    if (flat) {
      g.computeVertexNormals(); // non-indexed => faceted
    }
    this.parts.push(g);
    return this;
  }

  box(w, h, d, hex, opts) {
    return this.add(new BoxGeometry(w, h, d), hex, opts);
  }

  /** Rounded-ish box: a box with bevelled look via a squashed sphere is overkill;
   *  we simply use a box plus a soft top sphere where recipes ask for it. */
  cyl(rt, rb, h, seg, hex, opts) {
    return this.add(new CylinderGeometry(rt, rb, h, seg), hex, opts);
  }

  cone(r, h, seg, hex, opts) {
    return this.add(new ConeGeometry(r, h, seg), hex, opts);
  }

  sphere(r, hex, opts = {}) {
    const { wSeg = 12, hSeg = 9, ...rest } = opts;
    return this.add(new SphereGeometry(r, wSeg, hSeg), hex, rest);
  }

  ico(r, hex, opts = {}) {
    const { detail = 0, ...rest } = opts;
    return this.add(new IcosahedronGeometry(r, detail), hex, { flat: true, ...rest });
  }

  dodeca(r, hex, opts = {}) {
    return this.add(new DodecahedronGeometry(r, 0), hex, { flat: true, ...opts });
  }

  torus(r, tube, rSeg, tSeg, hex, opts) {
    return this.add(new TorusGeometry(r, tube, rSeg, tSeg), hex, opts);
  }

  plane(w, h, hex, opts) {
    return this.add(new PlaneGeometry(w, h), hex, opts);
  }

  prism(w, h, d, hex, opts) {
    return this.add(prismGeometry(w, h, d), hex, opts);
  }

  lathe(points, seg, hex, opts) {
    return this.add(new LatheGeometry(points.map((p) => new Vector2(p[0], p[1])), seg), hex, opts);
  }

  /** A squashed sphere â€” the workhorse for Ghibli-style tree canopies and bushes. */
  blob(r, hex, opts = {}) {
    const { squash = 0.78, wSeg = 10, hSeg = 8, ...rest } = opts;
    return this.add(new SphereGeometry(r, wSeg, hSeg), hex, { scale: [1, squash, 1], ...rest });
  }

  /** A little cluster of blobs â€” clouds, canopies, smoke. */
  cluster(count, r, spread, hex, opts = {}) {
    const { squash = 0.75, jitter = 0.14, ...rest } = opts;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + this.rnd() * 0.9;
      const d = spread * (0.35 + this.rnd() * 0.65);
      this.blob(r * (0.62 + this.rnd() * 0.5), hex, {
        pos: [Math.cos(a) * d, (this.rnd() - 0.5) * r * 0.5, Math.sin(a) * d],
        squash,
        jitter,
        ...rest,
      });
    }
    return this;
  }

  build() {
    const g = mergeGeos(this.parts);
    this.parts.length = 0;
    return g;
  }
}

/** Crossed vertical quads â€” the classic cheap grass tuft. */
export function grassTuftGeometry(blades = 3, height = 1, width = 0.34, colorTop = '#a9d46e', colorBottom = '#5f8f47') {
  const pos = [];
  const nor = [];
  const uv = [];
  const col = [];
  const top = new Color(colorTop);
  const bot = new Color(colorBottom);

  const rnd = mulberry32(7);

  for (let i = 0; i < blades; i++) {
    const a = (i / blades) * Math.PI + rnd() * 0.3;
    const h = height * (0.7 + rnd() * 0.55);
    const w = width * (0.75 + rnd() * 0.5);
    const ox = (rnd() - 0.5) * 0.22;
    const oz = (rnd() - 0.5) * 0.22;
    const dx = Math.cos(a) * w;
    const dz = Math.sin(a) * w;

    // triangle-ish blade: two verts at the base, one at the top
    const verts = [
      [-dx + ox, 0, -dz + oz],
      [dx + ox, 0, dz + oz],
      [ox + dx * 0.22, h, oz + dz * 0.22],
    ];
    const heights = [0, 0, h];

    // double sided by adding the mirrored triangle
    for (const order of [[0, 1, 2], [2, 1, 0]]) {
      for (const idx of order) {
        pos.push(...verts[idx]);
        nor.push(0, 1, 0);
        uv.push(verts[idx][0] * 0.5 + 0.5, heights[idx] / height);
        const c = heights[idx] > 0.01 ? top : bot;
        col.push(c.r, c.g, c.b);
      }
    }
  }

  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('normal', new BufferAttribute(new Float32Array(nor), 3));
  g.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2));
  g.setAttribute('aColor', new BufferAttribute(new Float32Array(col), 3));
  g.computeBoundingSphere();
  return g;
}

/** Flat ring/shadow decal used to seat objects on the ground. */
export function blobShadowGeometry(radius = 1, segments = 18) {
  const g = new PlaneGeometry(radius * 2, radius * 2, 1, 1);
  g.rotateX(-Math.PI / 2);
  return g;
}

/**
 * Triangular prism with the ridge running along Z â€” cheap gable roofs,
 * awnings, wedges and roof slabs.
 */
export function prismGeometry(width, height, depth) {
  const w = width / 2;
  const d = depth / 2;
  const A0 = [-w, 0, d];
  const B0 = [w, 0, d];
  const C0 = [0, height, d];
  const A1 = [-w, 0, -d];
  const B1 = [w, 0, -d];
  const C1 = [0, height, -d];

  const tris = [
    [A0, B0, C0], // front
    [A1, C1, B1], // back
    [A0, A1, B1], [A0, B1, B0], // bottom
    [A0, C0, C1], [A0, C1, A1], // left slope
    [B0, B1, C1], [B0, C1, C0], // right slope
  ];

  const pos = new Float32Array(tris.length * 9);
  let o = 0;
  for (const t of tris) {
    for (const p of t) {
      pos[o++] = p[0];
      pos[o++] = p[1];
      pos[o++] = p[2];
    }
  }

  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

/** A flat quad standing up (billboards that do not follow the camera). */
export function quadGeometry(width, height) {
  return new PlaneGeometry(width, height);
}

/** Radial alpha texture, used for pollen motes, shadows and glow cards. */
export function radialTexture(size = 64, inner = '#ffffff', outer = 'rgba(255,255,255,0)') {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.45, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return c;
}

/** Sphere -> cylinder height map helper for the island rim. */
export function circlePoints(radius, count, rnd = Math.random, wobble = 0.12) {
  const pts = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const r = radius * (1 + (rnd() - 0.5) * wobble * 2);
    pts.push([Math.cos(a) * r, Math.sin(a) * r, a]);
  }
  return pts;
}
