/* ==========================================================
   Crosscourt Sports Club - landing page behaviour
   - hero carousel (14s per sport)
   - full-screen menu animation
   Booking is Leo Cal's: the hero card is its <div data-leo-cal-inline>, and every
   [data-leo-cal] link opens its pop-up (the embed.js script in <head> does both).
   ========================================================== */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  gsap.registerPlugin(ScrollTrigger);

  /* ----------------------------------------------------------
     CONFIG - edit these to match the business
  ---------------------------------------------------------- */
  const SLIDE_SECONDS = 14;               // how long a slide WITHOUT a video stays; slides with a video last as long as the video
  const CARD_FOLLOWS_SLIDES = true;       // the hero's booking card shows the sport on screen (false: Leo Cal's own default)

  // Carousel order = array order (Swimming, Pickleball, Football, Tennis, Box Cricket).
  // "Book a court" on a slide opens Leo Cal on that sport; Leo Cal matches it to its own sports by name.
  const SPORTS = [
    {
      id: 'swimming', name: 'Swimming',
      title: 'Lap after lap, effortless.',
      sub: 'A temperature-controlled pool, open from early morning.',
      tags: ['Temperature-controlled', 'Caps mandatory'],
    },
    {
      id: 'pickleball', name: 'Pickleball',
      img: 'assets/img/moments/pickleball-courts.webp', pos: '50% 55%',
      title: 'Dink. Drive. Repeat.',
      sub: 'Twelve semi-indoor courts, built for fast, social rallies.',
      tags: ['Semi-indoor', 'Max 4 players'],
    },
    {
      id: 'football', name: 'Football',
      img: 'assets/img/moments/football-cage.webp', pos: '50% 70%',
      title: 'Fast feet. Floodlit nights.',
      sub: 'Box-football turf with the pace of a proper match.',
      tags: ['Floodlit turf', 'No metal cleats'],
    },
    {
      id: 'tennis', name: 'Tennis',
      img: 'assets/img/moments/aerial-courts.webp', pos: '50% 45%',
      title: 'Own the baseline.',
      sub: 'Four ITF-standard courts and a dedicated center court.',
      tags: ['ITF-standard', 'Open 11 AM – 10 PM'],
    },
    {
      id: 'cricket', name: 'Box Cricket',
      img: 'assets/img/moments/box-cricket.webp', pos: '50% 60%',
      title: 'Box cricket, after dark.',
      sub: 'A netted arena for quick, high-energy games with your crew.',
      tags: ['Netted arena', 'Turf surface'],
    },
    // No hero slide yet: not in the carousel (the Facilities cards book these with data-sport).
    {
      id: 'gym', name: 'Gym', extra: true,
      tags: ['Fully equipped', 'Open 7 AM – 10 PM'],
    },
    {
      id: 'tabletennis', name: 'Table Tennis', extra: true,
      tags: ['Competition-ready tables', 'Max 4 players'],
    },
    {
      id: 'foosball', name: 'Foosball', extra: true,
      tags: ['Social games', 'Max 4 players'],
    },
  ];
  const SLIDE_SPORTS = SPORTS.filter((s) => !s.extra);   // the carousel only shows sports that have hero media
  const N = SLIDE_SPORTS.length;

  /* ----------------------------------------------------------
     Helpers
  ---------------------------------------------------------- */

  function scene(name, sfx = '', still = false) {
    let svg = window.SCENES[name]();
    if (sfx) svg = svg.replace(/(tn|pb|cr|fb|sw)-(sky|glow|beam|fade|blur|soft)/g, `$1${sfx}-$2`);
    if (still) svg = svg.replace(/<g><circle[^>]*>\s*<animateMotion[^>]*\/><\/circle><\/g>/g, '').replace(/<animate[^>]*\/>/g, '');
    return `<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">${svg}</svg>`;
  }

  // Photo when the sport has one (see SPORTS[].img), otherwise the drawn placeholder scene.
  const photo = (src, pos, attrs = '', flip = false) => `<img ${attrs} src="${src}" alt="" style="object-position:${pos}${flip ? ';transform:scaleX(-1)' : ''}" decoding="async">`;
  const art = (sp, sfx = '', still = false, attrs = '') => sp.img ? photo(sp.img, sp.pos, attrs, sp.flip) : scene(sp.id, sfx, still).replace('<svg', `<svg ${attrs}`);

  /* ----------------------------------------------------------
     Smooth scroll
  ---------------------------------------------------------- */
  let lenis = null;
  if (!reduceMotion && window.Lenis) {
    /* Speed governor for the exit of the pinned ribbon section: a hard flick used to carry the page straight past the
       facilities cards. We limit how far the scroll target may run ahead of the page (the "lead"); that lead cap
       shrinks to SLOW_CAP just as the ribbon un-pins and relaxes back to FAST_CAP over SLOW_OUT viewports. */
    const govEl = document.getElementById('facilities');
    const FAST_CAP = 1.6, SLOW_CAP = 0.22, SLOW_IN = 0.5, SLOW_OUT = 1.7;      // in viewport heights
    const smooth = (t) => t * t * (3 - 2 * t);
    const slowness = () => {                                                // 0 = normal speed … 1 = slowest
      if (!govEl) return 0;
      const vh = window.innerHeight, d = (vh - govEl.getBoundingClientRect().top) / vh;   // viewports of facilities already on screen
      if (d <= -SLOW_IN || d >= SLOW_OUT) return 0;
      return smooth(d < 0 ? 1 + d / SLOW_IN : 1 - d / SLOW_OUT);
    };
    lenis = new Lenis({
      lerp: 0.085, wheelMultiplier: 0.95,
      virtualScroll: (e) => {
        if (!e.event.type.includes('wheel') || !e.deltaY) return true;
        const vh = window.innerHeight, cap = vh * (FAST_CAP + (SLOW_CAP - FAST_CAP) * slowness());
        const lead = lenis.targetScroll - lenis.animatedScroll;
        if (Math.sign(lead) === Math.sign(e.deltaY) && Math.abs(lead) + Math.abs(e.deltaY) > cap) {
          e.deltaY = Math.sign(e.deltaY) * Math.max(0.01, cap - Math.abs(lead));   // never 0, or Lenis would let the native scroll through
        }
        return true;
      },
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const scrollToY = (y, opts = {}) => {
    if (lenis) return lenis.scrollTo(y, { duration: 1.5, easing: (t) => 1 - Math.pow(1 - t, 4), ...opts });
    const top = typeof y === 'number' ? y : y.getBoundingClientRect().top + window.scrollY + (opts.offset || 0);
    window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  /* ----------------------------------------------------------
     Announcement bar + nav position
  ---------------------------------------------------------- */
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

  /* ----------------------------------------------------------
     Build hero slides
  ---------------------------------------------------------- */
  const slidesEl = $('#slides');
  slidesEl.innerHTML = SLIDE_SPORTS.map((sp, i) => `
    <article class="slide${i === 0 ? ' is-active' : ''}" data-i="${i}" role="group" aria-roledescription="slide" aria-label="${sp.name}">
      <div class="slide-art">${art(sp)}</div>
      <video playsinline loop preload="none" data-src="assets/video/${sp.id}.mp4"></video>
    </article>`).join('');

  const slideEls = $$('.slide', slidesEl);

  /* ----------------------------------------------------------
     Booking — Leo Cal. The buttons that book "the sport on screen" (the hero's and the
     phone bar's) follow the carousel, and so does the card (its data-sport) until the
     visitor picks a sport in it themselves: then the carousel goes to that sport and stays.
     While Leo Cal's pop-up is open the page holds still.
  ---------------------------------------------------------- */
  const booking = $('#bookCard'), card = $('.bk-leo', booking);
  const sportLinks = [...$$('.hero-cta, .bk-toggle'), ...(CARD_FOLLOWS_SLIDES ? [card] : [])];
  function setSport(n) {
    sportLinks.forEach((a) => { a.dataset.sport = SPORTS[n].name; });
    $('#tgSport').textContent = SPORTS[n].name;
  }
  // Leo Cal's sport → this page's entry: the same name, else Leo Cal's name containing our id ("Cricket Nets" → cricket)
  const words = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const ourSport = (name) => {
    const exact = SPORTS.findIndex((sp) => words(sp.name) === words(name));
    return exact >= 0 ? exact : SPORTS.findIndex((sp) => words(name).split(' ').includes(sp.id));
  };
  addEventListener('leo-cal:change', (e) => {
    if (!CARD_FOLLOWS_SLIDES || e.detail.element !== card) return;
    const idx = ourSport(e.detail.sport.name);
    if (idx < 0 || idx >= N) return;                       // no slide for it (gym, table tennis…)
    if (idx !== cur) goTo(idx, idx > cur ? 1 : -1);
    setAutoplayPaused(true);
  });
  let leoOpen = false;
  addEventListener('leo-cal:open', () => { leoOpen = true; if (lenis) lenis.stop(); syncHold(); });
  addEventListener('leo-cal:close', () => { leoOpen = false; if (lenis && !menuOpen) lenis.start(); syncHold(); });

  /* ----------------------------------------------------------
     Hero carousel
  ---------------------------------------------------------- */
  let cur = 0, busy = false, queued = null, progress = null, userPaused = reduceMotion, heroOut = false;
  const holds = new Set();           // reasons autoplay is held (hover, focus, open menu…)
  const frame = $('#heroFrame');
  frame.addEventListener('scroll', () => { frame.scrollTop = 0; frame.scrollLeft = 0; });   // overflow:hidden boxes can still be scrolled by anchors / focus — never let the hero drift

  function syncHold() {
    frame.classList.toggle('is-paused', userPaused);
    if (!progress) return;
    (userPaused || heroOut || holds.size || menuOpen || leoOpen) ? progress.pause() : progress.resume();
    syncVideo();
  }

  /* ---------- hero video + sound ----------
     Sound is ON by default. Browsers refuse unmuted autoplay until the visitor has interacted with the page, so if the
     first attempt is refused the video plays muted and the sound switches on at the first click / tap / key press. */
  let soundOn = true;
  const muteBtn = $('#muteBtn');
  const curVideo = () => $('video', slideEls[cur]);
  const isReady = (v) => v && v.classList.contains('is-ready');

  function paintSound() {
    const v = curVideo(), show = isReady(v);
    muteBtn.classList.toggle('is-hidden', !show);                       // nothing to mute on slides without a video
    frame.classList.toggle('has-video', !!v && v.classList.contains('is-shown'));
    const audible = show && !v.muted && !v.paused;
    muteBtn.classList.toggle('is-muted', !audible);
    muteBtn.setAttribute('aria-pressed', String(audible));
    const txt = audible ? 'Mute sound' : (soundOn ? 'Tap for sound' : 'Unmute sound');
    muteBtn.setAttribute('aria-label', txt); muteBtn.setAttribute('title', txt);
  }
  // Muted autoplay is always allowed; UNMUTED autoplay only after the visitor has interacted with the page. Starting unmuted
  // and retrying muted (the old way) raced with other play calls and could leave the clip paused on its first frame after a reload.
  let gestured = false;
  const canHearSound = () => navigator.userActivation ? navigator.userActivation.hasBeenActive : gestured;
  function playVideo(v) {
    v.muted = !(soundOn && canHearSound());
    const pr = v.play();
    if (pr) pr.catch(() => { v.muted = true; v.play().catch(() => {}); paintSound(); });   // last resort: muted
  }
  function fadeIn(v) { v.volume = 0; gsap.to(v, { volume: 1, duration: 1.2, ease: 'power1.in', overwrite: true }); }

  // attach listeners and start downloading (without playing)
  function prepareVideo(v) {
    if (v.dataset.tried) return;
    v.dataset.tried = '1';
    v.addEventListener('loadeddata', () => {
      v.classList.add('is-ready');
      if (slideEls[cur] === v.closest('.slide')) { fadeIn(v); playVideo(v); startProgress(cur, slideSeconds(cur)); }   // slide lasts as long as the clip
      paintSound();
    });
    v.addEventListener('playing', () => { v.classList.add('is-shown'); paintSound(); }, { once: true });
    v.addEventListener('canplaythrough', () => { if (slideEls[cur] === v.closest('.slide')) warmNext(); }, { once: true });
    v.addEventListener('error', () => v.remove(), { once: true });
    ['volumechange', 'play', 'pause'].forEach((e) => v.addEventListener(e, paintSound));
    v.preload = 'auto';
    v.src = v.dataset.src;
    v.load();                       // preload="none" would otherwise never fetch
  }
  // once the current clip can play through, quietly fetch the next slide's clip so it starts instantly
  function warmNext() { const nv = $('video', slideEls[(cur + 1) % N]); if (nv) prepareVideo(nv); }

  function startVideo(i) {
    const v = $('video', slideEls[i]); if (!v) return;
    if (!v.dataset.tried) prepareVideo(v);
    else if (isReady(v)) { v.currentTime = 0; fadeIn(v); playVideo(v); }
  }
  function stopVideo(i) { const v = $('video', slideEls[i]); if (v) { gsap.killTweensOf(v); v.pause(); v.volume = 1; } }

  // the outgoing slide's audio fades out while the new one wipes in
  const fadeOut = (i) => { const v = $('video', slideEls[i]); if (v && !v.paused) gsap.to(v, { volume: 0, duration: 0.9, ease: 'power1.out', overwrite: true }); };

  // first real interaction turns the sound on if the browser refused it earlier
  const GESTURES = ['pointerup', 'mousedown', 'click', 'keydown', 'touchend'];
  function unlockSound(e) {
    gestured = true;
    if (e.target.closest && e.target.closest('#muteBtn')) return;
    if (!soundOn) return;
    const v = curVideo();
    if (!isReady(v) || heroOut) return;
    if (!v.muted && !v.paused) return dropUnlock();
    v.muted = false;
    v.play().then(() => { dropUnlock(); paintSound(); }).catch(() => { v.muted = true; v.play().catch(() => {}); });
  }
  const dropUnlock = () => GESTURES.forEach((g) => removeEventListener(g, unlockSound, true));
  GESTURES.forEach((g) => addEventListener(g, unlockSound, { capture: true, passive: true }));

  muteBtn.addEventListener('click', () => {
    const v = curVideo(); if (!isReady(v)) return;
    const turnOn = v.muted || v.paused;
    soundOn = turnOn; v.muted = !turnOn;
    if (turnOn) { v.volume = 1; v.play().catch(() => { v.muted = true; }); dropUnlock(); }
    paintSound();
  });

  // silence + pause the video when the hero is off-screen or the tab is hidden
  function syncVideo() {
    const v = curVideo(); if (!isReady(v)) return;
    if (heroOut || leoOpen || document.hidden) v.pause(); else if (v.paused) playVideo(v);
  }
  document.addEventListener('visibilitychange', syncVideo);

  // How long a slide stays: the video's own length when it has one (any length), otherwise SLIDE_SECONDS.
  function slideSeconds(i, elapsed = 0) {
    const v = $('video', slideEls[i]);
    return isReady(v) && isFinite(v.duration) && v.duration > 1 ? Math.max(1, v.duration - elapsed) : SLIDE_SECONDS;
  }
  function startProgress(i, seconds = slideSeconds(i)) {
    if (progress) progress.kill();
    // invisible timer: advances the carousel when the slide's video ends (paused while the visitor is interacting)
    progress = gsap.to({}, { duration: seconds, onComplete: () => goTo(cur + 1, 1) });
    syncHold();
  }

  function swapText(el, text, { y = 14, delay = 0 } = {}) {
    if (!el || el.textContent === text) return;
    if (reduceMotion) { el.textContent = text; return; }
    gsap.to(el, { opacity: 0, y: -y, duration: 0.3, delay, ease: 'power2.in', overwrite: true, onComplete: () => { el.textContent = text; gsap.fromTo(el, { opacity: 0, y }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }); } });
  }

  function setCopy(n) {
    const sp = SPORTS[n], t = $('#heroTitle .t');
    swapText($('#heroEyebrow'), sp.name, { delay: 0.04 });
    swapText($('#heroSub'), sp.sub, { delay: 0.12 });
    gsap.to(t, { yPercent: -118, duration: reduceMotion ? 0.01 : 0.55, ease: 'power3.in', overwrite: true, onComplete: () => { t.textContent = sp.title; gsap.fromTo(t, { yPercent: 118 }, { yPercent: 0, duration: reduceMotion ? 0.01 : 1.1, ease: 'expo.out' }); } });
  }

  function goTo(n, dir) {
    n = ((n % N) + N) % N;
    if (n === cur) return;
    if (busy) { queued = { n, dir }; return; }
    busy = true;
    dir = dir || 1;

    const out = slideEls[cur], inn = slideEls[n];
    const outArt = $('.slide-art', out), inArt = $('.slide-art', inn);
    const prev = cur;

    fadeOut(cur);
    cur = n;                        // logical index flips first so the new slide's video is "current"
    startVideo(n);
    startProgress(n);
    setCopy(n);
    setSport(n);

    gsap.killTweensOf(outArt);
    inn.classList.add('is-active');
    gsap.set(inn, { zIndex: 3, clipPath: dir > 0 ? 'inset(0% 0% 0% 100%)' : 'inset(0% 100% 0% 0%)' });
    gsap.set(out, { zIndex: 2 });

    const dur = reduceMotion ? 0.01 : 1.3;
    gsap.timeline({
      defaults: { ease: 'power3.inOut' },
      onComplete: () => {
        out.classList.remove('is-active');
        gsap.set(out, { clearProps: 'clipPath,zIndex' });
        gsap.set(outArt, { clearProps: 'all' });
        gsap.set(inn, { clearProps: 'clipPath,zIndex' });
        stopVideo(prev);
        cur = n; busy = false;
        if (queued) { const q = queued; queued = null; goTo(q.n, q.dir); }
      },
    })
      .to(inn, { clipPath: 'inset(0% 0% 0% 0%)', duration: dur }, 0)
      .to(outArt, { xPercent: -16 * dir, scale: 1.1, duration: dur }, 0);
    // slow settle ("Ken Burns") runs on its own so it doesn't hold the transition lock
    gsap.fromTo(inArt, { scale: 1.32, xPercent: 9 * dir }, { scale: 1.02, xPercent: 0, duration: reduceMotion ? 0.01 : SLIDE_SECONDS + 2, ease: 'expo.out' });
    paintSound();
  }

  // controls
  $('#nextBtn').addEventListener('click', () => { goTo(cur + 1, 1); });
  $('#prevBtn').addEventListener('click', () => { goTo(cur - 1, -1); });
  function setAutoplayPaused(on) { userPaused = on; $('#playBtn').setAttribute('aria-label', on ? 'Play autoplay' : 'Pause autoplay'); syncHold(); }
  $('#playBtn').addEventListener('click', () => setAutoplayPaused(!userPaused));

  // keyboard + swipe
  document.addEventListener('keydown', (e) => {
    if (menuOpen || heroOut || /input|textarea|select/i.test(e.target.tagName)) return;
    if (e.key === 'ArrowRight') goTo(cur + 1, 1);
    if (e.key === 'ArrowLeft') goTo(cur - 1, -1);
  });
  let tx = null;
  slidesEl.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; }, { passive: true });
  slidesEl.addEventListener('touchend', (e) => { if (tx == null) return; const dx = e.changedTouches[0].clientX - tx; tx = null; if (Math.abs(dx) > 50) goTo(cur + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); });

  // hold autoplay while the visitor is picking a slot on the card
  booking.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { holds.add('hover'); syncHold(); } });
  booking.addEventListener('pointerleave', () => { holds.delete('hover'); syncHold(); });
  booking.addEventListener('focusin', () => { holds.add('focus'); syncHold(); });
  booking.addEventListener('focusout', () => { holds.delete('focus'); syncHold(); });

  ScrollTrigger.create({ trigger: '#top', start: 'top bottom', end: 'bottom 20%', onToggle: (s) => { heroOut = !s.isActive; syncHold(); } });

  /* ----------------------------------------------------------
     Full-screen menu
  ---------------------------------------------------------- */
  const menu = $('#menu'), menuBtn = $('#menuBtn'), page = $('#page');
  let menuOpen = false;

  const menuArt = $('#menuArt');
  // each menu link carries its own venue photo (data-img); hovering a link fades its photo in
  menuArt.innerHTML = $$('#menuLinks a').map((a) => `<img data-s="${a.dataset.scene}" src="${a.dataset.img}" alt="" decoding="async">`).join('');
  const menuSvgs = $$('#menuArt > *');
  const showScene = (id, copy) => {
    menuSvgs.forEach((s) => s.classList.toggle('on', s.dataset.s === id));
    swapText($('#menuCopy'), copy, { y: 10 });
  };
  showScene('book', 'Game on. Nonstop playtime.');
  $$('#menuLinks a').forEach((a) => {
    const on = () => showScene(a.dataset.scene, a.dataset.copy);
    a.addEventListener('mouseenter', on); a.addEventListener('focus', on);
  });

  const mtl = gsap.timeline({ paused: true, defaults: { ease: 'power4.inOut' } });
  mtl.set(menu, { visibility: 'visible' }, 0)
    .fromTo(menu, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.05 }, 0)
    // opacity only - a transform on #page would break the pinned story section (position: fixed)
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
    if (lenis) lenis.stop(); else document.body.style.overflow = 'hidden';
    mtl.timeScale(reduceMotion ? 20 : 1).play(); syncHold();
  }
  function closeMenu() {
    if (!menuOpen) return; menuOpen = false;
    menuBtn.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-hidden', 'true');
    nav.classList.remove('on-menu', 'menu-open');
    $('.sr', menuBtn).textContent = 'Open menu';
    mtl.timeScale(reduceMotion ? 20 : 1.5).reverse();
    if (!lenis) document.body.style.overflow = ''; else if (!leoOpen) lenis.start();   // Leo Cal's pop-up may be opening over it
    syncHold();
  }
  menuBtn.addEventListener('click', () => (menuOpen ? closeMenu() : openMenu()));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) closeMenu(); });

  /* ----------------------------------------------------------
     In-page links (menu + CTAs). "Book a court" links are Leo Cal's ([data-leo-cal]): its pop-up opens over
     the page, so from the menu the menu just goes.
  ---------------------------------------------------------- */
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-leo-cal]')) { if (menuOpen) closeMenu(); return; }
    const a = e.target.closest('a[href^="#"]'); if (!a) return;
    const id = a.getAttribute('href'); if (id === '#') return;
    const target = $(id); if (!target) return;
    e.preventDefault();
    const go = () => (id === '#top' ? scrollToY(0) : scrollToY(target, { offset: -40 }));
    if (menuOpen) { closeMenu(); setTimeout(go, 520); } else go();
  });

  /* ----------------------------------------------------------
     Below-the-fold: reveals, counters, facility art
  ---------------------------------------------------------- */
  $$('.fac[data-scene], .fac[data-img]').forEach((el, i) => {
    $('.fac-art', el).innerHTML = el.dataset.img ? photo(el.dataset.img, el.dataset.pos || '50% 50%', 'loading="lazy"') : scene(el.dataset.scene, 'f' + i, true);
  });

  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 90%', once: true,
    onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1.2, stagger: 0.1, ease: 'expo.out', overwrite: true }),
  });
  $$('[data-count]').forEach((el) => {
    const end = +el.dataset.count, o = { v: 0 };
    ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => gsap.to(o, { v: end, duration: 1.8, ease: 'power3.out', onUpdate: () => { el.textContent = Math.round(o.v); } }) });
  });
  gsap.to('.foot-word', { yPercent: -8, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true } });

  /* ----------------------------------------------------------
     Story: pinned section - lines fade in one by one, then the whole
     frame zooms through and fades out (echo frames trail behind it)
  ---------------------------------------------------------- */
  if (!reduceMotion && $('#story')) {
    const lines = $$('#story .st'), front = $('#story .story-front'), img = $('#story .story-img'), ghosts = $$('#story .story-ghost');
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: '#story', start: 'top top', end: () => '+=' + Math.round(window.innerHeight * 4.2), pin: true, scrub: 1, anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 1 },
    });
    tl.fromTo(img, { scale: 1.22 }, { scale: 1.02, duration: 10 }, 0);
    lines.forEach((el, i) => tl.fromTo(el, { opacity: 0, y: 40, filter: 'blur(16px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.4, ease: 'power2.out' }, 0.5 + i * 1.5));
    const Z = 7.6;                                    // everything is on screen → start the zoom-out
    tl.to(front, { scale: 2.9, opacity: 0, duration: 2.4, ease: 'power2.in' }, Z);
    ghosts.forEach((g, i) => tl.fromTo(g, { scale: 0.94 - i * 0.07, opacity: 0.6 - i * 0.14 }, { scale: 2.5 - i * 0.4, opacity: 0, duration: 2.6, ease: 'power2.in' }, Z + 0.1 + i * 0.18));
  }
  window.addEventListener('load', () => ScrollTrigger.refresh());

  /* ----------------------------------------------------------
     Boot
  ---------------------------------------------------------- */
  setSport(0);
  startVideo(0);

  const heroT = $('#heroTitle .t');
  heroT.textContent = SPORTS[0].title;
  $('#heroSub').textContent = SPORTS[0].sub;
  $('#heroEyebrow').textContent = SPORTS[0].name;
  gsap.fromTo($('.slide-art', slideEls[0]), { scale: 1.3 }, { scale: 1.02, duration: SLIDE_SECONDS + 2, ease: 'expo.out' });
  startProgress(0);

  if (!reduceMotion) {
    const intro = gsap.timeline({ defaults: { ease: 'expo.out' }, delay: 0.1 });
    intro
      .from('.nav > *', { y: -24, opacity: 0, duration: 1.1, stagger: 0.08 }, 0.1)
      .from(heroT, { yPercent: 118, duration: 1.5 }, 0.25)
      .from('.eyebrow, .hero-sub', { y: 20, opacity: 0, duration: 1.2, stagger: 0.1 }, 0.4)
      .from('.booking', { x: 70, opacity: 0, duration: 1.4 }, 0.35)
      .from('.hero-foot > *', { y: 36, opacity: 0, duration: 1.2, stagger: 0.1 }, 0.55);
  }

  // arriving from another page with a hash (e.g. tournaments → index.html#facilities); #book opens Leo Cal's pop-up
  // (embed.js is async, but async scripts have all run by the time "load" fires).
  // NB: nothing in the page has id="book" on purpose — the booking card lives inside the overflow:hidden hero,
  // and a native jump to it scrolls the hero's contents sideways/upwards (the "broken layout" bug).
  window.addEventListener('load', () => {
    const h = location.hash; if (!h || h.length < 2) return;
    if (h === '#book') { if (window.LeoCal) window.LeoCal.open(); return; }
    const t = $(h); if (!t) return;
    setTimeout(() => scrollToY(t, { offset: -40 }), 300);
  });
})();
