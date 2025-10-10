/*
  Melex IT Interactions
  - Preloader control
  - Particle background + cursor trails
  - Scroll reveal
  - Card tilt/flip
  - XP system with localStorage + animated counter
  - Ambient sound (WebAudio) with toggle and persistence
  - MelaBot floating chat demo
  - Mobile nav menu toggle
  - Dynamic footer year
*/

(function() {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /********************* PRELOADER *********************/
  const preloader = $('#preloader');
  function hidePreloader() {
    if (!preloader) return;
    preloader.classList.add('preloader-hide');
    setTimeout(() => preloader.remove(), 700);
  }
  window.addEventListener('load', () => setTimeout(hidePreloader, 500));

  /********************* BACKGROUND PARTICLES *********************/
  const canvas = $('#bg');
  const ctx = canvas.getContext('2d');
  let width, height, dpr;

  function resizeCanvas() {
    dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    width = canvas.clientWidth = window.innerWidth;
    height = canvas.clientHeight = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const NUM_PARTICLES = 80;
  const particles = [];
  for (let i = 0; i < NUM_PARTICLES; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 1 + Math.random() * 2.2,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      hue: 200 + Math.random() * 120,
      alpha: 0.15 + Math.random() * 0.25,
    });
  }

  const trail = [];
  const TRAIL_MAX = 70;
  window.addEventListener('mousemove', (e) => {
    for (let i = 0; i < 4; i++) {
      trail.push({
        x: e.clientX + (Math.random() - 0.5) * 6,
        y: e.clientY + (Math.random() - 0.5) * 6,
        life: 1,
        r: 2 + Math.random() * 3,
        hue: 180 + Math.random() * 160,
      });
    }
    if (trail.length > TRAIL_MAX) trail.splice(0, trail.length - TRAIL_MAX);
  });

  function stepParticles() {
    ctx.clearRect(0, 0, width, height);

    // slow drift particles
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < -10) p.x = width + 10; if (p.x > width + 10) p.x = -10;
      if (p.y < -10) p.y = height + 10; if (p.y > height + 10) p.y = -10;
      ctx.beginPath();
      ctx.fillStyle = `hsla(${p.hue}, 80%, 60%, ${p.alpha})`;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // cursor trail
    for (let i = trail.length - 1; i >= 0; i--) {
      const t = trail[i];
      t.life -= 0.02; t.r *= 0.985;
      if (t.life <= 0.02) { trail.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.fillStyle = `hsla(${t.hue}, 90%, 60%, ${t.life * 0.7})`;
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(stepParticles);
  }
  requestAnimationFrame(stepParticles);

  /********************* SCROLL REVEAL *********************/
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    }
  }, { root: null, rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
  $$('.reveal').forEach(el => observer.observe(el));

  /********************* CARD TILT *********************/
  $$('.tilt').forEach(card => {
    const inner = $('.card-inner', card);
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      const rx = (py - 0.5) * 10; // rotateX
      const ry = (0.5 - px) * 10; // rotateY
      inner.style.transform = `translateY(-3px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      inner.style.transform = '';
    });
  });

  /********************* XP SYSTEM *********************/
  const xpBadge = $('#xp-badge');
  const xpValueEl = $('#xp-value');
  const XP_KEY = 'melex_xp';
  let xp = parseInt(localStorage.getItem(XP_KEY) || '0', 10);
  let animatingCount = false;

  function animateNumber(el, from, to, duration = 800) {
    const start = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - start) / duration);
      const val = Math.floor(from + (to - from) * (1 - Math.pow(1 - p, 4)));
      el.textContent = val.toString();
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function setXP(newVal) {
    const prev = xp; xp = Math.max(0, newVal);
    localStorage.setItem(XP_KEY, String(xp));
    animateNumber(xpValueEl, prev, xp);
  }
  function addXP(amount = 1) { setXP(xp + amount); }

  // initialize display
  xpValueEl.textContent = String(xp);

  // award XP for various interactions
  const awardedSections = new Set();
  const sectionAwards = [
    ['#hero', 5],
    ['#services', 10],
    ['#ecosystem', 8],
    ['#about', 6],
    ['#register', 12],
    ['#contact', 6],
  ];
  sectionAwards.forEach(([sel, amt]) => {
    const el = $(sel);
    if (!el) return;
    const onceObs = new IntersectionObserver((entries, obs) => {
      entries.forEach(ent => {
        if (ent.isIntersecting && !awardedSections.has(sel)) {
          awardedSections.add(sel); addXP(amt); obs.disconnect();
        }
      });
    }, { threshold: 0.5 });
    onceObs.observe(el);
  });

  // card hover gives a tiny XP buff
  $$('.card').forEach(c => {
    c.addEventListener('mouseenter', () => addXP(parseInt(c.dataset.xp || '1', 10)));
  });

  // register actions
  $('#register-hero')?.addEventListener('click', () => addXP(15));
  $('#register-nav')?.addEventListener('click', () => addXP(15));
  $('#register-submit')?.addEventListener('click', () => addXP(30));

  /********************* AMBIENT SOUND *********************/
  const soundToggle = $('#sound-toggle');
  const SOUND_KEY = 'melex_sound';
  let audioCtx, nodes = [], soundOn = localStorage.getItem(SOUND_KEY) === '1';

  function createAmbient() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const master = audioCtx.createGain(); master.gain.value = 0.0001; master.connect(audioCtx.destination);
    const filter = audioCtx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 800; filter.Q.value = 0.7; filter.connect(master);

    const freqs = [110, 146.83, 196]; // simple soft triad
    freqs.forEach((f, i) => {
      const osc = audioCtx.createOscillator(); osc.type = 'sine'; osc.frequency.value = f;
      const g = audioCtx.createGain(); g.gain.value = 0.0001;
      osc.connect(g); g.connect(filter); osc.start();
      nodes.push(osc, g);
    });
    // gentle fade in
    const now = audioCtx.currentTime;
    master.gain.exponentialRampToValueAtTime(0.15, now + 2.0);
    nodes.master = master; nodes.filter = filter;
  }
  function destroyAmbient() {
    if (!audioCtx) return;
    const master = nodes.master; if (master) master.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.6);
    setTimeout(() => {
      nodes.forEach(node => { try { node.stop?.(); node.disconnect?.(); } catch(_){} });
      nodes = []; nodes.master = null; nodes.filter = null;
    }, 700);
  }
  function updateSoundToggle() { soundToggle.textContent = `Sound: ${soundOn ? 'On' : 'Off'}`; soundToggle.setAttribute('aria-pressed', soundOn ? 'true' : 'false'); }

  updateSoundToggle();
  if (soundOn) {
    // browsers require user gesture to start
    const kick = () => { createAmbient(); addXP(3); window.removeEventListener('pointerdown', kick); };
    window.addEventListener('pointerdown', kick, { once: true });
  }
  soundToggle.addEventListener('click', async () => {
    soundOn = !soundOn; localStorage.setItem(SOUND_KEY, soundOn ? '1' : '0'); updateSoundToggle();
    if (soundOn) { if (audioCtx?.state === 'suspended') await audioCtx.resume(); createAmbient(); addXP(3); }
    else { destroyAmbient(); }
  });

  /********************* CHATBOT *********************/
  const chatbotBtn = $('#melabot');
  const chatModal = $('#chat-modal');
  const chatClose = $('.chat-close', chatModal);
  const chatBody = $('#chat-body');
  const chatForm = $('#chat-form');
  const chatText = $('#chat-text');

  function openChat() {
    chatModal.hidden = false; addXP(5);
    setTimeout(() => chatText.focus(), 50);
  }
  function closeChat() { chatModal.hidden = true; }

  chatbotBtn.addEventListener('click', openChat);
  chatClose.addEventListener('click', closeChat);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !chatModal.hidden) closeChat(); });

  chatForm.addEventListener('submit', () => {
    const text = chatText.value.trim();
    if (!text) return;
    chatText.value = '';
    const userMsg = document.createElement('div'); userMsg.className = 'msg user'; userMsg.textContent = text; chatBody.appendChild(userMsg);
    chatBody.scrollTop = chatBody.scrollHeight;
    setTimeout(() => {
      const botMsg = document.createElement('div'); botMsg.className = 'msg bot';
      botMsg.textContent = 'MelaBot: Thanks! This is a demo chat. A real assistant will be here soon.';
      chatBody.appendChild(botMsg); chatBody.scrollTop = chatBody.scrollHeight;
    }, 500);
  });

  /********************* MOBILE NAV TOGGLE *********************/
  const menuToggle = $('#menu-toggle');
  const menu = $('#menu');
  menuToggle.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  /********************* FOOTER YEAR *********************/
  $('#year').textContent = new Date().getFullYear();
})();
