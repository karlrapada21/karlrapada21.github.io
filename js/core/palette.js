/**
 * Time-of-day palettes. Everything the island looks like is driven from here,
 * so a mood change is a few dozen uniform writes.
 */

import { Color, Vector3 } from 'three';
import { G } from './materials.js';
import { lerp, clamp } from './util.js';

const v = (x, y, z) => new Vector3(x, y, z).normalize();

const RAW = [
  {
    id: 'day',
    label: 'Midday',
    sunDir: v(0.38, 0.74, -0.55),
    exposure: 1.0,
    // surface lighting
    sunColor: '#fff8e2',
    skyColor: '#cbeafb',
    groundColor: '#94a97f',
    fogColor: '#cbe7f2',
    fogNear: 40,
    fogFar: 190,
    rimColor: '#eaf7ff',
    // sky dome
    skyTop: '#3f8fce',
    skyMid: '#9fd7ef',
    skyBottom: '#e9f7fb',
    horizonColor: '#fff4d8',
    horizonStrength: 0.16,
    sunDisc: '#fffdf2',
    sunGlow: '#ffeec4',
    glowStrength: 1.0,
    starOpacity: 0,
    cloudTint: '#ffffff',
    cloudShadow: '#cfdcea',
    cloudOpacity: 0.96,
    waterDeep: '#3f8fa8',
    waterShallow: '#8fd3d9',
    waterFoam: '#eafcff',
    windowGlow: 0.0,
    lanternGlow: 0.0,
    fireflies: 0.0,
    crystalGlow: 0.5,
    tintUI: '#f2fbff',
  },
  {
    id: 'golden',
    label: 'Golden hour',
    sunDir: v(0.44, 0.145, -0.88),
    exposure: 1.0,
    sunColor: '#ffeecb',
    skyColor: '#c3dcee',
    groundColor: '#9b8760',
    fogColor: '#eed7b3',
    fogNear: 34,
    fogFar: 172,
    rimColor: '#ffe6ba',
    skyTop: '#2f6fb0',
    skyMid: '#7bb6de',
    skyBottom: '#ffd79c',
    horizonColor: '#ffc27a',
    horizonStrength: 0.34,
    sunDisc: '#fff6d8',
    sunGlow: '#ffb85e',
    glowStrength: 1.15,
    starOpacity: 0,
    cloudTint: '#fff4e0',
    cloudShadow: '#dcc4a8',
    cloudOpacity: 0.97,
    waterDeep: '#4a7f9c',
    waterShallow: '#9fd2cf',
    waterFoam: '#fff2d4',
    windowGlow: 0.4,
    lanternGlow: 0.6,
    fireflies: 0.06,
    crystalGlow: 0.9,
    tintUI: '#fff5e2',
  },
  {
    id: 'night',
    label: 'Night',
    sunDir: v(-0.42, 0.62, -0.66),
    exposure: 1.0,
    sunColor: '#a9c2f0',
    skyColor: '#4d6591',
    groundColor: '#232a42',
    fogColor: '#2b3a5e',
    fogNear: 26,
    fogFar: 150,
    rimColor: '#a9c4f2',
    skyTop: '#0a1226',
    skyMid: '#1d2b4e',
    skyBottom: '#4a5d85',
    horizonColor: '#7c8dba',
    horizonStrength: 0.24,
    sunDisc: '#eaf1ff',
    sunGlow: '#93aef0',
    glowStrength: 0.8,
    starOpacity: 1,
    cloudTint: '#6f86b4',
    cloudShadow: '#3a4a70',
    cloudOpacity: 0.8,
    waterDeep: '#16233c',
    waterShallow: '#2e4a6b',
    waterFoam: '#7f9cc9',
    windowGlow: 1.0,
    lanternGlow: 1.0,
    fireflies: 1.0,
    crystalGlow: 1.0,
    tintUI: '#dfe7ff',
  },
];

/* Pre-convert every hex into a Color once. */
const PALETTES = RAW.map((p) => {
  const out = { ...p };
  for (const k of Object.keys(p)) {
    if (typeof p[k] === 'string' && p[k].startsWith('#')) out[k] = new Color(p[k]);
  }
  return out;
});

export const TIMES = PALETTES.map((p) => ({ id: p.id, label: p.label }));
export const DEFAULT_TIME = 1; // golden hour

/** Live values that shaders read. */
export const palette = {
  sunDir: new Vector3().copy(PALETTES[DEFAULT_TIME].sunDir),
  sunDisc: new Color(),
  sunGlow: new Color(),
  skyTop: new Color(),
  skyMid: new Color(),
  skyBottom: new Color(),
  horizonColor: new Color(),
  cloudTint: new Color(),
  cloudShadow: new Color(),
  waterDeep: new Color(),
  waterShallow: new Color(),
  waterFoam: new Color(),
  starOpacity: 0,
  glowStrength: 1,
  horizonStrength: 0,
  cloudOpacity: 1,
  windowGlow: 0,
  lanternGlow: 0,
  fireflies: 0,
  crystalGlow: 0,
  exposure: 1,
};

/** Read-only snapshot used to compute diffs between palettes. */
const NUMERIC_KEYS = [
  'exposure', 'fogNear', 'fogFar', 'horizonStrength', 'glowStrength',
  'starOpacity', 'cloudOpacity', 'windowGlow', 'lanternGlow', 'fireflies', 'crystalGlow',
];

let from = PALETTES[DEFAULT_TIME];
let to = PALETTES[DEFAULT_TIME];
let blend = 1;
let blendDuration = 1.15;
let currentIndex = DEFAULT_TIME;

function applyMix(t) {
  const apply = (o, a, b, key) => {
    if (a[key] instanceof Color) o[key].copy(a[key]).lerp(b[key], t);
    else o[key] = lerp(a[key], b[key], t);
  };

  apply(palette, from, to, 'sunDisc');
  apply(palette, from, to, 'sunGlow');
  apply(palette, from, to, 'skyTop');
  apply(palette, from, to, 'skyMid');
  apply(palette, from, to, 'skyBottom');
  apply(palette, from, to, 'horizonColor');
  apply(palette, from, to, 'cloudTint');
  apply(palette, from, to, 'cloudShadow');
  apply(palette, from, to, 'waterDeep');
  apply(palette, from, to, 'waterShallow');
  apply(palette, from, to, 'waterFoam');
  for (const k of NUMERIC_KEYS) palette[k] = lerp(from[k], to[k], t);

  palette.sunDir.copy(from.sunDir).lerp(to.sunDir, t).normalize();

  // Push into the shared shader uniforms (all materials reference these).
  G.uSunDir.value.copy(palette.sunDir);
  G.uSunColor.value.copy(from.sunColor).lerp(to.sunColor, t);
  G.uSkyColor.value.copy(from.skyColor).lerp(to.skyColor, t);
  G.uGroundColor.value.copy(from.groundColor).lerp(to.groundColor, t);
  G.uFogColor.value.copy(from.fogColor).lerp(to.fogColor, t);
  G.uRimColor.value.copy(from.rimColor).lerp(to.rimColor, t);
  G.uFogNear.value = lerp(from.fogNear, to.fogNear, t);
  G.uFogFar.value = lerp(from.fogFar, to.fogFar, t);
}

export function initPalette(index = DEFAULT_TIME) {
  from = to = PALETTES[index];
  currentIndex = index;
  blend = 1;
  applyMix(1);
  return TIMES[index];
}

/** 0 while fully in palette A, 1 in palette B. */
export function setTimeOfDay(index, instant = false) {
  const target = clamp(index, 0, PALETTES.length - 1);
  if (target === currentIndex && blend >= 1) return TIMES[target];

  from = PALETTES[currentIndex];
  to = PALETTES[target];
  currentIndex = target;
  blend = instant ? 1 : 0;
  if (instant) applyMix(1);
  return TIMES[target];
}

export function cycleTimeOfDay() {
  const next = (currentIndex + 1) % PALETTES.length;
  setTimeOfDay(next);
  return TIMES[next];
}

export function currentTime() {
  return TIMES[currentIndex];
}

export function timeIndex(id) {
  const i = TIMES.findIndex((t) => t.id === id);
  return i < 0 ? DEFAULT_TIME : i;
}

export function updatePalette(dt) {
  if (blend >= 1) return;
  blend = Math.min(1, blend + dt / blendDuration);
  // ease in/out so the sky change feels like time passing
  const e = blend < 0.5 ? 2 * blend * blend : 1 - Math.pow(-2 * blend + 2, 2) / 2;
  applyMix(e);
}

export function paletteMix() {
  return blend;
}
