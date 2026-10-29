/**
 * The main menu — an Animal-Crossing-ish list of rounded pill buttons, each one
 * pointing at a landmark on the island.
 */

import { icon } from './icons.js';

export function createMenu({ sections, onHover, onOpen }) {
  const list = document.getElementById('menu-list');
  const caption = document.getElementById('menu-caption');
  const captionText = caption ? caption.querySelector('.caption-text') : null;

  let active = 0;
  let items = [];

  list.innerHTML = '';

  sections.forEach((section, i) => {
    const li = document.createElement('li');
    li.className = 'menu-item';
    li.dataset.id = section.id;
    if (i === 0) li.classList.add('is-active');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'menu-btn';
    btn.id = `menu-${section.id}`;
    btn.setAttribute('role', 'menuitem');
    btn.tabIndex = i === 0 ? 0 : -1;
    btn.setAttribute('aria-label', `${section.label} — ${section.desc}`);

    btn.innerHTML = `
      <span class="menu-cursor" aria-hidden="true">${icon('leaf', 30)}</span>
      <span class="menu-ico" aria-hidden="true">${icon(section.badge, 24)}</span>
      <span class="menu-text">
        <span class="menu-label">${section.label}</span>
        <span class="menu-desc">${section.desc}</span>
      </span>
      <span class="menu-caret" aria-hidden="true">${icon('arrow', 18)}</span>
    `;

    btn.addEventListener('mouseenter', () => setActive(i, { silent: false }));
    btn.addEventListener('focus', () => setActive(i, { silent: true }));
    btn.addEventListener('click', () => {
      setActive(i, { silent: true });
      onOpen(i);
    });

    li.appendChild(btn);
    list.appendChild(li);
    items.push({ li, btn, section });
  });

  function setActive(index, { silent = false } = {}) {
    const next = Math.max(0, Math.min(items.length - 1, index));
    if (next === active && items[next].li.classList.contains('is-active')) return;

    active = next;

    items.forEach((it, i) => {
      const on = i === next;
      it.li.classList.toggle('is-active', on);
      it.btn.tabIndex = on ? 0 : -1;
    });

    if (captionText) {
      captionText.innerHTML = items[next].section.caption || '';
    }

    if (!silent) onHover?.(next);
  }

  return {
    get active() {
      return active;
    },
    setActive,
    focus(index = active) {
      items[index].btn.focus({ preventScroll: true });
    },
    get element() {
      return items[active].btn;
    },
    move(delta) {
      const n = items.length;
      const next = (active + delta + n) % n;
      setActive(next);
      return next;
    },
    itemAt(i) {
      return items[i];
    },
    count: items.length,
    /** visual acknowledgement when a section opens */
    flash() {
      const btn = items[active].btn;
      btn.animate(
        [
          { transform: 'translateX(10px) scale(1.035)' },
          { transform: 'translateX(10px) scale(0.97)' },
          { transform: 'translateX(10px) scale(1.035)' },
        ],
        { duration: 260, easing: 'ease-out' }
      );
    },
  };
}
