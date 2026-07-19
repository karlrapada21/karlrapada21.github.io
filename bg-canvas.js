import { VERT, SCENE_FRAG, POST_FRAG, PROBE_FRAG } from "./shaders.js";

const params = {
  // Cyber preset — neon pink/cyan/ dark terrain
  colBase: "#1a0a1e",
  colMid: "#c44d6a",
  colHi: "#ff88cc",
  colGlow: "#5accf5",
  colBg: "#0a0810",
  cellSize: 0.9,
  gap: 0.18,
  cornerRadius: 0.14,
  heightBase: 0.55,
  heightAmp: 3.2,
  spreadAmp: 1.3,
  spreadScale: 0.48,
  terrainScale: 0.08,
  terrace: 0.6,
  morphSpeed: 0.45,
  driftSpeed: 0.3,
  fogDensity: 0.4,
  fogFalloff: 0.7,
  glow: 1.6,
  camHover: 3.0,
  camPitch: -0.45,
  zoom: 2.2,
  sunAzimuth: 170,
  sunElevation: 18,
  focusDistance: 10,
  aperture: 16,
  maxBlur: 16,
  tiltShift: 2,
  tiltLine: 0.45,
  exposure: 1.0,
  saturation: 1.2,
  vignette: 0.55,
  grain: 0.015,
  renderScale: 0.5,
  paused: false
};

const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
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

  function resize() {
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
  }

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

  function render(now) {
    requestAnimationFrame(render);
    const t = now * 0.001;
    const dt = Math.min(t - lastTime || 0.016, 0.1);
    lastTime = t;
    animT += dt * params.morphSpeed;
    camDist += dt * params.driftSpeed;
    resize();
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

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(render);
}

document.addEventListener("DOMContentLoaded", initCanvas);
