// Puts Panvel's real names into the town: street nameboards, signboards for
// the hospitals, banks, schools and shops that OpenStreetMap records, society
// name plates, and the big roadside hoardings.

import { along, segDist, bbox, SegGrid } from './geom.js';
import { addSign } from './signs.js';
import { STREET_MR, KIND_STYLE, HOARDINGS } from '../data/streets.js';

export function placeNames(m, env) {
  const { data, ctx } = env;
  const rnd = ctx.rng;
  const P = ctx.place;
  const play = data.meta.play;
  const inPlay = (x, z) => x > play.minX - 40 && x < play.maxX + 40 && z > play.minZ - 40 && z < play.maxZ + 40;

  // ---- street nameboards ---------------------------------------------------------
  const namedGrid = new SegGrid(30);
  const placed = new Map();
  data.roads.forEach((r, ri) => {
    if (!r.n || r.tu) return;
    for (let i = 1; i < r.pts.length; i++) namedGrid.add(r.pts[i - 1][0], r.pts[i - 1][1], r.pts[i][0], r.pts[i][1], ri);
    if (r.h || r.len < 26 || !'PSERL'.includes(r.c)) return;
    const mid = along(r.pts, r.len / 2);
    if (!inPlay(mid.x, mid.z)) return;
    const list = placed.get(r.n) || [];
    if (list.some((q) => Math.hypot(q[0] - mid.x, q[1] - mid.z) < 170)) return;
    const a = along(r.pts, Math.min(9, r.len * 0.3));
    for (const side of [1, -1]) {
      const off = r.w / 2 + 1.1;
      const x = a.x + a.dz * off * side, z = a.z - a.dx * off * side;
      if (P.nearBuilding(x, z, 0.5) || P.inWater(x, z) || P.taken(x, z, 1.5)) continue;
      list.push([mid.x, mid.z]);
      placed.set(r.n, list);
      m.chunk(x, z);
      // board stands across the footpath so you read it as you walk along the street
      const ry = Math.atan2(a.dx, a.dz);
      m.at(x, 0, z, ry, () => {
        for (const px of [-0.95, 0.95]) m.cyl(px, 0, 0, 0.045, 0.045, 3.1, '#3a3d40', 'gloss', { seg: 6 });
        m.box(0, 2.25, 0, 2.1, 0.78, 0.05, '#163a6b', 'flat');
      });
      const mr = STREET_MR[r.n];
      const lines = mr
        ? [{ text: mr, size: 40, color: '#ffffff' }, { text: r.n.toUpperCase(), size: 21, color: '#dce9ff', weight: 700 }]
        : [{ text: r.n.toUpperCase(), size: 34, color: '#ffffff' }];
      for (const flip of [0, Math.PI])
        addSign(lines, { w: 2.0, h: 0.7, bg: '#1f4f8f', border: '#ffffff', x: x + Math.sin(ry + flip) * 0.035, y: 2.64, z: z + Math.cos(ry + flip) * 0.035, ry: ry + flip, glow: 0.25, ppm: 110 });
      ctx.solids.push([x, z, 0.3]);
      P.mark(x, z);
      break;
    }
  });
  ctx.namedGrid = namedGrid;

  // ---- signboards on real establishments ------------------------------------------
  const boxes = data.buildings.filter((b) => b.pts && b.k !== 'c' && b.k !== 'w' && ctx.drawAt(b.pts[0][0], b.pts[0][1])).map((b) => ({ b, bb: bbox(b.pts) }));
  const nearestWall = (x, z, range) => {
    let best = null;
    for (const { b, bb } of boxes) {
      if (x < bb[0] - range || x > bb[2] + range || z < bb[1] - range || z > bb[3] + range) continue;
      const p = b.pts;
      for (let i = 0; i < p.length; i++) {
        const q = p[(i + 1) % p.length];
        const len = Math.hypot(q[0] - p[i][0], q[1] - p[i][1]);
        if (len < 3.5) continue;
        const d = segDist(x, z, p[i][0], p[i][1], q[0], q[1]).d;
        // prefer walls that look onto a street
        const score = d - ((b.f || []).includes(i) ? 9 : 0) - Math.min(len, 12) * 0.3;
        if (d < range && (!best || score < best.score)) best = { score, b, i, len };
      }
    }
    return best;
  };
  const used = new Set();
  const seen = new Set();
  const board = (b, i, text, style, tall) => {
    const key = b.s + ':' + b.p[0] + ':' + i;
    if (used.has(key)) return false;
    used.add(key);
    const p = b.pts, a = p[i], q = p[(i + 1) % p.length];
    const dx = q[0] - a[0], dz = q[1] - a[1], len = Math.hypot(dx, dz);
    const nx = dz / len, nz = -dx / len;
    const w = Math.min(len * 0.86, Math.max(3.2, text.length * 0.3 + 1.2), 9);
    const h = tall ? Math.min(1.25, w * 0.22) : 0.62;
    const top = b.l * 3.1;
    const y = tall ? Math.min(Math.max(4.25, top * 0.5), top - 0.3) : 2.75;
    const yy = b.l <= 1 ? Math.min(y, 2.7) : y;
    const lines = [{ text: (style.mark || '') + text, size: tall ? 46 : 30, color: style.fg }];
    if (tall && style.mr) lines.push({ text: style.mr, size: 24, color: style.fg, weight: 700 });
    addSign(lines, { w, h, bg: style.bg, border: tall ? style.fg : null, x: (a[0] + q[0]) / 2 + nx * 0.16, y: yy, z: (a[1] + q[1]) / 2 + nz * 0.16, ry: Math.atan2(nx, nz), glow: 0.75, ppm: 80 });
    return true;
  };
  for (const poi of data.pois) {
    if (!poi.n || !inPlay(poi.x, poi.z)) continue;
    const style = KIND_STYLE[poi.k];
    if (!style) continue;
    const name = poi.n.trim();
    if (name.length < 3 || name.length > 46 || seen.has(name)) continue;
    const hit = nearestWall(poi.x, poi.z, 26);
    if (!hit) continue;
    if (board(hit.b, hit.i, name, style, true)) seen.add(name);
  }
  // housing societies and other named buildings carry a small name plate
  for (const { b } of boxes) {
    if (!b.n || seen.has(b.n) || !inPlay(b.pts[0][0], b.pts[0][1])) continue;
    const name = b.n.trim();
    if (name.length < 3 || name.length > 40) continue;
    let bi = -1, bl = 0;
    const p = b.pts;
    for (let i = 0; i < p.length; i++) {
      const q = p[(i + 1) % p.length];
      const l = Math.hypot(q[0] - p[i][0], q[1] - p[i][1]) * ((b.f || []).includes(i) ? 3 : 1);
      if (l > bl) (bl = l), (bi = i);
    }
    if (bi < 0) continue;
    const style = KIND_STYLE[b.t] || { bg: '#6d1f1a', fg: '#ffe9c2', mr: '' };
    if (board(b, bi, name.toUpperCase(), style, !!KIND_STYLE[b.t])) seen.add(b.n);
  }

  // ---- hoardings ------------------------------------------------------------------
  let count = 0;
  const spots = [];
  for (const r of data.roads) {
    if (count >= 14) break;
    if (!'PS'.includes(r.c) || r.h || r.tu || r.len < 50) continue;
    const a = along(r.pts, r.len * (0.3 + rnd() * 0.4));
    if (!inPlay(a.x, a.z) || spots.some((s) => Math.hypot(s[0] - a.x, s[1] - a.z) < 160)) continue;
    for (const side of [1, -1]) {
      const off = r.w / 2 + 7.5;
      const x = a.x + a.dz * off * side, z = a.z - a.dx * off * side;
      if (!P.free(x, z, 4.2, 2)) continue;
      const msg = HOARDINGS[count % HOARDINGS.length];
      // face the oncoming street at a slight angle
      const ry = Math.atan2(-a.dz * side, a.dx * side) + Math.PI / 2 + (rnd() - 0.5) * 0.5;
      m.chunk(x, z);
      m.at(x, 0, z, ry, () => {
        for (const px of [-3.2, 3.2]) {
          m.box(px, 0, -0.25, 0.22, 9.6, 0.22, '#5d646b', 'gloss');
          m.beam(px, 0, -1.6, px, 6.5, -0.3, 0.1, 0.1, '#5d646b', 'gloss');
        }
        m.box(0, 5.4, -0.12, 8.6, 4.3, 0.12, '#3a3f44', 'flat');
        for (const px of [-3, 0, 3]) m.box(px, 9.75, 0.5, 0.5, 0.1, 0.2, '#fff1cf', 'glow');
      });
      addSign(
        [{ text: msg.top, size: 110, color: msg.fg }, { text: msg.sub, size: 52, color: msg.fg, weight: 700 }],
        { w: 8.4, h: 4.1, bg: msg.bg, border: msg.fg, x: x + Math.sin(ry) * 0.02, y: 7.55, z: z + Math.cos(ry) * 0.02, ry, glow: 1, ppm: 60 },
      );
      ctx.solids.push([x - Math.cos(ry) * 3.2, z + Math.sin(ry) * 3.2, 0.4], [x + Math.cos(ry) * 3.2, z - Math.sin(ry) * 3.2, 0.4]);
      P.mark(x, z);
      spots.push([a.x, a.z]);
      count++;
      break;
    }
  }
}
