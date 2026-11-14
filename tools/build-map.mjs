#!/usr/bin/env node
// Converts raw OpenStreetMap extracts into the compact, pre-projected map that
// the 3D engine loads (data/panvel.json).
//
//   node tools/build-map.mjs --fetch     download the raw extracts (needs network)
//   node tools/build-map.mjs             rebuild data/panvel.json from the cache
//
// Map data © OpenStreetMap contributors, available under the Open Database
// Licence (https://www.openstreetmap.org/copyright).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = path.join(ROOT, 'tools', '.cache');
const OUT = path.join(ROOT, 'data', 'panvel.json');

// ---- configuration ---------------------------------------------------------

// Local origin: roughly the ST bus depot, in the middle of town.
const LAT0 = 18.9905, LON0 = 73.115;
const MX = 111320 * Math.cos((LAT0 * Math.PI) / 180), MZ = 110540;

// Area you can walk in (metres from the origin; x east, z south).
const PLAY = { minX: -1000, maxX: 1000, minZ: -800, maxZ: 820 };
// Everything inside this is drawn, so the town does not stop at the edge.
const MARGIN = 430;
const DRAW = { minX: PLAY.minX - MARGIN, maxX: PLAY.maxX + MARGIN, minZ: PLAY.minZ - MARGIN, maxZ: PLAY.maxZ + MARGIN };

// OSM API bounding boxes (west,south,east,north). Each must stay under 50k nodes.
const BOXES = {
  panvel_core: '73.105,18.984,73.125,18.998',
  panvel_west: '73.097,18.984,73.105,18.998',
  panvel_north: '73.097,18.998,73.125,19.004',
  panvel_east: '73.125,18.979,73.131,19.004',
  panvel_south: '73.097,18.979,73.125,18.984',
};

// ---- fetch -----------------------------------------------------------------

if (process.argv.includes('--fetch')) {
  fs.mkdirSync(CACHE, { recursive: true });
  for (const [name, bbox] of Object.entries(BOXES)) {
    const url = `https://api.openstreetmap.org/api/0.6/map.json?bbox=${bbox}`;
    process.stdout.write(`fetching ${name} … `);
    const res = await fetch(url, { headers: { 'user-agent': 'osm-extract-script/1.0' } });
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
    fs.writeFileSync(path.join(CACHE, `${name}.json`), Buffer.from(await res.arrayBuffer()));
    console.log('ok');
    await new Promise((r) => setTimeout(r, 1500));
  }
}

// ---- load ------------------------------------------------------------------

const nodes = new Map(), ways = new Map(), rels = new Map();
for (const name of Object.keys(BOXES)) {
  const f = path.join(CACHE, `${name}.json`);
  if (!fs.existsSync(f)) {
    console.error(`Missing ${f}. Run: node tools/build-map.mjs --fetch`);
    process.exit(1);
  }
  for (const e of JSON.parse(fs.readFileSync(f, 'utf8')).elements) {
    (e.type === 'node' ? nodes : e.type === 'way' ? ways : rels).set(e.id, e);
  }
}

// ---- geometry helpers ------------------------------------------------------

const proj = (n) => [(n.lon - LON0) * MX, -(n.lat - LAT0) * MZ];
const pts = (w) => w.nodes.map((id) => nodes.get(id)).filter(Boolean).map(proj);
const closed = (w) => w.nodes.length > 3 && w.nodes[0] === w.nodes[w.nodes.length - 1];
const inBox = (p, b) => p[0] >= b.minX && p[0] <= b.maxX && p[1] >= b.minZ && p[1] <= b.maxZ;
const anyIn = (ps, b) => ps.some((p) => inBox(p, b));
const dm = (ps) => ps.flatMap((p) => [Math.round(p[0] * 10), Math.round(p[1] * 10)]);

function signedArea(ps) {
  let a = 0;
  for (let i = 0, n = ps.length; i < n; i++) {
    const p = ps[i], q = ps[(i + 1) % n];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}
function centroid(ps) {
  let x = 0, z = 0;
  for (const p of ps) (x += p[0]), (z += p[1]);
  return [x / ps.length, z / ps.length];
}
/** Open ring (no repeated last point), positive signed area, near-collinear points removed. */
function cleanRing(ps) {
  let r = ps.slice();
  if (r.length > 1 && Math.hypot(r[0][0] - r[r.length - 1][0], r[0][1] - r[r.length - 1][1]) < 0.05) r.pop();
  // drop duplicates
  r = r.filter((p, i) => {
    const q = r[(i + r.length - 1) % r.length];
    return i === 0 || Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.2;
  });
  // drop collinear
  let changed = true;
  while (changed && r.length > 3) {
    changed = false;
    for (let i = 0; i < r.length; i++) {
      const a = r[(i + r.length - 1) % r.length], b = r[i], c = r[(i + 1) % r.length];
      const cross = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
      const base = Math.hypot(c[0] - a[0], c[1] - a[1]);
      if (base > 0.01 && cross / base < 0.12) {
        r.splice(i, 1);
        changed = true;
        break;
      }
    }
  }
  if (r.length < 3) return null;
  if (signedArea(r) < 0) r.reverse();
  return r;
}
function hash(n) {
  let h = (n ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function distSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const l2 = dx * dx + dz * dz;
  const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2)) : 0;
  const cx = ax + dx * t, cz = az + dz * t;
  return [Math.hypot(px - cx, pz - cz), cx, cz];
}

// ---- roads -----------------------------------------------------------------

const ROAD = {
  motorway: ['M', 15], trunk: ['T', 14], trunk_link: ['t', 7], primary: ['P', 12], primary_link: ['p', 7],
  secondary: ['S', 10], secondary_link: ['s', 6.5], tertiary: ['E', 8.5], tertiary_link: ['e', 6],
  residential: ['R', 6], living_street: ['L', 4.5], service: ['V', 4], track: ['V', 3.5],
  pedestrian: ['D', 4.5], footway: ['F', 2.2], path: ['H', 1.6], steps: ['X', 2.4],
};
const DRIVE = new Set('MTtPpSsEeRLV');

const roadWays = [];
for (const w of ways.values()) {
  const t = w.tags || {};
  if (!t.highway || !ROAD[t.highway] || t.area === 'yes') continue;
  const p = pts(w);
  if (p.length < 2 || !anyIn(p, DRAW)) continue;
  roadWays.push(w);
}
// Split ways wherever they meet another way, so the result is a clean graph.
const use = new Map();
for (const w of roadWays) {
  w.nodes.forEach((id, i) => {
    const end = i === 0 || i === w.nodes.length - 1;
    use.set(id, (use.get(id) || 0) + (end ? 2 : 1));
  });
}
const junctionId = new Map();
const junctions = [];
const jid = (id) => {
  let j = junctionId.get(id);
  if (j === undefined) {
    j = junctions.length;
    junctionId.set(id, j);
    junctions.push(proj(nodes.get(id)));
  }
  return j;
};
const roads = [];
for (const w of roadWays) {
  const t = w.tags;
  const [c, defW] = ROAD[t.highway];
  const lanes = parseInt(t.lanes, 10);
  const oneway = t.oneway === 'yes' || t.highway === 'motorway';
  let width = defW;
  if (lanes && DRIVE.has(c)) width = Math.max(defW * 0.6, lanes * 3.4 + 1);
  if (oneway && !lanes && 'TPS'.includes(c)) width *= 0.72;
  let start = 0;
  for (let i = 1; i < w.nodes.length; i++) {
    const last = i === w.nodes.length - 1;
    if (!last && (use.get(w.nodes[i]) || 0) < 2) continue;
    const ids = w.nodes.slice(start, i + 1).filter((id) => nodes.has(id));
    start = i;
    if (ids.length < 2) continue;
    const p = ids.map((id) => proj(nodes.get(id)));
    if (!anyIn(p, DRAW)) continue;
    const r = { p: dm(p), c, w: Math.round(width * 10) / 10, a: jid(ids[0]), b: jid(ids[ids.length - 1]) };
    if (t.name) r.n = t.name.replace(/[A-Z]{3}$/, (m) => (/(BTV|KYU)$/.test(m) ? '' : m)).trim();
    if (t.bridge && t.bridge !== 'no') r.br = 1;
    if (t.tunnel && t.tunnel !== 'no') r.tu = 1;
    if (oneway) r.o = 1;
    roads.push(r);
  }
}

// Spatial index of drivable road segments, used to find which walls face a street.
const CELL = 40;
const rgrid = new Map();
roads.forEach((r, ri) => {
  if (!DRIVE.has(r.c) && r.c !== 'D') return;
  if (r.br || r.tu || 'MTt'.includes(r.c)) return;
  for (let i = 0; i + 3 < r.p.length; i += 2) {
    const ax = r.p[i] / 10, az = r.p[i + 1] / 10, bx = r.p[i + 2] / 10, bz = r.p[i + 3] / 10;
    const x0 = Math.floor(Math.min(ax, bx) / CELL) - 1, x1 = Math.floor(Math.max(ax, bx) / CELL) + 1;
    const z0 = Math.floor(Math.min(az, bz) / CELL) - 1, z1 = Math.floor(Math.max(az, bz) / CELL) + 1;
    for (let gx = x0; gx <= x1; gx++)
      for (let gz = z0; gz <= z1; gz++) {
        const k = gx + ',' + gz;
        let a = rgrid.get(k);
        if (!a) rgrid.set(k, (a = []));
        a.push([ax, az, bx, bz, ri]);
      }
  }
});
function nearestRoad(x, z) {
  const a = rgrid.get(Math.floor(x / CELL) + ',' + Math.floor(z / CELL));
  let best = null;
  if (a)
    for (const s of a) {
      const [d, cx, cz] = distSeg(x, z, s[0], s[1], s[2], s[3]);
      if (!best || d < best.d) best = { d, cx, cz, ri: s[4] };
    }
  return best;
}

// ---- buildings -------------------------------------------------------------

// North-east of the main line is CIDCO-planned New Panvel; south-west is the old town.
const isNewPanvel = (x, z) => z < 1.085 * x - 865;
const OLD_CORE = [-560, 380, 430];

function classify(t, area, x, z, seed) {
  const b = t.building;
  const am = t.amenity;
  let kind = 'r';
  if (am === 'place_of_worship' || b === 'temple' || b === 'mosque' || b === 'church') kind = 'w';
  else if (b === 'train_station' || t.railway === 'station' || t.public_transport === 'station') kind = 's';
  else if (b === 'roof') kind = 'c'; // canopy
  else if (b === 'industrial' || b === 'warehouse' || b === 'shed' || b === 'hut') kind = 'i';
  else if (b === 'commercial' || b === 'retail' || b === 'office' || b === 'hotel' || am === 'cinema' || am === 'bank' || t.shop) kind = 'm';
  else if (b === 'school' || b === 'college' || b === 'hospital' || am === 'school' || am === 'college' || am === 'hospital' || am === 'theatre' || b === 'civic' || b === 'public') kind = 'v';

  let levels = parseInt(t['building:levels'], 10) || 0;
  const newP = isNewPanvel(x, z);
  const old = Math.hypot(x - OLD_CORE[0], z - OLD_CORE[1]) < OLD_CORE[2];
  if (kind === 'r' && old && area < 170 && !levels) kind = 'o'; // old-town house, tiled roof
  if (!levels) {
    const r = seed;
    if (kind === 'w') levels = 2;
    else if (kind === 's') levels = 2;
    else if (kind === 'c') levels = 1;
    else if (kind === 'i') levels = area > 300 ? 2 : 1;
    else if (kind === 'o') levels = r < 0.3 ? 1 : r < 0.85 ? 2 : 3;
    else if (area < 30) levels = 1;
    else if (area < 80) levels = 1 + Math.floor(r * 2.4);
    else if (area < 220) levels = (newP ? 3 : 2) + Math.floor(r * (newP ? 4.2 : 3.4));
    else if (area < 600) levels = (newP ? 4 : 3) + Math.floor(r * r * (newP ? 11 : 6));
    else if (area < 2000) levels = 3 + Math.floor(r * 4.5);
    else levels = 2 + Math.floor(r * 2.5);
    if (kind === 'v') levels = Math.min(Math.max(levels, 2), 5);
    if (kind === 'm') levels = Math.min(Math.max(levels, 2), 6);
  }
  return { kind, levels: Math.min(levels, 24) };
}

const buildings = [];
function addBuilding(id, t, ring) {
  const r = cleanRing(ring);
  if (!r) return;
  const area = signedArea(r);
  if (area < 9) return;
  const [cx, cz] = centroid(r);
  if (!inBox([cx, cz], DRAW)) return;
  const seed = hash(id);
  const { kind, levels } = classify(t, area, cx, cz, seed);
  // Which edges look onto a street?
  const front = [];
  const n = r.length;
  for (let i = 0; i < n; i++) {
    const a = r[i], b = r[(i + 1) % n];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 3.2) continue;
    const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    const nx = (b[1] - a[1]) / len, nz = -(b[0] - a[0]) / len; // outward for positive area
    const nr = nearestRoad(mx + nx * 6, mz + nz * 6);
    if (!nr) continue;
    const road = roads[nr.ri];
    const tx = nr.cx - mx, tz = nr.cz - mz;
    const td = Math.hypot(tx, tz);
    if (td > road.w / 2 + 13 || td < 0.5) continue;
    if ((tx * nx + tz * nz) / td < 0.72) continue;
    front.push(i);
  }
  const o = { p: dm(r), l: levels, k: kind, s: Math.floor(seed * 1000) };
  if (front.length) o.f = front;
  if (t.name) o.n = t.name;
  const tag = t.amenity || (t.building !== 'yes' ? t.building : '') || t.shop || t.tourism || t.railway || t.man_made || '';
  if (tag) o.t = tag;
  if (t.religion) o.rel = t.religion;
  buildings.push(o);
}
for (const w of ways.values()) {
  const t = w.tags || {};
  if (!t.building || !closed(w)) continue;
  addBuilding(w.id, t, pts(w));
}
for (const r of rels.values()) {
  const t = r.tags || {};
  if (t.type !== 'multipolygon' || !t.building) continue;
  for (const m of r.members) {
    if (m.type !== 'way' || m.role === 'inner') continue;
    const w = ways.get(m.ref);
    if (w && closed(w) && !(w.tags && w.tags.building)) addBuilding(w.id, t, pts(w));
  }
}

// ---- rail ------------------------------------------------------------------

const rails = [];
for (const w of ways.values()) {
  const t = w.tags || {};
  if (t.railway !== 'rail') continue;
  const p = pts(w);
  if (p.length < 2 || !anyIn(p, DRAW)) continue;
  const o = { p: dm(p) };
  if (t.service) o.s = 1;
  if (t.name) o.n = t.name;
  if (t.bridge) o.br = 1;
  if (t.electrified && t.electrified !== 'no') o.e = 1;
  rails.push(o);
}
const platforms = [];
for (const w of ways.values()) {
  const t = w.tags || {};
  if (t.railway !== 'platform' && t.public_transport !== 'platform') continue;
  const p = pts(w);
  if (p.length < 2 || !anyIn(p, DRAW)) continue;
  if (closed(w)) {
    const r = cleanRing(p);
    if (r) platforms.push({ p: dm(r), n: t.name, ref: t.ref });
  } else platforms.push({ line: dm(p), n: t.name, ref: t.ref });
}

// ---- water, green, land ----------------------------------------------------

const water = [], rivers = [], green = [], land = [], walls = [];
function addWater(t, p) {
  const r = cleanRing(p);
  if (r && anyIn(r, DRAW)) water.push({ p: dm(r), ...(t.name ? { n: t.name } : {}) });
}
for (const w of ways.values()) {
  const t = w.tags || {};
  const p = pts(w);
  if (p.length < 2 || !anyIn(p, DRAW)) continue;
  if (closed(w)) {
    if (t.natural === 'water' || t.landuse === 'basin' || t.leisure === 'swimming_pool') addWater(t, p);
    else if (t.leisure === 'park' || t.leisure === 'garden' || t.leisure === 'playground') pushPoly(green, p, 'p', t);
    else if (t.leisure === 'pitch' || t.landuse === 'recreation_ground' || t.leisure === 'stadium') pushPoly(green, p, 'g', t);
    else if (t.landuse === 'grass' || t.landuse === 'cemetery' || t.natural === 'scrub' || t.natural === 'wood') pushPoly(green, p, 's', t);
    else if (t.natural === 'wetland') pushPoly(green, p, 'w', t);
    else if (t.landuse === 'construction') pushPoly(land, p, 'c', t);
    else if (t.landuse === 'industrial' || t.landuse === 'railway' || t.amenity === 'parking' || t.amenity === 'motorcycle_parking' || t.amenity === 'bus_station')
      pushPoly(land, p, t.amenity === 'bus_station' || t.landuse === 'industrial' ? 'y' : t.landuse === 'railway' ? 'r' : 'k', t);
    else if (t.highway === 'pedestrian' || (t.highway && t.area === 'yes')) pushPoly(land, p, 'v', t);
  }
  if (t.waterway === 'river' || t.waterway === 'canal' || t.waterway === 'drain' || t.waterway === 'stream') {
    rivers.push({ p: dm(p), w: t.waterway === 'river' ? 34 : t.waterway === 'canal' ? 8 : 3.5, ...(t.name ? { n: t.name } : {}) });
  }
  if (t.barrier === 'wall' || t.barrier === 'fence') walls.push({ p: dm(p), k: t.barrier === 'fence' ? 'f' : 'w', c: closed(w) ? 1 : 0 });
}
function pushPoly(arr, p, k, t) {
  const r = cleanRing(p);
  if (!r) return;
  arr.push({ p: dm(r), k, ...(t.name ? { n: t.name } : {}) });
}
// Multipolygon water (the river).
for (const r of rels.values()) {
  const t = r.tags || {};
  if (t.type !== 'multipolygon' || t.natural !== 'water') continue;
  // Stitch member ways into rings.
  let segs = r.members.filter((m) => m.type === 'way' && m.role !== 'inner' && ways.has(m.ref)).map((m) => ways.get(m.ref).nodes.slice());
  while (segs.length) {
    let ring = segs.shift();
    let grew = true;
    while (grew && ring[0] !== ring[ring.length - 1]) {
      grew = false;
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i];
        if (s[0] === ring[ring.length - 1]) ring = ring.concat(s.slice(1));
        else if (s[s.length - 1] === ring[ring.length - 1]) ring = ring.concat(s.slice(0, -1).reverse());
        else continue;
        segs.splice(i, 1);
        grew = true;
        break;
      }
    }
    const p = ring.map((id) => nodes.get(id)).filter(Boolean).map(proj);
    if (p.length >= 3) addWater(t, p);
  }
}

// ---- points of interest ----------------------------------------------------

const pois = [];
const POI_KEYS = ['amenity', 'historic', 'tourism', 'railway', 'man_made', 'shop', 'highway', 'leisure', 'place', 'public_transport'];
function addPoi(t, x, z) {
  if (!inBox([x, z], DRAW)) return;
  const key = POI_KEYS.find((k) => t[k]);
  if (!key) return;
  if (key === 'highway' && t.highway !== 'bus_stop') return;
  const o = { x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10, k: t[key] };
  if (t.name) o.n = t.name;
  if (t['name:mr']) o.mr = t['name:mr'];
  if (t.religion) o.rel = t.religion;
  if (!o.n && !['water_tower', 'bus_stop', 'fuel'].includes(o.k)) return;
  pois.push(o);
}
for (const n of nodes.values()) if (n.tags) addPoi(n.tags, ...proj(n));
for (const w of ways.values()) {
  const t = w.tags || {};
  if (!(t.name || t.man_made === 'water_tower') || t.highway || t.railway === 'rail' || t.waterway || t.power) continue;
  const p = pts(w);
  if (p.length) addPoi(t, ...centroid(p));
}

// ---- write -----------------------------------------------------------------

const out = {
  meta: {
    origin: [LAT0, LON0],
    play: PLAY,
    draw: DRAW,
    attribution: 'Map data © OpenStreetMap contributors (ODbL)',
    generated: 'tools/build-map.mjs',
  },
  junctions: junctions.flatMap((p) => [Math.round(p[0] * 10), Math.round(p[1] * 10)]),
  roads, rails, platforms, buildings, water, rivers, green, land, walls, pois,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out));
const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log(
  `wrote ${path.relative(ROOT, OUT)} (${kb} KB): ${buildings.length} buildings, ${roads.length} road segments, ` +
    `${junctions.length} junctions, ${rails.length} rails, ${platforms.length} platforms, ${water.length} water, ` +
    `${rivers.length} waterways, ${green.length} green, ${land.length} land, ${walls.length} walls, ${pois.length} pois`,
);
