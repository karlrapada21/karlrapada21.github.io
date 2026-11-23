/* ============================================================
   Game (3D) — renderer, loop, camera, input, movement, interactions.
   ============================================================ */

import { THREE } from './geo.js';
import { TAU, clamp, lerp, rng, rr } from './core.js';
import {
  SPAWN,
  isWalkable,
  onBridgeDeck,
  BRIDGE,
  PLAZA,
  HOUSE,
  PODIUM_SPOTS,
} from './layout.js';
import {
  toX,
  toZ,
  terrainHeight,
  buildIsland,
  buildOcean,
  buildRiver,
  buildSky,
  buildLights,
  buildClouds,
} from './terrain.js';
import { buildProps } from './props3d.js';
import { buildBridge, bridgeHeight, buildPetals } from './bridge3d.js';
import { buildVillager, poseVillager, buildCat } from './villager3d.js';
import { UI } from './ui.js';
import { Audio } from './audio.js';

const INTERACT_RANGE = 96;
const PLAYER_RADIUS = 0.22;

/* third-person camera rig */
const CAM = {
  dist: 11.5,
  height: 9.0,
  lerp: 4.2,
};

export class Game {
  static get THREE() {
    return THREE;
  }

  constructor(canvas, uiRoot) {
    this.canvas = canvas;
    this.ui = new UI(uiRoot);
    this.time = 0;
    this.running = false;
    this.paused = true;
    this.overlayOpen = false;
    this.started = false;

    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    /* ---- renderer ---- */
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    /* ---- scene ---- */
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#c8e9e2');
    this.scene.fog = new THREE.Fog(new THREE.Color('#dcefe4'), 110, 290);

    this.camera = new THREE.PerspectiveCamera(48, 1, 0.5, 900);
    this._camTarget = new THREE.Vector3();

    this._buildWorld();

    /* ---- player ---- */
    this.player = {
      x: SPAWN.x,
      y: SPAWN.y,
      vx: 0,
      vy: 0,
      dir: 'down',
      walk: 0,
      speed: 210,
      look: null,
      stepPhase: 0,
      lastX: SPAWN.x,
      lastY: SPAWN.y,
      yaw: 0,
      onGround: 0,
    };
    this._syncPlayerMesh(true);

    this.keys = new Set();
    this.touch = { x: 0, y: 0, active: false, mag: 0 };
    this.near = null;
    this.inWater = false;

    this._bindEvents();
    this._resize();

    /* ---- UI wiring (no character customiser any more) ---- */
    this.ui.onOverlayOpen = () => {
      this.overlayOpen = true;
    };
    this.ui.onOverlayClose = () => {
      this.overlayOpen = false;
    };
    this.ui.onInteract = () => this.tryInteract();
    this.ui.onStart = () => {
      this.started = true;
      this.paused = false;
      Audio.startAmbient();
      this.ui.showHud();
    };
  }

  /* ---------------- world ---------------- */

  _buildWorld() {
    this.sky = buildSky(this.scene);
    this.lights = buildLights(this.scene);    this.island = buildIsland(this.scene);

    const ocean = buildOcean(this.scene);
    this.ocean = ocean;
    this.oceanMat = ocean.mat;

    const river = buildRiver(this.scene);
    this.river = river;
    this.riverMat = river.mat;

    this.clouds = buildClouds(this.scene);
    this.props = buildProps(this.scene);
    this.bridge = buildBridge(this.scene);
    this.petals = buildPetals(this.scene);

    /* player + cat */
    this.rig = buildVillager();
    this.scene.add(this.rig.group);

    this.cat = buildCat();
    this.catState = { x: 1210, y: 1252, targetX: 1210, targetY: 1252, timer: 0, dir: 1 };
    this.scene.add(this.cat.group);

    /* a few floating seeds / dust motes for atmosphere */
    this._buildMotes();
  }

  _buildMotes() {
    const COUNT = 260;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(COUNT * 3);
    const rand = rng(8181);
    this.motes = [];
    for (let i = 0; i < COUNT; i++) {
      const x = rr(rand, -48, 48);
      const y = rr(rand, 1.5, 14);
      const z = rr(rand, -34, 34);
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
      this.motes.push({ x, y, z, ph: rand() * TAU, sp: rr(rand, 0.2, 0.7) });
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xfff6d0,
      size: 0.11,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.motePoints = new THREE.Points(geo, mat);
    this.scene.add(this.motePoints);
  }

  /* ---------------- boot ---------------- */

  start() {
    this.running = true;
    let last = performance.now();
    const loop = (now) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      this.update(dt);
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* ---------------- events ---------------- */

  _bindEvents() {
    window.addEventListener('resize', () => this._resize());

    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      this.keys.add(k);
      if (k === 'e' || k === 'enter') this.tryInteract();
      if (k === 'escape') this.ui.closeOverlay();
      if (k === 'm') this.ui.toggleMute();
      if (k === 'h') this.ui.toggleHelp();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());

    this.ui.bindPad(this.touch);
  }

  _resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(w, h, false);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this._updateCamera(1, true);
  }

  /* ---------------- update ---------------- */

  update(dt) {
    this.time += dt;
    const t = this.time;

    /* animated world bits always tick, even behind an overlay */
    this.props.update(t);
    this.bridge.update(t);
    this.petals.update(t, dt);
    this._tickShaders(t);

    if (this.overlayOpen) {
      this._updateCamera(dt, true);
      this._animatePlayer(dt, 0);
      return;
    }

    const p = this.player;
    let ix = 0;
    let iy = 0;
    const k = this.keys;
    if (k.has('a') || k.has('arrowleft')) ix -= 1;
    if (k.has('d') || k.has('arrowright')) ix += 1;
    if (k.has('w') || k.has('arrowup')) iy -= 1;
    if (k.has('s') || k.has('arrowdown')) iy += 1;

    if (this.touch.active) {
      ix += this.touch.x;
      iy += this.touch.y;
    }

    const mag = Math.hypot(ix, iy);
    if (mag > 1) {
      ix /= mag;
      iy /= mag;
    }
    const moving = mag > 0.08;

    const speed = p.speed * (this.inWater ? 0.62 : 1);
    p.vx = lerp(p.vx, ix * speed, clamp((moving ? 14 : 17) * dt, 0, 1));
    p.vy = lerp(p.vy, iy * speed, clamp((moving ? 14 : 17) * dt, 0, 1));

    if (moving) {
      p.walk = lerp(p.walk, 1, clamp(dt * 10, 0, 1));
      if (Math.abs(ix) > Math.abs(iy) * 1.15) p.dir = ix > 0 ? 'right' : 'left';
      else if (Math.abs(iy) > 0.01) p.dir = iy > 0 ? 'down' : 'up';
      /* face the direction of travel */
      const targetYaw = Math.atan2(ix, iy);
      p.yaw = this._lerpAngle(p.yaw, targetYaw, clamp(dt * 11, 0, 1));
    } else {
      p.walk = lerp(p.walk, 0, clamp(dt * 9, 0, 1));
    }

    /* axis-separated movement so we slide along obstacles */
    const nx = p.x + p.vx * dt;
    if (isWalkable(nx, p.y)) p.x = nx;
    else p.vx *= 0.2;
    const ny = p.y + p.vy * dt;
    if (isWalkable(p.x, ny)) p.y = ny;
    else p.vy *= 0.2;

    p.stepPhase += Math.hypot(p.vx, p.vy) * dt * 0.02;

    const moved = Math.hypot(p.x - p.lastX, p.y - p.lastY);
    if (moved > 0.9 && moving) {
      p.lastX = p.x;
      p.lastY = p.y;
    }
    this.inWater = false;

    this._animatePlayer(dt, moving ? 1 : 0);
    this._updateCat(dt, t);
    this._updateMotes(t);
    this._findNearest();
    this._updateCamera(dt);
  }

  _tickShaders(t) {
    if (this.riverMat.userData.shader) this.riverMat.userData.shader.uniforms.uTime.value = t;
    if (this.oceanMat.userData.shader) this.oceanMat.userData.shader.uniforms.uTime.value = t;
    if (this.props.windMesh?.material?.userData.shader) {
      this.props.windMesh.material.userData.shader.uniforms.uTime.value = t;
    }
  }

  _lerpAngle(a, b, t) {
    let d = ((b - a + Math.PI) % TAU) - Math.PI;
    if (d < -Math.PI) d += TAU;
    return a + d * t;
  }

  _playerGround(x, y) {
    if (onBridgeDeck(x, y)) return bridgeHeight(y);
    return terrainHeight(x, y);
  }

  _syncPlayerMesh(dt, snap = false) {
    const p = this.player;
    const gx = toX(p.x);
    const gz = toZ(p.y);
    const gy = this._playerGround(p.x, p.y);
    const g = this.rig.group;
    if (snap) g.position.set(gx, gy, gz);
    else {
      g.position.x = lerp(g.position.x, gx, clamp(dt * 16, 0, 1));
      g.position.z = lerp(g.position.z, gz, clamp(dt * 16, 0, 1));
      g.position.y = lerp(g.position.y, gy, clamp(dt * 13, 0, 1));
    }
    g.rotation.y = p.yaw;
  }

  _animatePlayer(dt, movingFlag) {
    this._syncPlayerMesh(dt);
    poseVillager(this.rig, {
      t: this.time,
      moving: this.player.walk,
      speed: Math.min(1, Math.hypot(this.player.vx, this.player.vy) / 210),
    });
  }

  _updateCat(dt, t) {
    const c = this.catState;
    c.timer -= dt;
    if (c.timer <= 0) {
      c.timer = 2 + Math.random() * 4;
      const a = Math.random() * TAU;
      const d = 20 + Math.random() * 60;
      const tx = clamp(c.x + Math.cos(a) * d, 1120, 1310);
      const ty = clamp(c.y + Math.sin(a) * d * 0.6, 1180, 1300);
      if (isWalkable(tx, ty)) {
        c.targetX = tx;
        c.targetY = ty;
      }
    }
    const dx = c.targetX - c.x;
    const dy = c.targetY - c.y;
    const d = Math.hypot(dx, dy);
    if (d > 3) {
      c.x += (dx / d) * 26 * dt;
      c.y += (dy / d) * 26 * dt;
      if (Math.abs(dx) > 1) c.dir = dx > 0 ? 1 : -1;
    }
    const g = this.cat.group;
    g.position.x = lerp(g.position.x, toX(c.x), clamp(dt * 8, 0, 1));
    g.position.z = lerp(g.position.z, toZ(c.y), clamp(dt * 8, 0, 1));
    g.position.y = terrainHeight(c.x, c.y);
    g.rotation.y = lerp(g.rotation.y, c.dir > 0 ? Math.PI / 2 : -Math.PI / 2, clamp(dt * 6, 0, 1));
    this.cat.update(t);
  }

  _updateMotes(t) {
    const arr = this.motePoints.geometry.attributes.position;
    for (let i = 0; i < this.motes.length; i++) {
      const m = this.motes[i];
      arr.setX(i, m.x + Math.sin(t * m.sp + m.ph) * 1.6);
      arr.setY(i, m.y + Math.sin(t * m.sp * 1.4 + m.ph) * 0.8);
      arr.setZ(i, m.z + Math.cos(t * m.sp * 0.9 + m.ph) * 1.6);
    }
    arr.needsUpdate = true;
  }

  _findNearest() {
    const p = this.player;
    let best = null;
    let bestD = INTERACT_RANGE;
    for (const spot of PODIUM_SPOTS) {
      const d = Math.hypot(p.x - spot.x, p.y - (spot.y + 10));
      if (d < bestD) {
        bestD = d;
        best = { kind: 'podium', spot, x: spot.x, y: spot.y };
      }
    }
    const doorD = Math.hypot(p.x - (HOUSE.x + 6), p.y - HOUSE.y);
    if (doorD < 130 && doorD < bestD) {
      bestD = doorD;
      best = { kind: 'house', x: HOUSE.x, y: HOUSE.y };
    }
    if (!best && onBridgeDeck(p.x, p.y)) {
      best = { kind: 'bridge', x: p.x, y: p.y };
    }
    this.near = best;
    this.ui.setPrompt(this._promptFor(best));
  }

  _promptFor(n) {
    if (!n) return null;
    if (n.kind === 'podium') return { label: `E — ${n.spot.hint}`, key: 'E' };
    if (n.kind === 'house') return { label: 'E — Go inside', key: 'E' };
    if (n.kind === 'bridge') return { label: 'E — Look at the river', key: 'E' };
    return null;
  }

  /* ---------------- camera ---------------- */

  _updateCamera(dt, force) {
    if (this.freeCam) return;
    const p = this.player;
    const px = toX(p.x);
    const pz = toZ(p.y);
    const py = this._playerGround(p.x, p.y);

    /* follow with a little lead in the facing direction */
    const lead = 1.5;
    const tx = px + Math.sin(p.yaw) * lead;
    const tz = pz + Math.cos(p.yaw) * lead;

    const cam = this.camera;
    if (force) {
      cam.position.set(tx, py + CAM.height, tz + CAM.dist);
    } else {
      const f = clamp(dt * CAM.lerp, 0, 1);
      this._camTarget.set(tx, py + CAM.height, tz + CAM.dist);
      cam.position.lerp(this._camTarget, f);
    }
    cam.lookAt(px, py + 1.35, pz - 0.8);
  }

  /* ---------------- interaction ---------------- */

  tryInteract() {
    if (this.overlayOpen) return;
    const n = this.near;
    if (!n) return;
    Audio.sfx('pop');
    if (n.kind === 'podium') this.ui.openResume(n.spot.id);
    else if (n.kind === 'house') this.ui.openResume('who');
    else if (n.kind === 'bridge') this.ui.openResume('river');
  }

  /* ---------------- render ---------------- */

  render() {
    const cam = this.camera;
    /* keep the sky and the sea centred on the camera so nothing clips */
    this.sky.position.set(cam.position.x, 0, cam.position.z);
    this.ocean.mesh.position.set(cam.position.x, 0, cam.position.z);
    this.lights.sun.target.position.set(toX(this.player.x), 0, toZ(this.player.y));
    this.lights.sun.position.set(
      toX(this.player.x) + 42,
      66,
      toZ(this.player.y) - 34
    );
    this.renderer.render(this.scene, cam);
  }

  /* ---------------- dev helpers ---------------- */

  __landmarks() {
    return [
      { name: 'house-door', x: HOUSE.x + 6, y: HOUSE.y + 42 },
      { name: 'bridge-north', x: BRIDGE.cx, y: BRIDGE.y0 + 10 },
      { name: 'bridge-mid', x: BRIDGE.cx, y: BRIDGE.cy },
      { name: 'bridge-south', x: BRIDGE.cx, y: BRIDGE.y1 - 10 },
      { name: 'plaza-center', x: PLAZA.x, y: PLAZA.y },
      { name: 'garden-north', x: 452, y: 792 },
      { name: 'garden-south', x: 430, y: 990 },
      { name: 'windmill-south', x: 1010, y: 340 },
      { name: 'nw-meadow', x: 640, y: 430 },
      { name: 'n-meadow', x: 1300, y: 330 },
      { name: 'ne-meadow', x: 2050, y: 480 },
      { name: 'east-bank', x: 1740, y: 1040 },
      { name: 'sw-shore', x: 620, y: 1480 },
      { name: 'se-shore', x: 1900, y: 1480 },
    ];
  }

  __walkable(x, y) {
    return isWalkable(x, y);
  }

  __podiums() {
    return PODIUM_SPOTS.map((s) => ({ id: s.id, x: s.x, y: s.y }));
  }

  /** dev helper: park the camera somewhere and stop following the player */
  debugView(x, y, zoom) {
    const px = toX(x);
    const pz = toZ(y);
    const dist = CAM.dist * (zoom ? 1 / zoom : 1);
    this.freeCam = true;
    this.camera.position.set(px, 16, pz + dist);
    this.camera.lookAt(px, 1.5, pz);
    return { x, y, dist };
  }

  /** dev helper: aim the camera at a point from a given yaw/pitch/dist */
  debugOrbit(x, y, yawDeg, pitchDeg, dist) {
    const target = new THREE.Vector3(toX(x), this._playerGround(x, y) + 1.5, toZ(y));
    const yaw = (yawDeg * Math.PI) / 180;
    const pitch = (pitchDeg * Math.PI) / 180;
    const cx = target.x + Math.sin(yaw) * Math.cos(pitch) * dist;
    const cz = target.z + Math.cos(yaw) * Math.cos(pitch) * dist;
    const cy = target.y + Math.sin(pitch) * dist;
    this.freeCam = true;
    this.camera.position.set(cx, cy, cz);
    this.camera.lookAt(target);
    this.camera.updateMatrixWorld(true);
    return {
      cam: [cx, cy, cz].map((v) => +v.toFixed(1)),
      target: [target.x, target.y, target.z].map((v) => +v.toFixed(1)),
    };
  }
}
