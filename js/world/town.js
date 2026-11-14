// Builds the whole town from the pre-processed OpenStreetMap extract.

import { Mesher } from './mesher.js';
import { buildRoads, buildRails, buildPlatforms } from './roads.js';
import { buildBuilding } from './buildings.js';
import { unpack, SegGrid, PolyGrid, polyArea, ribbon, pointInPoly, centroid } from './geom.js';
import { mulberry32 } from '../util.js';

const OLD_CORE = [-560, 380, 430];

export async function buildTown(data, lib, tier, hooks = {}) {
  const rng = mulberry32(1852);
  const m = new Mesher(lib, 240, rng);
  m.release = true;
  const step = hooks.progress || (async () => {});
  const M0 = tier.margin ?? 430;
  const { play, draw } = data.meta;

  const walls = new SegGrid(16);
  const railGrid = new SegGrid(24);
  for (const r of data.rails) {
    const p = unpack(r.p);
    railGrid.addPoly(p, 0, false);
  }
  const ctx = {
    walls,
    solids: [], // [x, z, r] round obstacles (pillars, trunks, poles)
    rng,
    // how much of the surroundings and how much street dressing this device gets
    density: tier.detail ?? 1,
    drawAt: (x, z) => x > play.minX - M0 && x < play.maxX + M0 && z > play.minZ - M0 && z < play.maxZ + M0,
    detailAt: (x, z) => x > play.minX - 120 && x < play.maxX + 120 && z > play.minZ - 120 && z < play.maxZ + 120,
    inTown: (x, z) => x > play.minX - 60 && x < play.maxX + 60 && z > play.minZ - 60 && z < play.maxZ + 60,
    isOldTown: (x, z) => Math.hypot(x - OLD_CORE[0], z - OLD_CORE[1]) < OLD_CORE[2],
    onTrack(x, z, r) {
      let hit = false;
      railGrid.near(x, z, r + 2, (s) => {
        const dx = s[2] - s[0], dz = s[3] - s[1];
        const l2 = dx * dx + dz * dz;
        const t = l2 ? Math.max(0, Math.min(1, ((x - s[0]) * dx + (z - s[1]) * dz) / l2)) : 0;
        if (Math.hypot(x - s[0] - dx * t, z - s[1] - dz * t) < r) hit = true;
      });
      return hit;
    },
  };

  // ---- ground --------------------------------------------------------------
  const T = 150;
  for (let x = Math.floor((draw.minX - 300) / T) * T; x < draw.maxX + 300; x += T)
    for (let z = Math.floor((draw.minZ - 300) / T) * T; z < draw.maxZ + 300; z += T) {
      m.chunk(x + 1, z + 1);
      m.plane(x + T / 2, 0, z + T / 2, T, T, '#ffffff', 'earth');
    }
  // far apron out to the haze
  m.chunk(1e6, 1e6);
  const A = 4200, ix0 = Math.floor((draw.minX - 300) / T) * T, ix1 = Math.ceil((draw.maxX + 300) / T) * T;
  const iz0 = Math.floor((draw.minZ - 300) / T) * T, iz1 = Math.ceil((draw.maxZ + 300) / T) * T;
  const apron = (x0, z0, x1, z1) => m.plane((x0 + x1) / 2, -0.02, (z0 + z1) / 2, x1 - x0, z1 - z0, '#d8d2c4', 'earth');
  apron(-A, -A, A, iz0);
  apron(-A, iz1, A, A);
  apron(-A, iz0, ix0, iz1);
  apron(ix1, iz0, A, iz1);

  // ---- land use ------------------------------------------------------------
  const greens = new PolyGrid(60);
  for (const g of data.land) {
    const p = unpack(g.p);
    g.pts = p;
    m.chunk(...centroid(p));
    if (g.k === 'y') m.poly(p, 0.015, '#f0ece4', 'concrete');
    else if (g.k === 'k') m.poly(p, 0.015, '#dcd8d0', 'concrete');
    else if (g.k === 'v') m.poly(p, 0.02, '#ffffff', 'paver');
    else if (g.k === 'c') m.poly(p, 0.01, '#c9b99c', 'earth');
  }
  for (const g of data.green) {
    const p = unpack(g.p);
    g.pts = p;
    greens.add(p, g);
    m.chunk(...centroid(p));
    m.poly(p, 0.025, g.k === 'g' ? '#e6f0c8' : g.k === 'w' ? '#9fb68a' : '#ffffff', 'grass');
  }

  // ---- water ---------------------------------------------------------------
  const waterPolys = [];
  const lakes = [];
  const unpackCache = new Map();
  for (const w of data.water) {
    const p = unpack(w.p);
    w.pts = p;
    unpackCache.set(w, p);
    const area = Math.abs(polyArea(p));
    waterPolys.push(p);
    walls.addPoly(p, 2);
    if (area < 90000 && area > 150) {
      lakes.push({ name: w.n, pts: p, area });
      // stone coping and a paved promenade around each lake
      const closedPts = p.concat([p[0], p[1]]);
      const prom = ribbon(closedPts, 9);
      for (let i = 1; i < closedPts.length - 1; i++) {
        const a = closedPts[i - 1], b = closedPts[i];
        m.chunk(a[0], a[1]);
        m.quadUp([prom.L[i - 1][0], 0.035, prom.L[i - 1][1]], [prom.R[i - 1][0], 0.035, prom.R[i - 1][1]], [prom.R[i][0], 0.035, prom.R[i][1]], [prom.L[i][0], 0.035, prom.L[i][1]], null, null, null, null, m.rgb('#ffffff'), 'paver');
        m.beam(a[0], 0.0, a[1], b[0], 0.0, b[1], 0.5, 0.42, '#b9b2a4', 'stone');
        // painted railing along the water's edge
        const el = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (el > 0.5 && ctx.detailAt(a[0], a[1])) {
          m.beam(a[0], 1.12, a[1], b[0], 1.12, b[1], 0.06, 0.06, '#2f6f8f', 'gloss');
          m.beam(a[0], 0.78, a[1], b[0], 0.78, b[1], 0.04, 0.04, '#2f6f8f', 'gloss');
          const n = Math.max(1, Math.round(el / 2.4));
          for (let k = 0; k < n; k++) {
            const t = k / n;
            m.box(a[0] + (b[0] - a[0]) * t, 0.42, a[1] + (b[1] - a[1]) * t, 0.08, 0.74, 0.08, '#e9e4d6', 'gloss');
          }
        }
      }
      // the walking track people circle in the evening
      const track = ribbon(closedPts, 8);
      (ctx.promenades ||= []).push((polyArea(p) > 0 ? track.L : track.R).slice(0, -1));
    }
  }
  for (const r of data.rivers) {
    if (r.w > 20) continue; // the river itself comes as a polygon
    const p = unpack(r.p);
    const rb = ribbon(p, r.w);
    for (let i = 1; i < p.length; i++) waterPolys.push([rb.L[i - 1], rb.R[i - 1], rb.R[i], rb.L[i]]);
  }

  // ---- streets and rail ----------------------------------------------------
  await step(0.06);
  const roadInfo = buildRoads(m, data, ctx);
  await step(0.2);
  buildRails(m, data, ctx);
  const platforms = buildPlatforms(m, data, ctx);
  await step(0.26);

  // ---- buildings -----------------------------------------------------------
  const footprints = new PolyGrid(40);
  let done = 0;
  for (const b of data.buildings) {
    const p = unpack(b.p);
    b.pts = p;
    if (++done % 350 === 0) await step(0.26 + 0.3 * (done / data.buildings.length));
    if (!ctx.drawAt(p[0][0], p[0][1])) continue;
    footprints.add(p, b);
    if (hooks.special && hooks.special(m, b, p, ctx)) continue;
    buildBuilding(m, b, p, ctx);
  }
  await step(0.56);

  // ---- compound walls ------------------------------------------------------
  for (const w of data.walls) {
    const p = unpack(w.p);
    const col = m.rgb(w.k === 'f' ? '#7d858c' : '#e2d9c8', 0.12);
    for (let i = 1; i < p.length; i++) {
      const a = p[i - 1], b = p[i];
      if (!ctx.detailAt(a[0], a[1])) continue;
      m.chunk(a[0], a[1]);
      if (w.k === 'f') {
        m.beam(a[0], 1.5, a[1], b[0], 1.5, b[1], 0.05, 0.05, col, 'metal');
        m.beam(a[0], 0.8, a[1], b[0], 0.8, b[1], 0.05, 0.05, col, 'metal');
        m.box(a[0], 0, a[1], 0.08, 1.6, 0.08, col, 'metal');
      } else {
        m.beam(a[0], 0.9, a[1], b[0], 0.9, b[1], 0.23, 1.8, col, 'plaster');
        m.beam(a[0], 1.84, a[1], b[0], 1.84, b[1], 0.32, 0.08, '#bdb6a8', 'concrete');
      }
      walls.add(a[0], a[1], b[0], b[1], 1);
    }
  }

  if (hooks.furnish) await hooks.furnish(m, { data, ctx, greens, footprints, lakes, platforms, roadInfo, unpackCache, unpack, step });

  await step(0.92);
  const group = m.build(true);
  return { group, ctx, walls, greens, footprints, lakes, platforms, waterPolys, roadInfo, play, draw, stats: group.userData.stats };
}
