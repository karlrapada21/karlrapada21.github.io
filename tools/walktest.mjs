/**
 * Dev-only functional test: autopilot the villager along a route and
 * report where it gets stuck.
 *   node tools/walktest.mjs
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const url = process.argv[2] || 'http://127.0.0.1:8099/';
const profile = mkdtempSync(join(tmpdir(), 'isle-walk-'));
const port = 9700 + Math.floor(Math.random() * 200);

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

async function wsUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/list`);
      const l = await r.json();
      const p = l.find((t) => t.type === 'page');
      if (p?.webSocketDebuggerUrl) return p.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error('no target');
}

const ws = new WebSocket(await wsUrl());
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
    logs.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  } else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    logs.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
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
await sleep(2500);

const evalJs = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};

// start the game
await evalJs(`document.getElementById('startBtn').click(); 'ok'`);
await sleep(600);

const result = await evalJs(`(() => {
  const g = window.__isle;
  const log = [];
  const step = (x, y) => { g.player.x = x; g.player.y = y; };

  // 1. walkability of key points
  const pts = {
    spawn: [806, 760],
    bridgeNorth: [830, 800],
    bridgeMid: [830, 940],
    bridgeSouth: [830, 1090],
    pathToPlaza: [900, 1180],
    plazaEntry: [960, 1080],
    plazaCenter: [980, 1362],
    podiumWho: [980, 1105],
    podiumProjects: [855, 1598],
    resc: [1520, 690],
    campsite: [1430, 1750],
  };
  const walk = {};
  for (const [k, [x, y]] of Object.entries(pts)) {
    walk[k] = g.constructor.isWalkable ? null : null;
  }

  // do a real physics walk from spawn to the plaza using the game's own collision
  const path = [
    [806, 760], [838, 800], [834, 870], [832, 940], [832, 1010], [836, 1080],
    [860, 1140], [900, 1190], [940, 1270], [965, 1330], [980, 1362],
  ];
  let cursor = 0;
  let stuckAt = null;
  let simX = 806, simY = 760;
  const speed = 210 / 60;
  let frames = 0;
  while (cursor < path.length && frames < 60 * 30) {
    frames++;
    const [tx, ty] = path[cursor];
    const dx = tx - simX, dy = ty - simY;
    const d = Math.hypot(dx, dy);
    if (d < 4) { cursor++; continue; }
    const nx = simX + (dx / d) * speed;
    const ny = simY + (dy / d) * speed;
    let movedX = false, movedY = false;
    if (window.__isle.__walkable(nx, simY)) { simX = nx; movedX = true; }
    if (window.__isle.__walkable(simX, ny)) { simY = ny; movedY = true; }
    if (!movedX && !movedY) {
      // try sliding perpendicular
      const px = simX + (dy / d) * speed;
      const py = simY - (dx / d) * speed;
      if (window.__isle.__walkable(px, simY)) { simX = px; }
      else if (window.__isle.__walkable(simX, py)) { simY = py; }
      else { stuckAt = { tgt: [tx, ty], at: [Math.round(simX), Math.round(simY)], cursor }; break; }
    }
  }

  return { stuckAt, reachedCursor: cursor, final: [Math.round(simX), Math.round(simY)], frames };
})()`);

console.log(JSON.stringify(result, null, 2));

// walkability map of the bridge approach corridor
const map = await evalJs(`(() => {
  const W = window.__isle.__walkable;
  let out = '';
  for (let y = 1060; y <= 1220; y += 8) {
    let row = String(y).padStart(5) + ' ';
    for (let x = 780; x <= 1000; x += 8) row += W(x, y) ? '.' : '#';
    out += row + '\\n';
  }
  return out;
})()`);
console.log(map);
if (logs.length) console.log('LOGS:\n' + logs.join('\n'));
ws.close();
chrome.kill();
process.exit(result.stuckAt ? 2 : 0);
