/* ==========================================================
   Branches — shared by the hero booking card (js/main.js) and the booking panel (js/bookpanel.js), so a branch picked
   in one is already picked in the other. Load it before both.

   The default branch is the one nearest the visitor. Location is NOT asked for on page load (browsers flag that, and a
   cold prompt usually gets refused): if the visitor already allowed it we use it straight away, otherwise the booking UI
   calls locate() on the first interaction with it. Until then — or if location is refused — the first branch is used.
   A branch picked by hand always wins over "nearest". Both are remembered for the visit (sessionStorage), across pages.
   ========================================================== */
window.XCSBranches = (() => {
  'use strict';

  // TODO: only Gandipet is real (and its pin is approximate — check it). Kondapur and Kompally are PLACEHOLDERS: replace
  // them with the real branches. lat/lng: right-click the branch on Google Maps; the first line of that menu is "lat, lng".
  const BRANCHES = [
    { id: 'gandipet', name: 'Gandipet', area: 'Vattinagulapalli', lat: 17.392, lng: 78.318 },
    { id: 'kondapur', name: 'Kondapur', area: 'Placeholder', lat: 17.469, lng: 78.357 },
    { id: 'kompally', name: 'Kompally', area: 'Placeholder', lat: 17.539, lng: 78.486 },
  ];

  const KEY = 'xcs-branch';
  const load = () => { try { return JSON.parse(sessionStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify({ id: BRANCHES[cur].id, picked, km })); } catch (e) { /* storage blocked */ } };
  // straight-line distance in km (haversine)
  const distance = (a, b) => {
    const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(h));
  };

  const saved = load();
  let cur = Math.max(0, BRANCHES.findIndex((b) => b.id === saved.id));
  let picked = !!saved.picked;                                                                  // the visitor chose a branch themselves
  let km = Array.isArray(saved.km) && saved.km.length === BRANCHES.length ? saved.km : null;  // distance to each branch, once known
  let status = km ? 'done' : 'idle';                                                            // idle | locating | done | failed
  const subs = new Set();
  // moved = the selected branch changed (availability must be redrawn); otherwise only distances / status changed
  const emit = (moved) => { save(); subs.forEach((fn) => fn(moved)); };
  const nearest = () => (km ? km.indexOf(Math.min(...km)) : -1);

  function select(i) {
    if (!BRANCHES[i]) return;
    const moved = i !== cur;
    cur = i; picked = true;
    if (moved) emit(true); else save();
  }

  // auto = the first booking interaction: only while nothing is known and no branch was picked by hand.
  // retry = the visitor asked for it ("Find my nearest branch"): runs again after a failure and switches to the nearest.
  function locate(retry = false) {
    if (!navigator.geolocation || status === 'locating' || status === 'done') return;
    if (!retry && (status === 'failed' || picked)) return;
    status = 'locating'; emit(false);
    navigator.geolocation.getCurrentPosition((pos) => {
      km = BRANCHES.map((b) => distance({ lat: pos.coords.latitude, lng: pos.coords.longitude }, b));
      status = 'done';
      const prev = cur;
      if (!picked || retry) cur = nearest();
      emit(cur !== prev);
    }, () => { status = 'failed'; emit(false); }, { timeout: 10000, maximumAge: 30 * 60 * 1000 });
  }

  // allowed on an earlier visit → no prompt will show, so find the nearest branch right away
  if (status === 'idle' && !picked && navigator.geolocation && navigator.permissions) {
    navigator.permissions.query({ name: 'geolocation' }).then((p) => { if (p.state === 'granted') locate(); }, () => {});
  }

  return {
    list: BRANCHES,
    index: () => cur,
    current: () => BRANCHES[cur],
    nearest,
    status: () => status,
    dist: (i) => (km ? (km[i] < 10 ? km[i].toFixed(1) : Math.round(km[i])) + ' km' : ''),
    select,
    locate,
    onChange: (fn) => subs.add(fn),
  };
})();
