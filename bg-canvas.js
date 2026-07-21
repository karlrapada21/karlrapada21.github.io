import { VERT, SCENE_FRAG, POST_FRAG, PROBE_FRAG } from "./shaders.js";

const PRESETS = {
  Cyber: {
    colBase: "#1a0a1e", colMid: "#c44d6a", colHi: "#ff88cc", colGlow: "#5accf5", colBg: "#0a0810",
    cellSize: 0.9, gap: 0.18, cornerRadius: 0.14, heightBase: 0.55, heightAmp: 3.2, spreadAmp: 1.3,
    spreadScale: 0.48, terrainScale: 0.08, terrace: 0.6, morphSpeed: 0.45, driftSpeed: 0.3,
    fogDensity: 0.4, fogFalloff: 0.7, glow: 1.6, camHover: 3.0, camPitch: -0.45, zoom: 2.2,
    sunAzimuth: 170, sunElevation: 18, focusDistance: 10, aperture: 16, maxBlur: 16, tiltShift: 2,
    tiltLine: 0.45, exposure: 1.0, saturation: 1.2, vignette: 0.55, grain: 0.015
  },
  Ember: {
    colBase: "#d3031b", colMid: "#cc2f14", colHi: "#ffd9a0", colGlow: "#ff8a30", colBg: "#2a0f16",
    cellSize: 0.8, gap: 0.16, cornerRadius: 0.18, heightBase: 0.55, heightAmp: 3.0, spreadAmp: 1.2,
    spreadScale: 0.45, terrainScale: 0.08, terrace: 0.55, morphSpeed: 0.6, driftSpeed: 0.35,
    fogDensity: 0.8, fogFalloff: 1.2, glow: 2.1, camHover: 7, camPitch: -0.5, zoom: 2.2,
    sunAzimuth: 165, sunElevation: 14, focusDistance: 18, aperture: 20, maxBlur: 16, tiltShift: 2,
    tiltLine: 0.45, exposure: 0.95, saturation: 1.3, vignette: 0.55, grain: 0.01
  },
  Porcelain: {
    colBase: "#5f6a78", colMid: "#d9d4cc", colHi: "#fff3e0", colGlow: "#bcd2e8", colBg: "#8fa8c4",
    cellSize: 1.1, gap: 0.12, cornerRadius: 0.42, heightBase: 0.5, heightAmp: 2.0, spreadAmp: 0.9,
    spreadScale: 0.4, terrainScale: 0.065, terrace: 0.3, morphSpeed: 0.35, driftSpeed: 0.26,
    fogDensity: 0.22, fogFalloff: 0.6, glow: 0.55, camHover: 2.6, camPitch: -0.4, zoom: 2.3,
    sunAzimuth: 140, sunElevation: 30, focusDistance: 8, aperture: 24, maxBlur: 18, tiltShift: 6,
    tiltLine: 0.5, exposure: 1.1, saturation: 0.9, vignette: 0.4, grain: 0.01
  },
  Biolume: {
    colBase: "#0a1c24", colMid: "#14545c", colHi: "#bff2e4", colGlow: "#19e3b1", colBg: "#03080d",
    cellSize: 0.85, gap: 0.2, cornerRadius: 0.1, heightBase: 0.5, heightAmp: 3.4, spreadAmp: 1.5,
    spreadScale: 0.55, terrainScale: 0.09, terrace: 0.75, morphSpeed: 0.5, driftSpeed: 0.3,
    fogDensity: 0.12, fogFalloff: 0.5, glow: 1.7, camHover: 2.2, camPitch: -0.32, zoom: 2.1,
    sunAzimuth: 200, sunElevation: 18, focusDistance: 9, aperture: 22, maxBlur: 16, tiltShift: 0,
    tiltLine: 0.45, exposure: 1.0, saturation: 1.25, vignette: 0.6, grain: 0.02
  },
  Metropolis: {
    colBase: "#10151c", colMid: "#7f97ad", colHi: "#dbeafc", colGlow: "#4d9bd6", colBg: "#0a0f16",
    cellSize: 0.65, gap: 0.24, cornerRadius: 0.06, heightBase: 0.4, heightAmp: 4.2, spreadAmp: 2.0,
    spreadScale: 0.7, terrainScale: 0.11, terrace: 0.88, morphSpeed: 0.85, driftSpeed: 0.5,
    fogDensity: 0.24, fogFalloff: 0.7, glow: 0.9, camHover: 3.4, camPitch: -0.55, zoom: 2.4,
    sunAzimuth: 210, sunElevation: 24, focusDistance: 12, aperture: 14, maxBlur: 12, tiltShift: 4,
    tiltLine: 0.55, exposure: 1.0, saturation: 1.1, vignette: 0.5, grain: 0.01
  },
  Dune: {
    colBase: "#6b3f22", colMid: "#e0a75a", colHi: "#fff0cf", colGlow: "#ffcf87", colBg: "#caa06a",
    cellSize: 1.8, gap: 0.08, cornerRadius: 0.5, heightBase: 0.6, heightAmp: 1.6, spreadAmp: 0.7,
    spreadScale: 0.3, terrainScale: 0.05, terrace: 0.1, morphSpeed: 0.3, driftSpeed: 0.42,
    fogDensity: 0.28, fogFalloff: 0.5, glow: 0.7, camHover: 3.0, camPitch: -0.3, zoom: 2.0,
    sunAzimuth: 120, sunElevation: 40, focusDistance: 10, aperture: 18, maxBlur: 16, tiltShift: 8,
    tiltLine: 0.5, exposure: 1.15, saturation: 1.05, vignette: 0.45, grain: 0.01
  },
  Magma: {
    colBase: "#200608", colMid: "#8f1d0e", colHi: "#ffb347", colGlow: "#ff5a1e", colBg: "#160406",
    cellSize: 1.2, gap: 0.18, cornerRadius: 0.15, heightBase: 0.7, heightAmp: 4.5, spreadAmp: 1.8,
    spreadScale: 0.5, terrainScale: 0.07, terrace: 0.5, morphSpeed: 0.45, driftSpeed: 0.24,
    fogDensity: 0.3, fogFalloff: 0.7, glow: 2.2, camHover: 2.0, camPitch: -0.28, zoom: 2.3,
    sunAzimuth: 175, sunElevation: 10, focusDistance: 8, aperture: 24, maxBlur: 18, tiltShift: 0,
    tiltLine: 0.4, exposure: 0.9, saturation: 1.4, vignette: 0.65, grain: 0.02
  },
  Neon: {
    colBase: "#0d0021", colMid: "#ff00aa", colHi: "#ff88ff", colGlow: "#00ffcc", colBg: "#050510",
    cellSize: 0.75, gap: 0.2, cornerRadius: 0.08, heightBase: 0.45, heightAmp: 3.8, spreadAmp: 1.6,
    spreadScale: 0.55, terrainScale: 0.1, terrace: 0.7, morphSpeed: 0.55, driftSpeed: 0.38,
    fogDensity: 0.35, fogFalloff: 0.8, glow: 2.5, camHover: 2.8, camPitch: -0.4, zoom: 2.1,
    sunAzimuth: 190, sunElevation: 15, focusDistance: 10, aperture: 18, maxBlur: 14, tiltShift: 1,
    tiltLine: 0.45, exposure: 1.05, saturation: 1.4, vignette: 0.5, grain: 0.02
  }
};

const params = {
  palette: "Metropolis",
  ...PRESETS.Metropolis,
  renderScale: 0.5,
  paused: false
};

function applyPreset(name) {
  const p = PRESETS[name];
  if (!p) return;
  Object.assign(params, p);
  params.palette = name;
}

const hexToRgb = (hex, opacity = 1) => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255 * opacity, ((n >> 8) & 255) / 255 * opacity, (n & 255) / 255 * opacity];
};

const DRIFT_DIR = [Math.SQRT1_2, Math.SQRT1_2];

function initCanvas() {
  const canvas = document.createElement("canvas");
  canvas.id = "bg-canvas";
  canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none;";
  document.body.prepend(canvas);

  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false });
  if (!gl) { console.warn("WebGL2 not available"); return; }
  gl.getExtension("EXT_color_buffer_float");

  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    return sh;
  }

  function program(fragSrc) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fragSrc));
    gl.linkProgram(p);
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

  const probeTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, probeTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  const probeFbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, probeFbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, probeTex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  const probePixel = new Uint8Array(4);

  let fboTex = null, fbo = null, bufW = 0, bufH = 0;

  window.bgResize = function() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(64, Math.round(window.innerWidth * dpr * params.renderScale));
    const h = Math.max(64, Math.round(window.innerHeight * dpr * params.renderScale));
    if (w === bufW && h === bufH) return;
    bufW = w; bufH = h;
    canvas.width = w; canvas.height = h;
    if (fboTex) gl.deleteTexture(fboTex);
    if (fbo) gl.deleteFramebuffer(fbo);
    fboTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, fboTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fboTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };

  let animT = 31.7, camDist = 0, lastTime = 0, camY = null;

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

  window.bgResize();

  function render(now) {
    requestAnimationFrame(render);
    const t = now * 0.001;
    const dt = Math.min(t - lastTime || 0.016, 0.1);
    lastTime = t;
    if (!params.paused) {
      animT += dt * params.morphSpeed;
      camDist += dt * params.driftSpeed;
    }

    const camX = 13.7 + DRIFT_DIR[0] * camDist;
    const camZ = -4.2 + DRIFT_DIR[1] * camDist;
    const az = (params.sunAzimuth * Math.PI) / 180;
    const el = (params.sunElevation * Math.PI) / 180;
    const sun = [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)];
    const hMax = params.heightBase + params.heightAmp + params.spreadAmp;

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
    camY = camY === null ? targetY : camY + (targetY - camY) * (1 - Math.exp(-dt * 1.4));

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, bufW, bufH);
    gl.useProgram(scene.p);
    const su = scene.u;
    setFieldUniforms(su);
    gl.uniform2f(su.uRes, bufW, bufH);
    const yaw = Math.atan2(DRIFT_DIR[0], DRIFT_DIR[1]) + 0.05 * Math.sin(animT * 0.31);
    gl.uniform3f(su.uCamPos, camX, camY, camZ);
    gl.uniform1f(su.uYaw, yaw);
    gl.uniform1f(su.uPitch, params.camPitch);
    gl.uniform1f(su.uFocal, params.zoom);
    gl.uniform1f(su.uGapF, params.gap);
    gl.uniform1f(su.uRadF, params.cornerRadius);
    gl.uniform1f(su.uHMax, hMax);
    gl.uniform3fv(su.uColBase, hexToRgb(params.colBase, params.colBaseOpacity));
    gl.uniform3fv(su.uColMid, hexToRgb(params.colMid, params.colMidOpacity));
    gl.uniform3fv(su.uColHi, hexToRgb(params.colHi, params.colHiOpacity));
    gl.uniform3fv(su.uColGlow, hexToRgb(params.colGlow, params.colGlowOpacity));
    gl.uniform3fv(su.uColBg, hexToRgb(params.colBg, params.colBgOpacity));
    gl.uniform1f(su.uFogDen, params.fogDensity);
    gl.uniform1f(su.uFogFall, params.fogFalloff);
    gl.uniform1f(su.uGlow, params.glow);
    gl.uniform3fv(su.uSun, sun);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

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
  }

  window.addEventListener("resize", function() { window.bgResize(); });
  requestAnimationFrame(render);
}

window.bgParams = params;
window.bgPresets = PRESETS;
window.applyBgPreset = function(name) { applyPreset(name); };

document.addEventListener("DOMContentLoaded", initCanvas);
