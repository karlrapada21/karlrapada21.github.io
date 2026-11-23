/* ============================================================
   Villager (3D) — the player character and the island cat.

   One fixed look (no customiser), chibi proportions: big head,
   stubby limbs, a scarf and a little satchel. The whole rig is
   driven by joints so it can walk, idle-breathe, and turn.
   ============================================================ */

import { THREE, GeoBuilder, standardMat } from './geo.js';
import { TAU } from './core.js';

/* ---------------- the look ---------------- */

export const LOOK = {
  skin: '#f2c9a4',
  skinShade: '#e0b189',
  hair: '#4a3730',
  hairLight: '#68504a',
  shirt: '#7cc0a8',
  shirtDark: '#5fa88f',
  pants: '#5b6f96',
  pantsDark: '#47597c',
  shoe: '#6d5142',
  scarf: '#f0a06a',
  satchel: '#a8794f',
  hat: '#e8cf94',
  hatBand: '#c9756b',
};

/* ---------------- helpers ---------------- */

function part(builder, color, opts = {}) {
  const mat = standardMat({ vertexColors: true, ...opts });
  const mesh = new THREE.Mesh(builder.toGeometry(), mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function ellipsoid(rx, ry, rz, color, x = 0, y = 0, z = 0) {
  const b = new GeoBuilder(1);
  b.sphere(1, color, x, y, z, { ws: 16, hs: 12, variance: 0.02 });
  return { b, scale: [rx, ry, rz] };
}

/* ---------------- the character ---------------- */

export function buildVillager() {
  const root = new THREE.Group();
  root.name = 'villager';

  /* hip → everything above it, so the walk bounce can move the torso */
  const body = new THREE.Group();
  body.position.y = 0;
  root.add(body);

  /* ---- legs ---- */
  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(s * 0.19, 0.86, 0);
    body.add(hip);

    const b = new GeoBuilder(11 + s);
    b.cyl(0.15, 0.16, 0.62, 9, LOOK.pants, 0, -0.31, 0, { flat: false, variance: 0.02 });
    b.cyl(0.16, 0.15, 0.12, 9, LOOK.pantsDark, 0, -0.62, 0, { variance: 0.02 });
    b.box(0.3, 0.16, 0.42, LOOK.shoe, 0, -0.72, 0.07, { variance: 0.03 });
    b.sphere(0.14, LOOK.shoe, 0, -0.72, 0.2, { ws: 10, hs: 8, variance: 0.02 });
    const leg = part(b);
    hip.add(leg);
    legs.push(hip);
  }

  /* ---- torso ---- */
  const torso = new THREE.Group();
  torso.position.y = 0.86;
  body.add(torso);

  const tb = new GeoBuilder(21);
  /* tapered body: a squashed capsule */
  tb.sphere(1, LOOK.shirt, 0, 0.34, 0, { ws: 16, hs: 12, variance: 0.02 });
  const torsoMesh = part(tb);
  torsoMesh.scale.set(0.46, 0.52, 0.36);
  torso.add(torsoMesh);

  /* collar + scarf */
  const sb = new GeoBuilder(22);
  sb.torus(0.3, 0.1, LOOK.scarf, 0, 0.7, 0, { rs: 8, ts: 18, rx: Math.PI / 2, variance: 0.03 });
  sb.box(0.14, 0.42, 0.08, LOOK.scarf, 0.16, 0.52, 0.3, { variance: 0.04, rz: 0.2 });
  torso.add(part(sb));

  /* satchel strap + bag */
  const kb = new GeoBuilder(23);
  kb.box(0.1, 0.7, 0.1, LOOK.satchel, 0.0, 0.42, 0.3, { variance: 0.03, rz: 0.6 });
  kb.box(0.34, 0.3, 0.2, LOOK.satchel, -0.36, 0.16, 0.14, { variance: 0.03 });
  torso.add(part(kb));

  /* ---- arms ---- */
  const arms = [];
  for (const s of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(s * 0.44, 0.62, 0);
    torso.add(shoulder);

    const b = new GeoBuilder(31 + s);
    b.cyl(0.12, 0.13, 0.52, 9, LOOK.shirt, 0, -0.26, 0, { variance: 0.02 });
    b.cyl(0.115, 0.11, 0.1, 9, LOOK.shirtDark, 0, -0.52, 0, { variance: 0.02 });
    b.sphere(0.125, LOOK.skin, 0, -0.6, 0, { ws: 10, hs: 8, variance: 0.02 });
    const arm = part(b);
    shoulder.add(arm);
    arms.push(shoulder);
  }

  /* ---- head ---- */
  const head = new THREE.Group();
  head.position.y = 1.42;
  torso.add(head);

  const headB = new GeoBuilder(41);
  headB.sphere(0.52, LOOK.skin, 0, 0, 0, { ws: 20, hs: 16, variance: 0.015 });
  head.add(part(headB));

  /* hair — cap plus a fringe and side tufts */
  const hairB = new GeoBuilder(42);
  hairB.sphere(0.545, LOOK.hair, 0, 0.03, -0.03, {
    ws: 20,
    hs: 14,
    thetaLength: Math.PI * 0.62,
    thetaStart: 0,
    variance: 0.03,
  });
  hairB.sphere(0.3, LOOK.hair, 0, 0.16, 0.34, { ws: 14, hs: 10, variance: 0.04, sy: 0.8 });
  hairB.sphere(0.44, LOOK.hairLight, -0.06, 0.3, -0.06, { ws: 16, hs: 10, variance: 0.04, sy: 0.6 });
  for (const s of [-1, 1]) {
    hairB.sphere(0.19, LOOK.hair, s * 0.44, -0.06, 0.1, { ws: 10, hs: 8, variance: 0.04 });
  }
  head.add(part(hairB));

  /* face — eyes with a highlight, a tiny nose, and a smile */
  const faceB = new GeoBuilder(43);
  for (const s of [-1, 1]) {
    faceB.sphere(0.085, '#3a2e2a', s * 0.19, 0.02, 0.47, { ws: 12, hs: 10, variance: 0 });
    faceB.sphere(0.032, '#ffffff', s * 0.19 + 0.03, 0.06, 0.52, { ws: 8, hs: 6, variance: 0 });
  }
  faceB.sphere(0.055, LOOK.skinShade, 0, -0.08, 0.52, { ws: 10, hs: 8, variance: 0 });
  for (const s of [-1, 1]) {
    faceB.sphere(0.09, '#f0998c', s * 0.32, -0.1, 0.4, {
      ws: 10,
      hs: 8,
      variance: 0,
      sy: 0.6,
    });
  }
  head.add(part(faceB));

  /* straw hat */
  const hatB = new GeoBuilder(44);
  hatB.cyl(0.86, 0.94, 0.1, 18, LOOK.hat, 0, 0.34, 0, { variance: 0.02, flat: true });
  hatB.cyl(0.44, 0.5, 0.42, 16, '#f2dca8', 0, 0.55, 0, { variance: 0.02, flat: true });
  hatB.cyl(0.46, 0.47, 0.09, 16, LOOK.hatBand, 0, 0.42, 0, { variance: 0.02, flat: true });
  const hat = part(hatB);
  head.add(hat);

  /* ---- feet shadow-blob so he reads against the grass ---- */
  const shadowB = new GeoBuilder(51);
  const shadowMesh = new THREE.Mesh(
    new THREE.CircleGeometry(0.62, 20),
    new THREE.MeshBasicMaterial({ color: 0x3a4c38, transparent: true, opacity: 0.17 })
  );
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.03;
  shadowMesh.scale.set(1, 0.7, 1);
  root.add(shadowMesh);

  return {
    group: root,
    body,
    torso,
    head,
    hat,
    hair: null,
    legs,
    arms,
    shadow: shadowMesh,
  };
}

/**
 * Pose the rig for one frame.
 *  state: { t, moving (0..1), speed (0..1), yaw }
 */
export function poseVillager(rig, state) {
  const { t, moving = 0, speed = 0 } = state;
  const stride = t * 9.5;
  const swing = Math.sin(stride) * 0.72 * moving;
  const bounce = Math.abs(Math.sin(stride)) * 0.075 * moving;
  const breathe = Math.sin(t * 1.8) * 0.012 * (1 - moving);

  rig.legs[0].rotation.x = swing;
  rig.legs[1].rotation.x = -swing;
  rig.arms[0].rotation.x = -swing * 0.85;
  rig.arms[1].rotation.x = swing * 0.85;
  rig.arms[0].rotation.z = 0.08 + (1 - moving) * 0.03;
  rig.arms[1].rotation.z = -0.08 - (1 - moving) * 0.03;

  rig.body.position.y = bounce + breathe;
  rig.torso.rotation.y = Math.sin(stride) * 0.07 * moving;
  rig.torso.rotation.x = 0.06 * speed;

  rig.head.rotation.y = Math.sin(t * 0.7) * 0.16 * (1 - moving) + Math.sin(stride * 0.5) * 0.05 * moving;
  rig.head.rotation.x = Math.sin(t * 1.1) * 0.05 * (1 - moving) - 0.04 * speed;
  rig.head.rotation.z = Math.sin(stride) * 0.03 * moving;

  /* a tiny hop in the step */
  rig.group.position.y += 0;
}

/* ---------------- the island cat ---------------- */

export function buildCat() {
  const g = new THREE.Group();
  g.name = 'cat';

  const bodyB = new GeoBuilder(61);
  bodyB.sphere(0.34, '#f2e7d3', 0, 0.34, 0, { ws: 14, hs: 10, variance: 0.03, sy: 0.82 });
  bodyB.sphere(0.2, '#f7eedd', 0, 0.5, 0.16, { ws: 12, hs: 10, variance: 0.03 });

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.52, 0.22);
  g.add(headPivot);

  const headB = new GeoBuilder(62);
  headB.sphere(0.23, '#f7eedd', 0, 0, 0, { ws: 14, hs: 12, variance: 0.03 });
  for (const s of [-1, 1]) {
    headB.cone(0.1, 0.17, 4, '#f7eedd', s * 0.13, 0.2, 0, { variance: 0.03 });
    headB.cone(0.055, 0.1, 4, '#f3bcc6', s * 0.13, 0.2, 0.03, { variance: 0.03 });
    headB.sphere(0.045, '#3b3230', s * 0.09, 0.02, 0.19, { ws: 8, hs: 6, variance: 0 });
  }
  headB.sphere(0.037, '#e2909c', 0, -0.06, 0.22, { ws: 8, hs: 6, variance: 0 });
  const headMesh = part(headB);
  headPivot.add(headMesh);

  const bodyMesh = part(bodyB);
  g.add(bodyMesh);

  /* tail */
  const tail = new THREE.Group();
  tail.position.set(0, 0.3, -0.24);
  g.add(tail);
  const tailB = new GeoBuilder(63);
  tailB.cyl(0.05, 0.07, 0.55, 7, '#e8dcc8', 0, 0.27, 0, { variance: 0.03 });
  tailB.sphere(0.06, '#d8c8ae', 0, 0.55, 0, { ws: 8, hs: 6, variance: 0.02 });
  tail.add(part(tailB));
  tail.rotation.x = -0.5;

  return {
    group: g,
    head: headPivot,
    tail,
    update(t) {
      headPivot.rotation.y = Math.sin(t * 0.5) * 0.5;
      headPivot.rotation.x = Math.sin(t * 0.8) * 0.12;
      tail.rotation.z = Math.sin(t * 1.4) * 0.5;
      tail.rotation.x = -0.5 + Math.sin(t * 1.1) * 0.16;
      bodyMesh.position.y = Math.sin(t * 2) * 0.012;
    },
  };
}

/* ---------------- 2D portrait for the exhibit panel ---------------- */

/**
 * Draws the same character as a flat, illustrated bust — used in the
 * "About Karl" exhibit instead of the old customiser preview.
 */
export function drawPortrait(ctx, w, h, t = 0) {
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.translate(w / 2, h * 0.9);
  const s = Math.min(w / 220, h / 260);
  ctx.scale(s, s);

  const bob = Math.sin(t * 1.6) * 2;
  ctx.translate(0, bob);

  /* soft ground glow */
  const g = ctx.createRadialGradient(0, 6, 0, 0, 6, 74);
  g.addColorStop(0, 'rgba(140,190,120,0.35)');
  g.addColorStop(1, 'rgba(140,190,120,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 6, 74, 22, 0, 0, TAU);
  ctx.fill();

  /* body */
  ctx.fillStyle = LOOK.shirt;
  ctx.beginPath();
  ctx.moveTo(-42, 4);
  ctx.quadraticCurveTo(-50, -62, -30, -78);
  ctx.lineTo(30, -78);
  ctx.quadraticCurveTo(50, -62, 42, 4);
  ctx.quadraticCurveTo(0, 16, -42, 4);
  ctx.closePath();
  ctx.fill();

  /* shading */
  ctx.fillStyle = LOOK.shirtDark;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(16, -76);
  ctx.quadraticCurveTo(50, -62, 42, 4);
  ctx.quadraticCurveTo(26, 10, 18, 8);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  /* scarf */
  ctx.fillStyle = LOOK.scarf;
  ctx.beginPath();
  ctx.ellipse(0, -76, 34, 12, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(14, -72);
  ctx.quadraticCurveTo(30, -44, 20, -24);
  ctx.quadraticCurveTo(10, -44, 8, -70);
  ctx.closePath();
  ctx.fill();

  /* head */
  const hy = -128;
  ctx.fillStyle = LOOK.skin;
  ctx.beginPath();
  ctx.ellipse(0, hy, 52, 50, 0, 0, TAU);
  ctx.fill();

  /* ears */
  for (const side of [-1, 1]) {
    ctx.fillStyle = LOOK.skin;
    ctx.beginPath();
    ctx.ellipse(side * 50, hy + 6, 9, 12, 0, 0, TAU);
    ctx.fill();
  }

  /* hair */
  ctx.fillStyle = LOOK.hair;
  ctx.beginPath();
  ctx.moveTo(-52, hy + 2);
  ctx.quadraticCurveTo(-58, hy - 56, 0, hy - 54);
  ctx.quadraticCurveTo(58, hy - 56, 52, hy + 2);
  ctx.quadraticCurveTo(46, hy - 20, 22, hy - 26);
  ctx.quadraticCurveTo(6, hy - 14, -14, hy - 22);
  ctx.quadraticCurveTo(-38, hy - 18, -52, hy + 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = LOOK.hairLight;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.ellipse(-16, hy - 38, 22, 10, -0.3, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;

  /* eyes */
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#3a2e2a';
    ctx.beginPath();
    ctx.ellipse(side * 20, hy + 4, 7, 8.5, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(side * 20 - 2.4, hy + 1, 2.6, 0, TAU);
    ctx.fill();
  }
  /* blush */
  ctx.fillStyle = 'rgba(242,150,140,0.45)';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * 34, hy + 16, 10, 6, 0, 0, TAU);
    ctx.fill();
  }
  /* smile */
  ctx.strokeStyle = '#a3624f';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, hy + 20, 9, 0.35, Math.PI - 0.35);
  ctx.stroke();

  /* straw hat */
  ctx.fillStyle = LOOK.hat;
  ctx.beginPath();
  ctx.ellipse(0, hy - 46, 84, 20, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#f2dca8';
  ctx.beginPath();
  ctx.ellipse(0, hy - 50, 80, 17, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#e0c383';
  ctx.beginPath();
  ctx.ellipse(0, hy - 58, 44, 30, 0, Math.PI, TAU);
  ctx.fill();
  ctx.fillStyle = LOOK.hatBand;
  ctx.beginPath();
  ctx.ellipse(0, hy - 56, 45, 8, 0, 0, TAU);
  ctx.fill();

  ctx.restore();
}
