/* Back-to-top button: shows after the hero, scrolls smoothly up.
   (js/main.js already smooth-scrolls any a[href="#top"] with Lenis; this is the fallback.) */
(() => {
  const btn = document.getElementById('toTop');
  if (!btn) return;
  const update = () => btn.classList.toggle('is-on', window.scrollY > window.innerHeight * 0.9);
  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);
  update();
  document.addEventListener('click', (e) => {      // registered after main.js's document handler, so it runs second
    if (!e.target.closest('#toTop') || e.defaultPrevented) return;   // not us, or main.js already handled it
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
})();
