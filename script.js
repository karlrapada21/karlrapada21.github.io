document.addEventListener("DOMContentLoaded", () => {
  gsap.registerPlugin(ScrollTrigger, EasePack);

  initTypewriter();
  initParticles();
  initCounters();
  initScrollReveal();
  initNavScroll();
  initRoughGlitches();
  initFormGlitch();
});

/* ===== Typewriter Effect ===== */
function initTypewriter() {
  const el = document.querySelector(".typewriter");
  const phrases = [
    "> Web Developer",
    "> AI Enthusiast",
    "> Problem Solver",
    "> Code Architect",
    "> Pixel Perfectionist"
  ];
  let phraseIdx = 0;
  let charIdx = 0;
  let isDeleting = false;

  function tick() {
    const current = phrases[phraseIdx];
    if (!isDeleting) {
      el.textContent = current.substring(0, charIdx + 1);
      charIdx++;
      if (charIdx === current.length) {
        setTimeout(() => { isDeleting = true; tick(); }, 2000);
        return;
      }
    } else {
      el.textContent = current.substring(0, charIdx - 1);
      charIdx--;
      if (charIdx === 0) {
        isDeleting = false;
        phraseIdx = (phraseIdx + 1) % phrases.length;
        setTimeout(tick, 400);
        return;
      }
    }
    const speed = isDeleting ? 40 : 80;
    setTimeout(tick, speed);
  }

  setTimeout(tick, 500);
}

/* ===== Particle Background ===== */
function initParticles() {
  const canvas = document.getElementById("bg-canvas");
  const ctx = canvas.getContext("2d");
  let w, h;
  const particles = [];
  const MAX = 80;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resize);
  resize();

  class Particle {
    constructor() {
      this.reset(true);
    }

    reset(init) {
      this.x = init ? Math.random() * w : Math.random() * w;
      this.y = init ? Math.random() * h : h + 10;
      this.size = Math.random() * 1.5 + 0.5;
      this.speedY = Math.random() * 0.4 + 0.1;
      this.speedX = (Math.random() - 0.5) * 0.3;
      this.opacity = Math.random() * 0.5 + 0.1;
      this.hue = Math.random() < 0.5 ? "5accf5" : "f55a6b";
    }

    update() {
      this.y -= this.speedY;
      this.x += this.speedX + Math.sin(this.y * 0.01) * 0.2;
      if (this.y < -10) { this.y = h + 10; this.x = Math.random() * w; }
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `#${this.hue}`;
      ctx.globalAlpha = this.opacity;
      ctx.fill();
    }
  }

  for (let i = 0; i < MAX; i++) particles.push(new Particle());

  function animate() {
    ctx.clearRect(0, 0, w, h);
    particles.forEach(p => { p.update(); p.draw(); });
    ctx.globalAlpha = 1;
    requestAnimationFrame(animate);
  }
  animate();
}

/* ===== Counter Animation ===== */
function initCounters() {
  const counters = document.querySelectorAll(".stat-number");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = +el.dataset.target;
        const suffix = el.textContent.includes("%") ? "%" : "";
        const duration = 1500;
        const start = performance.now();

        function update(now) {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = Math.round(eased * target);
          el.textContent = current + suffix;
          if (progress < 1) requestAnimationFrame(update);
        }

        requestAnimationFrame(update);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(c => observer.observe(c));
}

/* ===== Scroll Reveal ===== */
function initScrollReveal() {
  const revealElements = document.querySelectorAll(
    ".section-title, .terminal-box, .stat-card, .cert-card, .project-card, .timeline-item, .tag"
  );

  revealElements.forEach(el => el.classList.add("reveal"));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });

  revealElements.forEach(el => observer.observe(el));
}

/* ===== Active Nav Link on Scroll ===== */
function initNavScroll() {
  const sections = document.querySelectorAll("section[id]");
  const navLinks = document.querySelectorAll(".nav-link");

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(link => {
          link.style.color = link.getAttribute("href") === `#${entry.target.id}`
            ? "#5accf5"
            : "";
          link.style.textShadow = link.getAttribute("href") === `#${entry.target.id}`
            ? "0 0 10px #5accf5, 0 0 40px rgba(90,204,245,0.25)"
            : "";
        });
      }
    });
  }, { threshold: 0.5 });

  sections.forEach(s => observer.observe(s));
}

/* ===== Random Glitch Bursts ===== */
function initRoughGlitches() {
  const glitchTargets = document.querySelectorAll(".glitch, .section-title, .cert-card");

  function randomGlitch() {
    const el = glitchTargets[Math.floor(Math.random() * glitchTargets.length)];
    if (!el) return;

    const original = el.style.transform;
    const shakeX = (Math.random() - 0.5) * 8;
    const shakeY = (Math.random() - 0.5) * 4;

    gsap.to(el, {
      x: shakeX,
      y: shakeY,
      duration: 0.05,
      repeat: 3,
      yoyo: true,
      ease: "power4.inOut",
      onComplete: () => { gsap.set(el, { x: 0, y: 0 }); }
    });

    gsap.to(el, {
      textShadow: () => {
        const h = Math.random() * 360;
        return `3px 0 rgba(255,0,0,0.6), -3px 0 rgba(0,255,255,0.6)`;
      },
      duration: 0.1,
      yoyo: true,
      repeat: 1
    });

    setTimeout(randomGlitch, Math.random() * 6000 + 3000);
  }

  setTimeout(randomGlitch, 3000);
}

/* ===== Form Submit Glitch Effect ===== */
function initFormGlitch() {
  const form = document.querySelector(".contact-form");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const btn = form.querySelector(".btn");
    const originalText = btn.textContent;
    const garbled = ["S3ND1NG", "SEND_M3SS4GE", "TRANSMITTING", "UPLOADING..."];

    let i = 0;
    const interval = setInterval(() => {
      btn.textContent = garbled[i % garbled.length];
      i++;
    }, 100);

    gsap.to(btn, {
      x: () => (Math.random() - 0.5) * 12,
      y: () => (Math.random() - 0.5) * 6,
      duration: 0.05,
      repeat: 8,
      yoyo: true,
      onComplete: () => {
        clearInterval(interval);
        btn.textContent = "MESSAGE_SENT // OK";
        btn.style.borderColor = "#39ff14";
        btn.style.color = "#39ff14";
        setTimeout(() => {
          btn.textContent = originalText;
          btn.style.borderColor = "";
          btn.style.color = "";
          form.reset();
        }, 3000);
      }
    });
  });
}
