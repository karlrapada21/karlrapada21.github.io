/**
 * Boot, interaction and the render loop.
 *
 * The shape of the app: one WebGL canvas that is always the background, a menu
 * that chooses a "shot", and panels that appear over the top. Everything the
 * pointer and keyboard touch funnels through `setSection`.
 */

import { WebGLRenderer, SRGBColorSpace, Raycaster, Vector2 } from 'three';
import { createWorld, shotFor } from './world.js';
import { createCameraRig } from './core/rig.js';
import { createPointer } from './core/pointer.js';
import { createAudio } from './core/audio.js';
import { createMenu } from './ui/menu.js';
import { createPanels } from './ui/panels.js';
import { sections } from './data/content.js';
import { cycleTimeOfDay, currentTime, setTimeOfDay } from './core/palette.js';
import { prefersReducedMotion, isTouchOnly, prefersLessData, clamp } from './core/util.js';

const dom = {
  canvas: document.getElementById('stage'),
  boot: document.getElementById('boot'),
  bootSub: document.getElementById('boot-sub'),
  bootFill: document.getElementById('boot-fill'),
  bootBar: document.getElementById('boot-bar'),
  btnAudio: document.getElementById('btn-audio'),
  btnTime: document.getElementById('btn-time'),
  timeLabel: document.getElementById('time-label'),
  hintBar: document.getElementById('hint-bar'),
  themeMeta: document.querySelector('meta[name="theme-color"]'),
};

/* ───────────────────────────── quality ladder ───────────────────────────── */

function pickQuality() {
  const dpr = window.devicePixelRatio || 1;
  const small = Math.min(window.innerWidth, window.innerHeight) < 620;
  const touch = isTouchOnly();

  if (prefersLessData() || (touch && small && dpr > 2.5)) return 'low';
  if (touch && small) return 'medium';
  if (window.innerWidth < 1100) return 'medium';
  return 'high';
}

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}

/* ────────────────────────────────── boot ────────────────────────────────── */

function setProgress(pct, label) {
  const p = clamp(pct, 0, 100);
  dom.bootFill.style.width = `${p}%`;
  dom.bootBar.setAttribute('aria-valuenow', String(Math.round(p)));
  if (label) dom.bootSub.innerHTML = label;
}

function fallback(reason) {
  document.body.classList.remove('is-booting');
  dom.boot.classList.add('is-done');
  dom.bootSub.textContent = reason;
  dom.canvas.style.display = 'none';
  document.body.style.overflow = 'auto';
  const noscript = document.querySelector('.noscript');
  if (noscript) noscript.style.display = 'block';
  document.getElementById('app-fallback')?.remove();
  console.warn('[island]', reason);
}

/* ─────────────────────────────────── app ────────────────────────────────── */

async function main() {
  const reducedMotion = prefersReducedMotion();
  const quality = pickQuality();

  if (!webglAvailable()) {
    fallback('This island needs WebGL — here it is as plain text instead.');
    return;
  }

  /* renderer */
  let renderer;
  try {
    renderer = new WebGLRenderer({
      canvas: dom.canvas,
      antialias: quality !== 'low',
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
      preserveDrawingBuffer: false,
    });
  } catch (err) {
    fallback('Could not start WebGL — showing the text version.');
    return;
  }

  const maxDpr = quality === 'low' ? 1 : quality === 'medium' ? 1.5 : 2;
  let dpr = Math.min(window.devicePixelRatio || 1, maxDpr);

  renderer.setPixelRatio(dpr);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMappingExposure = 1.0;

  const rig = createCameraRig(window.innerWidth / window.innerHeight);
  rig.resize(window.innerWidth, window.innerHeight);

  setProgress(4, 'Finding a nice spot&hellip;');
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  /* world */
  let world;
  try {
    world = await createWorld({
      quality,
      reducedMotion,
      onProgress: (p, label) => setProgress(p, label),
    });
  } catch (err) {
    console.error(err);
    fallback('Something went wrong while building the island.');
    return;
  }

  /* ui + interaction */
  const audio = createAudio();
  let sectionId = null; // null === main menu
  let menuIndex = 0;
  const raycaster = new Raycaster();
  const ndc = new Vector2();
  let pointerInside = false;
  let hoveredShard = -1;
  let dragged = false;

  const narrow = () => window.innerWidth <= 860;
  const portrait = () => window.innerHeight > window.innerWidth;

  const panels = createPanels({
    onClose: (id) => {
      sectionId = null;
      world.grove.setMode('orbit');
      world.grove.setActive(-1);
      world.grove.setHover(-1);
      rig.setShot(shotFor('menu', { narrow: narrow(), portrait: portrait() }));
      audio.close();
      document.body.dataset.view = 'menu';

      // hand focus back to the menu item that opened the panel
      const idx = Math.max(0, sections.findIndex((s) => s.id === id));
      menuIndex = idx;
      menu.setActive(idx, { silent: true });
      window.setTimeout(() => menu.focus(idx), 40);
    },
    onSelectProject: (i) => {
      world.grove.setActive(i);
      audio.pick();
    },
    onHoverProject: (i) => {
      world.grove.setHover(i);
    },
    onCopy: () => {
      audio.pick();
    },
  });

  const menu = createMenu({
    sections,
    onHover: (i) => {
      if (sectionId) return;
      menuIndex = i;
      world.grove.setHover(-1);
      hoverShot(sections[i].id);
      audio.hover();
    },
    onOpen: (i) => {
      menuIndex = i;
      openSection(sections[i].id);
    },
  });

  /**
   * While browsing the menu the camera leans toward whichever landmark is
   * highlighted, staying wide enough to keep the whole island readable.
   */
  function hoverShot(id) {
    const target = shotFor(id, { narrow: narrow(), portrait: portrait() });
    const home = shotFor('menu', { narrow: narrow(), portrait: portrait() });

    rig.setShot({
      focus: target.focus,
      azim: target.azim,
      elev: target.elev,
      dist: narrow() ? target.dist : (target.dist + home.dist) / 2,
      panX: narrow() ? 0 : clamp(target.panX * 0.85, -0.22, 0.22),
      panY: target.panY + (narrow() ? 0.02 : 0),
    });
  }

  function openSection(id) {
    const section = sections.find((s) => s.id === id);
    if (!section) return;

    sectionId = id;
    document.body.dataset.view = 'panel';

    if (id === 'projects') {
      world.grove.setMode('arc');
      world.grove.setActive(panels.activeProject);
      world.grove.setHover(-1);
    } else {
      world.grove.setMode('orbit');
    }

    rig.setShot(shotFor(id, { narrow: narrow(), portrait: portrait() }));
    panels.open(id, section);
    audio.open();
    menu.flash();
  }

  /* ── pointer ── */
  createPointer(dom.canvas, {
    down: () => {
      audio.unlock();
      dragged = false;
      hideHint();
    },
    drag: (dx, dy) => {
      if (sectionId) return;
      dragged = true;
      rig.drag(dx, dy);
    },
    up: () => {
      rig.endDrag();
    },
    hover: (p) => {
      pointerInside = true;
      ndc.set(p.nx, p.ny);
      if (!reducedMotion) rig.parallax(p.nx, p.ny, narrow() ? 0.4 : 1);
      updateShardHover();
    },
    tap: (p) => {
      audio.unlock();
      ndc.set(p.nx, p.ny);
      const hit = updateShardHover(true);
      // clicking the island while a panel is open means "put it away"
      if (hit < 0 && sectionId) panels.close();
    },
    leave: () => {
      pointerInside = false;
      world.grove.setHover(-1);
      hoveredShard = -1;
      if (!reducedMotion) rig.parallax(0, 0, 0);
    },
  });

  // Parallax should follow the pointer even while it is over the menu, so the
  // island keeps breathing instead of freezing at the edges of the UI.
  window.addEventListener(
    'pointermove',
    (e) => {
      if (reducedMotion || sectionId || e.pointerType === 'touch') return;
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = -((e.clientY / window.innerHeight) * 2 - 1);
      rig.parallax(nx, ny, 1);
    },
    { passive: true }
  );

  function updateShardHover(click = false) {
    raycaster.setFromCamera(ndc, rig.camera);
    const i = world.grove.closestToPointer(raycaster, rig.camera);

    if (i !== hoveredShard) {
      hoveredShard = i;
      world.grove.setHover(i);
      if (i >= 0 && !sectionId) audio.hover();
      dom.canvas.style.cursor = i >= 0 ? 'pointer' : '';
    }

    if (click && i >= 0) {
      audio.select();
      if (sectionId === 'projects') {
        panels.selectProject(i);
        world.grove.setActive(i);
      } else {
        panels.selectProject(i, { silent: true });
        openSection('projects');
        panels.selectProject(i);
        world.grove.setActive(i);
      }
    }

    return i;
  }

  /* ── hud buttons ── */
  dom.btnAudio?.addEventListener('click', () => {
    audio.unlock();
    audio.setEnabled(!audio.enabled);
    dom.btnAudio.setAttribute('aria-pressed', String(audio.enabled));
  });
  dom.btnAudio?.setAttribute('aria-pressed', String(audio.enabled));

  // Browsers only allow audio to start from a gesture — wait for the first one.
  const unlockOnce = () => {
    audio.unlock();
    window.removeEventListener('pointerdown', unlockOnce);
    window.removeEventListener('keydown', unlockOnce);
  };
  window.addEventListener('pointerdown', unlockOnce, { passive: true });
  window.addEventListener('keydown', unlockOnce);

  function paintTimeUI() {
    const cur = currentTime();
    if (dom.timeLabel) dom.timeLabel.textContent = cur.label;
    const dot = dom.btnTime?.querySelector('.time-dot');
    if (dot) {
      const map = {
        day: 'radial-gradient(circle at 35% 32%, #ffffff, #ffe9a8 55%, #ffd166 100%)',
        golden: 'radial-gradient(circle at 35% 32%, #fff6d8, #ffd166 55%, #f2a65a 100%)',
        night: 'radial-gradient(circle at 35% 32%, #dfe7ff, #93aef0 55%, #3f5686 100%)',
      };
      dot.style.background = map[cur.id] || map.golden;
    }
    if (dom.themeMeta) {
      const themes = { day: '#9ed3e6', golden: '#f2c08a', night: '#23335c' };
      dom.themeMeta.setAttribute('content', themes[cur.id] || '#9ed3e6');
    }
  }

  dom.btnTime?.addEventListener('click', () => {
    audio.unlock();
    const next = cycleTimeOfDay();
    paintTimeUI();
    audio.timeChange(next.id === 'night');
  });
  paintTimeUI();

  function setTimeTo(i) {
    setTimeOfDay(i, true);
    paintTimeUI();
  }

  /* ── keyboard ── */
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.key === 'Escape') {
      if (sectionId) {
        panels.close();
        e.preventDefault();
      }
      return;
    }

    if (sectionId) {
      // inside a panel, arrows only cycle projects
      if (sectionId === 'projects' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        const dir = e.key === 'ArrowRight' ? 1 : -1;
        const total = panels.projectCount;
        const next = (panels.activeProject + dir + total) % total;
        panels.selectProject(next);
        world.grove.setActive(next);
        world.grove.setHover(-1);
        audio.pick();
        e.preventDefault();
      }
      return;
    }

    const key = e.key;
    if (key === 'ArrowDown' || key === 'ArrowRight' || key === 's') {
      menu.move(1);
      e.preventDefault();
    } else if (key === 'ArrowUp' || key === 'ArrowLeft' || key === 'w') {
      menu.move(-1);
      e.preventDefault();
    } else if (key === 'Enter' || key === ' ') {
      openSection(sections[menu.active].id);
      e.preventDefault();
    } else if (key === 'Home') {
      menu.setActive(0);
      e.preventDefault();
    } else if (key === 'End') {
      menu.setActive(sections.length - 1);
      e.preventDefault();
    } else if (/^[1-5]$/.test(key)) {
      const i = Number(key) - 1;
      if (i < sections.length) {
        menu.setActive(i);
        openSection(sections[i].id);
      }
      e.preventDefault();
    }
  });

  /* ── hints ── */
  let hintTimer = 0;
  function hideHint() {
    dom.hintBar?.classList.add('is-hidden');
    dom.hintBar && (dom.hintBar.style.opacity = '0');
  }
  hintTimer = window.setTimeout(hideHint, 14000);

  /* ── resize ── */
  let resizeRaf = 0;
  function onResize() {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      rig.resize(w, h);
      rig.setShot(shotFor(sectionId || 'menu', { narrow: narrow(), portrait: portrait() }));
    });
  }
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('orientationchange', onResize, { passive: true });

  /* ── intro shot ── */
  const homeShot = () => shotFor('menu', { narrow: narrow(), portrait: portrait() });
  rig.setShot(homeShot(), true);
  // pull back to a wide establishing shot, then settle into the menu framing
  rig.setShot(
    {
      focus: homeShot().focus,
      azim: 0.32,
      elev: 0.5,
      dist: narrow() ? 54 : 62,
      panX: 0,
      panY: 0.1,
    },
    true
  );
  requestAnimationFrame(() => {
    rig.setShot(homeShot());
  });

  /* ── render loop ── */
  let last = performance.now();
  let acc = 0;
  let frames = 0;
  let stable = 0;
  let running = true;
  let firstFrame = true;

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) last = performance.now();
  });

  function frame(now) {
    requestAnimationFrame(frame);
    if (!running) return;

    const dtRaw = (now - last) / 1000;
    last = now;
    const dt = Math.min(dtRaw, 0.05);

    rig.update(dt);
    world.update(dt, rig.camera, renderer);
    renderer.render(world.scene, rig.camera);

    if (firstFrame) {
      firstFrame = false;
      setProgress(100, 'Welcome&hellip;');
      window.setTimeout(revealScene, 220);
    }

    // adaptive resolution: keep the frame budget, not the pixel count
    acc += dtRaw;
    frames++;
    if (frames >= 45) {
      const avg = acc / frames;
      acc = 0;
      frames = 0;

      if (avg > 0.0235 && dpr > 1.0) {
        dpr = Math.max(1.0, dpr - 0.18);
        renderer.setPixelRatio(dpr);
        renderer.setSize(window.innerWidth, window.innerHeight, false);
        stable = 0;
      } else if (avg < 0.0135 && dpr < maxDpr) {
        stable++;
        if (stable > 2) {
          dpr = Math.min(maxDpr, dpr + 0.12);
          renderer.setPixelRatio(dpr);
          renderer.setSize(window.innerWidth, window.innerHeight, false);
          stable = 0;
        }
      } else {
        stable = 0;
      }
    }
  }

  function revealScene() {
    dom.canvas.classList.add('is-live');
    dom.boot.classList.add('is-done');
    document.body.classList.remove('is-booting');
    document.body.dataset.view = 'menu';
    // take the overlay out of the hit-test tree for good
    window.setTimeout(() => {
      dom.boot.hidden = true;
      dom.boot.style.display = 'none';
    }, 900);
    window.setTimeout(() => {
      document.body.classList.add('has-entered');
    }, 120);
  }

  requestAnimationFrame((t) => {
    last = t;
    frame(t);
  });

  setProgress(96, 'Almost there&hellip;');

  /* expose a tiny debug surface for the automated visual checks */
  window.__ISLE__ = {
    world,
    rig,
    renderer,
    openSection,
    closePanel: () => panels.close(),
    /** snap the camera to its target shot (headless capture is slow) */
    settle: () => {
      rig.snap();
    },
    /** advance the simulation so animations reach steady state before capture */
    warm: (frames = 60, dt = 0.05) => {
      for (let i = 0; i < frames; i++) {
        rig.update(dt);
        world.update(dt, rig.camera, renderer);
      }
      renderer.render(world.scene, rig.camera);
    },
    /** exact framebuffer sample at CSS pixel coordinates (QA only) */
    sample: (points) => {
      renderer.render(world.scene, rig.camera);
      const gl = renderer.getContext();
      const dprNow = renderer.getPixelRatio();
      const buf = new Uint8Array(4);
      return points.map(([x, y]) => {
        gl.readPixels(
          Math.round(x * dprNow),
          Math.round((window.innerHeight - y) * dprNow),
          1,
          1,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          buf
        );
        return [buf[0], buf[1], buf[2]];
      });
    },
    setTime: (id) => {
      const i = ['day', 'golden', 'night'].indexOf(id);
      if (i >= 0) {
        setTimeTo(i);
      }
    },
    metrics: () => ({
      drawCalls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
      programs: renderer.info.programs?.length ?? 0,
      dpr: renderer.getPixelRatio(),
      section: sectionId,
      time: currentTime().id,
    }),
  };
}

main().catch((err) => {
  console.error(err);
  fallback('The island failed to load. The text version is below.');
});
