// Procedural ground, wall and roof surfaces. Each returns
// { map, normalMap, [roughnessMap] } as canvases, sized in px.

import { cv, N, blend, normalFromHeight, rgba, grey, mulberry32 } from './texkit.js';

const S = 512;

function base(color, size = S) {
  const [c, g] = cv(size);
  g.fillStyle = color;
  g.fillRect(0, 0, size, size);
  return [c, g];
}

/** Draw something that must wrap at the texture edges: fn is called for the 9 neighbours as needed. */
function wrapDraw(g, size, x, y, r, fn) {
  for (let ox = -1; ox <= 1; ox++)
    for (let oy = -1; oy <= 1; oy++) {
      const px = x + ox * size, py = y + oy * size;
      if (px + r < 0 || px - r > size || py + r < 0 || py - r > size) continue;
      fn(px, py);
    }
}

export function asphalt() {
  const n = N();
  const rnd = mulberry32(101);
  const [c, g] = base('#918e88');
  blend(g, n.low, 'overlay', 0.16, 2);
  blend(g, n.mid, 'overlay', 0.14, 1);
  blend(g, n.fine, 'overlay', 0.45, 1);
  // light aggregate
  for (let i = 0; i < 1400; i++) {
    g.fillStyle = grey(150 + rnd() * 70, 0.35);
    g.fillRect(rnd() * S, rnd() * S, 1 + rnd(), 1 + rnd());
  }
  // cracks
  g.lineWidth = 1.2;
  for (let i = 0; i < 5; i++) {
    let x = rnd() * S, y = rnd() * S, a = rnd() * 6.28;
    g.strokeStyle = grey(18, 0.4);
    g.beginPath();
    g.moveTo(x, y);
    for (let k = 0; k < 22; k++) {
      a += (rnd() - 0.5) * 1.1;
      x += Math.cos(a) * 7;
      y += Math.sin(a) * 7;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  const [hc, hg] = base('#808080');
  blend(hg, n.fine, 'overlay', 0.9, 1);
  blend(hg, n.hi, 'overlay', 0.5, 1);
  // Puddle map: where rain collects. Stored in the roughness texture.
  const [rc, rg] = base('#e8e8e8');
  blend(rg, n.low, 'multiply', 0.55, 2);
  blend(rg, n.mid, 'overlay', 0.3, 1);
  return { map: c, normalMap: normalFromHeight(hc, 1.3), roughnessMap: rc };
}

export function pavers() {
  const rnd = mulberry32(202);
  const n = N();
  const [c, g] = base('#8f8a82');
  const [hc, hg] = base('#404040');
  const bw = 32, bh = 16; // 512 px = 3.2 m  → 20 x 10 cm blocks
  for (let row = 0; row < S / bh; row++) {
    for (let col = -1; col < S / bw + 1; col++) {
      const x = col * bw + (row % 2 ? bw / 2 : 0), y = row * bh;
      const zone = ((col + (row >> 1)) & 7) < 2; // occasional red band, as on real footpaths
      const v = rnd();
      g.fillStyle = zone ? rgba(150 + v * 30, 82 + v * 20, 70 + v * 16) : grey(128 + v * 46);
      g.fillRect(x + 1, y + 1, bw - 2, bh - 2);
      hg.fillStyle = grey(150 + v * 60);
      hg.fillRect(x + 1.5, y + 1.5, bw - 3, bh - 3);
      if (x + bw > S) {
        g.fillRect(x - S + 1, y + 1, bw - 2, bh - 2);
        hg.fillRect(x - S + 1.5, y + 1.5, bw - 3, bh - 3);
      }
    }
  }
  blend(g, n.low, 'overlay', 0.45, 2);
  blend(g, n.fine, 'overlay', 0.4, 1);
  blend(g, n.mid, 'multiply', 0.25, 1);
  return { map: c, normalMap: normalFromHeight(hc, 2.2) };
}

export function concrete() {
  const n = N();
  const rnd = mulberry32(303);
  const [c, g] = base('#a9a59c');
  blend(g, n.low, 'overlay', 0.55, 2);
  blend(g, n.mid, 'overlay', 0.3, 1);
  blend(g, n.fine, 'overlay', 0.35, 1);
  blend(g, n.streak, 'multiply', 0.12, 2);
  const [hc, hg] = base('#808080');
  blend(hg, n.fine, 'overlay', 0.6, 1);
  // expansion joints every 2.56 m (texture spans 5.12 m)
  for (const gg of [g, hg]) {
    gg.fillStyle = gg === g ? grey(60, 0.5) : grey(30);
    gg.fillRect(0, 0, S, 2);
    gg.fillRect(0, S / 2, S, 2);
    gg.fillRect(0, 0, 2, S);
    gg.fillRect(S / 2, 0, 2, S);
  }
  for (let i = 0; i < 300; i++) {
    g.fillStyle = grey(70, 0.25);
    g.fillRect(rnd() * S, rnd() * S, 1.5, 1.5);
  }
  return { map: c, normalMap: normalFromHeight(hc, 1.2) };
}

/** Bare, dusty town ground between buildings: packed earth and grit, deliberately quiet. */
export function earth() {
  const n = N();
  const rnd = mulberry32(404);
  const [c, g] = base('#9d9179');
  blend(g, n.low, 'overlay', 0.12, 2);
  blend(g, n.mid, 'overlay', 0.12, 1);
  blend(g, n.fine, 'overlay', 0.28, 1);
  for (let i = 0; i < 260; i++) {
    const v = rnd();
    g.fillStyle = rgba(120 + v * 50, 112 + v * 46, 98 + v * 40, 0.45);
    g.beginPath();
    g.arc(rnd() * S, rnd() * S, 0.6 + rnd() * 1.5, 0, 6.3);
    g.fill();
  }
  const [hc, hg] = base('#808080');
  blend(hg, n.mid, 'overlay', 0.6, 1);
  blend(hg, n.fine, 'overlay', 0.7, 1);
  return { map: c, normalMap: normalFromHeight(hc, 1.2) };
}

/** Turn a greyscale canvas into an alpha mask: opaque where value > t. */
function thresholdMask(src, t, soft) {
  const w = src.width, h = src.height;
  const s = src.getContext('2d').getImageData(0, 0, w, h);
  const [c, g] = cv(w, h);
  const o = g.createImageData(w, h);
  for (let i = 0; i < s.data.length; i += 4) {
    const a = Math.max(0, Math.min(1, (s.data[i] - t) / soft));
    o.data[i] = o.data[i + 1] = o.data[i + 2] = 255;
    o.data[i + 3] = a * 255;
  }
  g.putImageData(o, 0, 0);
  return c;
}

export function grass() {
  const n = N();
  const rnd = mulberry32(505);
  const [c, g] = base('#6c8448');
  blend(g, n.low, 'overlay', 0.6, 2);
  blend(g, n.mid, 'overlay', 0.5, 1);
  for (let i = 0; i < 9000; i++) {
    const v = rnd();
    g.strokeStyle = rgba(86 + v * 70, 112 + v * 60, 50 + v * 46, 0.5);
    const x = rnd() * S, y = rnd() * S;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (rnd() - 0.5) * 3, y - 2 - rnd() * 3);
    g.stroke();
  }
  blend(g, n.fine, 'overlay', 0.3, 1);
  const [hc, hg] = base('#808080');
  blend(hg, n.hi, 'overlay', 0.9, 1);
  blend(hg, n.fine, 'overlay', 0.8, 1);
  return { map: c, normalMap: normalFromHeight(hc, 1.8) };
}

/** Neutral plaster; tinted per building by vertex colour. */
export function plaster() {
  const n = N();
  const [c, g] = base('#e6e2da');
  blend(g, n.low, 'overlay', 0.3, 2);
  blend(g, n.mid, 'overlay', 0.18, 1);
  blend(g, n.fine, 'overlay', 0.18, 1);
  blend(g, n.streak, 'multiply', 0.3, 2);
  const [hc, hg] = base('#808080');
  blend(hg, n.fine, 'overlay', 0.5, 1);
  blend(hg, n.mid, 'overlay', 0.3, 1);
  return { map: c, normalMap: normalFromHeight(hc, 0.9) };
}

/** Flat concrete terrace roof with waterproofing patches. */
export function terrace() {
  const n = N();
  const rnd = mulberry32(606);
  const [c, g] = base('#9d9a94');
  blend(g, n.low, 'overlay', 0.6, 2);
  blend(g, n.mid, 'overlay', 0.4, 1);
  blend(g, n.fine, 'overlay', 0.35, 1);
  for (let i = 0; i < 6; i++) {
    const x = rnd() * S, y = rnd() * S, w = 60 + rnd() * 160, h = 50 + rnd() * 120;
    wrapDraw(g, S, x, y, 220, (px, py) => {
      g.fillStyle = rnd() < 0.5 ? rgba(40, 42, 46, 0.3) : rgba(120, 70, 55, 0.22);
      g.fillRect(px, py, w, h);
    });
  }
  blend(g, n.streak, 'multiply', 0.15, 1);
  const [hc, hg] = base('#808080');
  blend(hg, n.fine, 'overlay', 0.6, 1);
  return { map: c, normalMap: normalFromHeight(hc, 1) };
}

/** Mangalore clay tiles. 512 px = 2.56 m. */
export function clayTiles() {
  const n = N();
  const rnd = mulberry32(707);
  const [c, g] = base('#8e4a34');
  const [hc, hg] = base('#404040');
  const tw = 32, th = 48;
  for (let row = 0; row < S / th + 1; row++) {
    for (let col = 0; col < S / tw; col++) {
      const x = col * tw, y = S - row * th;
      const v = rnd();
      const grad = g.createLinearGradient(x, 0, x + tw, 0);
      const r = 150 + v * 45, gr = 72 + v * 26, b = 50 + v * 18;
      grad.addColorStop(0, rgba(r * 0.62, gr * 0.62, b * 0.62));
      grad.addColorStop(0.5, rgba(r, gr, b));
      grad.addColorStop(1, rgba(r * 0.7, gr * 0.7, b * 0.7));
      g.fillStyle = grad;
      g.fillRect(x, y - th, tw, th);
      g.fillStyle = rgba(30, 14, 10, 0.5);
      g.fillRect(x, y - 3, tw, 3);
      const hgr = hg.createLinearGradient(x, 0, x + tw, 0);
      hgr.addColorStop(0, grey(40));
      hgr.addColorStop(0.5, grey(220));
      hgr.addColorStop(1, grey(60));
      hg.fillStyle = hgr;
      hg.fillRect(x, y - th, tw, th);
      hg.fillStyle = grey(10);
      hg.fillRect(x, y - 3, tw, 3);
    }
  }
  blend(g, n.low, 'overlay', 0.5, 2);
  blend(g, n.mid, 'multiply', 0.3, 1);
  blend(g, n.fine, 'overlay', 0.25, 1);
  // moss and age
  blend(g, n.streak, 'multiply', 0.25, 2);
  return { map: c, normalMap: normalFromHeight(hc, 2.4) };
}

/** Corrugated sheet. Tinted by vertex colour. 512 px = 2.56 m. */
export function tinSheet() {
  const n = N();
  const [c, g] = base('#c9cdd1');
  const [hc, hg] = base('#808080');
  for (let x = 0; x < S; x += 16) {
    const gr = g.createLinearGradient(x, 0, x + 16, 0);
    gr.addColorStop(0, grey(150));
    gr.addColorStop(0.5, grey(232));
    gr.addColorStop(1, grey(150));
    g.fillStyle = gr;
    g.fillRect(x, 0, 16, S);
    const hr = hg.createLinearGradient(x, 0, x + 16, 0);
    hr.addColorStop(0, grey(40));
    hr.addColorStop(0.5, grey(220));
    hr.addColorStop(1, grey(40));
    hg.fillStyle = hr;
    hg.fillRect(x, 0, 16, S);
  }
  g.fillStyle = grey(60, 0.5);
  g.fillRect(0, 0, S, 3);
  g.fillRect(0, S / 2, S, 3);
  blend(g, n.low, 'overlay', 0.4, 2);
  blend(g, n.streak, 'multiply', 0.4, 1);
  // rust
  g.save();
  g.globalCompositeOperation = 'multiply';
  g.globalAlpha = 0.35;
  const p = g.createPattern(thresholdMask(n.mid, 165, 30), 'repeat');
  g.fillStyle = '#9a5a30';
  g.fillRect(0, 0, S, S);
  g.globalCompositeOperation = 'destination-over';
  g.restore();
  void p;
  return { map: c, normalMap: normalFromHeight(hc, 2.6) };
}

/** Track bed: ballast with concrete sleepers. U across the track (3.2 m), V along it (2.4 m = 4 sleepers). */
export function ballast() {
  const n = N();
  const rnd = mulberry32(808);
  const [c, g] = base('#6f6a63');
  blend(g, n.mid, 'overlay', 0.6, 1);
  for (let i = 0; i < 5000; i++) {
    const v = rnd();
    g.fillStyle = rgba(70 + v * 90, 66 + v * 84, 60 + v * 78, 0.9);
    const x = rnd() * S, y = rnd() * S, r = 1.5 + rnd() * 3;
    g.beginPath();
    g.ellipse(x, y, r, r * (0.6 + rnd() * 0.4), rnd() * 3, 0, 6.3);
    g.fill();
  }
  const [hc, hg] = base('#606060');
  blend(hg, n.hi, 'overlay', 0.9, 1);
  blend(hg, n.fine, 'overlay', 0.9, 1);
  // sleepers
  const sl = S / 4;
  for (let i = 0; i < 4; i++) {
    const y = i * sl + sl * 0.3;
    g.fillStyle = '#b3afa6';
    g.fillRect(S * 0.11, y, S * 0.78, sl * 0.36);
    g.fillStyle = grey(0, 0.25);
    g.fillRect(S * 0.11, y + sl * 0.36, S * 0.78, 4);
    hg.fillStyle = grey(200);
    hg.fillRect(S * 0.11, y, S * 0.78, sl * 0.36);
  }
  blend(g, n.fine, 'overlay', 0.35, 1);
  blend(g, n.low, 'multiply', 0.25, 2);
  // rust stain under each rail
  g.fillStyle = rgba(120, 70, 40, 0.3);
  g.fillRect(S * 0.23, 0, S * 0.07, S);
  g.fillRect(S * 0.7, 0, S * 0.07, S);
  return { map: c, normalMap: normalFromHeight(hc, 2) };
}

/** Basalt block masonry: plinths, ghats, old walls. 512 px = 2.56 m. */
export function stone() {
  const n = N();
  const rnd = mulberry32(909);
  const [c, g] = base('#4a4743');
  const [hc, hg] = base('#303030');
  const rows = 8, rh = S / rows;
  for (let r = 0; r < rows; r++) {
    let x = r % 2 ? -40 : 0;
    while (x < S) {
      const w = 60 + rnd() * 70;
      const v = rnd();
      g.fillStyle = rgba(96 + v * 40, 92 + v * 38, 88 + v * 36);
      g.fillRect(x + 2, r * rh + 2, w - 4, rh - 4);
      hg.fillStyle = grey(140 + v * 80);
      hg.fillRect(x + 3, r * rh + 3, w - 6, rh - 6);
      if (x + w > S) {
        g.fillRect(x - S + 2, r * rh + 2, w - 4, rh - 4);
        hg.fillRect(x - S + 3, r * rh + 3, w - 6, rh - 6);
      }
      x += w;
    }
  }
  blend(g, n.mid, 'overlay', 0.5, 1);
  blend(g, n.fine, 'overlay', 0.4, 1);
  blend(g, n.streak, 'multiply', 0.2, 2);
  blend(hg, n.fine, 'overlay', 0.4, 1);
  return { map: c, normalMap: normalFromHeight(hc, 2.4) };
}

/** Painted wood planks; tinted by vertex colour. */
export function wood() {
  const n = N();
  const rnd = mulberry32(1010);
  const [c, g] = base('#b9a58c');
  const [hc, hg] = base('#909090');
  for (let x = 0; x < S; x += 64) {
    const v = rnd();
    g.fillStyle = grey(0, v * 0.18);
    g.fillRect(x, 0, 64, S);
    g.fillStyle = grey(0, 0.5);
    g.fillRect(x, 0, 2, S);
    hg.fillStyle = grey(30);
    hg.fillRect(x, 0, 3, S);
  }
  blend(g, n.streak, 'multiply', 0.5, 1);
  blend(g, n.fine, 'overlay', 0.25, 1);
  blend(hg, n.streak, 'overlay', 0.5, 1);
  return { map: c, normalMap: normalFromHeight(hc, 1.4) };
}

/** Leaf canopy: clustered foliage with dark gaps. Tinted by vertex colour. */
export function leaves() {
  const n = N();
  const rnd = mulberry32(1111);
  const [c, g] = base('#5f7350');
  for (let i = 0; i < 5200; i++) {
    const v = rnd();
    g.fillStyle = rgba(92 + v * 78, 122 + v * 72, 62 + v * 52, 0.8);
    const x = rnd() * S, y = rnd() * S, r = 2 + rnd() * 4.5;
    g.beginPath();
    g.ellipse(x, y, r, r * 0.5, rnd() * 3.14, 0, 6.3);
    g.fill();
  }
  blend(g, n.mid, 'multiply', 0.6, 1);
  blend(g, n.hi, 'multiply', 0.35, 1);
  blend(g, n.low, 'overlay', 0.35, 2);
  const [hc, hg] = base('#808080');
  blend(hg, n.hi, 'overlay', 1, 1);
  blend(hg, n.mid, 'overlay', 1, 1);
  return { map: c, normalMap: normalFromHeight(hc, 3) };
}

export function bark() {
  const n = N();
  const [c, g] = base('#6b5a48');
  blend(g, n.streak, 'multiply', 0.7, 1);
  blend(g, n.mid, 'overlay', 0.4, 1);
  blend(g, n.fine, 'overlay', 0.3, 1);
  const [hc, hg] = base('#808080');
  blend(hg, n.streak, 'overlay', 1, 1);
  return { map: c, normalMap: normalFromHeight(hc, 2) };
}

/** Tileable ripple normals for lakes and the river. */
export function waterNormals() {
  const [hc, hg] = base('#808080');
  const n = N();
  blend(hg, n.mid, 'overlay', 1, 1);
  blend(hg, n.hi, 'overlay', 0.6, 1);
  blend(hg, n.low, 'overlay', 0.5, 2);
  return normalFromHeight(hc, 2.2);
}
