/**
 * Headless Chrome probe. No dependencies: talks the DevTools protocol over the
 * WebSocket that is built into Node 18+.
 *
 *   node tools/qa.mjs --url http://127.0.0.1:8099 --scenario tools/scenarios/inspect.mjs
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

function findChrome() {
  for (const p of CHROME_CANDIDATES) if (existsSync(p)) return p;
  throw new Error('No Chrome/Edge found');
}

function arg(name, dflt) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : dflt;
}

class CDP {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.id = 0;
    this.pending = new Map();
    this.listeners = new Map();
    this.ready = new Promise((res, rej) => {
      this.ws.addEventListener('open', () => res());
      this.ws.addEventListener('error', (e) => rej(e));
    });
    this.ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve: r, reject: j } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) j(new Error(JSON.stringify(msg.error)));
        else r(msg.result);
        return;
      }
      if (msg.method) {
        const fns = this.listeners.get(msg.method) || [];
        for (const fn of fns) fn(msg.params);
      }
    });
  }

  on(method, fn) {
    if (!this.listeners.has(method)) this.listeners.set(method, []);
    this.listeners.get(method).push(fn);
  }

  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`timeout: ${method}`));
        }
      }, 30000);
    });
  }

  close() {
    this.ws.close();
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const url = arg('url', 'http://127.0.0.1:8099/');
  const scenarioPath = arg('scenario', 'tools/scenarios/inspect.mjs');
  const outDir = resolve(arg('out', 'tools/shots'));
  const width = Number(arg('width', 1440));
  const height = Number(arg('height', 900));
  const port = 9333 + Math.floor(Math.random() * 200);
  const profileDir = resolve(tmpdir(), `isle-qa-${port}`);

  mkdirSync(outDir, { recursive: true });
  rmSync(profileDir, { recursive: true, force: true });

  const chrome = spawn(
    findChrome(),
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profileDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--hide-scrollbars',
      '--mute-audio',
      '--enable-unsafe-swiftshader',
      '--use-angle=swiftshader',
      '--enable-features=NetworkService',
      `--window-size=${width},${height}`,
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  const logs = [];
  let page;

  try {
    // wait for the debugging endpoint
    let target = null;
    for (let i = 0; i < 100; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/json/list`);
        const list = await res.json();
        target = list.find((t) => t.type === 'page');
        if (target) break;
      } catch {
        /* not up yet */
      }
      await sleep(150);
    }
    if (!target) throw new Error('DevTools endpoint never came up');

    page = new CDP(target.webSocketDebuggerUrl);
    await page.ready;

    page.on('Runtime.consoleAPICalled', (p) => {
      const text = p.args.map((a) => a.value ?? a.description ?? a.type).join(' ');
      logs.push({ level: p.type, text });
    });
    page.on('Runtime.exceptionThrown', (p) => {
      const d = p.exceptionDetails;
      logs.push({
        level: 'exception',
        text: `${d.text} ${d.exception?.description || ''} @ ${d.url || ''}:${d.lineNumber}:${d.columnNumber}`,
      });
    });
    page.on('Log.entryAdded', (p) => {
      if (p.entry.level === 'error' || p.entry.level === 'warning') {
        logs.push({ level: `log:${p.entry.level}`, text: p.entry.text });
      }
    });

    await page.send('Runtime.enable');
    await page.send('Log.enable');
    await page.send('Page.enable');
    await page.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    });

    const driver = {
      url,
      width,
      height,
      logs,
      page,
      async goto(u = url) {
        await page.send('Page.navigate', { url: u });
        await sleep(400);
      },
      async wait(ms) {
        await sleep(ms);
      },
      async eval(expression) {
        const res = await page.send('Runtime.evaluate', {
          expression,
          awaitPromise: true,
          returnByValue: true,
        });
        if (res.exceptionDetails) {
          throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
        }
        return res.result.value;
      },
      async shot(name) {
        const res = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        const file = resolve(outDir, `${name}.png`);
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, Buffer.from(res.data, 'base64'));
        return file;
      },
      async hover(x, y) {
        await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, buttons: 0 });
      },
      async click(x, y) {
        await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, buttons: 0 });
        await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
        await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 });
      },
      async dragTo(x0, y0, x1, y1, steps = 8) {
        await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: x0, y: y0, button: 'left', buttons: 1, clickCount: 1 });
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          await page.send('Input.dispatchMouseEvent', {
            type: 'mouseMoved',
            x: x0 + (x1 - x0) * t,
            y: y0 + (y1 - y0) * t,
            buttons: 1,
          });
          await sleep(16);
        }
        await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x1, y: y1, button: 'left', buttons: 0, clickCount: 1 });
      },
      async key(key, code) {
        const map = {
          Enter: { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 },
          Escape: { key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 },
          ArrowDown: { key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40 },
          ArrowUp: { key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 },
          ArrowRight: { key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 },
          ArrowLeft: { key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 },
          Tab: { key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 },
        };
        const k = map[key] || { key, code: code || key };
        await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...k });
        await page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...k });
      },
      async resize(w, h) {
        await page.send('Emulation.setDeviceMetricsOverride', {
          width: w,
          height: h,
          deviceScaleFactor: 1,
          mobile: w < 640,
        });
        await sleep(300);
      },
    };

    const mod = await import(pathToFileURL(resolve(scenarioPath)).href);
    await mod.default(driver);

    const errors = logs.filter(
      (l) => l.level === 'error' || l.level === 'exception' || l.level === 'log:error'
    );

    if (logs.length) {
      console.log('--- console ---');
      for (const l of logs) console.log(`[${l.level}] ${l.text.slice(0, 400)}`);
    }

    if (errors.length) {
      console.log(`\n${errors.length} ERROR(S)`);
      process.exitCode = 1;
    } else {
      console.log('\nno console errors');
    }
  } finally {
    try {
      page?.close();
    } catch {
      /* ignore */
    }
    chrome.kill();
    await sleep(200);
    try {
      rmSync(profileDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

main().catch((e) => {
  console.error('QA FAILED:', e.message);
  process.exitCode = 1;
});
