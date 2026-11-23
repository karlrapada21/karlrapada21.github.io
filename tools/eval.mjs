/**
 * Dev-only: run an arbitrary JS expression inside the running game page and
 * print the JSON result. Keeps the CDP boilerplate in one place.
 *   node tools/eval.mjs "expression"
 */
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const expr = process.argv[2];
const url = process.argv[3] || 'http://127.0.0.1:8099/';
if (!expr) {
  console.error('usage: node tools/eval.mjs "<expr>" [url]');
  process.exit(1);
}
const profile = mkdtempSync(join(tmpdir(), 'isle-eval-'));
const port = 9750 + Math.floor(Math.random() * 200);

const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  '--window-size=1440,900',
  '--disable-gpu',
  '--no-first-run',
  'about:blank',
]);
chrome.stderr.on('data', () => {});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let ws;
for (let i = 0; i < 60; i++) {
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
  console.error('no devtools target');
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
    logs.push('EXC ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
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
const r = await send('Runtime.evaluate', {
  expression: `(async () => { ${expr} })()`,
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
