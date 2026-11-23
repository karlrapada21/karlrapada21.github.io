/** Dev-only: end-to-end smoke test for the 3D build. */
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const url = process.argv[2] || 'http://127.0.0.1:8099/';
const profile = mkdtempSync(join(tmpdir(), 'isle-smoke3d-'));
const port = 9820 + Math.floor(Math.random() * 150);
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    '--window-size=1440,900',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--no-first-run',
    'about:blank',
  ],
  { stdio: 'ignore' }
);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let ws;
for (let i = 0; i < 90; i++) {
  try {
    const r = await fetch(`http://127.0.0.1:${port}/json/list`);
    const l = await r.json();
    const p = l.find((t) => t.type === 'page');
    if (p?.webSocketDebuggerUrl) {
      ws = new WebSocket(p.webSocketDebuggerUrl);
      break;
    }
  } catch {}
  await sleep(200);
}
await new Promise((res, rej) => {
  ws.addEventListener('open', res);
  ws.addEventListener('error', rej);
});
let id = 0;
const pending = new Map();
const errs = [];
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
  } else if (m.method === 'Runtime.exceptionThrown') {
    errs.push('EXC ' + (m.params.exceptionDetails.exception?.description || ''));
  } else if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
    errs.push('ERR ' + m.params.entry.text);
  }
});
const send = (method, params = {}) => {
  const mid = ++id;
  ws.send(JSON.stringify({ id: mid, method, params }));
  return new Promise((resolve, reject) => pending.set(mid, { resolve, reject }));
};
await send('Runtime.enable');
await send('Log.enable');
await send('Page.enable');
await send('Page.navigate', { url });
await sleep(3000);

const r = await send('Runtime.evaluate', {
  expression: `(async () => {
    await document.fonts.ready;
    const g = window.__isle;
    const res = {};
    res.booted = !!g;
    res.webgl = !!g.renderer.getContext();
    res.stats = g.props.stats;

    const startBtn = document.getElementById('startBtn');
    res.startBtn = !!startBtn;
    res.hasCustomizer = !!document.querySelector('.start-customizer, .swatch, .look-row');
    if (startBtn) startBtn.click();
    await new Promise(r => setTimeout(r, 800));
    res.hudVisible = !document.querySelector('.hud').classList.contains('hidden');
    res.startRemoved = !document.querySelector('.start-screen');

    // every exhibit opens with content
    const opened = [];
    for (const spot of g.__podiums()) {
      g.player.x = spot.x; g.player.y = spot.y + 96;
      g.update(0.016);
      g.tryInteract();
      await new Promise(r => setTimeout(r, 90));
      opened.push({
        id: spot.id,
        open: g.overlayOpen,
        title: document.querySelector('#ovTitle').textContent,
        chars: document.querySelector('#ovBody').innerText.length,
      });
      g.ui.closeOverlay();
      await new Promise(r => setTimeout(r, 70));
    }
    res.exhibits = opened;

    // house + bridge interactions
    g.player.x = 606; g.player.y = 700; g.update(0.016);
    res.nearHouse = g.near?.kind;
    g.ui.closeOverlay(); await new Promise(r => setTimeout(r, 60));

    // the player can actually walk: simulate forward motion
    g.player.x = 806; g.player.y = 760; g.player.vx = 0; g.player.vy = 0;
    g.keys.add('s');
    for (let i = 0; i < 60; i++) g.update(0.016);
    g.keys.delete('s');
    res.walkedSouth = { from: 760, to: Math.round(g.player.y) };

    // camera is above and behind the player, looking down at the island
    res.camera = {
      pos: g.camera.position.toArray().map(v => +v.toFixed(1)),
      abovePlayer: g.camera.position.y > 3,
    };
    res.renderInfo = { calls: g.renderer.info.render.calls, tris: g.renderer.info.render.triangles };
    res.pdf = await fetch('assets/Karl-Rapada-Resume.pdf', { method: 'HEAD' }).then(r2 => r2.status).catch(e => String(e));
    return JSON.stringify(res, null, 1);
  })()`,
  returnByValue: true,
  awaitPromise: true,
});
if (r.exceptionDetails) console.error('THROWN', JSON.stringify(r.exceptionDetails.exception?.description));
else console.log(r.result.value);
console.log(errs.length ? '\nCONSOLE ERRORS:\n' + errs.join('\n') : '\nno console errors');
ws.close();
chrome.kill();
process.exit(errs.length ? 1 : 0);
