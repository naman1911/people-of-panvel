// Procedural building facades. One texture covers 4 bays x 4 floors so lit
// windows, curtains, AC units and drying clothes do not repeat too obviously.
// Walls are near-white; each building tints them with its own paint colour.

import { cv, N, blend, normalFromHeight, rgba, grey, mulberry32 } from './texkit.js';

const SIZE = 1024, CELL = 256;
const WARM = ['#ffcf8a', '#ffe0ac', '#ffd9a0', '#ffc474'];
const COOL = ['#d9ecff', '#eaf4ff'];
const CLOTH = ['#d94f3d', '#f2b632', '#2f7fc1', '#3aa76d', '#e86aa6', '#f4f1e8', '#7b4fb5', '#ff8a3c', '#1f9c95'];
const CURTAIN = ['#b85c4a', '#c9a36a', '#6c8fb0', '#7fa37a', '#d9cdb8', '#a36f96', '#e0b24f'];

class Kit {
  constructor(seed) {
    this.rnd = mulberry32(seed);
    [this.a, this.A] = cv(SIZE); // albedo
    [this.h, this.H] = cv(SIZE); // height
    [this.e, this.E] = cv(SIZE / 2); // emissive
    [this.r, this.R] = cv(SIZE / 2); // roughness
    this.E.scale(0.5, 0.5);
    this.R.scale(0.5, 0.5);
    this.E.fillStyle = '#000';
    this.E.fillRect(0, 0, SIZE, SIZE);
    this.R.fillStyle = '#e2e2e2';
    this.R.fillRect(0, 0, SIZE, SIZE);
    this.H.fillStyle = '#808080';
    this.H.fillRect(0, 0, SIZE, SIZE);
  }
  wall(color = '#e9e5dc', streak = 0.3) {
    const n = N(), g = this.A;
    g.fillStyle = color;
    g.fillRect(0, 0, SIZE, SIZE);
    blend(g, n.low, 'overlay', 0.28, 4);
    blend(g, n.mid, 'overlay', 0.16, 2);
    blend(g, n.fine, 'overlay', 0.14, 1);
    blend(g, n.streak, 'multiply', streak, 4);
    blend(this.H, n.fine, 'overlay', 0.25, 1);
  }
  /** Slab edge at the top of every floor, with a soft shadow beneath. */
  slabs(color = '#d8d3c9', t = 10) {
    for (let f = 0; f < 4; f++) {
      const y = f * CELL;
      this.A.fillStyle = color;
      this.A.fillRect(0, y, SIZE, t);
      const sh = this.A.createLinearGradient(0, y + t, 0, y + t + 16);
      sh.addColorStop(0, grey(0, 0.32));
      sh.addColorStop(1, grey(0, 0));
      this.A.fillStyle = sh;
      this.A.fillRect(0, y + t, SIZE, 16);
      this.H.fillStyle = grey(190);
      this.H.fillRect(0, y, SIZE, t);
    }
  }
  /** Dark stain running down from (x..x+w, y). */
  stain(x, y, w, len = 70, a = 0.2) {
    const g = this.A.createLinearGradient(0, y, 0, y + len);
    g.addColorStop(0, rgba(40, 44, 36, a));
    g.addColorStop(1, rgba(40, 44, 36, 0));
    this.A.fillStyle = g;
    this.A.fillRect(x, y, w, len);
  }
  glass(x, y, w, h, o = {}) {
    const { A, H, E, R, rnd } = this;
    H.fillStyle = grey(o.depth ?? 70);
    H.fillRect(x, y, w, h);
    const gr = A.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, o.top || '#6f8b9c');
    gr.addColorStop(1, o.bot || '#2f4350');
    A.fillStyle = gr;
    A.fillRect(x, y, w, h);
    R.fillStyle = grey(38);
    R.fillRect(x, y, w, h);
    const lit = o.lit ?? rnd() < 0.42;
    let curtain = null;
    if (o.curtain !== false && rnd() < 0.6) {
      curtain = CURTAIN[(rnd() * CURTAIN.length) | 0];
      const cw = w * (0.3 + rnd() * 0.7);
      const cx = rnd() < 0.5 ? x : x + w - cw;
      A.globalAlpha = 0.5;
      A.fillStyle = curtain;
      A.fillRect(cx, y, cw, h);
      A.globalAlpha = 1;
      // folds
      A.fillStyle = grey(0, 0.12);
      for (let fx = cx + 5; fx < cx + cw; fx += 9) A.fillRect(fx, y, 2, h);
    }
    if (lit) {
      const col = o.cool || rnd() < 0.22 ? COOL[(rnd() * COOL.length) | 0] : WARM[(rnd() * WARM.length) | 0];
      const eg = E.createLinearGradient(0, y, 0, y + h);
      eg.addColorStop(0, col);
      eg.addColorStop(1, shade(col, 0.55));
      E.fillStyle = eg;
      E.globalAlpha = 0.55 + rnd() * 0.45;
      E.fillRect(x, y, w, h);
      if (curtain) {
        E.globalCompositeOperation = 'multiply';
        E.fillStyle = curtain;
        E.globalAlpha = 0.5;
        E.fillRect(x, y, w, h);
        E.globalCompositeOperation = 'source-over';
      }
      E.globalAlpha = 1;
    }
    return lit;
  }
  frame(x, y, w, h, color = '#d9d6cf', t = 4, cols = 2, rows = 1) {
    const { A, E, H } = this;
    for (const g of [A, E]) {
      g.fillStyle = g === A ? color : '#000';
      g.fillRect(x, y, w, t);
      g.fillRect(x, y + h - t, w, t);
      g.fillRect(x, y, t, h);
      g.fillRect(x + w - t, y, t, h);
      for (let i = 1; i < cols; i++) g.fillRect(x + (w * i) / cols - t / 2, y, t, h);
      for (let i = 1; i < rows; i++) g.fillRect(x, y + (h * i) / rows - t / 2, w, t);
    }
    H.fillStyle = grey(120);
    H.fillRect(x, y, w, t);
    H.fillRect(x, y + h - t, w, t);
    H.fillRect(x, y, t, h);
    H.fillRect(x + w - t, y, t, h);
  }
  grill(x, y, w, h, step = 11, color = '#2c2c2c') {
    const { A, E } = this;
    A.fillStyle = color;
    E.fillStyle = grey(0, 0.6);
    for (let gy = y + step; gy < y + h; gy += step) {
      A.fillRect(x, gy, w, 1.6);
      E.fillRect(x, gy, w, 1.6);
    }
    for (let gx = x + 14; gx < x + w; gx += 28) A.fillRect(gx, y, 1.6, h);
  }
  /** Projecting sun shade above an opening. */
  chajja(x, y, w, color = '#efece5') {
    const { A, H } = this;
    A.fillStyle = color;
    A.fillRect(x - 10, y - 13, w + 20, 10);
    H.fillStyle = grey(215);
    H.fillRect(x - 10, y - 13, w + 20, 10);
    const sh = A.createLinearGradient(0, y - 3, 0, y + 26);
    sh.addColorStop(0, grey(0, 0.42));
    sh.addColorStop(1, grey(0, 0));
    A.fillStyle = sh;
    A.fillRect(x - 8, y - 3, w + 16, 29);
    this.stain(x - 10, y - 3, 6, 50, 0.16);
    this.stain(x + w + 4, y - 3, 6, 50, 0.16);
  }
  sill(x, y, w) {
    const { A, H } = this;
    A.fillStyle = '#e4e0d7';
    A.fillRect(x - 6, y, w + 12, 6);
    H.fillStyle = grey(175);
    H.fillRect(x - 6, y, w + 12, 6);
    this.stain(x, y + 6, w, 60 + this.rnd() * 40, 0.14);
  }
  ac(x, y) {
    const { A, H } = this;
    A.fillStyle = grey(0, 0.3);
    A.fillRect(x + 3, y + 36, 58, 7);
    A.fillStyle = '#e8e8e4';
    A.fillRect(x, y, 58, 37);
    A.fillStyle = '#b9bbb8';
    for (let i = 5; i < 33; i += 5) A.fillRect(x + 4, y + i, 36, 2);
    A.beginPath();
    A.fillStyle = '#9a9c99';
    A.arc(x + 48, y + 18, 7, 0, 6.3);
    A.fill();
    H.fillStyle = grey(225);
    H.fillRect(x, y, 58, 37);
    this.stain(x + 10, y + 38, 8, 90, 0.22);
  }
  clothes(x, y, w) {
    const { A, rnd } = this;
    A.strokeStyle = grey(60, 0.8);
    A.lineWidth = 1;
    A.beginPath();
    A.moveTo(x, y);
    A.quadraticCurveTo(x + w / 2, y + 5, x + w, y);
    A.stroke();
    let cx = x + 4;
    while (cx < x + w - 16) {
      const cw = 12 + rnd() * 20, ch = 22 + rnd() * 34;
      A.fillStyle = CLOTH[(rnd() * CLOTH.length) | 0];
      A.fillRect(cx, y + 3, cw, ch);
      A.fillStyle = grey(0, 0.12);
      A.fillRect(cx + cw * 0.6, y + 3, cw * 0.4, ch);
      cx += cw + 3 + rnd() * 8;
    }
  }
  pipe(x, color = '#6d6a66') {
    const { A, H } = this;
    A.fillStyle = grey(0, 0.2);
    A.fillRect(x + 5, 0, 3, SIZE);
    A.fillStyle = color;
    A.fillRect(x, 0, 5, SIZE);
    H.fillStyle = grey(190);
    H.fillRect(x, 0, 5, SIZE);
  }
  finish(normalStrength = 2.6) {
    return { map: this.a, normalMap: normalFromHeight(this.h, normalStrength), emissiveMap: this.e, roughnessMap: this.r };
  }
}

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  return rgba(((n >> 16) & 255) * k, ((n >> 8) & 255) * k, (n & 255) * k);
}

const each = (fn) => {
  for (let f = 0; f < 4; f++) for (let b = 0; b < 4; b++) fn(b * CELL, (3 - f) * CELL, b, f);
};

// ---- styles ----------------------------------------------------------------

/** Ordinary walk-up apartment block. */
function apt(seed) {
  const k = new Kit(seed);
  k.wall();
  k.slabs();
  each((cx, cy) => {
    const r = k.rnd();
    const ww = r < 0.25 ? 96 : 132, wh = 112;
    const wx = cx + (CELL - ww) / 2, wy = cy + 66;
    k.glass(wx, wy, ww, wh);
    k.frame(wx, wy, ww, wh, '#dedbd3', 4, ww > 100 ? 3 : 2);
    if (k.rnd() < 0.7) k.grill(wx + 4, wy + 4, ww - 8, wh - 8);
    k.chajja(wx, wy, ww);
    k.sill(wx, wy + wh, ww);
    if (k.rnd() < 0.3) k.ac(wx + ww - 60, wy + wh + 12);
    else if (k.rnd() < 0.3) k.clothes(wx - 8, wy + wh + 10, ww + 16);
  });
  k.pipe(6);
  k.pipe(CELL * 2 + 4, '#7a756c');
  return k.finish();
}

/** Apartment block with alternating balcony bays. */
function balcony(seed) {
  const k = new Kit(seed);
  k.wall();
  k.slabs('#d2cdc3', 12);
  each((cx, cy, b) => {
    if (b % 2 === 0) {
      // balcony recess
      const x = cx + 24, y = cy + 34, w = 208, h = 212;
      k.H.fillStyle = grey(40);
      k.H.fillRect(x, y, w, h);
      const gr = k.A.createLinearGradient(0, y, 0, y + h);
      gr.addColorStop(0, '#23262a');
      gr.addColorStop(1, '#474c50');
      k.A.fillStyle = gr;
      k.A.fillRect(x, y, w, h);
      // door and window inside
      const lit = k.glass(x + 22, y + 26, 74, 186, { depth: 30 });
      k.frame(x + 22, y + 26, 74, 186, '#cfc8ba', 4, 1, 2);
      k.glass(x + 114, y + 40, 74, 92, { depth: 30, lit: lit && k.rnd() < 0.7 });
      k.frame(x + 114, y + 40, 74, 92, '#cfc8ba', 3, 2);
      if (k.rnd() < 0.55) k.clothes(x + 8, y + 16, w - 16);
      // parapet / railing
      const py = y + h - 88;
      if ((seed + b) % 3 === 0) {
        k.A.fillStyle = '#e3dfd6';
        k.A.fillRect(x, py, w, 88);
        k.H.fillStyle = grey(128);
        k.H.fillRect(x, py, w, 88);
        k.stain(x, py + 4, w, 70, 0.14);
      } else {
        k.A.fillStyle = '#3b3d40';
        for (let gx = x + 3; gx < x + w; gx += 9) k.A.fillRect(gx, py, 2, 88);
        k.E.fillStyle = grey(0, 0.5);
        for (let gx = x + 3; gx < x + w; gx += 9) k.E.fillRect(gx, py, 2, 88);
      }
      k.A.fillStyle = '#c7c2b6';
      k.A.fillRect(x - 3, py - 5, w + 6, 6);
      k.H.fillStyle = grey(180);
      k.H.fillRect(x - 3, py - 5, w + 6, 6);
      if (k.rnd() < 0.4) {
        // potted plant on the ledge
        k.A.fillStyle = '#8a4b32';
        k.A.fillRect(x + 150, py - 20, 18, 16);
        k.A.fillStyle = '#4f8a3f';
        k.A.beginPath();
        k.A.arc(x + 159, py - 28, 15, 0, 6.3);
        k.A.fill();
      }
    } else {
      const ww = 118, wh = 110, wx = cx + (CELL - ww) / 2, wy = cy + 68;
      k.glass(wx, wy, ww, wh);
      k.frame(wx, wy, ww, wh, '#dedbd3', 4, 2);
      if (k.rnd() < 0.6) k.grill(wx + 4, wy + 4, ww - 8, wh - 8);
      k.chajja(wx, wy, ww);
      k.sill(wx, wy + wh, ww);
      if (k.rnd() < 0.35) k.ac(wx + ww - 60, wy + wh + 12);
    }
  });
  k.pipe(CELL + 2);
  return k.finish(3);
}

/** Old-town house: shuttered wooden windows, weathered lime plaster. */
function old(seed) {
  const k = new Kit(seed);
  k.wall('#e7e0d2', 0.5);
  const paints = ['#4f7566', '#6a5644', '#49698a', '#87412f', '#3f5f4a', '#5b6f84'];
  const paint = paints[seed % paints.length];
  for (let f = 0; f < 4; f++) {
    // timber beam and moulding at each floor line
    const y = f * CELL;
    k.A.fillStyle = '#5a4433';
    k.A.fillRect(0, y, SIZE, 12);
    k.A.fillStyle = '#d9d2c2';
    k.A.fillRect(0, y + 12, SIZE, 7);
    k.H.fillStyle = grey(200);
    k.H.fillRect(0, y, SIZE, 19);
    const sh = k.A.createLinearGradient(0, y + 19, 0, y + 40);
    sh.addColorStop(0, grey(0, 0.35));
    sh.addColorStop(1, grey(0, 0));
    k.A.fillStyle = sh;
    k.A.fillRect(0, y + 19, SIZE, 21);
  }
  each((cx, cy, b, f) => {
    if ((b + f * 3 + seed) % 5 === 4) return; // blank bay
    const ww = 92, wh = 138, wx = cx + (CELL - ww) / 2, wy = cy + 74;
    const open = k.rnd() < 0.45;
    // arched surround
    k.A.fillStyle = '#d2cab8';
    k.A.beginPath();
    k.A.moveTo(wx - 8, wy + wh + 6);
    k.A.lineTo(wx - 8, wy + 10);
    k.A.quadraticCurveTo(wx + ww / 2, wy - 34, wx + ww + 8, wy + 10);
    k.A.lineTo(wx + ww + 8, wy + wh + 6);
    k.A.fill();
    k.H.fillStyle = grey(165);
    k.H.fillRect(wx - 8, wy - 12, ww + 16, wh + 18);
    if (open) {
      k.glass(wx, wy, ww, wh, { top: '#1d2023', bot: '#33383b', curtain: k.rnd() < 0.5, depth: 30 });
      // shutters folded back
      k.A.fillStyle = paint;
      k.A.fillRect(wx - 6, wy, 16, wh);
      k.A.fillRect(wx + ww - 10, wy, 16, wh);
      k.grill(wx + 10, wy + 4, ww - 20, wh - 8, 15, '#1f1f1f');
    } else {
      k.A.fillStyle = paint;
      k.A.fillRect(wx, wy, ww, wh);
      k.H.fillStyle = grey(105);
      k.H.fillRect(wx, wy, ww, wh);
      k.A.fillStyle = grey(0, 0.28);
      for (let ly = wy + 6; ly < wy + wh - 4; ly += 7) k.A.fillRect(wx + 5, ly, ww - 10, 2);
      k.A.fillStyle = grey(0, 0.5);
      k.A.fillRect(wx + ww / 2 - 1, wy, 2, wh);
      k.E.fillStyle = '#000';
    }
    k.sill(wx - 4, wy + wh, ww + 8);
  });
  blend(k.A, N().streak, 'multiply', 0.22, 4);
  return k.finish(2.4);
}

/** Commercial block: ribbon windows and panel cladding. */
function office(seed) {
  const k = new Kit(seed);
  k.wall('#e2e0db', 0.2);
  for (let f = 0; f < 4; f++) {
    const y = f * CELL;
    // cladding joints
    k.A.fillStyle = grey(0, 0.18);
    k.H.fillStyle = grey(90);
    for (let x = 0; x < SIZE; x += 128) {
      k.A.fillRect(x, y, 2, CELL);
      k.H.fillRect(x, y, 2, CELL);
    }
    k.A.fillRect(0, y, SIZE, 2);
    k.H.fillRect(0, y, SIZE, 2);
    const wy = y + 62, wh = 128;
    const gr = k.A.createLinearGradient(0, wy, 0, wy + wh);
    gr.addColorStop(0, '#7c9bab');
    gr.addColorStop(1, '#2d4552');
    k.A.fillStyle = gr;
    k.A.fillRect(0, wy, SIZE, wh);
    k.H.fillStyle = grey(75);
    k.H.fillRect(0, wy, SIZE, wh);
    k.R.fillStyle = grey(30);
    k.R.fillRect(0, wy, SIZE, wh);
    for (let x = 0; x < SIZE; x += 64) {
      if (k.rnd() < 0.5) {
        k.E.fillStyle = COOL[(k.rnd() * 2) | 0];
        k.E.globalAlpha = 0.5 + k.rnd() * 0.5;
        k.E.fillRect(x, wy, 64, wh);
        k.E.globalAlpha = 1;
      }
      if (k.rnd() < 0.3) {
        k.A.fillStyle = rgba(230, 228, 220, 0.35); // blinds
        k.A.fillRect(x, wy, 64, wh * (0.3 + k.rnd() * 0.5));
      }
      k.A.fillStyle = '#3a3f44';
      k.A.fillRect(x, wy, 4, wh);
      k.E.fillStyle = '#000';
      k.E.fillRect(x, wy, 4, wh);
      k.H.fillStyle = grey(140);
      k.H.fillRect(x, wy, 4, wh);
    }
    const sh = k.A.createLinearGradient(0, wy, 0, wy + 18);
    sh.addColorStop(0, grey(0, 0.4));
    sh.addColorStop(1, grey(0, 0));
    k.A.fillStyle = sh;
    k.A.fillRect(0, wy, SIZE, 18);
    k.stain(0, wy + wh, SIZE, 40, 0.1);
  }
  return k.finish(2.2);
}

/** Curtain-wall glass. */
function glass(seed) {
  const k = new Kit(seed);
  const { A, H, E, R } = k;
  A.fillStyle = '#4f7f93';
  A.fillRect(0, 0, SIZE, SIZE);
  R.fillStyle = grey(26);
  R.fillRect(0, 0, SIZE, SIZE);
  for (let y = 0; y < SIZE; y += 128) {
    for (let x = 0; x < SIZE; x += 128) {
      const v = k.rnd();
      const gr = A.createLinearGradient(0, y, 0, y + 128);
      gr.addColorStop(0, rgba(110 + v * 40, 160 + v * 30, 180 + v * 25));
      gr.addColorStop(1, rgba(40 + v * 20, 78 + v * 20, 98 + v * 20));
      A.fillStyle = gr;
      A.fillRect(x, y, 128, 128);
      if (k.rnd() < 0.28) {
        E.fillStyle = COOL[0];
        E.globalAlpha = 0.25 + k.rnd() * 0.5;
        E.fillRect(x, y, 128, 128);
        E.globalAlpha = 1;
      }
    }
  }
  for (const g of [A, E]) {
    g.fillStyle = g === A ? '#27323a' : '#000';
    for (let x = 0; x < SIZE; x += 128) g.fillRect(x, 0, 5, SIZE);
    for (let y = 0; y < SIZE; y += 128) g.fillRect(0, y, SIZE, 5);
  }
  H.fillStyle = grey(200);
  for (let x = 0; x < SIZE; x += 128) H.fillRect(x, 0, 5, SIZE);
  for (let y = 0; y < SIZE; y += 128) H.fillRect(0, y, SIZE, 5);
  // spandrel band at each slab
  for (let f = 0; f < 4; f++) {
    A.fillStyle = rgba(20, 30, 36, 0.45);
    A.fillRect(0, f * CELL, SIZE, 30);
    E.fillStyle = '#000';
    E.fillRect(0, f * CELL, SIZE, 30);
  }
  blend(A, N().low, 'overlay', 0.25, 4);
  return k.finish(1.6);
}

/** Newer high-rise flats: wide windows, glass-railed balconies, painted bands. */
function tower(seed) {
  const k = new Kit(seed);
  k.wall('#ebe8e1', 0.18);
  k.slabs('#cfc9bd', 14);
  each((cx, cy, b) => {
    if (b % 2 === 1) {
      const x = cx + 16, y = cy + 30, w = 224, h = 216;
      k.H.fillStyle = grey(45);
      k.H.fillRect(x, y, w, h);
      k.A.fillStyle = '#2a2e32';
      k.A.fillRect(x, y, w, h);
      const lit = k.glass(x + 14, y + 20, 196, 196, { depth: 35, top: '#5d7786', bot: '#27373f' });
      k.frame(x + 14, y + 20, 196, 196, '#2f3438', 4, 3);
      void lit;
      // glass railing
      const py = y + h - 84;
      k.A.fillStyle = rgba(150, 190, 205, 0.42);
      k.A.fillRect(x, py, w, 84);
      k.R.fillStyle = grey(30);
      k.R.fillRect(x, py, w, 84);
      k.A.fillStyle = '#c9cdd0';
      k.A.fillRect(x - 2, py - 4, w + 4, 5);
      for (let gx = x; gx <= x + w; gx += 56) k.A.fillRect(gx - 1, py, 3, 84);
      k.H.fillStyle = grey(128);
      k.H.fillRect(x, py, w, 84);
      if (k.rnd() < 0.3) k.clothes(x + 20, y + 14, w - 40);
    } else {
      const ww = 168, wh = 130, wx = cx + (CELL - ww) / 2, wy = cy + 58;
      k.glass(wx, wy, ww, wh, { top: '#6a8696', bot: '#2a3b45' });
      k.frame(wx, wy, ww, wh, '#33383c', 4, 3);
      k.sill(wx, wy + wh, ww);
      if (k.rnd() < 0.4) k.ac(wx + ww - 60, wy + wh + 14);
      // painted accent panel under the window
      k.A.fillStyle = rgba(0, 0, 0, 0.1);
      k.A.fillRect(cx + 20, wy + wh + 6, CELL - 40, CELL - (wy - cy) - wh - 12);
    }
  });
  return k.finish(2.8);
}

/** Schools, hospitals, public offices: verandah arcades. */
function civic(seed) {
  const k = new Kit(seed);
  k.wall('#eee6d2', 0.3);
  for (let f = 0; f < 4; f++) {
    const y = f * CELL;
    k.A.fillStyle = '#8a4a3a'; // red-oxide band
    k.A.fillRect(0, y, SIZE, 16);
    k.A.fillStyle = '#f3ecdc';
    k.A.fillRect(0, y + 16, SIZE, 6);
    k.H.fillStyle = grey(205);
    k.H.fillRect(0, y, SIZE, 22);
  }
  each((cx, cy) => {
    const x = cx + 30, y = cy + 44, w = 196, h = 212;
    k.H.fillStyle = grey(35);
    const path = (g) => {
      g.beginPath();
      g.moveTo(x, y + h);
      g.lineTo(x, y + 40);
      g.quadraticCurveTo(x + w / 2, y - 18, x + w, y + 40);
      g.lineTo(x + w, y + h);
      g.closePath();
    };
    path(k.H);
    k.H.fill();
    const gr = k.A.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, '#1e2124');
    gr.addColorStop(1, '#4a4d4c');
    k.A.fillStyle = gr;
    path(k.A);
    k.A.fill();
    // rear wall door / window in the corridor
    k.A.fillStyle = k.rnd() < 0.5 ? '#6b5341' : '#566a78';
    k.A.fillRect(x + 60 + k.rnd() * 40, y + 70, 50, 142);
    if (k.rnd() < 0.5) {
      k.E.fillStyle = WARM[1];
      k.E.globalAlpha = 0.35;
      path(k.E);
      k.E.fill();
      k.E.globalAlpha = 1;
    }
    // parapet with jali
    const py = y + h - 72;
    k.A.fillStyle = '#e9e1cd';
    k.A.fillRect(x, py, w, 72);
    k.E.fillStyle = '#000';
    k.E.fillRect(x, py, w, 72);
    k.H.fillStyle = grey(128);
    k.H.fillRect(x, py, w, 72);
    k.A.fillStyle = grey(0, 0.35);
    for (let jx = x + 12; jx < x + w - 8; jx += 18) for (let jy = py + 14; jy < py + 60; jy += 18) k.A.fillRect(jx, jy, 9, 9);
    k.A.fillStyle = '#cfc6b1';
    k.A.fillRect(x - 4, py - 5, w + 8, 6);
    k.stain(x, py + 6, w, 60, 0.12);
  });
  return k.finish(3);
}

/** Sheds and godowns: corrugated sheet, a few louvres. */
function shed(seed) {
  const k = new Kit(seed);
  const { A, H } = k;
  A.fillStyle = '#d5d8da';
  A.fillRect(0, 0, SIZE, SIZE);
  for (let x = 0; x < SIZE; x += 16) {
    const gr = A.createLinearGradient(x, 0, x + 16, 0);
    gr.addColorStop(0, grey(150));
    gr.addColorStop(0.5, grey(236));
    gr.addColorStop(1, grey(150));
    A.fillStyle = gr;
    A.fillRect(x, 0, 16, SIZE);
    const hr = H.createLinearGradient(x, 0, x + 16, 0);
    hr.addColorStop(0, grey(60));
    hr.addColorStop(0.5, grey(200));
    hr.addColorStop(1, grey(60));
    H.fillStyle = hr;
    H.fillRect(x, 0, 16, SIZE);
  }
  each((cx, cy, b, f) => {
    if ((b + f) % 2) return;
    const x = cx + 60, y = cy + 40, w = 136, h = 60;
    A.fillStyle = '#30363a';
    A.fillRect(x, y, w, h);
    A.fillStyle = '#6f777c';
    for (let ly = y + 4; ly < y + h; ly += 9) A.fillRect(x + 3, ly, w - 6, 4);
    H.fillStyle = grey(80);
    H.fillRect(x, y, w, h);
  });
  blend(A, N().streak, 'multiply', 0.45, 4);
  blend(A, N().low, 'overlay', 0.35, 4);
  // rust blooms
  A.save();
  A.globalCompositeOperation = 'multiply';
  A.globalAlpha = 0.3;
  const p = A.createPattern(N().mid, 'repeat');
  p.setTransform(new DOMMatrix().scale(4, 4));
  A.fillStyle = p;
  A.fillRect(0, 0, SIZE, SIZE);
  A.restore();
  return k.finish(2.6);
}

export const FACADES = { apt, balcony, old, office, glass, tower, civic, shed };

// ---- shopfront atlas -------------------------------------------------------

export const SHOP_GRID = 4; // 4 x 4 shopfronts in one atlas
const SC = 512;
const FONT = '"Baloo 2","Mukta","Noto Sans Devanagari",sans-serif';

const SHOPS = [
  { mr: 'श्री गणेश किराणा', en: 'GENERAL STORES', board: '#c62828', ink: '#fff7d6', mode: 'open', goods: 'packets' },
  { mr: 'साई मेडिकल', en: 'CHEMIST & DRUGGIST', board: '#f4f4f0', ink: '#0d7a3a', mode: 'glass', goods: 'boxes', lit: 1 },
  { mr: 'पनवेल स्वीट्स', en: 'SWEETS & FARSAN', board: '#f2b705', ink: '#7a1010', mode: 'glass', goods: 'trays', lit: 1 },
  { mr: '', en: '', board: '#7b8087', ink: '#fff', mode: 'shutter', paint: '#8e949a' },
  { mr: 'न्यू फॅशन टेलर्स', en: 'LADIES & GENTS', board: '#283593', ink: '#ffe082', mode: 'open', goods: 'cloth' },
  { mr: 'मोबाईल रिपेअरिंग', en: 'RECHARGE · COVER · GLASS', board: '#111', ink: '#ffd400', mode: 'glass', goods: 'boxes', lit: 1 },
  { mr: 'झेरॉक्स व स्टेशनरी', en: 'XEROX · PRINT · LAMINATION', board: '#00695c', ink: '#ffffff', mode: 'open', goods: 'boxes' },
  { mr: 'अमृततुल्य चहा', en: 'CHAHA · NASHTA', board: '#6d2b12', ink: '#ffd9a3', mode: 'open', goods: 'tea' },
  { mr: 'वडापाव सेंटर', en: 'GARAM VADA PAV', board: '#e65100', ink: '#fffde7', mode: 'open', goods: 'tea' },
  { mr: 'दूध डेअरी', en: 'MILK · DAHI · PANEER', board: '#e3f2fd', ink: '#0d47a1', mode: 'glass', goods: 'trays', lit: 1 },
  { mr: 'लक्ष्मी ज्वेलर्स', en: 'GOLD & SILVER', board: '#3e0d0d', ink: '#f5c542', mode: 'glass', goods: 'gold', lit: 1 },
  { mr: 'स्टाईल हेअर सलून', en: 'GENTS PARLOUR', board: '#263238', ink: '#80deea', mode: 'glass', goods: 'salon', lit: 1 },
  { mr: 'कोकण हार्डवेअर', en: 'PAINTS · PIPES · TOOLS', board: '#1b5e20', ink: '#fff59d', mode: 'open', goods: 'hardware' },
  { mr: '', en: '', board: '#3a5a8c', ink: '#fff', mode: 'shutter', paint: '#4a6fa5' },
  { mr: 'यश क्लासेस', en: '8th to 12th · SCI · COM', board: '#fdd835', ink: '#1a237e', mode: 'shutter', paint: '#b9b3a7' },
  { mr: 'फळे व भाजीपाला', en: 'FRESH FRUITS', board: '#2e7d32', ink: '#ffffff', mode: 'open', goods: 'fruit' },
];

function drawShop(A, H, E, s, ox, oy, rnd) {
  const W = SC, HH = SC;
  // surround
  A.fillStyle = '#d8d2c6';
  A.fillRect(ox, oy, W, HH);
  H.fillStyle = grey(128);
  H.fillRect(ox, oy, W, HH);
  // opening
  const x = ox + 22, y = oy + 132, w = W - 44, h = HH - 132 - 34;
  const interior = A.createLinearGradient(0, y, 0, y + h);
  interior.addColorStop(0, '#191b1d');
  interior.addColorStop(1, '#3a3632');
  A.fillStyle = interior;
  A.fillRect(x, y, w, h);
  H.fillStyle = grey(40);
  H.fillRect(x, y, w, h);

  const item = (ix, iy, iw, ih, col) => {
    A.fillStyle = col;
    A.fillRect(ix, iy, iw, ih);
  };
  const PACK = ['#e53935', '#fdd835', '#43a047', '#1e88e5', '#fb8c00', '#8e24aa', '#f4f4f4', '#00acc1', '#d81b60'];
  if (s.mode !== 'shutter') {
    // back shelves
    for (let row = 0; row < 4; row++) {
      const sy = y + 18 + row * 62;
      item(x + 10, sy + 44, w - 20, 5, '#6b5a48');
      let ix = x + 14;
      while (ix < x + w - 24) {
        const iw = s.goods === 'cloth' ? 26 + rnd() * 20 : 10 + rnd() * 16;
        const ih = s.goods === 'trays' ? 14 : 22 + rnd() * 20;
        let col = PACK[(rnd() * PACK.length) | 0];
        if (s.goods === 'gold') col = rnd() < 0.7 ? '#e7b93c' : '#fff3c4';
        if (s.goods === 'hardware') col = ['#6d7a82', '#b0bec5', '#f9a825', '#c62828', '#37474f'][(rnd() * 5) | 0];
        if (s.goods === 'fruit') col = ['#f9a825', '#ef5350', '#7cb342', '#ff7043', '#ffee58'][(rnd() * 5) | 0];
        if (s.goods === 'salon') col = ['#eceff1', '#90a4ae', '#26c6da'][(rnd() * 3) | 0];
        item(ix, sy + 44 - ih, iw, ih, col);
        ix += iw + 3;
      }
    }
    // hanging strings of packets
    if (s.goods === 'packets' || s.goods === 'tea') {
      for (let k = 0; k < 6; k++) {
        const hx = x + 30 + k * ((w - 60) / 5);
        for (let j = 0; j < 5; j++) item(hx - 9, y + 4 + j * 20, 18, 17, PACK[(rnd() * PACK.length) | 0]);
      }
    }
    // counter
    const cy = y + h - 96;
    item(x + 8, cy, w - 16, 96, s.mode === 'glass' ? '#cfd8dc' : '#7a5a3c');
    item(x + 8, cy, w - 16, 8, s.mode === 'glass' ? '#eceff1' : '#9b7650');
    H.fillStyle = grey(120);
    H.fillRect(x + 8, cy, w - 16, 96);
    if (s.goods === 'tea') {
      item(x + 60, cy - 34, 44, 34, '#b0b4b8'); // kettle
      item(x + 130, cy - 20, 70, 20, '#d7c08a'); // tray of glasses
      item(x + 250, cy - 28, 90, 28, '#c98b2c'); // vada tray
    }
    if (s.goods === 'fruit') for (let k = 0; k < 16; k++) {
      A.fillStyle = ['#f9a825', '#ef5350', '#7cb342', '#ff7043'][(rnd() * 4) | 0];
      A.beginPath();
      A.arc(x + 30 + k * 27, cy - 10 + (k % 2) * 6, 13, 0, 6.3);
      A.fill();
    }
    // lit interior: the goods themselves glow under the shop lights
    E.save();
    E.globalAlpha = s.lit ? 1 : 0.8;
    E.drawImage(A.canvas, x, y, w, h, x, y, w, h);
    E.globalCompositeOperation = 'lighter';
    E.globalAlpha = s.lit ? 0.3 : 0.16;
    E.fillStyle = s.lit ? '#fff4d6' : '#ffca85';
    E.fillRect(x, y, w, h);
    E.restore();
    // tube light
    item(x + 40, y + 6, w - 80, 5, '#f7fbff');
    E.fillStyle = '#ffffff';
    E.fillRect(x + 40, y + 6, w - 80, 5);
    if (s.mode === 'glass') {
      // glazing with a door
      A.fillStyle = rgba(170, 205, 220, 0.2);
      A.fillRect(x, y, w, h);
      A.fillStyle = '#b8bcc0';
      for (const fx of [x, x + w * 0.36, x + w * 0.64, x + w - 5]) A.fillRect(fx, y, 5, h);
      A.fillRect(x, y, w, 5);
      E.fillStyle = '#000';
      for (const fx of [x, x + w * 0.36, x + w * 0.64, x + w - 5]) E.fillRect(fx, y, 5, h);
    }
  } else {
    // rolling shutter
    A.fillStyle = s.paint;
    A.fillRect(x, y, w, h);
    for (let ly = y; ly < y + h; ly += 12) {
      A.fillStyle = grey(255, 0.16);
      A.fillRect(x, ly, w, 4);
      A.fillStyle = grey(0, 0.22);
      A.fillRect(x, ly + 9, w, 3);
      H.fillStyle = grey(150);
      H.fillRect(x, ly, w, 6);
      H.fillStyle = grey(90);
      H.fillRect(x, ly + 6, w, 6);
    }
    A.fillStyle = grey(0, 0.3);
    A.fillRect(x + w / 2 - 18, y + h - 26, 36, 10);
    if (s.mr) {
      A.fillStyle = rgba(20, 30, 90, 0.75);
      A.font = `700 40px ${FONT}`;
      A.textAlign = 'center';
      A.fillText('प्रवेश सुरू', x + w / 2, y + h * 0.42);
      A.font = `700 26px ${FONT}`;
      A.fillText('ADMISSIONS OPEN', x + w / 2, y + h * 0.56);
    }
    blend2(A, x, y, w, h);
  }
  // step
  item(ox, oy + HH - 34, W, 34, '#8f8a80');
  item(ox, oy + HH - 34, W, 4, '#b5b0a6');
  H.fillStyle = grey(170);
  H.fillRect(ox, oy + HH - 34, W, 34);
  // shutter housing
  item(ox + 14, oy + 116, W - 28, 18, '#6c7075');
  H.fillStyle = grey(190);
  H.fillRect(ox + 14, oy + 116, W - 28, 18);
  // signboard
  const bx = ox + 10, by = oy + 10, bw = W - 20, bh = 104;
  if (s.mode === 'shutter' && !s.mr) {
    item(bx, by, bw, bh, '#cfc8ba');
  } else {
    A.fillStyle = s.board;
    A.fillRect(bx, by, bw, bh);
    A.strokeStyle = s.ink;
    A.lineWidth = 3;
    A.strokeRect(bx + 6, by + 6, bw - 12, bh - 12);
    A.fillStyle = s.ink;
    A.textAlign = 'center';
    A.textBaseline = 'alphabetic';
    let fs = 54;
    A.font = `800 ${fs}px ${FONT}`;
    while (A.measureText(s.mr).width > bw - 40 && fs > 24) A.font = `800 ${--fs}px ${FONT}`;
    A.fillText(s.mr, bx + bw / 2, by + 60);
    A.font = `700 19px ${FONT}`;
    A.fillText(s.en, bx + bw / 2, by + 88);
    H.fillStyle = grey(215);
    H.fillRect(bx, by, bw, bh);
    // boards catch the light at night
    E.save();
    E.globalAlpha = s.lit ? 0.9 : 0.4;
    E.drawImage(A.canvas, bx, by, bw, bh, bx, by, bw, bh);
    E.restore();
  }
  // grime at the base
  const gr = A.createLinearGradient(0, oy + HH - 90, 0, oy + HH);
  gr.addColorStop(0, grey(0, 0));
  gr.addColorStop(1, grey(0, 0.3));
  A.fillStyle = gr;
  A.fillRect(ox, oy + HH - 90, W, 90);
}
function blend2(A, x, y, w, h) {
  A.save();
  A.beginPath();
  A.rect(x, y, w, h);
  A.clip();
  blend(A, N().streak, 'multiply', 0.3, 2);
  A.restore();
}

export function shopAtlas() {
  const size = SC * SHOP_GRID;
  const [a, A] = cv(size);
  const [hc, H] = cv(size);
  const [e, E] = cv(size);
  E.fillStyle = '#000';
  E.fillRect(0, 0, size, size);
  const rnd = mulberry32(4242);
  SHOPS.forEach((s, i) => drawShop(A, H, E, s, (i % SHOP_GRID) * SC, Math.floor(i / SHOP_GRID) * SC, rnd));
  blend(A, N().fine, 'overlay', 0.12, 2);
  // Half-size normal and emissive maps are plenty.
  const half = (src) => {
    const [c, g] = cv(size / 2);
    g.drawImage(src, 0, 0, size / 2, size / 2);
    return c;
  };
  return { map: a, normalMap: normalFromHeight(half(hc), 2.2), emissiveMap: half(e) };
}
export const SHOP_COUNT = SHOPS.length;
