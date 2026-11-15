// Streets, flyovers, railway lines and platforms, built from the real
// OpenStreetMap geometry.

import { ribbon, polyLen, along, unpack } from './geom.js';
import { smooth } from '../util.js';

const DRIVE = new Set('MTtPpSsEeRLV');
const MAJOR = new Set('MTPS');
const DECK_H = 6.6;

/** Work out how high each bridge vertex sits: flyovers rise away from where they meet the ground. */
function bridgeHeights(roads) {
  const byJ = new Map();
  roads.forEach((r, i) => {
    for (const j of [r.a, r.b]) {
      let a = byJ.get(j);
      if (!a) byJ.set(j, (a = []));
      a.push(i);
    }
  });
  const bridges = roads.map((r, i) => (r.br && DRIVE.has(r.c) ? i : -1)).filter((i) => i >= 0);
  const dist = new Map(); // junction -> distance along bridges to the nearest ground junction
  const queue = [];
  for (const i of bridges) {
    for (const j of [roads[i].a, roads[i].b]) {
      const others = byJ.get(j).filter((k) => !roads[k].br && DRIVE.has(roads[k].c));
      const alone = byJ.get(j).length === 1;
      if ((others.length || alone) && !dist.has(j)) {
        dist.set(j, 0);
        queue.push(j);
      }
    }
  }
  // Dijkstra (the graph is tiny)
  while (queue.length) {
    queue.sort((a, b) => dist.get(a) - dist.get(b));
    const j = queue.shift();
    for (const k of byJ.get(j)) {
      const r = roads[k];
      if (!r.br) continue;
      const o = r.a === j ? r.b : r.a;
      const nd = dist.get(j) + r.len;
      if (!dist.has(o) || nd < dist.get(o)) {
        dist.set(o, nd);
        queue.push(o);
      }
    }
  }
  // Components that never get far from the ground stay flat (short spans over drains and tracks).
  const comp = new Map();
  let nc = 0;
  for (const i of bridges) {
    if (comp.has(i)) continue;
    const stack = [i];
    const id = nc++;
    while (stack.length) {
      const k = stack.pop();
      if (comp.has(k)) continue;
      comp.set(k, id);
      for (const j of [roads[k].a, roads[k].b]) for (const o of byJ.get(j)) if (roads[o].br && !comp.has(o)) stack.push(o);
    }
  }
  const peak = new Array(nc).fill(0);
  for (const i of bridges) {
    const r = roads[i];
    const da = dist.get(r.a) ?? 0, db = dist.get(r.b) ?? 0;
    peak[comp.get(i)] = Math.max(peak[comp.get(i)], (da + db + r.len) / 2);
  }
  for (const i of bridges) {
    const r = roads[i];
    if (peak[comp.get(i)] < 70) continue;
    const da = dist.get(r.a) ?? 0, db = dist.get(r.b) ?? 0;
    let s = 0;
    r.h = r.pts.map((p, k) => {
      if (k) s += Math.hypot(p[0] - r.pts[k - 1][0], p[1] - r.pts[k - 1][1]);
      const d = Math.min(da + s, db + (r.len - s));
      return DECK_H * smooth(0, 95, d);
    });
    if (Math.max(...r.h) < 1.2) r.h = null;
  }
}

/** Subdivide long straight runs so ramps curve smoothly. */
function densify(pts, hs, step = 12) {
  const P = [pts[0]], H = [hs[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.round(l / step));
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      P.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      H.push(hs[i - 1] + (hs[i] - hs[i - 1]) * t);
    }
  }
  return [P, H];
}

export function buildRoads(m, data, ctx) {
  const roads = data.roads;
  for (const r of roads) {
    r.pts = unpack(r.p);
    r.len = polyLen(r.pts);
  }
  bridgeHeights(roads);

  const junc = unpack(data.junctions);
  const jw = new Float32Array(junc.length); // widest road at each junction
  const jfoot = new Uint8Array(junc.length);
  const jdeg = new Uint8Array(junc.length);

  const Y_WALK = 0.03, Y_ROAD = 0.05, Y_MARK = 0.06;
  // With photos on the ground, every flat drawn surface must be in a layer that can be switched off from high up.
  const flatLayer = ctx.imagery ? 'paver' : 'concrete';
  const white = m.rgb('#e9e6dc'), yellow = m.rgb('#d9a520');
  const asph = m.rgb('#ffffff'), asphOld = m.rgb('#e2ddd6'), paver = m.rgb('#ffffff'), conc = m.rgb('#e8e4dc');

  // Pass 1: footpaths under the streets, so kerbs show at the edges.
  for (const r of roads) {
    if (r.tu || r.h) continue;
    const drive = DRIVE.has(r.c);
    if (drive) {
      jw[r.a] = Math.max(jw[r.a], r.w);
      jw[r.b] = Math.max(jw[r.b], r.w);
      jdeg[r.a]++;
      jdeg[r.b]++;
    } else {
      jfoot[r.a] = jfoot[r.b] = 1;
    }
    if (r.c === 'R' && ctx.inTown(r.pts[0][0], r.pts[0][1])) strip(m, r.pts, r.w + 2.6, Y_WALK, flatLayer, conc);
    else if ('PSE'.includes(r.c)) strip(m, r.pts, r.w + ('PS'.includes(r.c) ? 6.8 : 5.2), Y_WALK, 'paver', paver);
  }
  // Pass 2: carriageways.
  for (const r of roads) {
    if (r.tu) continue;
    m.chunk(r.pts[0][0], r.pts[0][1]);
    if (r.h) {
      flyover(m, r, ctx);
      continue;
    }
    if (DRIVE.has(r.c)) {
      strip(m, r.pts, r.w, Y_ROAD, 'asphalt', 'RLV'.includes(r.c) ? asphOld : asph);
      // markings
      if (r.len > 22) {
        if ('PSE'.includes(r.c) && !r.o) dashes(m, r.pts, null, 0, 3, 6, 0.14, Y_MARK, white, 9);
        if (MAJOR.has(r.c) && r.o && r.w > 7.5) dashes(m, r.pts, null, 0, 3, 9, 0.14, Y_MARK, white, 9);
        if (MAJOR.has(r.c)) {
          dashes(m, r.pts, null, r.w / 2 - 0.35, 1e9, 0, 0.13, Y_MARK, r.o ? yellow : white, 4);
          dashes(m, r.pts, null, -(r.w / 2 - 0.35), 1e9, 0, 0.13, Y_MARK, white, 4);
        }
      }
    } else if (r.c === 'X') {
      strip(m, r.pts, r.w, Y_ROAD, flatLayer, conc);
    } else {
      strip(m, r.pts, r.w, Y_ROAD, 'paver', paver);
    }
  }
  // Raised footpaths with painted kerbs, and zebra crossings, on the main streets.
  const black = m.rgb('#2a2a2a'), kerbYellow = m.rgb('#d9a520'), kerbGrey = m.rgb('#b9b4a8');
  for (const r of roads) {
    if (r.tu || r.h || r.br || !'PSE'.includes(r.c) || !ctx.inTown(r.pts[0][0], r.pts[0][1])) continue;
    const ta = (jdeg[r.a] > 2 ? jw[r.a] / 2 + 1.4 : 0.2), tb = (jdeg[r.b] > 2 ? jw[r.b] / 2 + 1.4 : 0.2);
    if (r.len < ta + tb + 5) continue;
    const striped = 'PS'.includes(r.c);
    const sub = slice(r.pts, ta, r.len - tb, striped ? 1.7 : 12);
    const pad = striped ? 3.2 : 2.4, KH = 0.15;
    const inner = ribbon(sub, r.w), outer = ribbon(sub, r.w + pad * 2);
    for (let i = 1; i < sub.length; i++) {
      m.chunk(sub[i][0], sub[i][1]);
      for (const [a, b, side] of [[inner.L, outer.L, 1], [inner.R, outer.R, -1]]) {
        // footpath surface
        m.quadUp([a[i - 1][0], KH, a[i - 1][1]], [b[i - 1][0], KH, b[i - 1][1]], [b[i][0], KH, b[i][1]], [a[i][0], KH, a[i][1]], null, null, null, null, paver, 'paver');
        // kerb face towards the carriageway
        const col = striped ? (i % 2 ? kerbYellow : black) : kerbGrey;
        const A = [a[i - 1][0], 0.04, a[i - 1][1]], B = [a[i][0], 0.04, a[i][1]], C = [a[i][0], KH, a[i][1]], D = [a[i - 1][0], KH, a[i - 1][1]];
        if (side > 0) m.quad(B, A, D, C, null, null, null, null, col, 'flat');
        else m.quad(A, B, C, D, null, null, null, null, col, 'flat');
      }
    }
    // zebra crossings where this street meets a junction
    if (r.len > 40) {
      for (const [deg, d0] of [[jdeg[r.a], ta + 1.2], [jdeg[r.b], r.len - tb - 4.2]]) {
        if (deg < 3) continue;
        const a = along(r.pts, d0), b = along(r.pts, d0 + 3);
        const nx = a.dz, nz = -a.dx;
        m.chunk(a.x, a.z);
        for (let k = -r.w / 2 + 0.5; k < r.w / 2 - 0.4; k += 1.1) {
          m.quadUp([a.x + nx * k, Y_MARK, a.z + nz * k], [a.x + nx * (k + 0.55), Y_MARK, a.z + nz * (k + 0.55)], [b.x + nx * (k + 0.55), Y_MARK, b.z + nz * (k + 0.55)], [b.x + nx * k, Y_MARK, b.z + nz * k], null, null, null, null, white, 'mark');
        }
      }
    }
  }
  // Rounded joins where streets meet.
  for (let j = 0; j < junc.length; j++) {
    if (jw[j] > 0 && jdeg[j] !== 2) {
      m.chunk(junc[j][0], junc[j][1]);
      m.disc(junc[j][0], Y_ROAD, junc[j][1], jw[j] / 2, '#ffffff', 'asphalt', { seg: 14 });
    }
  }
  return { junc };
}

/** The part of a polyline between distances s0 and s1, resampled every `step` metres. */
function slice(pts, s0, s1, step) {
  const out = [];
  const n = Math.max(1, Math.round((s1 - s0) / step));
  for (let i = 0; i <= n; i++) {
    const a = along(pts, s0 + ((s1 - s0) * i) / n);
    out.push([a.x, a.z]);
  }
  return out;
}

/** Flat ribbon along a polyline. */
function strip(m, pts, w, y, layer, color, hs) {
  const { L, R } = ribbon(pts, w);
  for (let i = 1; i < pts.length; i++) {
    const y0 = hs ? hs[i - 1] + y : y, y1 = hs ? hs[i] + y : y;
    m.chunk((pts[i][0] + pts[i - 1][0]) / 2, (pts[i][1] + pts[i - 1][1]) / 2);
    m.quadUp([L[i - 1][0], y0, L[i - 1][1]], [R[i - 1][0], y0, R[i - 1][1]], [R[i][0], y1, R[i][1]], [L[i][0], y1, L[i][1]], null, null, null, null, color, layer);
  }
}

/** Painted dashes (or a solid line when gap = 0) offset sideways from a polyline. */
function dashes(m, pts, hs, offset, dash, gap, w, y, color, trim) {
  const total = polyLen(pts);
  if (total < trim * 2 + 2) return;
  const solid = gap === 0;
  let s = trim;
  const end = total - trim;
  while (s < end) {
    const e = solid ? Math.min(end, s + 10) : Math.min(end, s + dash);
    const a = along(pts, s), b = along(pts, e);
    const ya = hs ? heightAt(pts, hs, s) + y : y, yb = hs ? heightAt(pts, hs, e) + y : y;
    const nx = a.dz, nz = -a.dx, mx = b.dz, mz = -b.dx;
    const ax = a.x + nx * offset, az = a.z + nz * offset, bx = b.x + mx * offset, bz = b.z + mz * offset;
    const hw = w / 2;
    m.quadUp([ax + nx * hw, ya, az + nz * hw], [ax - nx * hw, ya, az - nz * hw], [bx - mx * hw, yb, bz - mz * hw], [bx + mx * hw, yb, bz + mz * hw], null, null, null, null, color, 'mark');
    s = e + (solid ? 0 : gap);
  }
}
function heightAt(pts, hs, s) {
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (s <= l || i === pts.length - 1) return hs[i - 1] + (hs[i] - hs[i - 1]) * Math.min(1, l ? s / l : 0);
    s -= l;
  }
  return hs[hs.length - 1];
}

/** Elevated carriageway: deck, crash barriers, piers. */
function flyover(m, r, ctx) {
  const [P, H] = densify(r.pts, r.h, 10);
  const w = r.w + 1.2;
  const { L, R } = ribbon(P, w);
  const conc = m.rgb('#d9d5cc'), dark = m.rgb('#a9a59c'), asph = m.rgb('#f2f2f2');
  const white = m.rgb('#e9e6dc');
  for (let i = 1; i < P.length; i++) {
    m.chunk(P[i][0], P[i][1]);
    const h0 = H[i - 1], h1 = H[i];
    const l0 = L[i - 1], l1 = L[i], r0 = R[i - 1], r1 = R[i];
    // road surface
    m.quadUp([l0[0], h0 + 0.05, l0[1]], [r0[0], h0 + 0.05, r0[1]], [r1[0], h1 + 0.05, r1[1]], [l1[0], h1 + 0.05, l1[1]], null, null, null, null, asph, 'asphalt');
    if (Math.max(h0, h1) < 0.25) continue;
    const t = 1.3; // deck depth
    for (const [a, b, side] of [[l0, l1, 1], [r0, r1, -1]]) {
      const top0 = h0 + 0.95, top1 = h1 + 0.95;
      const bot0 = Math.max(0, h0 - t), bot1 = Math.max(0, h1 - t);
      // outer face of girder + barrier (both windings so it reads from either side)
      const A = [a[0], bot0, a[1]], B = [b[0], bot1, b[1]], C = [b[0], top1, b[1]], D = [a[0], top0, a[1]];
      if (side > 0) m.quad(A, B, C, D, null, null, null, null, conc, 'concrete');
      else m.quad(B, A, D, C, null, null, null, null, conc, 'concrete');
      // inner face of the barrier
      const dx = b[0] - a[0], dz = b[1] - a[1], dl = Math.hypot(dx, dz) || 1;
      const ix = (-dz / dl) * 0.3 * side * -1, iz = (dx / dl) * 0.3 * side * -1;
      const A2 = [a[0] + ix, h0 + 0.05, a[1] + iz], B2 = [b[0] + ix, h1 + 0.05, b[1] + iz];
      const C2 = [b[0] + ix, top1, b[1] + iz], D2 = [a[0] + ix, top0, a[1] + iz];
      if (side > 0) m.quad(B2, A2, D2, C2, null, null, null, null, conc, 'concrete');
      else m.quad(A2, B2, C2, D2, null, null, null, null, conc, 'concrete');
      m.quadUp(D, C, C2, D2, null, null, null, null, conc, 'concrete');
    }
    // underside
    if (Math.min(h0, h1) > t) {
      m.quad([l0[0], h0 - t, l0[1]], [l1[0], h1 - t, l1[1]], [r1[0], h1 - t, r1[1]], [r0[0], h0 - t, r0[1]], null, null, null, null, dark, 'concrete');
    } else {
      // embankment fill under the low end of the ramp
      for (const [a, b, s2] of [[l0, l1, 1], [r0, r1, -1]]) {
        const A = [a[0], 0, a[1]], B = [b[0], 0, b[1]], C = [b[0], Math.max(0, h1 - t), b[1]], D = [a[0], Math.max(0, h0 - t), a[1]];
        if (s2 > 0) m.quad(A, B, C, D, null, null, null, null, dark, 'stone');
        else m.quad(B, A, D, C, null, null, null, null, dark, 'stone');
      }
    }
  }
  // piers
  let s = 14;
  const total = polyLen(P);
  while (s < total - 6) {
    const a = along(P, s);
    const h = heightAt(P, H, s);
    if (h > 3.2) {
      m.chunk(a.x, a.z);
      const ang = Math.atan2(-a.dz, a.dx);
      m.box(a.x, 0, a.z, 1.5, h - 2.1, Math.min(2.2, w * 0.3), '#cfcac0', 'concrete', { ry: ang });
      m.box(a.x, h - 2.1, a.z, 1.9, 0.85, w * 0.82, '#c4bfb5', 'concrete', { ry: ang });
      ctx.solids.push([a.x, a.z, 1.3]);
    }
    s += 26;
  }
  dashes(m, P, H, 0, 3, 9, 0.14, 0.07, white, 4);
}

// ---- railway ---------------------------------------------------------------

export function buildRails(m, data, ctx) {
  const steel = m.rgb('#8d8a86'), rustTop = m.rgb('#c9c6c0');
  const rails = data.rails;
  const masts = [];
  for (const r of rails) {
    const pts = unpack(r.p);
    r.pts = pts;
    const { L, R } = ribbon(pts, 3.3);
    const bed = ribbon(pts, 5.2);
    let s = 0;
    for (let i = 1; i < pts.length; i++) {
      const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      m.chunk(pts[i][0], pts[i][1]);
      // gravel shoulder, then the sleepered track bed on top
      m.quadUp([bed.L[i - 1][0], 0.04, bed.L[i - 1][1]], [bed.R[i - 1][0], 0.04, bed.R[i - 1][1]], [bed.R[i][0], 0.04, bed.R[i][1]], [bed.L[i][0], 0.04, bed.L[i][1]], null, null, null, null, m.rgb('#8f8a82'), 'earth');
      const v0 = s / 2.4, v1 = (s + l) / 2.4;
      m.quadUp([L[i - 1][0], 0.16, L[i - 1][1]], [R[i - 1][0], 0.16, R[i - 1][1]], [R[i][0], 0.16, R[i][1]], [L[i][0], 0.16, L[i][1]], [0, v0], [1, v0], [1, v1], [0, v1], m.rgb('#ffffff'), 'ballast');
      s += l;
    }
    // the two running rails (broad gauge, 1.676 m)
    for (const off of [0.84, -0.84]) {
      const e = ribbon(pts, Math.abs(off) * 2);
      const side = off > 0 ? e.L : e.R;
      for (let i = 1; i < pts.length; i++) {
        m.chunk(side[i][0], side[i][1]);
        m.beam(side[i - 1][0], 0.27, side[i - 1][1], side[i][0], 0.27, side[i][1], 0.075, 0.16, '#6f6b66', 'metal');
      }
    }
    void steel; void rustTop;
    // overhead equipment on running lines
    if (!r.s) {
      const total = polyLen(pts);
      for (let d = 12; d < total; d += 48) {
        const a = along(pts, d);
        masts.push([a.x, a.z, a.dx, a.dz]);
      }
      for (let i = 1; i < pts.length; i++) {
        m.chunk(pts[i][0], pts[i][1]);
        m.beam(pts[i - 1][0], 5.7, pts[i - 1][1], pts[i][0], 5.7, pts[i][1], 0.03, 0.03, '#3a3a3a', 'flat');
        m.beam(pts[i - 1][0], 6.9, pts[i - 1][1], pts[i][0], 6.9, pts[i][1], 0.03, 0.03, '#3a3a3a', 'flat');
      }
    }
  }
  // Catenary masts, thinned where parallel tracks would otherwise crowd them.
  const kept = [];
  for (const mm of masts) {
    if (kept.some((k) => Math.hypot(k[0] - mm[0], k[1] - mm[1]) < 9)) continue;
    kept.push(mm);
    const [x, z, dx, dz] = mm;
    const nx = dz, nz = -dx;
    const px = x + nx * 2.9, pz = z + nz * 2.9;
    if (ctx.onTrack(px, pz, 1.6)) continue;
    m.chunk(px, pz);
    m.box(px, 0, pz, 0.22, 8.2, 0.22, '#8c9196', 'metal');
    m.beam(px, 7.0, pz, x, 7.0, z, 0.08, 0.08, '#8c9196', 'metal');
    m.beam(px, 5.9, pz, x, 5.75, z, 0.06, 0.06, '#8c9196', 'metal');
    m.box(px, 0, pz, 0.6, 0.5, 0.6, '#b9b5ad', 'concrete');
  }
}

/** Raised station platforms with canopies. Returns the platform polygons for walking height. */
export function buildPlatforms(m, data, ctx) {
  const out = [];
  const H = 0.92;
  for (const pf of data.platforms) {
    if (!pf.p) continue;
    const p = unpack(pf.p);
    out.push(p);
    m.chunk(p[0][0], p[0][1]);
    m.poly(p, H, '#f1eee8', 'concrete');
    const n = p.length;
    for (let i = 0; i < n; i++) {
      const a = p[i], b = p[(i + 1) % n];
      m.chunk(a[0], a[1]);
      m.quad([a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], H, b[1]], [a[0], H, a[1]], null, null, null, null, m.rgb('#cfcabf'), 'concrete');
      // yellow safety line just inside each long edge
      const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
      if (l > 20) {
        const ix = (-dz / l) * -0.75, iz = (dx / l) * -0.75; // inward for positive-area rings
        const ix2 = (-dz / l) * -1.05, iz2 = (dx / l) * -1.05;
        m.quadUp([a[0] + ix, H + 0.012, a[1] + iz], [b[0] + ix, H + 0.012, b[1] + iz], [b[0] + ix2, H + 0.012, b[1] + iz2], [a[0] + ix2, H + 0.012, a[1] + iz2], null, null, null, null, m.rgb('#e2b21f'), 'mark');
      }
    }
  }
  return { polys: out, height: H };
}
