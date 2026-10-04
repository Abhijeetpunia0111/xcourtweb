/* ==========================================================
   Ribbon section — pinned, scroll-driven
   1. a gradient ribbon sweeps in, passes BEHIND the athlete, loops
      over their head, then crosses IN FRONT of them
   2. the leading end swells as it travels
   3. a circle grows from the tip until the whole window is lime
   4. the copy fades in on that lime, then the page scrolls on as normal

   Everything is drawn in one "design space" (1600 x 900, athlete
   centred, feet on the bottom edge) that is fitted to the window,
   so the ribbon and the athlete always line up.

   Dev hook: add ?ribp=0.5 to the URL to freeze the animation at
   50% (0–1) — handy for tuning the path.
   ========================================================== */
(() => {
  'use strict';

  const stage = document.getElementById('ribStage');
  if (!stage || !window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  const $ = (s, r = document) => r.querySelector(s);
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const frozen = new URLSearchParams(location.search).get('ribp');

  const cvBack = $('#ribBack'), cvFront = $('#ribFront');
  const ctxBack = cvBack.getContext('2d'), ctxFront = cvFront.getContext('2d');
  const svg = $('#ribAth'), flood = $('#ribFlood');
  const titleEl = $('#ribTitle'), hint = $('#ribHint');

  /* ---------- look ---------- */
  // tail -> head. The head colour equals --lime so the flood and the next section are seamless.
  const STOPS = [
    [0.00, [15, 157, 88]],
    [0.40, [88, 204, 72]],
    [0.75, [176, 232, 70]],
    [1.00, [214, 242, 106]],
  ];
  const gradAt = (u) => {
    for (let i = 1; i < STOPS.length; i++) {
      if (u <= STOPS[i][0]) {
        const [a, ca] = STOPS[i - 1], [b, cb] = STOPS[i];
        let t = (u - a) / (b - a); t = t * t * (3 - 2 * t);   // smoothstep: no visible kink at the stops
        return `rgb(${Math.round(lerp(ca[0], cb[0], t))},${Math.round(lerp(ca[1], cb[1], t))},${Math.round(lerp(ca[2], cb[2], t))})`;
      }
    }
    return 'rgb(214,242,106)';
  };
  // ribbon thickness along its length (design units): thin tail, swelling head
  const widthAt = (u) => 16 + 34 * u + 300 * Math.pow(u, 12);
  const STEP = 5;                           // resample spacing (design units)

  /* ---------- design space ---------- */
  // Athlete image is placed in design units (see index.html); her body spans x ≈ 410–1190, y ≈ 40–880.
  const SAFE_W = 820, SAFE_H = 880, FLOOR_Y = 900, CENTER_X = 800;

  const view = { W: 0, H: 0, dpr: 1, x0: 0, y0: 0, w: 0, h: 0, k: 1 };
  let N = 0, cx, cy, nx, ny, wd, uu, tg, region, col;
  let FRONT_A = 13.3, FRONT_B = 16.5;       // control-point range where the ribbon passes in front

  function fitView() {
    const r = stage.getBoundingClientRect();
    view.W = Math.max(1, r.width); view.H = Math.max(1, r.height);
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    view.h = Math.max(SAFE_H, SAFE_W * view.H / view.W);
    view.w = view.h * view.W / view.H;
    view.x0 = CENTER_X - view.w / 2;
    view.y0 = FLOOR_Y - view.h;
    view.k = view.W / view.w;
    svg.setAttribute('viewBox', `${view.x0} ${view.y0} ${view.w} ${view.h}`);
    for (const cv of [cvBack, cvFront]) {
      cv.width = Math.round(view.W * view.dpr); cv.height = Math.round(view.H * view.dpr);
    }
  }

  /* ---------- centreline: centripetal Catmull-Rom through hand-placed points ---------- */
  function controlPoints() {
    // anchored to the athlete (see athlete placement in index.html); narrow screens pull the right-hand
    // loop in so it stays on screen, and the tip always ends near the window's right edge.
    const f = clamp(view.w / 1564, 0.55, 1);
    const sx = (x) => CENTER_X + (x - CENTER_X) * f;
    const ex = Math.min(1560, view.x0 + view.w * 0.94);
    const P = [
      [-460, 800], [-60, 770], [320, 800], [600, 850],      // 0-3   sweep in along the floor (behind the feet)
      [900, 880], [sx(1230), 800], [sx(1340), 560],         // 4-6   behind the legs, up the right side
      [sx(1300), 300], [sx(1200), 80], [900, 40],           // 7-9   over the raised hand and ball (behind them)
      [640, 60], [400, 200], [330, 440], [420, 620],        // 10-13 down the left side, past the paddle
      [620, 665], [860, 650], [1080, 600],                  // 14-16 across the dress, IN FRONT
    ];
    const lx = P[16][0];
    P.push([lerp(lx, ex, 0.30), 520], [lerp(lx, ex, 0.62), 430], [ex, 335]);   // 17-19 away and up, swelling
    return P;
  }

  function cr(p0, p1, p2, p3, t) {
    const d = (a, b) => Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1])) || 1e-3;
    const t0 = 0, t1 = t0 + d(p0, p1), t2 = t1 + d(p1, p2), t3 = t2 + d(p2, p3);
    const tt = lerp(t1, t2, t);
    const mix = (a, b, ta, tb) => [(tb - tt) / (tb - ta) * a[0] + (tt - ta) / (tb - ta) * b[0], (tb - tt) / (tb - ta) * a[1] + (tt - ta) / (tb - ta) * b[1]];
    const A1 = mix(p0, p1, t0, t1), A2 = mix(p1, p2, t1, t2), A3 = mix(p2, p3, t2, t3);
    const B1 = mix(A1, A2, t0, t2), B2 = mix(A2, A3, t1, t3);
    return mix(B1, B2, t1, t2);
  }

  function buildRibbon() {
    const P = controlPoints(), n = P.length;
    const ext = (a, b) => [2 * a[0] - b[0], 2 * a[1] - b[1]];
    const Q = [ext(P[0], P[1]), ...P, ext(P[n - 1], P[n - 2])];
    const raw = [], SUB = 48;
    for (let k = 0; k < n - 1; k++) {
      for (let j = 0; j < SUB; j++) { const q = cr(Q[k], Q[k + 1], Q[k + 2], Q[k + 3], j / SUB); raw.push([q[0], q[1], k + j / SUB]); }
    }
    raw.push([P[n - 1][0], P[n - 1][1], n - 1]);

    // uniform arclength resample
    const len = [0];
    for (let i = 1; i < raw.length; i++) len.push(len[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]));
    const total = len[len.length - 1];
    N = Math.floor(total / STEP) + 1;
    [cx, cy, nx, ny, wd, uu, tg] = [0, 0, 0, 0, 0, 0, 0].map(() => new Float32Array(N));
    region = new Uint8Array(N); col = new Array(N);
    let s = 0;
    for (let i = 0; i < N; i++) {
      const L = Math.min(i * STEP, total);
      while (s < raw.length - 2 && len[s + 1] < L) s++;
      const t = (L - len[s]) / Math.max(1e-6, len[s + 1] - len[s]);
      cx[i] = lerp(raw[s][0], raw[s + 1][0], t); cy[i] = lerp(raw[s][1], raw[s + 1][1], t);
      tg[i] = lerp(raw[s][2], raw[s + 1][2], t);
      uu[i] = L / total; wd[i] = widthAt(uu[i]);
      col[i] = gradAt(uu[i]);                           // every sample gets its own colour -> perfectly smooth
      region[i] = tg[i] >= FRONT_A && tg[i] <= FRONT_B ? 1 : 0;
    }
    for (let i = 0; i < N; i++) {
      const a = Math.max(0, i - 1), b = Math.min(N - 1, i + 1);
      let dx = cx[b] - cx[a], dy = cy[b] - cy[a]; const m = Math.hypot(dx, dy) || 1;
      nx[i] = -dy / m; ny[i] = dx / m;
    }
  }

  /* ---------- drawing ---------- */
  function strip(ctx, i, e, style, half) {
    ctx.beginPath();
    for (let m = i; m <= e; m++) { const o = wd[m] / 2; m === i ? ctx.moveTo(cx[m] + nx[m] * o, cy[m] + ny[m] * o) : ctx.lineTo(cx[m] + nx[m] * o, cy[m] + ny[m] * o); }
    for (let m = e; m >= i; m--) { const o = half ? 0 : -wd[m] / 2; ctx.lineTo(cx[m] + nx[m] * o, cy[m] + ny[m] * o); }
    ctx.closePath(); ctx.fillStyle = style; ctx.fill();
  }

  function drawRibbon(p) {
    const T = view.dpr * view.k;
    for (const ctx of [ctxBack, ctxFront]) {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, view.W * view.dpr, view.H * view.dpr);
      ctx.setTransform(T, 0, 0, T, -view.x0 * T, -view.y0 * T);
    }
    if (p <= 0) return;
    const n = Math.max(1, Math.min(N - 1, Math.floor(p * (N - 1))));
    let i = 0;
    while (i < n) {                                       // body: a short strip per sample (equal neighbours are merged)
      let j = i;
      while (j < n - 1 && col[j + 1] === col[i] && region[j + 1] === region[i]) j++;
      strip(region[i] ? ctxFront : ctxBack, Math.max(0, i - 1), Math.min(n, j + 1), col[i], false);   // starts one sample early so it overlaps (and hides) the previous seam
      i = j + 1;
    }
    i = 0;
    while (i < n) {                                       // soft highlight on one edge: one polygon per run, so no seams
      let j = i;
      while (j < n && region[j + 1] === region[i]) j++;
      strip(region[i] ? ctxFront : ctxBack, i, Math.min(n, j + 1), 'rgba(255,255,255,.16)', true);
      i = j + 1;
    }
    const ctx = region[n] ? ctxFront : ctxBack;           // round, swelling head
    ctx.beginPath(); ctx.arc(cx[n], cy[n], wd[n] / 2, 0, Math.PI * 2); ctx.fillStyle = col[n]; ctx.fill();
  }

  function drawFlood(f) {
    const hx = (cx[N - 1] - view.x0) * view.k, hy = (cy[N - 1] - view.y0) * view.k, r0 = wd[N - 1] / 2 * view.k;
    const far = Math.max(Math.hypot(hx, hy), Math.hypot(view.W - hx, hy), Math.hypot(hx, view.H - hy), Math.hypot(view.W - hx, view.H - hy)) + 4;
    flood.style.clipPath = f <= 0 ? `circle(0px at ${hx}px ${hy}px)` : `circle(${lerp(r0, far, f)}px at ${hx}px ${hy}px)`;
  }

  /* ---------- scroll -> state ---------- */
  // phases of the pinned scroll (0–1):  ribbon .03–.60 · flood .60–.82 · copy fades in .80–.97 · hold · unpin
  const easeIO = gsap.parseEase('power1.inOut'), easeF = gsap.parseEase('power2.inOut'), easeO = gsap.parseEase('power2.out');
  const copyEls = [...document.querySelectorAll('#ribCopy .rn-k, #ribCopy .rn-line, #ribCopy .rn-lead, #ribCopy .rn-cta')];
  let lastT = 0;
  function render(t) {
    lastT = t;
    const p = easeIO(clamp((t - 0.03) / 0.57));
    const f = easeF(clamp((t - 0.60) / 0.22));
    drawRibbon(p); drawFlood(f);
    titleEl.style.opacity = 1 - clamp((t - 0.20) / 0.25);
    titleEl.style.transform = `translate3d(0,${(-t * 60).toFixed(1)}px,0)`;
    hint.style.opacity = 1 - clamp(t / 0.03);
    const q = clamp((t - 0.80) / 0.17);                   // copy: each piece fades up in turn
    copyEls.forEach((el, k) => {
      const e = easeO(clamp((q - k * 0.13) / 0.45));
      el.style.opacity = e.toFixed(3);
      el.style.transform = `translate3d(0,${((1 - e) * 46).toFixed(1)}px,0)`;
      el.style.filter = el.classList.contains('rn-line') && e < 1 ? `blur(${((1 - e) * 12).toFixed(1)}px)` : '';
    });
  }

  function layout() { fitView(); buildRibbon(); render(lastT); }

  /* ---------- boot ---------- */
  layout();
  new ResizeObserver(() => { layout(); }).observe(stage);
  addEventListener('load', () => ScrollTrigger.refresh());

  if (frozen != null) { render(clamp(parseFloat(frozen) || 0)); return; }

  if (reduceMotion) { render(1); return; }

  // entrance (once, as the section scrolls into view)
  const lines = titleEl.querySelectorAll('.rib-l > span');
  gsap.set(lines, { yPercent: 110 });
  gsap.set(svg, { opacity: 0, y: 70 });
  ScrollTrigger.create({
    trigger: '.rib', start: 'top 82%', once: true,
    onEnter: () => {
      gsap.to(svg, { opacity: 1, y: 0, duration: 1.5, ease: 'expo.out' });
      gsap.to(lines, { yPercent: 0, duration: 1.4, ease: 'expo.out', stagger: 0.1, delay: 0.1 });
    },
  });

  // the pinned, scrubbed ribbon -> flood -> copy.  A long pin (900% of the viewport) keeps this section slow;
  // raise/lower `end` to change the pace.  `scrub: 1` adds a second of easing on top of the page's smooth scroll.
  ScrollTrigger.create({
    trigger: '.rib', start: 'top top', end: '+=900%', pin: true, scrub: 1, anticipatePin: 1,
    onUpdate: (self) => render(self.progress),
  });
})();
