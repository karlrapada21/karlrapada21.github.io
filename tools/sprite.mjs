/**
 * Dev-only: render the villager alone at high resolution and print a
 * row-by-row colour profile so sprite proportions can be verified without
 * looking at the image.
 *   node tools/sprite.mjs [outDir]
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const url = process.argv[2] || 'http://127.0.0.1:8099/';
const outDir = process.argv[3] || 'shots';
const profile = mkdtempSync(join(tmpdir(), 'isle-sprite-'));
const port = 9600 + Math.floor(Math.random() * 200);
const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  '--window-size=600,800',
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
await send('Page.navigate', { url });
await sleep(2600);

const out = await send('Runtime.evaluate', {
  expression: `(async () => {
    const V = await import('/js/villager.js');
    const S = 5;
    const W = 360, H = 540;
    const dirs = ['down', 'up', 'left', 'right'];
    const res = { bbox: {}, profiles: {}, sheets: [] };
    const hex = (k) => '#' + [ (k>>8)&15, (k>>4)&15, k&15 ].map(v => (v*17).toString(16).padStart(2,'0')).join('');

    for (const dir of dirs) {
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.translate(W / 2, H - 40);
      ctx.scale(S, S);
      V.drawVillager(ctx, { x: 0, y: 0, dir, t: 0.4, walk: 0.0, look: V.DEFAULT_LOOK, blink: 0 });
      ctx.restore();

      const d = ctx.getImageData(0, 0, W, H).data;
      const isBg = (i) => Math.abs(d[i]-240) < 6 && Math.abs(d[i+1]-240) < 6 && Math.abs(d[i+2]-240) < 6;
      let minX = 1e9, minY = 1e9, maxX = -1, maxY = -1;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        if (d[i+3] > 12 && !isBg(i)) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
      res.bbox[dir] = { w: maxX-minX+1, h: maxY-minY+1 };
      const prof = [];
      const bands = 16;
      for (let b = 0; b < bands; b++) {
        const y0 = minY + Math.floor((maxY-minY+1) * b / bands);
        const y1 = minY + Math.floor((maxY-minY+1) * (b+1) / bands);
        const acc = {};
        for (let y = y0; y < y1; y++) for (let x = minX; x <= maxX; x++) {
          const i = (y * W + x) * 4;
          if (d[i+3] < 12 || isBg(i)) continue;
          const k = ((d[i]>>4)<<8) | ((d[i+1]>>4)<<4) | (d[i+2]>>4);
          acc[k] = (acc[k] || 0) + 1;
        }
        const top = Object.entries(acc).sort((a,b)=>b[1]-a[1]).slice(0,3)
          .map(([k,n]) => hex(+k)+':'+n);
        prof.push({ y: y0, top: top.join(' ') });
      }
      res.profiles[dir] = prof;
      res.sheets.push({ dir, png: c.toDataURL('image/png') });
    }
    return JSON.stringify(res);
  })()`,
  returnByValue: true,
  awaitPromise: true,
});

const parsed = JSON.parse(out.result.value);
for (const [dir, bb] of Object.entries(parsed.bbox)) {
  console.log(`\n== ${dir}  bbox ${bb.w}x${bb.h} ==`);
  for (const band of parsed.profiles[dir]) console.log(`  y${String(band.y).padStart(3)}  ${band.top}`);
}
for (const sheet of parsed.sheets) {
  writeFileSync(join(outDir, `sprite-${sheet.dir}.png`), Buffer.from(sheet.png.split(',')[1], 'base64'));
}
console.log('\nwrote sprite sheets to ' + outDir);
ws.close();
chrome.kill();
process.exit(0);
