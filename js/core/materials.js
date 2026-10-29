/**
 * One cel-shading shader does the whole island.
 *
 * Every material shares the *same* uniform objects (by reference), so a palette
 * change is a handful of property writes instead of a material sweep. One
 * program, one shader compile, no lighting rig to update.
 */

import {
  ShaderMaterial,
  BufferGeometry,
  BufferAttribute,
  Color,
  Vector3,
  Vector2,
  Sphere,
  FrontSide,
  DoubleSide,
  NormalBlending,
} from 'three';

/** Global, shared-by-reference uniforms. */
export const G = {
  uTime: { value: 0 },
  uSunDir: { value: new Vector3(0.4, 0.7, 0.55).normalize() },
  uSunColor: { value: new Color('#fff3cf') },
  uSkyColor: { value: new Color('#bfe4f2') },
  uGroundColor: { value: new Color('#9db08a') },
  uFogColor: { value: new Color('#cfe8ee') },
  uFogNear: { value: 34 },
  uFogFar: { value: 168 },
  uRimColor: { value: new Color('#fff2c0') },
  uWindDir: { value: new Vector2(0.86, 0.5).normalize() },
  uWindSpeed: { value: 1.15 },
};

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec3  uColor;

  #ifdef USE_WIND
    uniform float uWindAmp;
    uniform float uWindBase;
    uniform float uWindTop;
    uniform vec2  uWindDir;
    uniform float uWindSpeed;
  #endif

  #ifdef USE_SWAY
    uniform float uSway;
    uniform float uSwaySpeed;
    uniform float uSwayTop;
  #endif

  #ifdef USE_VCOL
    attribute vec3 aColor;
  #endif
  #ifdef USE_ITINT
    attribute vec3 aTint;
  #endif

  #ifdef USE_MAP
    varying vec2 vUv;
  #endif

  varying vec3 vNormalW;
  varying vec3 vWorld;
  varying vec3 vColor;

  void main() {
    vec3 pos = position;
    vec3 nrm = normal;

    #ifdef USE_MAP
      vUv = uv;
    #endif

    #ifdef USE_INSTANCING
      vec3 origin = instanceMatrix[3].xyz;
    #else
      vec3 origin = vec3(0.0);
    #endif

    #ifdef USE_WIND
    {
      float h = clamp((pos.y - uWindBase) / max(uWindTop - uWindBase, 0.0001), 0.0, 1.0);
      h *= h;
      float phase = origin.x * 0.72 + origin.z * 0.47;
      float t = uTime * uWindSpeed;
      float w = sin(t + phase) * 0.64 + sin(t * 2.17 + phase * 1.7) * 0.36;
      pos.xz += uWindDir * (w * uWindAmp * h);
      nrm = normalize(nrm + vec3(uWindDir.x, 0.0, uWindDir.y) * (w * 0.28 * h));
    }
    #endif

    #ifdef USE_SWAY
    {
      float h2 = clamp(pos.y / max(uSwayTop, 0.0001), 0.0, 1.0);
      h2 *= h2;
      float phase2 = origin.x * 0.29 + origin.z * 0.23;
      float w2 = sin(uTime * uSwaySpeed + phase2);
      pos.x += w2 * uSway * h2;
      pos.z += cos(uTime * uSwaySpeed * 0.83 + phase2) * uSway * 0.62 * h2;
    }
    #endif

    mat3 nm;
    vec4 world;
    #ifdef USE_INSTANCING
      world = modelMatrix * instanceMatrix * vec4(pos, 1.0);
      nm = mat3(modelMatrix) * mat3(instanceMatrix);
    #else
      world = modelMatrix * vec4(pos, 1.0);
      nm = mat3(modelMatrix);
    #endif

    vWorld = world.xyz;
    vNormalW = normalize(nm * nrm);

    vec3 c = uColor;
    #ifdef USE_VCOL
      c *= aColor;
    #endif
    #ifdef USE_ITINT
      c *= aTint;
    #endif
    vColor = c;

    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3  uSunDir;
  uniform vec3  uSunColor;
  uniform vec3  uSkyColor;
  uniform vec3  uGroundColor;
  uniform vec3  uFogColor;
  uniform vec3  uRimColor;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uRim;
  uniform float uAmbient;
  uniform float uEmissive;
  uniform float uAlpha;

  #ifdef USE_MAP
    uniform sampler2D uMap;
    uniform float uAlphaTest;
    varying vec2 vUv;
  #endif

  varying vec3 vNormalW;
  varying vec3 vWorld;
  varying vec3 vColor;

  void main() {
    #ifdef USE_MAP
      vec4 tex = texture2D(uMap, vUv);
      if (tex.a < uAlphaTest) discard;
    #endif

    vec3 N = normalize(vNormalW);
    vec3 V = normalize(cameraPosition - vWorld);

    float ndl = dot(N, uSunDir);

    // four soft steps: shadow / low / mid / lit
    float shade = smoothstep(-0.06, 0.10, ndl) * 0.52
                + smoothstep(0.16, 0.30, ndl) * 0.26
                + smoothstep(0.52, 0.70, ndl) * 0.22;

    vec3 baseColor = vColor;
    #ifdef USE_MAP
      baseColor *= tex.rgb;
    #endif

    vec3 ambient = mix(uGroundColor, uSkyColor, N.y * 0.5 + 0.5) * uAmbient;
    vec3 col = baseColor * (ambient + uSunColor * shade);

    // silhouette glow
    float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.7);
    col += uRimColor * fres * uRim;

    // windows, lanterns, hovering thingummies
    col += baseColor * uEmissive;

    // aerial perspective
    float dist = distance(vWorld, cameraPosition);
    col = mix(col, uFogColor, smoothstep(uFogNear, uFogFar, dist));

    gl_FragColor = vec4(col, uAlpha);
    #include <colorspace_fragment>
  }
`;

/**
 * @param {object} o
 * @param {string} o.color    base tint (multiplies vertex colours)
 * @param {boolean} o.vcolors use the geometry's colour attribute
 * @param {boolean} o.wind    vertex wind on tall things
 * @param {boolean} o.sway    whole-object sway
 */
export function toon({
  color = '#ffffff',
  vcolors = true,
  wind = false,
  sway = false,
  itint = false,
  map = null,
  alphaTest = 0.5,
  windAmp = 0.11,
  windBase = 0,
  windTop = 1,
  swayAmp = 0.05,
  swaySpeed = 0.9,
  swayTop = 4,
  emissive = 0,
  rim = 0.16,
  ambient = 1.15,
  alpha = 1,
  doubleSide = false,
  depthWrite = true,
  transparent = false,
} = {}) {
  const defines = {};
  if (vcolors) defines.USE_VCOL = '';
  if (wind) defines.USE_WIND = '';
  if (sway) defines.USE_SWAY = '';
  if (itint) defines.USE_ITINT = '';
  if (map) defines.USE_MAP = '';

  const uniforms = {
    uTime: G.uTime,
    uSunDir: G.uSunDir,
    uSunColor: G.uSunColor,
    uSkyColor: G.uSkyColor,
    uGroundColor: G.uGroundColor,
    uFogColor: G.uFogColor,
    uFogNear: G.uFogNear,
    uFogFar: G.uFogFar,
    uRimColor: G.uRimColor,
    uWindDir: G.uWindDir,
    uWindSpeed: G.uWindSpeed,
    uColor: { value: new Color(color) },
    uRim: { value: rim },
    uAmbient: { value: ambient },
    uEmissive: { value: emissive },
    uAlpha: { value: alpha },
  };

  if (wind) {
    uniforms.uWindAmp = { value: windAmp };
    uniforms.uWindBase = { value: windBase };
    uniforms.uWindTop = { value: windTop };
  }
  if (sway) {
    uniforms.uSway = { value: swayAmp };
    uniforms.uSwaySpeed = { value: swaySpeed };
    uniforms.uSwayTop = { value: swayTop };
  }
  if (map) {
    uniforms.uMap = { value: map };
    uniforms.uAlphaTest = { value: alphaTest };
  }

  const mat = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    defines,
    transparent,
    depthWrite,
    side: doubleSide ? DoubleSide : FrontSide,
  });
  mat.userData.toonRim = rim;
  return mat;
}

/** Instance tint attribute helper: per-instance colour multiplier. */
export function enableInstancedTint(material) {
  material.defines.USE_ITINT = '';
  material.needsUpdate = true;
  return material;
}

/* ───────────────────────────── billboard cards ───────────────────────────── */

const billboardVertex = /* glsl */ `
  attribute vec3 aCenter;
  attribute vec2 aSize;
  attribute float aRot;
  attribute float aAlpha;
  attribute vec3 aTint;

  varying vec2 vUv;
  varying float vAlpha;
  varying vec3 vTint;
  varying float vDepth;

  void main() {
    vUv = uv;
    vAlpha = aAlpha;
    vTint = aTint;

    // camera-facing quad, centered on the (transformed) card anchor
    vec3 camRight = normalize(vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]));
    vec3 camUp    = normalize(vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]));

    float c = cos(aRot), s = sin(aRot);
    vec2 p = vec2(uv.x - 0.5, uv.y - 0.5);
    p = vec2(p.x * c - p.y * s, p.x * s + p.y * c);
    p *= aSize;

    vec3 center = (modelMatrix * vec4(aCenter, 1.0)).xyz;
    vec3 world = center + camRight * p.x + camUp * p.y;

    vec4 mv = viewMatrix * vec4(world, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const billboardFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uTint;
  uniform vec3 uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uOpacity;

  varying vec2 vUv;
  varying float vAlpha;
  varying vec3 vTint;
  varying float vDepth;

  void main() {
    vec4 tex = texture2D(uMap, vUv);
    if (tex.a < 0.004) discard;

    vec3 col = tex.rgb * vTint * uTint;
    float fog = smoothstep(uFogNear, uFogFar, vDepth);
    col = mix(col, uFogColor, fog * 0.9);

    gl_FragColor = vec4(col, tex.a * vAlpha * uOpacity);
  }
`;

/**
 * Card material for clouds and other camera-facing quads.
 * All cards live in one geometry -> a single draw call.
 */
export function billboard(map, { opacity = 1, tint = '#ffffff', fogNear, fogFar } = {}) {
  return new ShaderMaterial({
    vertexShader: billboardVertex,
    fragmentShader: billboardFragment,
    uniforms: {
      uMap: { value: map },
      uTint: { value: new Color(tint) },
      uFogColor: G.uFogColor,
      uFogNear: fogNear ? { value: fogNear } : G.uFogNear,
      uFogFar: fogFar ? { value: fogFar } : G.uFogFar,
      uOpacity: { value: opacity },
    },
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: NormalBlending,
  });
}

/** Build one geometry holding many billboard quads. */
export function buildBillboardGeometry(cards) {
  const n = cards.length;
  const pos = new Float32Array(n * 4 * 3);
  const uv = new Float32Array(n * 4 * 2);
  const center = new Float32Array(n * 4 * 3);
  const size = new Float32Array(n * 4 * 2);
  const rot = new Float32Array(n * 4);
  const alpha = new Float32Array(n * 4);
  const tint = new Float32Array(n * 4 * 3);
  const index = new Uint16Array(n * 6);

  const quadUv = [0, 0, 1, 0, 0, 1, 1, 1];

  for (let i = 0; i < n; i++) {
    const c = cards[i];
    for (let v = 0; v < 4; v++) {
      const o = i * 4 + v;
      pos[o * 3] = 0;
      pos[o * 3 + 1] = 0;
      pos[o * 3 + 2] = 0;
      uv[o * 2] = quadUv[v * 2];
      uv[o * 2 + 1] = quadUv[v * 2 + 1];
      center[o * 3] = c.pos[0];
      center[o * 3 + 1] = c.pos[1];
      center[o * 3 + 2] = c.pos[2];
      size[o * 2] = c.size[0];
      size[o * 2 + 1] = c.size[1];
      rot[o] = c.rot || 0;
      alpha[o] = c.alpha == null ? 1 : c.alpha;
      const t = c.tint || [1, 1, 1];
      tint[o * 3] = t[0];
      tint[o * 3 + 1] = t[1];
      tint[o * 3 + 2] = t[2];
    }
    const b = i * 4;
    index.set([b, b + 1, b + 2, b + 2, b + 1, b + 3], i * 6);
  }

  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('uv', new BufferAttribute(uv, 2));
  g.setAttribute('aCenter', new BufferAttribute(center, 3));
  g.setAttribute('aSize', new BufferAttribute(size, 2));
  g.setAttribute('aRot', new BufferAttribute(rot, 1));
  g.setAttribute('aAlpha', new BufferAttribute(alpha, 1));
  g.setAttribute('aTint', new BufferAttribute(tint, 3));
  g.setIndex(new BufferAttribute(index, 1));
  // The quads are positioned entirely in the vertex shader, so the CPU-side
  // bounding volume is meaningless — pin it wide open instead of computing it.
  g.boundingSphere = new Sphere(new Vector3(0, 0, 0), 1e6);
  g.computeBoundingSphere = () => {
    g.boundingSphere.center.set(0, 0, 0);
    g.boundingSphere.radius = 1e6;
  };
  return g;
}
