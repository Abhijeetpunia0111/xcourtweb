/* ==========================================================
   Booking panel — opens from the top (like the menu) on every
   "Book a court" link, on every page, EXCEPT while the home-page
   hero carousel is on screen (there the hero's own booking card is used).

   Header: branch picker.   Left: sport + court.   Right: date + duration + start time.
   Real courts, prices and free slots from Leo Cal (js/leocal.js), same as the hero card; "Confirm & Pay" opens
   Leo Cal's pop-up on the chosen slot for the visitor's details and the payment.
   A link with data-book-sport="<sport>" opens it with that sport selected (matched to Leo Cal's sports by name).
   ========================================================== */
(() => {
  'use strict';

  const Leo = window.XCSLeo;             // shared with the hero card (js/leocal.js)
  const Branches = window.XCSBranches;   // shared with the hero card (js/branches.js)

  /* ---------- helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const st = { sportId: null, courtId: null, day: null, dur: null, start: null };   // start = the chosen slot's starts_at
  let wantSport = null;          // from a data-book-sport link, applied once Leo Cal's sports are known
  let autoDay = true;            // once, when the first times arrive: nothing left today (late evening) → tomorrow
  const curSport = () => Leo.config().sports.find((s) => s.id === st.sportId);
  const curCourt = () => Leo.config().courts.find((c) => c.id === st.courtId);

  // Fill in whatever is missing or no longer offered (another branch, a sport without that court…). False until loaded.
  function reconcile() {
    const cfg = Leo.config(), br = Branches.current();
    if (!cfg || !br) return false;
    const sports = Leo.sportsAt(br.id), asked = wantSport && Leo.findSport(sports, wantSport);
    if (asked) { st.sportId = asked.id; st.courtId = null; }
    wantSport = null;
    if (!sports.some((s) => s.id === st.sportId)) { st.sportId = sports[0].id; st.courtId = null; }
    const courts = Leo.courtsAt(br.id, st.sportId);
    if (!courts.some((c) => c.id === st.courtId)) st.courtId = (courts.find((c) => c.is_bookable) || courts[0]).id;
    if (!cfg.durations.includes(st.dur)) st.dur = cfg.durations[0];
    if (!Leo.days().includes(st.day)) st.day = Leo.days()[0];
    return true;
  }
  const view = () => Leo.slots(st.courtId, st.day, st.dur);                         // { slots (null until loaded), error }
  const upcoming = (v) => (v.slots || []).filter((s) => new Date(s.starts_at).getTime() > Date.now());
  const chosen = (v) => upcoming(v).find((s) => s.starts_at === st.start);
  // keep the chosen time while it is still free, otherwise the next free one
  function ensureStart(v) {
    if (!v.slots) return;
    const keep = chosen(v);
    if (keep && keep.available) return;
    const first = upcoming(v).find((s) => s.available);
    st.start = first ? first.starts_at : null;
  }

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
          <div class="bp-pay"><div class="bp-price"><strong id="bpPrice">—</strong><span id="bpNote"></span></div>
            <button class="bp-cta" id="bpCta" type="button" disabled>Confirm &amp; Pay <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></div>
        </footer>
      </div>
    </div>`;
  document.body.appendChild(root);

  /* ---------- render ---------- */
  function paintBranch() {
    const cur = Branches.index(), status = Branches.status();
    $('#bpBranch').innerHTML = Branches.list().map((b, i) => `<option value="${i}"${i === cur ? ' selected' : ''}>${esc(b.name)}${Branches.dist(i) ? ' · ' + Branches.dist(i) : ''}</option>`).join('');
    const near = status === 'locating' ? 'Finding the nearest branch…' : cur >= 0 && cur === Branches.nearest() ? '<b>Nearest to you</b>' : '';
    $('#bpWhere').innerHTML = [near, 'open 365 days', 'pay &amp; play'].filter(Boolean).join(' · ');
  }

  const skeleton = (n, cls) => Array.from({ length: n }, () => `<span class="${cls} bp-skel" aria-hidden="true"></span>`).join('');
  // before Leo Cal has answered (or when it can't): waiting tiles or the reason, nothing to pay
  function renderNotReady() {
    const err = Leo.error();
    paintBranch();
    $('#bpSports').innerHTML = err ? '' : Array.from({ length: 5 }, () => '<li><span class="bp-sport bp-skel" aria-hidden="true"></span></li>').join('');
    $('#bpCourts').innerHTML = $('#bpDates').innerHTML = $('#bpDur').innerHTML = '';
    $('#bpSlots').innerHTML = err ? `<p class="bp-empty">${esc(err)}</p>` : skeleton(10, 'bp-slot');
    $('#bpSum').textContent = ''; $('#bpPrice').textContent = '—'; $('#bpNote').textContent = '';
    $('#bpCta').disabled = true;
  }

  function render() {
    if (!reconcile()) return renderNotReady();
    const cfg = Leo.config(), br = Branches.current(), v = view();
    ensureStart(v);
    paintBranch();
    $('#bpSports').innerHTML = Leo.sportsAt(br.id).map((s, i) => {
      const n = Leo.courtsAt(br.id, s.id).length;
      return `<li><button type="button" class="bp-sport${s.id === st.sportId ? ' is-on' : ''}" data-sport="${s.id}" style="--i:${i}"><span>${esc(s.name)}</span><small>${n} ${n === 1 ? 'court' : 'courts'}</small></button></li>`;
    }).join('');
    $('#bpCourts').innerHTML = Leo.courtsAt(br.id, st.sportId).map((c) => `<button type="button" class="bp-chip${c.id === st.courtId ? ' is-on' : ''}" data-court="${c.id}">${esc(c.name)}${c.is_bookable ? '' : '<small>Closed</small>'}</button>`).join('');
    $('#bpDates').innerHTML = Leo.days().map((day, i) => {
      const p = Leo.dayParts(day);
      return `<button type="button" class="bp-day${day === st.day ? ' is-on' : ''}${p.weekend ? ' is-wk' : ''}" data-date="${day}"><small>${i === 0 ? 'Today' : p.wd}</small><b>${p.d}</b><small>${p.mon}</small></button>`;
    }).join('');
    $('#bpDur').innerHTML = cfg.durations.map((m) => `<button type="button" class="${m === st.dur ? 'is-on' : ''}" data-dur="${m}" aria-pressed="${m === st.dur}">${m} min</button>`).join('');
    paintTimes();
  }
  function paintTimes() {
    const v = view(), br = Branches.current(), el = $('#bpSlots');
    if (!curCourt().is_bookable) el.innerHTML = '<p class="bp-empty">This court is closed for maintenance. Pick another court.</p>';
    else if (v.error) el.innerHTML = `<p class="bp-empty">${esc(v.error)}</p>`;
    else if (!v.slots) el.innerHTML = skeleton(10, 'bp-slot');
    else {
      const up = upcoming(v);
      el.innerHTML = (up.length ? up.map((s) => {
        const on = s.starts_at === st.start;
        return `<button type="button" class="bp-slot${on ? ' is-on' : ''}" role="radio" aria-checked="${on}" data-start="${s.starts_at}" ${s.available ? '' : 'disabled'}>${Leo.time(s.starts_at)}<small>${s.is_peak ? 'Peak' : 'Off-peak'}</small></button>`;
      }).join('') : `<p class="bp-empty">No more slots ${st.day === Leo.days()[0] ? 'today' : 'that day'}. Pick another date.</p>`)
        // a branch whose online payments aren't set up yet: its times show, but nothing can be paid for there
        + (br.unavailable_reason ? `<p class="bp-empty">${esc(br.unavailable_reason)}</p>` : '');
    }
    paintFoot();
  }
  function paintFoot() {
    const cta = $('#bpCta'), v = view(), closed = !curCourt().is_bookable, s = !closed && chosen(v);
    const where = `${esc(Branches.current().name)} · ${esc(curCourt().name)} · ${Leo.dayLabel(st.day)}`;
    if (!s || s.price == null) {
      $('#bpPrice').textContent = '—';
      $('#bpNote').textContent = closed ? 'Court closed' : !v.slots ? '' : upcoming(v).some((x) => x.available) ? 'No slot selected' : 'No free slot — try another day or branch';
      $('#bpSum').innerHTML = `${esc(curSport().name)} · ${where}`;
      cta.disabled = true;
      return;
    }
    cta.disabled = !s.available || !curCourt().is_bookable || !Branches.current().payment;
    $('#bpPrice').textContent = Leo.money(s.price);
    $('#bpNote').textContent = `${s.is_peak ? 'Peak' : 'Off-peak'} · ${Leo.durCaption(st.dur)}`;
    $('#bpSum').innerHTML = `<b>${esc(curSport().name)}</b> · ${where} · ${Leo.time(s.starts_at)} – ${Leo.time(s.ends_at)}`;
  }
  // fresh free slots came in: only the times and the price change
  function renderTimes() {
    if (!reconcile()) return;
    const v = view();
    if (v.slots && autoDay) {
      autoDay = false;
      if (st.day === Leo.days()[0] && curCourt().is_bookable && !upcoming(v).some((s) => s.available) && Leo.days()[1]) { st.day = Leo.days()[1]; return render(); }
    }
    ensureStart(v); paintTimes();
  }

  root.addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t || !Leo.config()) return;
    if (t.dataset.sport != null) { st.sportId = t.dataset.sport; st.courtId = null; render(); }
    else if (t.dataset.court != null) { st.courtId = t.dataset.court; render(); }
    else if (t.dataset.date != null) { st.day = t.dataset.date; autoDay = false; render(); }
    else if (t.dataset.dur != null) { st.dur = +t.dataset.dur; render(); }
    else if (t.dataset.start != null && !t.disabled) { st.start = t.dataset.start; paintTimes(); }
  });
  $('#bpBranch').addEventListener('change', (e) => Branches.select(+e.target.value));   // redraws through Branches.onChange below

  /* ---------- confirm: Leo Cal's pop-up (above this panel) takes the details and the payment ---------- */
  $('#bpCta').addEventListener('click', () => {
    const s = chosen(view()); if (!s) return;
    Leo.checkout({ branchId: Branches.current().id, sportId: st.sportId, courtId: st.courtId, slot: s, duration: st.dur });
  });

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
  }
  root.addEventListener('click', (e) => { if (e.target.closest('[data-bp-close]')) close(); });
  // branch changed (here, in the hero card, or nearest located) → that branch's availability; status-only → just the picker.
  // While closed there's nothing to do: open() renders.
  Branches.onChange((moved) => { if (isOpen) (moved ? render : paintBranch)(); });
  // Leo Cal answered (or failed) → everything; new free slots → the times
  Leo.onUpdate((what) => { if (isOpen) (what === 'slots' ? renderTimes : render)(); });
  // Escape closes the panel — but not while Leo Cal's pop-up is above it: that Escape is the pop-up's. Capture phase, so
  // this runs before embed.js's own listener has removed the pop-up.
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !document.querySelector('[role="dialog"][aria-label="Book a court"]:not(#bp)')) close(); }, true);
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
    if (a.dataset.bookSport) wantSport = a.dataset.bookSport;
    const menuIsOpen = nav && nav.classList.contains('menu-open');
    if (menuIsOpen && xcs().closeMenu) { xcs().closeMenu(); setTimeout(open, 560); } else open();
  }, true);

  window.XCS = Object.assign(window.XCS || {}, { openBooking: open, closeBooking: close });
})();
