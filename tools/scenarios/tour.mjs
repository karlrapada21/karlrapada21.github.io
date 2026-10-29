/**
 * Walks every screen at every time of day and records what the renderer says.
 * Screenshots land in tools/shots for the pixel analyser.
 */
export default async function (d) {
  await d.goto();
  await d.wait(5000);

  const ready = await d.eval(`!!window.__ISLE__`);
  if (!ready) throw new Error('island never booted');

  const settle = () => d.eval(`window.__ISLE__.settle(); window.__ISLE__.warm(70); true`);
  const shot = async (name) => {
    await d.wait(260);
    await d.shot(name);
  };

  await settle();
  await shot('10-menu-golden');

  for (const id of ['projects', 'about', 'skills', 'experience', 'contact']) {
    await d.eval(`window.__ISLE__.openSection('${id}'); true`);
    await d.wait(300);
    await settle();
    await shot(`11-panel-${id}`);
  }

  await d.eval(`window.__ISLE__.closePanel(); true`);
  await d.wait(400);
  await settle();
  await shot('12-menu-closed');

  // time of day
  await d.eval(`window.__ISLE__.setTime('day'); window.__ISLE__.settle(); window.__ISLE__.warm(40); true`);
  await shot('13-day');

  await d.eval(`window.__ISLE__.setTime('night'); window.__ISLE__.settle(); window.__ISLE__.warm(40); true`);
  await shot('14-night');

  await d.eval(`window.__ISLE__.setTime('golden'); window.__ISLE__.settle(); window.__ISLE__.warm(40); true`);

  console.log('metrics:', JSON.stringify(await d.eval('window.__ISLE__.metrics()')));

  // mobile
  await d.resize(390, 844);
  await d.eval(`window.__ISLE__.settle(); window.__ISLE__.warm(40); true`);
  await shot('20-mobile-menu');

  await d.eval(`window.__ISLE__.openSection('projects'); true`);
  await d.wait(300);
  await d.eval(`window.__ISLE__.settle(); window.__ISLE__.warm(40); true`);
  await shot('21-mobile-panel');
}
