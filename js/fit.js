/* Fits the big footer wordmark exactly to the content width (no clipping, edges aligned with the columns above). */
(() => {
  const el = document.querySelector('.foot-word');
  if (!el) return;
  const fit = () => {
    const w = el.parentElement.clientWidth - parseFloat(getComputedStyle(el.parentElement).paddingLeft) - parseFloat(getComputedStyle(el.parentElement).paddingRight);
    el.style.fontSize = '100px';
    const k = w / el.getBoundingClientRect().width;
    el.style.fontSize = (100 * k).toFixed(2) + 'px';
  };
  fit();
  addEventListener('resize', fit);
  addEventListener('load', fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
})();
