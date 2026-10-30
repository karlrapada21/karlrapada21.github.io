/** Sweeps viewport sizes and reports framing, overlap and draw cost at each. */
const SIZES = [
  [1920, 1080],
  [1440, 900],
  [1366, 768],
  [1280, 800],
  [1024, 768],
  [820, 1180],
  [768, 1024],
  [430, 932],
  [390, 844],
  [360, 640],
];

export default async function (d) {
  await d.goto();
  await d.waitFor('!!window.__ISLE__');
  await d.waitFor("document.getElementById('boot').hidden === true", 20000);

  for (const [w, h] of SIZES) {
    await d.resize(w, h);
    await d.eval(`window.__ISLE__.settle(); window.__ISLE__.warm(30); true`);
    await d.wait(260);

    const r = await d.eval(`(() => {
      const I = window.__ISLE__;
      const cam = I.rig.camera;
      const V = cam.position.constructor;
      const pts = [];
      for (const x of [-13.4, 13.4]) for (const y of [-8.5, 1.4]) for (const z of [-13.4, 13.4]) {
        const p = new V(x, y, z).project(cam);
        pts.push([(p.x * 0.5 + 0.5) * innerWidth, (-p.y * 0.5 + 0.5) * innerHeight]);
      }
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      const box = (s) => { const e = document.querySelector(s); if (!e) return null;
        const b = e.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.right), Math.round(b.bottom)]; };
      const island = [Math.round(Math.min(...xs)), Math.round(Math.min(...ys)), Math.round(Math.max(...xs)), Math.round(Math.max(...ys))];
      const menu = box('.menu-wrap');
      const overlap = menu && !(menu[2] < island[0] || menu[0] > island[2] || menu[3] < island[1] || menu[1] > island[3]);
      return {
        size: innerWidth + 'x' + innerHeight,
        fov: cam.fov,
        island,
        menu,
        brand: box('.brand'),
        hud: box('.hud-actions'),
        menuIslandOverlap: !!overlap,
        islandCoversCentreX: island[0] < innerWidth / 2 && island[2] > innerWidth / 2,
        calls: I.renderer.info.render.calls,
        tris: I.renderer.info.render.triangles,
        dpr: I.renderer.getPixelRatio(),
        hOverflow: document.documentElement.scrollWidth > innerWidth,
      };
    })()`);
    console.log(JSON.stringify(r));

    if (w === 1920 || w === 390 || w === 768) await d.shot(`30-${w}x${h}`);
  }

  /* --- reduced motion pass --- */
  await d.page.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  await d.resize(1440, 900);
  await d.goto();
  await d.waitFor('!!window.__ISLE__');
  await d.wait(3200);
  console.log('reduced-motion boot:', JSON.stringify(await d.eval(`({
    hasIsle: !!window.__ISLE__,
    live: document.getElementById('stage').classList.contains('is-live'),
    bootHidden: document.getElementById('boot').hidden,
  })`)));
  await d.eval(`window.__ISLE__.settle(); window.__ISLE__.warm(30); true`);
  await d.wait(300);
  await d.shot('31-reduced-motion');
}
