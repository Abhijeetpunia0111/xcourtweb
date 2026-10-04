/* ------------------------------------------------------------------
   Procedural hero scenes.
   These are PLACEHOLDERS that render until real 14s videos are dropped
   into /assets/video/{sport}.mp4 (see README). Each scene is an inline
   SVG (1600x900, sliced) drawn in a simple one-point perspective.
------------------------------------------------------------------- */
(function () {
  const W = 1600, H = 900;
  const YH = 330;          // horizon line
  const DY = 620;          // pixel drop from horizon to the near plane
  const DEPTH = 60;        // perspective strength (units)
  const PX = 22;           // px per unit at the near plane
  const CX = 660;          // vanishing point x (shifted left, booking card sits right)

  const s = (v) => 1 / (1 + v / DEPTH);
  const P = (u, v) => [CX + u * PX * s(v), YH + DY * s(v)];
  const up = (u, v, h) => { const [x, y] = P(u, v); return [x, y - h * PX * s(v)]; };
  const f = (n) => Math.round(n * 10) / 10;
  const pts = (arr) => arr.map((p) => f(p[0]) + ',' + f(p[1])).join(' ');
  const poly = (a, attrs) => `<polygon points="${pts(a)}" ${attrs || ''}/>`;
  const quad = (u1, v1, u2, v2, attrs) => poly([P(u1, v1), P(u2, v1), P(u2, v2), P(u1, v2)], attrs);
  const ln = (u1, v1, u2, v2, attrs) => {
    const a = P(u1, v1), b = P(u2, v2);
    return `<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" ${attrs || ''}/>`;
  };
  const lnH = (u1, v1, h1, u2, v2, h2, attrs) => {
    const a = up(u1, v1, h1), b = up(u2, v2, h2);
    return `<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" ${attrs || ''}/>`;
  };
  const circle = (cu, cv, r, attrs, n = 48) => {
    const a = [];
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2;
      a.push(P(cu + Math.cos(t) * r, cv + Math.sin(t) * r));
    }
    return poly(a, attrs);
  };

  // deterministic noise so the skyline is stable between loads
  const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  function skyline(id, seed, color, base, amp, count) {
    const r = rng(seed);
    let d = `M0 ${H} L0 ${base}`;
    const step = W / count;
    for (let i = 0; i <= count; i++) {
      const x = i * step;
      const y = base - r() * amp - (r() > 0.7 ? amp * 0.8 : 0);
      d += ` Q ${f(x - step / 2)} ${f(y - amp * 0.5)} ${f(x)} ${f(y)}`;
    }
    d += ` L${W} ${H} Z`;
    return `<path d="${d}" fill="${color}"/>`;
  }

  function defs(id, sky, glowColor) {
    return `
    <defs>
      <linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${sky[0]}"/>
        <stop offset=".55" stop-color="${sky[1]}"/>
        <stop offset="1" stop-color="${sky[2]}"/>
      </linearGradient>
      <radialGradient id="${id}-glow">
        <stop offset="0" stop-color="${glowColor}" stop-opacity=".95"/>
        <stop offset=".25" stop-color="${glowColor}" stop-opacity=".35"/>
        <stop offset="1" stop-color="${glowColor}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="${id}-beam" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${glowColor}" stop-opacity=".38"/>
        <stop offset="1" stop-color="${glowColor}" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="${id}-fade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#000" stop-opacity="0"/>
        <stop offset="1" stop-color="#000" stop-opacity=".55"/>
      </linearGradient>
      <filter id="${id}-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
      <filter id="${id}-soft"><feGaussianBlur stdDeviation="1.1"/></filter>
    </defs>`;
  }

  function backdrop(id, o) {
    return `
    <rect width="${W}" height="${H}" fill="url(#${id}-sky)"/>
    <ellipse cx="${o.sunX}" cy="${YH + 10}" rx="620" ry="260" fill="url(#${id}-glow)" opacity="${o.sunOpacity}"/>
    ${skyline(id, o.seed, o.far, YH + 8, 26, 22)}
    ${skyline(id, o.seed + 7, o.near, YH + 24, 34, 14)}
    <rect y="${YH + 20}" width="${W}" height="${H}" fill="${o.ground}"/>`;
  }

  function pole(id, u, v, h, on) {
    const [bx, by] = P(u, v);
    const [tx, ty] = up(u, v, h);
    const sc = s(v);
    const head = 34 * sc + 10;
    return `
      <line x1="${f(bx)}" y1="${f(by)}" x2="${f(tx)}" y2="${f(ty)}" stroke="#0a0f0c" stroke-width="${f(4 * sc + 1.5)}"/>
      <rect x="${f(tx - head)}" y="${f(ty - head * .32)}" width="${f(head * 2)}" height="${f(head * .55)}" rx="3" fill="#10170f"/>
      <rect x="${f(tx - head * .85)}" y="${f(ty - head * .2)}" width="${f(head * 1.7)}" height="${f(head * .22)}" fill="${on}" opacity=".95"/>
      <circle cx="${f(tx)}" cy="${f(ty)}" r="${f(150 * sc + 40)}" fill="url(#${id}-glow)" style="mix-blend-mode:screen">
        <animate attributeName="opacity" values=".85;1;.85" dur="${3 + (u > 0 ? 1 : 0)}s" repeatCount="indefinite"/>
      </circle>`;
  }

  function beams(id, list) {
    return list.map(([u, v, h, tu, tv0, tv1]) => {
      const [tx, ty] = up(u, v, h);
      const a = P(tu - 10, tv0), b = P(tu + 10, tv0), c = P(tu + 26, tv1), d = P(tu - 26, tv1);
      return `<polygon points="${pts([[tx - 8, ty], [tx + 8, ty], b, c, d, a])}" fill="url(#${id}-beam)" style="mix-blend-mode:screen" opacity=".7"/>`;
    }).join('');
  }

  function ball(path, dur, r, fill) {
    return `<g><circle r="${r}" fill="${fill}" filter="none"><animateMotion dur="${dur}s" repeatCount="indefinite" path="${path}" calcMode="spline" keyTimes="0;1" keySplines=".4 0 .6 1"/></circle></g>`;
  }
  const bz = (a, c, b) => `Q ${f(c[0])} ${f(c[1])} ${f(b[0])} ${f(b[1])}`;
  const mv = (a) => `M ${f(a[0])} ${f(a[1])}`;

  /* ---------------- TENNIS ---------------- */
  function tennis() {
    const id = 'tn', V0 = 12, VN = V0 + 39, VE = V0 + 78;
    const line = 'stroke="#f4f1e6" stroke-width="2.2" stroke-linecap="square"';
    let g = defs(id, ['#0b1a14', '#6a5b3a', '#f2a86a'], '#ffd9a0');
    g += backdrop(id, { seed: 11, far: '#1b2a1d', near: '#0f1a12', ground: '#10241a', sunX: 1020, sunOpacity: .9 });
    g += pole(id, -36, 46, 40, '#fff2cf') + pole(id, 36, 46, 40, '#fff2cf');
    // surround + court
    g += quad(-34, V0 - 10, 34, VE + 10, 'fill="#1f4a37"');
    g += quad(-27, V0 - 6, 27, VE + 6, 'fill="#2a5e45"');
    g += quad(-18, V0, 18, VE, 'fill="#2c6f86"');
    g += quad(-13.5, V0 + 18, 13.5, VE - 18, 'fill="#357e96" opacity=".55"');
    g += `<g ${line} fill="none">`;
    g += ln(-18, V0, 18, V0) + ln(-18, VE, 18, VE) + ln(-18, V0, -18, VE) + ln(18, V0, 18, VE);
    g += ln(-13.5, V0, -13.5, VE) + ln(13.5, V0, 13.5, VE);
    g += ln(-13.5, VN - 21, 13.5, VN - 21) + ln(-13.5, VN + 21, 13.5, VN + 21);
    g += ln(0, VN - 21, 0, VN + 21);
    g += ln(0, V0, 0, V0 + 1.5) + ln(0, VE, 0, VE - 1.5);
    g += '</g>';
    g += beams(id, [[-36, 46, 40, -8, V0, VE], [36, 46, 40, 8, V0, VE]]);
    // net
    const netTop = (u) => up(u, VN, 3), netBot = (u) => P(u, VN);
    g += poly([netBot(-19.5), netTop(-19.5), netTop(19.5), netBot(19.5)], 'fill="#e9efe9" opacity=".18"');
    for (let u = -19; u <= 19; u += 1.5) g += lnH(u, VN, 0, u, VN, 3, 'stroke="#fff" stroke-opacity=".28" stroke-width="1"');
    g += lnH(-19.5, VN, 3, 19.5, VN, 3, 'stroke="#fff" stroke-width="3.4"');
    g += lnH(-19.5, VN, 0, -19.5, VN, 3.4, 'stroke="#101612" stroke-width="4"') + lnH(19.5, VN, 0, 19.5, VN, 3.4, 'stroke="#101612" stroke-width="4"');
    // rally
    const a = P(-5, V0 + 4), b = P(6, VE - 4), c1 = up(1, VN, 26), c2 = up(0, VN, 22);
    g += ball(`${mv(a)} ${bz(a, c1, b)} ${bz(b, c2, a)}`, 3.6, 5.5, '#dff35a');
    return g;
  }

  /* ---------------- PICKLEBALL ---------------- */
  function pickleball() {
    const id = 'pb';
    let g = defs(id, ['#08132b', '#2f4d78', '#f4b684'], '#ffe2b8');
    g += backdrop(id, { seed: 23, far: '#16243d', near: '#0c1424', ground: '#0e1c26', sunX: 560, sunOpacity: .75 });
    // semi-indoor roof
    g += `<polygon points="0,0 ${W},0 ${W},150 ${CX + 380},${YH - 40} ${CX - 380},${YH - 40} 0,150" fill="#070d18"/>`;
    for (let i = -6; i <= 6; i++) {
      g += `<line x1="${CX + i * 260}" y1="0" x2="${CX + i * 24}" y2="${YH - 40}" stroke="#1b2740" stroke-width="2"/>`;
    }
    for (let r = 0; r < 5; r++) {
      const y = 28 + r * 24 + r * r * 4;
      g += `<line x1="${CX - 600 + r * 90}" y1="${y}" x2="${CX + 600 - r * 90}" y2="${y}" stroke="#fff3d6" stroke-width="${f(5 - r * .6)}" stroke-linecap="round" opacity=".9"/>`;
      g += `<line x1="${CX - 600 + r * 90}" y1="${y}" x2="${CX + 600 - r * 90}" y2="${y}" stroke="#fff3d6" stroke-width="22" opacity=".1" filter="url(#${id}-blur)"/>`;
    }
    const line = 'stroke="#f7f4ea" stroke-width="2" stroke-linecap="square"';
    const court = (cu, V0) => {
      const VN = V0 + 22, VE = V0 + 44;
      let c = quad(cu - 13, V0 - 4, cu + 13, VE + 4, 'fill="#1b3f6b"');
      c += quad(cu - 10, V0, cu + 10, VE, 'fill="#2b6fa6"');
      c += quad(cu - 10, VN - 7, cu + 10, VN + 7, 'fill="#e07a4f" opacity=".92"');
      c += `<g ${line} fill="none">` + ln(cu - 10, V0, cu + 10, V0) + ln(cu - 10, VE, cu + 10, VE) + ln(cu - 10, V0, cu - 10, VE) + ln(cu + 10, V0, cu + 10, VE)
        + ln(cu - 10, VN - 7, cu + 10, VN - 7) + ln(cu - 10, VN + 7, cu + 10, VN + 7) + ln(cu, V0, cu, VN - 7) + ln(cu, VN + 7, cu, VE) + '</g>';
      c += poly([P(cu - 11, VN), up(cu - 11, VN, 2.9), up(cu + 11, VN, 2.9), P(cu + 11, VN)], 'fill="#0d1620" opacity=".55"');
      c += lnH(cu - 11, VN, 2.9, cu + 11, VN, 2.9, 'stroke="#f6f6f0" stroke-width="2.4"');
      return c;
    };
    g += quad(-60, 4, 60, 140, 'fill="#0b1b2e"');
    [30, 62].forEach((v) => { g += court(-24, v) + court(0, v) + court(24, v); });
    g += beams(id, [[-40, 40, 40, -20, 6, 60], [40, 40, 40, 20, 6, 60]]);
    const a = P(-4, 74), b = P(5, 102), c1 = up(1, 90, 17);
    g += ball(`${mv(P(-4, 40))} ${bz(0, up(0, 55, 14), P(5, 70))} ${bz(0, up(0, 55, 14), P(-4, 40))}`, 2.2, 4.5, '#e8ff54');
    return g;
  }

  /* ---------------- BOX CRICKET ---------------- */
  function cricket() {
    const id = 'cr', V0 = 8, VE = V0 + 82;
    let g = defs(id, ['#13281d', '#7b9a6b', '#f6e4b4'], '#fff1c4');
    g += backdrop(id, { seed: 37, far: '#25402b', near: '#162a1c', ground: '#173223', sunX: 900, sunOpacity: .95 });
    g += quad(-30, V0 - 8, 30, VE + 8, 'fill="#235c37"');
    for (let i = 0; i < 9; i++) {
      const a = V0 + i * ((VE - V0) / 9), b = V0 + (i + 1) * ((VE - V0) / 9);
      if (i % 2 === 0) g += quad(-30, a, 30, b, 'fill="#2c6e41" opacity=".75"');
    }
    g += quad(-5, V0 + 8, 5, VE - 8, 'fill="#c2a46a"');
    g += quad(-5, V0 + 8, 5, VE - 8, 'fill="#000" opacity=".06"');
    const cl = 'stroke="#f6f1de" stroke-width="2"';
    g += ln(-6.5, V0 + 14, 6.5, V0 + 14, cl) + ln(-6.5, VE - 14, 6.5, VE - 14, cl) + ln(-5, V0 + 8, -5, VE - 8, 'stroke="#f6f1de" stroke-width="1.5" opacity=".6"') + ln(5, V0 + 8, 5, VE - 8, 'stroke="#f6f1de" stroke-width="1.5" opacity=".6"');
    [V0 + 12, VE - 12].forEach((v) => { for (let k = -1; k <= 1; k++) g += lnH(k * 0.7, v, 0, k * 0.7, v, 2.6, 'stroke="#f2e7c9" stroke-width="2.6"'); });
    g += beams(id, [[-36, 52, 44, -10, V0, VE], [36, 52, 44, 10, V0, VE]]);
    // netting walls
    const net = 'stroke="#d8e6d4" stroke-opacity=".22" stroke-width="1"';
    [-30, 30].forEach((u) => {
      for (let v = V0 - 8; v <= VE + 8; v += 3) g += lnH(u, v, 0, u, v, 26, net);
      for (let h = 0; h <= 26; h += 3.2) g += lnH(u, V0 - 8, h, u, VE + 8, h, net);
      for (let v = V0 - 8; v <= VE + 8; v += 14) g += lnH(u, v, 0, u, v, 27, 'stroke="#0c120d" stroke-width="3"');
    });
    for (let u = -30; u <= 30; u += 3) g += lnH(u, VE + 8, 0, u, VE + 8, 26, net);
    for (let h = 0; h <= 26; h += 3.2) g += lnH(-30, VE + 8, h, 30, VE + 8, h, net);
    g += lnH(-30, VE + 8, 26, 30, VE + 8, 26, 'stroke="#0c120d" stroke-width="3"');
    // bowled delivery
    const a = P(0, VE - 16), b = P(0.4, V0 + 16), bounce = P(0.2, V0 + 40);
    g += ball(`${mv(a)} Q ${f(a[0])} ${f(a[1] + 20)} ${f(bounce[0])} ${f(bounce[1])} Q ${f(bounce[0])} ${f(bounce[1] - 90)} ${f(b[0])} ${f(b[1])}`, 2.6, 6, '#c8281e');
    return g;
  }

  /* ---------------- FOOTBALL ---------------- */
  function football() {
    const id = 'fb', V0 = 10, VE = V0 + 92, VM = V0 + 46;
    let g = defs(id, ['#02080a', '#0c2a2b', '#1e5a4c'], '#e8fff3');
    g += backdrop(id, { seed: 51, far: '#0b1c1b', near: '#06100f', ground: '#0a2018', sunX: 700, sunOpacity: .35 });
    g += quad(-34, V0 - 8, 34, VE + 8, 'fill="#0f3a27"');
    const n = 10;
    for (let i = 0; i < n; i++) {
      const a = V0 + i * ((VE - V0) / n), b = V0 + (i + 1) * ((VE - V0) / n);
      g += quad(-28, a, 28, b, `fill="${i % 2 ? '#1f6b3f' : '#247a46'}"`);
    }
    const l = 'stroke="#f2fff5" stroke-width="2" fill="none" stroke-opacity=".92"';
    g += `<g ${l}>` + ln(-28, V0, 28, V0) + ln(-28, VE, 28, VE) + ln(-28, V0, -28, VE) + ln(28, V0, 28, VE) + ln(-28, VM, 28, VM)
      + ln(-14, V0, -14, V0 + 14) + ln(14, V0, 14, V0 + 14) + ln(-14, V0 + 14, 14, V0 + 14)
      + ln(-14, VE, -14, VE - 14) + ln(14, VE, 14, VE - 14) + ln(-14, VE - 14, 14, VE - 14) + '</g>';
    g += circle(0, VM, 8, 'fill="none" stroke="#f2fff5" stroke-width="2" stroke-opacity=".92"');
    // goal at far end
    g += lnH(-6, VE, 0, -6, VE, 8, 'stroke="#fff" stroke-width="4"') + lnH(6, VE, 0, 6, VE, 8, 'stroke="#fff" stroke-width="4"') + lnH(-6, VE, 8, 6, VE, 8, 'stroke="#fff" stroke-width="4"');
    for (let u = -6; u <= 6; u += 1.2) g += lnH(u, VE + 1.5, 0, u, VE + 1.5, 8, 'stroke="#fff" stroke-opacity=".25" stroke-width="1"');
    g += pole(id, -40, 36, 46, '#ffffff') + pole(id, 40, 36, 46, '#ffffff') + pole(id, -40, 96, 46, '#ffffff') + pole(id, 40, 96, 46, '#ffffff');
    g += beams(id, [[-40, 36, 46, -12, V0, VE], [40, 36, 46, 12, V0, VE], [-40, 96, 46, -12, V0 + 30, VE], [40, 96, 46, 12, V0 + 30, VE]]);
    const a = P(-12, VE - 20), b = P(10, V0 + 20);
    g += ball(`${mv(a)} Q ${f(P(0, VM)[0] + 60)} ${f(P(0, VM)[1] - 30)} ${f(b[0])} ${f(b[1])} Q ${f(P(0, VM)[0] - 60)} ${f(P(0, VM)[1] - 10)} ${f(a[0])} ${f(a[1])}`, 4.2, 6, '#ffffff');
    return g;
  }

  /* ---------------- SWIMMING ---------------- */
  function swimming() {
    const id = 'sw', V0 = 6, VE = V0 + 92;
    let g = defs(id, ['#041018', '#0f3a4c', '#5fc4c0'], '#bff5ee');
    g += `<rect width="${W}" height="${H}" fill="url(#${id}-sky)"/>`;
    // building wall + glazing
    g += `<rect y="120" width="${W}" height="${YH - 100}" fill="#0a1c26"/>`;
    for (let i = 0; i < 9; i++) {
      g += `<rect x="${60 + i * 170}" y="170" width="140" height="${YH - 190}" fill="#5fc4c0" opacity="${i % 3 === 0 ? .55 : .28}"/>`;
    }
    g += `<rect y="${YH - 24}" width="${W}" height="30" fill="#0c2430"/>`;
    g += `<rect y="${YH + 6}" width="${W}" height="${H}" fill="#cfe3e2"/>`;
    g += quad(-44, V0 - 6, 44, VE + 6, 'fill="#e6f1ef"');
    // water
    g += quad(-27, V0, 27, VE, 'fill="#1f9fb4"');
    g += quad(-27, V0, 27, VE, `fill="url(#${id}-glow)" opacity=".35"`);
    // tile lines at lane centers
    const lanes = 6, lw = 54 / lanes;
    for (let i = 0; i < lanes; i++) {
      const u = -27 + lw * (i + 0.5);
      g += ln(u, V0, u, VE, 'stroke="#0a3e52" stroke-width="3" stroke-opacity=".55"');
    }
    for (let v = V0 + 4; v < VE; v += 10) g += ln(-27, v, 27, v, 'stroke="#fff" stroke-opacity=".06" stroke-width="1"');
    // lane ropes
    for (let i = 0; i <= lanes; i++) {
      const u = -27 + lw * i;
      const col = i === 0 || i === lanes ? '#ffffff' : '#ffffff';
      g += ln(u, V0, u, VE, `stroke="#e8423a" stroke-width="${i === 0 || i === lanes ? 1.5 : 4.5}"`);
      g += ln(u, V0, u, VE, `stroke="${col}" stroke-width="${i === 0 || i === lanes ? 1.5 : 4.5}" stroke-dasharray="7 21"`);
    }
    // caustics
    for (let i = 0; i < 9; i++) {
      const [x, y] = P(-22 + i * 5.6, V0 + 10 + (i * 37) % 70);
      g += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(60 * s(V0 + 10 + (i * 37) % 70) + 14)}" ry="${f(14 * s(V0 + 10 + (i * 37) % 70) + 4)}" fill="#e9fffb" opacity=".16" filter="url(#${id}-blur)">
        <animate attributeName="opacity" values=".08;.26;.08" dur="${3 + i % 4}s" begin="-${i}s" repeatCount="indefinite"/>
        <animate attributeName="cx" values="${f(x - 30)};${f(x + 30)};${f(x - 30)}" dur="${7 + i}s" repeatCount="indefinite"/></ellipse>`;
    }
    // backstroke flags
    g += lnH(-44, VE - 8, 22, 44, VE - 8, 22, 'stroke="#fff" stroke-opacity=".6" stroke-width="1.5"');
    // ceiling lights
    for (let i = 0; i < 5; i++) {
      const x = 160 + i * 320;
      g += `<circle cx="${x}" cy="40" r="180" fill="url(#${id}-glow)" opacity=".4" style="mix-blend-mode:screen"/>`;
      g += `<rect x="${x - 70}" y="30" width="140" height="8" rx="4" fill="#effffd"/>`;
    }
    return g;
  }

  window.SCENES = { tennis, pickleball, cricket, football, swimming };
})();
