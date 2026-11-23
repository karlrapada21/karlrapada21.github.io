/* ============================================================
   UI — title screen, HUD, and the six resume exhibits that open
   when you press E. There is no character customiser any more:
   the villager has one fixed look.
   ============================================================ */

import {
  PROFILE,
  EDUCATION,
  SKILL_GROUPS,
  EXPERIENCE,
  PROJECTS,
  CERTIFICATES,
} from './resume-data.js';
import { drawPortrait } from './villager3d.js';
import { Audio } from './audio.js';

const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};

/* ---------------- exhibit content ---------------- */

function whoPanel() {
  return `
    <div class="ex-hero">
      <div class="ex-avatar"><canvas id="exAvatar" width="220" height="260"></canvas></div>
      <div class="ex-hero-text">
        <p class="ex-kicker">Villager profile</p>
        <h2>${PROFILE.name}</h2>
        <p class="ex-role">${PROFILE.role}</p>
        <p class="ex-blurb">${PROFILE.blurb}</p>
        <div class="ex-tags">
          <span>${PROFILE.location}</span>
          <span>Dean&rsquo;s Lister</span>
          <span>Class of 2026</span>
        </div>
        <div class="ex-actions">
          <a class="btn-primary" href="${PROFILE.resumePdf}" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 3v10.6l3.3-3.3 1.4 1.4L12 17.4l-4.7-5.7 1.4-1.4L12 13.6V3h0zM5 19h14v2H5z"/></svg>
            Download the real resume
          </a>
          <a class="btn-ghost" href="${PROFILE.githubUrl}" target="_blank" rel="noopener">GitHub</a>
          <a class="btn-ghost" href="${PROFILE.linkedinUrl}" target="_blank" rel="noopener">LinkedIn</a>
        </div>
      </div>
    </div>
    <div class="ex-grid">
      <div class="ex-card">
        <h3>Now</h3>
        <p>Open to software developer roles &mdash; web platforms, AI tooling, and anything with a
        good interface.</p>
      </div>
      <div class="ex-card">
        <h3>Based in</h3>
        <p>${PROFILE.location}</p>
      </div>
      <div class="ex-card">
        <h3>Reach me</h3>
        <p><a href="mailto:${PROFILE.email}">${PROFILE.email}</a><br>${PROFILE.phone}</p>
      </div>
    </div>`;
}

function skillsPanel() {
  return `
    <div class="ex-head">
      <p class="ex-kicker">Inventory</p>
      <h2>Skills &amp; Tools</h2>
      <p class="ex-sub">Everything in the bag — collected across school, freelance work, and an internship.</p>
    </div>
    <div class="ex-skills">
      ${SKILL_GROUPS.map(
        (g) => `
        <div class="ex-skill-group">
          <h3>${g.label}</h3>
          <div class="ex-chips">
            ${g.items.map((s) => `<span class="chip chip-${g.kind}">${s}</span>`).join('')}
          </div>
        </div>`
      ).join('')}
    </div>
    <div class="ex-card ex-note">
      <h3>How I work</h3>
      <p>Clean, maintainable code; UI/UX first; ship on deadline. Comfortable across the stack —
      from Laravel and Express APIs to React/Next.js front ends and PyTorch models.</p>
    </div>`;
}

function experiencePanel() {
  return `
    <div class="ex-head">
      <p class="ex-kicker">The Journal</p>
      <h2>Experience</h2>
    </div>
    <div class="ex-timeline">
      ${EXPERIENCE.map(
        (e) => `
        <article class="ex-entry">
          <div class="ex-entry-dot"></div>
          <header>
            <h3>${e.role}</h3>
            <p class="ex-org">${e.company} <span class="ex-date">${e.date}</span></p>
          </header>
          <ul>${e.points.map((p) => `<li>${p}</li>`).join('')}</ul>
        </article>`
      ).join('')}
    </div>`;
}

function projectsPanel() {
  return `
    <div class="ex-head">
      <p class="ex-kicker">Project stands</p>
      <h2>Projects</h2>
    </div>
    <div class="ex-projects">
      ${PROJECTS.map(
        (p) => `
        <article class="ex-project">
          <h3>${p.title}</h3>
          <p class="ex-role">${p.subtitle}</p>
          <div class="ex-chips">${p.stack.map((s) => `<span class="chip">${s}</span>`).join('')}</div>
          <ul>${p.points.map((x) => `<li>${x}</li>`).join('')}</ul>
          <a class="ex-link" href="${p.url}" target="_blank" rel="noopener">View on GitHub →</a>
        </article>`
      ).join('')}
    </div>`;
}

function educationPanel() {
  return `
    <div class="ex-head">
      <p class="ex-kicker">The Study</p>
      <h2>Education</h2>
    </div>
    ${EDUCATION.map(
      (e) => `
      <article class="ex-entry">
        <header>
          <h3>${e.degree}</h3>
          <p class="ex-org">${e.school} <span class="ex-date">${e.date}</span></p>
        </header>
        <ul>${e.notes.map((n) => `<li>${n}</li>`).join('')}</ul>
      </article>`
    ).join('')}
    ${EDUCATION.map(
      (e) => `
      <div class="ex-card ex-capstone">
        <h3>Capstone</h3>
        <p class="ex-role">${e.capstone.title}</p>
        <p>${e.capstone.body}</p>
      </div>`
    ).join('')}`;
}

function contactPanel() {
  return `
    <div class="ex-head">
      <p class="ex-kicker">Wish board</p>
      <h2>Say hello</h2>
      <p class="ex-sub">Open to work, collaborations, or just talking about games and Ghibli films.</p>
    </div>
    <div class="ex-grid ex-grid-2">
      <a class="ex-contact" href="mailto:${PROFILE.email}">
        <span class="ex-contact-label">Email</span>
        <span class="ex-contact-value">${PROFILE.email}</span>
      </a>
      <a class="ex-contact" href="tel:${PROFILE.phone.replace(/[^+\d]/g, '')}">
        <span class="ex-contact-label">Phone</span>
        <span class="ex-contact-value">${PROFILE.phone}</span>
      </a>
      <a class="ex-contact" href="${PROFILE.githubUrl}" target="_blank" rel="noopener">
        <span class="ex-contact-label">GitHub</span>
        <span class="ex-contact-value">${PROFILE.github}</span>
      </a>
      <a class="ex-contact" href="${PROFILE.linkedinUrl}" target="_blank" rel="noopener">
        <span class="ex-contact-label">LinkedIn</span>
        <span class="ex-contact-value">${PROFILE.linkedin}</span>
      </a>
    </div>
    <div class="ex-head ex-head-tight">
      <h3>Certificates</h3>
    </div>
    <div class="ex-chips">
      ${CERTIFICATES.map((c) => `<span class="chip chip-cert">${c}</span>`).join('')}
    </div>
    <div class="ex-actions">
      <a class="btn-primary" href="${PROFILE.resumePdf}" target="_blank" rel="noopener">Open the PDF resume</a>
      <a class="btn-ghost" href="${PROFILE.resumePdf}" download>Download</a>
    </div>`;
}

function riverPanel() {
  return `
    <div class="ex-head">
      <p class="ex-kicker">A quiet spot</p>
      <h2>The River</h2>
      <p class="ex-sub">Watch the water a while. Then head south — the exhibits are across the bridge.</p>
    </div>
    <div class="ex-card">
      <h3>Controls</h3>
      <p><strong>WASD / arrows</strong> to wander &nbsp;·&nbsp; <strong>E</strong> to interact
      &nbsp;·&nbsp; <strong>Esc</strong> to close &nbsp;·&nbsp; <strong>M</strong> to mute</p>
    </div>`;
}

const PANELS = {
  who: whoPanel,
  skills: skillsPanel,
  experience: experiencePanel,
  projects: projectsPanel,
  education: educationPanel,
  contact: contactPanel,
  river: riverPanel,
};

const PANEL_TITLES = {
  who: 'The Villager',
  skills: 'Inventory',
  experience: 'The Journal',
  projects: 'Project Stands',
  education: 'The Study',
  contact: 'Wish Board',
  river: 'The River',
};

/* ---------------- UI class ---------------- */

export class UI {
  constructor(root) {
    this.root = root;
    this.overlayOpen = false;
    this.onStart = null;
    this.onOverlayOpen = null;
    this.onOverlayClose = null;
    this._buildStart();
    this._buildHud();
    this._buildOverlay();
  }

  /* ---------- start screen ---------- */

  _buildStart() {
    const wrap = el('div', 'start-screen');
    wrap.innerHTML = `
      <div class="start-sky"></div>
      <div class="start-card">
        <div class="start-preview">
          <canvas id="lookPreview" width="240" height="300"></canvas>
          <div class="preview-shadow"></div>
        </div>
        <p class="start-kicker">A tiny 3D portfolio island</p>
        <h1>Rapada <span>Isle</span></h1>
        <p class="start-sub">Wander the island in three dimensions. Cross the river. Press
        <b>E</b> at the exhibits to read Karl&rsquo;s resume.</p>
        <button class="start-btn" id="startBtn">
          <span>Set foot on the island</span>
          <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M8 5l8 7-8 7z"/></svg>
        </button>
        <p class="start-hint">WASD or arrow keys to walk · E to interact</p>
      </div>`;
    this.root.appendChild(wrap);
    this.startScreen = wrap;

    const preview = $('#lookPreview', wrap);
    this.previewCtx = preview.getContext('2d');
    this.previewCanvas = preview;

    $('#startBtn', wrap).addEventListener('click', () => {
      Audio.unlock();
      Audio.sfx('chime');
      wrap.classList.add('leaving');
      setTimeout(() => wrap.remove(), 700);
      this.onStart?.();
    });

    requestAnimationFrame(() => this.drawPreview());
    this._previewLoop = setInterval(() => {
      if (!this.previewCtx || !document.body.contains(this.previewCanvas)) {
        clearInterval(this._previewLoop);
        return;
      }
      this.drawPreview();
    }, 90);
  }

  drawPreview() {
    if (!this.previewCtx) return;
    const t = performance.now() / 1000;
    drawPortrait(this.previewCtx, this.previewCanvas.width, this.previewCanvas.height, t);
  }

  /* ---------- HUD ---------- */

  _buildHud() {
    const hud = el('div', 'hud hidden');
    hud.innerHTML = `
      <div class="hud-brand">
        <span class="hud-dot"></span>
        <span>Rapada Isle</span>
      </div>
      <div class="hud-prompt hidden" id="prompt"><kbd>E</kbd><span>Interact</span></div>
      <div class="hud-actions">
        <button class="hud-btn hud-btn-label" id="resumeBtn" title="Open the resume">
          <svg viewBox="0 0 24 24" width="15" height="15"><path fill="currentColor" d="M6 2h8l4 4v16H6V2zm7 1.5V7h3.5L13 3.5zM8 11h8v2H8v-2zm0 4h8v2H8v-2z"/></svg>
          <span>Résumé</span>
        </button>
        <button class="hud-btn" id="helpBtn" title="Controls (H)">
          <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2v2zm1.8-6.6l-.9.9c-.7.7-1 1.2-1 2.2h-2v-.5c0-1 .4-1.9 1.1-2.6l1.2-1.2A1.9 1.9 0 1010 8h-2a4 4 0 118 0c0 .9-.4 1.7-1.2 2.4z"/></svg>
        </button>
        <button class="hud-btn" id="muteBtn" title="Mute (M)">
          <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M4 9v6h4l5 4V5L8 9H4zm13.5 3a4.5 4.5 0 00-2.5-4v8a4.5 4.5 0 002.5-4z"/></svg>
        </button>
      </div>
      <div class="pad" id="pad">
        <button class="pad-btn up" data-dir="up">▲</button>
        <button class="pad-btn left" data-dir="left">◀</button>
        <button class="pad-btn right" data-dir="right">▶</button>
        <button class="pad-btn down" data-dir="down">▼</button>
        <button class="pad-btn act" data-dir="act">E</button>
      </div>
      <div class="help-card hidden" id="helpCard">
        <h4>Controls</h4>
        <ul>
          <li><kbd>WASD</kbd> / <kbd>↑↓←→</kbd> walk</li>
          <li><kbd>E</kbd> interact</li>
          <li><kbd>Esc</kbd> close</li>
          <li><kbd>M</kbd> mute</li>
          <li><kbd>H</kbd> this card</li>
        </ul>
        <p>Cross the bridge south to find the exhibits.</p>
      </div>`;
    this.root.appendChild(hud);
    this.hud = hud;
    this.promptEl = $('#prompt', hud);
    this.helpCard = $('#helpCard', hud);

    $('#helpBtn', hud).addEventListener('click', () => this.toggleHelp());
    $('#muteBtn', hud).addEventListener('click', () => this.toggleMute());
    $('#resumeBtn', hud).addEventListener('click', () => {
      Audio.sfx('pop');
      this.openResume('who');
    });
  }

  showHud() {
    this.hud.classList.remove('hidden');
  }

  setPrompt(p) {
    const key = p ? `${p.key}|${p.label}` : '';
    if (key === this._promptKey) return;
    this._promptKey = key;
    if (!p) {
      this.promptEl.classList.add('hidden');
      return;
    }
    this.promptEl.classList.remove('hidden');
    this.promptEl.innerHTML = `<kbd>${p.key}</kbd><span>${p.label.replace(/^E — /, '')}</span>`;
  }

  toggleHelp() {
    this.helpCard.classList.toggle('hidden');
  }

  toggleMute() {
    const muted = Audio.toggleMute();
    $('#muteBtn', this.hud)?.classList.toggle('muted', muted);
  }

  /* ---------- touch pad ---------- */

  bindPad(touch) {
    const pad = $('#pad', this.hud);
    if (!pad) return;
    const held = new Set();
    const apply = () => {
      let x = 0;
      let y = 0;
      if (held.has('left')) x -= 1;
      if (held.has('right')) x += 1;
      if (held.has('up')) y -= 1;
      if (held.has('down')) y += 1;
      touch.x = x;
      touch.y = y;
      touch.active = held.size > 0;
    };
    pad.querySelectorAll('.pad-btn').forEach((b) => {
      const dir = b.dataset.dir;
      if (dir === 'act') {
        b.addEventListener('click', () => this.onInteract?.());
        return;
      }
      const on = (e) => {
        e.preventDefault();
        held.add(dir);
        b.classList.add('held');
        apply();
      };
      const off = (e) => {
        e.preventDefault();
        held.delete(dir);
        b.classList.remove('held');
        apply();
      };
      b.addEventListener('pointerdown', on);
      b.addEventListener('pointerup', off);
      b.addEventListener('pointerleave', off);
      b.addEventListener('pointercancel', off);
    });
  }

  /* ---------- overlay ---------- */

  _buildOverlay() {
    const ov = el('div', 'overlay hidden');
    ov.innerHTML = `
      <div class="overlay-scrim"></div>
      <div class="overlay-panel" role="dialog" aria-modal="true">
        <div class="overlay-wood"></div>
        <header class="overlay-head">
          <div class="overlay-title">
            <span class="overlay-badge" id="ovBadge">✦</span>
            <h2 id="ovTitle">Title</h2>
          </div>
          <button class="overlay-close" id="ovClose" aria-label="Close">
            <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M18.3 5.7L12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z"/></svg>
          </button>
        </header>
        <div class="overlay-body" id="ovBody"></div>
        <footer class="overlay-foot">
          <div class="overlay-nav" id="ovNav"></div>
          <p class="overlay-hint"><kbd>Esc</kbd> to return to the island</p>
        </footer>
      </div>`;
    this.root.appendChild(ov);
    this.overlay = ov;
    this.ovBody = $('#ovBody', ov);
    this.ovTitle = $('#ovTitle', ov);
    this.ovBadge = $('#ovBadge', ov);
    this.ovNav = $('#ovNav', ov);

    $('#ovClose', ov).addEventListener('click', () => this.closeOverlay());
    $('.overlay-scrim', ov).addEventListener('click', () => this.closeOverlay());
    this.current = null;
  }

  openResume(id) {
    if (this.overlayOpen) return;
    const fn = PANELS[id];
    if (!fn) return;
    this.overlayOpen = true;
    this.current = id;
    this.ovTitle.textContent = PANEL_TITLES[id] ?? 'Exhibit';
    this.ovBody.innerHTML = fn();
    this.ovBody.scrollTop = 0;

    const iconMap = {
      who: 'leaf',
      skills: 'gem',
      experience: 'book',
      projects: 'star',
      education: 'cap',
      contact: 'mail',
      river: '💧',
    };
    this.ovBadge.textContent = iconMap[id] ?? '✦';

    const order = ['who', 'skills', 'experience', 'projects', 'education', 'contact'];
    this.ovNav.innerHTML = order
      .map(
        (k) =>
          `<button class="ov-nav-btn ${k === id ? 'active' : ''}" data-id="${k}">${
            PANEL_TITLES[k]
          }</button>`
      )
      .join('');
    this.ovNav.querySelectorAll('button').forEach((b) => {
      b.addEventListener('click', () => {
        Audio.sfx('tick');
        this.overlayOpen = false;
        this.openResume(b.dataset.id);
      });
    });

    this.overlay.classList.remove('hidden');
    requestAnimationFrame(() => this.overlay.classList.add('shown'));

    if (id === 'who') {
      const c = $('#exAvatar', this.ovBody);
      if (c) drawPortrait(c.getContext('2d'), c.width, c.height, 0);
    }

    this.onOverlayOpen?.();
  }

  closeOverlay() {
    if (!this.overlayOpen) return;
    this.overlayOpen = false;
    this.overlay.classList.remove('shown');
    setTimeout(() => this.overlay.classList.add('hidden'), 240);
    this.onOverlayClose?.();
  }
}
