/* ═══════════════════════════════════════════
   THEME
   ═══════════════════════════════════════════ */
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
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
});

/* ═══════════════════════════════════════════
   PARTICLES
   ═══════════════════════════════════════════ */
(function initParticles() {
  const canvas = document.getElementById('particles');
  const ctx = canvas.getContext('2d');
  let w, h, particles = [];

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const max = 60;
  for (let i = 0; i < max; i++) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 2 + 0.6,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      opacity: Math.random() * 0.5 + 0.2,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const color = isLight ? '108, 92, 231' : '168, 139, 250';

    particles.forEach((p, i) => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${color}, ${p.opacity})`;
      ctx.fill();

      for (let j = i + 1; j < particles.length; j++) {
        const q = particles[j];
        const dx = p.x - q.x, dy = p.y - q.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = `rgba(${color}, ${0.08 * (1 - dist / 120)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    });

    requestAnimationFrame(draw);
  }
  draw();
})();

/* ═══════════════════════════════════════════
   TYPEWRITER
   ═══════════════════════════════════════════ */
(function initTypewriter() {
  const el = document.getElementById('typewriter');
  const phrases = [
    'Web Developer',
    'UI/UX Enthusiast',
    'AI + ML Explorer',
    'Problem Solver',
  ];
  let phraseIdx = 0, charIdx = 0, isDeleting = false;

  function type() {
    const current = phrases[phraseIdx];
    if (!isDeleting) {
      el.textContent = current.substring(0, charIdx + 1);
      charIdx++;
      if (charIdx === current.length) {
        setTimeout(() => { isDeleting = true; type(); }, 2000);
        return;
      }
    } else {
      el.textContent = current.substring(0, charIdx - 1);
      charIdx--;
      if (charIdx === 0) {
        isDeleting = false;
        phraseIdx = (phraseIdx + 1) % phrases.length;
      }
    }
    setTimeout(type, isDeleting ? 50 : 80);
  }
  type();
})();

/* ═══════════════════════════════════════════
   SCROLL REVEAL
   ═══════════════════════════════════════════ */
(function initReveal() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
})();

/* ═══════════════════════════════════════════
   NAVBAR SCROLL + ACTIVE LINK
   ═══════════════════════════════════════════ */
(function initNavbar() {
  const navbar = document.getElementById('navbar');
  const sections = document.querySelectorAll('section[id]');
  const links = document.querySelectorAll('.nav-links a[href^="#"]');

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);

    let current = '';
    sections.forEach(s => {
      const top = s.offsetTop - 120;
      if (window.scrollY >= top) current = s.getAttribute('id');
    });
    links.forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === `#${current}`);
    });
  });
})();

/* ═══════════════════════════════════════════
   HAMBURGER
   ═══════════════════════════════════════════ */
(function initHamburger() {
  const btn = document.getElementById('hamburger');
  const nav = document.querySelector('.nav-links');
  btn.addEventListener('click', () => {
    btn.classList.toggle('open');
    nav.classList.toggle('open');
  });
  nav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      btn.classList.remove('open');
      nav.classList.remove('open');
    });
  });
})();

/* ═══════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════ */
function formatDate(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

const langColors = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5',
  Java: '#b07219', 'C#': '#178600', 'C++': '#f34b7d', C: '#555555',
  Go: '#00ADD8', Rust: '#dea584', Ruby: '#701516', PHP: '#4F5D95',
  Swift: '#F05138', Kotlin: '#A97BFF', Dart: '#00B4AB',
  HTML: '#e34c26', CSS: '#563d7c', Shell: '#89e051',
  Vue: '#41b883', Svelte: '#ff3e00', Blade: '#fb503b',
};

function langColor(lang) { return langColors[lang] || '#8b949e'; }

function esc(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ═══════════════════════════════════════════
   FETCH & RENDER PROFILE + REPOS
   ═══════════════════════════════════════════ */
async function fetchData() {
  const build = document.documentElement.dataset.build || '0';
  const res = await fetch(`data.json?v=${build}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function renderProfileCard(p) {
  const card = document.getElementById('about-profile-card');
  document.getElementById('about-skeleton').style.display = 'none';
  card.innerHTML = `
    <div class="profile-info">
      <a href="${p.html_url}" target="_blank" rel="noopener">
        <img class="profile-pic" src="${p.avatar_url}&s=200" alt="${p.login}" loading="lazy" width="100" height="100">
      </a>
      <div class="pi-name">${esc(p.name || p.login)}</div>
      <div class="pi-login">@${p.login}</div>
      <div class="profile-stats-row">
        <div><span>${p.public_repos}</span> Repos</div>
        <div><span>${p.followers}</span> Followers</div>
        <div><span>${p.following}</span> Following</div>
      </div>
    </div>
  `;
}

function renderRepos(repos) {
  const grid = document.getElementById('repos-grid');

  if (!repos.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:40px;">
      No featured projects yet. Add the <strong>featured</strong> topic to a public repository, then run <code>node build.js</code>.
    </div>`;
    return;
  }

  grid.innerHTML = '';
  repos.forEach((r, i) => {
    const card = document.createElement('div');
    card.className = 'repo-card';
    card.style.transitionDelay = `${i * 0.05}s`;

    card.innerHTML = `<div class="repo-name">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 010-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 11-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8z"/></svg>
      <a href="${r.html_url}" target="_blank" rel="noopener">${esc(r.name)}</a>
    </div>
    <p class="repo-desc">${esc(r.description || 'No description')}</p>
    <div class="repo-meta">
      ${r.language ? `<span class="repo-lang"><span class="repo-lang-dot" style="background:${langColor(r.language)}"></span>${esc(r.language)}</span>` : ''}
      <span class="repo-stars">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.751.751 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"/></svg>
        ${r.stargazers_count}
      </span>
      <span class="repo-updated">${formatDate(r.updated_at)}</span>
    </div>
    <div class="repo-topics">${(r.topics || []).map(t => `<span class="topic-tag">${esc(t)}</span>`).join('')}</div>
    <div class="repo-buttons">
      <a href="${r.html_url}" target="_blank" rel="noopener" class="btn btn-primary">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
        GitHub
      </a>
      ${r.homepage ? `<a href="${r.homepage}" target="_blank" rel="noopener" class="btn btn-outline">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        Live Demo
      </a>` : ''}
    </div>`;

    grid.appendChild(card);
    requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add('visible')));
  });
}

/* ═══════════════════════════════════════════
   RESUME MODAL
   ═══════════════════════════════════════════ */
(function initResumeModal() {
  const overlay = document.getElementById('resume-modal');
  const content = document.getElementById('modal-content');
  const triggers = ['resume-btn', 'footer-resume-btn'];

  const resumeHTML = `
    <h2>Karl Lynuz B. Rapada</h2>
    <p class="modal-sub">
      Web Developer &middot; Marikina City, Philippines<br>
      <a href="mailto:karlrapada@gmail.com">karlrapada@gmail.com</a> &middot; +63 921 746 8502<br>
      <a href="https://www.linkedin.com/in/karl-rapada-88310316a/" target="_blank" rel="noopener">LinkedIn</a> &middot; <a href="https://github.com/karlrapada21" target="_blank" rel="noopener">GitHub</a>
    </p>

    <h3>Education</h3>
    <p><strong>BS Information Technology</strong> — IETI College of Science and Technology, Marikina<br>Graduated June 2026 &middot; Dean's Lister</p>
    <div class="modal-tag-row">
      <span class="tag">Web Development</span><span class="tag">Mobile App Development</span><span class="tag">Database Systems</span><span class="tag">Software Engineering</span><span class="tag">UI/UX Design</span><span class="tag">Machine Learning</span>
    </div>
    <p><em>Capstone:</em> Skin Lesions Detection App Using AI and CNNs</p>

    <h3>Experience</h3>
    <p><strong>IT Intern (Web Developer)</strong> — Knowles Training Institute, Singapore<br><em>Jan – Apr 2026</em></p>
    <ul>
      <li>Built and maintained responsive web apps (HTML, CSS, JavaScript, SQL)</li>
      <li>Applied UI/UX principles to improve internal tools and user workflows</li>
      <li>Integrated CNN-based image classification into a web prototype</li>
      <li>Recognized for clean code, deadlines, and positive feedback from IT lead</li>
    </ul>
    <p><strong>Freelance Web Developer</strong> — Self-Employed<br><em>2024 – Present</em></p>
    <ul>
      <li>Built custom responsive websites for small businesses and individuals</li>
      <li>Ensured cross-browser compatibility and mobile responsiveness</li>
      <li>Delivered projects within tight deadlines with post-launch support</li>
    </ul>

    <h3>Projects</h3>
    <p><strong>SkinLesionAI</strong> — Flask, PyTorch, SQLite, Bootstrap, OpenCV, Grad-CAM++</p>
    <ul><li>Medical-grade web app classifying 8 skin lesion types (ResNeXt50, 85% accuracy)</li></ul>
    <p><strong>BITSI Dispatch</strong> — Laravel 12, Livewire 3, Tailwind CSS, MySQL, Semaphore API</p>
    <ul><li>Live dispatch board with auto-refresh, driver attendance, SMS alerts, PMS alerts</li></ul>
    <p><strong>Intern Management System</strong> — React, Vite, Tailwind CSS</p>
    <ul><li>All-in-one intern tracking with attendance, tasks, and role-based access</li></ul>

    <h3>Certificates</h3>
    <p>CCNA 1–3 &middot; TOPCIT Level 3 &middot; NCII CSS & ICT &middot; Python Essentials 1–2 &middot; CompTIA A+</p>
  `;

  function open() {
    content.innerHTML = resumeHTML;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  triggers.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', e => { e.preventDefault(); open(); });
  });

  document.getElementById('modal-close').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && overlay.classList.contains('open')) close(); });
})();

/* ═══════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════ */
async function init() {
  try {
    const data = await fetchData();
    renderProfileCard(data.profile);
    renderRepos(data.repos);
  } catch (err) {
    console.error('Failed to load portfolio data:', err);
  }
}

init();
