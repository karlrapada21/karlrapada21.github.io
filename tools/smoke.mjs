/** Dev-only: final smoke test — boot, fonts, all exhibits, no console errors. */
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const url = 'http://127.0.0.1:8099/';
const profile = mkdtempSync(join(tmpdir(), 'isle-smoke-'));
const port = 9800 + Math.floor(Math.random() * 150);
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--window-size=1440,900', '--disable-gpu', '--no-first-run', 'about:blank',
]);
chrome.stderr.on('data', () => {});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let ws;
for (let i = 0; i < 60; i++) {
  try {
    const r = await fetch(`http://127.0.0.1:${port}/json/list`);
    const l = await r.json();
    const p = l.find((t) => t.type === 'page');
    if (p?.webSocketDebuggerUrl) { ws = new WebSocket(p.webSocketDebuggerUrl); break; }
  } catch {}
  await sleep(200);
}
await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
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
    const results = {};
    results.booted = !!g;
    results.fonts = {
      baloo: document.fonts.check('700 16px "Baloo 2"'),
      quicksand: document.fonts.check('400 16px "Quicksand"'),
      faceCount: document.fonts.size,
    };
    const startBtn = document.getElementById('startBtn');
    results.startBtn = !!startBtn;
    if (startBtn) startBtn.click();
    await new Promise(r => setTimeout(r, 700));
    results.hudVisible = !document.querySelector('.hud').classList.contains('hidden');
    results.prompts = { resumeBtn: !!document.getElementById('resumeBtn'), pad: !!document.getElementById('pad') };

    const opened = [];
    for (const spot of g.__podiums()) {
      g.player.x = spot.x; g.player.y = spot.y + 96;
      g.update(0.016);
      g.tryInteract();
      await new Promise(r => setTimeout(r, 90));
      const title = document.querySelector('#ovTitle').textContent;
      const body = document.querySelector('#ovBody');
      opened.push({ id: spot.id, open: g.overlayOpen, title, chars: body.innerText.length });
      g.ui.closeOverlay();
      await new Promise(r => setTimeout(r, 70));
    }
    results.exhibits = opened;

    // resume PDF reachable
    try {
      const res = await fetch('assets/Karl-Rapada-Resume.pdf', { method: 'HEAD' });
      results.pdf = { status: res.status, type: res.headers.get('content-type') };
    } catch (e) { results.pdf = { error: String(e) }; }

    // house + bridge interaction
    g.player.x = 606; g.player.y = 700; g.update(0.016);
    results.nearHouse = g.near?.kind;
    g.tryInteract(); await new Promise(r => setTimeout(r, 120));
    results.houseOpens = g.overlayOpen;
    g.ui.closeOverlay(); await new Promise(r => setTimeout(r, 80));

    g.player.x = 830; g.player.y = 940; g.update(0.016);
    results.nearBridge = g.near?.kind;
    return JSON.stringify(results, null, 1);
  })()`,
  returnByValue: true,
  awaitPromise: true,
});
if (r.exceptionDetails) console.error('THROWN', JSON.stringify(r.exceptionDetails));
else console.log(r.result.value);
console.log(errs.length ? '\nCONSOLE ERRORS:\n' + errs.join('\n') : '\nno console errors');
ws.close();
chrome.kill();
process.exit(errs.length ? 1 : 0);
