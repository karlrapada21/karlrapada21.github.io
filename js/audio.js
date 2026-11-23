/* ============================================================
   Audio — a tiny generative soundscape. No files, no downloads:
   everything is synthesised with the Web Audio API.
   ============================================================ */

let ctx = null;
let master = null;
let muted = false;
let started = false;

/* a soft mallet/bell voice */
function bell(freq, when, dur = 1.6, gain = 0.12, type = 'sine') {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  const o2 = ctx.createOscillator();
  const g2 = ctx.createGain();
  o.type = type;
  o2.type = 'triangle';
  o.frequency.value = freq;
  o2.frequency.value = freq * 2.01;
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(gain, when + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  g2.gain.setValueAtTime(0.0001, when);
  g2.gain.exponentialRampToValueAtTime(gain * 0.22, when + 0.02);
  g2.gain.exponentialRampToValueAtTime(0.0001, when + dur * 0.5);
  o.connect(g).connect(master);
  o2.connect(g2).connect(master);
  o.start(when);
  o2.start(when);
  o.stop(when + dur + 0.05);
  o2.stop(when + dur + 0.05);
}

/* pentatonic scale for pleasant randomness */
const PENTA = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66];

export const Audio = {
  unlock() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
  },

  startAmbient() {
    this.unlock();
    if (!ctx || started) return;
    started = true;

    /* gentle wind + water bed */
    const bufferSize = ctx.sampleRate * 3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const nf = ctx.createBiquadFilter();
    nf.type = 'lowpass';
    nf.frequency.value = 620;
    const ng = ctx.createGain();
    ng.gain.value = 0.055;
    noise.connect(nf).connect(ng).connect(master);
    noise.start();

    /* slow pad */
    const pad = ctx.createGain();
    pad.gain.value = 0.035;
    pad.connect(master);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    lp.connect(pad);
    [130.81, 196.0, 261.63, 329.63].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      lfo.frequency.value = 0.05 + i * 0.017;
      lg.gain.value = 1.2;
      lfo.connect(lg).connect(o.frequency);
      lfo.start();
      o.connect(lp);
      o.start();
    });

    /* wandering melody */
    const melody = () => {
      if (!ctx) return;
      const now = ctx.currentTime;
      if (!muted) {
        const f = PENTA[Math.floor(Math.random() * PENTA.length)];
        if (Math.random() < 0.75) bell(f, now + 0.01, 2.2, 0.045);
        if (Math.random() < 0.3) bell(PENTA[Math.floor(Math.random() * PENTA.length)] * 0.5, now + 0.4, 2.8, 0.03);
      }
      setTimeout(melody, 1400 + Math.random() * 2600);
    };
    setTimeout(melody, 1800);
  },

  sfx(kind) {
    if (!ctx || muted) return;
    const now = ctx.currentTime + 0.01;
    switch (kind) {
      case 'pop':
        bell(880, now, 0.32, 0.09, 'triangle');
        bell(1318.5, now + 0.05, 0.3, 0.05, 'sine');
        break;
      case 'tick':
        bell(1567.98, now, 0.1, 0.035, 'sine');
        break;
      case 'chime':
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(f, now + i * 0.11, 1.5, 0.08));
        break;
      case 'step':
        bell(220 + Math.random() * 60, now, 0.13, 0.02, 'triangle');
        break;
      default:
        bell(660, now, 0.2, 0.04);
    }
  },

  toggleMute() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 0.5;
    return muted;
  },

  get muted() {
    return muted;
  },
};
