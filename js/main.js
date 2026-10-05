/* ==========================================================
   Crosscourt Sports Club - landing page behaviour
   - hero carousel (14s per sport) synced with the booking card
   - full-screen menu animation
   - booking card (sport / court / date / duration / slots / price)
   ========================================================== */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mqMobile = matchMedia('(max-width: 900px)');

  gsap.registerPlugin(ScrollTrigger);

  /* ----------------------------------------------------------
     CONFIG - edit these to match the business
  ---------------------------------------------------------- */
  const SLIDE_SECONDS = 14;               // how long a slide WITHOUT a video stays; slides with a video last as long as the video
  const Leo = window.XCSLeo;             // real courts, prices and free slots (js/leocal.js)
  const Branches = window.XCSBranches;   // the selected / nearest branch (js/branches.js)

  // Carousel order = array order (Swimming, Pickleball, Football, Tennis, Box Cricket).
  // What can be booked (courts, prices, hours) comes from Leo Cal; a slide's sport is matched to Leo Cal's by name.
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
    // No hero slide yet: not in the carousel, but data-book-sport links (Facilities) still book them.
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
     Booking card — real branches, courts, prices and free slots from Leo Cal (js/leocal.js); "Confirm & Pay" opens
     Leo Cal's pop-up on the chosen slot for the visitor's details and the payment.
  ---------------------------------------------------------- */
  const st = { sportId: null, courtId: null, day: null, dur: null, start: null };   // start = the chosen slot's starts_at
  let autoDay = true;   // once, when the first times arrive: nothing left today (late evening) → tomorrow
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const curSport = () => Leo.config().sports.find((s) => s.id === st.sportId);
  const curCourt = () => Leo.config().courts.find((c) => c.id === st.courtId);
  // does this Leo Cal sport show on carousel slide / SPORTS entry `sp`?
  const isSport = (leo, sp) => !!(leo && Leo.findSport([leo], sp.id, sp.name));

  // Fill in whatever is missing or no longer offered (another branch, a sport without that court…). False until loaded.
  function reconcile() {
    const cfg = Leo.config(), br = Branches.current();
    if (!cfg || !br) return false;
    const sports = Leo.sportsAt(br.id);
    if (!sports.some((s) => s.id === st.sportId)) { st.sportId = (Leo.findSport(sports, SPORTS[cur].id, SPORTS[cur].name) || sports[0]).id; st.courtId = null; }
    const courts = Leo.courtsAt(br.id, st.sportId);
    if (!courts.some((c) => c.id === st.courtId)) st.courtId = (courts.find((c) => c.is_bookable) || courts[0]).id;
    if (!cfg.durations.includes(st.dur)) st.dur = cfg.durations[0];
    if (!Leo.days().includes(st.day)) st.day = Leo.days()[0];
    return true;
  }
  const view = () => Leo.slots(st.courtId, st.day, st.dur);                         // { slots (null until loaded), error }
  const upcoming = (v) => (v.slots || []).filter((s) => new Date(s.starts_at).getTime() > Date.now());
  const chosen = (v) => upcoming(v).find((s) => s.starts_at === st.start);
  // keep the chosen time while it is still free, otherwise the next free one — the card always shows a price
  function ensureStart(v) {
    if (!v.slots) return;
    const keep = chosen(v);
    if (keep && keep.available) return;
    const first = upcoming(v).find((s) => s.available);
    st.start = first ? first.starts_at : null;
  }

  /* ---------- dropdown rendering ---------- */
  const dd = (name) => $(`.dd[data-dd="${name}"]`);
  const opt = (val, html, sel, i) => `<button class="dd-opt${sel ? ' is-sel' : ''}" role="option" aria-selected="${!!sel}" data-val="${val}" style="--i:${i}">${html}</button>`;

  const GEO = { idle: 'Find my nearest branch', locating: 'Finding your location…', failed: 'Location unavailable · Try again' };
  function renderBranch() {
    const near = Branches.nearest(), status = Branches.status(), br = Branches.current();
    const geo = status === 'done' || !Branches.locatable() ? '' : `<button class="dd-geo" type="button"${status === 'locating' ? ' disabled' : ''}><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>${GEO[status]}</button>`;
    dd('branch').querySelector('.dd-menu').innerHTML = Branches.list().map((b, i) => {
      const meta = [Branches.dist(i), i === near ? 'Nearest' : ''].filter(Boolean).join(' · ');
      return opt(i, `<span class="dd-2"><span>${esc(b.name)}</span>${b.city ? `<small>${esc(b.city)}</small>` : ''}</span>${meta ? `<small>${meta}</small>` : ''}`, i === Branches.index(), i);
    }).join('') + geo;
    if (!br) return;
    $('#vBranch').textContent = br.name;
    $('#vBranchKm').textContent = Branches.dist(Branches.index()) && '· ' + Branches.dist(Branches.index());
  }

  function renderMenus() {
    const cfg = Leo.config(), br = Branches.current();
    dd('sport').querySelector('.dd-menu').innerHTML = Leo.sportsAt(br.id).map((s, i) => {
      const n = Leo.courtsAt(br.id, s.id).length;
      return opt(s.id, `<span>${esc(s.name)}</span><small>${n} ${n === 1 ? 'court' : 'courts'}</small>`, s.id === st.sportId, i);
    }).join('');
    dd('court').querySelector('.dd-menu').innerHTML = Leo.courtsAt(br.id, st.sportId).map((c, i) => opt(c.id, `<span>${esc(c.name)}</span>${c.is_bookable ? '' : '<small>Closed</small>'}`, c.id === st.courtId, i)).join('');
    dd('date').querySelector('.dd-menu').innerHTML = Leo.days().map((day, i) => {
      const p = Leo.dayParts(day);
      return opt(day, `<span class="d-w">${i === 0 ? 'Today' : p.wd}</span><span class="d-n">${p.d}</span><span class="d-w">${p.mon}</span>`, day === st.day, i).replace('class="dd-opt', `class="dd-opt${p.weekend ? ' is-wk' : ''}`);
    }).join('');
    dd('dur').querySelector('.dd-menu').innerHTML = cfg.durations.map((m, i) => opt(m, `<span>${m} mins</span><small>${Leo.durCaption(m)}</small>`, m === st.dur, i)).join('');
  }

  function renderValues() {
    $('#vSport').textContent = curSport().name;
    $('#vCourt').textContent = curCourt().name;
    $('#vDate').textContent = Leo.dayLabel(st.day);
    $('#vDur').textContent = st.dur + ' mins';
    $('#tgSport').textContent = curSport().name;
  }

  const skeleton = Array.from({ length: 10 }, () => '<span class="slot slot-skel" aria-hidden="true"></span>').join('');
  function renderSlots() {
    const el = $('#slots'), v = view(), br = Branches.current();
    if (!curCourt().is_bookable) { el.innerHTML = '<p class="slots-empty">This court is closed for maintenance. Pick another court.</p>'; return; }
    if (v.error) { el.innerHTML = `<p class="slots-empty">${esc(v.error)}</p>`; return; }
    if (!v.slots) { el.innerHTML = skeleton; el.setAttribute('aria-busy', 'true'); return; }
    el.removeAttribute('aria-busy');
    const up = upcoming(v);
    // only what is still ahead; the rest wrap into a grid (no sideways scrolling)
    el.innerHTML = (up.length ? up.map((s) => {
      const on = s.starts_at === st.start;
      return `<button class="slot${on ? ' is-sel' : ''}${s.is_peak ? ' is-peak' : ''}" role="radio" aria-checked="${on}" data-start="${s.starts_at}" title="${s.is_peak ? 'Peak' : 'Off-peak'}" ${s.available ? '' : 'disabled'}>${Leo.time(s.starts_at)}</button>`;
    }).join('') : `<p class="slots-empty">No more slots ${st.day === Leo.days()[0] ? 'today' : 'that day'}. Pick another date.</p>`)
      // a branch whose online payments aren't set up yet: its times show, but nothing can be paid for there
      + (br.unavailable_reason ? `<p class="slots-empty">${esc(br.unavailable_reason)}</p>` : '');
  }

  function renderTags() {
    const v = view(), first = upcoming(v).find((s) => s.available);
    $('#bkNext').textContent = !v.slots || !curCourt().is_bookable ? '' : first ? `Next free · ${Leo.time(first.starts_at)}` : 'Fully booked';
  }

  const priceTween = { v: 0 };
  function renderPrice(animate = true) {
    const priceEl = $('#price'), toggle = $('#tgPrice'), cta = $('#bkCta');
    const ready = Leo.config() && Branches.current(), closed = ready && !curCourt().is_bookable;
    const v = ready ? view() : {}, s = !closed && v.slots && chosen(v);
    if (!s || s.price == null) {
      priceEl.textContent = toggle.textContent = v.slots && !closed ? 'N/A' : '—';
      $('#priceNote').textContent = closed ? 'Court closed' : v.slots ? 'No slot selected' : '';
      cta.disabled = true;
      return;
    }
    cta.disabled = !s.available || !curCourt().is_bookable || !Branches.current().payment;
    const total = Number(s.price);
    $('#priceNote').textContent = `${s.is_peak ? 'Peak' : 'Off-peak'} · ${Leo.durCaption(st.dur)}`;
    toggle.textContent = Leo.money(total);
    if (!animate || reduceMotion) { priceEl.textContent = Leo.money(total); priceTween.v = total; return; }
    gsap.to(priceTween, { v: total, duration: 0.6, ease: 'power3.out', overwrite: true,
      onUpdate: () => { priceEl.textContent = Leo.money(Math.round(priceTween.v)); }, onComplete: () => { priceEl.textContent = Leo.money(total); } });
  }

  // before Leo Cal has answered (or when it can't): the carousel's sport, waiting tiles or the reason, nothing to pay
  function renderNotReady() {
    const err = Leo.error();
    $('#vSport').textContent = $('#tgSport').textContent = SPORTS[cur].name;
    $('#vCourt').textContent = '—';
    $('#slots').innerHTML = err ? `<p class="slots-empty">${esc(err)}</p>` : skeleton;
    $('#bkNext').textContent = '';
    renderPrice(false);
  }

  function renderAll({ swap = false, priceAnim = true } = {}) {
    if (!reconcile()) return renderNotReady();
    const v = view();
    ensureStart(v); renderBranch(); renderMenus(); renderValues(); renderTags(); renderSlots(); renderPrice(priceAnim);
    if (swap && !reduceMotion) gsap.fromTo('.booking .swap', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.05, overwrite: true });
  }
  // fresh free slots came in: only the times and the price change
  function renderTimes() {
    if (!reconcile()) return;
    const v = view();
    if (v.slots && autoDay) {
      autoDay = false;
      if (st.day === Leo.days()[0] && curCourt().is_bookable && !upcoming(v).some((s) => s.available) && Leo.days()[1]) { st.day = Leo.days()[1]; return renderAll(); }
    }
    ensureStart(v); renderTags(); renderSlots(); renderPrice();
  }

  /* ---------- dropdown behaviour ---------- */
  const dds = $$('.dd');
  function closeDD(except) {
    dds.forEach((d) => { if (d !== except && d.classList.contains('is-open')) { d.classList.remove('is-open'); d.querySelector('.dd-btn').setAttribute('aria-expanded', 'false'); } });
    syncHold();
  }
  dds.forEach((d) => {
    const btn = d.querySelector('.dd-btn'), menu = d.querySelector('.dd-menu');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = !d.classList.contains('is-open');
      closeDD(d);
      d.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      if (open) { const s = menu.querySelector('.is-sel'); if (s) menu.scrollTop = Math.max(0, s.offsetTop - 60); }
      syncHold();
    });
    menu.addEventListener('click', (e) => {
      if (e.target.closest('.dd-geo')) { Branches.locate(true); return; }   // menu stays open to show the result
      const o = e.target.closest('.dd-opt'); if (!o) return;
      const v = o.dataset.val, name = d.dataset.dd;
      d.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false');
      if (name === 'sport') {
        // a sport with a hero slide: the carousel goes there too (and the card follows it)
        st.sportId = v; st.courtId = null;
        const slide = SLIDE_SPORTS.findIndex((sp) => isSport(curSport(), sp));
        if (slide >= 0 && slide !== cur) goTo(slide, slide > cur ? 1 : -1); else renderAll({ swap: true });
      }
      else if (name === 'branch') Branches.select(+v);                      // redraws through Branches.onChange below
      else {
        if (name === 'court') st.courtId = v;
        if (name === 'date') { st.day = v; autoDay = false; }
        if (name === 'dur') st.dur = +v;
        renderAll();
        if (name === 'court') gsap.fromTo('#vCourt,#bkNext', { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.04 });
      }
      syncHold();
    });
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('.dd')) closeDD(); });

  // A branch picked here or in the booking panel, or the nearest one once located → redraw with that branch's availability.
  // Status-only changes ("Finding your location…") just redraw the branch menu: re-rendering the slots between a
  // pointerdown and its click would swallow the click.
  Branches.onChange((moved) => {
    if (!moved) return renderBranch();
    renderAll();
    if (!reduceMotion) gsap.fromTo('#vBranch,#bkNext,#slots', { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.04 });
  });
  // Leo Cal answered: the branches arrive through Branches.onChange above; an error is drawn here. New slots: the times.
  Leo.onUpdate((what) => { if (what === 'slots') renderTimes(); else if (Leo.error()) renderAll(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeDD(); if (menuOpen) closeMenu(); } });

  $('#slots').addEventListener('click', (e) => {
    const b = e.target.closest('.slot'); if (!b || b.disabled || !b.dataset.start) return;
    st.start = b.dataset.start;
    $$('.slot', $('#slots')).forEach((s) => { const on = s === b; s.classList.toggle('is-sel', on); s.setAttribute('aria-checked', on); });
    renderPrice();
  });

  /* ---------- confirm: Leo Cal's pop-up takes the details and the payment ---------- */
  $('#bkCta').addEventListener('click', () => {
    const s = chosen(view()); if (!s) return;
    Leo.checkout({ branchId: Branches.current().id, sportId: st.sportId, courtId: st.courtId, slot: s, duration: st.dur });
  });

  /* ---------- mobile sheet ---------- */
  const booking = $('#bookCard'), bkToggle = $('#bkToggle');
  function setSheet(open) {
    booking.classList.toggle('is-collapsed', !open);
    bkToggle.setAttribute('aria-expanded', String(open));
    open ? holds.add('sheet') : holds.delete('sheet');
    syncHold();
  }
  bkToggle.addEventListener('click', () => setSheet(booking.classList.contains('is-collapsed')));
  const onMq = () => { if (!mqMobile.matches) { booking.classList.remove('is-collapsed'); holds.delete('sheet'); } else if (!holds.has('sheet')) booking.classList.add('is-collapsed'); syncHold(); };
  mqMobile.addEventListener('change', onMq);

  /* ----------------------------------------------------------
     Hero carousel
  ---------------------------------------------------------- */
  let cur = 0, busy = false, queued = null, progress = null, userPaused = reduceMotion, heroOut = false;
  const holds = new Set();           // reasons autoplay is held (hover, focus, open menu…)
  const frame = $('#heroFrame');
  frame.addEventListener('scroll', () => { frame.scrollTop = 0; frame.scrollLeft = 0; });   // overflow:hidden boxes can still be scrolled by anchors / focus — never let the hero drift

  function syncHold() {
    $$('.dd').some((d) => d.classList.contains('is-open')) ? holds.add('dd') : holds.delete('dd');
    frame.classList.toggle('is-paused', userPaused);
    if (!progress) return;
    (userPaused || heroOut || holds.size || menuOpen) ? progress.pause() : progress.resume();
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
    if (heroOut || document.hidden) v.pause(); else if (v.paused) playVideo(v);
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

  // the carousel moved to slide n: the card follows, when the branch has that sport (and isn't already on it)
  function setSport(n) {
    if (reconcile() && !isSport(curSport(), SPORTS[n])) {
      const s = Leo.findSport(Leo.sportsAt(Branches.current().id), SPORTS[n].id, SPORTS[n].name);
      if (s) { st.sportId = s.id; st.courtId = null; }
    }
    renderAll({ swap: true });
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

  // hold autoplay while the visitor is filling the form
  booking.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { holds.add('hover'); syncHold(); } });
  booking.addEventListener('pointerleave', () => { holds.delete('hover'); syncHold(); });
  booking.addEventListener('focusin', () => { holds.add('focus'); syncHold(); });
  booking.addEventListener('focusout', () => { holds.delete('focus'); syncHold(); });
  // first touch of the booking card → ask for location so the nearest branch is preselected (no prompt on page load)
  ['pointerdown', 'focusin'].forEach((ev) => booking.addEventListener(ev, () => Branches.locate(), { passive: true }));

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
    if (lenis) lenis.start(); else document.body.style.overflow = '';
    syncHold();
  }
  menuBtn.addEventListener('click', () => (menuOpen ? closeMenu() : openMenu()));
  // shared helpers for js/bookpanel.js (same shape as the sub-pages' shell.js)
  window.XCS = Object.assign(window.XCS || {}, {
    scrollToY, closeMenu, isMenuOpen: () => menuOpen,
    lock: () => (lenis ? lenis.stop() : (document.body.style.overflow = 'hidden')),
    unlock: () => (lenis ? lenis.start() : (document.body.style.overflow = '')),
  });

  /* ----------------------------------------------------------
     In-page links (menu + CTAs)
  ---------------------------------------------------------- */
  function pulseBooking() {
    if (mqMobile.matches) setSheet(true);
    if (!reduceMotion) gsap.fromTo('.booking .bk-card, .bk-toggle', { boxShadow: '0 0 0 0 rgba(214,242,106,.9)' }, { boxShadow: '0 0 0 14px rgba(214,242,106,0)', duration: 1.2, ease: 'power2.out', clearProps: 'boxShadow', delay: 0.5 });
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]'); if (!a) return;
    const id = a.getAttribute('href'); if (id === '#') return;
    const target = id === '#book' ? $('#top') : $(id); if (!target) return;
    e.preventDefault();
    // Sport-specific booking: the hero button books the sport on screen; any [data-book-sport="<id>"] link books that sport.
    // Either way the booking card switches to it and the carousel stops advancing so the choice sticks while the form is filled in.
    if (id === '#book') {
      const want = a.dataset.bookSport || (a.classList.contains('hero-cta') ? SPORTS[cur].id : '');
      const idx = SPORTS.findIndex((sp) => sp.id === want);
      if (idx >= 0 && idx < N) { if (idx !== cur) goTo(idx, idx > cur ? 1 : -1); setAutoplayPaused(true); }
      else if (idx >= N) {
        const s = reconcile() && Leo.findSport(Leo.sportsAt(Branches.current().id), SPORTS[idx].id, SPORTS[idx].name);
        if (s) { st.sportId = s.id; st.courtId = null; renderAll({ swap: true }); }
        setAutoplayPaused(true);
      }
    }
    const go = () => {
      if (id === '#book' || id === '#top') { scrollToY(0); if (id === '#book') pulseBooking(); }
      else scrollToY(target, { offset: -40 });
    };
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
  renderAll({ priceAnim: false });   // waiting tiles until Leo Cal answers (late evening → tomorrow: see renderTimes)
  onMq();
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

  // arriving from another page with a hash (e.g. tournaments → index.html#facilities)
  // NB: nothing in the page has id="book" on purpose — the booking card lives inside the overflow:hidden hero,
  // and a native jump to it scrolls the hero's contents sideways/upwards (the "broken layout" bug).
  window.addEventListener('load', () => {
    const h = location.hash; if (!h || h.length < 2) return;
    const t = $(h === '#book' ? '#top' : h); if (!t) return;
    setTimeout(() => {
      if (h === '#book') { scrollToY(0); pulseBooking(); } else scrollToY(t, { offset: -40 });
    }, 300);
  });
})();
