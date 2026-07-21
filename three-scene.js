import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

const COLORS = {
  pink: 0xf55a6b,
  cyan: 0x5accf5,
  yellow: 0xf5e65a,
  green: 0x5af5a6,
  purple: 0xb55af5,
  dark: 0x0f0b0b
};

const VIEW_DISTANCE = 720;
const HOME_VIEW_DISTANCE = 520;
const SECTION_SPACING = 2400;
const SECTION_IDS = ['home', 'about', 'experience', 'projects', 'certificates', 'contact'];
const SECTION_COLORS = [COLORS.pink, COLORS.cyan, COLORS.purple, COLORS.green, COLORS.yellow, COLORS.pink];

function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

class Scene3D {
  constructor() {
    this.sectionObjects = [];
    this.decorations = [];
    this.sectionMeta = [];
    this.currentIndex = 0;
    this.currentCamPos = new THREE.Vector3(0, 0, HOME_VIEW_DISTANCE);
    this.currentLookAt = new THREE.Vector3(0, 0, 0);
    this.mouseNDC = new THREE.Vector2(0, 0);
    this.targetMouse = new THREE.Vector2(0, 0);
    this.t = 0;
    this.clock = new THREE.Clock();

    // Transition state - direct dolly to target, no arcing
    this.transitionActive = false;
    this.transitionProgress = 0;
    this.transitionDuration = 1.4;
    this.transFromPos = new THREE.Vector3();
    this.transToPos = new THREE.Vector3();
    this.transFromLook = new THREE.Vector3();
    this.transToLook = new THREE.Vector3();
    this.transFromScroll = 0;
    this.isNavTransition = false;
    this.baseFov = 62;
    this.targetFov = 62;

    // Continuous scroll position along the corridor (0 = home, maxIdx = contact)
    this.maxIdx = SECTION_IDS.length - 1;
    this.scrollPos = 0;
    this.targetScrollPos = 0;

    // Idle drift seed (per-section phase so each feels distinct)
    this.idleSeed = Math.random() * 100;

    this.init();
  }

  // Each section sits at a unique offset (like a video game selection screen):
  // home is centered, the rest are scattered to different corners at increasing depth.
  sectionPos(i) {
    const positions = [
      new THREE.Vector3(0,    0,    0),       // home          - center
      new THREE.Vector3(420,  240,  -2400),   // about         - top-right
      new THREE.Vector3(-460, -200, -4800),   // experience    - bottom-left
      new THREE.Vector3(-360, 280,  -7200),   // projects      - top-left
      new THREE.Vector3(400,  -260, -9600),   // certificates  - bottom-right
      new THREE.Vector3(160,  120,  -12000)   // contact       - far center-right
    ];
    return positions[i % positions.length].clone();
  }

  // Sample points along the curved corridor (linear interp between section positions)
  computeCenterline(samples) {
    const line = [];
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const idx = t * (SECTION_IDS.length - 1);
      const idxFloor = Math.floor(idx);
      const frac = idx - idxFloor;
      const p1 = this.sectionPos(idxFloor);
      const p2 = this.sectionPos(Math.min(idxFloor + 1, SECTION_IDS.length - 1));
      line.push(p1.clone().lerp(p2, frac));
    }
    return line;
  }

  init() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x080510, 0.00018);

    this.camera = new THREE.PerspectiveCamera(
      62, window.innerWidth / window.innerHeight, 0.1, 14000
    );
    this.camera.position.set(0, 0, HOME_VIEW_DISTANCE);
    this.camera.lookAt(0, 0, 0);
    this.camera.up.set(0, 1, 0);

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.domElement.style.cssText =
      'position:fixed;inset:0;z-index:0;pointer-events:none;';
    document.body.appendChild(this.renderer.domElement);

    this.cssRenderer = new CSS3DRenderer();
    this.cssRenderer.setSize(window.innerWidth, window.innerHeight);
    this.cssRenderer.domElement.style.cssText =
      'position:fixed;inset:0;z-index:1;';
    document.body.appendChild(this.cssRenderer.domElement);

    this.createLights();
    this.createCurvedFloor();
    this.createCurvedCeiling();
    this.createSidePillars();
    this.createSectionPanels();
    this.createTunnelRings();
    this.createDecorations();
    this.createParticles();
    this.createSpeedLines();
    this.bindEvents();

    window.addEventListener('resize', () => this.onResize());
    this.animate();
  }

  createLights() {
    const ambient = new THREE.AmbientLight(0x221133, 1.0);
    this.scene.add(ambient);

    this.lights = [];
    for (let i = 0; i < SECTION_IDS.length; i++) {
      const p = this.sectionPos(i);
      const c1 = new THREE.PointLight(SECTION_COLORS[i], 50, 1000);
      c1.position.set(p.x + 80, p.y + 40, p.z);
      this.scene.add(c1);
      this.lights.push(c1);

      const c2 = new THREE.PointLight(SECTION_COLORS[(i + 2) % SECTION_COLORS.length], 40, 1000);
      c2.position.set(p.x - 80, p.y - 20, p.z);
      this.scene.add(c2);
      this.lights.push(c2);
    }
  }

  createCurvedFloor() {
    const floorY = -400;
    const halfWidth = 700;
    const centerline = this.computeCenterline(80);
    const pts = [];

    // Cross lines (perpendicular to path)
    for (let i = 0; i < centerline.length; i++) {
      const c = centerline[i];
      const prev = centerline[Math.max(0, i - 1)];
      const next = centerline[Math.min(centerline.length - 1, i + 1)];
      const tangent = next.clone().sub(prev).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const left = c.clone(); left.y = floorY; left.add(normal.clone().multiplyScalar(halfWidth));
      const right = c.clone(); right.y = floorY; right.add(normal.clone().multiplyScalar(-halfWidth));
      pts.push(left, right);
    }

    // Longitudinal lines (along the path)
    for (let i = 0; i < centerline.length - 1; i++) {
      const c = centerline[i].clone(); c.y = floorY;
      const n = centerline[i + 1].clone(); n.y = floorY;
      const tangent = n.clone().sub(c).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      [-halfWidth, -halfWidth / 2, 0, halfWidth / 2, halfWidth].forEach(off => {
        const a = c.clone().add(normal.clone().multiplyScalar(off));
        const b = n.clone().add(normal.clone().multiplyScalar(off));
        pts.push(a, b);
      });
    }

    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: COLORS.pink,
      transparent: true,
      opacity: 0.13,
      depthWrite: false
    });
    this.scene.add(new THREE.LineSegments(geom, mat));
  }

  createCurvedCeiling() {
    const ceilY = 420;
    const halfWidth = 700;
    const centerline = this.computeCenterline(60);
    const pts = [];

    for (let i = 0; i < centerline.length; i++) {
      const c = centerline[i];
      const prev = centerline[Math.max(0, i - 1)];
      const next = centerline[Math.min(centerline.length - 1, i + 1)];
      const tangent = next.clone().sub(prev).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const left = c.clone(); left.y = ceilY; left.add(normal.clone().multiplyScalar(halfWidth));
      const right = c.clone(); right.y = ceilY; right.add(normal.clone().multiplyScalar(-halfWidth));
      pts.push(left, right);
    }

    for (let i = 0; i < centerline.length - 1; i++) {
      const c = centerline[i].clone(); c.y = ceilY;
      const n = centerline[i + 1].clone(); n.y = ceilY;
      const tangent = n.clone().sub(c).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      [-halfWidth, 0, halfWidth].forEach(off => {
        const a = c.clone().add(normal.clone().multiplyScalar(off));
        const b = n.clone().add(normal.clone().multiplyScalar(off));
        pts.push(a, b);
      });
    }

    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: COLORS.cyan,
      transparent: true,
      opacity: 0.08,
      depthWrite: false
    });
    this.scene.add(new THREE.LineSegments(geom, mat));
  }

  createSidePillars() {
    const pillarMat = new THREE.LineBasicMaterial({
      color: COLORS.purple,
      transparent: true,
      opacity: 0.16,
      depthWrite: false
    });
    const centerline = this.computeCenterline(SECTION_IDS.length * 4);
    const pts = [];

    for (let i = 0; i < centerline.length; i++) {
      const c = centerline[i];
      const prev = centerline[Math.max(0, i - 1)];
      const next = centerline[Math.min(centerline.length - 1, i + 1)];
      const tangent = next.clone().sub(prev).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      [-1, 1].forEach(side => {
        const offset = normal.clone().multiplyScalar(side * 760);
        const base = c.clone().add(offset);
        base.y = -400;
        const top = base.clone();
        top.y = 420;
        pts.push(base, top);
      });
    }

    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    this.scene.add(new THREE.LineSegments(geom, pillarMat));
  }

  createSectionPanels() {
    const selectors = SECTION_IDS.map(id => '#' + id);
    selectors.forEach((sel, i) => {
      const el = document.querySelector(sel);
      if (!el) return;

      const ew = el.offsetWidth || 1000;
      const eh = el.offsetHeight || 600;
      const targetW = 1250;
      const targetH = 820;
      const sc = Math.min(targetW / ew, targetH / eh, 1.15);
      const scaledW = ew * sc;
      const scaledH = eh * sc;

      const cssObj = new CSS3DObject(el);
      const pos = this.sectionPos(i);
      cssObj.position.copy(pos);
      cssObj.rotation.set(0, 0, 0);
      cssObj.scale.set(sc, sc, sc);

      this.scene.add(cssObj);
      this.sectionObjects.push(cssObj);
      this.sectionMeta.push({
        id: SECTION_IDS[i],
        index: i,
        position: pos.clone(),
        element: el,
        scale: sc,
        width: scaledW,
        height: scaledH
      });

      this.createPanelBorder(pos.x, pos.y, pos.z, scaledW, scaledH, i);

      if (i > 0) {
        this.createConnectorBeam(
          this.sectionMeta[i - 1].position,
          this.sectionMeta[i].position
        );
      }
    });
  }

  createPanelBorder(x, y, z, w, h, index) {
    const color = SECTION_COLORS[index % SECTION_COLORS.length];
    const panelW = w + 50;
    const panelH = h + 50;
    const panelD = 14;

    const boxGeom = new THREE.BoxGeometry(panelW, panelH, panelD);
    const edgesGeom = new THREE.EdgesGeometry(boxGeom);
    const edgeMat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.55,
      depthWrite: false
    });
    const edges = new THREE.LineSegments(edgesGeom, edgeMat);
    edges.position.set(x, y, z);
    this.scene.add(edges);
    this.decorations.push(edges);

    const glowGeom = new THREE.PlaneGeometry(panelW + 80, panelH + 80);
    const glowMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.07,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const glow = new THREE.Mesh(glowGeom, glowMat);
    glow.position.set(x, y, z - 24);
    this.scene.add(glow);
    this.decorations.push(glow);

    // Corner brackets on the front face
    const cornerLen = 46;
    const cornerOffset = 10;
    const cornerMat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
      depthWrite: false
    });
    const corners = [
      [-panelW / 2 - cornerOffset, panelH / 2 + cornerOffset],
      [panelW / 2 + cornerOffset, panelH / 2 + cornerOffset],
      [-panelW / 2 - cornerOffset, -panelH / 2 - cornerOffset],
      [panelW / 2 + cornerOffset, -panelH / 2 - cornerOffset]
    ];
    const cornerPts = [];
    corners.forEach(([cx, cy]) => {
      const sx = cx < 0 ? 1 : -1;
      const sy = cy > 0 ? -1 : 1;
      cornerPts.push(
        new THREE.Vector3(x + cx, y + cy, z + 8),
        new THREE.Vector3(x + cx + sx * cornerLen, y + cy, z + 8)
      );
      cornerPts.push(
        new THREE.Vector3(x + cx, y + cy, z + 8),
        new THREE.Vector3(x + cx, y + cy + sy * cornerLen, z + 8)
      );
    });
    const cornerGeom = new THREE.BufferGeometry().setFromPoints(cornerPts);
    this.scene.add(new THREE.LineSegments(cornerGeom, cornerMat));
  }

  createConnectorBeam(from, to) {
    const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
    mid.x += (Math.random() - 0.5) * 80;
    mid.y += (Math.random() - 0.5) * 60;
    const curve = new THREE.QuadraticBezierCurve3(from.clone(), mid, to.clone());
    const pts = curve.getPoints(80);
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: COLORS.cyan,
      transparent: true,
      opacity: 0.22,
      depthWrite: false
    });
    this.scene.add(new THREE.Line(geom, mat));
  }

  createTunnelRings() {
    const centerline = this.computeCenterline(SECTION_IDS.length * 5);
    const colorArr = [COLORS.pink, COLORS.cyan, COLORS.purple];
    for (let i = 0; i < centerline.length; i++) {
      const c = centerline[i];
      const prev = centerline[Math.max(0, i - 1)];
      const next = centerline[Math.min(centerline.length - 1, i + 1)];
      const tangent = next.clone().sub(prev).normalize();

      const radius = 420 + Math.sin(i * 0.5) * 30;
      const geom = new THREE.TorusGeometry(radius, 1.4, 8, 56);
      const mat = new THREE.MeshBasicMaterial({
        color: colorArr[i % colorArr.length],
        transparent: true,
        opacity: 0.20,
        depthWrite: false
      });
      const ring = new THREE.Mesh(geom, mat);
      ring.position.copy(c);
      // Orient ring so its hole faces along the path tangent
      ring.lookAt(c.clone().add(tangent));

      ring.userData = {
        pulseSpeed: 0.4 + Math.random() * 0.5,
        pulseOffset: Math.random() * Math.PI * 2,
        baseOpacity: 0.20,
        isRing: true
      };
      this.scene.add(ring);
      this.decorations.push(ring);
    }
  }

  createDecorations() {
    const shapes = [
      () => new THREE.IcosahedronGeometry(9, 1),
      () => new THREE.TorusGeometry(7, 1.2, 8, 18),
      () => new THREE.OctahedronGeometry(8),
      () => new THREE.TorusKnotGeometry(6, 1.2, 70, 10),
      () => new THREE.DodecahedronGeometry(8, 0),
      () => new THREE.TetrahedronGeometry(9, 0)
    ];
    const colorArr = [COLORS.pink, COLORS.cyan, COLORS.purple, COLORS.yellow, COLORS.green];
    const centerline = this.computeCenterline(40);

    for (let i = 0; i < 28; i++) {
      const gen = shapes[i % shapes.length];
      const geom = gen();
      const color = colorArr[i % colorArr.length];

      const edgeGeom = new THREE.EdgesGeometry(geom);
      const mat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.30 + Math.random() * 0.30,
        depthWrite: false
      });

      const wire = new THREE.LineSegments(edgeGeom, mat);
      const centerIdx = Math.floor(Math.random() * centerline.length);
      const center = centerline[centerIdx];
      const side = (i % 2 === 0) ? 1 : -1;
      const x = center.x + side * (280 + Math.random() * 380);
      const y = center.y + (Math.random() - 0.5) * 560;
      const z = center.z;
      wire.position.set(x, y, z);
      wire.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );
      wire.userData = {
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.3
        ),
        bobAmp: 5 + Math.random() * 12,
        bobSpeed: 0.2 + Math.random() * 0.4,
        bobOffset: Math.random() * Math.PI * 2,
        baseY: y
      };

      this.scene.add(wire);
      this.decorations.push(wire);
    }
  }

  createParticles() {
    const count = 1400;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const colorOpts = [
      new THREE.Color(COLORS.pink),
      new THREE.Color(COLORS.cyan),
      new THREE.Color(COLORS.purple)
    ];
    const centerline = this.computeCenterline(50);

    for (let i = 0; i < count; i++) {
      const centerIdx = Math.floor(Math.random() * centerline.length);
      const center = centerline[centerIdx];
      positions[i * 3] = center.x + (Math.random() - 0.5) * 900;
      positions[i * 3 + 1] = center.y + (Math.random() - 0.5) * 700;
      positions[i * 3 + 2] = center.z + (Math.random() - 0.5) * 400;

      const c = colorOpts[Math.floor(Math.random() * colorOpts.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 1.6,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(geom, mat);
    this.scene.add(this.particles);
  }

  createSpeedLines() {
    // Streaking lines that whoosh past the camera during transitions for a
    // sense of speed. They sit just in front of the camera and reset forward.
    const count = 90;
    const positions = new Float32Array(count * 6); // line segments (2 pts each)
    const colors = new Float32Array(count * 6);
    const colorOpts = [
      new THREE.Color(COLORS.cyan),
      new THREE.Color(COLORS.pink),
      new THREE.Color(COLORS.purple)
    ];
    for (let i = 0; i < count; i++) {
      const c = colorOpts[i % colorOpts.length];
      const x = (Math.random() - 0.5) * 1400;
      const y = (Math.random() - 0.5) * 1000;
      const z = -Math.random() * 1600 - 100;
      positions[i * 6] = x; positions[i * 6 + 1] = y; positions[i * 6 + 2] = z;
      positions[i * 6 + 3] = x; positions[i * 6 + 4] = y; positions[i * 6 + 5] = z - 40;
      colors[i * 6] = c.r; colors[i * 6 + 1] = c.g; colors[i * 6 + 2] = c.b;
      colors[i * 6 + 3] = c.r; colors[i * 6 + 4] = c.g; colors[i * 6 + 5] = c.b;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.speedLines = new THREE.LineSegments(geom, mat);
    this.speedLines.frustumCulled = false;
    this.scene.add(this.speedLines);
  }

  bindEvents() {
    window.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));

    let lastTouchY = 0;
    window.addEventListener('touchstart', (e) => {
      if (e.target.closest('.bg-panel, .bg-panel-toggle, #navbar')) return;
      lastTouchY = e.touches[0].clientY;
    });
    window.addEventListener('touchmove', (e) => {
      if (e.target.closest('.bg-panel, .bg-panel-toggle, #navbar')) return;
      e.preventDefault();
      const dy = lastTouchY - e.touches[0].clientY;
      lastTouchY = e.touches[0].clientY;
      // User takes over from any nav transition
      this.transitionActive = false;
      this.isNavTransition = false;
      this.targetScrollPos = THREE.MathUtils.clamp(
        this.targetScrollPos + dy * 0.004, 0, this.maxIdx
      );
    }, { passive: false });
  }

  onWheel(e) {
    if (e.target.closest('.bg-panel, .bg-panel-toggle, #navbar')) return;
    e.preventDefault();
    // User takes over from any nav transition
    this.transitionActive = false;
    this.isNavTransition = false;
    this.targetScrollPos = THREE.MathUtils.clamp(
      this.targetScrollPos + e.deltaY * 0.0022, 0, this.maxIdx
    );
  }

  onMouseMove(e) {
    this.targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }

  // Per-section camera distance: home is closer so the name reads clearly.
  viewDistFor(idx) {
    return idx === 0 ? HOME_VIEW_DISTANCE : VIEW_DISTANCE;
  }

  // Compute camera position from a continuous scroll value by interpolating
  // between the two nearest section positions.
  applyScrollPos() {
    const i = this.scrollPos;
    const i0 = Math.max(0, Math.min(Math.floor(i), this.maxIdx));
    const i1 = Math.min(i0 + 1, this.maxIdx);
    const frac = i - i0;
    const p0 = this.sectionMeta[i0].position;
    const p1 = this.sectionMeta[i1].position;
    const pos = p0.clone().lerp(p1, frac);
    const vd = this.viewDistFor(i0) * (1 - frac) + this.viewDistFor(i1) * frac;
    this.currentCamPos.set(pos.x, pos.y, pos.z + vd);
    this.currentLookAt.copy(pos);

    // Update current section + nav highlight when crossing the midpoint
    const nearest = Math.round(this.scrollPos);
    if (nearest !== this.currentIndex) {
      this.currentIndex = nearest;
      this.updateNavActive(SECTION_IDS[nearest]);
      this.idleSeed = Math.random() * 100;
    }
  }

  // Straight-line dolly from current position to the target section. Eases
  // in and out smoothly. Camera looks at the destination the entire time.
  navigateToIndex(idx) {
    if (idx === this.currentIndex && !this.transitionActive) return;
    this.currentIndex = idx;
    const meta = this.sectionMeta[idx];
    const targetPos = meta.position.clone();
    const camTarget = targetPos.clone();
    camTarget.z += this.viewDistFor(idx);

    // From = where the camera actually is right now (seamless takeover)
    this.transFromPos.copy(this.currentCamPos);
    this.transToPos.copy(camTarget);
    this.transFromLook.copy(this.currentLookAt);
    this.transToLook.copy(targetPos);
    this.transFromScroll = this.scrollPos;

    this.transitionProgress = 0;
    const dist = this.transFromPos.distanceTo(camTarget);
    this.transitionDuration = 0.9 + Math.min(dist / 4000, 1.0) * 0.9;
    this.transitionActive = true;
    this.isNavTransition = true;

    // Keep scroll targets in sync so wheel takeover after the transition is seamless
    this.targetScrollPos = idx;

    this.updateNavActive(meta.id);

    if (typeof window !== 'undefined' && window.gsap && meta.element) {
      window.gsap.fromTo(meta.element, { opacity: 0.55 }, {
        opacity: 1, duration: 0.8, ease: 'power2.out'
      });
    }
  }

  navigateTo(id) {
    const idx = this.sectionMeta.findIndex(m => m.id === id);
    if (idx === -1) return;
    this.navigateToIndex(idx);
  }

  updateNavActive(id) {
    const navAnchors = document.querySelectorAll('#nav-links .nav-link');
    navAnchors.forEach(a => a.classList.remove('active'));
    const target = document.querySelector(`#nav-links a[href="#${id}"]`);
    if (target) target.classList.add('active');
  }

  updateSpeedLines(dt, speedFactor) {
    if (!this.speedLines) return;
    const mat = this.speedLines.material;
    mat.opacity += (speedFactor * 0.85 - mat.opacity) * (1 - Math.exp(-dt * 8));

    // Anchor the speed-line cloud just in front of the camera so they always
    // streak past regardless of where the camera moved to.
    this.speedLines.position.copy(this.camera.position);
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    this.speedLines.position.add(camDir.multiplyScalar(800));
    // Inherit camera orientation so lines point along view direction
    this.speedLines.quaternion.copy(this.camera.quaternion);

    // Push each line segment forward (in +Z local = toward camera) and reset
    // when it passes behind, creating an endless stream.
    const pos = this.speedLines.geometry.attributes.position;
    const arr = pos.array;
    const streamSpeed = 2600 * speedFactor + 200;
    for (let i = 0; i < arr.length / 6; i++) {
      const z0 = arr[i * 6 + 2];
      const z1 = arr[i * 6 + 5];
      const dz = streamSpeed * dt;
      arr[i * 6 + 2] = z0 + dz;
      arr[i * 6 + 5] = z1 + dz;
      if (arr[i * 6 + 2] > 900) {
        const nx = (Math.random() - 0.5) * 1400;
        const ny = (Math.random() - 0.5) * 1000;
        const nz = -Math.random() * 1600 - 100;
        arr[i * 6] = nx; arr[i * 6 + 1] = ny; arr[i * 6 + 2] = nz;
        arr[i * 6 + 3] = nx; arr[i * 6 + 4] = ny; arr[i * 6 + 5] = nz - 50;
      }
    }
    pos.needsUpdate = true;
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.cssRenderer.setSize(w, h);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const dt = Math.min(this.clock.getDelta(), 0.1);
    this.t += dt;
    this.mouseNDC.lerp(this.targetMouse, 1 - Math.exp(-dt * 4));

    let speedFactor = 0; // 0 at rest, peaks at 1 mid-transition

    if (this.transitionActive) {
      this.transitionProgress += dt / this.transitionDuration;
      const t = Math.min(this.transitionProgress, 1);
      const eased = easeInOutCubic(t);

      // Straight-line dolly: simple lerp from -> to, no arcing
      this.currentCamPos.copy(this.transFromPos).lerp(this.transToPos, eased);

      // Look at the destination the whole time. A small from-look blend at the
      // start stops the gaze snapping; it eases out by ~30% in.
      const lookBlend = easeInOutCubic(Math.min(t * 1.4, 1));
      this.currentLookAt.copy(this.transFromLook).lerp(this.transToLook, lookBlend);

      // Keep scrollPos in sync so wheel takeover is seamless
      this.scrollPos = this.transFromScroll + (this.currentIndex - this.transFromScroll) * eased;

      // Speed factor peaks mid-travel — drives FOV punch, speed lines
      speedFactor = Math.sin(t * Math.PI);
      if (!this.isNavTransition) {
        this.targetFov = this.baseFov + 14 * speedFactor;
      } else {
        this.targetFov = this.baseFov;
        speedFactor = 0;
      }

      if (this.transitionProgress >= 1) {
        this.transitionActive = false;
        this.scrollPos = this.currentIndex;
        this.targetScrollPos = this.currentIndex;
        this.targetFov = this.baseFov;
        this.idleSeed = Math.random() * 100;
      }
    } else {
      // Continuous scroll: ease scrollPos toward target, derive camera position
      const diff = this.targetScrollPos - this.scrollPos;
      this.scrollPos += diff * (1 - Math.exp(-dt * 9));
      this.applyScrollPos();
      speedFactor = Math.min(Math.abs(diff) * 1.6, 1);
      this.targetFov = this.baseFov + 12 * speedFactor;
    }

    // Smoothly approach target FOV
    this.camera.fov += (this.targetFov - this.camera.fov) * (1 - Math.exp(-dt * 6));
    this.camera.updateProjectionMatrix();

    // Idle drift: slow breathing when settled, gentle sway while traveling
    const driftIntensity = this.transitionActive ? 0.25 : 1.0;
    const driftX = Math.sin(this.t * 0.35 + this.idleSeed) * 6 * driftIntensity;
    const driftY = Math.cos(this.t * 0.28 + this.idleSeed * 1.3) * 4 * driftIntensity;

    // Parallax offset from mouse
    const parallaxX = this.mouseNDC.x * 14;
    const parallaxY = this.mouseNDC.y * 9;

    this.camera.position.copy(this.currentCamPos);
    this.camera.position.x += parallaxX + driftX;
    this.camera.position.y += parallaxY + driftY;

    const lookTarget = this.currentLookAt.clone();
    lookTarget.x += parallaxX * 0.3 + driftX * 0.5;
    lookTarget.y += parallaxY * 0.2 + driftY * 0.5;

    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(lookTarget);

    // Speed lines stream past during travel; fade with speed
    this.updateSpeedLines(dt, speedFactor);

    // Animate decorations
    this.decorations.forEach(obj => {
      if (obj.userData.isRing) {
        // Steady opacity — no pulsing
        obj.material.opacity = obj.userData.baseOpacity;
        return;
      }
      if (obj.userData.rotSpeed) {
        obj.rotation.x += obj.userData.rotSpeed.x * dt;
        obj.rotation.y += obj.userData.rotSpeed.y * dt;
        obj.rotation.z += obj.userData.rotSpeed.z * dt;
        if (obj.userData.bobAmp !== undefined) {
          const bob = Math.sin(this.t * obj.userData.bobSpeed + obj.userData.bobOffset) * obj.userData.bobAmp;
          obj.position.y = obj.userData.baseY + bob;
        }
      }
    });

    if (this.particles) {
      this.particles.rotation.z += dt * 0.012;
    }

    this.lights.forEach((light, i) => {
      light.intensity = 45 + (i % 2) * 18;
    });

    this.renderer.render(this.scene, this.camera);
    this.cssRenderer.render(this.scene, this.camera);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const scene3D = new Scene3D();
  document.body.classList.add('scene-ready');

  const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const id = link.getAttribute('href').replace('#', '');
      scene3D.navigateTo(id);
    });
  });

  const logoLink = document.querySelector('.nav-logo[href="#home"]');
  if (logoLink) {
    logoLink.addEventListener('click', (e) => {
      e.preventDefault();
      scene3D.navigateTo('home');
    });
  }

  const heroLinks = document.querySelectorAll('.hero-link[href^="#"]');
  heroLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const id = link.getAttribute('href').replace('#', '');
      scene3D.navigateTo(id);
    });
  });

  window.__scene3D = scene3D;
});
