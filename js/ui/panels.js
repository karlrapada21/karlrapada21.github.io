/**
 * The panels. Each menu item opens a "dialogue box" card over the island —
 * except Projects, which also drives the floating shards in 3D.
 */

import { icon } from './icons.js';
import { profile, projects, education, experience, skillGroups, certificates, contactLinks } from '../data/content.js';

const el = (id) => document.getElementById(id);

export function createPanels({ onClose, onSelectProject, onHoverProject, onCopy }) {
  const layer = el('panel-layer');
  const panel = el('panel');
  const body = el('panel-region');
  const titleEl = el('panel-title');
  const subEl = el('panel-sub');
  const badgeEl = el('panel-badge');
  const closeBtn = el('panel-close');
  const scrim = el('panel-scrim');

  let openId = null;
  let activeProject = 0;
  let lastFocused = null;

  const chip = (t, cls = '') => `<span class="chip ${cls}">${t}</span>`;
  const chips = (arr, cls = '') => `<div class="chips">${arr.map((t) => chip(t, cls)).join('')}</div>`;

  /* ─────────────────────────────── renderers ─────────────────────────────── */

  function renderProjectDetail(i) {
    const p = projects[i];
    const links = [];
    if (p.repo) {
      links.push(
        `<a class="btn" href="${p.repo}" target="_blank" rel="noopener noreferrer">${icon('github', 18)} View on GitHub ${icon(
          'arrow',
          16
        )}</a>`
      );
    }
    links.push(
      `<button class="btn btn--ghost" type="button" data-copy="${p.repo || ''}">${icon('mail', 17)} Copy link</button>`
    );

    return `
      <div class="proj-detail">
        <div class="proj-head">
          <span class="proj-name">${p.name}</span>
          <span class="proj-year">${p.year} · ${p.kind}</span>
        </div>
        <p class="lede" style="margin-top:8px">${p.tagline}</p>
        ${chips(p.stack, 'chip--leaf')}
        <div class="block">
          <h2 class="block-title"><span class="dot"></span>What I built</h2>
          <ul class="tl-list">${p.highlights.map((h) => `<li>${h}</li>`).join('')}</ul>
        </div>
        <div class="detail-links">${links.join('')}</div>
      </div>
    `;
  }

  function renderProjects() {
    return `
      <div class="stage-note">
        ${icon('drag', 18)}
        <span>Four shards are floating above the island. Drag to swing the camera, click a shard to zoom in, or pick one here.</span>
      </div>
      <div class="proj-list" role="list">
        ${projects
          .map(
            (p, i) => `
          <button class="proj" type="button" role="listitem" data-proj="${i}" aria-current="${i === activeProject}">
            <span class="proj-swatches"><span class="swatch" style="background:${p.accent}"></span><span class="swatch" style="background:${p.accent2}"></span></span>
            <span class="proj-head"><span class="proj-name">${p.name}</span><span class="proj-year">${p.year}</span></span>
            <span class="proj-tag">${p.tagline}</span>
            ${chips(p.stack.slice(0, 4))}
          </button>`
          )
          .join('')}
      </div>
      <div id="proj-detail-slot">${renderProjectDetail(activeProject)}</div>
    `;
  }

  function renderAbout() {
    const facts = [
      ['Based in', profile.location],
      ['Degree', `${education.degree}, ${education.school}`],
      ['Graduated', education.when],
      ['Honours', education.honors],
      ['Capstone', education.capstone],
      ['Open to', 'Junior developer roles · freelance builds · collaborations'],
    ];

    return `
      ${profile.bio.map((p) => `<p class="lede">${p}</p>`).join('')}
      <div class="block">
        <h2 class="block-title"><span class="dot"></span>At a glance</h2>
        <dl class="rows">
          ${facts
            .map(
              ([k, v]) =>
                `<div class="row"><dt>${k}</dt><dd>${v}</dd></div>`
            )
            .join('')}
        </dl>
      </div>
      <div class="block">
        <h2 class="block-title"><span class="dot"></span>Coursework I actually enjoyed</h2>
        ${chips(education.coursework, 'chip--sky')}
      </div>
      <div class="block">
        <h2 class="block-title"><span class="dot"></span>Certificates</h2>
        <div class="cert-grid">${certificates.map((c) => `<div class="cert">${c}</div>`).join('')}</div>
      </div>
    `;
  }

  function renderSkills() {
    const groupIcons = { code: 'code', layers: 'layers', db: 'db', spark: 'spark' };
    return `
      <p class="lede">Mostly self-taught through building things that had to ship. The short version: <strong>PHP and JavaScript for the web</strong>, <strong>Python for the machine-learning side</strong>, and enough SQL to be dangerous in a good way.</p>
      <div class="skill-groups">
        ${skillGroups
          .map(
            (g) => `
          <div class="skill-group">
            <h3>${icon(groupIcons[g.icon] || 'code', 15)} ${g.label}</h3>
            ${chips(g.items)}
          </div>`
          )
          .join('')}
      </div>
      <div class="block">
        <h2 class="block-title"><span class="dot"></span>Certificates &amp; training</h2>
        <div class="cert-grid">${certificates.map((c) => `<div class="cert">${c}</div>`).join('')}</div>
      </div>
    `;
  }

  function renderExperience() {
    return `
      <div class="timeline">
        ${experience
          .map(
            (job) => `
          <div class="tl-item ${job.now ? 'is-now' : ''}">
            <div class="tl-when">${job.when}</div>
            <h2 class="tl-role">${job.role}</h2>
            <div class="tl-where">${job.where}</div>
            <ul class="tl-list">${job.points.map((p) => `<li>${p}</li>`).join('')}</ul>
          </div>`
          )
          .join('')}
        <div class="tl-item">
          <div class="tl-when">${education.when}</div>
          <h2 class="tl-role">${education.degree}</h2>
          <div class="tl-where">${education.school} · ${education.place}</div>
          <ul class="tl-list">
            <li>${education.honors}</li>
            <li>${education.capstone}</li>
          </ul>
        </div>
      </div>
      <div class="block">
        <h2 class="block-title"><span class="dot"></span>Coursework</h2>
        ${chips(education.coursework, 'chip--sky')}
      </div>
    `;
  }

  function renderContact() {
    return `
      <p class="lede">The mailbox is checked daily. I&rsquo;m in <strong>Marikina City</strong> (GMT+8) and happy to work across time zones — I spent four months on Singapore hours during my internship.</p>
      <div class="contact-grid">
        ${contactLinks
          .map((c) => {
            const attrs = c.download
              ? `download="Karl-Rapada-Resume.pdf"`
              : `target="${c.href.startsWith('http') ? '_blank' : '_self'}" rel="noopener noreferrer"`;
            const tag = c.href.startsWith('http') || c.download || c.href.startsWith('mailto') || c.href.startsWith('tel') ? 'a' : 'a';
            return `
            <a class="contact-btn" href="${c.href}" ${attrs} data-key="${c.key}">
              <span class="ci">${icon(c.icon, 18)}</span>
              <span class="cv"><span class="ck">${c.key}</span><span class="cl">${c.label}</span></span>
              <span class="cgo">${icon(c.download ? 'download' : 'arrow', 17)}</span>
            </a>`;
          })
          .join('')}
      </div>
      <p class="copy-note" id="copy-note" role="status" aria-live="polite">Email copied to clipboard.</p>
      <div class="block">
        <h2 class="block-title"><span class="dot"></span>Right now</h2>
        <p class="lede" style="margin-bottom:0">Available for junior developer positions and freelance projects starting now. Résumé is one click up in the corner, or right here: <a href="resume.pdf" download="Karl-Rapada-Resume.pdf">download the PDF</a>.</p>
      </div>
    `;
  }

  const RENDERERS = {
    projects: { render: renderProjects, sub: (s) => s.sub },
    about: { render: renderAbout, sub: (s) => s.sub },
    skills: { render: renderSkills, sub: (s) => s.sub },
    experience: { render: renderExperience, sub: (s) => s.sub },
    contact: { render: renderContact, sub: (s) => s.sub },
  };

  /* ──────────────────────────────── wiring ───────────────────────────────── */

  function wire(sectionId) {
    if (sectionId === 'projects') {
      body.querySelectorAll('[data-proj]').forEach((btn) => {
        const i = Number(btn.dataset.proj);
        btn.addEventListener('mouseenter', () => {
          onHoverProject?.(i);
        });
        btn.addEventListener('click', () => {
          selectProject(i);
          onSelectProject?.(i);
        });
      });
    }

    body.querySelectorAll('[data-copy]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const text = btn.dataset.copy;
        if (!text) return;
        try {
          await navigator.clipboard.writeText(text);
          btn.textContent = 'Copied!';
          setTimeout(() => {
            btn.textContent = 'Copy link';
          }, 1600);
        } catch {
          /* clipboard blocked */
        }
      });
    });

    body.querySelectorAll('.contact-btn[data-key="Email"]').forEach((a) => {
      a.addEventListener('click', () => {
        onCopy?.('karlrapada@gmail.com');
      });
    });
  }

  function selectProject(i, { silent = false } = {}) {
    activeProject = Math.max(0, Math.min(projects.length - 1, i));
    if (openId !== 'projects') return;

    body.querySelectorAll('[data-proj]').forEach((btn) => {
      btn.setAttribute('aria-current', String(Number(btn.dataset.proj) === activeProject));
    });
    const slot = body.querySelector('#proj-detail-slot');
    if (slot) {
      slot.innerHTML = renderProjectDetail(activeProject);
      slot.querySelector('.proj-detail')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      wire('projects');
    }
    if (!silent) onSelectProject?.(activeProject);
  }

  function open(sectionId, section) {
    const r = RENDERERS[sectionId];
    if (!r) return;

    lastFocused = document.activeElement;
    openId = sectionId;

    titleEl.textContent = section.title;
    subEl.innerHTML = r.sub(section);
    badgeEl.innerHTML = icon(section.badge, 24);
    body.innerHTML = r.render();
    body.scrollTop = 0;

    wire(sectionId);

    document.body.dataset.view = 'panel';
    layer.classList.add('is-open');

    requestAnimationFrame(() => {
      panel.focus({ preventScroll: true });
    });
  }

  function close() {
    if (!openId) return;
    const was = openId;
    openId = null;
    layer.classList.remove('is-open');
    document.body.dataset.view = 'menu';

    if (lastFocused && typeof lastFocused.focus === 'function') {
      setTimeout(() => lastFocused.focus({ preventScroll: true }), 60);
    }
    onClose?.(was);
  }

  closeBtn.addEventListener('click', () => {
    close();
  });
  scrim.addEventListener('click', () => {
    close();
  });

  // keep Tab inside the panel while it is open
  layer.addEventListener('keydown', (e) => {
    if (!openId) return;
    if (e.key !== 'Tab') return;

    const focusables = Array.from(
      panel.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])')
    ).filter((n) => n.offsetParent !== null || n === closeBtn);

    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  return {
    open,
    close,
    get openId() {
      return openId;
    },
    get activeProject() {
      return activeProject;
    },
    selectProject,
    showCopyNote() {
      const note = body.querySelector('#copy-note');
      if (!note) return;
      note.classList.add('is-on');
      clearTimeout(note._t);
      note._t = setTimeout(() => note.classList.remove('is-on'), 2200);
    },
  };
}
