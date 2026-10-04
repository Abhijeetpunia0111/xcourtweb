/* ==========================================================
   Booking panel — opens from the top (like the menu) on every
   "Book a court" link, on every page, EXCEPT while the home-page
   hero carousel is on screen (there the hero's own booking card is used).

   Left:  sport + court        Right: date + duration + start time
   Same rates / peak rule / simulated availability as the hero card.
   A link with data-book-sport="<sport id>" opens it with that sport selected.
   (Config below mirrors SPORTS / isPeak / isBooked in js/main.js — keep them in sync.)
   ========================================================== */
(() => {
  'use strict';

  /* ---------- config (mirror of main.js) ---------- */
  const WHATSAPP = '918019765511';
  const Branches = window.XCSBranches;   // shared with the hero card (js/branches.js)
  const isPeak = (date, t) => date.getDay() === 0 || date.getDay() === 6 || t >= 17;
  const SPORTS = [
    { id: 'tennis', name: 'Tennis', rate: [1100, 800], open: [11, 22], courts: [['Center Court', 'Show court'], ['Court 01'], ['Court 02'], ['Court 03'], ['Court 04']] },
    { id: 'pickleball', name: 'Pickleball', rate: [750, 500], open: [7, 22], courts: Array.from({ length: 12 }, (_, i) => ['Court ' + String(i + 1).padStart(2, '0'), 'Semi-indoor']) },
    { id: 'cricket', name: 'Box Cricket', rate: [1250, 1000], open: [7, 22], courts: [['Box Cricket Arena', 'Netted']] },
    { id: 'football', name: 'Football', rate: [1250, 1000], open: [7, 22], courts: [['Box Football Arena', 'Turf']] },
    { id: 'swimming', name: 'Swimming', rate: [500, 250], open: [7, 22], courts: [['Main Pool', 'Lap lanes']] },
    { id: 'gym', name: 'Gym', rate: [500, 250], open: [7, 22], courts: [['Gym Floor', 'High-performance']] },
    { id: 'tabletennis', name: 'Table Tennis', rate: [500, 250], open: [7, 22], courts: [['Table 01', 'Competition-ready'], ['Table 02', 'Competition-ready']] },
    { id: 'foosball', name: 'Foosball', rate: [300, 200], open: [7, 22], courts: [['Foosball Table', 'Aerofit']] },
  ];
  const DURS = [1, 1.5, 2];

  /* ---------- helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
  const h12 = (h) => `${Math.floor(h) % 12 || 12}${h % 1 ? ':30' : ''} ${h < 12 || h >= 24 ? 'AM' : 'PM'}`;
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  const hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return (h >>> 0) / 4294967295; };
  const isBooked = (sp, court, date, hour) => {
    const wk = date.getDay() === 0 || date.getDay() === 6;
    const p = (hour >= 17 && hour < 21 ? 0.55 : 0.26) + (wk ? 0.1 : 0);
    return hash(`${Branches.current().id}|${sp.id}|${court}|${date.toDateString()}|${hour}`) < p;
  };
  const today0 = new Date(); today0.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(today0); d.setDate(d.getDate() + i); return d; });

  const st = { sport: 0, court: 0, date: 0, dur: 1, start: null };
  const sp = () => SPORTS[st.sport];
  const date = () => days[st.date];

  function slotHours() { const [o, c] = sp().open, a = []; for (let h = o; h + st.dur <= c; h++) a.push(h); return a; }
  function available(h) {
    const now = new Date();
    if (sameDay(date(), now) && h * 60 <= now.getHours() * 60 + now.getMinutes()) return false;
    for (let c = Math.floor(h); c < Math.ceil(h + st.dur); c++) if (isBooked(sp(), st.court, date(), c)) return false;
    return true;
  }
  function priceOf(start) {
    const [peak, off] = sp().rate; let total = 0, pk = 0, op = 0;
    for (let t = start; t < start + st.dur - 1e-6; t += 0.5) { if (isPeak(date(), t)) { total += peak / 2; pk++; } else { total += off / 2; op++; } }
    return { total, label: pk && op ? 'Peak + off-peak' : pk ? 'Peak' : 'Off-peak' };
  }
  function ensureStart() {
    const hrs = slotHours();
    if (st.start != null && hrs.includes(st.start) && available(st.start)) return;
    const first = hrs.find(available); st.start = first == null ? null : first;
  }
  // start on the first day that still has a free slot (late evening → tomorrow)
  for (let i = 0; i < 14 && !slotHours().some(available); i++) st.date = Math.min(13, st.date + 1);
  ensureStart();

  /* ---------- markup ---------- */
  const root = document.createElement('div');
  root.className = 'bp'; root.id = 'bp'; root.setAttribute('aria-hidden', 'true'); root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Book a court');
  root.innerHTML = `
    <div class="bp-back" data-bp-close></div>
    <div class="bp-sheet" data-lenis-prevent>
      <div class="bp-in" id="bpMain">
        <header class="bp-head">
          <div class="bp-title"><h2>Book a court</h2><p id="bpWhere"></p></div>
          <label class="bp-branch"><span class="sr">Branch</span>
            <svg class="bp-pin" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>
            <select id="bpBranch"></select>
            <svg class="bp-chev" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
          </label>
          <button class="bp-x" type="button" data-bp-close aria-label="Close booking"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg></button>
        </header>
        <div class="bp-cols">
          <section class="bp-l" aria-label="Sport and court">
            <h3 class="sr">Sport</h3>
            <ul class="bp-sports" id="bpSports"></ul>
            <h3 class="bp-k">Court</h3>
            <div class="bp-courts" id="bpCourts"></div>
          </section>
          <section class="bp-r" aria-label="Date and time">
            <h3 class="bp-k">Date</h3>
            <div class="bp-dates" id="bpDates"></div>
            <div class="bp-k bp-k-row"><h3>Start time</h3><div class="bp-dur" id="bpDur" role="group" aria-label="Duration"></div></div>
            <div class="bp-slots" id="bpSlots" role="radiogroup" aria-label="Start time"></div>
          </section>
        </div>
        <footer class="bp-foot">
          <p class="bp-sum" id="bpSum"></p>
          <div class="bp-pay"><div class="bp-price"><strong id="bpPrice">₹0</strong><span id="bpNote"></span></div>
            <button class="bp-cta" id="bpCta" type="button">Confirm &amp; Pay <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></div>
        </footer>
      </div>
      <div class="bp-done" id="bpDone" hidden>
        <button class="bp-x bp-x-done" type="button" data-bp-close aria-label="Close booking"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg></button>
        <div class="bp-tick"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
        <h3>Slot held for you</h3>
        <dl id="bpDoneList"></dl>
        <a class="bp-cta" id="bpWa" href="#" target="_blank" rel="noopener">Confirm on WhatsApp</a>
        <button class="bp-back-btn" id="bpChange" type="button">Change booking</button>
      </div>
      <div class="bp-done bp-fail" id="bpFail" role="alert" hidden>
        <button class="bp-x bp-x-done" type="button" data-bp-close aria-label="Close booking"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg></button>
        <div class="bp-tick bp-tick-x"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg></div>
        <h3 id="bpFailTitle" tabindex="-1">Payment failed</h3>
        <p class="bp-fail-msg" id="bpFailMsg"></p>
        <dl id="bpFailList"></dl>
        <button class="bp-cta" id="bpRetry" type="button">Try payment again</button>
        <a class="bp-cta bp-cta-ghost" id="bpWaAlt" href="#" target="_blank" rel="noopener">Book on WhatsApp instead</a>
        <button class="bp-back-btn" id="bpFailChange" type="button">Change booking</button>
      </div>
    </div>`;
  document.body.appendChild(root);

  /* ---------- render ---------- */
  const dayLabel = (d, i) => (i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }));

  function paintBranch() {
    const cur = Branches.index(), status = Branches.status();
    $('#bpBranch').innerHTML = Branches.list.map((b, i) => `<option value="${i}"${i === cur ? ' selected' : ''}>${b.name}${Branches.dist(i) ? ' · ' + Branches.dist(i) : ''}</option>`).join('');
    const near = status === 'locating' ? 'Finding the nearest branch…' : cur === Branches.nearest() ? '<b>Nearest to you</b>' : '';
    $('#bpWhere').innerHTML = [near, 'open 365 days', 'pay &amp; play'].filter(Boolean).join(' · ');
  }

  function render() {
    ensureStart();
    paintBranch();
    $('#bpSports').innerHTML = SPORTS.map((s, i) => `<li><button type="button" class="bp-sport${i === st.sport ? ' is-on' : ''}" data-sport="${i}" style="--i:${i}"><span>${s.name}</span><small>from ${inr(s.rate[1])}/hr</small></button></li>`).join('');
    $('#bpCourts').innerHTML = sp().courts.map((c, i) => `<button type="button" class="bp-chip${i === st.court ? ' is-on' : ''}" data-court="${i}">${c[0]}${c[1] ? `<small>${c[1]}</small>` : ''}</button>`).join('');
    $('#bpDates').innerHTML = days.map((d, i) => {
      const wk = d.getDay() === 0 || d.getDay() === 6;
      return `<button type="button" class="bp-day${i === st.date ? ' is-on' : ''}${wk ? ' is-wk' : ''}" data-date="${i}"><small>${i === 0 ? 'Today' : d.toLocaleDateString('en-IN', { weekday: 'short' })}</small><b>${d.getDate()}</b><small>${d.toLocaleDateString('en-IN', { month: 'short' })}</small></button>`;
    }).join('');
    $('#bpDur').innerHTML = DURS.map((d) => `<button type="button" class="${d === st.dur ? 'is-on' : ''}" data-dur="${d}" aria-pressed="${d === st.dur}">${d * 60} min</button>`).join('');
    const hrs = slotHours();
    $('#bpSlots').innerHTML = hrs.length ? hrs.map((h) => {
      const ok = available(h), pk = isPeak(date(), h);
      return `<button type="button" class="bp-slot${h === st.start ? ' is-on' : ''}" role="radio" aria-checked="${h === st.start}" data-h="${h}" ${ok ? '' : 'disabled'}>${h12(h)}<small>${pk ? 'Peak' : 'Off-peak'}</small></button>`;
    }).join('') : '<p class="bp-empty">No slots for this duration.</p>';
    paintFoot();
  }
  function paintFoot() {
    const cta = $('#bpCta');
    const where = `${Branches.current().name} · ${sp().courts[st.court][0]}`;
    if (st.start == null) { $('#bpPrice').textContent = '—'; $('#bpNote').textContent = 'No free slot — try another day or branch'; $('#bpSum').textContent = `${sp().name} · ${where} · ${dayLabel(date(), st.date)}`; cta.disabled = true; return; }
    cta.disabled = false;
    const { total, label } = priceOf(st.start);
    $('#bpPrice').textContent = inr(total);
    $('#bpNote').textContent = `${label} · ${st.dur === 1 ? '1 hr' : st.dur + ' hrs'}`;
    $('#bpSum').innerHTML = `<b>${sp().name}</b> · ${where} · ${dayLabel(date(), st.date)} · ${h12(st.start)} – ${h12(st.start + st.dur)}`;
  }

  root.addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.sport != null) { st.sport = +t.dataset.sport; st.court = 0; st.start = null; render(); }
    else if (t.dataset.court != null) { st.court = +t.dataset.court; render(); }
    else if (t.dataset.date != null) { st.date = +t.dataset.date; render(); }
    else if (t.dataset.dur != null) { st.dur = +t.dataset.dur; render(); }
    else if (t.dataset.h != null && !t.disabled) { st.start = +t.dataset.h; render(); }
  });
  $('#bpBranch').addEventListener('change', (e) => Branches.select(+e.target.value));   // redraws through Branches.onChange below

  /* ---------- confirm + payment ----------
     TODO: replace processPayment() with the real payment gateway call (Razorpay / PhonePe / ...). It must resolve
     { ok: true } on success or { ok: false, reason: 'declined' | 'timeout' | 'cancelled' } on failure.
     Demo: it always succeeds, unless the page is opened with ?payfail=1 (fail the first attempt, then succeed on retry),
     ?payfail=2 (fail twice), ?payfail=always, or ?payfail=timeout / ?payfail=cancelled to see those messages. */
  const FAIL_TEXT = {
    declined: 'Your bank declined the payment. No money was charged.',
    timeout: 'The payment timed out. If any amount was debited it will be refunded automatically.',
    cancelled: 'The payment was cancelled. Nothing was charged and your slot is not booked yet.',
  };
  const demo = new URLSearchParams(location.search).get('payfail');
  let failsLeft = demo === 'always' ? Infinity : /^\d+$/.test(demo || '') ? +demo : demo ? 1 : 0;
  const demoReason = FAIL_TEXT[demo] ? demo : 'declined';
  function processPayment() {
    return new Promise((resolve) => setTimeout(() => {
      if (failsLeft > 0) { failsLeft--; resolve({ ok: false, reason: demoReason }); } else resolve({ ok: true });
    }, reduce ? 200 : 1700));
  }

  const ctaHTML = $('#bpCta').innerHTML;
  const show = (id) => { ['bpMain', 'bpDone', 'bpFail'].forEach((k) => { $('#' + k).hidden = k !== id; }); root.classList.toggle('is-done', id !== 'bpMain'); };
  function booking() {
    const { total } = priceOf(st.start);
    const time = `${h12(st.start)} – ${h12(st.start + st.dur)}`;
    const long = date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
    const br = Branches.current().name;
    const rows = [['Branch', br], ['Sport', sp().name], ['Court', sp().courts[st.court][0]], ['Date', dayLabel(date(), st.date)], ['Time', time], ['Total', inr(total)]];
    const msg = `Hi Crosscourt! I'd like to book ${sp().name} (${sp().courts[st.court][0]}) at the ${br} branch on ${long}, ${time}. Estimated total ${inr(total)}.`;
    return { rows, wa: `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}` };
  }
  const list = (rows) => rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');

  let paying = false;
  async function pay() {
    if (st.start == null || paying) return;
    paying = true;
    const cta = $('#bpCta'), retry = $('#bpRetry');
    [cta, retry].forEach((b) => { b.disabled = true; });
    cta.innerHTML = '<span class="bp-spin" aria-hidden="true"></span> Processing payment…';
    retry.innerHTML = '<span class="bp-spin" aria-hidden="true"></span> Processing payment…';
    const b = booking();
    let res;
    try { res = await processPayment(b); } catch (err) { res = { ok: false, reason: 'timeout' }; }
    paying = false;
    cta.innerHTML = ctaHTML; retry.textContent = 'Try payment again'; [cta, retry].forEach((x) => { x.disabled = false; });
    if (res.ok) {
      $('#bpDoneList').innerHTML = list(b.rows); $('#bpWa').href = b.wa;
      show('bpDone');
    } else {
      $('#bpFailMsg').textContent = FAIL_TEXT[res.reason] || FAIL_TEXT.declined;
      $('#bpFailList').innerHTML = list(b.rows.filter(([k]) => k !== 'Court'));
      $('#bpWaAlt').href = b.wa;
      show('bpFail');
      setTimeout(() => $('#bpFailTitle').focus({ preventScroll: true }), reduce ? 0 : 400);
    }
  }
  $('#bpCta').addEventListener('click', pay);
  $('#bpRetry').addEventListener('click', pay);
  $('#bpChange').addEventListener('click', () => show('bpMain'));
  $('#bpFailChange').addEventListener('click', () => show('bpMain'));

  /* ---------- open / close ---------- */
  const nav = $('#nav');
  let isOpen = false, lastFocus = null, navHadOnMenu = false;
  const xcs = () => window.XCS || {};

  function open() {
    if (isOpen) return; isOpen = true;
    lastFocus = document.activeElement;
    render();
    Branches.locate();   // preselect the nearest branch (asks for location the first time; see js/branches.js)
    root.setAttribute('aria-hidden', 'false'); root.classList.add('is-open');
    if (nav) { navHadOnMenu = nav.classList.contains('on-menu'); nav.classList.add('on-menu'); }
    if (xcs().lock) xcs().lock(); else document.body.style.overflow = 'hidden';
    setTimeout(() => $('.bp-x', root).focus({ preventScroll: true }), reduce ? 0 : 500);
  }
  function close() {
    if (!isOpen) return; isOpen = false;
    root.setAttribute('aria-hidden', 'true'); root.classList.remove('is-open');
    if (nav && !navHadOnMenu && !(nav.classList.contains('menu-open'))) nav.classList.remove('on-menu');
    if (xcs().unlock) xcs().unlock(); else document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    setTimeout(() => { if (!isOpen && root.classList.contains('is-done')) show('bpMain'); }, 900);
  }
  root.addEventListener('click', (e) => { if (e.target.closest('[data-bp-close]')) close(); });
  // branch changed (here, in the hero card, or nearest located) → that branch's availability; status-only → just the picker.
  // While closed there's nothing to do: open() renders.
  Branches.onChange((moved) => { if (isOpen) (moved ? render : paintBranch)(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  // opening the menu replaces the booking panel
  document.addEventListener('click', (e) => { if (isOpen && e.target.closest('#menuBtn')) { root.classList.add('is-instant'); close(); setTimeout(() => root.classList.remove('is-instant'), 60); } }, true);

  /* ---------- who opens it ---------- */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a'); if (!a) return;
    const href = a.getAttribute('href') || '';
    const wantsBooking = a.hasAttribute('data-book') || href === '#book' || /(^|\/)index\.html#book$/.test(href);
    if (!wantsBooking) return;
    const onHome = !!document.getElementById('heroFrame');
    const heroOnScreen = onHome && window.scrollY < window.innerHeight * 0.5;
    if (heroOnScreen) return;                                   // the hero keeps its own booking card
    e.preventDefault(); e.stopPropagation();
    if (isOpen) return;
    // sport-specific links (data-book-sport="pickleball") open the panel with that sport already selected
    const want = SPORTS.findIndex((x) => x.id === a.dataset.bookSport);
    if (want >= 0 && want !== st.sport) { st.sport = want; st.court = 0; st.start = null; }
    const menuIsOpen = nav && nav.classList.contains('menu-open');
    if (menuIsOpen && xcs().closeMenu) { xcs().closeMenu(); setTimeout(open, 560); } else open();
  }, true);

  window.XCS = Object.assign(window.XCS || {}, { openBooking: open, closeBooking: close });
})();
