/**
 * Dev-only reachability audit: flood-fill the walkable area from spawn and
 * verify every landmark can be reached and interacted with.
 *   node tools/reach.mjs
 */
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const url = process.argv[2] || 'http://127.0.0.1:8099/';
const profile = mkdtempSync(join(tmpdir(), 'isle-reach-'));
const port = 9400 + Math.floor(Math.random() * 250);

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
  expression: `(() => {
    const g = window.__isle;
    const W = (x, y) => g.__walkable(x, y);
    const CELL = 10;
    const cols = Math.ceil(2600 / CELL), rows = Math.ceil(1900 / CELL);
    const key = (c, rr) => rr * cols + c;
    const seen = new Uint8Array(cols * rows);
    const toCell = (v) => Math.round(v / CELL);
    const fromCell = (c) => c * CELL;

    const startC = toCell(g.player.x), startR = toCell(g.player.y);
    const q = [[startC, startR]];
    seen[key(startC, startR)] = 1;
    let count = 0;
    while (q.length) {
      const [c, rr] = q.pop();
      count++;
      for (const [dc, dr] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nc = c + dc, nr = rr + dr;
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
        const k = key(nc, nr);
        if (seen[k]) continue;
        if (!W(fromCell(nc), fromCell(nr))) continue;
        seen[k] = 1;
        q.push([nc, nr]);
      }
    }
    const reachable = (x, y) => {
      // nearest reachable cell within 24px
      for (let rad = 0; rad <= 3; rad++) {
        for (let dc = -rad; dc <= rad; dc++) {
          for (let dr = -rad; dr <= rad; dr++) {
            const c = toCell(x) + dc, rr = toCell(y) + dr;
            if (c < 0 || rr < 0 || c >= cols || rr >= rows) continue;
            if (seen[key(c, rr)]) return true;
          }
        }
      }
      return false;
    };

    // collect landmark probes
    const probes = [];
    const spots = window.__isle.__podiums ? window.__isle.__podiums() : null;
    if (spots) {
      for (const s of spots) {
        for (const d of [70, 90, 110]) {
          const ang = Math.atan2(984 - s.y, 980 - s.x);
          probes.push({
            name: 'podium:' + s.id + '@' + d,
            x: s.x + Math.cos(ang) * d,
            y: s.y + Math.sin(ang) * d,
          });
        }
      }
    }
    const extra = window.__isle.__landmarks ? window.__isle.__landmarks() : [];
    for (const l of extra) probes.push(l);

    const failed = probes.filter((p) => !reachable(p.x, p.y)).map((p) => ({ n: p.name, x: Math.round(p.x), y: Math.round(p.y) }));

    return {
      cellsReached: count,
      areaPx: count * CELL * CELL,
      probes: probes.length,
      failed,
      walkableAt: probes.map((p) => [p.name, W(p.x, p.y)]).filter((x) => !x[1]).map((x) => x[0]),
    };
  })()`,
  returnByValue: true,
  awaitPromise: true,
});
console.log(JSON.stringify(r.result.value, null, 2));
if (logs.length) console.log('LOGS:\n' + logs.join('\n'));
ws.close();
chrome.kill();
process.exit(0);
