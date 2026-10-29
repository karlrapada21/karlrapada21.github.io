/** Layout + geometry probe: measures where UI boxes land and what the island covers. */
export default async function (d) {
  await d.goto();
  await d.wait(5000);

  const measure = async (label) => {
    const info = await d.eval(`(() => {
      const r = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const b = el.getBoundingClientRect();
        return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)];
      };
      const I = window.__ISLE__;
      // project the island's bounding box corners to screen space
      const cam = I.rig.camera;
      const V = cam.position.constructor;
      const pts = [];
      for (const x of [-13.4, 13.4]) for (const y of [-8, 1.4]) for (const z of [-13.4, 13.4]) {
        const p = new V(x, y, z).project(cam);
        pts.push([ (p.x * 0.5 + 0.5) * innerWidth, (-p.y * 0.5 + 0.5) * innerHeight ]);
      }
      const xs = pts.map(p => p[0]); const ys = pts.map(p => p[1]);
      return {
        vw: innerWidth, vh: innerHeight,
        menu: r('.menu-wrap'), brand: r('.brand'), hud: r('.hud-actions'),
        caption: r('.menu-caption'), hint: r('.hint-bar'),
        panel: r('.panel'),
        islandBox: [Math.round(Math.min(...xs)), Math.round(Math.min(...ys)),
                    Math.round(Math.max(...xs)), Math.round(Math.max(...ys))].join(','),
        dpr: I.renderer.getPixelRatio(),
        calls: I.renderer.info.render.calls,
      };
    })()`);
    console.log(label, JSON.stringify(info));
  };

  await d.eval(`window.__ISLE__.settle(); window.__ISLE__.warm(60); true`);
  await measure('desktop ');

  await d.resize(390, 844);
  await d.eval(`window.__ISLE__.settle(); window.__ISLE__.warm(40); true`);
  await measure('mobile  ');
  await d.shot('20-mobile-menu');

  await d.resize(1440, 900);
  await d.eval(`window.__ISLE__.settle(); window.__ISLE__.warm(40); true`);
  await d.eval(`window.__ISLE__.openSection('projects'); true`);
  await d.wait(400);
  await d.eval(`window.__ISLE__.settle(); window.__ISLE__.warm(40); true`);
  await measure('panel   ');
}
