/* Small math / timing helpers shared by the scene and the UI. */

export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
export const smoothstep = (e0, e1, x) => {
  const t = clamp(invLerp(e0, e1, x));
  return t * t * (3 - 2 * t);
};

/** Frame-rate independent exponential approach. lambda ~ 1/speed. */
export const damp = (current, target, lambda, dt) =>
  current + (target - current) * (1 - Math.exp(-lambda * dt));

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutBack = (t, s = 1.7) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);

/** Deterministic PRNG so the island looks the same on every load. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const nextFrame =
  typeof requestAnimationFrame === 'function'
    ? () => new Promise((r) => requestAnimationFrame(() => r()))
    : () => new Promise((r) => setTimeout(r, 16));

/** Let the browser paint before we block it with scene building. */
export const yieldFrame = nextFrame;

export const prefersReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export const isTouchOnly = () =>
  typeof matchMedia === 'function' && matchMedia('(hover: none) and (pointer: coarse)').matches;

export const prefersLessData = () => {
  const c = navigator.connection;
  if (!c) return false;
  return c.saveData === true || /(^|-)2g$/.test(c.effectiveType || '');
};

/** Colours */
export const hexToRgb = (hex) => {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export const rgbToHex = (r, g, b) =>
  '#' +
  [r, g, b]
    .map((v) => Math.round(clamp(v) * 255).toString(16).padStart(2, '0'))
    .join('');

export const mixHex = (a, b, t) => {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t));
};

/** Multiply a hex colour by a scalar (for quick shade variants). */
export const shadeHex = (hex, k) => {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * k, g * k, b * k);
};

export const randomOf = (arr, rnd = Math.random) => arr[Math.floor(rnd() * arr.length)];
