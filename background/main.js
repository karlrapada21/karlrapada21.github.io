import { VERT, SCENE_FRAG, POST_FRAG, PROBE_FRAG } from "./shaders.js";

// ------------------------------------------------------------- parameters --

// Each preset is a full scene, not just a palette: it combines colour with
// block geometry, motion, atmosphere, and lens so the whole mood shifts as one.
const PRESETS = {
  // reference look — warm lava clay, backlit ridges, heavy bokeh
  Ember: {
    colBase: "#d3031b",
    colMid: "#cc2f14",
    colHi: "#ffd9a0",
    colGlow: "#ff8a30",
    colBg: "#2a0f16",
    cellSize: 0.8,
    gap: 0.16,
    cornerRadius: 0.18,
    heightBase: 0.55,
    heightAmp: 3.0,
    spreadAmp: 1.2,
    spreadScale: 0.45,
    terrainScale: 0.08,
    terrace: 0.55,
    morphSpeed: 0.6,
    driftSpeed: 0.35,
    fogDensity: 0.8,
    fogFalloff: 1.2,
    glow: 2.1,
    camHover: 7,
    camPitch: -0.5,
    zoom: 2.2,
    sunAzimuth: 165,
    sunElevation: 14,
    focusDistance: 18,
    aperture: 20,
    maxBlur: 16,
    tiltShift: 2,
    tiltLine: 0.45,
    exposure: 0.95,
    saturation: 1.3,
    vignette: 0.55,
    grain: 0.01
  },
  // cool matte clay — calm, rounded, shallow gentle terrain, soft tilt-shift
  Porcelain: {
    colBase: "#5f6a78",
    colMid: "#d9d4cc",
    colHi: "#fff3e0",
    colGlow: "#bcd2e8",
    colBg: "#8fa8c4",
    cellSize: 1.1,
    gap: 0.12,
    cornerRadius: 0.42,
    heightBase: 0.5,
    heightAmp: 2.0,
    spreadAmp: 0.9,
    spreadScale: 0.4,
    terrainScale: 0.065,
    terrace: 0.3,
    morphSpeed: 0.35,
    driftSpeed: 0.26,
    fogDensity: 0.22,
    fogFalloff: 0.6,
    glow: 0.55,
    camHover: 2.6,
    camPitch: -0.4,
    zoom: 2.3,
    sunAzimuth: 140,
    sunElevation: 30,
    focusDistance: 8,
    aperture: 24,
    maxBlur: 18,
    tiltShift: 6,
    tiltLine: 0.5,
    exposure: 1.1,
    saturation: 0.9,
    vignette: 0.4,
    grain: 0.01
  },
  // night bioluminescence — dark, spiky terraced towers glowing from within
  Biolume: {
    colBase: "#0a1c24",
    colMid: "#14545c",
    colHi: "#bff2e4",
    colGlow: "#19e3b1",
    colBg: "#03080d",
    cellSize: 0.85,
    gap: 0.2,
    cornerRadius: 0.1,
    heightBase: 0.5,
    heightAmp: 3.4,
    spreadAmp: 1.5,
    spreadScale: 0.55,
    terrainScale: 0.09,
    terrace: 0.75,
    morphSpeed: 0.5,
    driftSpeed: 0.3,
    fogDensity: 0.12,
    fogFalloff: 0.5,
    glow: 1.7,
    camHover: 2.2,
    camPitch: -0.32,
    zoom: 2.1,
    sunAzimuth: 200,
    sunElevation: 18,
    focusDistance: 9,
    aperture: 22,
    maxBlur: 16,
    tiltShift: 0,
    tiltLine: 0.45,
    exposure: 1.0,
    saturation: 1.25,
    vignette: 0.6,
    grain: 0.02
  },
  // miniature city — small dense cells, tall sharp towers, brisk motion, steel-blue
  Metropolis: {
    colBase: "#10151c",
    colMid: "#7f97ad",
    colHi: "#dbeafc",
    colGlow: "#4d9bd6",
    colBg: "#0a0f16",
    cellSize: 0.65,
    gap: 0.24,
    cornerRadius: 0.06,
    heightBase: 0.4,
    heightAmp: 4.2,
    spreadAmp: 2.0,
    spreadScale: 0.7,
    terrainScale: 0.11,
    terrace: 0.88,
    morphSpeed: 0.85,
    driftSpeed: 0.5,
    fogDensity: 0.24,
    fogFalloff: 0.7,
    glow: 0.9,
    camHover: 3.4,
    camPitch: -0.55,
    zoom: 2.4,
    sunAzimuth: 210,
    sunElevation: 24,
    focusDistance: 12,
    aperture: 14,
    maxBlur: 12,
    tiltShift: 4,
    tiltLine: 0.55,
    exposure: 1.0,
    saturation: 1.1,
    vignette: 0.5,
    grain: 0.01
  },
  // sun-baked dunes — big smooth low blocks, minimal terracing, wide soft focus
  Dune: {
    colBase: "#6b3f22",
    colMid: "#e0a75a",
    colHi: "#fff0cf",
    colGlow: "#ffcf87",
    colBg: "#caa06a",
    cellSize: 1.8,
    gap: 0.08,
    cornerRadius: 0.5,
    heightBase: 0.6,
    heightAmp: 1.6,
    spreadAmp: 0.7,
    spreadScale: 0.3,
    terrainScale: 0.05,
    terrace: 0.1,
    morphSpeed: 0.3,
    driftSpeed: 0.42,
    fogDensity: 0.28,
    fogFalloff: 0.5,
    glow: 0.7,
    camHover: 3.0,
    camPitch: -0.3,
    zoom: 2.0,
    sunAzimuth: 120,
    sunElevation: 40,
    focusDistance: 10,
    aperture: 18,
    maxBlur: 16,
    tiltShift: 8,
    tiltLine: 0.5,
    exposure: 1.15,
    saturation: 1.05,
    vignette: 0.45,
    grain: 0.01
  },
  // molten dramatics — towering ridges, deep glowing valleys, low ominous sun
  Magma: {
    colBase: "#200608",
    colMid: "#8f1d0e",
    colHi: "#ffb347",
    colGlow: "#ff5a1e",
    colBg: "#160406",
    cellSize: 1.2,
    gap: 0.18,
    cornerRadius: 0.15,
    heightBase: 0.7,
    heightAmp: 4.5,
    spreadAmp: 1.8,
    spreadScale: 0.5,
    terrainScale: 0.07,
    terrace: 0.5,
    morphSpeed: 0.45,
    driftSpeed: 0.24,
    fogDensity: 0.3,
    fogFalloff: 0.7,
    glow: 2.2,
    camHover: 2.0,
    camPitch: -0.28,
    zoom: 2.3,
    sunAzimuth: 175,
    sunElevation: 10,
    focusDistance: 8,
    aperture: 24,
    maxBlur: 18,
    tiltShift: 0,
    tiltLine: 0.4,
    exposure: 0.9,
    saturation: 1.4,
    vignette: 0.65,
    grain: 0.02
  }
};

const params = {
  palette: "Ember",
  ...PRESETS.Ember,

  // quality (session, not part of a preset)
  renderScale: 0.7,
  paused: false
};

// honour the OS "reduce motion" setting, including across preset changes
const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

function applyPreset(name) {
  Object.assign(params, PRESETS[name]);
  if (reduceMotion) {
    params.morphSpeed = 0;
    params.driftSpeed = 0;
  }
}

const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

// ------------------------------------------------------------------ webgl --

const canvas = document.getElementById("view");
const gl = canvas.getContext("webgl2", { antialias: false, alpha: false });
if (!gl) {
  document.getElementById("status").textContent = "webgl2 unavailable";
  throw new Error("WebGL2 not supported");
}
const floatExt = gl.getExtension("EXT_color_buffer_float");

function compile(type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(sh));
  }
  return sh;
}

function program(fragSrc) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fragSrc));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(p));
  }
  const uniforms = {};
  const count = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(p, i);
    uniforms[info.name] = gl.getUniformLocation(p, info.name);
  }
  return { p, u: uniforms };
}

const scene = program(SCENE_FRAG);
const post = program(POST_FRAG);
const probe = program(PROBE_FRAG);

// 1×1 probe target: terrain height around the camera, read back each frame
const probeTex = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, probeTex);
gl.texImage2D(
  gl.TEXTURE_2D,
  0,
  gl.RGBA8,
  1,
  1,
  0,
  gl.RGBA,
  gl.UNSIGNED_BYTE,
  null
);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
const probeFbo = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, probeFbo);
gl.framebufferTexture2D(
  gl.FRAMEBUFFER,
  gl.COLOR_ATTACHMENT0,
  gl.TEXTURE_2D,
  probeTex,
  0
);
gl.bindFramebuffer(gl.FRAMEBUFFER, null);
const probePixel = new Uint8Array(4);

let fbo = null;
let fboTex = null;
let bufW = 0;
let bufH = 0;

function resize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(64, Math.round(rect.width * dpr * params.renderScale));
  const h = Math.max(64, Math.round(rect.height * dpr * params.renderScale));
  if (w === bufW && h === bufH) return;
  bufW = w;
  bufH = h;
  canvas.width = w;
  canvas.height = h;

  if (fboTex) gl.deleteTexture(fboTex);
  if (fbo) gl.deleteFramebuffer(fbo);
  fboTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, fboTex);
  const internal = floatExt ? gl.RGBA16F : gl.RGBA8;
  const type = floatExt ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;
  gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, gl.RGBA, type, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    fboTex,
    0
  );
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  document.getElementById("res").textContent = `${w}×${h}`;
}

// -------------------------------------------------------------- animation --

let animT = 31.7; // integrated so speed changes never jump
let camDist = 0;
let lastTime = 0;
let frame = 0;
let fps = 0;
let fpsAccum = 0;
let fpsCount = 0;
let fpsLast = 0;

// drift at 45° to the grid: no screen ray ever aligns with a gap corridor,
// which would otherwise read as a bright seam running to the horizon
const DRIFT_DIR = [Math.SQRT1_2, Math.SQRT1_2];
const statusEl = document.getElementById("status");
let camY = null; // smoothed adaptive camera height

function setFieldUniforms(u) {
  gl.uniform1f(u.uAnimT, animT);
  gl.uniform1f(u.uCell, params.cellSize);
  gl.uniform1f(u.uHBase, params.heightBase);
  gl.uniform1f(u.uHAmp, params.heightAmp);
  gl.uniform1f(u.uSAmp, params.spreadAmp);
  gl.uniform1f(u.uSFreq, params.spreadScale);
  gl.uniform1f(u.uTFreq, params.terrainScale);
  gl.uniform1f(u.uTerrace, params.terrace);
}

function render(now) {
  requestAnimationFrame(render);
  const t = now * 0.001;
  const dt = Math.min(t - lastTime || 0.016, 0.1);
  lastTime = t;

  if (!params.paused) {
    animT += dt * params.morphSpeed;
    camDist += dt * params.driftSpeed;
  }

  resize();

  const camX = 13.7 + DRIFT_DIR[0] * camDist;
  const camZ = -4.2 + DRIFT_DIR[1] * camDist;
  const yaw =
    Math.atan2(DRIFT_DIR[0], DRIFT_DIR[1]) + 0.05 * Math.sin(animT * 0.31);
  const az = (params.sunAzimuth * Math.PI) / 180;
  const el = (params.sunElevation * Math.PI) / 180;
  const sun = [
    Math.sin(az) * Math.cos(el),
    Math.sin(el),
    Math.cos(az) * Math.cos(el)
  ];
  const hMax = params.heightBase + params.heightAmp + params.spreadAmp;

  // probe pass: keep the camera hovering above the tallest nearby block
  gl.bindFramebuffer(gl.FRAMEBUFFER, probeFbo);
  gl.viewport(0, 0, 1, 1);
  gl.useProgram(probe.p);
  setFieldUniforms(probe.u);
  gl.uniform2f(probe.u.uProbePos, camX, camZ);
  gl.uniform1f(probe.u.uHMax, hMax);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, probePixel);
  const localTop = (probePixel[0] / 255) * (hMax + 0.6);
  const targetY = localTop + params.camHover;
  camY =
    camY === null
      ? targetY
      : camY + (targetY - camY) * (1 - Math.exp(-dt * 1.4));

  // scene pass
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.viewport(0, 0, bufW, bufH);
  gl.useProgram(scene.p);
  const su = scene.u;
  setFieldUniforms(su);
  gl.uniform2f(su.uRes, bufW, bufH);
  gl.uniform3f(su.uCamPos, camX, camY, camZ);
  gl.uniform1f(su.uYaw, yaw);
  gl.uniform1f(su.uPitch, params.camPitch);
  gl.uniform1f(su.uFocal, params.zoom);
  gl.uniform1f(su.uGapF, params.gap);
  gl.uniform1f(su.uRadF, params.cornerRadius);
  gl.uniform1f(su.uHMax, hMax);
  gl.uniform3fv(su.uColBase, hexToRgb(params.colBase));
  gl.uniform3fv(su.uColMid, hexToRgb(params.colMid));
  gl.uniform3fv(su.uColHi, hexToRgb(params.colHi));
  gl.uniform3fv(su.uColGlow, hexToRgb(params.colGlow));
  gl.uniform3fv(su.uColBg, hexToRgb(params.colBg));
  gl.uniform1f(su.uFogDen, params.fogDensity);
  gl.uniform1f(su.uFogFall, params.fogFalloff);
  gl.uniform1f(su.uGlow, params.glow);
  gl.uniform3fv(su.uSun, sun);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  // post pass
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, bufW, bufH);
  gl.useProgram(post.p);
  const pu = post.u;
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, fboTex);
  gl.uniform1i(pu.uTex, 0);
  gl.uniform2f(pu.uRes, bufW, bufH);
  gl.uniform1f(pu.uTime, t);
  gl.uniform1f(pu.uFocus, params.focusDistance);
  gl.uniform1f(pu.uAperture, params.aperture);
  gl.uniform1f(pu.uMaxBlur, params.maxBlur);
  gl.uniform1f(pu.uTilt, params.tiltShift);
  gl.uniform1f(pu.uTiltY, params.tiltLine);
  gl.uniform1f(pu.uExposure, params.exposure);
  gl.uniform1f(pu.uSaturation, params.saturation);
  gl.uniform1f(pu.uVignette, params.vignette);
  gl.uniform1f(pu.uGrain, params.grain);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  // caption
  frame++;
  fpsAccum += dt;
  fpsCount++;
  if (t - fpsLast > 0.5) {
    fps = Math.round(fpsCount / fpsAccum);
    fpsAccum = 0;
    fpsCount = 0;
    fpsLast = t;
    statusEl.textContent = `${fps} fps · frame ${String(frame).padStart(5, "0")}${params.paused ? " · paused" : ""}`;
  }
}

// -------------------------------------------------------------------- gui --

let gui = null;

function selectPreset(name) {
  applyPreset(name);
  params.palette = name;
  document.getElementById("scene-name").textContent = name.toLowerCase();
  if (gui) gui.updateDisplay();
}

function buildGui() {
  gui = new window.dat.GUI({ width: 285 });

  gui
    .add(params, "palette", Object.keys(PRESETS))
    .name("preset")
    .onChange(selectPreset);

  const colors = gui.addFolder("colors");
  colors.addColor(params, "colBase").name("clay shadow");
  colors.addColor(params, "colMid").name("clay lit");
  colors.addColor(params, "colHi").name("sun");
  colors.addColor(params, "colGlow").name("fog glow");
  colors.addColor(params, "colBg").name("sky");

  const blocks = gui.addFolder("blocks");
  blocks.add(params, "cellSize", 0.5, 2.5, 0.01).name("cube size");
  blocks.add(params, "gap", 0.0, 0.45, 0.005);
  blocks.add(params, "cornerRadius", 0.0, 0.9, 0.01).name("corner radius");
  blocks.add(params, "heightBase", 0.1, 2.0, 0.05).name("base height");
  blocks.add(params, "heightAmp", 0.0, 5.0, 0.05).name("terrain height");
  blocks.add(params, "spreadAmp", 0.0, 2.5, 0.05).name("size spread");
  blocks.add(params, "spreadScale", 0.1, 1.5, 0.01).name("spread scale");
  blocks.add(params, "terrainScale", 0.015, 0.2, 0.001).name("feature scale");
  blocks.add(params, "terrace", 0.0, 1.0, 0.01);

  const motion = gui.addFolder("motion");
  motion.add(params, "morphSpeed", 0.0, 1.5, 0.01).name("morph speed");
  motion.add(params, "driftSpeed", 0.0, 2.0, 0.01).name("drift speed");
  motion.add(params, "paused").listen();

  const atmosphere = gui.addFolder("atmosphere");
  atmosphere.add(params, "fogDensity", 0.0, 1.2, 0.01).name("fog density");
  atmosphere.add(params, "fogFalloff", 0.1, 1.5, 0.01).name("fog falloff");
  atmosphere.add(params, "glow", 0.0, 3.0, 0.05).name("valley glow");

  const camera = gui.addFolder("camera + light");
  camera.add(params, "camHover", 0.8, 7.0, 0.05).name("hover height");
  camera.add(params, "camPitch", -1.1, -0.15, 0.01).name("pitch");
  camera.add(params, "zoom", 1.0, 4.0, 0.05);
  camera.add(params, "sunAzimuth", 0, 360, 1).name("sun azimuth");
  camera.add(params, "sunElevation", 8, 70, 1).name("sun elevation");

  const lens = gui.addFolder("lens");
  lens.add(params, "focusDistance", 1.0, 40.0, 0.1).name("focus dist");
  lens.add(params, "aperture", 0.0, 40.0, 0.5);
  lens.add(params, "maxBlur", 2.0, 24.0, 0.5).name("max blur px");
  lens.add(params, "tiltShift", 0.0, 20.0, 0.5).name("tilt shift");
  lens.add(params, "tiltLine", 0.0, 1.0, 0.01).name("tilt line");

  const grade = gui.addFolder("post");
  grade.add(params, "exposure", 0.3, 2.5, 0.01);
  grade.add(params, "saturation", 0.0, 1.8, 0.01);
  grade.add(params, "vignette", 0.0, 1.0, 0.01);
  grade.add(params, "grain", 0.0, 0.2, 0.005);

  const quality = gui.addFolder("quality");
  quality
    .add(params, "renderScale", 0.25, 1.5, 0.05)
    .name("render scale")
    .onChange(resize);

  colors.open();
  return gui;
}

// ------------------------------------------------------------------ start --

if (reduceMotion) {
  params.morphSpeed = 0;
  params.driftSpeed = 0;
}

buildGui();

window.addEventListener("keydown", (e) => {
  if (e.code === "Space" && e.target.tagName !== "INPUT") {
    e.preventDefault();
    params.paused = !params.paused;
  }
});

window.addEventListener("resize", resize);
resize();
requestAnimationFrame(render);

// live tuning hook (also used by automated visual checks)
window.CLAY = { params, resize, preset: selectPreset, presets: PRESETS };
