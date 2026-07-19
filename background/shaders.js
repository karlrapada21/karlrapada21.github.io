// GLSL sources for the three-pass pipeline:
//  0) probe pass — 1×1 target, samples terrain height around the camera so it
//     can hover adaptively (shares the exact height function with the scene)
//  1) scene pass — raymarched infinite block field, writes HDR color + distance
//  2) post pass  — bokeh depth of field, tonemap, grade

export const VERT = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

// noise + block height field, shared by scene and probe passes
const FIELD_GLSL = `
uniform float uAnimT;      // integrated morph time
uniform float uCell;       // cell size (world units)
uniform float uHBase;      // minimum block height
uniform float uHAmp;       // terrain amplitude
uniform float uSAmp;       // per-block random spread amplitude
uniform float uSFreq;      // spread noise frequency (per cell)
uniform float uTFreq;      // terrain feature frequency (per cell)
uniform float uTerrace;    // 0 smooth slopes .. 1 hard height plateaus

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float hash31(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}

float vnoise2(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm2(vec2 p) {
  float v = 0.0, a = 0.55;
  for (int i = 0; i < 3; i++) {
    v += a * vnoise2(p);
    p = p * 2.13 + 17.7;
    a *= 0.5;
  }
  return v / 0.9625;
}

float vnoise3(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash31(i);
  float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash31(i + vec3(1.0, 1.0, 1.0));
  return mix(
    mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
    mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
    f.z);
}

float cellHeight(vec2 id) {
  // large-scale ridges, drifting very slowly so the terrain itself breathes
  float ter = fbm2(id * uTFreq + vec2(uAnimT * 0.045, uAnimT * 0.028));
  ter = pow(smoothstep(0.18, 0.82, ter), 1.4);
  // per-block animated variation
  float ran = vnoise3(vec3(id * uSFreq, uAnimT));
  float h = uHBase + uHAmp * ter + uSAmp * (ran - 0.5);
  // soft staircase: plateaus with quick transitions, still continuous in time
  float q = 0.38;
  float x = h / q;
  float hq = q * (floor(x) + smoothstep(0.35, 0.65, fract(x)) + 0.5);
  h = mix(h, hq, uTerrace);
  return max(h, uCell * 0.06);
}`;

export const PROBE_FRAG = `#version 300 es
precision highp float;

out vec4 outColor;

uniform vec2  uProbePos;   // camera position in world xz
uniform float uHMax;
${FIELD_GLSL}

void main() {
  vec2 c0 = floor(uProbePos / uCell);
  float hm = 0.0;
  // cover the camera cell and the cells it is drifting toward (+x, +z)
  for (int dx = -2; dx <= 5; dx++) {
    for (int dz = -2; dz <= 5; dz++) {
      hm = max(hm, cellHeight(c0 + vec2(float(dx), float(dz))));
    }
  }
  outColor = vec4(hm / (uHMax + 0.6), 0.0, 0.0, 1.0);
}`;

export const SCENE_FRAG = `#version 300 es
precision highp float;

out vec4 outColor;

uniform vec2  uRes;
uniform vec3  uCamPos;
uniform float uYaw;
uniform float uPitch;
uniform float uFocal;

uniform float uGapF;       // gap as fraction of cell
uniform float uRadF;       // corner rounding as fraction of half block
uniform float uHMax;       // uHBase + uHAmp + uSAmp (precomputed)

uniform vec3  uColBase;    // deep shadow clay
uniform vec3  uColMid;     // lit clay
uniform vec3  uColHi;      // sun tint
uniform vec3  uColGlow;    // fog / valley glow
uniform vec3  uColBg;      // sky top

uniform float uFogDen;
uniform float uFogFall;
uniform float uGlow;
uniform vec3  uSun;        // normalized, toward the sun

#define FAR 90.0
#define MAX_CELLS 140
${FIELD_GLSL}

float sdCell(vec3 p, vec2 id, float h) {
  float halfIn = uCell * 0.5 * (1.0 - uGapF);
  float r = uRadF * min(halfIn, h * 0.5);
  vec3 c = vec3((id.x + 0.5) * uCell, h * 0.5, (id.y + 0.5) * uCell);
  vec3 b = max(vec3(halfIn - r, h * 0.5 - r, halfIn - r), vec3(0.0));
  vec3 q = abs(p - c) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}

vec3 safeDir(vec3 d) {
  vec3 s = vec3(d.x >= 0.0 ? 1.0 : -1.0, d.y >= 0.0 ? 1.0 : -1.0, d.z >= 0.0 ? 1.0 : -1.0);
  return s * max(abs(d), vec3(1e-5));
}

struct HitInfo {
  float t;
  vec2 id;
  float h;
};

// DDA over the xz grid; sphere-trace the rounded box inside each touched cell
bool traceScene(vec3 ro, vec3 rd, out HitInfo hit) {
  rd = safeDir(rd);
  vec2 cell = floor(ro.xz / uCell);
  vec2 stp = sign(rd.xz);
  vec2 tDelta = abs(uCell / rd.xz);
  vec2 tSide = (((stp * 0.5 + 0.5) + cell) * uCell - ro.xz) / rd.xz;
  float gapHalf = uCell * 0.5 * uGapF;
  float tCur = 0.0;

  for (int i = 0; i < MAX_CELLS; i++) {
    float h = cellHeight(cell);
    vec3 bmin = vec3(cell.x * uCell + gapHalf, 0.0, cell.y * uCell + gapHalf);
    vec3 bmax = vec3((cell.x + 1.0) * uCell - gapHalf, h, (cell.y + 1.0) * uCell - gapHalf);
    vec3 t0 = (bmin - ro) / rd;
    vec3 t1 = (bmax - ro) / rd;
    vec3 tmn = min(t0, t1), tmx = max(t0, t1);
    float tN = max(max(tmn.x, tmn.y), tmn.z);
    float tF = min(min(tmx.x, tmx.y), tmx.z);

    if (tN <= tF && tF > 0.0) {
      float t = max(tN, 0.0);
      for (int j = 0; j < 12; j++) {
        vec3 p = ro + rd * t;
        float d = sdCell(p, cell, h);
        if (d < 0.0008 * (1.0 + t)) {
          hit.t = t;
          hit.id = cell;
          hit.h = h;
          return true;
        }
        t += d;
        if (t > tF + uCell * 0.05) break;
      }
    }

    if (tSide.x < tSide.y) {
      tCur = tSide.x;
      tSide.x += tDelta.x;
      cell.x += stp.x;
    } else {
      tCur = tSide.y;
      tSide.y += tDelta.y;
      cell.y += stp.y;
    }
    if (tCur > FAR) break;
    if (rd.y > 0.0 && ro.y + rd.y * tCur > uHMax + 0.5) break;
  }
  return false;
}

vec3 calcNormal(vec3 p, vec2 id, float h) {
  float e = 0.0015 * uCell;
  vec2 k = vec2(1.0, -1.0);
  return normalize(
    k.xyy * sdCell(p + k.xyy * e, id, h) +
    k.yyx * sdCell(p + k.yyx * e, id, h) +
    k.yxy * sdCell(p + k.yxy * e, id, h) +
    k.xxx * sdCell(p + k.xxx * e, id, h));
}

// soft shadow: walk cells toward the sun, penumbra from vertical clearance
float softShadow(vec3 p, vec3 sd) {
  sd = safeDir(sd);
  if (sd.y <= 0.02) return 0.15;
  float res = 1.0;
  vec2 cell = floor(p.xz / uCell);
  vec2 stp = sign(sd.xz);
  vec2 tDelta = abs(uCell / sd.xz);
  vec2 tSide = (((stp * 0.5 + 0.5) + cell) * uCell - p.xz) / sd.xz;
  float t = 0.0;

  for (int i = 0; i < 26; i++) {
    float tExit = min(tSide.x, tSide.y);
    if (i > 0) {
      float h = cellHeight(cell);
      float midT = 0.5 * (t + tExit);
      float clr = p.y + sd.y * midT - h;
      res = min(res, 9.0 * clr / max(midT, 1e-3));
      if (res < 0.005) return 0.0;
    }
    if (tSide.x < tSide.y) {
      tSide.x += tDelta.x;
      cell.x += stp.x;
    } else {
      tSide.y += tDelta.y;
      cell.y += stp.y;
    }
    t = tExit;
    if (p.y + sd.y * t > uHMax + 0.3) break;
  }
  return clamp(res, 0.0, 1.0);
}

// crevice occlusion from the 8 neighbour columns
float calcAO(vec3 p, vec2 id) {
  float occ = 0.0;
  for (int dx = -1; dx <= 1; dx++) {
    for (int dz = -1; dz <= 1; dz++) {
      if (dx == 0 && dz == 0) continue;
      vec2 nid = id + vec2(float(dx), float(dz));
      float hn = cellHeight(nid);
      vec2 nc = (nid + 0.5) * uCell;
      float dist = length(p.xz - nc) / uCell;
      float occH = clamp((hn - p.y) / uCell, 0.0, 2.0);
      float w = clamp(1.6 - dist, 0.0, 1.0);
      occ += occH * w;
    }
  }
  return 1.0 - clamp(occ * 0.3, 0.0, 1.0) * 0.88;
}

float fogAmount(vec3 ro, vec3 rd, float t) {
  float ry = abs(rd.y) < 1e-4 ? 1e-4 : rd.y;
  float od = uFogDen * exp(-uFogFall * ro.y) *
             (1.0 - exp(-uFogFall * ry * t)) / (uFogFall * ry);
  return 1.0 - exp(-max(od, 0.0));
}

vec3 skyColor(vec3 rd) {
  float hz = pow(clamp(1.0 - rd.y * 3.6, 0.0, 1.0), 3.2);
  vec3 col = mix(uColBg * 0.55, uColGlow * 1.25, hz);
  float sun = pow(clamp(dot(rd, uSun), 0.0, 1.0), 9.0);
  col += uColHi * sun * 0.45 * (0.3 + 0.7 * hz);
  return col;
}

vec3 shade(vec3 ro, vec3 rd, HitInfo hit) {
  vec3 p = ro + rd * hit.t;
  vec3 n = calcNormal(p, hit.id, hit.h);
  float ao = calcAO(p, hit.id);
  float sh = softShadow(p + n * uCell * 0.012, uSun);
  float ndl = clamp(dot(n, uSun), 0.0, 1.0);

  // clay albedo: deep tone in the valleys, lit tone on the crests
  float hgrad = clamp(p.y / max(uHMax, 1e-3), 0.0, 1.0);
  vec3 alb = mix(uColBase, uColMid, smoothstep(0.05, 0.85, hgrad));
  alb *= 1.0 + (hash21(hit.id) - 0.5) * 0.12;

  float hemi = n.y * 0.5 + 0.5;
  vec3 col = alb * uColHi * ndl * sh * 1.7;
  col += alb * mix(uColGlow * 0.35, uColBg * 0.85, hemi) * ao * 0.35;

  // valley glow: the fog lights the field from below
  float gl = exp(-max(p.y, 0.0) * uFogFall * 1.8);
  float faceDown = 0.35 + clamp(0.65 - 0.65 * n.y, 0.0, 1.0);
  col += uColGlow * uGlow * gl * faceDown * (0.35 + 0.65 * ao) * (0.35 + 0.75 * alb) * 1.6;

  // waxy clay highlight + soft rim
  vec3 hv = normalize(uSun - rd);
  float spec = pow(clamp(dot(n, hv), 0.0, 1.0), 28.0) * sh * ndl;
  col += uColHi * spec * 0.3;
  float fre = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 4.0);
  col += uColGlow * fre * 0.12 * ao;

  float fog = fogAmount(ro, rd, hit.t);
  float scat = pow(clamp(dot(rd, uSun), 0.0, 1.0), 3.0);
  vec3 fogCol = uColGlow * (0.45 + 0.75 * scat);
  return mix(col, fogCol, fog);
}

void main() {
  vec2 uv = (2.0 * gl_FragCoord.xy - uRes) / uRes.y;

  float cy = cos(uYaw), sy = sin(uYaw);
  float cp = cos(uPitch), sp = sin(uPitch);
  vec3 fw = vec3(sy * cp, sp, cy * cp);
  vec3 rt = vec3(cy, 0.0, -sy);
  vec3 up = cross(fw, rt);
  vec3 rd = normalize(fw * uFocal + rt * uv.x + up * uv.y);
  vec3 ro = uCamPos;

  vec3 col;
  float dist;
  HitInfo hit;
  if (traceScene(ro, rd, hit)) {
    col = shade(ro, rd, hit);
    dist = hit.t;
  } else {
    dist = FAR;
    // fog thins quickly for upward rays so the sky can stay dark
    float fog = fogAmount(ro, rd, FAR) * clamp(1.0 - rd.y * 3.0, 0.0, 1.0);
    float scat = pow(clamp(dot(rd, uSun), 0.0, 1.0), 3.0);
    col = mix(skyColor(rd), uColGlow * (0.45 + 0.75 * scat), fog);
  }

  outColor = vec4(col, dist / FAR);
}`;

export const POST_FRAG = `#version 300 es
precision highp float;

out vec4 outColor;

uniform sampler2D uTex;
uniform vec2  uRes;
uniform float uTime;
uniform float uFocus;      // focus distance, world units
uniform float uAperture;   // CoC scale
uniform float uMaxBlur;    // max CoC radius in pixels (at 800px height)
uniform float uTilt;       // extra screen-space tilt-shift blur, px
uniform float uTiltY;      // focus line, 0..1 from bottom
uniform float uExposure;
uniform float uSaturation;
uniform float uVignette;
uniform float uGrain;

#define FAR 90.0
#define GOLDEN 2.39996323

float cocAt(vec2 uv, float dist) {
  float rs = uRes.y / 800.0; // keep blur size resolution independent
  float c = uAperture * abs(dist - uFocus) / max(dist, 0.2);
  c += uTilt * pow(abs(uv.y - uTiltY) * 2.0, 1.5);
  return min(c * rs, uMaxBlur * rs);
}

// single-pass golden-angle bokeh gather (Gustafsson)
vec3 dof(vec2 uv) {
  vec2 texel = 1.0 / uRes;
  vec4 cd = texture(uTex, uv);
  float cdist = cd.a * FAR;
  float ccoc = cocAt(uv, cdist);
  float rs = uRes.y / 800.0;
  float maxBlur = uMaxBlur * rs;
  vec3 col = cd.rgb;
  float tot = 1.0;
  float radScale = max(0.55, maxBlur / 24.0);
  float radius = radScale;
  float ang = 0.0;
  for (int i = 0; i < 180; i++) {
    if (radius >= maxBlur) break;
    vec2 tc = uv + vec2(cos(ang), sin(ang)) * texel * radius;
    vec4 s = texture(uTex, tc);
    float sdist = s.a * FAR;
    float scoc = cocAt(tc, sdist);
    if (sdist > cdist) scoc = min(scoc, ccoc * 2.0);
    float m = smoothstep(radius - 0.5, radius + 0.5, scoc);
    col += mix(col / tot, s.rgb, m);
    tot += 1.0;
    ang += GOLDEN;
    radius += radScale / radius;
  }
  return col / tot;
}

vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

float grainHash(vec2 p) {
  p = fract(p * vec2(419.31, 273.53));
  p += dot(p, p + 63.71);
  return fract(p.x * p.y);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec3 col = dof(uv) * uExposure;

  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(l), col, uSaturation);
  col = aces(col);
  col = pow(col, vec3(1.0 / 2.2));

  float v = 16.0 * uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y);
  col *= mix(1.0, pow(v, 0.45), uVignette);

  col += (grainHash(uv * uRes.xy + fract(uTime) * 917.0) - 0.5) * uGrain;

  outColor = vec4(col, 1.0);
}`;
