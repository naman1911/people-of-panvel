// Reusable low-poly models, drawn at the local origin facing +X (vehicles)
// or standing at the origin (trees, furniture). Used both for static street
// dressing and for things that move.

const CAR_PAINT = ['#f2f2f0', '#f2f2f0', '#c9ccd0', '#8d9299', '#3b3e44', '#8c1d1d', '#1f3c6e', '#b88a4a', '#e8e2d2'];
const BIKE_PAINT = ['#1d1d1f', '#8c1d1d', '#1f3c6e', '#c9ccd0', '#f2f2f0', '#d1670f'];
const HALF = Math.PI / 2;

function wheel(m, x, z, r, w, side) {
  // axle along local Z
  m.cyl(x, r, z - (side * w) / 2, r, r, w, '#17181a', 'flat', { rx: HALF * side, seg: 7 });
}

export function car(m, rnd, kind) {
  const paint = CAR_PAINT[(rnd() * CAR_PAINT.length) | 0];
  const suv = kind === 'suv' || (!kind && rnd() < 0.3);
  const L = suv ? 4.2 : 3.75, W = suv ? 1.78 : 1.62, base = suv ? 0.34 : 0.26;
  const bodyH = suv ? 0.78 : 0.62, cabH = suv ? 0.62 : 0.52;
  m.box(0, base, 0, L, bodyH, W, paint, 'gloss');
  m.box(L / 2 - 0.02, base + 0.1, 0, 0.12, 0.3, W * 0.96, '#2a2c30', 'flat'); // front bumper
  m.box(-L / 2 + 0.02, base + 0.1, 0, 0.12, 0.3, W * 0.96, '#2a2c30', 'flat');
  const cabL = L * (suv ? 0.62 : 0.56), cabX = -L * (suv ? 0.08 : 0.06);
  m.box(cabX, base + bodyH, 0, cabL, cabH, W * 0.92, '#ffffff', 'glassDark');
  m.box(cabX, base + bodyH + cabH, 0, cabL * 0.94, 0.07, W * 0.9, paint, 'gloss');
  // pillars
  for (const pz of [-W * 0.46, W * 0.46]) m.box(cabX, base + bodyH, pz, 0.1, cabH, 0.05, paint, 'gloss');
  // lamps
  for (const s of [-1, 1]) m.box(L / 2 + 0.01, base + bodyH - 0.26, s * W * 0.34, 0.05, 0.14, 0.34, '#fffbe6', 'glow');
  m.box(-L / 2 - 0.01, base + bodyH - 0.22, 0, 0.05, 0.12, W * 0.9, '#8f140e', 'glow');
  const wr = suv ? 0.36 : 0.3;
  for (const wx of [L * 0.32, -L * 0.32]) {
    wheel(m, wx, W / 2 - 0.1, wr, 0.22, 1);
    wheel(m, wx, -W / 2 + 0.1, wr, 0.22, -1);
  }
  return { L, W };
}

/** The black-and-yellow autorickshaw of the Mumbai region. */
export function auto(m) {
  const black = '#1b1c1f', yellow = '#f2bf18';
  m.box(-0.1, 0.3, 0, 2.5, 0.3, 1.28, black, 'gloss'); // floor pan
  m.box(-0.62, 0.6, 0, 1.3, 0.62, 1.3, black, 'gloss'); // passenger tub
  m.box(-1.22, 0.6, 0, 0.1, 1.05, 1.3, black, 'gloss'); // back panel
  m.box(-1.2, 1.25, 0, 0.06, 0.34, 0.9, '#2a3a44', 'glassDark'); // rear window
  m.box(0.95, 0.6, 0, 0.55, 0.5, 0.96, black, 'gloss'); // nose
  m.box(1.28, 0.6, 0, 0.16, 0.36, 0.6, black, 'gloss');
  m.box(1.05, 1.1, 0, 0.05, 0.6, 1.0, '#cfe3ea', 'glassDark', { rz: -0.22 }); // windscreen
  m.box(0.25, 0.6, 0, 0.5, 0.15, 1.0, '#33363b', 'flat'); // driver seat
  m.box(-0.75, 0.6, 0, 0.5, 0.2, 1.1, '#5a2b22', 'flat'); // passenger bench
  // hood
  m.box(-0.15, 1.7, 0, 2.4, 0.1, 1.36, yellow, 'flat');
  m.box(-1.25, 1.22, 0, 0.08, 0.5, 1.34, yellow, 'flat');
  for (const s of [-1, 1]) {
    m.box(0.98, 0.6, s * 0.62, 0.05, 1.12, 0.05, black, 'flat');
    m.box(-0.1, 0.6, s * 0.64, 0.05, 1.12, 0.05, black, 'flat');
    m.box(-0.62, 1.22, s * 0.66, 1.2, 0.06, 0.03, yellow, 'flat');
  }
  m.box(1.37, 0.78, 0, 0.05, 0.14, 0.14, '#fffbe6', 'glow');
  m.box(-1.28, 0.7, 0.45, 0.04, 0.1, 0.16, '#b3160f', 'glow');
  m.box(-1.28, 0.7, -0.45, 0.04, 0.1, 0.16, '#b3160f', 'glow');
  // meter and number plate
  m.box(1.36, 0.5, 0, 0.03, 0.12, 0.4, '#f2d21b', 'flat');
  wheel(m, 1.12, 0.06, 0.24, 0.12, 1);
  wheel(m, -0.78, 0.6, 0.24, 0.14, 1);
  wheel(m, -0.78, -0.6, 0.24, 0.14, -1);
}

export function scooter(m, rnd, rider) {
  const paint = BIKE_PAINT[(rnd() * BIKE_PAINT.length) | 0];
  if (rider) {
    const shirt = ['#e8e4d8', '#4e6a8f', '#a5d6a7', '#c2185b', '#f9a825', '#37474f'][(rnd() * 6) | 0];
    m.box(-0.22, 0.82, 0, 0.3, 0.55, 0.36, shirt, 'flat', { rz: -0.12 });
    m.box(0.1, 1.12, 0.17, 0.5, 0.09, 0.09, shirt, 'flat', { rz: -0.35 });
    m.box(0.1, 1.12, -0.17, 0.5, 0.09, 0.09, shirt, 'flat', { rz: -0.35 });
    m.box(0.02, 0.5, 0.17, 0.42, 0.14, 0.13, '#37474f', 'flat');
    m.box(0.02, 0.5, -0.17, 0.42, 0.14, 0.13, '#37474f', 'flat');
    m.ball(-0.16, 1.52, 0, 0.15, ['#1d1d1f', '#b3261e', '#f2f2f0', '#1f3c6e'][(rnd() * 4) | 0], 'gloss', { detail: 1 });
  }
  const bike = rnd() < 0.45;
  m.box(-0.1, 0.3, 0, 1.0, 0.42, 0.34, paint, 'gloss');
  m.box(-0.25, 0.72, 0, 0.72, 0.1, 0.32, '#1a1a1c', 'flat'); // seat
  if (bike) m.box(0.28, 0.6, 0, 0.42, 0.24, 0.3, paint, 'gloss'); // tank
  else m.box(0.42, 0.3, 0, 0.1, 0.7, 0.36, paint, 'gloss'); // leg shield
  m.box(0.56, 0.5, 0, 0.07, 0.62, 0.07, '#8f9499', 'metal', { rz: -0.35 }); // fork
  m.box(0.5, 1.02, 0, 0.06, 0.05, 0.62, '#1a1a1c', 'flat'); // handlebar
  m.box(0.6, 0.86, 0, 0.08, 0.14, 0.14, '#fffbe6', 'glow');
  m.box(-0.66, 0.6, 0, 0.05, 0.08, 0.1, '#b3160f', 'glow');
  wheel(m, 0.72, 0.045, 0.27, 0.09, 1);
  wheel(m, -0.56, 0.045, 0.27, 0.09, 1);
}

/** Small goods tempo. */
export function tempo(m, rnd) {
  const paint = ['#f2f2f0', '#d9a520', '#2f6ea5', '#c9ccd0'][(rnd() * 4) | 0];
  m.box(0, 0.42, 0, 4.1, 0.22, 1.6, '#2b2d31', 'flat');
  m.box(1.42, 0.64, 0, 1.25, 1.2, 1.58, paint, 'gloss');
  m.box(1.6, 1.22, 0, 0.92, 0.5, 1.6, '#ffffff', 'glassDark');
  m.box(-0.62, 0.64, 0, 2.8, 0.5, 1.6, paint, 'gloss');
  if (rnd() < 0.6) m.box(-0.62, 1.14, 0, 2.7, 0.9, 1.52, ['#3f6f4a', '#2f4f7a', '#8a6a3a'][(rnd() * 3) | 0], 'flat'); // tarpaulin
  m.box(2.06, 0.7, 0.5, 0.04, 0.14, 0.26, '#fffbe6', 'glow');
  m.box(2.06, 0.7, -0.5, 0.04, 0.14, 0.26, '#fffbe6', 'glow');
  for (const wx of [1.3, -1.3]) {
    wheel(m, wx, 0.72, 0.36, 0.24, 1);
    wheel(m, wx, -0.72, 0.36, 0.24, -1);
  }
}

/** MSRTC "Lal Pari" state transport bus. */
export function bus(m, kind = 'st') {
  const body = kind === 'st' ? '#c8281e' : '#2c6fb7', band = kind === 'st' ? '#f2c230' : '#f2f2f0';
  const L = 10.6, W = 2.5;
  m.box(0, 0.5, 0, L, 2.55, W, body, 'gloss');
  m.box(0, 1.05, 0, L + 0.02, 0.3, W + 0.02, band, 'gloss');
  m.box(0, 1.75, 0, L - 0.6, 0.8, W + 0.03, '#ffffff', 'glassDark');
  m.box(L / 2 - 0.2, 1.55, 0, 0.44, 1.05, W - 0.3, '#ffffff', 'glassDark'); // windscreen
  m.box(0, 3.05, 0, L - 0.2, 0.1, W - 0.16, '#e7e3d8', 'flat');
  m.box(L / 2 + 0.01, 2.72, 0, 0.05, 0.3, 1.5, '#fff3c2', 'glow'); // destination board
  for (let x = -L / 2 + 0.9; x < L / 2 - 0.6; x += 1.05) for (const s of [-1, 1]) m.box(x, 1.75, s * (W / 2 + 0.02), 0.07, 0.8, 0.02, body, 'gloss');
  for (const s of [-1, 1]) {
    m.box(L / 2 + 0.01, 0.8, s * 0.9, 0.04, 0.2, 0.34, '#fffbe6', 'glow');
    m.box(-L / 2 - 0.01, 0.9, s * 0.95, 0.04, 0.22, 0.26, '#b3160f', 'glow');
  }
  for (const wx of [L * 0.31, -L * 0.29]) {
    wheel(m, wx, W / 2 - 0.14, 0.5, 0.3, 1);
    wheel(m, wx, -W / 2 + 0.14, 0.5, 0.3, -1);
  }
}

/** One coach of a Mumbai suburban local. Length along X. */
export function coach(m, end = 0) {
  const L = 21, W = 3.4, base = 1.0;
  const white = '#e9e7df', purple = '#5d3a8e', yellow = '#f2c230';
  m.box(0, 0.35, 0, L - 1, 0.65, 2.4, '#2a2b2e', 'flat'); // underframe
  m.box(0, base, 0, L, 2.75, W, white, 'gloss');
  m.box(0, base + 0.45, 0, L + 0.02, 0.5, W + 0.03, purple, 'gloss');
  m.box(0, base + 2.4, 0, L + 0.02, 0.2, W + 0.03, purple, 'gloss');
  m.box(0, base + 2.75, 0, L - 0.3, 0.32, W - 0.5, '#bdbdb6', 'flat'); // roof
  // windows and open doorways
  for (const s of [-1, 1]) {
    const z = s * (W / 2 + 0.02);
    for (const dx of [-7.2, -2.4, 2.4, 7.2]) {
      m.box(dx, base + 0.12, z, 1.5, 2.1, 0.04, '#17181b', 'flat'); // doorway
      m.box(dx, base + 0.12, z + s * 0.02, 0.05, 2.1, 0.05, '#c9c9c4', 'metal'); // grab pole
    }
    for (const wx of [-9.4, -4.8, 0, 4.8, 9.4]) m.box(wx, base + 1.2, z, 1.5, 0.75, 0.03, '#ffffff', 'glassDark');
  }
  if (end) {
    const x = end * (L / 2 + 0.01);
    m.box(x, base + 1.3, 0, 0.05, 1.0, 2.6, '#ffffff', 'glassDark');
    m.box(x, base, 0, 0.06, 1.25, W - 0.1, yellow, 'gloss');
    m.box(x + end * 0.02, base + 0.5, 0.95, 0.05, 0.2, 0.3, '#fffbe6', 'glow');
    m.box(x + end * 0.02, base + 0.5, -0.95, 0.05, 0.2, 0.3, '#fffbe6', 'glow');
    m.box(x + end * 0.02, base + 2.48, 0, 0.05, 0.24, 1.3, '#ffb347', 'glow'); // destination indicator
  }
  // pantograph hint and bogies
  for (const bx of [-7, 7]) {
    m.box(bx, 0.1, 0, 3.2, 0.5, 2.5, '#222326', 'flat');
    for (const wx of [-1, 1]) for (const s of [-1, 1]) m.cyl(bx + wx, 0.46, s * 0.86 - 0.06, 0.46, 0.46, 0.12, '#3a3b3e', 'metal', { rx: HALF, seg: 10 });
  }
}

// ---- trees -----------------------------------------------------------------

const LEAF = ['#cfe0a8', '#b9d092', '#a8c486', '#dbe6b0', '#9dbd7c', '#c4d89a', '#b4c88a'];

export function tree(m, kind, s, rnd, painted, lite) {
  const leaf = LEAF[(rnd() * LEAF.length) | 0];
  if (kind === 'palm') {
    const h = 7 + rnd() * 4, lean = (rnd() - 0.5) * 0.5, dir = rnd() * 6.28;
    const tx = Math.cos(dir) * lean * 2, tz = Math.sin(dir) * lean * 2;
    m.beam(0, 0, 0, tx * 0.4, h * 0.55, tz * 0.4, 0.3, 0.3, '#b9aa92', 'bark');
    m.beam(tx * 0.4, h * 0.55, tz * 0.4, tx, h, tz, 0.22, 0.22, '#b9aa92', 'bark');
    const fronds = lite ? 5 : 7;
    for (let f = 0; f < fronds; f++) {
      const a = (f / fronds) * 6.28 + rnd() * 0.4, up = 0.5 + rnd() * 0.5;
      const mx = tx + Math.cos(a) * 1.5, mz = tz + Math.sin(a) * 1.5;
      m.beam(tx, h, tz, mx, h + up, mz, 0.55, 0.05, leaf, 'leaf');
      m.beam(mx, h + up, mz, tx + Math.cos(a) * 3.1, h + up - 1.0 - rnd() * 0.5, tz + Math.sin(a) * 3.1, 0.42, 0.04, leaf, 'leaf');
    }
    return 0.3;
  }
  if (kind === 'ashoka') {
    const h = 6 + rnd() * 3;
    m.cyl(0, 0, 0, 0.14, 0.1, 1.6, '#a39a8c', 'bark', { seg: 5, open: true });
    // tall drooping column, as on Ashoka trees along compound walls
    m.cyl(0, 1.2, 0, 0.85 * s, 0.62 * s, h * 0.55, leaf, 'leaf', { seg: 7, jitter: 0.1 });
    m.cyl(0, 1.2 + h * 0.55, 0, 0.62 * s, 0.05, h * 0.45, leaf, 'leaf', { seg: 7, jitter: 0.1 });
    return 0.2;
  }
  if (kind === 'bush') {
    m.ball(0, 0.55 * s, 0, 0.95 * s, leaf, 'leaf', { sy: 0.7, detail: 0, jitter: 0.15 });
    if (!lite && rnd() < 0.5) m.ball(0.7 * s, 0.4 * s, 0.3 * s, 0.65 * s, leaf, 'leaf', { sy: 0.7, detail: 0, jitter: 0.15 });
    return 0;
  }
  const big = kind === 'rain';
  const th = (big ? 3.6 : 2.5 + rnd() * 1.4) * s, tr = (big ? 0.42 : 0.2 + rnd() * 0.08) * s;
  m.cyl(0, 0, 0, tr * 1.25, tr * 0.8, th, '#bfb19c', 'bark', { seg: lite ? 5 : 6, open: true });
  if (painted && !lite) {
    // limewash and geru band, as on roadside trees across Maharashtra
    m.cyl(0, 0.02, 0, tr * 1.3, tr * 1.2, 0.95, '#ece8dc', 'flat', { seg: 6, open: true });
    m.cyl(0, 0.95, 0, tr * 1.22, tr * 1.2, 0.16, '#8c3b24', 'flat', { seg: 6, open: true });
  }
  const R = (big ? 3.6 : 2.3) * s;
  const blobs = lite ? 2 : big ? 5 : 3;
  m.ball(0, th + R * 0.55, 0, R, leaf, 'leaf', { sy: big ? 0.55 : 0.78, detail: !lite && (painted || big) ? 1 : 0, jitter: 0.12 });
  for (let i = 0; i < blobs; i++) {
    const a = (i / blobs) * 6.28 + rnd() * 0.8, d = R * (big ? 0.95 : 0.7), r = R * (0.5 + rnd() * 0.25);
    const bx = Math.cos(a) * d, bz = Math.sin(a) * d, by = th + R * (0.25 + rnd() * 0.45);
    m.ball(bx, by, bz, r, leaf, 'leaf', { sy: big ? 0.6 : 0.8, detail: 0, jitter: 0.16 });
  }
  if (kind === 'gulmohar' && !lite) for (let i = 0; i < 4; i++) {
    const a = rnd() * 6.28, d = R * rnd() * 0.8;
    m.ball(Math.cos(a) * d, th + R * 1.0, Math.sin(a) * d, R * 0.3, '#e2562b', 'flat', { sy: 0.4, detail: 0 });
  }
  return tr * 1.3;
}

// ---- street furniture ------------------------------------------------------

/** Street light. Returns the lamp head position in local space. */
export function lamp(m, h = 8.2, arm = 1.8) {
  m.cyl(0, 0, 0, 0.11, 0.07, h, '#8b9096', 'metal', { seg: 6 });
  m.box(0, 0, 0, 0.36, 0.5, 0.36, '#b9b5ad', 'concrete');
  m.beam(0, h - 0.1, 0, arm, h + 0.25, 0, 0.07, 0.07, '#8b9096', 'metal');
  m.box(arm + 0.25, h + 0.16, 0, 0.7, 0.1, 0.28, '#6e7378', 'metal');
  m.box(arm + 0.25, h + 0.12, 0, 0.55, 0.04, 0.2, '#fff1cf', 'glow');
  return [arm + 0.25, h + 0.1, 0];
}

/** Concrete electricity pole with cross-arm. */
export function pole(m, h = 7.6) {
  m.box(0, 0, 0, 0.2, h, 0.16, '#a7a297', 'concrete');
  m.box(0, h - 0.5, 0, 0.1, 0.1, 1.5, '#7b7f84', 'metal');
  m.box(0, h - 1.2, 0, 0.08, 0.08, 1.0, '#7b7f84', 'metal');
  for (const z of [-0.65, 0, 0.65]) m.cyl(0, h - 0.4, z, 0.04, 0.04, 0.14, '#e9e4d6', 'flat', { seg: 5 });
}

export function bench(m, color = '#2f6b4f') {
  m.box(0, 0.4, 0, 1.7, 0.07, 0.48, color, 'wood');
  m.box(0, 0.5, -0.24, 1.7, 0.42, 0.06, color, 'wood', { rx: -0.12 });
  for (const x of [-0.72, 0.72]) {
    m.box(x, 0, 0.16, 0.07, 0.4, 0.07, '#3a3d40', 'metal');
    m.box(x, 0, -0.2, 0.07, 0.9, 0.07, '#3a3d40', 'metal');
  }
}

/** Four-wheeled handcart heaped with produce. */
export function handcart(m, rnd) {
  m.box(0, 0.72, 0, 1.9, 0.1, 1.1, '#7a5a3a', 'wood');
  for (const x of [-0.7, 0.7]) for (const s of [-1, 1]) m.cyl(x, 0.3, s * 0.6 - 0.03, 0.3, 0.3, 0.06, '#3a3a3c', 'metal', { rx: HALF, seg: 10 });
  for (const x of [-0.7, 0.7]) for (const z of [-0.45, 0.45]) m.box(x, 0.3, z, 0.06, 0.44, 0.06, '#5a4630', 'wood');
  const palette = [['#f2a516', '#e2551f', '#f5d21b'], ['#5aa23a', '#d83a2e', '#8bbf3f'], ['#f0e3c0', '#c98a3c', '#8a5a2a']][(rnd() * 3) | 0];
  for (let i = 0; i < 9; i++) m.ball(-0.7 + (i % 3) * 0.7 + (rnd() - 0.5) * 0.2, 0.95 + rnd() * 0.12, -0.3 + ((i / 3) | 0) * 0.3, 0.26, palette[i % 3], 'flat', { detail: 0, sy: 0.7 });
  if (rnd() < 0.6) {
    // umbrella
    m.cyl(0.7, 0.8, 0.4, 0.03, 0.03, 1.7, '#8b8f94', 'metal', { seg: 5 });
    m.cone(0.7, 2.3, 0.4, 1.25, 0.42, ['#d43a2f', '#2f7fc1', '#f2b632', '#3aa76d'][(rnd() * 4) | 0], 'flat', { seg: 8 });
  }
}

/** A cow at rest on the roadside, entirely unbothered by traffic. Faces +X. */
export function cow(m, rnd) {
  const coat = ['#e9e2d2', '#c9a878', '#5a4232', '#f2efe6', '#8a6a4a'][(rnd() * 5) | 0];
  const sitting = rnd() < 0.5;
  const y = sitting ? 0.18 : 0.62;
  m.box(0, y, 0, 1.55, 0.62, 0.6, coat, 'flat');
  m.box(0.18, y + 0.62, 0, 0.34, 0.16, 0.34, coat, 'flat'); // hump
  m.box(0.92, y + 0.34, 0, 0.5, 0.34, 0.3, coat, 'flat', { rz: -0.5 }); // neck and head
  m.box(1.22, y + 0.34, 0, 0.36, 0.26, 0.28, coat, 'flat');
  for (const s of [-1, 1]) {
    m.box(1.12, y + 0.6, s * 0.13, 0.05, 0.2, 0.05, '#d9d2c2', 'flat', { rz: s * 0.2 });
    m.box(1.02, y + 0.5, s * 0.2, 0.06, 0.05, 0.14, coat, 'flat');
  }
  m.box(-0.82, y + 0.1, 0, 0.05, 0.6, 0.05, coat, 'flat', { rz: -0.25 }); // tail
  if (sitting) {
    for (const s of [-1, 1]) m.box(0.5, 0, s * 0.36, 0.5, 0.14, 0.14, coat, 'flat');
  } else {
    for (const x of [-0.6, 0.55]) for (const s of [-1, 1]) m.box(x, 0, s * 0.2, 0.13, 0.64, 0.13, coat, 'flat');
  }
}
