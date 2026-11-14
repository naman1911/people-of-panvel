// 2-D geometry helpers on the ground plane. Points are [x, z].

export function unpack(flat) {
  const out = new Array(flat.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = [flat[i * 2] / 10, flat[i * 2 + 1] / 10];
  return out;
}

export function polyArea(p) {
  let a = 0;
  for (let i = 0, n = p.length; i < n; i++) {
    const q = p[(i + 1) % n];
    a += p[i][0] * q[1] - q[0] * p[i][1];
  }
  return a / 2;
}

export function centroid(p) {
  let x = 0, z = 0;
  for (const q of p) (x += q[0]), (z += q[1]);
  return [x / p.length, z / p.length];
}

export function bbox(p) {
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const q of p) {
    if (q[0] < x0) x0 = q[0];
    if (q[0] > x1) x1 = q[0];
    if (q[1] < z0) z0 = q[1];
    if (q[1] > z1) z1 = q[1];
  }
  return [x0, z0, x1, z1];
}

export function pointInPoly(x, z, p) {
  let inside = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const xi = p[i][0], zi = p[i][1], xj = p[j][0], zj = p[j][1];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/** Distance from point to segment, plus the closest point and parameter. */
export function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const l2 = dx * dx + dz * dz;
  const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2)) : 0;
  const cx = ax + dx * t, cz = az + dz * t;
  return { d: Math.hypot(px - cx, pz - cz), x: cx, z: cz, t };
}

export function polyLen(p) {
  let l = 0;
  for (let i = 1; i < p.length; i++) l += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
  return l;
}

/** Point and heading at distance s along a polyline. */
export function along(p, s) {
  for (let i = 1; i < p.length; i++) {
    const dx = p[i][0] - p[i - 1][0], dz = p[i][1] - p[i - 1][1];
    const l = Math.hypot(dx, dz);
    if (s <= l || i === p.length - 1) {
      const t = l ? Math.min(1, s / l) : 0;
      return { x: p[i - 1][0] + dx * t, z: p[i - 1][1] + dz * t, dx: l ? dx / l : 1, dz: l ? dz / l : 0, i: i - 1 };
    }
    s -= l;
  }
  return { x: p[0][0], z: p[0][1], dx: 1, dz: 0, i: 0 };
}

/**
 * Left and right edges of a ribbon of width w along a polyline, mitred at
 * the corners. Returns { L, R } arrays of [x, z].
 */
export function ribbon(p, w) {
  const n = p.length, L = new Array(n), R = new Array(n);
  const hw = w / 2;
  for (let i = 0; i < n; i++) {
    const a = p[Math.max(0, i - 1)], b = p[i], c = p[Math.min(n - 1, i + 1)];
    let d1x = b[0] - a[0], d1z = b[1] - a[1], d2x = c[0] - b[0], d2z = c[1] - b[1];
    let l1 = Math.hypot(d1x, d1z), l2 = Math.hypot(d2x, d2z);
    if (l1 < 1e-6) (d1x = d2x), (d1z = d2z), (l1 = l2);
    if (l2 < 1e-6) (d2x = d1x), (d2z = d1z), (l2 = l1);
    if (l1 < 1e-6) {
      L[i] = R[i] = b;
      continue;
    }
    d1x /= l1; d1z /= l1; d2x /= l2; d2z /= l2;
    let tx = d1x + d2x, tz = d1z + d2z;
    const tl = Math.hypot(tx, tz);
    if (tl < 1e-4) (tx = d1x), (tz = d1z);
    else (tx /= tl), (tz /= tl);
    // normal to the left of travel
    const nx = tz, nz = -tx;
    const cos = Math.max(0.35, tx * d1x + tz * d1z);
    const m = hw / cos;
    L[i] = [b[0] + nx * m, b[1] + nz * m];
    R[i] = [b[0] - nx * m, b[1] - nz * m];
  }
  return { L, R };
}

/** Oriented bounding rectangle aligned to the polygon's longest edge. */
export function orientedBox(p) {
  let best = 0, ax = 1, az = 0;
  for (let i = 0; i < p.length; i++) {
    const q = p[(i + 1) % p.length];
    const dx = q[0] - p[i][0], dz = q[1] - p[i][1];
    const l = Math.hypot(dx, dz);
    if (l > best) (best = l), (ax = dx / l), (az = dz / l);
  }
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (const q of p) {
    const u = q[0] * ax + q[1] * az, v = -q[0] * az + q[1] * ax;
    if (u < u0) u0 = u;
    if (u > u1) u1 = u;
    if (v < v0) v0 = v;
    if (v > v1) v1 = v;
  }
  const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2;
  return { cx: cu * ax - cv * az, cz: cu * az + cv * ax, ax, az, len: u1 - u0, wid: v1 - v0, angle: Math.atan2(-az, ax) };
}

/** Uniform grid of line segments for collision and nearest-edge queries. */
export class SegGrid {
  constructor(cell = 16) {
    this.cell = cell;
    this.map = new Map();
    this.count = 0;
  }
  add(ax, az, bx, bz, tag = 0) {
    const c = this.cell;
    const x0 = Math.floor(Math.min(ax, bx) / c), x1 = Math.floor(Math.max(ax, bx) / c);
    const z0 = Math.floor(Math.min(az, bz) / c), z1 = Math.floor(Math.max(az, bz) / c);
    const s = [ax, az, bx, bz, tag];
    for (let gx = x0; gx <= x1; gx++)
      for (let gz = z0; gz <= z1; gz++) {
        const k = gx * 73856093 ^ gz * 19349663;
        let a = this.map.get(k);
        if (!a) this.map.set(k, (a = []));
        a.push(s);
      }
    this.count++;
  }
  addPoly(p, tag = 0, close = true) {
    const n = p.length;
    for (let i = 0; i < (close ? n : n - 1); i++) {
      const q = p[(i + 1) % n];
      this.add(p[i][0], p[i][1], q[0], q[1], tag);
    }
  }
  /** Call fn(seg) for segments near (x, z) within radius r (r must be < cell). */
  near(x, z, r, fn) {
    const c = this.cell;
    const x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c);
    const z0 = Math.floor((z - r) / c), z1 = Math.floor((z + r) / c);
    for (let gx = x0; gx <= x1; gx++)
      for (let gz = z0; gz <= z1; gz++) {
        const a = this.map.get(gx * 73856093 ^ gz * 19349663);
        if (a) for (let i = 0; i < a.length; i++) fn(a[i]);
      }
  }
  /** Push a circle out of any walls. Mutates and returns pos {x,z}; true if it touched. */
  resolve(pos, r) {
    let hit = false;
    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      this.near(pos.x, pos.z, r, (s) => {
        const q = segDist(pos.x, pos.z, s[0], s[1], s[2], s[3]);
        if (q.d < r) {
          let nx = pos.x - q.x, nz = pos.z - q.z;
          let l = Math.hypot(nx, nz);
          if (l < 1e-5) {
            // sitting exactly on the wall: push along its normal
            nx = -(s[3] - s[1]);
            nz = s[2] - s[0];
            l = Math.hypot(nx, nz) || 1;
          }
          pos.x = q.x + (nx / l) * r;
          pos.z = q.z + (nz / l) * r;
          moved = hit = true;
        }
      });
      if (!moved) break;
    }
    return hit;
  }
  /** Does the straight path a→b cross any wall? (used for camera and NPC checks) */
  blocked(ax, az, bx, bz) {
    let out = false;
    const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / (this.cell * 0.9)));
    for (let i = 0; i <= steps && !out; i++) {
      const t = i / steps;
      this.near(ax + (bx - ax) * t, az + (bz - az) * t, this.cell * 0.5, (s) => {
        if (!out && segCross(ax, az, bx, bz, s[0], s[1], s[2], s[3])) out = true;
      });
    }
    return out;
  }
  /** Parameter t in [0,1] of the first wall hit along a→b, or 1 if clear. */
  cast(ax, az, bx, bz) {
    let best = 1;
    const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / (this.cell * 0.9)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      this.near(ax + (bx - ax) * t, az + (bz - az) * t, this.cell * 0.5, (s) => {
        const u = segHit(ax, az, bx, bz, s[0], s[1], s[2], s[3]);
        if (u < best) best = u;
      });
    }
    return best;
  }
}

function segCross(ax, az, bx, bz, cx, cz, dx, dz) {
  return segHit(ax, az, bx, bz, cx, cz, dx, dz) < 1;
}
function segHit(ax, az, bx, bz, cx, cz, dx, dz) {
  const rx = bx - ax, rz = bz - az, sx = dx - cx, sz = dz - cz;
  const den = rx * sz - rz * sx;
  if (Math.abs(den) < 1e-9) return 1;
  const t = ((cx - ax) * sz - (cz - az) * sx) / den;
  const u = ((cx - ax) * rz - (cz - az) * rx) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : 1;
}

/** Grid of polygons for fast point-in-any-polygon tests. */
export class PolyGrid {
  constructor(cell = 40) {
    this.cell = cell;
    this.map = new Map();
  }
  add(p, tag) {
    const [x0, z0, x1, z1] = bbox(p);
    const c = this.cell;
    const e = { p, tag, x0, z0, x1, z1 };
    for (let gx = Math.floor(x0 / c); gx <= Math.floor(x1 / c); gx++)
      for (let gz = Math.floor(z0 / c); gz <= Math.floor(z1 / c); gz++) {
        const k = gx * 73856093 ^ gz * 19349663;
        let a = this.map.get(k);
        if (!a) this.map.set(k, (a = []));
        a.push(e);
      }
    return e;
  }
  find(x, z, pad = 0) {
    const a = this.map.get(Math.floor(x / this.cell) * 73856093 ^ Math.floor(z / this.cell) * 19349663);
    if (!a) return null;
    for (const e of a) {
      if (x < e.x0 - pad || x > e.x1 + pad || z < e.z0 - pad || z > e.z1 + pad) continue;
      if (pad ? true : pointInPoly(x, z, e.p)) return e;
    }
    return null;
  }
}
