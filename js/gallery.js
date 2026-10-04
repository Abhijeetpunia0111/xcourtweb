/* Gallery page: hero intro, scroll reveals, count-up stats, lightbox for every [data-lb] photo. */
(() => {
  'use strict';
  const X = window.XCS || {};
  const $ = X.$ || ((s, r = document) => r.querySelector(s));
  const $$ = X.$$ || ((s, r = document) => Array.from(r.querySelectorAll(s)));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const has = window.gsap && window.ScrollTrigger;

  /* ---------- hero intro + slow push-in ---------- */
  if (has && !reduce) {
    gsap.set('.g-l > span', { yPercent: 115 });
    gsap.set('.g-hero-in .kicker, .g-sub, .g-jump a', { opacity: 0, y: 24 });
    gsap.timeline({ defaults: { ease: 'expo.out' }, delay: 0.15 })
      .to('.g-hero-in .kicker', { opacity: 1, y: 0, duration: 1 }, 0)
      .to('.g-l > span', { yPercent: 0, duration: 1.5, stagger: 0.12 }, 0.1)
      .to('.g-sub', { opacity: 1, y: 0, duration: 1.1 }, 0.5)
      .to('.g-jump a', { opacity: 1, y: 0, duration: 1, stagger: 0.07 }, 0.65);
    gsap.fromTo('.g-hero-img', { scale: 1.16 }, { scale: 1.02, duration: 3, ease: 'power2.out' });
    gsap.to('.g-hero-img', { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.g-hero', start: 'top top', end: 'bottom top', scrub: true } });
  }

  /* ---------- hero video (football): muted loop, shown once it is really playing, paused when scrolled away ---------- */
  const vid = document.getElementById('gVid');
  if (vid && !reduce) {
    vid.addEventListener('playing', () => vid.classList.add('is-shown'), { once: true });
    const go = () => vid.play().catch(() => {});
    go();
    if ('IntersectionObserver' in window) new IntersectionObserver(([en]) => { en.isIntersecting ? go() : vid.pause(); }).observe(vid);
  }

  /* ---------- reveals + counters ---------- */
  if (has) {
    ScrollTrigger.batch('[data-reveal]', {
      start: 'top 90%', once: true,
      onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1.2, stagger: 0.09, ease: 'expo.out', overwrite: true }),
    });
    $$('[data-count]').forEach((el) => {
      const end = +el.dataset.count, o = { v: 0 };
      ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => gsap.to(o, { v: end, duration: reduce ? 0.01 : 1.8, ease: 'power3.out', onUpdate: () => { el.textContent = Math.round(o.v); } }) });
    });
    window.addEventListener('load', () => ScrollTrigger.refresh());
  } else {
    $$('[data-reveal]').forEach((el) => { el.style.opacity = 1; el.style.transform = 'none'; });
    $$('[data-count]').forEach((el) => { el.textContent = el.dataset.count; });
  }

  /* ---------- in-page jump links ---------- */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('.g-jump a'); if (!a) return;
    const t = $(a.getAttribute('href')); if (!t) return;
    e.preventDefault();
    if (X.scrollToY) X.scrollToY(t, { offset: -40 }); else t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  });
  window.addEventListener('load', () => {
    const h = location.hash; if (!h || h.length < 2 || h === '#book') return;
    const t = $(h); if (t && X.scrollToY) setTimeout(() => X.scrollToY(t, { offset: -40 }), 300);
  });

  /* ---------- lightbox ---------- */
  const lb = $('#gLb'), img = $('#gLbImg');
  const items = $$('[data-lb]');
  const alt = (el) => { const i = $('img', el); return i ? i.alt : ''; };
  let cur = 0, open = false, last = null;
  const show = (i) => { cur = (i + items.length) % items.length; img.src = items[cur].dataset.lb; img.alt = alt(items[cur]); };
  function openLb(i) {
    if (open) return; open = true; last = document.activeElement; show(i);
    lb.classList.add('is-on'); lb.setAttribute('aria-hidden', 'false');
    if (X.lock) X.lock(); else document.body.style.overflow = 'hidden';
    $('#gLbX').focus({ preventScroll: true });
  }
  function closeLb() {
    if (!open) return; open = false;
    lb.classList.remove('is-on'); lb.setAttribute('aria-hidden', 'true');
    if (X.unlock) X.unlock(); else document.body.style.overflow = '';
    if (last && last.focus) last.focus({ preventScroll: true });
  }
  items.forEach((el, i) => {
    el.addEventListener('click', () => openLb(i));
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLb(i); } });
  });
  $('#gLbX').addEventListener('click', closeLb);
  $('#gLbP').addEventListener('click', () => show(cur - 1));
  $('#gLbN').addEventListener('click', () => show(cur + 1));
  lb.addEventListener('click', (e) => { if (e.target === lb) closeLb(); });
  document.addEventListener('keydown', (e) => {
    if (!open) return;
    if (e.key === 'Escape') closeLb();
    if (e.key === 'ArrowLeft') show(cur - 1);
    if (e.key === 'ArrowRight') show(cur + 1);
  });
  let sx = null;
  lb.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1)); });
})();
