/** Inline SVG icons — one consistent stroke style, no icon font, no requests. */

const S = (d, extra = '') =>
  `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;

const F = (d, extra = '') =>
  `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true" ${extra}>${d}</svg>`;

export const icons = {
  projects: S('<rect x="3.6" y="3.6" width="7" height="7" rx="2"/><rect x="13.4" y="3.6" width="7" height="7" rx="2"/><rect x="3.6" y="13.4" width="7" height="7" rx="2"/><rect x="13.4" y="13.4" width="7" height="7" rx="2"/>'),
  about: S('<circle cx="12" cy="8" r="3.6"/><path d="M5 20.2c1.1-3.6 3.8-5.2 7-5.2s5.9 1.6 7 5.2"/>'),
  skills: S('<path d="M12 3.2l2.3 5.9 5.9 2.3-5.9 2.3L12 19.6l-2.3-5.9L3.8 11.4l5.9-2.3z"/>'),
  experience: S('<path d="M12 3.2v17.6"/><path d="M12 6.6H7.6L5.2 9l2.4 2.4H12"/><path d="M12 13.2h4.4L18.8 15.6 16.4 18H12"/>'),
  contact: S('<rect x="3.2" y="6" width="17.6" height="12" rx="2.4"/><path d="M3.8 7.4l8.2 5.8 8.2-5.8"/>'),
  gear: S('<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4M12 18.8v2.4M4.5 12H2.1M21.9 12h-2.4M6.7 6.7L5 5M19 19l-1.7-1.7M6.7 17.3L5 19M19 5l-1.7 1.7"/>'),
  house: S('<path d="M3.6 11L12 4.4 20.4 11"/><path d="M5.8 9.6v9.8h12.4V9.6"/><path d="M10 19.4v-5.2h4v5.2"/>'),
  box: S('<path d="M12 3.2l8 4.4v8.8L12 20.8 4 16.4V7.6z"/><path d="M4 7.6l8 4.4 8-4.4M12 12v8.8"/>'),
  code: S('<path d="M8.8 7.2L4 12l4.8 4.8"/><path d="M15.2 7.2L20 12l-4.8 4.8"/>'),
  layers: S('<path d="M12 3.2l8.2 4.4-8.2 4.4-8.2-4.4z"/><path d="M3.8 12l8.2 4.4 8.2-4.4"/><path d="M3.8 16.2L12 20.6l8.2-4.4"/>'),
  db: S('<ellipse cx="12" cy="6.4" rx="7.4" ry="3.1"/><path d="M4.6 6.4v11.2c0 1.7 3.3 3.1 7.4 3.1s7.4-1.4 7.4-3.1V6.4"/>'),
  spark: S('<path d="M12 3.4l1.9 4.6 4.7 1.9-4.7 1.9L12 16.4l-1.9-4.6L5.4 9.9l4.7-1.9z"/><path d="M18.4 15.4l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z"/>'),
  arrow: S('<path d="M4.6 12h14.2"/><path d="M13.2 6.4L18.8 12l-5.6 5.6"/>'),
  chevron: S('<path d="M9.4 6.6L14.8 12l-5.4 5.4"/>'),
  close: S('<path d="M6.2 6.2l11.6 11.6M17.8 6.2L6.2 17.8"/>'),
  download: S('<path d="M12 3.8v10.6"/><path d="M7.9 10.4L12 14.5l4.1-4.1"/><path d="M4.8 19.4h14.4"/>'),
  phone: S('<path d="M6.4 3.6h3.1l1.5 4-2 1.4a12.4 12.4 0 0 0 6 6l1.4-2 4 1.5v3.1a2 2 0 0 1-2.2 2A17.4 17.4 0 0 1 4.4 5.8a2 2 0 0 1 2-2.2z"/>'),
  sun: S('<circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2.2M12 19.2v2.2M4.4 12H2.2M21.8 12h-2.2M6.3 6.3L4.8 4.8M19.2 19.2l-1.5-1.5M6.3 17.7L4.8 19.2M19.2 4.8l-1.5 1.5"/>'),
  moon: S('<path d="M20 14.4A8.6 8.6 0 0 1 9.6 4a8.6 8.6 0 1 0 10.4 10.4z"/>'),
  leaf: F('<path d="M26.5 5.5c0 9.9-6.6 16.6-15.4 16.6-1.6 0-3-.2-4.2-.7C8.3 13.9 15.1 8.2 26.5 5.5Z" transform="scale(0.86) translate(1.4 1.2)"/>', 'viewBox="0 0 30 30"'),
  github: F(
    '<path d="M12 2C6.5 2 2 6.6 2 12.2c0 4.5 2.9 8.3 6.8 9.7.5.1.7-.2.7-.5v-1.8c-2.8.6-3.4-1.2-3.4-1.2-.4-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.4-1.1.6-1.3-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.8 1a9.5 9.5 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.8v2.7c0 .3.2.6.7.5A10.2 10.2 0 0 0 22 12.2C22 6.6 17.5 2 12 2Z"/>'
  ),
  linkedin: F(
    '<path d="M4.6 3h14.8A1.6 1.6 0 0 1 21 4.6v14.8a1.6 1.6 0 0 1-1.6 1.6H4.6A1.6 1.6 0 0 1 3 19.4V4.6A1.6 1.6 0 0 1 4.6 3Zm1.9 6.4h2.6V18H6.5V9.4Zm1.3-4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm4 4h2.5v1.2c.4-.7 1.3-1.4 2.7-1.4 2.4 0 3.1 1.4 3.1 3.8V18h-2.6v-4.4c0-1.1-.3-1.8-1.3-1.8-.8 0-1.3.5-1.6 1.1-.1.2-.1.5-.1.8V18h-2.7V9.4Z"/>'
  ),
  mail: S('<rect x="3.2" y="6" width="17.6" height="12" rx="2.4"/><path d="M3.8 7.4l8.2 5.8 8.2-5.8"/>'),
  resume: S('<path d="M14 3.4H6.6A1.6 1.6 0 0 0 5 5v14a1.6 1.6 0 0 0 1.6 1.6h10.8A1.6 1.6 0 0 0 19 19V8.4z"/><path d="M14 3.4V8.4h5"/><path d="M8.6 13h6.8M8.6 16.4h4.6"/>'),
  pin: S('<path d="M12 21.4s6.6-5.6 6.6-11a6.6 6.6 0 1 0-13.2 0c0 5.4 6.6 11 6.6 11z"/><circle cx="12" cy="10.2" r="2.4"/>'),
  grad: S('<path d="M12 4.4L2.6 9 12 13.6 21.4 9z"/><path d="M6.2 11v4.6c0 1.6 2.6 2.9 5.8 2.9s5.8-1.3 5.8-2.9V11"/>'),
  drag: S('<circle cx="12" cy="12" r="2"/><path d="M12 3.4v4M12 16.6v4M3.4 12h4M16.6 12h4"/>'),
};

export function icon(name, size = 22) {
  const svg = icons[name] || icons.box;
  return svg.replace(/width="22" height="22"/, `width="${size}" height="${size}"`);
}
