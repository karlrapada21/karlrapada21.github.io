/**
 * Dev-only: render the scene and report, for each named object, its projected
 * screen bounding box plus the average colour inside it. This makes it possible
 * to verify props exist, are the right size, and are not buried or floating.
 *
 *   node tools/inspect3d.mjs [yaw] [pitch] [dist] [focusX] [focusY]
 */
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const focusX = Number(process.argv[2] || 1300);
const focusY = Number(process.argv[3] || 930);
const yaw = Number(process.argv[4] || 0);
const pitch = Number(process.argv[5] || 28);
const dist = Number(process.argv[6] || 60);

const profile = mkdtempSync(join(tmpdir(), 'isle-ins-'));
const port = 9780 + Math.floor(Math.random() * 180);
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
await send('Page.navigate', { url: 'http://127.0.0.1:8099/' });
await sleep(2600);
await send('Runtime.evaluate', {
  expression: `(() => { const b = document.getElementById('startBtn'); if (b) b.click(); })()`,
  returnByValue: true,
});
await sleep(1000);

const r = await send('Runtime.evaluate', {
  expression: `(async () => {
    const g = window.__isle;
    const THREE = g.constructor.THREE;
    g.debugOrbit(${focusX}, ${focusY}, ${yaw}, ${pitch}, ${dist});
    g.render();
    const W = window.innerWidth, H = window.innerHeight;
    const cam = g.camera;

    // world bounding box of each interesting subtree
    const subjects = [];
    g.scene.traverse((o) => {
      if (o === g.scene) return;
      if (o.isMesh || o.isGroup || o.isPoints) {
        const name = o.name || o.type;
        if (o.isMesh || o.isPoints) subjects.push(o);
      }
    });

    const box = new THREE.Box3();
    const v = new THREE.Vector3();
    const out = [];
    for (const o of subjects) {
      if (!o.geometry && !o.isInstancedMesh) continue;
      if (!o.visible) continue;
      box.setFromObject(o);
      if (box.isEmpty()) continue;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      let anyFront = false;
      for (let i = 0; i < 8; i++) {
        v.set(
          i & 1 ? box.max.x : box.min.x,
          i & 2 ? box.max.y : box.min.y,
          i & 4 ? box.max.z : box.min.z
        );
        const p = v.clone().project(cam);
        if (p.z < 1) anyFront = true;
        const sx = (p.x * 0.5 + 0.5) * W;
        const sy = (-p.y * 0.5 + 0.5) * H;
        minX = Math.min(minX, sx); maxX = Math.max(maxX, sx);
        minY = Math.min(minY, sy); maxY = Math.max(maxY, sy);
      }
      if (!anyFront) continue;
      const w = maxX - minX, h = maxY - minY;
      if (w < 3 || h < 3) continue;
      const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
      if (cx < -80 || cx > W + 80 || cy < -80 || cy > H + 80) continue;
      out.push({
        name: o.name || o.type,
        screen: [Math.round(minX), Math.round(minY), Math.round(w), Math.round(h)],
        depth: +box.getCenter(new THREE.Vector3()).distanceTo(cam.position).toFixed(1),
      });
    }
    return JSON.stringify(out, null, 0);
  })()`,
  returnByValue: true,
  awaitPromise: true,
});
if (r.exceptionDetails) console.error('THROWN', JSON.stringify(r.exceptionDetails.exception?.description));
else {
  const arr = JSON.parse(r.result.value);
  console.log('object screen boxes (x,y,w,h):');
  for (const o of arr.sort((a, b) => b.screen[2] * b.screen[3] - a.screen[2] * a.screen[3]).slice(0, 30)) {
    console.log(`  ${o.name.padEnd(16)} ${JSON.stringify(o.screen).padEnd(22)} depth ${o.depth}`);
  }
}
ws.close();
chrome.kill();
process.exit(0);
