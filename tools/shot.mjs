/**
 * Dev-only screenshot harness.
 *   node tools/shot.mjs <url> <out.png> [waitMs] [keySequence]
 * Uses headless Chrome over CDP (no external deps).
 */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const url = process.argv[2] || 'http://127.0.0.1:8099/';
const out = process.argv[3] || 'shot.png';
const waitMs = Number(process.argv[4] || 3000);
const keys = process.argv[5] || '';
const W = Number(process.env.SHOT_W || 1440);
const H = Number(process.env.SHOT_H || 900);

const profile = mkdtempSync(join(tmpdir(), 'isle-'));
const port = 9300 + Math.floor(Math.random() * 400);

const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  `--window-size=${W},${H}`,
  '--hide-scrollbars',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-gpu',
  '--force-device-scale-factor=1',
  '--allow-file-access-from-files',
  'about:blank',
]);
chrome.stderr.on('data', () => {});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getWs() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/list`);
      const list = await r.json();
      const page = list.find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error('no devtools target');
}

function cdp(ws) {
  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    } else if (msg.method) {
      listeners.forEach((fn) => fn(msg));
    }
  });
  return {
    send(method, params = {}) {
      const mid = ++id;
      ws.send(JSON.stringify({ id: mid, method, params }));
      return new Promise((resolve, reject) => pending.set(mid, { resolve, reject }));
    },
    on(fn) {
      listeners.push(fn);
    },
  };
}

(async () => {
  const wsUrl = await getWs();
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res);
    ws.addEventListener('error', rej);
  });
  const c = cdp(ws);

  const logs = [];
  c.on((m) => {
    if (m.method === 'Runtime.consoleAPICalled') {
      logs.push(
        `[${m.params.type}] ` +
          m.params.args
            .map((a) => a.value ?? a.description ?? a.unserializableValue ?? '')
            .join(' ')
      );
    }
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      logs.push(
        `[EXCEPTION] ${d.exception?.description || d.text} @ ${d.url}:${d.lineNumber}:${d.columnNumber}`
      );
    }
    if (m.method === 'Log.entryAdded') {
      logs.push(`[log:${m.params.entry.level}] ${m.params.entry.text}`);
    }
  });
  await c.send('Runtime.enable');
  await c.send('Log.enable');
  await c.send('Page.enable');
  await c.send('Emulation.setDeviceMetricsOverride', {
    width: W,
    height: H,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await c.send('Page.navigate', { url });
  await sleep(1200);

  // dismiss the start screen if present
  if (process.env.SHOT_START === '1') {
    await sleep(waitMs);
  } else {
    await c.send('Runtime.evaluate', {
      expression: `(() => { const b = document.getElementById('startBtn'); if (b) { b.click(); return 'clicked'; } return 'no-start'; })()`,
      returnByValue: true,
    });
    await sleep(waitMs);
  }

  if (keys) {
    for (const ch of keys) {
      if (ch === '.') continue;
      const k = ch;
      await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, text: k });
      await sleep(60);
      await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k });
      await sleep(40);
    }
    await sleep(400);
  }

  if (process.env.SHOT_VIEW) {
    const [vx, vy, vz] = process.env.SHOT_VIEW.split(',').map(Number);
    const r = await c.send('Runtime.evaluate', {
      expression: `JSON.stringify(window.__isle.debugView(${vx}, ${vy}, ${vz || 0}))`,
      returnByValue: true,
    });
    console.error('view: ' + r.result.value);
    await sleep(500);
  }

  if (process.env.SHOT_DEBUG === '1') {
    await c.send('Runtime.evaluate', {
      expression: `window.__DEBUGGRID = true`,
      returnByValue: true,
    });
    await sleep(300);
  }

  const shot = await c.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(out, Buffer.from(shot.data, 'base64'));

  const info = await c.send('Runtime.evaluate', {
    expression: `JSON.stringify({
      player: window.__isle ? {x: Math.round(window.__isle.player.x), y: Math.round(window.__isle.player.y)} : null,
      cam: window.__isle ? {x: Math.round(window.__isle.camera.x), y: Math.round(window.__isle.camera.y), w: Math.round(window.__isle.camera.w), h: Math.round(window.__isle.camera.h), z: +window.__isle.camera.zoom.toFixed(3)} : null,
      near: window.__isle && window.__isle.near ? (window.__isle.near.spot ? window.__isle.near.spot.id : window.__isle.near.kind) : null,
      overlay: window.__isle ? window.__isle.overlayOpen : null,
      propCount: window.__isle ? undefined : undefined
    })`,
    returnByValue: true,
  });

  if (logs.length) console.log('--- console ---\n' + logs.join('\n'));
  console.log('--- state ---\n' + (info.result?.value || ''));
  console.log('saved ' + out);
  ws.close();
  chrome.kill();
  process.exit(0);
})().catch((e) => {
  console.error('FAILED', e.message);
  try {
    chrome.kill();
  } catch {}
  process.exit(1);
});
