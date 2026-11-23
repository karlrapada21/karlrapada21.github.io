/**
 * Dev-only: screenshot the 3D island.
 *   node tools/shot3d.mjs <out.png> [waitMs] [mode] [args...]
 *
 * mode:
 *   start            keep the title screen
 *   play             click start, then wait (default)
 *   orbit:x,y,pitch,dist    park the camera around a world point
 *
 * Env: SHOT_W, SHOT_H, SHOT_KEYS (e.g. "dddd")
 */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const out = process.argv[2] || 'shots/shot.png';
const waitMs = Number(process.argv[3] || 3500);
const mode = process.argv[4] || 'play';
const url = process.argv[5] || 'http://127.0.0.1:8099/';
const W = Number(process.env.SHOT_W || 1440);
const H = Number(process.env.SHOT_H || 900);

const profile = mkdtempSync(join(tmpdir(), 'isle3d-'));
const port = 9200 + Math.floor(Math.random() * 500);

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    `--window-size=${W},${H}`,
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--force-device-scale-factor=1',
    '--allow-file-access-from-files',
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
  console.error('no devtools target');
  chrome.kill();
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
    const d = m.params.exceptionDetails;
    logs.push(`[EXCEPTION] ${d.exception?.description || d.text}`);
  } else if (m.method === 'Runtime.consoleAPICalled') {
    const txt = m.params.args.map((a) => a.value ?? a.description ?? '').join(' ');
    logs.push(`[${m.params.type}] ${txt}`);
  } else if (m.method === 'Log.entryAdded') {
    logs.push(`[log:${m.params.entry.level}] ${m.params.entry.text}`);
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
await send('Emulation.setDeviceMetricsOverride', {
  width: W,
  height: H,
  deviceScaleFactor: 1,
  mobile: false,
});
await send('Page.navigate', { url });
await sleep(2500);

if (mode !== 'start') {
  await send('Runtime.evaluate', {
    expression: `(() => { const b = document.getElementById('startBtn'); if (b) b.click(); return 'ok'; })()`,
    returnByValue: true,
  });
  await sleep(900);
}

if (process.env.SHOT_KEYS) {
  for (const ch of process.env.SHOT_KEYS) {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: ch, text: ch });
    await sleep(90);
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ch });
    await sleep(60);
  }
}

if (mode.startsWith('orbit:')) {
  const [ox, oy, yaw, pitch, dist] = mode.slice(6).split(',').map(Number);
  const r = await send('Runtime.evaluate', {
    expression: `JSON.stringify(window.__isle.debugOrbit(${ox}, ${oy}, ${yaw ?? 0}, ${
      pitch ?? 30
    }, ${dist ?? 24}))`,
    returnByValue: true,
  });
  console.error('orbit: ' + (r.result?.value || ''));
}

await sleep(waitMs);

const shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync(out, Buffer.from(shot.data, 'base64'));

const info = await send('Runtime.evaluate', {
  expression: `JSON.stringify((() => {
    const g = window.__isle;
    if (!g) return { booted: false };
    return {
      booted: true,
      player: { x: Math.round(g.player.x), y: Math.round(g.player.y) },
      cam: { x: +g.camera.position.x.toFixed(1), y: +g.camera.position.y.toFixed(1), z: +g.camera.position.z.toFixed(1) },
      near: g.near ? (g.near.spot ? g.near.spot.id : g.near.kind) : null,
      calls: g.renderer.info.render.calls,
      tris: g.renderer.info.render.triangles,
      stats: g.props?.stats,
    };
  })())`,
  returnByValue: true,
});

if (logs.length) console.log('--- console ---\n' + logs.join('\n'));
console.log('--- state ---\n' + (info.result?.value || ''));
console.log('saved ' + out);
ws.close();
chrome.kill();
await sleep(200);
process.exit(0);
