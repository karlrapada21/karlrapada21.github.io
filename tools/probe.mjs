/**
 * Dev-only: run an expression inside the running 3D page and print the JSON.
 *   node tools/probe.mjs "<expression>" [url]
 *
 * The expression is evaluated as an async function body with `g` (the Game,
 * window.__isle) and `THREE` available.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const expr = process.argv[2];
const url = process.argv[3] || 'http://127.0.0.1:8099/';
if (!expr) {
  console.error('usage: node tools/probe.mjs "<expr>" [url]');
  process.exit(1);
}
const profile = mkdtempSync(join(tmpdir(), 'isle-probe-'));
const port = 9760 + Math.floor(Math.random() * 200);

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
if (!ws) {
  console.error('no target');
  process.exit(1);
}
await new Promise((res, rej) => {
  ws.addEventListener('open', res);
  ws.addEventListener('error', rej);
});
let id = 0;
const pending = new Map();
const logs = [];
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
  } else if (m.method === 'Runtime.exceptionThrown') {
    logs.push('EXC ' + (m.params.exceptionDetails.exception?.description || ''));
  }
});
const send = (method, params = {}) => {
  const mid = ++id;
  ws.send(JSON.stringify({ id: mid, method, params }));
  return new Promise((resolve, reject) => pending.set(mid, { resolve, reject }));
};

await send('Runtime.enable');
await send('Page.enable');
await send('Page.navigate', { url });
await sleep(2600);
await send('Runtime.evaluate', {
  expression: `(() => { const b = document.getElementById('startBtn'); if (b) b.click(); })()`,
  returnByValue: true,
});
await sleep(1200);

const r = await send('Runtime.evaluate', {
  expression: `(async () => {
    const g = window.__isle;
    const T = g.constructor.THREE;
    ${expr}
  })()`,
  returnByValue: true,
  awaitPromise: true,
});
if (r.exceptionDetails) {
  console.error('THROWN: ' + JSON.stringify(r.exceptionDetails, null, 2));
} else {
  const v = r.result.value;
  console.log(typeof v === 'string' ? v : JSON.stringify(v, null, 2));
}
if (logs.length) console.error(logs.join('\n'));
ws.close();
chrome.kill();
process.exit(0);
