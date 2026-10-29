/**
 * Assembles the island and owns the camera shots for each menu section.
 * Building happens in stages so the boot screen can actually paint in between.
 */

import { Scene, Group, Color } from 'three';
import { createIsland } from './scene/island.js';
import { createVegetation } from './scene/vegetation.js';
import { createProps } from './scene/props.js';
import { createWater } from './scene/water.js';
import { createGrove } from './scene/grove.js';
import { createClouds } from './scene/clouds.js';
import { createParticles } from './scene/particles.js';
import { createBirds } from './scene/birds.js';
import { createSky } from './scene/sky.js';
import { initPalette, updatePalette, palette } from './core/palette.js';
import { G } from './core/materials.js';
import { projects } from './data/content.js';
import { yieldFrame } from './core/util.js';

/* Camera shots, tuned by eye. panX/panY are fractions of the viewport. */
const SHOTS = {
  menu: { focus: [0.6, 2.6, -0.6], azim: 0.07, elev: 0.175, dist: 38, panX: 0.165, panY: 0.035 },
  projects: { focus: [0.3, 6.4, -1.4], azim: 0.05, elev: 0.09, dist: 21, panX: -0.19, panY: 0.0 },
  about: { focus: [-4.6, 2.4, -4.0], azim: -0.3, elev: 0.15, dist: 23, panX: 0.13, panY: 0.0 },
  skills: { focus: [6.2, 3.6, -4.8], azim: 0.31, elev: 0.13, dist: 22, panX: 0.1, panY: 0.0 },
  experience: { focus: [-6.0, 1.8, 3.2], azim: -0.24, elev: 0.14, dist: 19, panX: 0.15, panY: 0.0 },
  contact: { focus: [7.4, 1.6, 2.3], azim: 0.36, elev: 0.15, dist: 18, panX: 0.09, panY: 0.0 },
};

export function shotFor(id, { narrow = false, portrait = false } = {}) {
  const base = SHOTS[id] || SHOTS.menu;
  const shot = { ...base, focus: base.focus.slice() };

  if (narrow) {
    // On phones the menu sits at the bottom, so lift the subject and pull back.
    shot.dist = base.dist * (portrait ? 1.5 : 1.3);
    shot.panX = 0;
    shot.panY = portrait ? 0.16 : 0.1;
    shot.elev = base.elev * 1.15;
  }

  return shot;
}

export async function createWorld({ quality = 'high', reducedMotion = false, onProgress = () => {} } = {}) {
  initPalette();

  const scene = new Scene();
  const sceneColor = new Color();
  scene.background = sceneColor;

  const land = new Group();
  land.name = 'land';
  scene.add(land);

  onProgress(8, 'Raising the island&hellip;');
  await yieldFrame();

  const island = createIsland();
  land.add(island.group);

  onProgress(26, 'Planting trees&hellip;');
  await yieldFrame();

  const vegetation = createVegetation(quality);
  land.add(vegetation.group);

  onProgress(48, 'Building the cottage&hellip;');
  await yieldFrame();

  const props = createProps(quality);
  land.add(props.group);

  const water = createWater();
  land.add(water);

  onProgress(64, 'Hanging the clouds&hellip;');
  await yieldFrame();

  const clouds = createClouds(quality);
  scene.add(clouds.group);

  const sky = createSky();
  scene.add(sky);

  onProgress(76, 'Setting out the projects&hellip;');
  await yieldFrame();

  const grove = createGrove(projects);
  scene.add(grove.group);

  const particles = createParticles(quality);
  for (const p of particles.group) scene.add(p);

  const birds = createBirds(quality === 'low' ? 3 : 6);
  scene.add(birds.group);

  onProgress(90, 'Letting the wind in&hellip;');
  await yieldFrame();

  let t = 0;

  return {
    scene,
    island,
    vegetation,
    props,
    grove,
    clouds,
    particles,
    birds,
    sky,
    land,

    update(dt, camera, renderer) {
      t += dt;

      G.uTime.value = t;
      updatePalette(dt);

      if (!reducedMotion) {
        land.position.y = Math.sin(t * 0.34) * 0.16;
        land.rotation.z = Math.sin(t * 0.21) * 0.0022;
      }

      grove.update(dt, t);
      props.update(dt, t);
      clouds.update(dt, t);
      birds.update(t);
      particles.update();
      particles.setProjectionScale(
        renderer.domElement.height / (2 * Math.tan((camera.fov * Math.PI) / 360))
      );

      // the sky dome rides with the camera so the gradient never slides
      sky.position.copy(camera.position);

      sceneColor.copy(palette.skyBottom).lerp(palette.skyMid, 0.4);
      scene.background.copy(sceneColor);

      return t;
    },

    get time() {
      return t;
    },
  };
}
