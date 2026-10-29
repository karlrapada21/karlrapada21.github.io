export default async function (d) {
  await d.goto();
  await d.wait(5000);
  await d.eval(`window.__ISLE__.settle(); window.__ISLE__.warm(60); true`);
  await d.wait(300);

  const probe = await d.eval(`(() => {
    const I = window.__ISLE__;
    const W = innerWidth, H = innerHeight;
    const pts = [
      ['top-centre',   W*0.55, H*0.03],
      ['sky-mid',      W*0.55, H*0.16],
      ['just-above-h', W*0.55, H*0.30],
      ['island',       W*0.55, H*0.62],
      ['below',        W*0.55, H*0.92],
      ['left-top',     W*0.05, H*0.05],
    ];
    const samples = I.sample(pts.map(p => [p[1], p[2]]));
    const cam = I.rig.camera;
    const fwd = cam.getWorldDirection(cam.position.clone());
    return {
      camPos: cam.position.toArray().map(n => +n.toFixed(2)),
      pitchDeg: +(Math.asin(fwd.y)*180/Math.PI).toFixed(1),
      samples: pts.map((p, i) => [p[0], '#' + samples[i].map(v => v.toString(16).padStart(2,'0')).join('')]),
    };
  })()`);
  console.log(JSON.stringify(probe, null, 2));

  // sky only
  await d.eval(`(() => { const w = window.__ISLE__.world; for (const c of w.scene.children) { if (c.name !== 'sky') c.visible = false; } return true; })()`);
  const sky = await d.eval(`(() => {
    const I = window.__ISLE__;
    const W = innerWidth, H = innerHeight;
    const pts = [[W*0.5, 4],[W*0.5,H*0.08],[W*0.5,H*0.16],[W*0.5,H*0.28],[W*0.5,H*0.40],[W*0.5,H*0.6],[W*0.5,H*0.9]];
    const s = I.sample(pts);
    return s.map(p => '#' + p.map(v => v.toString(16).padStart(2,'0')).join(''));
  })()`);
  console.log('sky gradient top->bottom:', JSON.stringify(sky));
  await d.shot('03-skyonly');
}
