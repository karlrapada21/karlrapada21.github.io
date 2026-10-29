/**
 * Camera rig.
 *
 * A "shot" is described by focus point + azimuth + elevation + distance +
 * screen-space pan. Every value is damped, so moving between sections is one
 * function call and the motion stays buttery at any frame rate.
 */

import { PerspectiveCamera, Vector3 } from 'three';
import { damp, clamp, DEG } from './util.js';

const ORBIT_LIMIT_AZIM = 0.34;
const ORBIT_LIMIT_ELEV = 0.2;

export function createCameraRig(aspect = 1.6) {
  const camera = new PerspectiveCamera(40, aspect, 0.4, 900);
  camera.position.set(-6, 30, 46);

  const cur = {
    focus: new Vector3(0, 3.2, 0),
    azim: 0.02,
    elev: 0.42,
    dist: 40,
    panX: 0,
    panY: 0,
  };

  const dest = { ...cur, focus: cur.focus.clone() };

  // user-driven offsets that spring back to zero
  const user = { azim: 0, elev: 0, targetAzim: 0, targetElev: 0 };
  const parallax = { x: 0, y: 0, tx: 0, ty: 0 };

  let vw = 1440;
  let vh = 900;
  let fov = 40;

  const _p = new Vector3();
  let intro = true;

  function project() {
    const a = cur.azim + user.azim;
    const e = cur.elev + user.elev;
    const ce = Math.cos(e);

    // spherical direction, already unit length
    _p.set(Math.sin(a) * ce, Math.sin(e), Math.cos(a) * ce);

    camera.position.copy(cur.focus).addScaledVector(_p, Math.max(cur.dist, 2));
    camera.lookAt(cur.focus);

    // Screen-space pan: positive panX pushes the subject right, positive panY up.
    // Implemented with an off-axis frustum so the camera never physically moves —
    // the framing changes without the viewing angle changing.
    if (cur.panX || cur.panY) {
      camera.setViewOffset(vw, vh, -cur.panX * vw, cur.panY * vh, vw, vh);
    } else if (camera.view && camera.view.enabled) {
      camera.clearViewOffset();
    }

    // parallax nudges the whole rig, never the aim
    if (parallax.x || parallax.y) {
      camera.translateX(parallax.x);
      camera.translateY(parallax.y);
    }
  }

  project();

  return {
    camera,

    resize(w, h) {
      vw = w;
      vh = h;
      const aspect = w / h;
      camera.aspect = aspect;
      // A wider lens on tall screens keeps the whole island in frame; the extra
      // vertical field also buys back some open sky above the horizon.
      fov = aspect < 0.85 ? 58 : aspect < 1.25 ? 52 : 46;
      camera.fov = fov;
      camera.updateProjectionMatrix();
      project();
    },

    /** @param {{focus?:number[], azim?:number, elev?:number, dist?:number, panX?:number, panY?:number}} shot */
    setShot(shot, instant = false) {
      if (shot.focus) dest.focus.set(shot.focus[0], shot.focus[1], shot.focus[2]);
      if (shot.azim !== undefined) dest.azim = shot.azim;
      if (shot.elev !== undefined) dest.elev = shot.elev;
      if (shot.dist !== undefined) dest.dist = shot.dist;
      if (shot.panX !== undefined) dest.panX = shot.panX;
      if (shot.panY !== undefined) dest.panY = shot.panY;

      if (instant) {
        cur.focus.copy(dest.focus);
        cur.azim = dest.azim;
        cur.elev = dest.elev;
        cur.dist = dest.dist;
        cur.panX = dest.panX;
        cur.panY = dest.panY;
        user.azim = user.targetAzim = 0;
        user.elev = user.targetElev = 0;
        intro = false;
        project();
      }
    },

    finishIntro() {
      intro = false;
    },

    /** Jump straight to the pending shot — used on resize and by the QA probe. */
    snap() {
      cur.focus.copy(dest.focus);
      cur.azim = dest.azim;
      cur.elev = dest.elev;
      cur.dist = dest.dist;
      cur.panX = dest.panX;
      cur.panY = dest.panY;
      user.azim = user.targetAzim;
      user.elev = user.targetElev;
      parallax.x = parallax.tx;
      parallax.y = parallax.ty;
      intro = false;
      project();
    },

    drag(dx, dy) {
      const speed = 0.0022;
      user.targetAzim = clamp(user.targetAzim - dx * speed, -ORBIT_LIMIT_AZIM, ORBIT_LIMIT_AZIM);
      user.targetElev = clamp(user.targetElev + dy * speed, -ORBIT_LIMIT_ELEV, ORBIT_LIMIT_ELEV);
      intro = false;
    },

    endDrag() {
      // spring back so a chosen section keeps its composition
      user.targetAzim = 0;
      user.targetElev = 0;
    },

    parallax(nx, ny, strength = 1) {
      parallax.tx = -nx * 0.9 * strength;
      parallax.ty = -ny * 0.55 * strength;
    },

    update(dt) {
      const k = 2.6;
      const ease = 1 - Math.exp(-(intro ? 1.9 : 6.5) * dt);

      cur.focus.lerp(dest.focus, ease);
      cur.azim = damp(cur.azim, dest.azim, intro ? 1.9 : k, dt);
      cur.elev = damp(cur.elev, dest.elev, intro ? 1.9 : k, dt);
      cur.dist = damp(cur.dist, dest.dist, intro ? 1.7 : k, dt);
      cur.panX = damp(cur.panX, dest.panX, intro ? 1.7 : k, dt);
      cur.panY = damp(cur.panY, dest.panY, intro ? 1.7 : k, dt);

      user.azim = damp(user.azim, user.targetAzim, 3.2, dt);
      user.elev = damp(user.elev, user.targetElev, 3.2, dt);

      parallax.x = damp(parallax.x, parallax.tx, 2.4, dt);
      parallax.y = damp(parallax.y, parallax.ty, 2.4, dt);

      project();
    },

    get distance() {
      return cur.dist;
    },
  };
}
