/**
 * Gradient sky dome with a sun disc, horizon haze and procedural stars.
 * Drawn first with depth testing off, so everything else paints over it.
 */

import {
  Mesh,
  SphereGeometry,
  ShaderMaterial,
  BackSide,
  Color,
  Vector3,
} from 'three';
import { palette } from '../core/palette.js';
import { G } from '../core/materials.js';

const vertex = /* glsl */ `
  varying vec3 vDir;

  void main() {
    // the dome is re-centred on the camera every frame, so the local position
    // is already the view direction
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform vec3  uTop;
  uniform vec3  uMid;
  uniform vec3  uBottom;
  uniform vec3  uHorizon;
  uniform vec3  uSunDir;
  uniform vec3  uSunDisc;
  uniform vec3  uSunGlow;
  uniform float uHorizonStrength;
  uniform float uGlowStrength;
  uniform float uStarOpacity;
  uniform float uExposure;

  varying vec3 vDir;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  void main() {
    vec3 dir = normalize(vDir);
    float h = dir.y;

    // The camera looks slightly down, so only the bottom slice of the dome is
    // visible: the blue has to arrive quickly above the horizon, and the warm
    // band has to stay thin, or the whole frame turns into haze.
    vec3 col = mix(uBottom, uMid, smoothstep(-0.07, 0.16, h));
    col = mix(col, uTop, smoothstep(0.04, 0.55, h));

    // warm haze sitting on the horizon line — stronger on the sun's side, and
    // blended rather than added so it never clips to flat white
    vec3 hdir = normalize(vec3(dir.x, 0.0, dir.z) + vec3(0.0001, 0.0, 0.0));
    vec3 sdir = normalize(vec3(uSunDir.x, 0.0, uSunDir.z) + vec3(0.0001, 0.0, 0.0));
    float toward = max(dot(hdir, sdir), 0.0);
    float haze = exp(-max(h, 0.0) * 9.0) * uHorizonStrength * (0.3 + 0.7 * pow(toward, 1.6));
    col = mix(col, uHorizon, clamp(haze, 0.0, 0.68));

    // below the horizon: a cooler, hazier void so the island reads as floating
    float below = smoothstep(0.02, -0.62, h);
    col = mix(col, mix(uBottom, uMid, 0.5) * 0.66, below);

    // sun: a disc plus a tight bloom — a wide falloff greys out the whole sky
    float sd = dot(dir, uSunDir);
    float above = smoothstep(-0.12, 0.05, h);
    float disc = smoothstep(0.99915, 0.99965, sd);
    float bloom = pow(max(sd, 0.0), 150.0) * 0.55
                + pow(max(sd, 0.0), 26.0) * 0.24
                + pow(max(sd, 0.0), 3.0) * 0.03;

    col += uSunDisc * disc * 1.35 * above;
    col += uSunGlow * bloom * uGlowStrength * above;

    // stars, only visible when the palette asks for them
    if (uStarOpacity > 0.001) {
      vec3 sp = dir * 190.0;
      float s = hash(floor(sp));
      float twinkle = 0.55 + 0.45 * sin(hash(floor(sp) + 7.3) * 60.0 + sd * 3.0);
      float star = smoothstep(0.9972, 1.0, s) * twinkle;
      star *= smoothstep(0.005, 0.22, h);
      col += vec3(0.92, 0.95, 1.0) * star * uStarOpacity * 1.5;
    }

    // a faint band of milky light at night
    if (uStarOpacity > 0.001) {
      float band = exp(-pow((h - 0.34) * 4.2, 2.0)) * 0.055 * uStarOpacity;
      col += vec3(0.55, 0.62, 0.86) * band;
    }

    gl_FragColor = vec4(col * uExposure, 1.0);
    #include <colorspace_fragment>
  }
`;

export function createSky(radius = 460) {
  const material = new ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: {
      uTop: { value: palette.skyTop },
      uMid: { value: palette.skyMid },
      uBottom: { value: palette.skyBottom },
      uHorizon: { value: palette.horizonColor },
      uSunDir: G.uSunDir,
      uSunDisc: { value: palette.sunDisc },
      uSunGlow: { value: palette.sunGlow },
      uHorizonStrength: { value: palette.horizonStrength },
      uGlowStrength: { value: palette.glowStrength },
      uStarOpacity: { value: palette.starOpacity },
      uExposure: { value: 1 },
    },
    side: BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
  });

  // uniforms that live on the palette object are plain numbers, so mirror them
  const mesh = new Mesh(new SphereGeometry(radius, 32, 20), material);
  mesh.name = 'sky';
  mesh.renderOrder = -1000;
  mesh.frustumCulled = false;

  // The palette holds numbers for these; poll them each frame instead of
  // rebuilding uniforms, which keeps palette.js as the only source of truth.
  mesh.onBeforeRender = () => {
    material.uniforms.uHorizonStrength.value = palette.horizonStrength;
    material.uniforms.uGlowStrength.value = palette.glowStrength;
    material.uniforms.uStarOpacity.value = palette.starOpacity;
    material.uniforms.uExposure.value = palette.exposure;
  };

  return mesh;
}
