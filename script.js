/* ── Configuration ── */
const GITHUB_USERNAME = 'JoeMama'; // Change this to your GitHub username

/* ── Theme ── */
(function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
  } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();

document.getElementById('theme-toggle').addEventListener('click', () => {
  const root = document.documentElement;
  const current = root.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
});

/* ── Helpers ── */
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  if (months < 12) return `${months}mo ago`;
  return `${years}y ago`;
}

const langColors = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5',
  Java: '#b07219', 'C#': '#178600', 'C++': '#f34b7d', C: '#555555',
  Go: '#00ADD8', Rust: '#dea584', Ruby: '#701516', PHP: '#4F5D95',
  Swift: '#F05138', Kotlin: '#A97BFF', Dart: '#00B4AB',
  HTML: '#e34c26', CSS: '#563d7c', Shell: '#89e051',
  Vue: '#41b883', Svelte: '#ff3e00', Lua: '#000080',
};

function langColor(lang) {
  return langColors[lang] || '#8b949e';
}

/* ── API ── */
const API = 'https://api.github.com';

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 403 && res.headers.get('X-RateLimit-Remaining') === '0') {
      throw new Error('API rate limit exceeded. Try again later.');
    }
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

async function fetchProfile(username) {
  return fetchJSON(`${API}/users/${username}`);
}

async function fetchRepos(username) {
  const repos = [];
  let page = 1;

  while (page <= 5) {
    const data = await fetchJSON(
      `${API}/users/${username}/repos?sort=updated&per_page=100&page=${page}`
    );
    if (data.length === 0) break;
    repos.push(...data);
    page++;
  }

  return repos;
}

/* ── Render ── */
function renderProfile(profile) {
  const section = document.getElementById('profile');
  section.innerHTML = `
    <div class="profile-card fade-in visible">
      <a href="${profile.html_url}" target="_blank" rel="noopener">
        <img class="profile-avatar" src="${profile.avatar_url}&s=240" alt="${profile.login}" loading="lazy">
      </a>
      <div class="profile-name">${escapeHTML(profile.name || profile.login)}</div>
      <div class="profile-login">@${profile.login}</div>
      ${profile.bio ? `<p class="profile-bio">${escapeHTML(profile.bio)}</p>` : ''}
      <div class="profile-stats">
        <div class="stat-item">
          <span class="stat-value">${profile.public_repos}</span>
          <span class="stat-label">Repos</span>
        </div>
        <a href="${profile.html_url}?tab=followers" target="_blank" rel="noopener" class="stat-item">
          <span class="stat-value">${profile.followers}</span>
          <span class="stat-label">Followers</span>
        </a>
        <a href="${profile.html_url}?tab=following" target="_blank" rel="noopener" class="stat-item">
          <span class="stat-value">${profile.following}</span>
          <span class="stat-label">Following</span>
        </a>
      </div>
    </div>
  `;
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderRepos(repos) {
  const grid = document.querySelector('.repos-grid');
  const title = document.querySelector('.section-title');

  if (repos.length === 0) {
    title.textContent = 'Featured Projects';
    grid.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        <p>No featured projects yet. Add the <strong>featured</strong> topic to a public repository to showcase it here.</p>
      </div>
    `;
    return;
  }

  title.textContent = `Featured Projects (${repos.length})`;
  grid.innerHTML = '';

  repos.forEach((repo, i) => {
    const card = document.createElement('div');
    card.className = 'repo-card';
    card.style.transitionDelay = `${i * 0.06}s`;

    card.innerHTML = `
      <div class="repo-name">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 010-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 11-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8z"/></svg>
        <a href="${repo.html_url}" target="_blank" rel="noopener">${escapeHTML(repo.name)}</a>
        ${repo.visibility === 'public' && !repo.archived ? '' : `<span class="repo-visibility">${repo.archived ? 'archived' : repo.visibility}</span>`}
      </div>
      <p class="repo-desc">${escapeHTML(repo.description || 'No description')}</p>
      <div class="repo-meta">
        ${repo.language ? `
          <span class="repo-lang">
            <span class="repo-lang-dot" style="background:${langColor(repo.language)}"></span>
            ${escapeHTML(repo.language)}
          </span>
        ` : ''}
        <span class="repo-stars">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.751.751 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"/></svg>
          ${repo.stargazers_count}
        </span>
        <span class="repo-updated">${formatDate(repo.updated_at)}</span>
      </div>
      <div class="repo-topics">
        ${(repo.topics || []).map(t => `<span class="topic-tag">${escapeHTML(t)}</span>`).join('')}
      </div>
      <div class="repo-buttons">
        <a href="${repo.html_url}" target="_blank" rel="noopener" class="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
          GitHub
        </a>
        ${repo.homepage ? `
          <a href="${repo.homepage}" target="_blank" rel="noopener" class="btn btn-outline">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Live Demo
          </a>
        ` : ''}
      </div>
    `;

    grid.appendChild(card);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        card.classList.add('visible');
      });
    });
  });
}

function renderError(msg) {
  document.getElementById('profile').innerHTML = `
    <div class="error-message">
      <h3>Something went wrong</h3>
      <p>${escapeHTML(msg)}</p>
    </div>
  `;
  document.querySelector('.repos-grid').innerHTML = '';
  document.querySelector('.section-title').textContent = 'Featured Projects';
}

/* ── Main ── */
async function init() {
  try {
    const profile = await fetchProfile(GITHUB_USERNAME);
    renderProfile(profile);
  } catch (err) {
    renderError(err.message);
    return;
  }

  try {
    const allRepos = await fetchRepos(GITHUB_USERNAME);
    const featured = allRepos
      .filter(r => !r.fork && !r.archived)
      .filter(r => (r.topics || []).map(t => t.toLowerCase()).includes('featured'))
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

    renderRepos(featured);
  } catch (err) {
    renderError(err.message);
  }
}

/* ── Intersection Observer for fade-in animations ── */
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

/* ── Go ── */
init();
