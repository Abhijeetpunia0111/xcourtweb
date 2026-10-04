/* ==========================================================
   Tournaments page
   - pinned trophy story (spotlight → question → sport badges)
   - upcoming / ongoing tournaments (sample data)
   - player account + trophy cabinet (stored in this browser only)
   - photo gallery with lightbox
   ========================================================== */
(() => {
  'use strict';
  const { $, $$, reduce, lock, unlock, scrollToY } = window.XCS;
  const WHATSAPP = '918019765511';
  const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');

  /* ----------------------------------------------------------
     Sample data  — replace with the club's real fixtures
  ---------------------------------------------------------- */
  const SPORTS = { tennis: 'Tennis', pickleball: 'Pickleball', cricket: 'Box Cricket', football: 'Football', swimming: 'Swimming', tabletennis: 'Table Tennis' };

  const nextDow = (dow, weeks = 0) => {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + ((dow - d.getDay() + 7) % 7 || 7) + weeks * 7);
    return d;
  };
  const UPCOMING = [
    { id: 'open-tennis', sport: 'tennis', title: 'Crosscourt Open', format: 'Singles · Knockout draw', date: nextDow(6, 0), time: '8:00 AM', fee: 800, prize: 25000, cap: 32, taken: 21, unit: 'player' },
    { id: 'dink-masters', sport: 'pickleball', title: 'Dink Masters', format: 'Doubles · Round robin', date: nextDow(0, 0), time: '7:30 AM', fee: 1200, prize: 20000, cap: 24, taken: 15, unit: 'team' },
    { id: 'box-premier', sport: 'cricket', title: 'Box Cricket Premier', format: '6-a-side · Group + knockout', date: nextDow(6, 1), time: '6:00 PM', fee: 3000, prize: 40000, cap: 16, taken: 11, unit: 'team' },
    { id: 'floodlight-cup', sport: 'football', title: 'Floodlight Cup', format: '5-a-side · Knockout', date: nextDow(5, 1), time: '7:00 PM', fee: 2500, prize: 35000, cap: 16, taken: 9, unit: 'team' },
    { id: 'lap-sprint', sport: 'swimming', title: 'Lap Sprint Gala', format: '50 m freestyle · Heats + final', date: nextDow(0, 1), time: '7:00 AM', fee: 400, prize: 10000, cap: 40, taken: 26, unit: 'swimmer' },
    { id: 'smash-open', sport: 'tabletennis', title: 'Smash Open', format: 'Singles · Knockout draw', date: nextDow(6, 2), time: '4:00 PM', fee: 300, prize: 8000, cap: 32, taken: 12, unit: 'player' },
  ];

  const LIVE = [
    { sport: 'tennis', title: 'Crosscourt Open', stage: 'Semi-final · Center Court', rounds: ['R16', 'QF', 'SF', 'Final'], now: 2,
      a: { name: 'R. Mehta', pts: [6, 4, 5] }, b: { name: 'A. Khan', pts: [3, 6, 4] } },
    { sport: 'pickleball', title: 'Dink Masters', stage: 'Quarter-final · Court 07', rounds: ['Pool', 'QF', 'SF', 'Final'], now: 1,
      a: { name: 'Nikhil / Sana', pts: [11, 9] }, b: { name: 'Vivek / Isha', pts: [7, 11] } },
    { sport: 'football', title: 'Floodlight Cup', stage: 'Group stage · 38′', rounds: ['Group', 'QF', 'SF', 'Final'], now: 0,
      a: { name: 'Blue Hawks', pts: [2] }, b: { name: 'Night Owls', pts: [1] } },
  ];

  const SHOTS = [
    ['assets/img/tennis.jpg', 'Tennis match point'],
    ['assets/img/pickleball.jpg', 'Pickleball on the blue court'],
    ['assets/img/court-aerial-portrait.jpg', 'A clay court seen from above'],
    ['assets/img/football.jpg', 'Football kick-about'],
    ['assets/img/track.jpg', 'Sprint on the track'],
    ['assets/img/gameready.jpg', 'Game ready'],
  ];

  /* ----------------------------------------------------------
     Small helpers
  ---------------------------------------------------------- */
  const store = {
    get: (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
    del: (k) => { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
  };
  let profile = store.get('xcs_profile', null);
  let regs = store.get('xcs_regs', []);

  const dShort = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const dLong = (d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const isReg = (id) => regs.some((r) => r.id === id);
  const toast = (msg) => { const t = $('#toast'); t.textContent = msg; t.classList.add('is-on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('is-on'), 2600); };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ----------------------------------------------------------
     Arena: badges + dust + pinned choreography
  ---------------------------------------------------------- */
  $$('.abadge').forEach((li, i) => {
    li.style.setProperty('--i', i);
    li.innerHTML = `<div class="abadge-in">${Badge(li.dataset.kind)}<b>${li.dataset.name}</b></div>`;
  });

  const dust = $('#dust');
  if (dust && !reduce) {
    dust.style.cssText = 'position:absolute;inset:0';
    for (let i = 0; i < 18; i++) {
      const s = document.createElement('span');
      s.className = 'dust';
      s.style.cssText = `left:${40 + Math.random() * 20}%;--d:${(-Math.random() * 10).toFixed(2)}s;--t:${(7 + Math.random() * 5).toFixed(1)}s;--dx:${Math.round((Math.random() - 0.5) * 80)}px;width:${2 + Math.random() * 2}px;height:${2 + Math.random() * 2}px`;
      dust.appendChild(s);
    }
  }

  if (!reduce) {
    const mm = gsap.matchMedia();
    mm.add({ desk: '(min-width: 901px)', mob: '(max-width: 900px)' }, (ctx) => {
      const mob = ctx.conditions.mob;
      const lines = $$('.ql'), kick = $('.arena-q .kicker'), badges = $$('.abadge'), trophy = $('.trophy'), head = $('#arenaH');

      gsap.set(['.spot-beam', '.spot-core', '.spot-src', '.spot-pool'], { opacity: 0 });
      gsap.set(trophy, { opacity: 0, y: 70, scale: 0.9 });
      gsap.set([kick, ...lines], { opacity: 0, y: 36, filter: 'blur(14px)' });
      gsap.set(badges, { opacity: 0 });
      gsap.set(head, { opacity: 0, y: 24 });

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: '.arena', start: 'top top', end: () => '+=' + Math.round(window.innerHeight * 6), pin: true, scrub: 1, anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 1 },
      });
      // 1 — the light comes on, the trophy rises into it
      tl.to('#hint', { opacity: 0, duration: 0.4 }, 0.1)
        .to(['.spot-beam', '.spot-core'], { opacity: 1, duration: 1.1, ease: 'power2.in' }, 0.2)
        .to(['.spot-src', '.spot-pool'], { opacity: 1, duration: 1.1 }, 0.2)
        .to(trophy, { opacity: 1, y: 0, scale: 1, duration: 1.5, ease: 'power2.out' }, 0.7)
        // 2 — the question
        .to(kick, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.8, ease: 'power2.out' }, 2.2)
        .to(lines[0], { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.9, ease: 'power2.out' }, 2.8)
        .to(lines[1], { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.9, ease: 'power2.out' }, 3.6)
        // 3 — hold, then the question clears
        .to('.arena-q', { opacity: 0, y: -28, duration: 0.8, ease: 'power2.in' }, 5.4);

      // 4 — the sport badges fly in, one by one
      badges.forEach((b, i) => {
        const left = i < 3;
        tl.fromTo(b,
          { x: () => (left ? -1 : 1) * window.innerWidth * 0.62, y: () => [-0.35, 0.05, 0.4][i % 3] * window.innerHeight, rotation: left ? -240 : 240, scale: 0.2, opacity: 0 },
          { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1, duration: 1.1, ease: 'back.out(1.5)' }, 6.1 + i * 0.5);
      });
      tl.fromTo(head, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out' }, 9.3)
        .to({}, { duration: 1.4 }, 10.2);

      // phones: the trophy steps back a little so the badge grid has room
      if (mob) tl.to(trophy, { scale: 0.9, y: -2, duration: 0.8, ease: 'power2.inOut' }, 5.6);
    });
  }

  /* ----------------------------------------------------------
     Upcoming
  ---------------------------------------------------------- */
  let filter = 'all';
  const chips = $('#chips');
  chips.innerHTML = [['all', 'All sports'], ...Object.entries(SPORTS)].map(([k, v]) => `<button class="chip${k === 'all' ? ' is-on' : ''}" role="tab" data-f="${k}" aria-selected="${k === 'all'}">${v}</button>`).join('');

  function cardHTML(t, reveal) {
    const taken = t.taken + (isReg(t.id) ? 1 : 0), left = Math.max(0, t.cap - taken), d = t.date;
    const reg = isReg(t.id), full = left === 0;
    return `<article class="t-card" ${reveal ? 'data-reveal' : ''} data-id="${t.id}">
      <div class="t-head">
        <div class="t-badge">${Badge(t.sport)}</div>
        <div class="t-date"><b>${d.getDate()}</b><span>${d.toLocaleDateString('en-IN', { month: 'short' })} · ${d.toLocaleDateString('en-IN', { weekday: 'short' })}</span></div>
      </div>
      <h3>${t.title}</h3>
      <p class="t-meta">${SPORTS[t.sport]} · ${t.format}</p>
      <div class="t-facts">
        <div><small>Entry / ${t.unit}</small><b>${inr(t.fee)}</b></div>
        <div><small>Prize pool</small><b>${inr(t.prize)}</b></div>
      </div>
      <div class="t-spots"><div class="bar-track"><i style="width:${Math.round((taken / t.cap) * 100)}%"></i></div><small><span>${taken} of ${t.cap} registered</span><span>${t.time}</span></small></div>
      <button class="t-reg" data-id="${t.id}" ${reg || full ? 'disabled' : ''}>${reg ? 'Registered ✓' : full ? 'Draw full' : 'Register'}</button>
    </article>`;
  }
  function renderUp(initial) {
    const list = UPCOMING.filter((t) => filter === 'all' || t.sport === filter);
    $('#upGrid').innerHTML = list.map((t) => cardHTML(t, initial)).join('') || '<p class="note">No tournaments for this sport yet — check back soon.</p>';
    if (!initial && !reduce) gsap.fromTo('#upGrid .t-card', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.07, ease: 'power3.out', clearProps: 'transform,opacity' });
  }
  chips.addEventListener('click', (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    filter = b.dataset.f;
    $$('.chip', chips).forEach((c) => { const on = c === b; c.classList.toggle('is-on', on); c.setAttribute('aria-selected', on); });
    renderUp(false);
  });
  $('#upGrid').addEventListener('click', (e) => { const b = e.target.closest('.t-reg'); if (b && !b.disabled) openReg(b.dataset.id); });

  /* ----------------------------------------------------------
     Ongoing
  ---------------------------------------------------------- */
  $('#liveGrid').innerHTML = LIVE.map((m) => {
    const sum = (p) => p.reduce((x, y) => x + y, 0);
    const aLead = sum(m.a.pts) >= sum(m.b.pts);
    const row = (t, lead) => `<div class="team${lead ? ' lead' : ''}"><span class="nm">${t.name}</span><span class="pts">${t.pts.map((p) => `<span>${p}</span>`).join('')}</span></div>`;
    return `<article class="live" data-reveal>
      <div class="live-top"><span class="live-dot">Live</span><span>${SPORTS[m.sport]}</span></div>
      <h3>${m.title}</h3><p class="stage">${m.stage}</p>
      <div class="score">${row(m.a, aLead)}${row(m.b, !aLead)}</div>
      <div class="rounds">${m.rounds.map((r, i) => `<span class="rd${i < m.now ? ' done' : i === m.now ? ' now' : ''}">${r}</span>`).join('')}</div>
    </article>`;
  }).join('');

  /* ----------------------------------------------------------
     Account
  ---------------------------------------------------------- */
  function renderAccount() {
    const uniq = new Set(regs.map((r) => r.sport)).size;

    // profile
    $('#profileCard').innerHTML = profile
      ? `<div class="who"><div class="avatar">${esc(profile.name.trim()[0] || 'P').toUpperCase()}</div><div><h3>${esc(profile.name)}</h3><p>Player since ${dShort(profile.since)} · ${esc(profile.phone)}</p></div></div>
         <div class="acct-actions"><a class="btn-solid" href="#upcoming">Find a tournament</a><button class="btn-ghost" id="signOut" type="button">Sign out</button></div>`
      : `<h3 class="dk-t">Create your player profile</h3><p class="dk-s">Takes ten seconds. Saved on this device only (demo) — no password needed.</p>
         <form id="profileForm" novalidate>
           <label class="field"><span>Name</span><input name="name" autocomplete="name" placeholder="e.g. Aarav Reddy" required></label>
           <label class="field"><span>Phone / WhatsApp</span><input name="phone" inputmode="tel" autocomplete="tel" placeholder="10-digit mobile number" required></label>
           <button class="btn-solid" type="submit">Create profile</button>
         </form>`;

    // registrations
    $('#regsCard').innerHTML = `<h3 class="dk-t">My registrations</h3>` + (regs.length
      ? `<div class="reg-list">${regs.map((r) => `<div class="reg-item">${Badge(r.sport)}<div><b>${esc(r.title)}</b><small>${dLong(r.date)}${r.team ? ' · ' + esc(r.team) : ''}</small></div></div>`).join('')}</div>`
      : `<p class="reg-empty">Nothing yet — pick a tournament above and your entries will show up here.</p>`);

    // achievements
    const ACH = [
      { kind: 'star', title: 'Rookie', desc: 'Create your player profile', done: !!profile, when: profile && dShort(profile.since) },
      { kind: 'ticket', title: 'In the draw', desc: 'Register for a tournament', done: regs.length >= 1, prog: [Math.min(regs.length, 1), 1] },
      { kind: 'rings', title: 'Multi-sport', desc: 'Enter two different sports', done: uniq >= 2, prog: [Math.min(uniq, 2), 2] },
      { kind: 'crown', title: 'Champion', desc: 'Win a tournament', done: false, prog: [0, 1] },
    ];
    $('#cabinet').innerHTML = ACH.map((a) => `<div class="ach">${Badge(a.kind, { locked: !a.done })}<b>${a.title}</b>
      ${a.done ? `<small>${a.when || 'Unlocked'}</small>` : `<small>${a.desc}</small>${a.prog ? `<div class="prog"><i style="width:${(a.prog[0] / a.prog[1]) * 100}%"></i></div>` : ''}`}</div>`).join('');

    // records
    const next = regs.map((r) => new Date(r.date)).filter((d) => d >= new Date(new Date().setHours(0, 0, 0, 0))).sort((a, b) => a - b)[0];
    $('#records').innerHTML = [[regs.length, 'Tournaments entered'], [uniq, 'Sports tried'], [next ? dShort(next) : '—', 'Next event']].map(([v, l]) => `<div class="rec"><b>${v}</b><small>${l}</small></div>`).join('');
  }

  document.addEventListener('submit', (e) => {
    if (e.target.id !== 'profileForm') return;
    e.preventDefault();
    const f = new FormData(e.target), name = (f.get('name') || '').trim(), phone = (f.get('phone') || '').replace(/\D/g, '');
    if (!name || phone.length < 10) return toast('Enter your name and a 10-digit phone number');
    profile = { name, phone: phone.slice(-10), since: new Date().toISOString() };
    store.set('xcs_profile', profile); renderAccount(); renderUp(false); toast('Profile created — Rookie badge unlocked');
  });
  document.addEventListener('click', (e) => {
    if (e.target.id !== 'signOut') return;
    profile = null; regs = []; store.del('xcs_profile'); store.del('xcs_regs'); renderAccount(); renderUp(false); toast('Signed out');
  });

  /* ----------------------------------------------------------
     Registration dialog
  ---------------------------------------------------------- */
  const dlg = $('#regDialog'), regF = $('#regF'), regForm = $('#regForm'), regDone = $('#regDone');
  let current = null;
  function openReg(id) {
    current = UPCOMING.find((t) => t.id === id); if (!current) return;
    $('#regBadge').innerHTML = Badge(current.sport);
    $('#regTitle').textContent = current.title;
    $('#regSub').textContent = `${SPORTS[current.sport]} · ${dLong(current.date)} · ${current.time} · ${inr(current.fee)}/${current.unit}`;
    regF.name.value = profile ? profile.name : ''; regF.phone.value = profile ? profile.phone : ''; regF.team.value = '';
    regForm.hidden = false; regDone.hidden = true;
    dlg.showModal(); lock();
  }
  const closeReg = () => { if (dlg.open) dlg.close(); };
  dlg.addEventListener('close', unlock);
  $('#regCancel').addEventListener('click', closeReg);
  $('#regClose').addEventListener('click', closeReg);
  dlg.addEventListener('click', (e) => { if (e.target === dlg) closeReg(); });
  regF.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = regF.name.value.trim(), phone = regF.phone.value.replace(/\D/g, ''), team = regF.team.value.trim();
    if (!name || phone.length < 10) return toast('Enter your name and a 10-digit phone number');
    const t = current;
    if (!profile) { profile = { name, phone: phone.slice(-10), since: new Date().toISOString() }; store.set('xcs_profile', profile); }
    if (!isReg(t.id)) { regs.push({ id: t.id, title: t.title, sport: t.sport, date: t.date.toISOString(), team }); store.set('xcs_regs', regs); }
    const msg = `Hi Crosscourt! I'd like to register for ${t.title} (${SPORTS[t.sport]}) on ${dLong(t.date)}. Name: ${name}. Phone: ${phone.slice(-10)}.${team ? ' Team/partner: ' + team + '.' : ''}`;
    // TODO: replace with the club's registration / payment API. For now the entry is confirmed over WhatsApp.
    $('#regWa').href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
    $('#regDoneTxt').textContent = `${t.title} · ${dShort(t.date)}. Tap below to send your details to the club.`;
    regForm.hidden = true; regDone.hidden = false;
    renderAccount(); renderUp(false);
  });

  /* ----------------------------------------------------------
     Gallery + lightbox
  ---------------------------------------------------------- */
  $('#masonry').innerHTML = SHOTS.map(([src, alt], i) => `<button class="shot" type="button" data-i="${i}" data-reveal aria-label="Open photo: ${alt}"><img src="${src}" alt="${alt}" loading="lazy" decoding="async"></button>`).join('');
  const lb = $('#lb'), lbImg = $('#lbImg');
  let li = 0;
  const showShot = (i) => { li = (i + SHOTS.length) % SHOTS.length; lbImg.src = SHOTS[li][0]; lbImg.alt = SHOTS[li][1]; };
  const openLb = (i) => { showShot(i); lb.classList.add('is-on'); lb.setAttribute('aria-hidden', 'false'); lock(); };
  const closeLb = () => { lb.classList.remove('is-on'); lb.setAttribute('aria-hidden', 'true'); unlock(); };
  $('#masonry').addEventListener('click', (e) => { const b = e.target.closest('.shot'); if (b) openLb(+b.dataset.i); });
  $('#lbX').addEventListener('click', closeLb);
  $('#lbP').addEventListener('click', () => showShot(li - 1));
  $('#lbN').addEventListener('click', () => showShot(li + 1));
  lb.addEventListener('click', (e) => { if (e.target === lb) closeLb(); });
  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('is-on')) return;
    if (e.key === 'Escape') closeLb(); if (e.key === 'ArrowLeft') showShot(li - 1); if (e.key === 'ArrowRight') showShot(li + 1);
  });

  /* ----------------------------------------------------------
     Boot + scroll reveals
  ---------------------------------------------------------- */
  renderUp(true);
  renderAccount();
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 90%', once: true,
    onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1.2, stagger: 0.09, ease: 'expo.out', overwrite: true }),
  });
  window.addEventListener('load', () => { if (location.hash && $(location.hash)) setTimeout(() => scrollToY($(location.hash), { offset: -40 }), 300); });
})();
