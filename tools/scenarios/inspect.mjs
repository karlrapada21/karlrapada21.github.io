/** Boot check + steady-state menu capture + draw-cost report. */
export default async function (d) {
  await d.goto();
  await d.wait(5000);

  const boot = await d.eval(`(() => ({
    hasIsle: !!window.__ISLE__,
    view: document.body.dataset.view,
    bootDone: document.getElementById('boot').classList.contains('is-done'),
    canvasLive: document.getElementById('stage').classList.contains('is-live'),
    menuItems: document.querySelectorAll('.menu-btn').length,
    activeMenu: document.querySelector('.menu-item.is-active')?.dataset.id,
    caption: document.querySelector('[aria-live="polite"]')?.textContent.trim().slice(0, 60),
  }))()`);
  console.log('boot:', JSON.stringify(boot));

  // headless software rendering is slow, so advance the simulation by hand
  await d.eval(`window.__ISLE__.settle(); window.__ISLE__.warm(90); true`);
  await d.wait(500);
  await d.shot('01-menu');

  console.log('metrics:', JSON.stringify(await d.eval('window.__ISLE__.metrics()')));
}
