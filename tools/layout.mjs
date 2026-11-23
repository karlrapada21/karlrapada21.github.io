/** Dev-only: check layout at a given viewport size.   node tools/layout.mjs <w> <h> */
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const W = Number(process.argv[2] || 390);
const H = Number(process.argv[3] || 844);
const profile = mkdtempSync(join(tmpdir(), 'isle-lay-'));
const port = 9840 + Math.floor(Math.random() * 140);
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    `--window-size=${W},${H}`,
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
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
  }
});
const send = (method, params = {}) => {
  const mid = ++id;
  ws.send(JSON.stringify({ id: mid, method, params }));
  return new Promise((resolve, reject) => pending.set(mid, { resolve, reject }));
};
await send('Runtime.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: W,
  height: H,
  deviceScaleFactor: 1,
  mobile: W < 700,
});
if (process.env.TOUCH === '1') {
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
}
await send('Page.navigate', { url: 'http://127.0.0.1:8099/' });
await sleep(3000);

const r = await send('Runtime.evaluate', {
  expression: `(() => {
    const rect = (sel) => { const e = document.querySelector(sel); if (!e) return null;
      const b = e.getBoundingClientRect();
      return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]; };
    const btn = document.querySelector('#startBtn');
    const bb = btn ? btn.getBoundingClientRect() : null;
    return JSON.stringify({
      vw: window.innerWidth, vh: window.innerHeight,
      card: rect('.start-card'),
      preview: rect('.start-preview'),
      btn: rect('#startBtn'),
      hint: rect('.start-hint'),
      btnFullyVisible: bb ? bb.top >= 0 && bb.bottom <= window.innerHeight : false,
      screenScrolls: (() => { const s = document.querySelector('.start-screen');
        return s ? s.scrollHeight > s.clientHeight + 2 : null; })(),
      customizer: document.querySelectorAll('.swatch,.look-row,.start-customizer').length,
      padDisplay: getComputedStyle(document.querySelector('.pad')).display,
    }, null, 1);
  })()`,
  returnByValue: true,
});
console.log(r.result.value);
ws.close();
chrome.kill();
process.exit(0);
