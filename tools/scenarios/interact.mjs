/**
 * Interaction test: keyboard nav, menu clicks, shard picking, escape, time toggle,
 * plus content integrity for every panel.
 */
export default async function (d) {
  await d.goto();
  await d.wait(5000);
  await d.eval(`window.__ISLE__.warm(40); true`);

  const log = (label, obj) => console.log(label, JSON.stringify(obj));

  /* ---- 1. keyboard navigation ---- */
  await d.eval(`document.body.focus(); true`);
  await d.key('ArrowDown');
  await d.wait(120);
  await d.key('ArrowDown');
  await d.wait(120);
  log('after 2x ArrowDown', await d.eval(`({
    active: document.querySelector('.menu-item.is-active')?.dataset.id,
    focusId: document.activeElement?.id,
    tabbable: [...document.querySelectorAll('.menu-btn')].filter(b => b.tabIndex === 0).length,
    caption: document.querySelector('.caption-text')?.textContent.trim().slice(0, 40),
  })`));

  await d.key('Enter');
  await d.wait(700);
  log('after Enter', await d.eval(`({
    view: document.body.dataset.view,
    openSection: window.__ISLE__.metrics().section,
    panelTitle: document.getElementById('panel-title').textContent,
    panelOpen: document.getElementById('panel-layer').classList.contains('is-open'),
    focused: document.activeElement?.id,
    sectionCount: document.querySelectorAll('.panel-body .block').length,
    textLen: document.getElementById('panel-region').textContent.trim().length,
  })`));

  await d.key('Escape');
  await d.wait(600);
  log('after Escape', await d.eval(`({
    view: document.body.dataset.view,
    openSection: window.__ISLE__.metrics().section,
    panelOpen: document.getElementById('panel-layer').classList.contains('is-open'),
    focusReturned: document.activeElement?.id,
  })`));

  /* ---- 2. click a menu button ---- */
  const box = await d.eval(`(() => {
    const b = document.getElementById('menu-projects').getBoundingClientRect();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  })()`);
  await d.click(box.x, box.y);
  await d.wait(800);
  log('click Projects', await d.eval(`({
    view: document.body.dataset.view,
    openSection: window.__ISLE__.metrics().section,
    title: document.getElementById('panel-title').textContent,
    projects: document.querySelectorAll('[data-proj]').length,
    activeProject: document.querySelector('[data-proj][aria-current="true"]')?.dataset.proj,
    detailHasRepo: !!document.querySelector('.proj-detail a[href*="github.com"]'),
    panelScrollable: (() => { const b = document.getElementById('panel-region'); return [b.scrollHeight, b.clientHeight]; })(),
    overflowX: (() => { const b = document.getElementById('panel-region'); return b.scrollWidth > b.clientWidth + 1; })(),
  })`));

  /* ---- 3. pick a shard in 3D ---- */
  const shard = await d.eval(`(() => {
    const I = window.__ISLE__;
    const s = I.world.grove.shards[2];
    const V = I.rig.camera.position.constructor;
    const p = s.getWorldPosition(new V()).project(I.rig.camera);
    return { x: (p.x * 0.5 + 0.5) * innerWidth, y: (-p.y * 0.5 + 0.5) * innerHeight };
  })()`);
  log('shard 2 screen pos', shard);
  await d.click(shard.x, shard.y);
  await d.wait(700);
  log('after shard click', await d.eval(`({
    activeProject: document.querySelector('[data-proj][aria-current="true"]')?.dataset.proj,
    detailName: document.querySelector('.proj-detail .proj-name')?.textContent,
    groveActive: window.__ISLE__.world.grove.activeIndex,
  })`));

  /* ---- 4. arrow-left/right cycling inside the panel ---- */
  await d.key('ArrowRight');
  await d.wait(400);
  log('after ArrowRight', await d.eval(`({
    activeProject: document.querySelector('[data-proj][aria-current="true"]')?.dataset.proj,
    detailName: document.querySelector('.proj-detail .proj-name')?.textContent,
  })`));

  /* ---- 5. time toggle ---- */
  const time = await d.eval(`(() => {
    const b = document.getElementById('btn-time').getBoundingClientRect();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  })()`);
  await d.click(time.x, time.y);
  await d.wait(500);
  log('after time click', await d.eval(`({
    label: document.getElementById('time-label').textContent,
    time: window.__ISLE__.metrics().time,
    theme: document.querySelector('meta[name="theme-color"]').content,
  })`));

  /* ---- 6. every panel renders content ---- */
  for (const id of ['about', 'skills', 'experience', 'contact']) {
    await d.eval(`window.__ISLE__.openSection('${id}'); true`);
    await d.wait(320);
    log(`panel ${id}`, await d.eval(`(() => {
      const b = document.getElementById('panel-region');
      return {
        title: document.getElementById('panel-title').textContent,
        chars: b.textContent.trim().length,
        blocks: b.querySelectorAll('.block').length,
        links: b.querySelectorAll('a[href]').length,
        overflowX: b.scrollWidth > b.clientWidth + 1,
        h: [b.scrollHeight, b.clientHeight],
      };
    })()`));
  }

  /* ---- 7. accessibility spot checks ---- */
  log('a11y', await d.eval(`({
    canvasAriaHidden: document.getElementById('stage').getAttribute('aria-hidden'),
    dialogRole: document.getElementById('panel').getAttribute('role'),
    menuRole: document.getElementById('menu-list').getAttribute('role'),
    liveRegions: document.querySelectorAll('[aria-live]').length,
    headerOrder: [...document.querySelectorAll('h1,h2,h3')].slice(0, 6).map(h => h.tagName + ':' + h.textContent.trim().slice(0, 22)),
    buttonsWithoutLabel: [...document.querySelectorAll('button')].filter(b => !b.textContent.trim() && !b.getAttribute('aria-label')).length,
  })`));
}
