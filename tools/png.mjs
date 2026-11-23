/**
 * Dev-only: minimal PNG decoder (no deps) so screenshots can be inspected
 * as text — colour statistics, region maps, and ASCII art.
 */
import { inflateSync } from 'node:zlib';
import { readFileSync } from 'node:fs';

export function decodePng(path) {
  const buf = readFileSync(path);
  let pos = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (bitDepth !== 8) throw new Error('unsupported bit depth ' + bitDepth);
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : 0;
  if (!channels) throw new Error('unsupported colour type ' + colorType);

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);

  const paeth = (a, b, c) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= channels ? prev[x - channels] : 0;
      let v = line[x];
      switch (filter) {
        case 1: v += a; break;
        case 2: v += b; break;
        case 3: v += (a + b) >> 1; break;
        case 4: v += paeth(a, b, c); break;
      }
      cur[x] = v & 255;
    }
  }

  const px = (x, y) => {
    const i = y * stride + x * channels;
    return channels === 1 ? [out[i], out[i], out[i]] : [out[i], out[i + 1], out[i + 2]];
  };
  return { width, height, channels, data: out, stride, px };
}

export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

/** Coarse colour-class grid, e.g. sky / grass / sand / water / foliage. */
export function classify(r, g, b) {
  const [h, s, l] = rgbToHsl(r, g, b);
  const deg = h * 360;
  if (b > r && b > g && l > 0.35 && s > 0.08) return 'water';
  if (deg > 150 && deg < 260 && s > 0.1) return 'water';
  if (l > 0.86 && s < 0.22) return 'white';
  if (deg > 60 && deg < 175 && s > 0.12) return 'green';
  if (deg >= 30 && deg <= 60 && s > 0.12 && l > 0.5) return 'sand';
  if (deg < 30 || deg > 330) return s > 0.25 ? 'warm' : 'grey';
  if (deg > 260 && deg < 330) return 'pink';
  return 'other';
}

const SCRATCH = [' ', '.', ':', '-', '=', '+', '*', '#', '%', '@'];

export function asciiArt(img, cols = 72, rows = 30) {
  const cw = img.width / cols;
  const ch = img.height / rows;
  const lines = [];
  for (let ry = 0; ry < rows; ry++) {
    let line = '';
    for (let rx = 0; rx < cols; rx++) {
      let sum = 0;
      let n = 0;
      for (let y = Math.floor(ry * ch); y < Math.floor((ry + 1) * ch); y += 2) {
        for (let x = Math.floor(rx * cw); x < Math.floor((rx + 1) * cw); x += 2) {
          const [r, g, b] = img.px(x, y);
          sum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
          n++;
        }
      }
      const v = sum / Math.max(1, n) / 255;
      line += SCRATCH[Math.min(SCRATCH.length - 1, Math.floor(v * SCRATCH.length))];
    }
    lines.push(line);
  }
  return lines.join('\n');
}

/** Letter map: each cell is the dominant colour class. */
export function classMap(img, cols = 60, rows = 24) {
  const letter = {
    water: '~',
    green: 'g',
    sand: 's',
    white: 'W',
    warm: 'o',
    pink: 'p',
    grey: 'x',
    other: '?',
  };
  const cw = img.width / cols;
  const ch = img.height / rows;
  const lines = [];
  const totals = {};
  for (let ry = 0; ry < rows; ry++) {
    let line = '';
    for (let rx = 0; rx < cols; rx++) {
      const counts = {};
      for (let y = Math.floor(ry * ch); y < Math.floor((ry + 1) * ch); y += 3) {
        for (let x = Math.floor(rx * cw); x < Math.floor((rx + 1) * cw); x += 3) {
          const [r, g, b] = img.px(x, y);
          const k = classify(r, g, b);
          counts[k] = (counts[k] || 0) + 1;
        }
      }
      const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      const k = best ? best[0] : 'other';
      totals[k] = (totals[k] || 0) + 1;
      line += letter[k] || '?';
    }
    lines.push(line);
  }
  return { map: lines.join('\n'), totals };
}

/** Histogram of distinct colour clusters, to check nothing is a flat wash. */
export function palette(img, bins = 12) {
  const counts = new Map();
  const step = Math.max(1, Math.floor(Math.sqrt((img.width * img.height) / 40000)));
  for (let y = 0; y < img.height; y += step) {
    for (let x = 0; x < img.width; x += step) {
      const [r, g, b] = img.px(x, y);
      const k = `${r >> 4},${g >> 4},${b >> 4}`;
      counts.set(k, (counts.get(k) || 0) + 1);
    }
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, bins)
    .map(([k, n]) => {
      const [r, g, b] = k.split(',').map(Number);
      const hex = '#' + [r, g, b].map((v) => (v * 17).toString(16).padStart(2, '0')).join('');
      return { hex, pct: ((n / total) * 100).toFixed(1) };
    });
}

/** Average colour of a horizontal band, to sanity-check sky→ground gradient. */
export function bands(img, n = 8) {
  const out = [];
  const bh = img.height / n;
  for (let i = 0; i < n; i++) {
    let r = 0, g = 0, b = 0, c = 0;
    for (let y = Math.floor(i * bh); y < Math.floor((i + 1) * bh); y += 2) {
      for (let x = 0; x < img.width; x += 4) {
        const p = img.px(x, y);
        r += p[0]; g += p[1]; b += p[2]; c++;
      }
    }
    out.push({
      band: i,
      hex: '#' + [r / c, g / c, b / c].map((v) => Math.round(v).toString(16).padStart(2, '0')).join(''),
    });
  }
  return out;
}
