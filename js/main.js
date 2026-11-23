/* ============================================================
   Rapada Isle — entry point
   ============================================================ */

import { Game } from './game.js';

function boot() {
  const canvas = document.getElementById('scene');
  const ui = document.getElementById('ui');

  if (!canvas || !ui) {
    console.error('Missing #scene or #ui');
    return;
  }

  const game = new Game(canvas, ui);
  game.start();

  // expose for debugging / deep links (?exhibit=projects)
  window.__isle = game;

  const params = new URLSearchParams(location.search);
  const exhibit = params.get('exhibit');
  if (exhibit) {
    // skip the title screen when a deep link is used
    const start = document.querySelector('.start-screen');
    if (start) start.remove();
    game.started = true;
    game.paused = false;
    game.ui.showHud();
    setTimeout(() => game.ui.openResume(exhibit), 400);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
