/* ==========================================================
   Shared page shell for sub-pages (tournaments, …):
   smooth scroll, announcement bar, nav, full-screen menu.
   (The home page keeps the same behaviour inside main.js.)
   ========================================================== */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const scrollToY = (y, opts = {}) => {
    if (lenis) return lenis.scrollTo(y, { duration: 1.5, easing: (t) => 1 - Math.pow(1 - t, 4), ...opts });
    const top = typeof y === 'number' ? y : y.getBoundingClientRect().top + window.scrollY + (opts.offset || 0);
    window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
  };
  const lock = () => (lenis ? lenis.stop() : (document.body.style.overflow = 'hidden'));
  const unlock = () => (lenis ? lenis.start() : (document.body.style.overflow = ''));

  /* ---------- announcement bar + nav ---------- */
  const bar = $('#bar'), nav = $('#nav');
  function syncNav() {
    const y = window.scrollY;
    root.style.setProperty('--nav-top', Math.max(0, bar.offsetHeight - y) + 'px');
    nav.classList.toggle('is-solid', y > 120);
  }
  window.addEventListener('scroll', syncNav, { passive: true });
  window.addEventListener('resize', syncNav);
  if (lenis) lenis.on('scroll', syncNav);
  syncNav();
  $('#barClose').addEventListener('click', () => {
    gsap.to(root, { '--bar-h': '0px', duration: 0.8, ease: 'power3.inOut', onUpdate: syncNav, onComplete: () => { bar.style.display = 'none'; syncNav(); ScrollTrigger.refresh(); } });
  });

  /* ---------- menu ---------- */
  const menu = $('#menu'), menuBtn = $('#menuBtn'), page = $('#page');
  let menuOpen = false;

  const menuArt = $('#menuArt');
  // each menu link carries its own venue photo (data-img); hovering a link fades its photo in
  menuArt.innerHTML = $$('#menuLinks a').map((a) => `<img data-s="${a.dataset.scene}" src="${a.dataset.img}" alt="" decoding="async">`).join('');
  const menuSvgs = $$('#menuArt > *');
  function swapText(el, text) {
    if (!el || el.textContent === text) return;
    if (reduce) { el.textContent = text; return; }
    gsap.to(el, { opacity: 0, y: -10, duration: 0.3, ease: 'power2.in', overwrite: true, onComplete: () => { el.textContent = text; gsap.fromTo(el, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }); } });
  }
  const showScene = (id, copy) => { menuSvgs.forEach((s) => s.classList.toggle('on', s.dataset.s === id)); swapText($('#menuCopy'), copy); };
  showScene('book', 'Game on. Nonstop playtime.');
  $$('#menuLinks a').forEach((a) => {
    const on = () => showScene(a.dataset.scene, a.dataset.copy);
    a.addEventListener('mouseenter', on); a.addEventListener('focus', on);
  });

  const mtl = gsap.timeline({ paused: true, defaults: { ease: 'power4.inOut' } });
  mtl.set(menu, { visibility: 'visible' }, 0)
    .fromTo(menu, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.05 }, 0)
    // opacity only - a transform on #page would break pinned sections (position: fixed)
    .fromTo(page, { opacity: 1 }, { opacity: 0.35, duration: 1.05 }, 0)
    .fromTo('#menuLinks li', { opacity: 0 }, { opacity: 1, duration: 0.5, stagger: 0.05, ease: 'power2.out' }, 0.3)
    .fromTo('#menuLinks .ml span', { yPercent: 118, rotate: 3 }, { yPercent: 0, rotate: 0, duration: 1.1, stagger: 0.06, ease: 'expo.out' }, 0.32)
    .fromTo('.menu-feature', { y: 70, opacity: 0, scale: 0.95 }, { y: 0, opacity: 1, scale: 1, duration: 1.1, ease: 'expo.out' }, 0.45)
    .fromTo('.menu-info > div', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.08, ease: 'expo.out' }, 0.62);
  mtl.eventCallback('onReverseComplete', () => gsap.set(page, { clearProps: 'all' }));

  function openMenu() {
    if (menuOpen) return; menuOpen = true;
    menuBtn.setAttribute('aria-expanded', 'true'); menu.setAttribute('aria-hidden', 'false');
    nav.classList.add('on-menu', 'menu-open');
    $('.sr', menuBtn).textContent = 'Close menu';
    lock(); mtl.timeScale(reduce ? 20 : 1).play();
  }
  function closeMenu() {
    if (!menuOpen) return; menuOpen = false;
    menuBtn.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-hidden', 'true');
    nav.classList.remove('on-menu', 'menu-open');
    $('.sr', menuBtn).textContent = 'Open menu';
    mtl.timeScale(reduce ? 20 : 1.5).reverse(); if (!leoOpen) unlock();   // Leo Cal's pop-up may be opening over it
  }
  menuBtn.addEventListener('click', () => {
    if (leoOpen && window.LeoCal) window.LeoCal.close();   // the menu would open under Leo Cal's sheet
    menuOpen ? closeMenu() : openMenu();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  /* ---------- Leo Cal: "Book a court" ([data-leo-cal]) drops its sheet under the header; the header goes
     dark-on-paper meanwhile, as over the menu ---------- */
  let leoOpen = false, navHadOnMenu = false;
  addEventListener('leo-cal:open', () => { leoOpen = true; navHadOnMenu = nav.classList.contains('on-menu'); nav.classList.add('on-menu'); lock(); });
  addEventListener('leo-cal:close', () => { leoOpen = false; if (!navHadOnMenu && !menuOpen) nav.classList.remove('on-menu'); if (!menuOpen) unlock(); });
  document.addEventListener('click', (e) => { if (menuOpen && e.target.closest('[data-leo-cal]')) closeMenu(); });

  /* ---------- in-page anchors ---------- */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]'); if (!a || a.hasAttribute('data-leo-cal')) return;
    const id = a.getAttribute('href'); if (id === '#') return;
    const target = id === '#top' ? null : $(id);
    if (id !== '#top' && !target) return;
    e.preventDefault();
    const go = () => (target ? scrollToY(target, { offset: -40 }) : scrollToY(0));
    if (menuOpen) { closeMenu(); setTimeout(go, 520); } else go();
  });

  window.addEventListener('load', () => ScrollTrigger.refresh());
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());

  window.XCS = { $, $$, reduce, lenis, scrollToY, lock, unlock, closeMenu, isMenuOpen: () => menuOpen };
})();
