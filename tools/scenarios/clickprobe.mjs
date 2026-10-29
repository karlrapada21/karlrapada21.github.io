export default async function (d) {
  await d.goto();
  await d.wait(5000);

  const info = await d.eval(`(() => {
    const ids = ['projects','about','skills','experience','contact'];
    return {
      sections: ids,
      rects: ids.map(id => {
        const b = document.getElementById('menu-' + id).getBoundingClientRect();
        return [id, Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)];
      }),
      atPoint: (() => {
        const b = document.getElementById('menu-projects').getBoundingClientRect();
        const el = document.elementFromPoint(b.x + b.width/2, b.y + b.height/2);
        return el ? el.id + '/' + el.className + '/' + el.tagName : 'none';
      })(),
    };
  })()`);
  console.log('menu geometry:', JSON.stringify(info, null, 1));

  // click Projects by its own centre
  const box = await d.eval(`(() => {
    const b = document.getElementById('menu-projects').getBoundingClientRect();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  })()`);
  console.log('click at', JSON.stringify(box));
  await d.click(box.x, box.y);
  await d.wait(900);
  console.log('opened:', await d.eval(`({
    section: window.__ISLE__.metrics().section,
    title: document.getElementById('panel-title').textContent,
    view: document.body.dataset.view,
  })`));

  // close, then click Experience
  await d.eval(`window.__ISLE__.closePanel(); true`);
  await d.wait(600);
  const box2 = await d.eval(`(() => {
    const b = document.getElementById('menu-experience').getBoundingClientRect();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  })()`);
  await d.click(box2.x, box2.y);
  await d.wait(800);
  console.log('opened2:', await d.eval(`({
    section: window.__ISLE__.metrics().section,
    title: document.getElementById('panel-title').textContent,
  })`));
}
