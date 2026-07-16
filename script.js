/* ═══════════════════════════════════════════
   THEME — dark/light (professional page)
   ═══════════════════════════════════════════ */
(function initTheme() {
  const root = document.documentElement;
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;

  const saved = localStorage.getItem('theme');
  if (saved) {
    root.setAttribute('data-theme', saved);
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    root.setAttribute('data-theme', 'dark');
  }

  toggle.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });
})();

/* ═══════════════════════════════════════════
   UTILS
   ═══════════════════════════════════════════ */
function esc(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

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
  JavaScript:'#f1e05a',TypeScript:'#3178c6',Python:'#3572A5',
  Java:'#b07219','C#':'#178600','C++':'#f34b7d',C:'#555555',
  Go:'#00ADD8',Rust:'#dea584',Ruby:'#701516',PHP:'#4F5D95',
  Swift:'#F05138',Kotlin:'#A97BFF',Dart:'#00B4AB',
  HTML:'#e34c26',CSS:'#563d7c',Shell:'#89e051',
  Vue:'#41b883',Svelte:'#ff3e00',Blade:'#fb503b',
};

function langColor(l) { return langColors[l] || '#8b949e'; }

/* ═══════════════════════════════════════════
   SCROLL REVEAL
   ═══════════════════════════════════════════ */
(function initReveal() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) e.target.classList.add('visible');
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -32px 0px' });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
})();

/* ═══════════════════════════════════════════
   HEADER SCROLL + ACTIVE LINK
   ═══════════════════════════════════════════ */
(function initHeader() {
  const header = document.getElementById('header');
  const navLinks = document.querySelectorAll('.nav a[href^="#"]');
  const sections = document.querySelectorAll('section[id]');

  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 20);
    let current = '';
    sections.forEach(s => {
      if (window.scrollY >= s.offsetTop - 120) current = s.getAttribute('id');
    });
    navLinks.forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === `#${current}`);
    });
  });
})();

/* ═══════════════════════════════════════════
   MOBILE MENU
   ═══════════════════════════════════════════ */
(function initMenu() {
  const btn = document.getElementById('menu-btn');
  const nav = document.getElementById('nav');
  if (!btn || !nav) return;
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
   SAKURA PETALS (Japan page only)
   ═══════════════════════════════════════════ */
(function initPetals() {
  const field = document.getElementById('petal-field');
  if (!field) return;
  for (let i = 0; i < 35; i++) {
    const petal = document.createElement('div');
    petal.className = 'petal';
    petal.style.setProperty('--sz', `${Math.random() * 10 + 6}px`);
    petal.style.setProperty('--dur', `${Math.random() * 8 + 7}s`);
    petal.style.setProperty('--delay', `${Math.random() * 12}s`);
    petal.style.setProperty('--drift', `${(Math.random() - 0.5) * 120}px`);
    petal.style.setProperty('--spin', `${Math.random() * 720}deg`);
    petal.style.left = `${Math.random() * 100}%`;
    field.appendChild(petal);
  }
})();

/* ═══════════════════════════════════════════
   DATA FETCH + RENDER
   ═══════════════════════════════════════════ */
async function fetchData() {
  const build = document.documentElement.dataset.build || '0';
  const res = await fetch(`data.json?v=${build}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function renderHeroAvatar(profile) {
  const frame = document.getElementById('hero-avatar');
  if (!frame) return;
  const isJapan = document.querySelector('.avatar-round') !== null;
  if (isJapan) {
    frame.innerHTML = `<img src="${profile.avatar_url}&s=300" alt="${profile.login}" width="130" height="130">`;
  } else {
    frame.innerHTML = `<img src="${profile.avatar_url}&s=400" alt="${profile.login}" width="260" height="260">`;
  }
}

function renderRepoCount(count) {
  const el = document.getElementById('gh-repos-count');
  if (el) el.textContent = `${count} public repos`;
}

function renderProjects(repos) {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;
  if (!repos.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:var(--text-tertiary);padding:48px 0;">No featured projects yet. Add the <strong>featured</strong> topic to a public repository and run <code style="font-family:var(--font-mono);background:var(--tag-bg);padding:2px 6px;border-radius:4px;">node build.js</code></div>`;
    return;
  }

  grid.innerHTML = '';
  repos.forEach((r, i) => {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.style.transitionDelay = `${i * 0.06}s`;

    card.innerHTML = `<div class="proj-name">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 010-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 11-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8z"/></svg>
      <a href="${r.html_url}" target="_blank" rel="noopener">${esc(r.name)}</a>
    </div>
    <p class="proj-desc">${esc(r.description || 'No description.')}</p>
    <div class="proj-meta">
      ${r.language ? `<span class="proj-lang"><span class="proj-lang-dot" style="background:${langColor(r.language)}"></span>${esc(r.language)}</span>` : ''}
      <span class="proj-stars">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.751.751 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"/></svg>
        ${r.stargazers_count}
      </span>
      <span class="proj-updated">${formatDate(r.updated_at)}</span>
    </div>
    <div class="proj-topics">${(r.topics||[]).map(t => `<span class="proj-topic">${esc(t)}</span>`).join('')}</div>
    <div class="proj-actions">
      <a href="${r.html_url}" target="_blank" rel="noopener" class="proj-btn proj-btn-fill">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
        GitHub
      </a>
      ${r.homepage ? `<a href="${r.homepage}" target="_blank" rel="noopener" class="proj-btn proj-btn-ghost">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
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
  if (!overlay) return;
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
    <p><strong>BS Information Technology</strong> — IETI College of Science and Technology, Marikina</p>
    <p>Graduated June 2026 &middot; Dean's Lister</p>
    <p style="margin-top:8px"><em>Relevant Coursework:</em> Web Development, Mobile App Development, Database Systems, Software Engineering, UI/UX Design, Machine Learning</p>
    <p><em>Capstone:</em> Skin Lesions Detection App Using AI and CNNs</p>

    <h3>Experience</h3>
    <p><strong>IT Intern (Web Developer)</strong> — Knowles Training Institute, Singapore <em>(Jan – Apr 2026)</em></p>
    <ul>
      <li>Built and maintained responsive web applications using HTML, CSS, JavaScript, and SQL</li>
      <li>Applied UI/UX principles to improve internal tools and user workflows</li>
      <li>Integrated CNN-based image classification into a web prototype for skin lesion analysis</li>
      <li>Recognized for clean code, deadlines, and positive feedback from IT lead</li>
    </ul>
    <p style="margin-top:12px"><strong>Freelance Web Developer</strong> — Self-Employed <em>(2024 – Present)</em></p>
    <ul>
      <li>Built custom responsive websites for small businesses and individuals on commission</li>
      <li>Ensured cross-browser compatibility and mobile responsiveness within tight deadlines</li>
      <li>Maintained post-launch support and updates based on client feedback</li>
    </ul>

    <h3>Projects</h3>
    <p><strong>SkinLesionAI</strong> — Flask, PyTorch, SQLite, Bootstrap, OpenCV, Grad-CAM++</p>
    <ul><li>Medical-grade web app classifying 8 skin lesion types using ResNeXt50 (85% accuracy), with Grad-CAM++ visual explanations and clinical reports</li></ul>
    <p style="margin-top:8px"><strong>BITSI Dispatch</strong> — Laravel 12, Livewire 3, Tailwind CSS, MySQL, Semaphore API</p>
    <ul><li>Live dispatch board with auto-refresh, driver attendance tracking, SMS alerts, and vehicle PMS alerts</li></ul>
    <p style="margin-top:8px"><strong>Intern Management System</strong> — React, Vite, Tailwind CSS</p>
    <ul><li>All-in-one intern tracking platform with attendance, task management, and role-based access</li></ul>

    <h3>Certifications</h3>
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
   INIT
   ═══════════════════════════════════════════ */
async function init() {
  try {
    const data = await fetchData();
    renderHeroAvatar(data.profile);
    renderRepoCount(data.profile.public_repos);
    renderProjects(data.repos);
  } catch (err) {
    console.error('Failed to load portfolio data:', err);
  }
}

init();
