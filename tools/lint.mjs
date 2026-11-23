/** Dev-only: report unused imports/exports across js/*.js */
import { readFileSync, readdirSync } from 'node:fs';

const files = readdirSync('js').filter((f) => f.endsWith('.js'));
let problems = 0;

for (const f of files) {
  const src = readFileSync('js/' + f, 'utf8');
  const importBlocks = [...src.matchAll(/import\s*\{([\s\S]*?)\}\s*from\s*['"][^'"]+['"]/g)];
  const names = importBlocks.flatMap((m) =>
    m[1]
      .split(',')
      .map((s) => s.trim().split(/\s+as\s+/).pop())
      .filter(Boolean)
  );
  let body = src;
  for (const m of importBlocks) body = body.replace(m[0], '');
  const unused = names.filter((n) => {
    const re = new RegExp(`(^|[^\\w$])${n}(?![\\w])`);
    return !re.test(body);
  });
  if (unused.length) {
    console.log(`${f}: UNUSED IMPORTS -> ${unused.join(', ')}`);
    problems++;
  }

  // exported symbols that nothing else imports
  const exportsList = [...src.matchAll(/export\s+(?:const|let|function|class)\s+(\w+)/g)].map(
    (m) => m[1]
  );
  const others = files
    .filter((o) => o !== f)
    .map((o) => readFileSync('js/' + o, 'utf8'))
    .join('\n');
  const deadExports = exportsList.filter((n) => {
    if (n === 'Game' || n === 'UI' || n === 'Audio') return false;
    const re = new RegExp(`(^|[^\\w.$])${n}(?![\\w])`);
    return !re.test(others);
  });
  if (deadExports.length) console.log(`${f}: exports unused elsewhere -> ${deadExports.join(', ')}`);
}

// duplicate top-level declarations within a file
for (const f of files) {
  const src = readFileSync('js/' + f, 'utf8');
  const decls = [...src.matchAll(/^(?:export\s+)?(?:const|let|function|class)\s+(\w+)/gm)].map(
    (m) => m[1]
  );
  const seen = new Set();
  const dupes = decls.filter((d) => (seen.has(d) ? true : (seen.add(d), false)));
  if (dupes.length) {
    console.log(`${f}: DUPLICATE DECLS -> ${dupes.join(', ')}`);
    problems++;
  }
}
console.log(problems ? `\n${problems} file(s) need attention` : '\nall clean');
