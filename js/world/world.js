// The playable world: collision against real walls and obstacles, walking
// height (station platforms), free-spot search, and the street graph that
// pedestrians and traffic follow.

import { SegGrid, pointInPoly, bbox, along, segDist } from './geom.js';

export class World {
  constructor(town, data) {
    this.town = town;
    this.walls = town.walls;
    this.play = town.play;
    this.platformH = town.platforms.height;
    this.platforms = town.platforms.polys.map((p) => ({ p, b: bbox(p) }));
    this.waterPolys = town.waterPolys.map((p) => ({ p, b: bbox(p) }));

    // round obstacles in a coarse grid
    this.cell = 8;
    this.solidGrid = new Map();
    for (const s of town.ctx.solids) this.addSolid(s[0], s[1], s[2]);

    // street graph
    const roads = data.roads.filter((r) => !r.tu && !r.h && 'PSEeRLVsp'.includes(r.c) && r.len > 4);
    this.roads = roads;
    this.adj = new Map();
    roads.forEach((r) => {
      for (const [j, end] of [[r.a, 0], [r.b, 1]]) {
        let a = this.adj.get(j);
        if (!a) this.adj.set(j, (a = []));
        a.push({ r, end });
      }
    });
    this.roadGrid = new Map();
    for (const r of roads) {
      const mid = along(r.pts, r.len / 2);
      const k = Math.floor(mid.x / 60) + ',' + Math.floor(mid.z / 60);
      let a = this.roadGrid.get(k);
      if (!a) this.roadGrid.set(k, (a = []));
      a.push(r);
    }
    // walkable streets indexed for route finding
    this.walkGrid = new SegGrid(24);
    roads.forEach((r, i) => {
      for (let k = 1; k < r.pts.length; k++) this.walkGrid.add(r.pts[k - 1][0], r.pts[k - 1][1], r.pts[k][0], r.pts[k][1], i);
    });
    this.streetGrid = town.ctx.roadGrid;
    this.namedGrid = town.ctx.namedGrid;
    this.allRoads = data.roads;
  }

  /** Name of the street you are standing on or beside, if the map knows it. */
  streetNameAt(x, z) {
    let best = null;
    this.namedGrid?.near(x, z, 16, (s) => {
      const q = segDist(x, z, s[0], s[1], s[2], s[3]);
      if (q.d < 16 && (!best || q.d < best.d)) best = { d: q.d, r: this.allRoads[s[4]] };
    });
    return best ? best.r.n : null;
  }

  addSolid(x, z, r) {
    const k = Math.floor(x / this.cell) + ',' + Math.floor(z / this.cell);
    let a = this.solidGrid.get(k);
    if (!a) this.solidGrid.set(k, (a = []));
    const s = [x, z, r];
    a.push(s);
    return s;
  }
  removeSolid(s) {
    const k = Math.floor(s[0] / this.cell) + ',' + Math.floor(s[1] / this.cell);
    const a = this.solidGrid.get(k);
    if (a) {
      const i = a.indexOf(s);
      if (i >= 0) a.splice(i, 1);
    }
  }

  /** Push a circle out of walls and obstacles. Returns true if anything was hit. */
  resolve(pos, r, ignore) {
    let hit = this.walls.resolve(pos, r);
    const gx = Math.floor(pos.x / this.cell), gz = Math.floor(pos.z / this.cell);
    for (let ix = gx - 1; ix <= gx + 1; ix++)
      for (let iz = gz - 1; iz <= gz + 1; iz++) {
        const a = this.solidGrid.get(ix + ',' + iz);
        if (!a) continue;
        for (const s of a) {
          if (s === ignore) continue;
          const dx = pos.x - s[0], dz = pos.z - s[1];
          const d = Math.hypot(dx, dz), min = r + s[2];
          if (d < min) {
            if (d < 1e-4) pos.x += min;
            else {
              pos.x = s[0] + (dx / d) * min;
              pos.z = s[1] + (dz / d) * min;
            }
            hit = true;
          }
        }
      }
    // keep inside the playable rectangle
    const p = this.play;
    let edge = false;
    if (pos.x < p.minX) (pos.x = p.minX), (edge = true);
    if (pos.x > p.maxX) (pos.x = p.maxX), (edge = true);
    if (pos.z < p.minZ) (pos.z = p.minZ), (edge = true);
    if (pos.z > p.maxZ) (pos.z = p.maxZ), (edge = true);
    this.atEdge = edge;
    return hit || edge;
  }

  heightAt(x, z) {
    for (const pf of this.platforms) {
      if (x < pf.b[0] || x > pf.b[2] || z < pf.b[1] || z > pf.b[3]) continue;
      if (pointInPoly(x, z, pf.p)) return this.platformH;
    }
    return 0;
  }

  inWater(x, z) {
    for (const w of this.waterPolys) {
      if (x < w.b[0] || x > w.b[2] || z < w.b[1] || z > w.b[3]) continue;
      if (pointInPoly(x, z, w.p)) return true;
    }
    return false;
  }

  isFree(x, z, r) {
    if (this.inWater(x, z) || this.town.footprints.find(x, z)) return false;
    const p = { x, z };
    const before = this.atEdge;
    const hit = this.resolve(p, r);
    this.atEdge = before;
    return !hit;
  }

  /** Nearest free spot to (x, z), searching outward in a spiral. */
  findFree(x, z, r = 0.5, maxR = 40) {
    if (this.isFree(x, z, r)) return { x, z };
    for (let d = 1.5; d <= maxR; d += 1.5) {
      const n = Math.ceil((d * 6.28) / 2);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * 6.283 + d;
        const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
        if (this.isFree(px, pz, r)) return { x: px, z: pz };
      }
    }
    return { x, z };
  }

  /** Distance to the nearest street centreline and that street's half-width. */
  nearestStreet(x, z, range = 20) {
    let best = null;
    this.streetGrid.near(x, z, range, (s) => {
      const q = segDist(x, z, s[0], s[1], s[2], s[3]);
      if (!best || q.d < best.d) best = { d: q.d, x: q.x, z: q.z, hw: s[4], dx: s[2] - s[0], dz: s[3] - s[1] };
    });
    return best;
  }

  /** A random street whose midpoint is between min and max metres from (x, z). */
  randomRoadNear(x, z, min, max, rnd, filter) {
    const gx = Math.floor(x / 60), gz = Math.floor(z / 60);
    const span = Math.ceil(max / 60);
    for (let tries = 0; tries < 24; tries++) {
      const a = this.roadGrid.get(gx + Math.round((rnd() * 2 - 1) * span) + ',' + (gz + Math.round((rnd() * 2 - 1) * span)));
      if (!a) continue;
      const r = a[(rnd() * a.length) | 0];
      if (filter && !filter(r)) continue;
      const mid = along(r.pts, r.len / 2);
      const d = Math.hypot(mid.x - x, mid.z - z);
      if (d >= min && d <= max) return r;
    }
    return null;
  }

  /** The closest point on a walkable street: which street, and how far along it. */
  nearestRoadPoint(x, z) {
    let best = null;
    for (const range of [22, 70, 200]) {
      this.walkGrid.near(x, z, Math.min(range, 23.9), (sg) => {
        const q = segDist(x, z, sg[0], sg[1], sg[2], sg[3]);
        if (!best || q.d < best.d) best = { d: q.d, x: q.x, z: q.z, r: this.roads[sg[4]], sx: sg[0], sz: sg[1] };
      });
      if (best) break;
      // nothing close: look across a wider neighbourhood by brute force
      if (range >= 70) {
        for (const r of this.roads) {
          for (let k = 1; k < r.pts.length; k++) {
            const q = segDist(x, z, r.pts[k - 1][0], r.pts[k - 1][1], r.pts[k][0], r.pts[k][1]);
            if (q.d < range && (!best || q.d < best.d)) best = { d: q.d, x: q.x, z: q.z, r, sx: r.pts[k - 1][0], sz: r.pts[k - 1][1] };
          }
        }
        if (best) break;
      }
    }
    if (!best) return null;
    // distance along the street to that point
    let s = 0;
    const pts = best.r.pts;
    for (let k = 1; k < pts.length; k++) {
      if (pts[k - 1][0] === best.sx && pts[k - 1][1] === best.sz) {
        s += Math.hypot(best.x - best.sx, best.z - best.sz);
        break;
      }
      s += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
    }
    best.s = s;
    return best;
  }

  /** Points along street r between distances s0 and s1, in travel order. */
  _along(r, s0, s1) {
    const out = [], pts = r.pts, fwd = s1 >= s0;
    const lo = Math.min(s0, s1), hi = Math.max(s0, s1);
    let acc = 0;
    const at = (k, d) => {
      const l = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]) || 1, t = (d - acc) / l;
      return [pts[k - 1][0] + (pts[k][0] - pts[k - 1][0]) * t, pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * t];
    };
    for (let k = 1; k < pts.length; k++) {
      const l = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
      if (acc + l >= lo && !out.length) out.push(at(k, lo));
      if (out.length) {
        if (acc + l >= hi) {
          out.push(at(k, hi));
          break;
        }
        out.push(pts[k]);
      }
      acc += l;
    }
    return fwd ? out : out.reverse();
  }

  /** A walking route along the streets from A to B, as a list of [x, z] points. */
  route(ax, az, bx, bz) {
    const A = this.nearestRoadPoint(ax, az), B = this.nearestRoadPoint(bx, bz);
    if (!A || !B) return null;
    const end = [bx, bz];
    if (A.r === B.r) return [...this._along(A.r, A.s, B.s), end];
    // Dijkstra over junctions
    const dist = new Map(), prev = new Map(), heap = [];
    const push = (j, d, from, r) => {
      if (dist.has(j) && dist.get(j) <= d) return;
      dist.set(j, d);
      prev.set(j, { from, r });
      heap.push([d, j]);
      let i = heap.length - 1;
      while (i > 0) {
        const pi = (i - 1) >> 1;
        if (heap[pi][0] <= heap[i][0]) break;
        [heap[pi], heap[i]] = [heap[i], heap[pi]];
        i = pi;
      }
    };
    const pop = () => {
      const top = heap[0], last = heap.pop();
      if (heap.length) {
        heap[0] = last;
        let i = 0;
        for (;;) {
          const l = i * 2 + 1, r = l + 1;
          let m = i;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === i) break;
          [heap[m], heap[i]] = [heap[i], heap[m]];
          i = m;
        }
      }
      return top;
    };
    push(A.r.a, A.s, -1, A.r);
    push(A.r.b, A.r.len - A.s, -1, A.r);
    let bestEnd = null, bestCost = Infinity;
    while (heap.length) {
      const [d, j] = pop();
      if (d > dist.get(j)) continue;
      if (d >= bestCost) break;
      if (j === B.r.a && d + B.s < bestCost) (bestCost = d + B.s), (bestEnd = j);
      if (j === B.r.b && d + B.r.len - B.s < bestCost) (bestCost = d + B.r.len - B.s), (bestEnd = j);
      for (const e of this.adj.get(j) || []) push(e.end === 0 ? e.r.b : e.r.a, d + e.r.len, j, e.r);
    }
    if (bestEnd === null) return null;
    // walk the chain back from the last junction
    const legs = [];
    for (let j = bestEnd; j !== -1; ) {
      const pv = prev.get(j);
      legs.push({ j, r: pv.r, from: pv.from });
      j = pv.from;
    }
    legs.reverse();
    const out = [];
    const first = legs[0];
    out.push(...this._along(A.r, A.s, first.j === A.r.a ? 0 : A.r.len));
    for (let i = 1; i < legs.length; i++) {
      const r = legs[i].r;
      out.push(...(legs[i].j === r.b ? r.pts.slice(1) : r.pts.slice(0, -1).reverse()));
    }
    out.push(...this._along(B.r, bestEnd === B.r.a ? 0 : B.r.len, B.s));
    out.push(end);
    return out;
  }

  /** Streets leaving junction j, other than the one we arrived on. */
  exits(j, from) {
    const a = this.adj.get(j) || [];
    const out = a.filter((e) => e.r !== from);
    return out.length ? out : a;
  }
}

export { SegGrid };
