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

class Scene3D {
  constructor() {
    this.sectionObjects = [];
    this.decorations = [];
    this.sectionMeta = [];
    this.currentIndex = 0;
    this.targetCamPos = new THREE.Vector3(0, 0, 600);
    this.targetLookAt = new THREE.Vector3(0, 0, 0);
    this.currentCamPos = new THREE.Vector3(0, 0, 600);
    this.currentLookAt = new THREE.Vector3(0, 0, 0);
    this.mouseNDC = new THREE.Vector2(0, 0);
    this.targetMouse = new THREE.Vector2(0, 0);
    this.t = 0;
    this.clock = new THREE.Clock();
    this.animTarget = null;
    this.scrollLock = false;

    this.init();
  }

  init() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60, window.innerWidth / window.innerHeight, 0.1, 5000
    );
    this.camera.position.set(0, 0, 600);
    this.camera.lookAt(0, 0, 0);

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

    this.lights = this.createLights();
    this.createFloorGrid();
    this.createSectionPanels();
    this.createDecorations();
    this.createParticles();
    this.bindEvents();

    window.addEventListener('resize', () => this.onResize());
    this.animate();
  }

  createLights() {
    const ambient = new THREE.AmbientLight(0x331122, 0.8);
    this.scene.add(ambient);

    const point1 = new THREE.PointLight(COLORS.pink, 80, 200);
    point1.position.set(30, 30, 60);
    this.scene.add(point1);

    const point2 = new THREE.PointLight(COLORS.cyan, 60, 180);
    point2.position.set(-30, 10, 40);
    this.scene.add(point2);

    const point3 = new THREE.PointLight(COLORS.purple, 40, 160);
    point3.position.set(0, -20, 80);
    this.scene.add(point3);

    return [point1, point2, point3];
  }

  createFloorGrid() {
    const gridY = -window.innerHeight * 1.05 * 6;
    const size = 800;
    const step = 12;
    const pts = [];
    for (let i = -size; i <= size; i += step) {
      pts.push(new THREE.Vector3(i, gridY, -size));
      pts.push(new THREE.Vector3(i, gridY, size));
      pts.push(new THREE.Vector3(-size, gridY, i));
      pts.push(new THREE.Vector3(size, gridY, i));
    }
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: COLORS.pink,
      transparent: true,
      opacity: 0.06,
      depthWrite: false
    });
    this.scene.add(new THREE.LineSegments(geom, mat));
  }

  createSectionPanels() {
    const selectors = [
      '#home',
      '#about',
      '#experience',
      '#projects',
      '#certificates',
      '#contact'
    ];

    const sectionHeight = window.innerHeight * 1.05;
    const depthOffset = -40;

    selectors.forEach((sel, i) => {
      const el = document.querySelector(sel);
      if (!el) return;

      const cssObj = new CSS3DObject(el);
      const yPos = -i * sectionHeight;
      const zPos = -i * depthOffset;

      cssObj.position.set(0, yPos, zPos);
      cssObj.rotation.set(0, 0, 0);
      cssObj.scale.set(1, 1, 1);

      this.scene.add(cssObj);
      this.sectionObjects.push(cssObj);
      this.sectionMeta.push({
        id: sel.replace('#', ''),
        index: i,
        position: new THREE.Vector3(0, yPos, zPos),
        element: el
      });

      this.createPanelBorder(0, yPos, zPos, 1.05, i);

      if (i > 0) {
        this.createConnectorBeam(
          this.sectionMeta[i - 1].position,
          this.sectionMeta[i].position
        );
      }
    });

    this.animTarget = this.sectionMeta[0].position.clone();
  }

  createPanelBorder(x, y, z, scale, index) {
    const ww = window.innerWidth;
    const wh = window.innerHeight;
    const panelW = ww * 0.7 * scale;
    const panelH = wh * 1.1 * scale;
    const panelD = 10 * scale;

    const colors = [COLORS.pink, COLORS.cyan, COLORS.purple, COLORS.green, COLORS.yellow, COLORS.pink];
    const color = colors[index % colors.length];

    const geom = new THREE.BoxGeometry(panelW, panelH, panelD);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.04,
      depthWrite: false
    });
    const box = new THREE.Mesh(geom, mat);
    box.position.set(x, y, z);
    this.scene.add(box);
    this.decorations.push(box);

    const edgeGeom = new THREE.EdgesGeometry(geom);
    const edgeMat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.35,
      depthWrite: false
    });
    const edges = new THREE.LineSegments(edgeGeom, edgeMat);
    edges.position.copy(box.position);
    this.scene.add(edges);
    this.decorations.push(edges);

    const glowGeom = new THREE.BoxGeometry(
      panelW + 12, panelH + 12, panelD - 4
    );
    const glowMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.06,
      depthWrite: false
    });
    const glow = new THREE.Mesh(glowGeom, glowMat);
    glow.position.copy(box.position);
    this.scene.add(glow);
    this.decorations.push(glow);
  }

  createConnectorBeam(from, to) {
    const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
    mid.x += (Math.random() - 0.5) * 30;
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    const midPt = new THREE.Vector3().copy(mid);

    const curve = new THREE.QuadraticBezierCurve3(
      from.clone(), midPt, to.clone()
    );

    const pts = curve.getPoints(40);
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: COLORS.cyan,
      transparent: true,
      opacity: 0.08,
      depthWrite: false
    });
    this.scene.add(new THREE.Line(geom, mat));
  }

  createDecorations() {
    const shapes = [
      () => new THREE.IcosahedronGeometry(3.5, 1),
      () => new THREE.TorusGeometry(3, 0.5, 8, 12),
      () => new THREE.OctahedronGeometry(3),
      () => new THREE.TorusKnotGeometry(2.5, 0.5, 40, 8),
      () => new THREE.DodecahedronGeometry(3, 0),
      () => new THREE.TetrahedronGeometry(3.5, 0),
    ];

    const colorArr = [COLORS.pink, COLORS.cyan, COLORS.purple, COLORS.yellow, COLORS.green];
    const sectionH = window.innerHeight * 1.05;
    const positions = [];
    for (let i = 0; i < 12; i++) {
      positions.push([
        (Math.random() - 0.5) * 160,
        -(i * sectionH * 0.5) + (Math.random() - 0.5) * sectionH * 0.3,
        -Math.random() * 80 - 10
      ]);
    }

    for (let i = 0; i < 12; i++) {
      const gen = shapes[i % shapes.length];
      const geom = gen();
      const color = colorArr[Math.floor(Math.random() * colorArr.length)];

      const edgeGeom = new THREE.EdgesGeometry(geom);
      const mat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.2 + Math.random() * 0.25,
        depthWrite: false
      });

      const wire = new THREE.LineSegments(edgeGeom, mat);
      const pos = positions[i];
      wire.position.set(pos[0], pos[1], pos[2]);
      wire.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );
      wire.userData = {
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.2
        ),
        bobAmp: 1 + Math.random() * 2,
        bobSpeed: 0.3 + Math.random() * 0.5,
        bobOffset: Math.random() * Math.PI * 2,
        baseY: pos[1]
      };

      this.scene.add(wire);
      this.decorations.push(wire);
    }

    for (let i = 0; i < 20; i++) {
      const ringGeom = new THREE.TorusGeometry(1.5 + Math.random() * 3, 0.08, 6, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: [COLORS.pink, COLORS.cyan, COLORS.yellow][Math.floor(Math.random() * 3)],
        transparent: true,
        opacity: 0.15 + Math.random() * 0.3,
        depthWrite: false
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.position.set(
        (Math.random() - 0.5) * 200,
        -Math.random() * sectionH * 6 - 30,
        -Math.random() * 100 - 10
      );
      ring.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      ring.userData = {
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.3
        ),
        bobAmp: 0.5 + Math.random() * 1.5,
        bobSpeed: 0.2 + Math.random() * 0.3,
        bobOffset: Math.random() * Math.PI * 2,
        baseY: ring.position.y
      };
      this.scene.add(ring);
      this.decorations.push(ring);
    }
  }

  createParticles() {
    const sectionH = window.innerHeight * 1.05;
    const count = 600;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const colorOpts = [
      new THREE.Color(COLORS.pink),
      new THREE.Color(COLORS.cyan),
      new THREE.Color(COLORS.purple)
    ];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 350;
      positions[i * 3 + 1] = (Math.random() - 0.5) * sectionH * 7;
      positions[i * 3 + 2] = -Math.random() * 200 - 5;

      const c = colorOpts[Math.floor(Math.random() * colorOpts.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.6,
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(geom, mat);
    this.scene.add(this.particles);
  }

  bindEvents() {
    window.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));

    let touchStartY = 0;
    window.addEventListener('touchstart', (e) => {
      if (e.target.closest('.bg-panel, .bg-panel-toggle, #navbar')) return;
      touchStartY = e.touches[0].clientY;
    });
    window.addEventListener('touchmove', (e) => {
      if (e.target.closest('.bg-panel, .bg-panel-toggle, #navbar')) return;
      const dy = touchStartY - e.touches[0].clientY;
      if (Math.abs(dy) > 20 && !this.scrollLock) {
        this.scrollLock = true;
        const dir = dy > 0 ? 1 : -1;
        this.navigateBy(dir);
        setTimeout(() => { this.scrollLock = false; }, 900);
      }
    }, { passive: false });
  }

  onWheel(e) {
    if (e.target.closest('.bg-panel, .bg-panel-toggle, #navbar')) return;
    e.preventDefault();
    if (this.scrollLock) return;
    this.scrollLock = true;

    const dir = e.deltaY > 0 ? 1 : -1;
    this.navigateBy(dir);

    setTimeout(() => { this.scrollLock = false; }, 900);
  }

  onMouseMove(e) {
    this.targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }

  navigateBy(dir) {
    const next = this.currentIndex + dir;
    if (next < 0 || next >= this.sectionMeta.length) return;

    this.currentIndex = next;
    const meta = this.sectionMeta[next];
    this.animTarget = meta.position.clone();

    this.updateNavActive(meta.id);

    if (typeof window !== 'undefined' && window.gsap) {
      const targetEl = meta.element;
      if (targetEl) {
        window.gsap.fromTo(targetEl, { opacity: 0.4 }, {
          opacity: 1, duration: 0.6, ease: 'power2.out'
        });
      }
    }
  }

  navigateTo(id) {
    const idx = this.sectionMeta.findIndex(m => m.id === id);
    if (idx === -1) return;
    this.currentIndex = idx;
    this.animTarget = this.sectionMeta[idx].position.clone();
    this.updateNavActive(id);
  }

  updateNavActive(id) {
    const navAnchors = document.querySelectorAll('#nav-links .nav-link');
    navAnchors.forEach(a => a.classList.remove('active'));
    const target = document.querySelector(`#nav-links a[href="#${id}"]`);
    if (target) target.classList.add('active');
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

    if (this.animTarget) {
      this.targetCamPos.copy(this.animTarget).add(
        new THREE.Vector3(0, 0, 600)
      );
      this.targetLookAt.copy(this.animTarget);
    }

    this.currentCamPos.lerp(this.targetCamPos, 1 - Math.exp(-dt * 2.5));
    this.currentLookAt.lerp(this.targetLookAt, 1 - Math.exp(-dt * 2.5));

    const parallaxX = this.mouseNDC.x * 8;
    const parallaxY = this.mouseNDC.y * 5;

    this.camera.position.copy(this.currentCamPos);
    this.camera.position.x += parallaxX;
    this.camera.position.y += parallaxY;

    const lookTarget = this.currentLookAt.clone();
    lookTarget.x += parallaxX * 0.5;
    lookTarget.y += parallaxY * 0.3;
    this.camera.lookAt(lookTarget);

    this.decorations.forEach(obj => {
      if (obj.userData.rotSpeed) {
        obj.rotation.x += obj.userData.rotSpeed.x * dt;
        obj.rotation.y += obj.userData.rotSpeed.y * dt;
        obj.rotation.z += obj.userData.rotSpeed.z * dt;

        if (obj.userData.bobAmp !== undefined) {
          const bob = Math.sin(this.t * obj.userData.bobSpeed + obj.userData.bobOffset)
            * obj.userData.bobAmp;
          obj.position.y = obj.userData.baseY + bob;
        }
      }
    });

    if (this.particles) {
      this.particles.rotation.y += dt * 0.02;
      this.particles.rotation.x += dt * 0.01;
    }

    this.lights.forEach((light, i) => {
      const amp = 5 + i * 3;
      light.intensity += Math.sin(this.t * 0.8 + i * 2) * dt * amp;
      light.intensity = THREE.MathUtils.clamp(
        light.intensity,
        30 + i * 20,
        100 + i * 20
      );
    });

    this.renderer.render(this.scene, this.camera);
    this.cssRenderer.render(this.scene, this.camera);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const scene3D = new Scene3D();

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
