/* ============================================================
   Game — loop, camera, input, player movement, interactions.
   ============================================================ */

import { TAU, clamp, lerp, rgba, rng, rr, pick } from './core.js';
import {
  WORLD,
  PROPS,
  COLLIDERS,
  SPAWN,
  isWalkable,
  onBridge,
  BRIDGE,
  PLAZA,
  HOUSE,
  PODIUM_SPOTS,
} from './layout.js';
import {
  drawOcean,
  drawGround,
  drawRiver,
  drawBridge,
  drawBridgeReflection,
  visibleProps,
  drawProp,
} from './world.js';
import { drawVillager, drawCat, DEFAULT_LOOK } from './villager.js';
import { UI } from './ui.js';
import { Audio } from './audio.js';

const INTERACT_RANGE = 96;

export class Game {
  constructor(canvas, uiRoot) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.ui = new UI(uiRoot);
    this.time = 0;
    this.running = false;
    this.paused = true;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.camera = { x: 0, y: 0, w: 0, h: 0, zoom: 1, tx: 0, ty: 0 };

    this.player = {
      x: SPAWN.x,
      y: SPAWN.y,
      vx: 0,
      vy: 0,
      dir: 'down',
      walk: 0,
      speed: 210,
      look: { ...DEFAULT_LOOK },
      stepPhase: 0,
      lastX: SPAWN.x,
      lastY: SPAWN.y,
    };

    this.keys = new Set();
    this.touch = { x: 0, y: 0, active: false, mag: 0 };
    this.near = null;
    this.inWater = false;
    this.footprints = [];
    this.ripples = [];
    this.petals = [];
    this.fireflies = [];
    this.cat = { x: 1210, y: 1252, dir: -1, timer: 0, targetX: 1210, targetY: 1252 };
    this.birds = [];
    this.butterflies = [];
    this.overlayOpen = false;
    this.started = false;

    this._bindEvents();
    this._resize();
    this._seedAmbient();

    this.ui.onCustomize = (look) => {
      this.player.look = { ...look };
    };
    this.ui.onOverlayOpen = () => {
      this.overlayOpen = true;
    };
    this.ui.onOverlayClose = () => {
      this.overlayOpen = false;
    };
    this.ui.onInteract = () => this.tryInteract();
    this.ui.onStart = (look) => {
      this.player.look = { ...look };
      this.started = true;
      this.paused = false;
      Audio.startAmbient();
      this.ui.showHud();
    };
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
      if (k === 'e' || k === 'enter') {
        this.tryInteract();
      }
      if (k === 'escape') this.ui.closeOverlay();
      if (k === 'm') this.ui.toggleMute();
      if (k === 'h') this.ui.toggleHelp();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());

    /* on-screen dpad */
    this.ui.bindPad(this.touch);
  }

  _resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(w * this.dpr);
    this.canvas.height = Math.floor(h * this.dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // zoom: show roughly 1180px of world width on a laptop
    const targetW = clamp(w * 0.95, 900, 1500);
    this.camera.zoom = clamp(w / targetW, 0.72, 1.8);
    this.camera.w = w / this.camera.zoom;
    this.camera.h = h / this.camera.zoom;
    this._clampCamera(true);
  }

  _clampCamera(snap = false) {
    const cam = this.camera;
    const halfW = cam.w / 2;
    const halfH = cam.h / 2;
    const minX = -110 + halfW;
    const maxX = WORLD.w + 110 - halfW;
    const minY = -110 + halfH;
    const maxY = WORLD.h + 110 - halfH;
    const tx = minX > maxX ? WORLD.w / 2 : clamp(this.camera.tx, minX, maxX);
    const ty = minY > maxY ? WORLD.h / 2 : clamp(this.camera.ty, minY, maxY);
    if (snap) {
      cam.x = tx - halfW;
      cam.y = ty - halfH;
    }
    cam.tx = tx;
    cam.ty = ty;
  }

  /* ---------------- ambient particles ---------------- */

  _seedAmbient() {
    const rand = rng(2024);
    for (let i = 0; i < 46; i++) {
      this.petals.push({
        x: rr(rand, 0, WORLD.w),
        y: rr(rand, 0, WORLD.h),
        vx: rr(rand, 8, 30),
        vy: rr(rand, 12, 28),
        r: rr(rand, 2.2, 5),
        rot: rand() * TAU,
        spin: rr(rand, -2, 2),
        ph: rand() * TAU,
        a: rr(rand, 0.45, 0.9),
        kind: rand() < 0.6 ? 'petal' : 'leaf',
      });
    }
    for (let i = 0; i < 34; i++) {
      this.fireflies.push({
        x: rr(rand, 200, WORLD.w - 200),
        y: rr(rand, 300, WORLD.h - 200),
        ph: rand() * TAU,
        sp: rr(rand, 0.3, 0.9),
        r: rr(rand, 1.2, 2.6),
      });
    }
    /* birds circling over the meadow */
    for (let i = 0; i < 7; i++) {
      this.birds.push({
        cx: rr(rand, 500, 2100),
        cy: rr(rand, 300, 900),
        rx: rr(rand, 60, 190),
        ry: rr(rand, 26, 70),
        ph: rand() * TAU,
        sp: rr(rand, 0.22, 0.5) * (rand() < 0.5 ? -1 : 1),
        scale: rr(rand, 0.7, 1.15),
      });
    }
    /* butterflies in the flowerbeds + plaza */
    const spots = [
      [486, 700], [928, 692], [448, 900], [980, 1400],
      [700, 690], [1180, 1120], [430, 980], [1700, 1200],
    ];
    for (let i = 0; i < 14; i++) {
      const s = spots[i % spots.length];
      this.butterflies.push({
        hx: s[0] + rr(rand, -70, 70),
        hy: s[1] + rr(rand, -50, 50),
        ph: rand() * TAU,
        sp: rr(rand, 0.5, 1.3),
        hue: pick(rand, ['#ffe08a', '#ffc0d8', '#d7c4ff', '#ffffff']),
        r: rr(rand, 3.2, 5),
      });
    }
  }

  /* ---------------- update ---------------- */

  update(dt) {
    this.time += dt;
    if (this.overlayOpen) {
      this._updateCamera(dt, true);
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
    const targetVx = ix * speed;
    const targetVy = iy * speed;
    const accel = moving ? 14 : 17;
    p.vx = lerp(p.vx, targetVx, clamp(accel * dt, 0, 1));
    p.vy = lerp(p.vy, targetVy, clamp(accel * dt, 0, 1));

    if (moving) {
      p.walk = lerp(p.walk, 1, clamp(dt * 10, 0, 1));
      if (Math.abs(ix) > Math.abs(iy) * 1.15) p.dir = ix > 0 ? 'right' : 'left';
      else if (Math.abs(iy) > 0.01) p.dir = iy > 0 ? 'down' : 'up';
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

    this.inWater = false;

    /* footprints on sand / grass */
    const moved = Math.hypot(p.x - p.lastX, p.y - p.lastY);
    if (moved > 0.9 && moving) {
      this._spawnFootprint(p);
      p.lastX = p.x;
      p.lastY = p.y;
    }

    /* ripple when standing near water */
    if (moving && Math.random() < dt * 12) {
      this.ripples.push({
        x: p.x,
        y: p.y + 4,
        r: 2,
        max: 16,
        a: 0.35,
        kind: 'step',
      });
    }

    this._updateAmbient(dt, p);
    this._updateCat(dt);
    this._findNearest();
    this._updateCamera(dt);
  }

  _spawnFootprint(p) {
    const side = Math.sin(p.stepPhase * 6) > 0 ? 1 : -1;
    this.footprints.push({
      x: p.x + (p.dir === 'up' || p.dir === 'down' ? side * 5 : 0),
      y: p.y + 1,
      rot: p.dir === 'left' || p.dir === 'right' ? Math.PI / 2 : 0,
      life: 1,
      kind: onBridge(p.x, p.y) ? 'wood' : 'grass',
    });
    if (this.footprints.length > 60) this.footprints.shift();
  }

  _updateAmbient(dt, p) {
    /* petals drift across the whole island */
    for (const pt of this.petals) {
      pt.ph += dt * 1.4;
      pt.x += (pt.vx + Math.sin(pt.ph) * 12) * dt;
      pt.y += pt.vy * dt;
      pt.rot += pt.spin * dt;
      if (pt.y > WORLD.h + 40 || pt.x > WORLD.w + 40 || pt.x < -50) {
        pt.x = Math.random() * WORLD.w * 0.5 - 40;
        pt.y = -30;
      }
    }
    for (const f of this.fireflies) {
      f.ph += dt * f.sp;
      f.x += Math.sin(f.ph * 1.7) * 12 * dt;
      f.y += Math.cos(f.ph * 1.1) * 8 * dt;
    }
    for (const b of this.birds) {
      b.ph += dt * b.sp;
    }
    for (const bf of this.butterflies) {
      bf.ph += dt * bf.sp;
    }
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.r += dt * 26;
      r.a -= dt * 0.7;
      if (r.a <= 0) this.ripples.splice(i, 1);
    }
    for (let i = this.footprints.length - 1; i >= 0; i--) {
      const f = this.footprints[i];
      f.life -= dt * 0.075;
      if (f.life <= 0) this.footprints.splice(i, 1);
    }
  }

  _updateCat(dt) {
    const c = this.cat;
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
    // house door
    const doorD = Math.hypot(p.x - (HOUSE.x + 6), p.y - HOUSE.y);
    if (doorD < 130 && doorD < bestD) {
      bestD = doorD;
      best = { kind: 'house', x: HOUSE.x, y: HOUSE.y };
    }
    // bridge viewpoint
    if (!best && onBridge(p.x, p.y)) {
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

  _updateCamera(dt, force) {
    const cam = this.camera;
    const p = this.player;
    if (this.freeCam) {
      cam.x = this.freeCam.x - cam.w / 2;
      cam.y = this.freeCam.y - cam.h / 2;
      return;
    }
    const lookAhead = 26;
    const ax =
      p.dir === 'left' ? -lookAhead : p.dir === 'right' ? lookAhead : 0;
    const ay = p.dir === 'up' ? -lookAhead * 0.7 : p.dir === 'down' ? lookAhead * 0.7 : 0;
    this.camera.tx = p.x + ax;
    this.camera.ty = p.y - 30 + ay;
    this._clampCamera();
    const f = 1 - Math.pow(0.0015, dt);
    cam.x = lerp(cam.x, cam.tx - cam.w / 2, force ? 1 : f);
    cam.y = lerp(cam.y, cam.ty - cam.h / 2, force ? 1 : f);
  }

  /** dev helper: landmark probes used by tools/reach.mjs */
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

  /** dev helper: collision probe used by tools/walktest.mjs */
  __walkable(x, y) {
    return isWalkable(x, y);
  }

  /** dev helper: podium positions */
  __podiums() {
    return PODIUM_SPOTS.map((s) => ({ id: s.id, x: s.x, y: s.y }));
  }

  /** dev helper: which collider, if any, blocks this point */
  __blocker(x, y) {
    for (const c of COLLIDERS) {
      if (c.kind === 'circle') {
        if (Math.hypot(x - c.x, y - c.y) < c.r) {
          return {
            kind: 'circle', x: Math.round(c.x), y: Math.round(c.y), r: c.r,
            prop: PROPS.find((p) => Math.abs(p.x - c.x) < 2 && Math.abs(p.y - c.y) < 40)?.type || '?',
          };
        }
      } else if (x > c.x && x < c.x + c.w && y > c.y && y < c.y + c.h) {
        return { kind: 'rect', x: c.x, y: c.y, w: c.w, h: c.h };
      }
    }
    return null;
  }

  /** dev helper: park the camera somewhere and stop following the player */
  debugView(x, y, zoom) {
    if (zoom) {
      this.camera.zoom = zoom;
      this.camera.w = window.innerWidth / zoom;
      this.camera.h = window.innerHeight / zoom;
    }
    this.freeCam = { x, y };
    this.camera.x = x - this.camera.w / 2;
    this.camera.y = y - this.camera.h / 2;
    return { zoom: this.camera.zoom, w: this.camera.w, h: this.camera.h };
  }

  /* ---------------- interaction ---------------- */

  tryInteract() {
    if (this.overlayOpen) return;
    const n = this.near;
    if (!n) return;
    Audio.sfx('pop');
    if (n.kind === 'podium') {
      this.ui.openResume(n.spot.id);
    } else if (n.kind === 'house') {
      this.ui.openResume('who');
    } else if (n.kind === 'bridge') {
      this.ui.openResume('river');
    }
  }

  /* ---------------- render ---------------- */

  render() {
    const ctx = this.ctx;
    const cam = this.camera;
    const t = this.time;

    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, cam.w * this.dpr, cam.h * this.dpr);

    ctx.translate(-cam.x * cam.zoom, -cam.y * cam.zoom);
    ctx.scale(cam.zoom, cam.zoom);

    drawOcean(ctx, cam, t);
    drawGround(ctx, cam, t);

    /* water and the bridge deck sit at ground level — everything that stands
       on the island is painted above them, sorted by its foot position */
    drawRiver(ctx, t, cam);
    drawBridgeReflection(ctx, t);
    drawBridge(ctx, t);

    /* --- depth-sorted scene --- */
    const props = visibleProps(cam, 300);
    const list = [];
    for (const p of props) list.push({ y: p.y, kind: 'prop', p });
    list.push({ y: this.cat.y, kind: 'cat' });
    for (const f of this.footprints) list.push({ y: f.y, kind: 'foot', f });
    list.push({ y: this.player.y, kind: 'player' });
    list.sort((a, b) => a.y - b.y);

    for (const item of list) {
      switch (item.kind) {
        case 'prop':
          drawProp(ctx, item.p, t, this.near?.spot?.index === item.p.variant ? 1 : 0);
          break;
        case 'cat':
          drawCat(ctx, this.cat.x, this.cat.y, t, this.cat.dir);
          break;
        case 'foot':
          this._drawFootprint(ctx, item.f);
          break;
        case 'player':
          this._drawPlayer(ctx, t);
          break;
      }
    }

    this._drawParticles(ctx, t, cam);
    this._drawRipples(ctx);
    this._drawInteractRing(ctx, t);

    ctx.restore();

    /* vignette + colour grade */
    this._drawPost(ctx, cam);
    if (window.__DEBUGGRID) this._drawDebug(ctx);
  }

  _drawFootprint(ctx, f) {
    ctx.save();
    ctx.globalAlpha = f.life * 0.34;
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rot);
    ctx.fillStyle = f.kind === 'wood' ? '#9a7448' : '#8fae6f';
    ctx.beginPath();
    ctx.ellipse(0, 0, 2.6, 4.2, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  _drawPlayer(ctx, t) {
    const p = this.player;
    const blinkCycle = (t + 1.7) % 4.3;
    const blink = blinkCycle > 4.15 ? 1 - Math.abs((blinkCycle - 4.15) / 0.15 - 0.5) * 2 : 0;

    // splash hint when walking across puddle-less sand near the river
    drawVillager(ctx, {
      x: p.x,
      y: p.y,
      dir: p.dir,
      t,
      walk: p.walk,
      look: p.look,
      blink,
    });
  }

  _drawParticles(ctx, t, cam) {
    /* birds — simple two-stroke silhouettes gliding in circles */
    for (const b of this.birds) {
      const bx = b.cx + Math.cos(b.ph) * b.rx;
      const by = b.cy + Math.sin(b.ph) * b.ry - 120;
      if (bx < cam.x - 80 || bx > cam.x + cam.w + 80 || by < cam.y - 80 || by > cam.y + cam.h + 80)
        continue;
      const flap = Math.sin(t * 7 + b.ph * 3) * 0.5 + 0.5;
      const s = b.scale * 4.2;
      ctx.save();
      ctx.translate(bx, by);
      ctx.strokeStyle = `rgba(88,104,96,${0.42 + flap * 0.16})`;
      ctx.lineWidth = 1.7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-s, -flap * s * 0.7);
      ctx.quadraticCurveTo(-s * 0.45, -s * 0.28 - flap * s * 0.2, 0, 0);
      ctx.quadraticCurveTo(s * 0.45, -s * 0.28 - flap * s * 0.2, s, -flap * s * 0.7);
      ctx.stroke();
      ctx.restore();
    }

    /* butterflies */
    for (const bf of this.butterflies) {
      const bx = bf.hx + Math.sin(bf.ph * 1.3) * 46 + Math.sin(bf.ph * 3.7) * 8;
      const by = bf.hy + Math.cos(bf.ph * 1.7) * 30 + Math.sin(bf.ph * 2.3) * 6 - 40;
      if (bx < cam.x - 60 || bx > cam.x + cam.w + 60 || by < cam.y - 60 || by > cam.y + cam.h + 60)
        continue;
      const flap = Math.abs(Math.sin(t * 9 + bf.ph * 4));
      ctx.save();
      ctx.translate(bx, by);
      ctx.scale(1, 0.6 + flap * 0.5);
      ctx.fillStyle = bf.hue;
      ctx.globalAlpha = 0.9;
      [-1, 1].forEach((s) => {
        ctx.beginPath();
        ctx.ellipse(s * bf.r * 0.6, 0, bf.r, bf.r * 0.66, s * 0.4, 0, TAU);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(90,76,64,0.6)';
      ctx.beginPath();
      ctx.ellipse(0, 0, bf.r * 0.2, bf.r * 0.7, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    /* petals */
    for (const pt of this.petals) {
      if (
        pt.x < cam.x - 60 ||
        pt.x > cam.x + cam.w + 60 ||
        pt.y < cam.y - 60 ||
        pt.y > cam.y + cam.h + 60
      )
        continue;
      ctx.save();
      ctx.translate(pt.x, pt.y);
      ctx.rotate(pt.rot);
      ctx.globalAlpha = pt.a * (0.6 + 0.4 * Math.sin(pt.ph * 2));
      ctx.fillStyle = pt.kind === 'petal' ? '#ffd3e0' : '#b6d98e';
      ctx.beginPath();
      ctx.ellipse(0, 0, pt.r, pt.r * 0.55, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    /* fireflies (subtle in daylight) */
    const night = 0.34;
    for (const f of this.fireflies) {
      if (
        f.x < cam.x - 60 ||
        f.x > cam.x + cam.w + 60 ||
        f.y < cam.y - 60 ||
        f.y > cam.y + cam.h + 60
      )
        continue;
      const a = (0.35 + 0.65 * Math.abs(Math.sin(f.ph * 1.4))) * night;
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 16);
      g.addColorStop(0, `rgba(255,246,178,${a})`);
      g.addColorStop(1, 'rgba(255,246,178,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 16, 0, TAU);
      ctx.fill();
      ctx.fillStyle = `rgba(255,252,214,${a})`;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, TAU);
      ctx.fill();
    }
  }

  _drawRipples(ctx) {
    for (const r of this.ripples) {
      ctx.strokeStyle = `rgba(255,255,255,${Math.max(0, r.a)})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, r.r, r.r * 0.5, 0, 0, TAU);
      ctx.stroke();
    }
  }

  _drawInteractRing(ctx, t) {
    const n = this.near;
    if (!n || n.kind !== 'podium') return;
    const pulse = 0.5 + 0.5 * Math.sin(t * 3.4);
    ctx.save();
    ctx.translate(n.x, n.y + 6);
    ctx.strokeStyle = `rgba(255,255,255,${0.28 + pulse * 0.34})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, 52 + pulse * 5, 20 + pulse * 3, 0, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([7, 9]);
    ctx.lineDashOffset = -t * 22;
    ctx.strokeStyle = `rgba(120,190,140,${0.4 + pulse * 0.4})`;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(0, 0, 66, 26, 0, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  _drawPost(ctx, cam) {
    /* warm colour grade + vignette */
    const w = cam.w;
    const h = cam.h;
    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.34, w / 2, h / 2, Math.max(w, h) * 0.78);
    vg.addColorStop(0, 'rgba(255,240,210,0)');
    vg.addColorStop(0.72, 'rgba(70,60,40,0.06)');
    vg.addColorStop(1, 'rgba(46,44,34,0.26)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }

  /** dev-only: world grid + landmark markers drawn in screen space */
  _drawDebug(ctx) {
    const cam = this.camera;
    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.translate(-cam.x * cam.zoom, -cam.y * cam.zoom);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.lineWidth = 1 / cam.zoom;
    ctx.font = `${11 / cam.zoom}px monospace`;
    ctx.textBaseline = 'top';
    const step = 100;
    const x0 = Math.floor(cam.x / step) * step;
    const y0 = Math.floor(cam.y / step) * step;
    for (let x = x0; x < cam.x + cam.w + step; x += step) {
      ctx.strokeStyle = x % 500 === 0 ? 'rgba(255,0,0,0.75)' : 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.moveTo(x, cam.y);
      ctx.lineTo(x, cam.y + cam.h);
      ctx.stroke();
      if (x % 500 === 0) {
        ctx.fillStyle = 'rgba(180,0,0,0.95)';
        ctx.fillText(String(x), x + 2, cam.y + 2);
      }
    }
    for (let y = y0; y < cam.y + cam.h + step; y += step) {
      ctx.strokeStyle = y % 500 === 0 ? 'rgba(255,0,0,0.75)' : 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.moveTo(cam.x, y);
      ctx.lineTo(cam.x + cam.w, y);
      ctx.stroke();
      if (y % 500 === 0) {
        ctx.fillStyle = 'rgba(180,0,0,0.95)';
        ctx.fillText(String(y), cam.x + 2, y + 2);
      }
    }
    /* landmark crosshairs */
    const marks = [
      ['HOUSE', HOUSE.x, HOUSE.y, '#c00'],
      ['PLAZA', PLAZA.x, PLAZA.y, '#06c'],
      ['BRIDGE', BRIDGE.cx, BRIDGE.cy, '#c60'],
    ];
    for (const [lab, mx, my, col] of marks) {
      ctx.strokeStyle = col;
      ctx.lineWidth = 2 / cam.zoom;
      ctx.beginPath();
      ctx.moveTo(mx - 14, my);
      ctx.lineTo(mx + 14, my);
      ctx.moveTo(mx, my - 14);
      ctx.lineTo(mx, my + 14);
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.fillText(lab, mx + 16, my - 6);
    }
    ctx.restore();
  }
}
