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

  /** Streets leaving junction j, other than the one we arrived on. */
  exits(j, from) {
    const a = this.adj.get(j) || [];
    const out = a.filter((e) => e.r !== from);
    return out.length ? out : a;
  }
}

export { SegGrid };
