// Turns a real building footprint into a textured building: facade bays and
// floors, ground-floor shops on street-facing walls, parapets, tiled or
// terrace roofs, and rooftop clutter.

import { polyArea, centroid, bbox, pointInPoly, segDist } from './geom.js';
import { SHOP_GRID, SHOP_COUNT } from '../gfx/facades.js';
import { mulberry32 } from '../util.js';

const FH = 3.1; // floor height
const SHOP_H = 3.4;
const BAY = 3.0;

const PAINTS = [
  '#f6eedd', '#f1e4c6', '#f3d2b4', '#ecc3ba', '#d4e6c8', '#c9e0ee', '#ededea', '#e0d0b6', '#eab594',
  '#c9d8dc', '#f5db85', '#bcdcc8', '#e6c6dc', '#f0e6d6', '#f2c99a', '#e9a98f', '#bfd3e8', '#f7e6a8', '#d9c7a3',
];
const GLASS_TINTS = ['#eaf4f6', '#d8ecf0', '#f0f0ea', '#cfe2e6'];
const ROOF_TINTS = ['#ffffff', '#e9e4dc', '#d6d0c6', '#f3ece0'];
const TILE_TINTS = ['#ffffff', '#e8d6cc', '#d9c2b4', '#f4e2d0'];

function styleFor(b, area, rnd) {
  switch (b.k) {
    case 'o': return 'f_old';
    case 'm': return b.l >= 4 && rnd() < 0.45 ? 'f_glass' : 'f_office';
    case 'v':
    case 's': return 'f_civic';
    case 'i': return 'f_shed';
    default:
      if (b.l >= 9) return rnd() < 0.75 ? 'f_tower' : 'f_balcony';
      if (b.l >= 5) return rnd() < 0.45 ? 'f_balcony' : rnd() < 0.55 ? 'f_tower' : 'f_apt';
      if (b.l <= 2 && area < 70) return rnd() < 0.4 ? 'f_old' : 'f_apt';
      return rnd() < 0.55 ? 'f_apt' : 'f_balcony';
  }
}

export function buildBuilding(m, b, p, ctx) {
  const rnd = mulberry32(b.s * 7919 + p.length * 31 + 5);
  const area = polyArea(p);
  const [cx, cz] = centroid(p);
  m.chunk(cx, cz);
  const n = p.length;
  const detail = ctx.detailAt(cx, cz);

  // Open-sided canopies (station and bus-stand roofs).
  if (b.k === 'c') {
    const H = 5.2;
    for (const q of p) m.box(q[0], 0, q[1], 0.3, H, 0.3, '#7c8288', 'metal');
    m.poly(p, H, '#c7ccd1', 'tin');
    m.poly(p.slice().reverse(), H - 0.05, '#9aa0a5', 'tin');
    return;
  }

  const style = styleFor(b, area, rnd);
  const tint = m.rgb(style === 'f_glass' ? GLASS_TINTS[(rnd() * GLASS_TINTS.length) | 0] : PAINTS[(rnd() * PAINTS.length) | 0], 0.1);
  const age = 0.82 + rnd() * 0.18;
  const wallCol = [tint[0] * age, tint[1] * age, tint[2] * age];
  const front = new Set(b.f || []);
  const shopChance = b.k === 'm' ? 1 : b.k === 'o' ? 0.75 : b.k === 'r' && b.l <= 7 ? (ctx.isOldTown(cx, cz) ? 0.6 : 0.3) : 0;
  const hasShops = front.size > 0 && rnd() < shopChance;
  const H = (hasShops ? SHOP_H + (b.l - 1) * FH : b.l * FH) + (b.k === 'i' ? 1.2 : 0);
  const parapet = b.k === 'i' ? 0 : 0.95;
  const gabled = (b.k === 'o' || b.k === 'i') && n === 4 && area < 420;
  const u0 = ((rnd() * 4) | 0) / 4, v0 = ((rnd() * 4) | 0) / 4;

  for (let i = 0; i < n; i++) {
    const a = p[i], q = p[(i + 1) % n];
    const dx = q[0] - a[0], dz = q[1] - a[1];
    const len = Math.hypot(dx, dz);
    if (len < 0.05) continue;
    ctx.walls.add(a[0], a[1], q[0], q[1], 1);
    const isFront = hasShops && front.has(i) && len > 3;
    const y0 = isFront ? SHOP_H : 0;
    const floors = isFront ? b.l - 1 : b.l;

    // Upper wall with windows. Seen from outside, q is on the left and a on the right.
    if (floors > 0 && H - y0 > 0.5) {
      if (len < 1.6) {
        m.quad([q[0], y0, q[1]], [a[0], y0, a[1]], [a[0], H, a[1]], [q[0], H, q[1]], null, null, null, null, wallCol, 'plaster');
      } else {
        const bays = Math.max(1, Math.round(len / BAY));
        const ua = u0 + i * 0.25, ub = ua + bays / 4;
        const va = v0, vb = v0 + floors / 4;
        m.quad([q[0], y0, q[1]], [a[0], y0, a[1]], [a[0], H, a[1]], [q[0], H, q[1]], [ua, va], [ub, va], [ub, vb], [ua, vb], wallCol, style);
      }
    }
    // Ground-floor shops
    if (isFront) {
      const bays = Math.max(1, Math.round(len / 3.3));
      const nx = dz / len, nz = -dx / len;
      for (let k = 0; k < bays; k++) {
        const t0 = k / bays, t1 = (k + 1) / bays;
        // left edge of bay k is nearer q
        const lx = q[0] - dx * t0, lz = q[1] - dz * t0, rx = q[0] - dx * t1, rz = q[1] - dz * t1;
        const s = (rnd() * SHOP_COUNT) | 0;
        const col = s % SHOP_GRID, row = (s / SHOP_GRID) | 0;
        const e = 0.004;
        const U0 = col / SHOP_GRID + e, U1 = (col + 1) / SHOP_GRID - e;
        const V1 = 1 - row / SHOP_GRID - e, V0 = 1 - (row + 1) / SHOP_GRID + e;
        m.quad([lx, 0, lz], [rx, 0, rz], [rx, SHOP_H, rz], [lx, SHOP_H, lz], [U0, V0], [U1, V0], [U1, V1], [U0, V1], [255, 255, 255], 'shop');
      }
      // slab projecting over the shopfronts
      if (detail && rnd() < 0.7) {
        const d = 0.55 + rnd() * 0.5;
        m.beam(a[0] + nx * d * 0.5, SHOP_H - 0.02, a[1] + nz * d * 0.5, q[0] + nx * d * 0.5, SHOP_H - 0.02, q[1] + nz * d * 0.5, d, 0.14, '#cfc9be', 'concrete');
      }
    }
    // Parapet: outer face continues the wall, then the inner face and cap.
    if (parapet && !gabled) {
      const nx = dz / len, nz = -dx / len, t = 0.18;
      const top = H + parapet;
      m.quad([q[0], H, q[1]], [a[0], H, a[1]], [a[0], top, a[1]], [q[0], top, q[1]], null, null, null, null, wallCol, 'plaster');
      if (detail) {
        const ax = a[0] - nx * t, az = a[1] - nz * t, qx = q[0] - nx * t, qz = q[1] - nz * t;
        m.quad([ax, H, az], [qx, H, qz], [qx, top, qz], [ax, top, az], null, null, null, null, wallCol, 'plaster');
        m.quadUp([a[0], top, a[1]], [q[0], top, q[1]], [qx, top, qz], [ax, top, az], null, null, null, null, wallCol, 'plaster');
      }
    }
  }

  // Roof
  if (gabled) gableRoof(m, p, H, b.k === 'i' ? 'tin' : 'tile', wallCol, rnd);
  else {
    m.poly(p, H, ROOF_TINTS[(rnd() * ROOF_TINTS.length) | 0], b.k === 'i' ? 'tin' : 'terrace');
    if (detail && b.k !== 'i') clutter(m, p, H, b, area, rnd, wallCol);
  }
}

function gableRoof(m, p, H, layer, wallCol, rnd) {
  const L = (i) => Math.hypot(p[(i + 1) % 4][0] - p[i][0], p[(i + 1) % 4][1] - p[i][1]);
  // rotate so that edges 0 and 2 are the long ones
  const q = L(0) + L(2) >= L(1) + L(3) ? p : [p[1], p[2], p[3], p[0]];
  const short = (Math.hypot(q[2][0] - q[1][0], q[2][1] - q[1][1]) + Math.hypot(q[0][0] - q[3][0], q[0][1] - q[3][1])) / 2;
  const rh = Math.min(3, Math.max(0.9, short * 0.3));
  const [cx, cz] = centroid(q);
  const out = (pt, k) => [cx + (pt[0] - cx) * k, cz + (pt[1] - cz) * k];
  const k = 1 + 0.45 / Math.max(2, short / 2);
  const e = q.map((pt) => out(pt, k));
  const m1 = [(q[1][0] + q[2][0]) / 2, (q[1][1] + q[2][1]) / 2], m3 = [(q[3][0] + q[0][0]) / 2, (q[3][1] + q[0][1]) / 2];
  const r1 = out(m1, k), r3 = out(m3, k);
  const tint = m.rgb(layer === 'tin' ? ['#b9c6d2', '#c9cdd1', '#9fb4c4', '#d2c5b4'][(rnd() * 4) | 0] : TILE_TINTS[(rnd() * 4) | 0]);
  const yb = H - 0.12, yt = H + rh;
  m.quadUp([e[0][0], yb, e[0][1]], [e[1][0], yb, e[1][1]], [r1[0], yt, r1[1]], [r3[0], yt, r3[1]], null, null, null, null, tint, layer);
  m.quadUp([e[2][0], yb, e[2][1]], [e[3][0], yb, e[3][1]], [r3[0], yt, r3[1]], [r1[0], yt, r1[1]], null, null, null, null, tint, layer);
  // gable ends
  m.tri([q[2][0], H, q[2][1]], [q[1][0], H, q[1][1]], [m1[0], yt, m1[1]], null, null, null, wallCol, 'plaster');
  m.tri([q[0][0], H, q[0][1]], [q[3][0], H, q[3][1]], [m3[0], yt, m3[1]], null, null, null, wallCol, 'plaster');
  // ridge cap
  m.beam(r1[0], yt + 0.04, r1[1], r3[0], yt + 0.04, r3[1], 0.3, 0.12, layer === 'tin' ? '#8d969e' : '#7a3d2c', 'flat');
}

function edgeClearance(x, z, p) {
  let d = Infinity;
  for (let i = 0; i < p.length; i++) {
    const q = p[(i + 1) % p.length];
    d = Math.min(d, segDist(x, z, p[i][0], p[i][1], q[0], q[1]).d);
  }
  return d;
}

function spot(p, rnd, clear) {
  const [x0, z0, x1, z1] = bbox(p);
  for (let k = 0; k < 8; k++) {
    const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0);
    if (pointInPoly(x, z, p) && edgeClearance(x, z, p) > clear) return [x, z];
  }
  return null;
}

/** Water tanks, stair cabins and solar heaters: the skyline of any Indian town. */
function clutter(m, p, H, b, area, rnd, wallCol) {
  if (area < 28) return;
  if (b.l >= 3 && area > 80) {
    const s = spot(p, rnd, 2.2);
    if (s) {
      const ry = rnd() * 3.14;
      m.box(s[0], H, s[1], 2.8, 2.7, 2.4, wallCol, 'plaster', { ry });
      m.box(s[0], H + 2.7, s[1], 3.1, 0.14, 2.7, '#b9b4aa', 'concrete', { ry });
      if (rnd() < 0.6) {
        m.cyl(s[0], H + 2.84, s[1], 0.62, 0.62, 1.15, '#17181a', 'flat', { seg: 8 });
        m.cyl(s[0], H + 3.99, s[1], 0.62, 0.2, 0.22, '#17181a', 'flat', { seg: 8 });
      }
    }
  }
  const tanks = area > 300 ? 2 : rnd() < 0.8 ? 1 : 0;
  for (let i = 0; i < tanks; i++) {
    const s = spot(p, rnd, 1.1);
    if (!s) continue;
    const blackTank = rnd() < 0.7;
    m.box(s[0], H, s[1], 1.5, 0.5, 1.5, '#b3aea4', 'concrete');
    m.cyl(s[0], H + 0.5, s[1], 0.6, 0.6, 1.2, blackTank ? '#18191b' : '#e9e6da', 'flat', { seg: 8 });
    m.cyl(s[0], H + 1.7, s[1], 0.6, 0.2, 0.22, blackTank ? '#18191b' : '#e9e6da', 'flat', { seg: 8 });
  }
  if (rnd() < 0.18 && area > 60) {
    const s = spot(p, rnd, 1.4);
    if (s) {
      // solar water heater: tilted collector with a tank on top
      const ry = rnd() * 0.6 - 0.3;
      m.box(s[0], H + 0.25, s[1], 1.9, 0.08, 1.2, '#1f3350', 'gloss', { ry, rx: -0.5 });
      m.cyl(s[0], H + 0.95, s[1] - 0.55, 0.26, 0.26, 1.9, '#d8dadc', 'metal', { rz: Math.PI / 2, ry, seg: 8 });
    }
  }
}
