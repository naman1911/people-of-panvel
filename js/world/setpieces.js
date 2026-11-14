// Hero models and interactive street furniture placed at real locations:
// temples, mosques and the synagogue, the Shivaji Chowk statue, ST buses,
// local trains, platform canopies, tea stalls, notice boards, rickshaw stands.

import { orientedBox, centroid, unpack, polyLen, along, segDist, pointInPoly, bbox } from './geom.js';
import * as M from './models.js';
import { addSign } from './signs.js';
import { HUBS } from '../data/places.js';

const religionOf = (b) => {
  const n = (b.n || '').toLowerCase();
  if (b.rel === 'muslim' || /masjid|mosque|dargah/.test(n)) return 'muslim';
  if (b.rel === 'jewish' || /synag/.test(n)) return 'jewish';
  if (b.rel === 'christian' || /church/.test(n)) return 'christian';
  return 'hindu';
};

/** Buildings that get a bespoke model instead of the generic generator. */
export function special(m, b, p, ctx) {
  if (b.k !== 'w') return false;
  const ob = orientedBox(p);
  const L = Math.max(6, ob.len * 0.92), W = Math.max(5, ob.wid * 0.92);
  m.chunk(ob.cx, ob.cz);
  ctx.walls.addPoly(p, 1);
  const rel = religionOf(b);
  m.at(ob.cx, 0, ob.cz, ob.angle, () => {
    if (rel === 'muslim') mosque(m, L, W, /dargah/i.test(b.n || ''));
    else if (rel === 'jewish') synagogue(m, L, W);
    else if (rel === 'christian') church(m, L, W);
    else temple(m, L, W, /ballesh|balleshwar/i.test(b.n || ''));
  });
  return true;
}

function temple(m, L, W, grand) {
  const stone = '#bdb3a2', wall = grand ? '#f0e6d2' : '#f3ead9', saffron = '#e8731a';
  m.box(0, 0, 0, L, 0.7, W, stone, 'stone');
  m.box(L / 2 + 0.6, 0, 0, 1.2, 0.35, Math.min(W, 4), stone, 'stone'); // steps
  // sabha mandap: pillars under a tiled pyramid roof
  const mL = L * 0.55, mx = L * 0.2;
  const ph = 3.1;
  for (const px of [mx - mL / 2 + 0.4, mx, mx + mL / 2 - 0.4])
    for (const pz of [-W / 2 + 0.5, W / 2 - 0.5]) {
      m.cyl(px, 0.7, pz, 0.22, 0.18, ph, '#e9dfcb', 'plaster', { seg: 8 });
      m.box(px, 0.7 + ph - 0.25, pz, 0.6, 0.25, 0.6, '#d9cdb5', 'plaster');
    }
  m.box(mx, 0.7 + ph, 0, mL + 0.6, 0.3, W + 0.4, '#d9cdb5', 'plaster');
  m.pyramid(mx, 1.0 + ph, 0, mL + 1.2, 1.7, W + 1.0, '#ffffff', 'tile');
  // garbhagriha with shikhara
  const gL = L * 0.4, gx = -L * 0.28, gW = Math.min(W, gL * 1.1);
  m.box(gx, 0.7, 0, gL, 3.6, gW, wall, 'plaster');
  m.box(gx + gL / 2 + 0.02, 0.7, 0, 0.1, 2.3, 1.3, '#4a2f1d', 'wood'); // doorway
  let y = 4.3, s = 1;
  const tiers = grand ? 6 : 4;
  for (let i = 0; i < tiers; i++) {
    const h = (grand ? 1.25 : 1.0) * (1 - i * 0.07);
    m.box(gx, y, 0, gL * s, h, gW * s, i % 2 ? '#e6d9bf' : wall, 'plaster');
    m.box(gx, y + h - 0.12, 0, gL * s + 0.25, 0.12, gW * s + 0.25, '#cdbf9f', 'plaster');
    y += h;
    s *= 0.78;
  }
  m.ball(gx, y + 0.35, 0, gL * s * 0.62, '#d9c9a4', 'plaster', { sy: 0.55, detail: 1 });
  m.cyl(gx, y + 0.6, 0, 0.16, 0.05, 0.9, '#d4a017', 'gloss', { seg: 6 }); // kalash
  m.cyl(gx, y + 0.6, 0, 0.03, 0.03, 3.0, '#8a8a8a', 'gloss', { seg: 4 });
  m.box(gx + 0.45, y + 2.9, 0, 0.9, 0.6, 0.03, saffron, 'flat');
  if (grand) {
    // deepmal: the tapering lamp tower of Maharashtrian temples
    const dx = L / 2 + 4.5;
    m.cyl(dx, 0, 0, 1.2, 1.0, 0.6, stone, 'stone', { seg: 8 });
    let dy = 0.6, r = 0.62;
    for (let i = 0; i < 9; i++) {
      m.cyl(dx, dy, 0, r, r * 0.92, 0.55, '#3d3a37', 'stone', { seg: 8 });
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * 6.283 + i * 0.5;
        m.box(dx + Math.cos(a) * (r + 0.12), dy + 0.22, Math.sin(a) * (r + 0.12), 0.16, 0.05, 0.16, '#3d3a37', 'stone');
        m.box(dx + Math.cos(a) * (r + 0.12), dy + 0.28, Math.sin(a) * (r + 0.12), 0.07, 0.07, 0.07, '#ffc76b', 'glow');
      }
      dy += 0.55;
      r *= 0.92;
    }
    m.ball(dx, dy + 0.15, 0, 0.3, '#d4a017', 'gloss', { detail: 1 });
    // nandi-sized stone platform and a bell frame
    m.box(L / 2 + 2.2, 0, 2.4, 1.4, 0.8, 1.0, stone, 'stone');
    m.box(L / 2 + 1.5, 0, -2.2, 0.14, 2.6, 0.14, '#5a4630', 'wood');
    m.box(L / 2 + 2.9, 0, -2.2, 0.14, 2.6, 0.14, '#5a4630', 'wood');
    m.box(L / 2 + 2.2, 2.6, -2.2, 1.7, 0.14, 0.14, '#5a4630', 'wood');
    m.cyl(L / 2 + 2.2, 2.0, -2.2, 0.22, 0.1, 0.4, '#b08d2c', 'gloss', { seg: 8 });
  }
}

function mosque(m, L, W, dargah) {
  const wall = dargah ? '#e8f0e4' : '#f4f1e8', green = '#1f6b4a';
  m.box(0, 0, 0, L, 0.4, W, '#c9c2b2', 'stone');
  m.box(0, 0.4, 0, L * 0.96, 4.4, W * 0.96, wall, 'plaster');
  m.box(0, 4.8, 0, L, 0.35, W, green, 'flat');
  // arched entrance and windows suggested by recessed panels
  for (const z of [-W * 0.3, 0, W * 0.3]) m.box(L * 0.48 + 0.02, 0.5, z, 0.1, z === 0 ? 3.0 : 2.3, 1.2, z === 0 ? '#3f2a1c' : '#2f4a5a', 'gloss');
  const r = Math.min(L, W) * 0.3;
  m.cyl(0, 5.15, 0, r * 1.05, r * 1.0, 0.7, wall, 'plaster', { seg: 12 });
  m.dome(0, 5.85, 0, r, dargah ? green : '#e9e6da', 'plaster', { sy: 1.05, seg: 14 });
  m.cyl(0, 5.85 + r * 1.02, 0, 0.05, 0.02, 1.0, '#c9a227', 'gloss', { seg: 5 });
  for (const sx of [1, -1])
    for (const sz of [1, -1]) {
      if (sx < 0 && !dargah) continue;
      const x = (L / 2 - 0.5) * sx, z = (W / 2 - 0.5) * sz;
      m.cyl(x, 0.4, z, 0.42, 0.34, dargah ? 6.2 : 9.2, wall, 'plaster', { seg: 8 });
      m.cyl(x, (dargah ? 6.6 : 9.6) - 0.3, z, 0.6, 0.6, 0.18, green, 'flat', { seg: 8 });
      m.dome(x, dargah ? 6.6 : 9.6, z, 0.4, green, 'plaster', { sy: 1.4, seg: 8 });
    }
}

function synagogue(m, L, W) {
  const wall = '#eef1f4', trim = '#5f86a8';
  m.box(0, 0, 0, L, 0.5, W, '#c9c2b2', 'stone');
  m.box(0, 0.5, 0, L * 0.94, 4.6, W * 0.94, wall, 'plaster');
  m.box(0, 5.1, 0, L, 0.25, W, trim, 'flat');
  // gable roof with its ridge along the hall
  m.gable(0, 5.35, 0, W + 0.6, 1.9, L + 0.6, '#ffffff', 'tile', { ry: Math.PI / 2 });
  for (const z of [-W * 0.28, W * 0.28]) m.box(L * 0.47 + 0.02, 1.6, z, 0.08, 2.0, 1.0, '#32506a', 'gloss');
  m.box(L * 0.47 + 0.02, 0.5, 0, 0.1, 2.6, 1.5, '#4a3222', 'wood');
  for (let i = -1; i <= 1; i++) for (const s of [1, -1]) m.box(i * L * 0.28, 1.5, s * (W * 0.47 + 0.02), 1.0, 2.1, 0.08, '#32506a', 'gloss');
  // compound gate posts
  for (const z of [-2, 2]) m.box(L / 2 + 3, 0, z, 0.5, 2.4, 0.5, wall, 'plaster');
}

function church(m, L, W) {
  const wall = '#f3efe6';
  m.box(0, 0, 0, L * 0.94, 5, W * 0.94, wall, 'plaster');
  m.gable(0, 5, 0, W + 0.5, 2.2, L + 0.5, '#ffffff', 'tile', { ry: Math.PI / 2 });
  m.box(L / 2 - 1.4, 0, 0, 2.6, 9, 2.6, wall, 'plaster');
  m.pyramid(L / 2 - 1.4, 9, 0, 3, 2.4, 3, '#ffffff', 'tile');
  m.box(L / 2 - 1.4, 11.4, 0, 0.14, 1.5, 0.14, '#e9e6da', 'flat');
  m.box(L / 2 - 1.4, 12.3, 0, 0.14, 0.14, 0.8, '#e9e6da', 'flat');
}

// ---- street furniture you can use --------------------------------------------

function tapri(m, rnd) {
  // stall faces local +Z
  m.box(0, 0, -0.5, 2.4, 0.9, 0.9, '#6b4a2f', 'wood');
  m.box(0, 0.9, -0.5, 2.5, 0.06, 1.0, '#c9c2b2', 'flat');
  for (const x of [-1.15, 1.15]) for (const z of [-0.95, 0.4]) m.box(x, 0, z, 0.07, 2.35, 0.07, '#3a3d40', 'gloss');
  m.box(0, 2.3, -0.2, 2.9, 0.07, 2.2, ['#b3261e', '#1f5fa8', '#2f7d4f'][(rnd() * 3) | 0], 'flat', { rx: 0.14 });
  m.box(0, 0.5, -0.98, 2.4, 1.75, 0.05, '#7a8a8f', 'tin');
  m.cyl(-0.6, 0.96, -0.45, 0.2, 0.16, 0.3, '#b9bcbf', 'gloss', { seg: 8 }); // kettle
  m.box(-0.6, 0.93, -0.45, 0.5, 0.05, 0.5, '#2a2a2a', 'flat'); // stove
  for (let i = 0; i < 4; i++) m.cyl(0.25 + i * 0.26, 0.96, -0.25, 0.1, 0.1, 0.26, ['#e8c36a', '#d9843a', '#f0e0b0', '#c95f3a'][i], 'gloss', { seg: 8 }); // biscuit jars
  for (let i = 0; i < 6; i++) m.cyl(-0.1 + (i % 3) * 0.11, 0.96, -0.72 + ((i / 3) | 0) * 0.11, 0.035, 0.03, 0.09, '#c9884a', 'gloss', { seg: 6 }); // glasses of chai
  // two benches out front
  for (const x of [-0.95, 0.95]) {
    m.box(x, 0.42, 1.25, 1.5, 0.07, 0.36, '#7a5a3a', 'wood');
    for (const lx of [-0.6, 0.6]) m.box(x + lx, 0, 1.25, 0.07, 0.42, 0.3, '#5a4630', 'wood');
  }
}

function board(m) {
  // panel faces local +Z
  for (const x of [-1.5, 1.5]) m.box(x, 0, 0, 0.16, 2.9, 0.16, '#5a3b26', 'wood');
  m.box(0, 0.75, 0, 3.0, 1.75, 0.08, '#c9b79a', 'wood');
  m.box(0, 2.62, 0, 3.5, 0.1, 0.7, '#8c2f24', 'flat');
  m.box(0, 2.72, 0, 3.3, 0.08, 0.5, '#8c2f24', 'flat');
}

function statue(m) {
  const stone = '#b9b0a0', bronze = '#3b2f24';
  m.box(0, 0, 0, 6.5, 0.5, 6.5, stone, 'stone');
  m.box(0, 0.5, 0, 4.2, 0.5, 4.2, stone, 'stone');
  m.box(0, 1.0, 0, 2.6, 2.6, 1.5, '#d8cfbd', 'plaster');
  m.box(0, 3.6, 0, 2.9, 0.2, 1.8, stone, 'stone');
  // horse and rider, kept abstract and dignified
  m.box(0, 4.75, 0, 2.3, 0.85, 0.7, bronze, 'gloss');
  for (const x of [-0.85, 0.85]) for (const z of [-0.22, 0.22]) m.box(x, 3.8, z, 0.18, 1.0, 0.18, bronze, 'gloss');
  m.box(1.25, 5.3, 0, 0.5, 1.0, 0.4, bronze, 'gloss', { rz: -0.5 });
  m.box(1.75, 6.0, 0, 0.75, 0.42, 0.36, bronze, 'gloss', { rz: -0.3 });
  m.box(-1.25, 5.0, 0, 0.14, 0.9, 0.14, bronze, 'gloss', { rz: 0.5 });
  m.box(0.05, 5.6, 0, 0.55, 1.15, 0.5, bronze, 'gloss');
  m.ball(0.08, 7.0, 0, 0.24, bronze, 'gloss', { detail: 1 });
  m.cone(0.08, 7.12, 0, 0.3, 0.32, bronze, 'gloss', { seg: 8 });
  m.box(0.45, 6.2, 0.38, 0.1, 0.1, 1.5, bronze, 'gloss', { rx: -1.0 }); // raised sword
  // railing and corner lamps
  for (const s of [-1, 1]) {
    m.beam(-3.1, 1.0, s * 3.1, 3.1, 1.0, s * 3.1, 0.06, 0.06, '#2f3a40', 'gloss');
    m.beam(s * 3.1, 1.0, -3.1, s * 3.1, 1.0, 3.1, 0.06, 0.06, '#2f3a40', 'gloss');
    for (const t of [-1, 1]) {
      m.box(s * 3.1, 0.5, t * 3.1, 0.12, 2.6, 0.12, '#2f3a40', 'gloss');
      m.ball(s * 3.1, 3.2, t * 3.1, 0.18, '#ffe3a8', 'glow', { detail: 0 });
    }
  }
  // saffron flags
  for (const s of [-1, 1]) {
    m.cyl(s * 2.4, 0.5, -2.4, 0.04, 0.04, 6.5, '#9a9a9a', 'gloss', { seg: 5 });
    m.box(s * 2.4 + 0.55, 6.3, -2.4, 1.1, 0.7, 0.03, '#e8731a', 'flat');
  }
}

function waterTower(m) {
  const c = '#d2cdc2';
  m.cyl(0, 0, 0, 1.8, 1.5, 15, c, 'concrete', { seg: 10 });
  m.cyl(0, 15, 0, 1.6, 7.2, 4.2, c, 'concrete', { seg: 14 });
  m.cyl(0, 19.2, 0, 7.2, 7.2, 3.6, '#dcd7cc', 'concrete', { seg: 14 });
  m.cyl(0, 22.8, 0, 7.2, 2.0, 1.2, c, 'concrete', { seg: 14 });
  m.box(1.9, 0, 0, 0.5, 19, 0.08, '#7b8188', 'gloss');
}

function standSign(m) {
  m.cyl(0, 0, 0, 0.06, 0.06, 3.3, '#2a2a2a', 'gloss', { seg: 6 });
  m.box(0, 2.45, 0, 1.75, 0.9, 0.06, '#1b1b1b', 'flat');
}

/** Called after the generic street dressing. Records everything interactive on ctx.spots. */
export function placeSetpieces(m, env) {
  const { data, ctx, platforms } = env;
  const rnd = ctx.rng;
  const P = ctx.place;
  const spots = (ctx.spots = { tapris: [], boards: [], hubs: [], autos: [], benches: ctx.benches || [], seats: [] });
  const reserve = (x, z, r) => {
    ctx.solids.push([x, z, r]);
    P.mark(x, z);
  };
  const streetAngle = (x, z) => {
    // angle that faces the nearest street
    let best = null;
    ctx.roadGrid.near(x, z, 22, (s) => {
      const q = segDist(x, z, s[0], s[1], s[2], s[3]);
      if (!best || q.d < best.d) best = q;
    });
    return best ? Math.atan2(best.x - x, best.z - z) : 0;
  };

  // ---- rickshaw stands, tea stalls and notice boards at every hub -------------
  for (const hub of HUBS) {
    // stand sign
    const [sx, sz] = P.spotNear(hub.x + 3, hub.z + 2, 0.8, 0.4);
    const face = streetAngle(sx, sz);
    m.chunk(sx, sz);
    m.at(sx, 0, sz, face, () => standSign(m));
    for (const side of [0, Math.PI]) {
      addSign(
        [{ text: 'रिक्षा स्टँड', size: 44, color: '#f2c21a' }, { text: 'SHARE RICKSHAW', size: 22, color: '#f5f5f0', weight: 700 }],
        { w: 1.7, h: 0.86, bg: '#1b1b1b', border: '#f2c21a', x: sx + Math.sin(face + side) * 0.04, y: 2.9, z: sz + Math.cos(face + side) * 0.04, ry: face + side, glow: 0.6 },
      );
    }
    reserve(sx, sz, 0.3);
    spots.hubs.push({ id: hub.id, x: sx, z: sz });
    // two rickshaws you can drive, parked nearby
    for (let k = 0; k < 2; k++) {
      const [ax, az] = P.spotNear(hub.x - 4 - k * 4, hub.z + 5 + k * 2, 1.7, 0.2);
      P.mark(ax, az);
      spots.autos.push({ x: ax, z: az, yaw: rnd() * 6.28 });
    }
    // tea stall
    const [tx, tz] = P.spotNear(hub.x + 12, hub.z - 2, 2.6, 1.2);
    const tf = streetAngle(tx, tz);
    m.chunk(tx, tz);
    m.at(tx, 0, tz, tf, () => tapri(m, rnd));
    addSign(
      [{ text: 'अमृततुल्य चहा', size: 40, color: '#fff3c4' }, { text: 'कटिंग ₹८ · फुल ₹१२', size: 22, color: '#ffd28a', weight: 700 }],
      { w: 2.4, h: 0.72, bg: '#6d2b12', x: tx + Math.sin(tf) * 1.1, y: 2.62, z: tz + Math.cos(tf) * 1.1, ry: tf, glow: 0.8 },
    );
    reserve(tx, tz, 1.5);
    const fx = Math.sin(tf), fz = Math.cos(tf), rx = Math.cos(tf), rz = -Math.sin(tf);
    for (const s of [-0.95, 0.95]) {
      const bx = tx + fx * 1.25 + rx * s, bz = tz + fz * 1.25 + rz * s;
      spots.seats.push({ x: bx, z: bz, ry: tf + Math.PI, chai: true, hub: hub.id });
      ctx.solids.push([bx, bz, 0.45]);
    }
    spots.tapris.push({ x: tx, z: tz, ry: tf, hub: hub.id });
    // notice board
    const [bx, bz] = P.spotNear(hub.x - 9, hub.z - 4, 2.0, 0.8);
    const bf = streetAngle(bx, bz);
    m.chunk(bx, bz);
    m.at(bx, 0, bz, bf, () => board(m));
    addSign([{ text: 'कट्टा फलक', size: 30, color: '#ffe9c2' }], { w: 2.2, h: 0.36, bg: '#8c2f24', x: bx + Math.sin(bf) * 0.37, y: 2.66, z: bz + Math.cos(bf) * 0.37, ry: bf, glow: 0.3 });
    reserve(bx, bz, 1.2);
    spots.boards.push({ id: hub.id, x: bx, z: bz, ry: bf });
  }
  for (const b of spots.benches) spots.seats.push({ x: b.x, z: b.z, ry: b.ry, chai: false });

  // ---- Shivaji Chowk -----------------------------------------------------------
  {
    const [x, z] = [-284, 359];
    m.chunk(x, z);
    m.at(x, 0, z, 0, () => statue(m));
    ctx.walls.addPoly([[x - 3.3, z - 3.3], [x + 3.3, z - 3.3], [x + 3.3, z + 3.3], [x - 3.3, z + 3.3]], 1);
    addSign([{ text: 'छत्रपती शिवाजी महाराज चौक', size: 30, color: '#fff3c4' }], { w: 2.5, h: 0.42, bg: '#7a2a18', x, y: 2.2, z: z + 0.78, ry: 0, glow: 0.4 });
  }

  // ---- ST stand and depot: rows of Lal Paris, and a shelter ------------------------
  const stationYard = data.land.find((l) => l.n === 'Panvel Bus Station');
  const depotYard = data.land.find((l) => l.n === 'Panvel Bus Depot');
  for (const yard of [stationYard, depotYard]) {
    if (!yard) continue;
    const poly = yard.pts || unpack(yard.p);
    const ob = orientedBox(poly);
    let placed = 0;
    const max = yard === depotYard ? 16 : 6;
    // buses park nose-out in rows across the yard
    for (let row = -2; row <= 2 && placed < max; row++) {
      for (let i = -6; i <= 6 && placed < max; i++) {
        if ((i + row * 2) % 3 === 0) continue; // leave gaps: some are out on the road
        const along0 = row * 17, across = i * 4.1;
        const x = ob.cx + ob.ax * along0 - ob.az * across, z = ob.cz + ob.az * along0 + ob.ax * across;
        if (!pointInPoly(x, z, poly) || !P.free(x, z, 3.2, 0.3)) continue;
        m.chunk(x, z);
        m.at(x, 0, z, ob.angle + (row % 2 ? Math.PI : 0), () => M.bus(m, 'st'));
        ctx.walls.addPoly(rect(x, z, ob.ax, ob.az, 5.4, 1.35), 1);
        P.mark(x, z);
        placed++;
      }
    }
    if (yard !== stationYard) continue;
    const [sx, sz] = P.spotNear(ob.cx - ob.ax * 24, ob.cz - ob.az * 24, 3, 0.5);
    m.chunk(sx, sz);
    m.at(sx, 0, sz, ob.angle, () => {
      for (const px of [-9, -3, 3, 9]) for (const pz of [-2.2, 2.2]) m.box(px, 0, pz, 0.24, 4.2, 0.24, '#7c8288', 'gloss');
      m.box(0, 4.2, 0, 20, 0.16, 5.6, '#b3261e', 'tin');
      for (const px of [-6, 0, 6]) m.box(px, 0.4, 0, 3.4, 0.1, 0.5, '#2f6b4f', 'wood');
    });
    addSign(
      [{ text: 'पनवेल बस स्थानक', size: 60, color: '#fff7d6' }, { text: 'PANVEL BUS STATION · M.S.R.T.C.', size: 26, color: '#ffd9a3', weight: 700 }],
      { w: 9, h: 1.3, bg: '#b3261e', border: '#f2c230', x: sx + ob.az * 2.9, y: 5.1, z: sz - ob.ax * 2.9, ry: Math.atan2(ob.az, -ob.ax), glow: 0.9, double: true },
    );
  }

  // ---- station: canopies, nameboards and waiting locals --------------------------
  const rails = data.rails.filter((r) => !r.s && r.pts);
  platforms.polys.forEach((poly, pi) => {
    const ob = orientedBox(poly);
    if (ob.len < 60) return;
    m.chunk(ob.cx, ob.cz);
    const H = platforms.height;
    const cover = ob.len * 0.62;
    m.at(ob.cx, H, ob.cz, ob.angle, () => {
      const w = Math.min(8, Math.max(3.2, ob.wid * 0.82));
      for (let x = -cover / 2; x <= cover / 2; x += 9) {
        m.box(x, 0, 0, 0.26, 3.6, 0.26, '#5d7a8c', 'gloss');
        m.box(x, 3.6, 0, 0.2, 0.2, w, '#5d7a8c', 'gloss');
      }
      m.box(0, 3.85, w * 0.25, cover + 2, 0.08, w * 0.56, '#c9ced2', 'tin', { rx: 0.1 });
      m.box(0, 3.85, -w * 0.25, cover + 2, 0.08, w * 0.56, '#c9ced2', 'tin', { rx: -0.1 });
      // benches and a tea stall counter under the roof
      for (let x = -cover / 2 + 6; x < cover / 2; x += 18) m.box(x, 0, 0.9, 2.2, 0.45, 0.5, '#8c8f93', 'gloss');
    });
    // yellow nameboards at both ends and the middle
    for (const t of [-0.42, 0, 0.42]) {
      const x = ob.cx + ob.ax * ob.len * t, z = ob.cz + ob.az * ob.len * t;
      for (const side of [0, Math.PI]) {
        addSign(
          [{ text: 'पनवेल', size: 64, color: '#111' }, { text: 'PANVEL', size: 40, color: '#111' }],
          { w: 3.4, h: 1.5, bg: '#f2c21a', border: '#111', x, y: H + 2.6, z, ry: Math.atan2(ob.az, -ob.ax) + side + Math.PI / 2, glow: 0.5 },
        );
      }
      m.box(x - ob.ax * 1.5, H, z - ob.az * 1.5, 0.12, 3.2, 0.12, '#3a3a3a', 'gloss');
      m.box(x + ob.ax * 1.5, H, z + ob.az * 1.5, 0.12, 3.2, 0.12, '#3a3a3a', 'gloss');
    }
    // a local standing at the nearest running line
    if (pi % 2 === 0) {
      let best = null;
      for (const r of rails) {
        for (let i = 1; i < r.pts.length; i++) {
          const q = segDist(ob.cx, ob.cz, r.pts[i - 1][0], r.pts[i - 1][1], r.pts[i][0], r.pts[i][1]);
          if (!best || q.d < best.d) best = { d: q.d, r, i, x: q.x, z: q.z };
        }
      }
      if (best && best.d < 14) {
        const r = best.r;
        let s0 = 0;
        for (let i = 1; i < best.i; i++) s0 += Math.hypot(r.pts[i][0] - r.pts[i - 1][0], r.pts[i][1] - r.pts[i - 1][1]);
        s0 += Math.hypot(best.x - r.pts[best.i - 1][0], best.z - r.pts[best.i - 1][1]);
        const total = polyLen(r.pts);
        const cars = 6;
        for (let k = 0; k < cars; k++) {
          const s = s0 + (k - (cars - 1) / 2) * 21.7;
          if (s < 11 || s > total - 11) continue;
          const a = along(r.pts, s);
          m.chunk(a.x, a.z);
          m.at(a.x, 0.18, a.z, Math.atan2(-a.dz, a.dx), () => M.coach(m, k === 0 ? -1 : k === cars - 1 ? 1 : 0));
          ctx.walls.addPoly(rect(a.x, a.z, a.dx, a.dz, 10.6, 1.8), 1);
        }
      }
    }
  });

  // ---- CIDCO water towers --------------------------------------------------------
  for (const poi of data.pois) {
    if (poi.k !== 'water_tower') continue;
    if (!ctx.detailAt(poi.x, poi.z)) continue;
    const [x, z] = P.spotNear(poi.x, poi.z, 3, 1, 25);
    m.chunk(x, z);
    m.at(x, 0, z, rnd() * 6.28, () => waterTower(m));
    reserve(x, z, 2.2);
  }

  // ---- name plates on a few real buildings ---------------------------------------
  const plate = (name, text, sub, bg, fg) => {
    const b = data.buildings.find((q) => q.n === name);
    if (!b || !b.pts) return;
    const p = b.pts;
    // put it on the longest street-facing wall, or just the longest wall
    let bi = 0, bl = 0;
    for (let i = 0; i < p.length; i++) {
      const q = p[(i + 1) % p.length];
      const l = Math.hypot(q[0] - p[i][0], q[1] - p[i][1]) * ((b.f || []).includes(i) ? 3 : 1);
      if (l > bl) (bl = l), (bi = i);
    }
    const a = p[bi], q = p[(bi + 1) % p.length];
    const dx = q[0] - a[0], dz = q[1] - a[1], len = Math.hypot(dx, dz);
    const nx = dz / len, nz = -dx / len;
    const w = Math.min(len * 0.8, 11);
    addSign(
      [{ text, size: 70, color: fg }, ...(sub ? [{ text: sub, size: 30, color: fg, weight: 700 }] : [])],
      { w, h: w * 0.2, bg, x: (a[0] + q[0]) / 2 + nx * 0.25, y: Math.min(b.l * 3.1 - 1.2, 8.5), z: (a[1] + q[1]) / 2 + nz * 0.25, ry: Math.atan2(nx, nz), glow: 0.9, ppm: 72 },
    );
  };
  plate('Orion Mall', 'ORION MALL', 'पनवेल', '#14181c', '#ffd24a');
  plate('Panvel Municipal Corporation', 'पनवेल महानगरपालिका', 'स्थापना १८५२', '#f3ead4', '#7a1f14');
  plate('Adyakrantiveer Vasudev Balvant Phadke Auditorium', 'आद्य क्रांतिवीर वासुदेव बळवंत फडके नाट्यगृह', '', '#f3ead4', '#3a2a6a');
  plate('Rupali Talkies', 'रुपाली टॉकीज', 'आज ४ खेळ', '#b3261e', '#fff3c4');
  plate('Panvel (Suburban)', 'पनवेल · PANVEL', 'मध्य रेल्वे · CENTRAL RAILWAY', '#f2c21a', '#111111');
  void bbox;
}

function rect(x, z, ax, az, halfL, halfW) {
  const nx = -az, nz = ax;
  return [
    [x + ax * halfL + nx * halfW, z + az * halfL + nz * halfW],
    [x - ax * halfL + nx * halfW, z - az * halfL + nz * halfW],
    [x - ax * halfL - nx * halfW, z - az * halfL - nz * halfW],
    [x + ax * halfL - nx * halfW, z + az * halfL - nz * halfW],
  ];
}
