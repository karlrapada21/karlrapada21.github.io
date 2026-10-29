/**
 * Pond water: cheap analytic ripples, fresnel sky tint, sun glint, shore foam.
 * One draw call, no render targets, no reflection pass.
 */

import { Mesh, CircleGeometry, ShaderMaterial, Color, DoubleSide } from 'three';
import { palette } from '../core/palette.js';
import { G } from '../core/materials.js';
import { POND, heightAt } from './island.js';
import { WATER_LEVEL } from './layout.js';

const vertex = /* glsl */ `
  varying vec2 vP;
  varying vec3 vWorld;
  varying float vEdge;

  uniform float uRadius;

  void main() {
    vP = position.xy / uRadius;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vEdge = length(vP);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragment = /* glsl */ `
  uniform float uTime;
  uniform vec3  uDeep;
  uniform vec3  uShallow;
  uniform vec3  uFoam;
  uniform vec3  uSkyColor;
  uniform vec3  uSunColor;
  uniform vec3  uSunDir;
  uniform vec3  uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;

  varying vec2 vP;
  varying vec3 vWorld;
  varying float vEdge;

  void main() {
    vec2 p = vP;
    float r = length(p);
    float t = uTime;

    // layered ripples approximating a wave normal
    float w1 = sin(p.x * 8.5 + t * 1.05) * cos(p.y * 6.8 - t * 0.85);
    float w2 = sin((p.x + p.y) * 13.0 - t * 1.6);
    float w3 = sin(r * 16.0 - t * 2.1);
    vec2 grad = vec2(w1 * 0.55 + w2 * 0.3, w2 * 0.5 + w3 * 0.2);
    vec3 n = normalize(vec3(grad.x * 0.11, 1.0, grad.y * 0.11));

    vec3 V = normalize(cameraPosition - vWorld);
    float fres = pow(1.0 - clamp(dot(n, V), 0.0, 1.0), 3.0);

    vec3 col = mix(uDeep, uShallow, 0.45 + 0.25 * sin(r * 4.2 - t * 0.7));
    col = mix(col, uSkyColor, 0.30 + fres * 0.5);

    // sun sparkle — a tight specular lobe so it reads as glinting water
    vec3 H = normalize(uSunDir + V);
    float spec = pow(max(dot(n, H), 0.0), 110.0);
    col += uSunColor * spec * 1.8;

    // foam where the water meets the bank
    float angular = sin(atan(p.y, p.x) * 15.0 + t * 1.1) * 0.018;
    float shore = smoothstep(0.74, 0.99, r + angular);
    float ripple = 0.55 + 0.45 * sin(r * 24.0 - t * 2.6);
    col = mix(col, uFoam, shore * (0.55 + ripple * 0.45));

    float dist = distance(vWorld, cameraPosition);
    col = mix(col, uFogColor, smoothstep(uFogNear, uFogFar, dist));

    float alpha = (1.0 - smoothstep(0.955, 1.0, r)) * (0.82 + fres * 0.18);
    gl_FragColor = vec4(col, alpha);
    #include <colorspace_fragment>
  }
`;

export function createWater() {
  const radius = 3.15;
  const geo = new CircleGeometry(radius, 44);
  geo.rotateX(-Math.PI / 2);

  const material = new ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: {
      uTime: G.uTime,
      uRadius: { value: radius },
      uDeep: { value: palette.waterDeep },
      uShallow: { value: palette.waterShallow },
      uFoam: { value: palette.waterFoam },
      uSkyColor: G.uSkyColor,
      uSunColor: G.uSunColor,
      uSunDir: G.uSunDir,
      uFogColor: G.uFogColor,
      uFogNear: G.uFogNear,
      uFogFar: G.uFogFar,
    },
    transparent: true,
    side: DoubleSide,
    depthWrite: true,
  });

  const mesh = new Mesh(geo, material);
  mesh.name = 'pond';
  mesh.position.set(POND.x, WATER_LEVEL, POND.z);
  mesh.renderOrder = 2;
  return mesh;
}

/** Sandy bank ring drawn just under the water line. */
export function shoreLevel() {
  return heightAt(POND.x, POND.z);
}
