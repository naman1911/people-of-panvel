// Dresses the town: trees, street lights, electricity poles and wires,
// parked vehicles, handcarts. All placed along the real streets and checked
// against real building footprints so nothing sprouts inside a wall.

import { SegGrid, polyLen, along, ribbon, pointInPoly, bbox, polyArea } from './geom.js';
import * as M from './models.js';

export async function furnish(m, env) {
  const { data, ctx, greens, footprints, lakes } = env;
  const rnd = ctx.rng;
  const D = ctx.density;
  const step = env.step || (async () => {});
  const lamps = (ctx.lamps = []);

  // Index of streets (tag = half width) so props keep clear of carriageways.
  const roadGrid = new SegGrid(24);
  for (const r of data.roads) {
    if (r.tu) continue;
    for (let i = 1; i < r.pts.length; i++) roadGrid.add(r.pts[i - 1][0], r.pts[i - 1][1], r.pts[i][0], r.pts[i][1], r.w / 2);
  }
  ctx.roadGrid = roadGrid;
  const waterPolys = data.water.map((w) => w.p && env.unpackCache.get(w));
  const occupied = new SegGrid(8); // tiny markers for things already placed

  const onRoad = (x, z, margin) => {
    let hit = false;
    roadGrid.near(x, z, 16, (s) => {
      if (hit) return;
      const dx = s[2] - s[0], dz = s[3] - s[1];
      const l2 = dx * dx + dz * dz;
      const t = l2 ? Math.max(0, Math.min(1, ((x - s[0]) * dx + (z - s[1]) * dz) / l2)) : 0;
      if (Math.hypot(x - s[0] - dx * t, z - s[1] - dz * t) < s[4] + margin) hit = true;
    });
    return hit;
  };
  const inWater = (x, z) => waterPolys.some((p) => p && pointInPoly(x, z, p));
  // depots, parking lots and plazas stay clear of trees and weeds
  const paved = data.land.filter((l) => 'ykv'.includes(l.k)).map((l) => {
    const p = l.pts || (l.pts = env.unpack(l.p));
    return { p, b: bbox(p) };
  });
  const inPaved = (x, z) => paved.some((q) => x >= q.b[0] && x <= q.b[2] && z >= q.b[1] && z <= q.b[3] && pointInPoly(x, z, q.p));
  const taken = (x, z, r) => {
    let hit = false;
    occupied.near(x, z, r, (s) => {
      if (Math.hypot(s[0] - x, s[1] - z) < r) hit = true;
    });
    return hit;
  };
  const mark = (x, z) => occupied.add(x, z, x, z);
  const nearBuilding = (x, z, pad) => {
    let hit = false;
    ctx.walls.near(x, z, pad, (s) => {
      if (hit || s[4] !== 1) return;
      const dx = s[2] - s[0], dz = s[3] - s[1];
      const l2 = dx * dx + dz * dz;
      const t = l2 ? Math.max(0, Math.min(1, ((x - s[0]) * dx + (z - s[1]) * dz) / l2)) : 0;
      if (Math.hypot(x - s[0] - dx * t, z - s[1] - dz * t) < pad) hit = true;
    });
    return hit || !!footprints.find(x, z);
  };
  const free = (x, z, pad, roadMargin = 0.6) =>
    !nearBuilding(x, z, pad) && !onRoad(x, z, roadMargin) && !ctx.onTrack(x, z, 3.2) && !inWater(x, z) && !taken(x, z, pad + 1);

  /** Nearest spot to (x, z) that is clear of buildings, streets, tracks and water. */
  const spotNear = (x, z, pad = 1.2, roadMargin = 0.6, maxR = 40) => {
    if (free(x, z, pad, roadMargin)) return [x, z];
    for (let d = 1.5; d <= maxR; d += 1.5) {
      const n = Math.ceil(d * 3.2);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * 6.283 + d * 0.7;
        const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
        if (free(px, pz, pad, roadMargin)) return [px, pz];
      }
    }
    return [x, z];
  };
  ctx.place = { free, nearBuilding, onRoad, inWater, mark, taken, spotNear, inPaved };

  const plant = (x, z, kind, s, painted) => {
    if (inPaved(x, z) || !ctx.drawAt(x, z)) return;
    if (D < 1 && rnd() > D + (painted ? 0.25 : 0)) return;
    m.chunk(x, z);
    let r = 0;
    const lite = D < 0.6 || !ctx.detailAt(x, z);
    m.at(x, 0, z, rnd() * 6.28, () => (r = M.tree(m, kind, s, rnd, painted, lite)));
    if (r) ctx.solids.push([x, z, r + 0.15]);
    mark(x, z);
  };
  const STREET_TREES = ['round', 'round', 'round', 'rain', 'gulmohar', 'ashoka', 'palm'];

  // ---- along the streets ---------------------------------------------------
  let ri = 0;
  for (const r of data.roads) {
    if (++ri % 400 === 0) await step(0.56 + 0.2 * (ri / data.roads.length));
    if (r.tu || r.h || r.br) continue;
    const c = r.c;
    if (!'PSERL'.includes(c)) continue;
    const inPlay = ctx.detailAt(r.pts[0][0], r.pts[0][1]);
    const len = r.len;
    if (len < 14) continue;
    const major = 'PSE'.includes(c);

    // street lights on the bigger roads
    if (major && inPlay) {
      let side = rnd() < 0.5 ? 1 : -1;
      for (let s = 9 + rnd() * 10; s < len - 6; s += 34) {
        const a = along(r.pts, s);
        const off = r.w / 2 + 0.9;
        const x = a.x + a.dz * off * side, z = a.z - a.dx * off * side;
        side = -side;
        if (nearBuilding(x, z, 0.5) || onRoad(x, z, 0.2) || inWater(x, z)) continue;
        m.chunk(x, z);
        const ry = Math.atan2(a.dx * side, a.dz * side) + Math.PI / 2;
        // arm points back over the carriageway
        const ax = -a.dz * side, az = a.dx * side;
        m.at(x, 0, z, Math.atan2(-az, ax), () => M.lamp(m));
        void ry;
        const lx = x + ax * 2.05, lz = z + az * 2.05;
        lamps.push([lx, 8.3, lz]);
        m.disc(lx, 0.07, lz, 7.5, '#5a4a2c', 'pool', { seg: 14 });
        m.disc(lx, 0.075, lz, 3.6, '#6b5a36', 'pool', { seg: 12 });
        ctx.solids.push([x, z, 0.25]);
        mark(x, z);
      }
    }

    // electricity poles and wires on the lanes
    if (!major && inPlay && D >= 0.75 && len > 30 && rnd() < 0.7) {
      const side = rnd() < 0.5 ? 1 : -1;
      let prev = null;
      for (let s = 6; s < len - 4; s += 27) {
        const a = along(r.pts, s);
        const off = r.w / 2 + 0.55;
        const x = a.x + a.dz * off * side, z = a.z - a.dx * off * side;
        if (nearBuilding(x, z, 0.35) || onRoad(x, z, 0.1) || inWater(x, z)) {
          prev = null;
          continue;
        }
        m.chunk(x, z);
        const ry = Math.atan2(-a.dz, a.dx);
        m.at(x, 0, z, ry, () => M.pole(m));
        const cur = [x, z, -a.dz, a.dx]; // cross-arm direction
        if (prev) {
          for (const k of [-0.65, 0, 0.65]) {
            const x1 = prev[0] + prev[2] * k, z1 = prev[1] + prev[3] * k, x2 = x + cur[2] * k, z2 = z + cur[3] * k;
            const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
            // two segments give the wire a slight sag
            void mx; void mz;
            m.beam(x1, 7.2, z1, x2, 7.2, z2, 0.03, 0.03, '#26282a', 'flat');
          }
        }
        // a dim bulb on some poles
        if (rnd() < 0.5) {
          m.box(x - a.dz * side * -0.5, 6.2, z + a.dx * side * -0.5, 0.3, 0.07, 0.14, '#ffe9bd', 'glow');
          m.disc(x - a.dz * side * -0.8, 0.07, z + a.dx * side * -0.8, 5.5, '#4f4026', 'pool', { seg: 12 });
          lamps.push([x - a.dz * side * -0.8, 6.1, z + a.dx * side * -0.8]);
        }
        ctx.solids.push([x, z, 0.2]);
        mark(x, z);
        prev = cur;
      }
    }

    // street trees
    const treeGap = major ? 14 : 17;
    if (rnd() < (major ? 0.92 : 0.8)) {
      const kind = STREET_TREES[(rnd() * STREET_TREES.length) | 0];
      for (let s = 5 + rnd() * 10; s < len - 4; s += treeGap * (0.7 + rnd() * 0.6)) {
        const a = along(r.pts, s);
        const side = rnd() < 0.5 ? 1 : -1;
        const off = r.w / 2 + (major ? 2.2 : 1.3);
        const x = a.x + a.dz * off * side, z = a.z - a.dx * off * side;
        if (!free(x, z, kind === 'rain' ? 2.2 : 1.3, 0.5)) continue;
        plant(x, z, rnd() < 0.8 ? kind : STREET_TREES[(rnd() * STREET_TREES.length) | 0], 0.8 + rnd() * 0.5, inPlay);
      }
    }

    // parked vehicles
    if (inPlay && 'ERL'.includes(c) && len > 18) {
      for (let s = 8 + rnd() * 6; s < len - 8; s += 8 + rnd() * 34) {
        const a = along(r.pts, s);
        const side = rnd() < 0.5 ? 1 : -1;
        const roll = rnd();
        const two = roll < 0.45, isAuto = roll > 0.86, isTempo = roll > 0.8 && !isAuto;
        const halfW = two ? 0.35 : 0.85;
        const off = r.w / 2 - halfW + (c === 'E' ? 0.5 : 0.25);
        if (off < 1.6 && !two) continue;
        const x = a.x + a.dz * off * side, z = a.z - a.dx * off * side;
        if (nearBuilding(x, z, two ? 0.5 : 1.0) || taken(x, z, 3) || inWater(x, z)) continue;
        if (D < 1 && rnd() > (D < 0.6 ? D * 0.6 : D)) continue;
        m.chunk(x, z);
        const ry = Math.atan2(-a.dz, a.dx) + (side < 0 ? Math.PI : 0) + (two ? (rnd() - 0.5) * 0.5 + 1.2 : (rnd() - 0.5) * 0.08);
        m.at(x, 0, z, ry, () => {
          if (two) M.scooter(m, rnd);
          else if (isAuto) M.auto(m);
          else if (isTempo) M.tempo(m, rnd);
          else M.car(m, rnd);
        });
        ctx.solids.push([x, z, two ? 0.55 : 1.15]);
        mark(x, z);
        // two-wheelers come in rows
        if (two) {
          const nrow = (rnd() * 4) | 0;
          for (let k = 1; k <= nrow; k++) {
            const x2 = x + a.dx * k * 0.75, z2 = z + a.dz * k * 0.75;
            if (nearBuilding(x2, z2, 0.5)) break;
            m.at(x2, 0, z2, ry + (rnd() - 0.5) * 0.3, () => M.scooter(m, rnd));
            ctx.solids.push([x2, z2, 0.5]);
          }
        }
      }
    }
  }

  // ---- parks and grounds ---------------------------------------------------
  for (const g of data.green) {
    const p = g.pts;
    const area = Math.abs(polyArea(p));
    const [x0, z0, x1, z1] = bbox(p);
    const n = g.k === 'g' ? Math.min(14, area / 700) : Math.min(90, area / (g.k === 'w' ? 260 : 130));
    for (let i = 0; i < n * 3 && i < 300; i++) {
      const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0);
      if (!pointInPoly(x, z, p)) continue;
      // sports grounds keep their middle clear
      if (g.k === 'g') {
        const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
        if (Math.abs(x - cx) < (x1 - x0) * 0.36 && Math.abs(z - cz) < (z1 - z0) * 0.36) continue;
      }
      if (!free(x, z, 1.6, 1)) continue;
      const k = rnd();
      plant(x, z, g.k === 'w' ? 'bush' : k < 0.12 ? 'palm' : k < 0.3 ? 'rain' : k < 0.42 ? 'gulmohar' : k < 0.55 ? 'bush' : 'round', 0.85 + rnd() * 0.6, false);
    }
  }

  // ---- lakesides -----------------------------------------------------------
  for (const lake of lakes) {
    const ring = lake.pts.concat([lake.pts[0]]);
    const total = polyLen(ring);
    const outer = ribbon(ring, 15); // tree line ~7.5 m back from the edge
    const edge = polyArea(lake.pts) > 0 ? outer.L : outer.R;
    const lineLen = polyLen(edge);
    for (let s = 4; s < lineLen; s += 11 + rnd() * 6) {
      const a = along(edge, s);
      if (!free(a.x, a.z, 1.8, 0.8)) continue;
      const k = rnd();
      plant(a.x, a.z, k < 0.3 ? 'palm' : k < 0.6 ? 'rain' : 'round', 0.9 + rnd() * 0.5, true);
    }
    // lamps and benches on the promenade
    const prom = ribbon(ring, 7);
    const pe = polyArea(lake.pts) > 0 ? prom.L : prom.R;
    const pl = polyLen(pe);
    for (let s = 8; s < pl; s += 23) {
      const a = along(pe, s);
      if (nearBuilding(a.x, a.z, 0.6) || onRoad(a.x, a.z, 0.2)) continue;
      m.chunk(a.x, a.z);
      // face the water
      const b0 = along(ring, Math.min(total - 0.1, (s / pl) * total));
      const toward = Math.atan2(-(b0.z - a.z), b0.x - a.x);
      m.at(a.x, 0, a.z, toward, () => M.lamp(m, 4.6, 0.7));
      lamps.push([a.x, 4.6, a.z]);
      m.disc(a.x, 0.07, a.z, 5.2, '#5a4a2c', 'pool', { seg: 12 });
      ctx.solids.push([a.x, a.z, 0.2]);
      const b = along(pe, s + 7);
      if (!nearBuilding(b.x, b.z, 1) && !onRoad(b.x, b.z, 0.3)) {
        const bw = along(ring, Math.min(total - 0.1, ((s + 7) / pl) * total));
        // the bench's seat faces local +Z, so turn that toward the water
        const ang = Math.atan2(bw.x - b.x, bw.z - b.z);
        m.at(b.x, 0, b.z, ang, () => M.bench(m, ['#2f6b4f', '#6b4a2f', '#2f4f6b'][(rnd() * 3) | 0]));
        (ctx.benches ||= []).push({ x: b.x, z: b.z, ry: ang });
        ctx.solids.push([b.x, b.z, 0.6]);
      }
    }
  }

  // ---- weeds and grass on open plots ----------------------------------------
  {
    const { play } = data.meta;
    for (let i = 0; i < (ctx.imagery ? 0 : 2600 * D); i++) {
      const x = play.minX - 100 + rnd() * (play.maxX - play.minX + 200), z = play.minZ - 100 + rnd() * (play.maxZ - play.minZ + 200);
      const r = 2.5 + rnd() * 7;
      if (nearBuilding(x, z, Math.min(7.5, r * 0.8)) || onRoad(x, z, r * 0.6) || ctx.onTrack(x, z, r) || inWater(x, z) || inPaved(x, z)) continue;
      m.chunk(x, z);
      m.disc(x, 0.02, z, r, ['#ffffff', '#e8f0c8', '#d6e0b0', '#f2f2d8'][(rnd() * 4) | 0], 'grass', { seg: 9, sx: 0.7 + rnd() * 0.6, sz: 0.7 + rnd() * 0.6, ry: rnd() * 3 });
    }
  }

  // ---- compounds: trees tucked in beside buildings --------------------------
  await step(0.8);
  for (const b of data.buildings) {
    const p = b.pts;
    if (p.length < 3 || !ctx.detailAt(p[0][0], p[0][1])) continue;
    const n = 1 + ((rnd() * 3) | 0);
    for (let k = 0; k < n; k++) {
      const i = (rnd() * p.length) | 0, q = p[(i + 1) % p.length];
      const dx = q[0] - p[i][0], dz = q[1] - p[i][1], len = Math.hypot(dx, dz);
      if (len < 3) continue;
      const t = rnd(), off = 2.2 + rnd() * 4;
      const x = p[i][0] + dx * t + (dz / len) * off, z = p[i][1] + dz * t - (dx / len) * off;
      if (!free(x, z, 1.5, 0.9)) continue;
      const r = rnd();
      plant(x, z, r < 0.2 ? 'palm' : r < 0.32 ? 'ashoka' : r < 0.45 ? 'bush' : r < 0.55 ? 'rain' : r < 0.65 ? 'gulmohar' : 'round', 0.7 + rnd() * 0.6, false);
    }
  }

  // ---- open land -----------------------------------------------------------
  const { draw, play } = data.meta;
  await step(0.86);
  for (let i = 0; i < 7000 * Math.max(0.5, D); i++) {
    const x = play.minX + rnd() * (play.maxX - play.minX), z = play.minZ + rnd() * (play.maxZ - play.minZ);
    if (!free(x, z, 2.2, 2)) continue;
    const k = rnd();
    plant(x, z, k < 0.3 ? 'bush' : k < 0.46 ? 'palm' : k < 0.6 ? 'rain' : 'round', 0.8 + rnd() * 0.7, false);
  }
  for (let i = 0; i < 9000 * (D < 0.6 ? 0.3 : 1); i++) {
    const x = draw.minX + rnd() * (draw.maxX - draw.minX), z = draw.minZ + rnd() * (draw.maxZ - draw.minZ);
    if (ctx.detailAt(x, z) || !free(x, z, 2.4, 2.5)) continue;
    const k = rnd();
    plant(x, z, k < 0.3 ? 'bush' : k < 0.45 ? 'palm' : 'round', 0.8 + rnd() * 0.8, false);
  }

  // ---- handcarts near the bazaar -------------------------------------------
  for (const r of data.roads) {
    if (!r.n || !/Bhaji Market|Shivaji|Tilak|Mahatma Gandhi|Station Road/.test(r.n) || r.len < 20) continue;
    for (let s = 6; s < r.len - 6; s += 13 + rnd() * 16) {
      const a = along(r.pts, s);
      const side = rnd() < 0.5 ? 1 : -1;
      const off = r.w / 2 + 0.4;
      const x = a.x + a.dz * off * side, z = a.z - a.dx * off * side;
      if (nearBuilding(x, z, 0.9) || taken(x, z, 2.5)) continue;
      m.chunk(x, z);
      m.at(x, 0, z, Math.atan2(-a.dz, a.dx) + (rnd() - 0.5) * 0.4, () => M.handcart(m, rnd));
      ctx.solids.push([x, z, 1.0]);
      mark(x, z);
    }
  }
}
