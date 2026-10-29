/**
 * Pollen motes by day, fireflies at night. Two Points draw calls, both gentle.
 */

import {
  Points,
  BufferGeometry,
  BufferAttribute,
  ShaderMaterial,
  CanvasTexture,
  AdditiveBlending,
  NormalBlending,
  SRGBColorSpace,
  LinearFilter,
  Color,
} from 'three';
import { G } from '../core/materials.js';
import { palette } from '../core/palette.js';
import { mulberry32 } from '../core/util.js';

function motesTexture(size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.28, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.22)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

const vertex = /* glsl */ `
  attribute float aPhase;
  attribute float aSize;
  attribute float aSpeed;

  uniform float uTime;
  uniform float uScale;
  uniform float uDrift;
  uniform float uRise;

  varying float vTwinkle;
  varying float vFog;

  void main() {
    vec3 p = position;

    float ph = aPhase * 6.2831853;
    p.x += sin(uTime * 0.29 * aSpeed + ph) * uDrift;
    p.z += cos(uTime * 0.24 * aSpeed + ph * 1.7) * uDrift;
    p.y += sin(uTime * 0.21 * aSpeed + ph * 0.6) * uDrift * 0.55 + sin(uTime * 0.13 + ph) * uRise;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float dist = -mv.z;

    gl_PointSize = clamp(aSize * uScale / max(dist, 0.1), 1.0, 72.0);
    gl_Position = projectionMatrix * mv;

    vTwinkle = 0.45 + 0.55 * (0.5 + 0.5 * sin(uTime * 1.7 * aSpeed + ph * 2.3));
    vFog = smoothstep(18.0, 92.0, dist);
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3  uColor;
  uniform vec3  uFogColor;
  uniform float uOpacity;

  varying float vTwinkle;
  varying float vFog;

  void main() {
    vec4 tex = texture2D(uMap, gl_PointCoord);
    if (tex.a < 0.01) discard;
    vec3 col = uColor * tex.rgb;
    col = mix(col, uFogColor, vFog * 0.55);
    float a = tex.a * vTwinkle * uOpacity * (1.0 - vFog * 0.7);
    gl_FragColor = vec4(col, a);
    #include <colorspace_fragment>
  }
`;

function buildSystem({ count, spread, yRange, sizeRange, seed, color, blending, drift, rise, opacity }) {
  const rnd = mulberry32(seed);
  const pos = new Float32Array(count * 3);
  const phase = new Float32Array(count);
  const size = new Float32Array(count);
  const speed = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const a = rnd() * Math.PI * 2;
    const r = Math.sqrt(rnd()) * spread;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = yRange[0] + rnd() * (yRange[1] - yRange[0]);
    pos[i * 3 + 2] = Math.sin(a) * r;
    phase[i] = rnd();
    size[i] = sizeRange[0] + rnd() * (sizeRange[1] - sizeRange[0]);
    speed[i] = 0.6 + rnd() * 0.9;
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('aPhase', new BufferAttribute(phase, 1));
  geo.setAttribute('aSize', new BufferAttribute(size, 1));
  geo.setAttribute('aSpeed', new BufferAttribute(speed, 1));

  const material = new ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: {
      uTime: G.uTime,
      uScale: { value: 800 },
      uMap: { value: motesTexture() },
      uColor: { value: new Color(color) },
      uFogColor: G.uFogColor,
      uOpacity: { value: opacity },
      uDrift: { value: drift },
      uRise: { value: rise },
    },
    transparent: true,
    depthWrite: false,
    blending,
  });

  const points = new Points(geo, material);
  points.frustumCulled = false;
  return points;
}

export function createParticles(quality = 'high') {
  const root = [];
  const scale = quality === 'high' ? 1 : quality === 'medium' ? 0.6 : 0.32;

  const pollen = buildSystem({
    count: Math.round(420 * scale),
    spread: 17,
    yRange: [0.4, 9.5],
    sizeRange: [0.05, 0.13],
    seed: 31337,
    color: '#fff6d8',
    blending: NormalBlending,
    drift: 0.9,
    rise: 0.5,
    opacity: 0.62,
  });
  pollen.name = 'pollen';
  pollen.renderOrder = 6;
  pollen.visible = true;
  root.push(pollen);

  const fireflies = buildSystem({
    count: Math.round(150 * scale),
    spread: 15,
    yRange: [0.5, 6.5],
    sizeRange: [0.09, 0.22],
    seed: 90909,
    color: '#e9ff9a',
    blending: AdditiveBlending,
    drift: 1.3,
    rise: 0.9,
    opacity: 0,
  });
  fireflies.name = 'fireflies';
  fireflies.renderOrder = 7;
  fireflies.visible = false;
  root.push(fireflies);

  return {
    group: root,
    /** @param {number} projScale framebufferHeight / (2*tan(fov/2)) */
    setProjectionScale(projScale) {
      for (const p of root) p.material.uniforms.uScale.value = projScale;
    },
    update() {
      const night = palette.fireflies;
      pollen.visible = night < 0.85;
      pollen.material.uniforms.uOpacity.value = 0.62 * (1 - night * 0.85);
      fireflies.visible = night > 0.02;
      fireflies.material.uniforms.uOpacity.value = night * 0.95;
    },
  };
}
