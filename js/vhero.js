/* Tournaments hero video: loops, tries to play WITH sound, pauses when scrolled away.
   Browsers block unmuted autoplay until the visitor interacts with the page, so if the first try is refused
   the video starts muted and switches the sound on at the visitor's first click / tap / key press
   (the button also toggles it any time). */
(() => {
  const v = document.getElementById('vhVideo');
  const btn = document.getElementById('vhSound');
  const lbl = document.getElementById('vhSoundLbl');
  if (!v || !btn) return;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let inView = true, wantSound = true;

  const paint = () => {
    const on = !v.muted && !v.paused;
    btn.classList.toggle('is-off', !on);
    btn.setAttribute('aria-pressed', String(on));
    const txt = on ? 'Sound on, click to mute' : (wantSound ? 'Tap for sound' : 'Sound off, click to unmute');
    lbl.textContent = txt; btn.setAttribute('title', txt);
  };
  const play = () => v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });   // if sound is refused, still play (muted)

  // 1 - try with sound; if the browser refuses, fall back to muted
  v.muted = false; v.volume = 1;
  const first = reduce ? Promise.reject() : v.play();
  Promise.resolve(first).catch(() => { v.muted = true; if (!reduce) play(); }).finally(paint);

  // 2 - the first real interaction (anything the browser counts as a user gesture) turns the sound on.
  //     Listeners stay until the unmuted play() actually succeeds.
  const GESTURES = ['pointerup', 'mousedown', 'click', 'keydown', 'touchend'];
  const drop = () => GESTURES.forEach((e) => removeEventListener(e, unlock, true));
  function unlock(e) {
    if (e.target.closest && e.target.closest('#vhSound')) return;   // the button handles its own clicks
    if (!wantSound) return drop();
    if (!inView) return;
    v.muted = false;
    v.play().then(() => { drop(); paint(); }).catch(() => { v.muted = true; play(); paint(); });
  }
  GESTURES.forEach((e) => addEventListener(e, unlock, { capture: true, passive: true }));

  // 3 - the button
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const turnOn = v.muted || v.paused;
    wantSound = turnOn; v.muted = !turnOn;
    if (turnOn) v.play().then(drop).catch(() => {});
    else drop();
    paint();
  });

  // 4 - don't play (or make noise) off-screen or in a background tab
  const sync = () => { if (inView && !document.hidden && !reduce) play(); else v.pause(); paint(); };
  new IntersectionObserver(([en]) => { inView = en.intersectionRatio > 0.25; sync(); }, { threshold: [0, 0.25, 0.5] }).observe(v);
  document.addEventListener('visibilitychange', sync);
  v.addEventListener('volumechange', paint);
  v.addEventListener('play', paint); v.addEventListener('pause', paint);
})();
