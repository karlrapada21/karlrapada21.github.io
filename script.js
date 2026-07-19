document.addEventListener("DOMContentLoaded", () => {
  gsap.registerPlugin(EasePack);

  // Pre-hide hero elements so they don't flash before the loading screen lifts.
  const title = document.querySelector(".glitch-title");
  const titleLayers = document.querySelectorAll(".glitch-title-layer");
  const typewriter = document.querySelector(".typewriter-container");
  const subtitle = document.querySelector(".hero-subtitle");
  const cta = document.querySelector(".hero-cta");
  const scrollInd = document.querySelector(".scroll-indicator");
  if (title) gsap.set([title, ...titleLayers, typewriter, subtitle, cta, scrollInd].filter(Boolean), { opacity: 0 });

  initTypewriter();
  initParticles();
  initCounters();
  initGlitchReveal();
  initRandomGlitches();
  initFormGlitch();

  initNavToggle();

  const navReady = Promise.race([
    document.fonts.ready,
    new Promise(r => setTimeout(r, 1500))
  ]).then(() => {
    buildNavButtons();
    requestAnimationFrame(() => {
      // Glitch-folder reference configuration (see ./glitch/script.js)
      const config = {
        navElement: document.getElementById("nav-1"),
        easeIn: RoughEase.ease.config({ strength: 5, points: 10 }),
        easeOut: "power2.out",
        duration: 0.3
      };
      new NavigationEffect(config);
      initNavScroll();
    });
  });

  const bootDone = runBootSequence();

  // Reveal hero intro only once the loading screen lifts.
  Promise.all([navReady, bootDone]).then(() => initHeroIntro());

  // Safety fallback: force-lift boot screen after 8s
  setTimeout(() => {
    const screen = document.getElementById("boot-screen");
    if (screen && !screen.classList.contains("is-done")) {
      screen.classList.add("is-done");
    }
  }, 8000);
});

/* ==================== NAV BUTTON DEFINITIONS ==================== */
const NAV_ITEMS = [
  { id: "hero", label: "HOME" },
  { id: "about", label: "ABOUT" },
  { id: "experience", label: "EXPERIENCE" },
  { id: "projects", label: "PROJECTS" },
  { id: "certificates", label: "CERTS" },
  { id: "contact", label: "CONTACT" }
];

function buildNavButtons() {
  const nav = document.getElementById("nav-1");
  if (!nav) return;
  nav.innerHTML = "";

  NAV_ITEMS.forEach((item, i) => {
    const fid = `gf-${i}`;
    const sid = `sl-${i}`;
    const gid = `fd-${i}`;

    let floods = "";
    let merges = "";
    for (let j = 0; j < 20; j++) {
      const color = j % 2 === 0 ? "#8888FF" : "#888800";
      floods += `<feFlood flood-color="${color}" y="${j * 5}%" height="5%" result="s${j}" />`;
      merges += `<feMergeNode in="s${j}" />`;
    }

    const svg = `
<svg width="350" height="50" viewBox="0 0 350 50">
  <defs>
    <filter id="${fid}" primitiveUnits="objectBoundingBox" color-interpolation-filters="sRGB">
      ${floods}
      <feMerge result="bands">${merges}</feMerge>
      <feDisplacementMap class="displace" in="SourceGraphic" in2="bands" scale="0" xChannelSelector="B" yChannelSelector="R" />
    </filter>
    <pattern id="${sid}" class="scanline-pattern" patternUnits="userSpaceOnUse" width="5" height="10">
      <rect class="scanline" x="0" y="0" width="5" height="1" fill="#221314" />
      <rect x="0" y="1" width="5" height="9" fill="#08050a" />
    </pattern>
    <radialGradient id="${gid}" gradientUnits="userSpaceOnUse" cx="175" cy="25" r="50" gradientTransform="translate(175 25) scale(3 1) translate(-175 -25)">
      <stop offset="0%" stop-color="#08050a" stop-opacity="0" />
      <stop offset="60%" stop-color="#08050a" stop-opacity="0" />
      <stop offset="100%" stop-color="#08050a" stop-opacity="1" />
    </radialGradient>
  </defs>
  <rect width="100%" height="50" fill="url(#${sid})" />
  <rect width="350" height="50" fill="url(#${gid})" />
  <g filter="url(#${fid})">
    <text x="15" y="25" class="blue" dominant-baseline="middle">${item.label}</text>
    <text x="15" y="25" class="red" dominant-baseline="middle">${item.label}</text>
  </g>
  <rect x="0" y="0" width="12" height="0" fill="#5accf5" class="fill" filter="url(#${fid})" />
  <rect x="0" y="0" width="12" height="0" fill="#f55a6b" class="fill" filter="url(#${fid})" />
  <rect x="0" y="0" width="100%" height="50" fill="none" stroke="#f55a6b" stroke-width="4" />
</svg>`.trim();

    const a = document.createElement("a");
    a.href = `#${item.id}`;
    a.className = "nav-btn";
    a.dataset.section = item.id;
    a.innerHTML = svg;
    nav.appendChild(a);
  });
}

/* ==================== VIDEO-GAME LOADING / BOOT SEQUENCE ==================== */
const BOOT_LINES = [
  "INITIALIZING SYSTEM",
  "LOADING KERN.SYS",
  "MOUNTING /home/rapada",
  "LINKING ASSETS",
  "CALIBRATING CRT",
  "READY"
];

function runBootSequence() {
  return new Promise((resolve) => {
    const screen = document.getElementById("boot-screen");
    const pctEl = document.getElementById("boot-pct");
    const logEl = document.getElementById("boot-log");
    if (!screen || !pctEl || !logEl) { resolve(); return; }

    const steps = 50;
    const interval = 30;

    let current = 0;
    const tick = setInterval(() => {
      current++;
      const pct = Math.min(Math.round((current / steps) * 100), 100);
      pctEl.textContent = pct;
      const logIdx = Math.min(Math.floor((current / steps) * BOOT_LINES.length), BOOT_LINES.length - 1);
      logEl.textContent = BOOT_LINES[logIdx];
      if (current >= steps) {
        clearInterval(tick);
        screen.classList.add("is-done");
        resolve();
      }
    }, interval);
  });
}

/* ==================== MOBILE NAV TOGGLE ==================== */
function initNavToggle() {
  const toggle = document.getElementById("nav-toggle");
  const scrim = document.getElementById("scrim");
  if (!toggle || !scrim) return;

  const setOpen = (open) => {
    document.body.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  };

  toggle.addEventListener("click", () => setOpen(!document.body.classList.contains("nav-open")));
  scrim.addEventListener("click", () => setOpen(false));

  const nav = document.getElementById("nav-1");
  if (nav) nav.addEventListener("click", (e) => {
    if (e.target.closest(".nav-btn")) setOpen(false);
  });
}

/* ==================== NAVIGATION EFFECT (from glitch folder) ==================== */
class NavigationEffect {
  constructor(config) {
    this.config = config;
    this.navigation = config.navElement;
    this.anchors = this.navigation.querySelectorAll("a");
    this.tlByAnchor = new WeakMap();

    this.anchors.forEach((anchor) => {
      this.registerTimelines(anchor);
      const timelines = this.tlByAnchor.get(anchor);

      anchor.addEventListener("mouseenter", () => {
        this.playMouseEnterAnimations(timelines);
      });

      anchor.addEventListener("mouseleave", () => {
        if (!anchor.classList.contains("active")) {
          this.playMouseLeaveAnimations(timelines);
        }
      });

      anchor.addEventListener("click", (e) => {
        e.preventDefault();
        const current = this.navigation.querySelector(".active");
        if (current && current !== anchor) {
          this.playMouseLeaveAnimations(this.tlByAnchor.get(current));
          current.classList.remove("active");
        }
        anchor.classList.add("active");
        this.playActiveAnimations(timelines);

        const sectionId = anchor.dataset.section;
        const section = document.getElementById(sectionId);
        if (section) section.scrollIntoView({ behavior: "smooth" });
      });
    });
  }

  playMouseEnterAnimations(t) {
    t.text.timeScale(1).play();
    t.displacement.timeScale(1).play();
    t.scanline.timeScale(1).play();
    t.scanlinePattern.timeScale(1).play();
  }

  playMouseLeaveAnimations(t) {
    t.text.timeScale(2).reverse();
    t.displacement.timeScale(2).reverse();
    t.displacementActive.pause(0);
    t.scanline.pause(0);
    t.scanlinePattern.pause(0);
    t.active.timeScale(1).reverse();
  }

  playActiveAnimations(t) {
    t.active.timeScale(1).play();
    t.displacementActive.timeScale(1).play();
  }

  registerTimelines(anchor) {
    const container = anchor.querySelector("svg");
    const text = anchor.querySelector("text.red");
    const blueText = anchor.querySelector("text.blue");
    const displacement = anchor.querySelector(".displace");
    const scanline = anchor.querySelector(".scanline");
    const scanlinePattern = anchor.querySelector(".scanline-pattern");
    const activeElement = anchor.querySelectorAll(".fill");

    if (!text || !displacement || !container) return;

    const startX = Number(text.getAttribute("x"));
    let centerX = 100;
    try {
      const cw = container.getBBox().width;
      const tw = text.getBBox().width;
      centerX = (cw - tw) / 2 - startX;
    } catch (e) {}

    const h = 50;
    const { duration, easeIn, easeOut } = this.config;
    const tween = { ease: easeIn, easeReverse: easeOut, duration };
    const timeline = (options = {}) => gsap.timeline({ paused: true, ...options });

    const timelines = {
      text: timeline(),
      active: timeline(),
      scanline: timeline(),
      scanlinePattern: timeline(),
      displacement: timeline(),
      displacementActive: timeline({ repeat: -1, repeatDelay: 2, repeatRefresh: true })
    };

    timelines.text.to(text, { x: centerX, ...tween });
    timelines.text.to(blueText, { x: centerX, ...tween }, "0.1");

    timelines.displacement
      .to(displacement, { attr: { scale: () => this.randomFloat(0.08, 2) }, ease: easeIn, duration })
      .to(displacement, { attr: { scale: 0 }, ease: easeIn, duration: 0.3 }, duration);

    timelines.displacementActive
      .to(displacement, { attr: { scale: () => this.randomFloat(0.08, 0.4) }, ease: easeIn, duration: 0.5 })
      .to(displacement, {
        attr: { scale: 0 },
        ease: easeIn,
        duration: () => this.randomFloat(0.05, 0.1),
        onRepeat: () => {
          timelines.displacementActive.getChildren()[1].duration(this.randomFloat(0.05, 0.1));
        }
      });

    if (activeElement.length >= 2) {
      timelines.active.to(activeElement[1], { attr: { height: h }, ...tween });
      timelines.active.to(activeElement[0], { attr: { height: h }, ...tween }, "<0.04");
    }

    timelines.scanline.to(scanline, { fill: "#521d20", ...tween }, 0);
    timelines.scanline.to(scanline, { opacity: 0.3, ease: easeIn, duration: 0.1, repeat: -1 }, 0);
    timelines.scanlinePattern.to(scanlinePattern, { attr: { y: 10 }, duration: 0.65, ease: "none", repeat: -1 });

    this.tlByAnchor.set(anchor, timelines);
  }

  randomFloat(min, max) {
    return Math.random() * (max - min) + min;
  }
}

/* ==================== ACTIVE NAV SCROLL TRACKING ==================== */
function initNavScroll() {
  const sections = document.querySelectorAll("section[id]");
  const navBtns = document.querySelectorAll(".nav-btn");

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navBtns.forEach(btn => {
          btn.classList.toggle("active", btn.dataset.section === entry.target.id);
        });
      }
    });
  }, { threshold: 0.45 });

  sections.forEach(s => observer.observe(s));
}

/* ==================== HERO INTRO ANIMATION ==================== */
function initHeroIntro() {
  const title = document.querySelector(".glitch-title");
  const titleLayers = document.querySelectorAll(".glitch-title-layer");
  const typewriter = document.querySelector(".typewriter-container");
  const subtitle = document.querySelector(".hero-subtitle");
  const cta = document.querySelector(".hero-cta");
  const scrollInd = document.querySelector(".scroll-indicator");

  if (!title) return;

  gsap.set([title, ...titleLayers], { opacity: 0, scale: 1.15 });
  gsap.set([typewriter, subtitle, cta, scrollInd], { opacity: 0, y: 20 });

  const tl = gsap.timeline();
  tl.to(title, {
    opacity: 1, scale: 1, duration: 0.5,
    ease: RoughEase.ease.config({ strength: 5, points: 8 })
  })
  .to(titleLayers, { opacity: 0.75, scale: 1, duration: 0.3, ease: "power2.out" }, "-=0.3")
  .to(typewriter, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, "-=0.1")
  .to(subtitle, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, "-=0.2")
  .to(cta, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, "-=0.2")
  .to(scrollInd, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, "-=0.1");
}

/* ==================== GLITCH-IN SCROLL REVEAL ==================== */
function initGlitchReveal() {
  const targets = document.querySelectorAll(
    "section:not(#hero) .section-title, " +
    "section:not(#hero) .terminal-box, " +
    "section:not(#hero) .stat-card, " +
    "section:not(#hero) .cert-card, " +
    "section:not(#hero) .project-card, " +
    "section:not(#hero) .timeline-item, " +
    "section:not(#hero) .tech-stack"
  );

  targets.forEach(el => el.classList.add("glitch-in"));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        glitchIn(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -30px 0px" });

  targets.forEach(el => observer.observe(el));
}

function glitchIn(el) {
  const delay = Math.random() * 100;

  gsap.set(el, {
    opacity: 0,
    clipPath: "inset(30% 0 40% 0)",
    textShadow: "5px 0 rgba(255,0,80,0.9), -5px 0 rgba(0,200,255,0.9)",
    x: -18, y: 10, skewX: 3
  });

  gsap.timeline({ delay })
    .to(el, {
      opacity: 0.35,
      clipPath: "inset(0 0 65% 0)",
      x: 14, y: -6, skewX: -2,
      duration: 0.07, ease: "none"
    })
    .to(el, {
      opacity: 0.55,
      clipPath: "inset(60% 0 5% 0)",
      x: -10, y: 5, skewX: 2,
      textShadow: "3px 0 rgba(255,0,80,0.6), -3px 0 rgba(0,200,255,0.6)",
      duration: 0.07, ease: "none"
    })
    .to(el, {
      opacity: 0.75,
      clipPath: "inset(15% 0 25% 0)",
      x: 6, y: -3, skewX: 0,
      textShadow: "1px 0 rgba(255,0,80,0.3), -1px 0 rgba(0,200,255,0.3)",
      duration: 0.07, ease: "none"
    })
    .to(el, {
      opacity: 1,
      clipPath: "inset(0 0 0 0)",
      x: 0, y: 0, skewX: 0,
      duration: 0.35,
      ease: RoughEase.ease.config({ strength: 4, points: 8 }),
      clearProps: "textShadow,clipPath"
    });
}

/* ==================== TYPEWRITER ==================== */
function initTypewriter() {
  const el = document.querySelector(".typewriter");
  if (!el) return;
  const phrases = [
    "> Web Developer",
    "> AI Enthusiast",
    "> Problem Solver",
    "> Code Architect",
    "> Pixel Perfectionist",
    "> Full-Stack Builder"
  ];
  let phraseIdx = 0, charIdx = 0, isDeleting = false;

  function tick() {
    const current = phrases[phraseIdx];
    if (!isDeleting) {
      el.textContent = current.substring(0, charIdx + 1);
      charIdx++;
      if (charIdx === current.length) {
        setTimeout(() => { isDeleting = true; tick(); }, 2200);
        return;
      }
    } else {
      el.textContent = current.substring(0, charIdx - 1);
      charIdx--;
      if (charIdx === 0) {
        isDeleting = false;
        phraseIdx = (phraseIdx + 1) % phrases.length;
        setTimeout(tick, 350);
        return;
      }
    }
    setTimeout(tick, isDeleting ? 38 : 75);
  }
  setTimeout(tick, 800);
}

/* ==================== PARTICLE BACKGROUND ==================== */
function initParticles() {
  const canvas = document.getElementById("bg-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let w, h;
  const particles = [];
  const MAX = 90;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resize);
  resize();

  class Particle {
    constructor() {
      this.x = Math.random() * w;
      this.y = h + Math.random() * 60;
      this.size = Math.random() * 1.8 + 0.4;
      this.speedY = Math.random() * 0.5 + 0.12;
      this.speedX = (Math.random() - 0.5) * 0.35;
      this.opacity = Math.random() * 0.55 + 0.08;
      this.hue = Math.random() < 0.5 ? "90,204,245" : "245,90,107";
      this.twinkle = (Math.random() - 0.5) * 0.04;
    }
    update() {
      this.y -= this.speedY;
      this.x += this.speedX + Math.sin(this.y * 0.008) * 0.3;
      this.opacity += this.twinkle;
      if (this.opacity > 0.7 || this.opacity < 0.05) this.twinkle *= -1;
      if (this.y < -15) { this.y = h + 15; this.x = Math.random() * w; }
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.hue},${this.opacity})`;
      ctx.fill();
    }
  }

  for (let i = 0; i < MAX; i++) particles.push(new Particle());

  let rafId;

  function animate() {
    ctx.clearRect(0, 0, w, h);
    particles.forEach(p => { p.update(); p.draw(); });

    ctx.globalAlpha = 0.04;
    for (let i = 0; i < 6; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.fillStyle = Math.random() < 0.5
        ? "rgba(90,204,245,0.5)"
        : "rgba(245,90,107,0.5)";
      ctx.fillRect(x, y, Math.random() * 80 + 10, 1);
    }
    ctx.globalAlpha = 1;
    rafId = requestAnimationFrame(animate);
  }
  animate();

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
    } else {
      animate();
    }
  });
}

/* ==================== COUNTERS ==================== */
function initCounters() {
  const counters = document.querySelectorAll(".stat-number");
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = +el.dataset.target;
        const suffix = el.dataset.suffix || "";
        const duration = 1600;
        const start = performance.now();

        function update(now) {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 4);
          const current = Math.round(eased * target);
          el.textContent = current + suffix;
          if (progress < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.6 });

  counters.forEach(c => observer.observe(c));
}

/* ==================== RANDOM GLITCH BURSTS ==================== */
function initRandomGlitches() {
  function triggerGlitch() {
    const targets = document.querySelectorAll(
      ".glitch-title, .section-title, .cert-card, .stat-card, " +
      ".terminal-box, .tag, .btn, .project-link, .timeline-dot, .brand-title"
    );
    if (!targets.length) return;

    const el = targets[Math.floor(Math.random() * targets.length)];

    gsap.to(el, {
      x: (Math.random() - 0.5) * 10,
      y: (Math.random() - 0.5) * 6,
      duration: 0.04,
      repeat: 4,
      yoyo: true,
      ease: "power4.inOut",
      onComplete: () => { gsap.set(el, { x: 0, y: 0 }); }
    });

    const chromaColors = [
      "3px 0 rgba(255,0,0,0.65), -3px 0 rgba(0,255,255,0.65)",
      "-2px 0 rgba(255,0,100,0.6), 2px 0 rgba(100,255,255,0.6)",
      "4px 0 rgba(245,90,107,0.55), -4px 0 rgba(90,204,245,0.55)"
    ];
    gsap.to(el, {
      textShadow: chromaColors[Math.floor(Math.random() * chromaColors.length)],
      duration: 0.08,
      yoyo: true,
      repeat: 1
    });

    setTimeout(triggerGlitch, Math.random() * 5000 + 1500);
  }

  setTimeout(triggerGlitch, 8000);
}

/* ==================== FORM GLITCH SUBMIT ==================== */
function initFormGlitch() {
  const form = document.querySelector(".contact-form");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const btn = form.querySelector(".btn");
    const origText = btn.textContent;
    const garbled = ["S3ND1NG...", "[TRANSMITTING]", "ENCRYPT1NG>", "UPLOADING>"];

    let i = 0;
    const interval = setInterval(() => {
      btn.textContent = garbled[i % garbled.length];
      i++;
    }, 80);

    gsap.timeline({ repeat: 10, yoyo: true })
      .to(btn, { x: () => (Math.random() - 0.5) * 14, y: () => (Math.random() - 0.5) * 8, duration: 0.04 })
      .eventCallback("onComplete", () => {
        clearInterval(interval);
        btn.textContent = "MSG_SENT // OK";
        btn.style.borderColor = "#39ff14";
        btn.style.color = "#39ff14";
        btn.style.boxShadow = "0 0 15px #39ff14, 0 0 40px rgba(57,255,20,0.3)";
        gsap.set(btn, { x: 0, y: 0 });
        setTimeout(() => {
          btn.textContent = origText;
          btn.style.borderColor = "";
          btn.style.color = "";
          btn.style.boxShadow = "";
          form.reset();
        }, 2800);
      });
  });
}
