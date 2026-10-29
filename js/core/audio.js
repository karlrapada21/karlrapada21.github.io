/**
 * Tiny synthesised UI sound. No audio files, no loading, no bandwidth — just
 * short shaped sine/triangle blips that make the menu feel like a game.
 */

const KEY = 'karl-isle-sound';

export function createAudio() {
  let ctx = null;
  let master = null;

  let enabled = true;
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === 'off') enabled = false;
  } catch {
    /* private mode */
  }

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch {
      return null;
    }
    return ctx;
  }

  /**
   * @param {number} freq start frequency
   * @param {number} dur  seconds
   * @param {object} o    { type, gain, slideTo, attack, delay }
   */
  function tone(freq, dur, o = {}) {
    if (!enabled) return;
    const c = ensure();
    if (!c) return;

    const { type = 'sine', gain = 0.06, slideTo = null, attack = 0.006, delay = 0 } = o;
    const t0 = c.currentTime + delay;

    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t0 + dur);

    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  return {
    get enabled() {
      return enabled;
    },

    setEnabled(next) {
      enabled = next;
      try {
        localStorage.setItem(KEY, next ? 'on' : 'off');
      } catch {
        /* ignore */
      }
      if (next) {
        ensure();
        tone(660, 0.1, { type: 'triangle', gain: 0.05, slideTo: 880 });
      }
    },

    /** first user gesture unlocks the context on iOS/Safari */
    unlock() {
      const c = ensure();
      if (c && c.state === 'suspended') c.resume();
    },

    hover() {
      tone(520, 0.07, { gain: 0.028, slideTo: 700, type: 'sine' });
    },

    select() {
      tone(620, 0.11, { gain: 0.05, slideTo: 940, type: 'triangle' });
      tone(1240, 0.09, { gain: 0.018, delay: 0.02, type: 'sine' });
    },

    open() {
      tone(523.25, 0.16, { gain: 0.05, type: 'triangle' });
      tone(783.99, 0.22, { gain: 0.04, type: 'triangle', delay: 0.07 });
    },

    close() {
      tone(700, 0.13, { gain: 0.04, type: 'triangle', slideTo: 420 });
    },

    pick() {
      tone(880, 0.09, { gain: 0.045, type: 'sine', slideTo: 1180 });
    },

    timeChange(night) {
      if (night) {
        tone(392, 0.5, { gain: 0.035, type: 'sine' });
        tone(587.33, 0.6, { gain: 0.026, type: 'sine', delay: 0.06 });
        tone(880, 0.7, { gain: 0.016, type: 'sine', delay: 0.14 });
      } else {
        tone(659.25, 0.3, { gain: 0.035, type: 'sine' });
        tone(987.77, 0.45, { gain: 0.022, type: 'sine', delay: 0.05 });
      }
    },
  };
}
