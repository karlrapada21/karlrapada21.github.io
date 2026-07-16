/* ── Build Script ──
 * Generates data.json by fetching GitHub profile + repos in one pass.
 * Run: node build.js
 * Set GITHUB_USERNAME below, or pass: node build.js <username>
 */

const GITHUB_USERNAME = process.argv[2] || 'karlrapada21';
const API = 'https://api.github.com';

async function fetchJSON(url) {
  const res = await fetch(url);
  if (res.status === 403 && res.headers.get('X-RateLimit-Remaining') === '0') {
    throw new Error('GitHub API rate limit exceeded. Try again later or add a token via GITHUB_TOKEN env var.');
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json();
}

async function main() {
  console.log(`Building data for "${GITHUB_USERNAME}"...`);

  const [profile, allRepos] = await Promise.all([
    fetchJSON(`${API}/users/${GITHUB_USERNAME}`),
    (async () => {
      const repos = [];
      for (let page = 1; page <= 5; page++) {
        const data = await fetchJSON(
          `${API}/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=100&page=${page}`
        );
        if (data.length === 0) break;
        repos.push(...data);
      }
      return repos;
    })(),
  ]);

  const featured = allRepos
    .filter(r => !r.fork && !r.archived)
    .filter(r => (r.topics || []).map(t => t.toLowerCase()).includes('featured'))
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .map(r => ({
      name: r.name,
      description: r.description,
      html_url: r.html_url,
      homepage: r.homepage,
      language: r.language,
      stargazers_count: r.stargazers_count,
      topics: r.topics,
      updated_at: r.updated_at,
    }));

  const data = {
    profile: {
      login: profile.login,
      name: profile.name,
      avatar_url: profile.avatar_url,
      html_url: profile.html_url,
      bio: profile.bio,
      public_repos: profile.public_repos,
      followers: profile.followers,
      following: profile.following,
    },
    repos: featured,
    updated_at: new Date().toISOString(),
  };

  const fs = await import('node:fs');
  fs.writeFileSync('data.json', JSON.stringify(data, null, 2), 'utf-8');

  const buildTimestamp = data.updated_at;
  let html = fs.readFileSync('index.html', 'utf-8');
  html = html.replace(/data-build="[^"]*"/, `data-build="${buildTimestamp}"`);
  fs.writeFileSync('index.html', html, 'utf-8');

  console.log(`Done — ${featured.length} featured repos written to data.json (build: ${buildTimestamp})`);
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
