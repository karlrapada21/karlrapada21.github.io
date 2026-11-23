/** Dev-only: describe a screenshot as text.   node tools/describe.mjs <png> */
import { decodePng, classMap, palette, bands, asciiArt } from './png.mjs';

const file = process.argv[2];
const img = decodePng(file);
console.log(`size ${img.width}x${img.height} channels=${img.channels}`);

console.log('\n== bands (top → bottom) ==');
for (const b of bands(img, 8)) console.log(`  band ${b.band}: ${b.hex}`);

console.log('\n== palette ==');
for (const p of palette(img, 10)) console.log(`  ${p.hex}  ${p.pct}%`);

const { map, totals } = classMap(img, 64, 26);
console.log('\n== classes ==');
const total = Object.values(totals).reduce((a, b) => a + b, 0);
for (const [k, v] of Object.entries(totals).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k}: ${((v / total) * 100).toFixed(1)}%`);
}
console.log('\n' + map);

if (process.argv[3] === 'ascii') {
  console.log('\n== ascii ==\n' + asciiArt(img, 76, 30));
}
