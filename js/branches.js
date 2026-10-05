/* ==========================================================
   Branches — which Leo Cal branch the hero booking card (js/main.js) and the booking panel (js/bookpanel.js) book
   for. Shared, so a branch picked in one is already picked in the other. Load after js/leocal.js, before both.

   The list is Leo Cal's, filled in once js/leocal.js has loaded it. The default is the branch nearest the visitor.
   Leo Cal has no map positions, so they live in POSITIONS below; with fewer than two positioned branches there is no
   "nearest" and location is never asked for. Location is NOT asked for on page load (browsers flag that, and a cold
   prompt usually gets refused): if the visitor already allowed it we use it straight away, otherwise the booking UI
   calls locate() on the first interaction with it. Until then — or if location is refused — the first branch that can
   take a payment is used. A branch picked by hand always wins over "nearest". Both are remembered for the visit
   (sessionStorage), across pages.
   ========================================================== */
window.XCSBranches = (() => {
  'use strict';

  // Map position of each branch, by its name in Leo Cal (any case). Gandipet's is approximate — check it. For another
  // branch: right-click it on Google Maps; the first line of that menu is "lat, lng".
  const POSITIONS = {
    gandipet: [17.392, 78.318],
  };

  const KEY = 'xcs-branch';
  const load = () => { try { return JSON.parse(sessionStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify({ id: list[cur] ? list[cur].id : saved.id, picked, me })); } catch (e) { /* storage blocked */ } };
  // straight-line distance in km (haversine)
  const distance = (a, b) => {
    const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(h));
  };
  const posOf = (b) => POSITIONS[String(b.name).trim().toLowerCase()];

  const saved = load();
  let list = [];                                       // Leo Cal's branches, once loaded
  let cur = -1;
  let picked = !!saved.picked;                         // the visitor chose a branch themselves
  let me = saved.me || null;                           // the visitor's position, once known
  let status = me ? 'done' : 'idle';                   // idle | locating | done | failed
  let granted = false;                                 // location already allowed on an earlier visit
  const subs = new Set();
  // moved = the selected branch changed (availability must be redrawn); otherwise only distances / status changed
  const emit = (moved) => { save(); subs.forEach((fn) => fn(moved)); };
  const km = (i) => { const p = list[i] && posOf(list[i]); return me && p ? distance(me, { lat: p[0], lng: p[1] }) : null; };
  function nearest() {
    let best = -1;
    list.forEach((_, i) => { if (km(i) != null && (best < 0 || km(i) < km(best))) best = i; });
    return best;
  }
  const locatable = () => !!navigator.geolocation && list.filter(posOf).length >= 2;

  function select(i) {
    if (!list[i]) return;
    const moved = i !== cur;
    cur = i; picked = true;
    if (moved) emit(true); else save();
  }

  // auto = the first booking interaction: only while nothing is known and no branch was picked by hand.
  // retry = the visitor asked for it ("Find my nearest branch"): runs again after a failure and switches to the nearest.
  function locate(retry = false) {
    if (!locatable() || status === 'locating' || status === 'done') return;
    if (!retry && (status === 'failed' || picked)) return;
    status = 'locating'; emit(false);
    navigator.geolocation.getCurrentPosition((pos) => {
      me = { lat: +pos.coords.latitude.toFixed(3), lng: +pos.coords.longitude.toFixed(3) };   // ~100 m: plenty for "nearest"
      status = 'done';
      const prev = cur;
      if (!picked || retry) cur = nearest();
      emit(cur !== prev);
    }, () => { status = 'failed'; emit(false); }, { timeout: 10000, maximumAge: 30 * 60 * 1000 });
  }

  // Leo Cal's branches arrive: the visitor's branch from earlier in the visit if it still exists, else the nearest,
  // else the first that can take a payment, else the first.
  function setList(branches) {
    list = branches;
    const keep = list.findIndex((b) => b.id === saved.id), near = nearest();
    if (keep < 0) picked = false;
    cur = keep >= 0 ? keep : near >= 0 ? near : Math.max(0, list.findIndex((b) => b.payment));
    emit(true);
    if (granted) locate();
  }
  window.XCSLeo.onUpdate((what) => { if (what === 'config' && window.XCSLeo.config()) setList(window.XCSLeo.branches()); });

  // allowed on an earlier visit → no prompt will show, so find the nearest branch as soon as the list is in
  if (status === 'idle' && !picked && navigator.geolocation && navigator.permissions) {
    navigator.permissions.query({ name: 'geolocation' }).then((p) => { granted = p.state === 'granted'; if (granted) locate(); }, () => {});
  }

  return {
    list: () => list,
    index: () => cur,
    current: () => list[cur],
    nearest,
    status: () => status,
    locatable,
    dist: (i) => { const d = km(i); return d == null ? '' : (d < 10 ? d.toFixed(1) : Math.round(d)) + ' km'; },
    select,
    locate,
    onChange: (fn) => subs.add(fn),
  };
})();
