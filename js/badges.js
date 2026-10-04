/* ------------------------------------------------------------------
   Enamel-and-gold badges (inline SVG), in the spirit of achievement pins:
   gold bevelled rim, glossy enamel face, cream pictogram.
   window.Badge(kind, { locked }) -> svg string
------------------------------------------------------------------- */
(function () {
  let uid = 0;
  const CREAM = '#fff1cc', EDGE = '#c99a3b';

  // enamel colours  [light, dark]
  const COLORS = {
    tennis: ['#d9f25a', '#6b9612'],
    pickleball: ['#3f93ec', '#1a4f9e'],
    cricket: ['#f0604a', '#a81f12'],
    football: ['#34b56a', '#0f5a31'],
    swimming: ['#35cfe0', '#0b6f86'],
    tabletennis: ['#ff9a45', '#b5470c'],
    star: ['#ff6f7d', '#a3142f'],
    ticket: ['#ff6f7d', '#a3142f'],
    rings: ['#ff6f7d', '#a3142f'],
    crown: ['#ff6f7d', '#a3142f'],
  };

  const ICONS = {
    tennis: (c) => `
      <g transform="rotate(-40 100 100)">
        <ellipse cx="100" cy="86" rx="25" ry="33" fill="none" stroke="${CREAM}" stroke-width="7"/>
        <path d="M100 55V117M80 70H120M76 86H124M80 102H120" stroke="${CREAM}" stroke-width="2" opacity=".8"/>
        <path d="M96 118h8v34a4 4 0 0 1-8 0z" fill="${CREAM}"/>
      </g>
      <circle cx="66" cy="136" r="13" fill="${CREAM}"/>
      <path d="M56 131q10 6 20 0M56 141q10-6 20 0" stroke="${c}" stroke-width="2.2" fill="none"/>`,
    pickleball: (c) => `
      <g transform="rotate(35 100 100)">
        <rect x="74" y="48" width="52" height="64" rx="24" fill="${CREAM}"/>
        <rect x="94" y="110" width="12" height="36" rx="5" fill="${CREAM}"/>
        <g fill="${c}" opacity=".55"><circle cx="90" cy="70" r="3"/><circle cx="110" cy="70" r="3"/><circle cx="100" cy="82" r="3"/><circle cx="86" cy="94" r="3"/><circle cx="114" cy="94" r="3"/></g>
      </g>
      <circle cx="142" cy="140" r="14" fill="${CREAM}"/>
      <g fill="${c}" opacity=".7"><circle cx="137" cy="136" r="2.4"/><circle cx="147" cy="136" r="2.4"/><circle cx="142" cy="144" r="2.4"/><circle cx="135" cy="146" r="2"/><circle cx="149" cy="146" r="2"/></g>`,
    cricket: (c) => `
      <g transform="rotate(38 100 100)">
        <path d="M87 44h26l4 70H83z" fill="${CREAM}"/>
        <rect x="95" y="112" width="10" height="38" rx="4" fill="${CREAM}"/>
        <path d="M96 124h8M96 132h8M96 140h8" stroke="${c}" stroke-width="2" opacity=".6"/>
        <path d="M100 52v54" stroke="${c}" stroke-width="2" opacity=".35"/>
      </g>
      <circle cx="62" cy="138" r="14" fill="${CREAM}"/>
      <path d="M52 132q10 8 20 0" stroke="${c}" stroke-width="2.4" fill="none"/>`,
    football: (c) => `
      <circle cx="100" cy="100" r="42" fill="${CREAM}"/>
      <polygon points="100,86 113.3,95.7 108.2,111.3 91.8,111.3 86.7,95.7" fill="${c}"/>
      <g stroke="${c}" stroke-width="3" stroke-linecap="round"><path d="M100 86V62M113.3 95.7L136 88M108.2 111.3L122 130M91.8 111.3L78 130M86.7 95.7L64 88"/></g>
`,
    swimming: () => `
      <circle cx="118" cy="70" r="10" fill="${CREAM}"/>
      <path d="M58 110q22-30 48-24l24 6" stroke="${CREAM}" stroke-width="10" stroke-linecap="round" fill="none"/>
      <path d="M50 128q12-10 25 0t25 0t25 0t25 0" stroke="${CREAM}" stroke-width="7" stroke-linecap="round" fill="none"/>
      <path d="M50 148q12-10 25 0t25 0t25 0t25 0" stroke="${CREAM}" stroke-width="7" stroke-linecap="round" fill="none"/>`,
    tabletennis: (c) => `
      <g transform="rotate(-35 100 100)">
        <circle cx="100" cy="82" r="31" fill="${CREAM}"/>
        <rect x="94" y="110" width="12" height="38" rx="5" fill="${CREAM}"/>
        <path d="M82 76q18-14 36 0" stroke="${c}" stroke-width="2.4" fill="none" opacity=".5"/>
      </g>
      <circle cx="140" cy="134" r="10" fill="${CREAM}"/>`,
    star: () => `<polygon points="100,52 113,86 150,88 121,110 131,146 100,126 69,146 79,110 50,88 87,86" fill="${CREAM}"/>`,
    ticket: (c) => `
      <path d="M52 78h96v16a8 8 0 0 0 0 16v16H52v-16a8 8 0 0 0 0-16z" fill="${CREAM}"/>
      <path d="M118 80v56" stroke="${c}" stroke-width="3" stroke-dasharray="4 5"/>
      <circle cx="84" cy="106" r="9" fill="none" stroke="${c}" stroke-width="3"/>`,
    rings: () => `
      <g fill="none" stroke="${CREAM}" stroke-width="8"><circle cx="76" cy="104" r="26"/><circle cx="124" cy="104" r="26"/><circle cx="100" cy="82" r="26"/></g>`,
    crown: () => `<path d="M54 140l-6-56 34 28 18-40 18 40 34-28-6 56z" fill="${CREAM}"/><rect x="54" y="144" width="92" height="9" rx="3" fill="${CREAM}"/>`,
  };

  window.Badge = function (kind, opts) {
    opts = opts || {};
    const id = 'bd' + (++uid);
    const [c1, c2] = COLORS[kind] || COLORS.star;
    const icon = (ICONS[kind] || ICONS.star)(c2);
    return `<svg class="badge-svg${opts.locked ? ' is-locked' : ''}" viewBox="0 0 200 200" role="img" aria-label="${kind} badge" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="${id}r" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff6cf"/><stop offset=".3" stop-color="#e9bf5c"/><stop offset=".62" stop-color="#9a6a1c"/><stop offset=".85" stop-color="#f1d27c"/><stop offset="1" stop-color="#b98425"/>
    </linearGradient>
    <linearGradient id="${id}b" x1="1" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#fff0b8"/><stop offset=".45" stop-color="#b57d22"/><stop offset="1" stop-color="#f6dc8e"/>
    </linearGradient>
    <radialGradient id="${id}f" cx=".32" cy=".26" r=".95">
      <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
    </radialGradient>
    <linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="${id}c"><circle cx="100" cy="100" r="82"/></clipPath>
    <filter id="${id}s" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity=".45"/></filter>
  </defs>
  <g filter="url(#${id}s)">
    <circle cx="100" cy="100" r="96" fill="url(#${id}r)"/>
    <circle cx="100" cy="100" r="89" fill="url(#${id}b)"/>
    <circle cx="100" cy="100" r="84" fill="#5a3b0a" opacity=".55"/>
    <circle cx="100" cy="100" r="82" fill="url(#${id}f)"/>
    <circle cx="100" cy="100" r="71" fill="none" stroke="${EDGE}" stroke-width="1.6" opacity=".8"/>
    <g stroke="${EDGE}" stroke-width="1.6" stroke-linejoin="round" paint-order="stroke">${icon}</g>
    <g clip-path="url(#${id}c)"><ellipse cx="86" cy="46" rx="66" ry="40" fill="url(#${id}g)"/></g>
  </g>
</svg>`;
  };
})();
