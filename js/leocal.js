/* ==========================================================
   Leo Cal data — the real branches, sports, courts, durations, prices and free slots behind the hero card
   (js/main.js) and the booking panel (js/bookpanel.js). Load it before js/branches.js and both of those.

   Read from Leo Cal's API with the venue's publishable key: the data-key on the embed.js tag (tools/build.mjs fills
   it in). The API only answers a website whose origin is in that key's allowed origins (Leo Cal dashboard), so add
   every domain the site is served from — otherwise the browser blocks the reply ("Couldn't reach the booking system").

   Nothing is paid for here: checkout() opens Leo Cal's pop-up (window.LeoCal, from embed.js) on the chosen slot, and
   the visitor enters their details and pays there. Times are shown in the venue's timezone, as Leo Cal does.
   ========================================================== */
window.XCSLeo = (() => {
  'use strict';

  const API = 'https://api.turfleo.com/api/v1/gateway';
  const PLACEHOLDER = 'gxp_YOUR_KEY';
  const STALE_MS = 60 * 1000;          // free slots are re-read after this long (the front desk sells too)
  const tag = document.querySelector('script[src*="/v1/embed.js"][data-key]');
  const KEY = tag ? tag.dataset.key : '';
  const APP = tag ? new URL(tag.src).origin : 'https://cal.turfleo.com';

  async function request(path) {
    let res;
    try { res = await fetch(API + path, { headers: { 'X-API-Key': KEY } }); }
    catch (e) {
      console.warn(`[xcs] Leo Cal API unreachable from ${location.origin}. If the network is fine, add this origin to the key's allowed origins in Leo Cal.`);
      throw new Error("Couldn't reach the booking system. Check your connection and try again.");
    }
    if (res.ok) return res.json();
    let message = 'Something went wrong. Please try again.';
    try { const body = await res.json(); if (body && body.error && body.error.message) message = body.error.message; } catch (e) { /* not JSON */ }
    if (res.status === 401) message = 'Online booking is not set up correctly (invalid key).';
    if (res.status === 429) message = 'Too many attempts. Please wait a minute and try again.';
    throw new Error(message);
  }

  /* ---------- config: branches, sports, courts, durations ---------- */
  let cfg = null, error = null;
  const subs = new Set();
  // what = 'config' (everything to redraw) or 'slots' (only the times / price)
  const emit = (what) => subs.forEach((fn) => fn(what));

  (KEY && KEY !== PLACEHOLDER ? request('/widget') : Promise.reject(new Error('Online booking is not set up yet (no Leo Cal key in this build).')))
    .then((c) => {
      if (c.unavailable_reason) throw new Error(c.unavailable_reason + (c.venue.phone ? ` Call ${c.venue.phone}.` : ''));
      if (!c.courts.length) throw new Error('No courts are open for online booking yet.');
      cfg = c;
    })
    .catch((e) => { error = e.message; })
    .then(() => emit('config'));

  const sportsAt = (branchId) => cfg.sports.filter((s) => cfg.courts.some((c) => c.sport_id === s.id && c.branch_id === branchId));
  const courtsAt = (branchId, sportId) => cfg.courts.filter((c) => c.branch_id === branchId && c.sport_id === sportId);
  // "Box Cricket", "box-cricket" and "boxcricket" are the same sport; exact first, so "tennis" never lands on table tennis
  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  function findSport(sports, ...wanted) {
    const w = wanted.map(norm).filter(Boolean), names = (s) => [s.id, s.slug, s.name].map(norm);
    return sports.find((s) => names(s).some((n) => w.includes(n)))
      || sports.find((s) => names(s).some((n) => w.some((x) => n.includes(x) || x.includes(n))));
  }

  /* ---------- free slots, per court / day / duration ---------- */
  const cache = new Map();   // view → { at, slots, error, pending } — old slots stay on screen while a refresh runs
  function slots(courtId, day, duration) {
    const view = `${courtId}|${day}|${duration}`;
    let entry = cache.get(view);
    if (!entry || (!entry.pending && Date.now() - entry.at > STALE_MS)) {
      entry = Object.assign({}, entry, { pending: true });
      cache.set(view, entry);
      // Noon UTC is the same calendar day in every timezone the product runs in (same as Leo Cal's own widget).
      const q = new URLSearchParams({ date: `${day}T12:00:00Z`, court_id: courtId, duration_min: String(duration), slot_minutes: String(cfg.slot_minutes) });
      request(`/availability?${q}`)
        .then((rows) => cache.set(view, { at: Date.now(), slots: (rows[0] && rows[0].slots) || [], error: null }))
        .catch((e) => cache.set(view, { at: Date.now(), slots: null, error: e.message }))
        .then(() => emit('slots'));
    }
    return entry;
  }
  // a booking made in the pop-up: that slot is gone, re-read
  window.addEventListener('leo-cal:booked', () => { cache.clear(); emit('slots'); });

  /* ---------- days, times, money — in the venue's timezone ---------- */
  const tz = () => cfg.venue.timezone;
  const dayOf = (date) => new Intl.DateTimeFormat('en-CA', { timeZone: tz(), year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  function days() {
    const [y, m, d] = dayOf(new Date()).split('-').map(Number);
    return Array.from({ length: cfg.max_advance_days + 1 }, (_, i) => new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10));
  }
  // parts of a YYYY-MM-DD day for the date grids: { wd: 'Mon', d: 6, mon: 'Oct', weekend }
  function dayParts(day) {
    const date = new Date(`${day}T00:00:00Z`), f = (o) => new Intl.DateTimeFormat('en-IN', Object.assign({ timeZone: 'UTC' }, o)).format(date);
    return { wd: f({ weekday: 'short' }), d: date.getUTCDate(), mon: f({ month: 'short' }), weekend: date.getUTCDay() === 0 || date.getUTCDay() === 6 };
  }
  function dayLabel(day) {
    const [today, tomorrow] = days();
    if (day === today) return 'Today';
    if (day === tomorrow) return 'Tomorrow';
    return new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${day}T00:00:00Z`));
  }
  const time = (iso) => new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz() }).format(new Date(iso)).replace(':00', '');
  const money = (amount) => {
    const v = Number(amount);
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: cfg.venue.currency, minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 }).format(v);
  };
  const durCaption = (min) => (min % 60 ? `${min} min` : min === 60 ? '1 hr' : `${min / 60} hrs`);

  /* ---------- checkout: Leo Cal's pop-up, straight to details + payment for this slot ---------- */
  function checkout({ branchId, sportId, courtId, slot, duration }) {
    const o = { branch: branchId, sport: sportId, court: courtId, start: slot.starts_at, duration: String(duration) };
    if (window.LeoCal) return window.LeoCal.open(o);
    // embed.js blocked or still loading: the same booking page, opened directly
    const url = new URL('/', APP);
    url.searchParams.set('key', KEY);
    Object.keys(o).forEach((k) => url.searchParams.set(k, o[k]));
    window.open(url.toString(), '_blank', 'noopener');
  }

  return {
    config: () => cfg,
    error: () => error,
    onUpdate: (fn) => subs.add(fn),
    // branches that have something to book
    branches: () => cfg.branches.filter((b) => sportsAt(b.id).length),
    sportsAt, courtsAt, findSport, slots, days, dayParts, dayLabel, time, money, durCaption, checkout,
  };
})();
