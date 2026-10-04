/* Real-time 3D trophy (three.js) — chrome cup, gold band + star, glass plinth, studio reflections.
   Bundled to vendor/trophy3d.min.js (see README). Falls back to the old SVG if WebGL is unavailable. */
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, MeshStandardMaterial, MeshPhysicalMaterial, MeshBasicMaterial,
  LatheGeometry, TorusGeometry, TubeGeometry, CubicBezierCurve3, ExtrudeGeometry, Shape, Vector2, Vector3,
  PlaneGeometry, CanvasTexture, SRGBColorSpace, ACESFilmicToneMapping, PMREMGenerator, DirectionalLight, SpotLight,
  BoxGeometry, DoubleSide, BackSide, SphereGeometry, CircleGeometry, Color,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

(() => {
  const host = document.querySelector('.trophy');
  const canvas = document.getElementById('trophyCv');
  if (!host || !canvas) return;

  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return; }                                   // no WebGL -> the SVG stays
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  // a dark studio with bright softboxes — chrome needs strong contrast in what it reflects
  function studio() {
    const env = new Scene();
    env.add(new Mesh(new SphereGeometry(30, 48, 24), new MeshBasicMaterial({ color: 0x666d73, side: BackSide })));
    const box = (w, h, x, y, z, col, k) => {
      const m = new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ color: new Color(col).multiplyScalar(k), side: DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 2, 0); env.add(m);
    };
    box(5, 18, -15, 6, 7, 0xffffff, 9);      // tall softbox, front-left
    box(4, 18, 16, 5, 5, 0xfff0d4, 7);       // tall softbox, front-right (warm)
    box(16, 7, 0, 22, 2, 0xffffff, 6);       // big overhead panel
    box(2, 16, -9, 3, -16, 0xcfe6ff, 5);     // rim strips behind
    box(2, 16, 10, 3, -16, 0xffe9c2, 5);
    box(20, 1.6, 0, 3.2, 15, 0xffffff, 7);    // long horizontal strip behind the camera -> a clean highlight line across the cup
    box(20, 4, 0, 8.5, 14, 0xdfe9f2, 2.2);   // soft fill above it
    // dark flags: the black bands that give chrome its contrast
    [[-6, 14, 3, 15], [7, 13, 2.5, 15], [0, -0.8, 14.5, 3.2], [-14, -6, 3, 16], [13, -8, 3, 16]].forEach(([x, z, w, h]) => {
      const m = new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ color: 0x020304, side: DoubleSide }));
      m.position.set(x, 5, z); m.lookAt(0, 2, 0); env.add(m);
    });
    return env;
  }
  scene.environment = pmrem.fromScene(studio(), 0.02).texture;

  const camera = new PerspectiveCamera(24, 1, 0.1, 100);

  /* ---------- materials ---------- */
  const silver = new MeshStandardMaterial({ color: 0xf4f7fa, metalness: 1, roughness: 0.09, envMapIntensity: 1.25 });
  const silverDark = new MeshStandardMaterial({ color: 0xe6ebf0, metalness: 1, roughness: 0.12, envMapIntensity: 1.2, side: DoubleSide });
  const gold = new MeshStandardMaterial({ color: 0xf0b948, metalness: 1, roughness: 0.2, envMapIntensity: 1.5 });
  const glass = new MeshPhysicalMaterial({
    color: 0xcfe9ff, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.2, envMapIntensity: 2.6,
    clearcoat: 1, clearcoatRoughness: 0.03, ior: 1.5, specularIntensity: 1, depthWrite: false,
  });

  const g = new Group();
  scene.add(g);

  /* ---------- helpers ---------- */
  const lathe = (pts, mat, seg = 96) => { const m = new Mesh(new LatheGeometry(pts.map(([r, y]) => new Vector2(r, y)), seg), mat); g.add(m); return m; };

  // cup: radius as a function of height
  const CUP_Y0 = 2.14, CUP_Y1 = 3.78, CUP_R = 0.98;
  const cupR = (t) => 0.26 + (CUP_R - 0.26) * Math.sin(Math.PI / 2 * Math.pow(t, 0.72));
  const cupPts = (t0, t1, grow = 0, n = 48) => Array.from({ length: n + 1 }, (_, i) => { const t = t0 + (t1 - t0) * i / n; return [cupR(t) + grow, CUP_Y0 + (CUP_Y1 - CUP_Y0) * t]; });

  /* ---------- glass plinth + name plate ---------- */
  const plinth = new Mesh(new RoundedBoxGeometry(1.86, 0.88, 1.2, 6, 0.05), glass);
  plinth.position.y = 0.44; plinth.renderOrder = 3; g.add(plinth);
  const plateTex = (() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    const x = c.getContext('2d');
    const gr = x.createLinearGradient(0, 0, 512, 0);
    ['#8a5a16', '#f6d77c', '#b8821f', '#fff0b0', '#c2902c', '#7a4c0f'].forEach((col, i, a) => gr.addColorStop(i / (a.length - 1), col));
    x.fillStyle = gr; x.fillRect(0, 0, 512, 128);
    x.strokeStyle = 'rgba(70,40,5,.8)'; x.lineWidth = 4; x.strokeRect(6, 6, 500, 116);
    x.fillStyle = '#4a2d05'; x.font = '800 44px Manrope, Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    if ('letterSpacing' in x) x.letterSpacing = '10px';
    x.fillText('CHAMPION', 262, 68);
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; t.anisotropy = 8; return t;
  })();
  const plate = new Mesh(new RoundedBoxGeometry(0.9, 0.24, 0.05, 3, 0.012), [gold, gold, gold, gold, new MeshStandardMaterial({ map: plateTex, metalness: 0.9, roughness: 0.28, envMapIntensity: 1.2 }), gold]);
  plate.position.set(0, 0.36, 0.5); g.add(plate);

  /* ---------- metal pedestal, stem, knot, collar ---------- */
  lathe([
    [0, 0.86], [0.56, 0.86], [0.58, 0.9], [0.67, 1.04], [0.66, 1.1], [0.62, 1.12], [0.34, 1.15], [0.24, 1.24],
    [0.18, 1.4], [0.17, 1.56], [0.24, 1.68], [0.3, 1.78], [0.24, 1.88], [0.17, 1.98], [0.14, 2.02],
    [0.2, 2.06], [0.26, 2.13],
  ], silver);
  const ring = new Mesh(new TorusGeometry(0.66, 0.035, 24, 96), gold); ring.rotation.x = Math.PI / 2; ring.position.y = 1.1; g.add(ring);

  /* ---------- cup ---------- */
  lathe(cupPts(0, 1, 0, 64), silverDark, 128);
  const lip = new Mesh(new TorusGeometry(CUP_R, 0.045, 24, 128), silver); lip.rotation.x = Math.PI / 2; lip.position.y = CUP_Y1; g.add(lip);
  // dark interior reads as depth
  const inner = new Mesh(new CircleGeometry(CUP_R - 0.02, 96), new MeshStandardMaterial({ color: 0x0b0f14, metalness: 0.6, roughness: 0.35 }));
  inner.rotation.x = -Math.PI / 2; inner.position.y = CUP_Y1 - 0.45; g.add(inner);
  // gold band
  const bT0 = (3.17 - CUP_Y0) / (CUP_Y1 - CUP_Y0), bT1 = (3.34 - CUP_Y0) / (CUP_Y1 - CUP_Y0);
  lathe(cupPts(bT0, bT1, 0.012, 8), gold, 128);

  // star
  const star = new Shape(); const R = 0.29, r = 0.125;
  for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R; i ? star.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : star.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  star.closePath();
  const starM = new Mesh(new ExtrudeGeometry(star, { depth: 0.035, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.015, bevelSegments: 3 }), gold);
  const sy = 2.88, st = (sy - CUP_Y0) / (CUP_Y1 - CUP_Y0);
  starM.position.set(0, sy - 0.02, cupR(st) + 0.015); starM.rotation.x = 0.4; g.add(starM);   // leans with the cup wall

  // handles
  const handle = (s) => {
    const c = new CubicBezierCurve3(new Vector3(s * 0.9, 3.56, 0), new Vector3(s * 1.5, 3.62, 0), new Vector3(s * 1.5, 2.8, 0), new Vector3(s * 0.74, 2.64, 0));
    const m = new Mesh(new TubeGeometry(c, 80, 0.07, 24, false), silver); g.add(m);
    [c.v0, c.v3].forEach((p) => { const b = new Mesh(new SphereGeometry(0.095, 24, 16), silver); b.position.copy(p); g.add(b); });
  };
  handle(1); handle(-1);

  /* ---------- soft contact shadow ---------- */
  const shadowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d'); const gr = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(0,0,0,.75)'); gr.addColorStop(0.55, 'rgba(0,0,0,.28)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 256, 256); return new CanvasTexture(c);
  })();
  const shadow = new Mesh(new PlaneGeometry(3.6, 2.4), new MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -0.005; g.add(shadow);

  /* ---------- lights (the metal mostly reflects the environment; these add the spec highlights) ---------- */
  const key = new DirectionalLight(0xfff1d6, 3.2); key.position.set(2.5, 7, 4); scene.add(key);
  const rimL = new DirectionalLight(0xa9d6ff, 2.2); rimL.position.set(-5, 3, -3); scene.add(rimL);
  const rimR = new DirectionalLight(0xffe2b0, 1.8); rimR.position.set(5, 2, -3); scene.add(rimR);
  const top = new SpotLight(0xfff6e0, 60, 14, 0.5, 0.7, 1.4); top.position.set(0, 9, 1.5); top.target.position.set(0, 2.5, 0); scene.add(top, top.target);

  /* ---------- sizing / camera ---------- */
  const TOTAL_H = 4.45, CENTER_Y = 2.3;
  function resize() {
    const w = canvas.clientWidth || 300, h = canvas.clientHeight || 470, dpr = Math.min(devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const dist = (TOTAL_H / 2) / Math.tan(camera.fov * Math.PI / 360);
    camera.position.set(0, CENTER_Y + 0.55, dist); camera.lookAt(0, CENTER_Y - 0.05, 0);
    camera.updateProjectionMatrix();
  }
  resize();
  new ResizeObserver(resize).observe(canvas);

  /* ---------- motion ---------- */
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let px = 0, visible = true, t0 = performance.now();
  addEventListener('pointermove', (e) => { px = (e.clientX / innerWidth - 0.5) * 2; }, { passive: true });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) loop(); }, { threshold: 0 }).observe(host);

  function frame(now) {
    const t = (now - t0) / 1000;
    const swing = reduce ? 0 : Math.sin(t * 0.55) * 0.42;
    g.rotation.y += ((-0.28 + swing + px * 0.28) - g.rotation.y) * 0.06;
    g.position.y = reduce ? 0 : Math.sin(t * 0.9) * 0.015;
    renderer.render(scene, camera);
  }
  let raf = 0;
  function loop(now = performance.now()) {
    cancelAnimationFrame(raf);
    frame(now);
    if (visible && !reduce) raf = requestAnimationFrame(loop);
  }
  loop();
  if (reduce) addEventListener('resize', () => frame(performance.now()));

  host.classList.add('is-3d');                                // hide the SVG fallback
})();
