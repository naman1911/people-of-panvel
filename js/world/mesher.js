// Mesher: accumulates the whole town into per-chunk, per-material vertex
// buffers. A chunk is a square of ground; chunks outside the camera frustum
// are skipped by the renderer, so a 2 km town stays cheap to draw.

import * as THREE from 'three';
import { WORLD_UV } from '../gfx/materials.js';

const _m = new THREE.Matrix4();
const _nm = new THREE.Matrix3();
const _local = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _n = new THREE.Vector3();
const _pos = new THREE.Vector3();
const _scl = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _c = new THREE.Color();
const _tmp = new THREE.Matrix4();

const colorCache = new Map();
const cache = new Map();
function cached(key, make) {
  let g = cache.get(key);
  if (!g) {
    g = make();
    if (g.index) g = g.toNonIndexed();
    cache.set(key, g);
  }
  return g;
}
const unitBox = () => cached('box', () => new THREE.BoxGeometry(1, 1, 1));
const unitGable = () =>
  cached('gable', () => {
    const g = new THREE.BufferGeometry();
    const a = [-0.5, 0, 0.5], b = [0.5, 0, 0.5], c = [0, 1, 0.5];
    const d = [-0.5, 0, -0.5], e = [0.5, 0, -0.5], f = [0, 1, -0.5];
    g.setAttribute('position', new THREE.Float32BufferAttribute([a, b, c, e, d, f, a, c, f, a, f, d, b, e, f, b, f, c].flat(), 3));
    return g;
  });

class Buf {
  constructor() {
    this.n = 0;
    this.cap = 1536;
    this.pos = new Float32Array(this.cap * 3);
    this.nor = new Int8Array(this.cap * 3);
    this.uv = new Float32Array(this.cap * 2);
    this.col = new Uint8Array(this.cap * 3);
  }
  ensure(add) {
    if (this.n + add <= this.cap) return;
    while (this.n + add > this.cap) this.cap *= 2;
    const grow = (a, T, k) => {
      const b = new T(this.cap * k);
      b.set(a.subarray(0, this.n * k));
      return b;
    };
    this.pos = grow(this.pos, Float32Array, 3);
    this.nor = grow(this.nor, Int8Array, 3);
    this.uv = grow(this.uv, Float32Array, 2);
    this.col = grow(this.col, Uint8Array, 3);
  }
}

/** Small street-level detail: skipped by the lake mirror and hidden on far-away blocks. */
export const DETAIL = new Set(['flat', 'gloss', 'glow', 'pool', 'mark', 'bark', 'wood', 'stone', 'shop']);
function freeArray() {
  this.array = null;
}
const NO_SHADOW = new Set(['asphalt', 'paver', 'earth', 'grass', 'mark', 'pool', 'glow', 'ballast']);

export class Mesher {
  constructor(lib, chunkSize = 150, rng = Math.random) {
    this.lib = lib;
    this.cs = chunkSize;
    this.rng = rng;
    this.chunks = new Map();
    this.stack = [new THREE.Matrix4()];
    this.cur = null;
    this.release = false;
    this.chunk(0, 0);
  }

  /** Everything added from now on belongs to the chunk containing (x, z). */
  chunk(x, z) {
    const k = Math.floor(x / this.cs) + ',' + Math.floor(z / this.cs);
    let c = this.chunks.get(k);
    if (!c) this.chunks.set(k, (c = new Map()));
    this.cur = c;
    return this;
  }
  _buf(layer) {
    if (layer === 'metal') layer = 'gloss';
    else if (layer === 'glassDark') layer = 'gloss';
    let b = this.cur.get(layer);
    if (!b) this.cur.set(layer, (b = new Buf()));
    return b;
  }
  get top() {
    return this.stack[this.stack.length - 1];
  }
  /** Run fn inside a local frame at (x,y,z), rotated ry about Y. */
  at(x, y, z, ry, fn, s = 1) {
    _local.compose(_pos.set(x, y, z), _q.setFromEuler(_e.set(0, ry || 0, 0)), _scl.set(s, s, s));
    this.stack.push(this.top.clone().multiply(_local));
    fn(this);
    this.stack.pop();
    return this;
  }

  _color(color, jitter) {
    let c = colorCache.get(color);
    if (!c) {
      _c.set(color);
      colorCache.set(color, (c = [_c.r * 255, _c.g * 255, _c.b * 255]));
    }
    const k = jitter ? 1 + (this.rng() - 0.5) * jitter : 1;
    return [Math.min(255, c[0] * k) | 0, Math.min(255, c[1] * k) | 0, Math.min(255, c[2] * k) | 0];
  }

  /** Append a cached geometry, transformed by `local` within the current frame. */
  add(geo, local, color, layer = 'flat', o) {
    if (layer === 'glassDark') color = '#141d24';
    const b = this._buf(layer);
    const pa = geo.attributes.position.array, na = geo.attributes.normal?.array, ua = geo.attributes.uv?.array;
    const count = pa.length / 3;
    b.ensure(count);
    _m.multiplyMatrices(this.top, local);
    const e = _m.elements;
    const m00 = e[0], m01 = e[4], m02 = e[8], m03 = e[12], m10 = e[1], m11 = e[5], m12 = e[9], m13 = e[13], m20 = e[2], m21 = e[6], m22 = e[10], m23 = e[14];
    const smooth = !!(o && o.smooth && na);
    let n00 = 0, n01 = 0, n02 = 0, n10 = 0, n11 = 0, n12 = 0, n20 = 0, n21 = 0, n22 = 0;
    if (smooth) {
      const ne = _nm.getNormalMatrix(_m).elements;
      n00 = ne[0]; n01 = ne[3]; n02 = ne[6]; n10 = ne[1]; n11 = ne[4]; n12 = ne[7]; n20 = ne[2]; n21 = ne[5]; n22 = ne[8];
    }
    const [r, g, bl] = this._color(color, o?.jitter);
    const world = WORLD_UV.has(layer);
    const s = world ? this.lib[layer].userData.uvScale : 1;
    const P = b.pos, Nn = b.nor, U = b.uv, C = b.col;
    let vi = b.n;
    for (let i = 0; i < count; i += 3) {
      const base = vi * 3, src = i * 3;
      for (let k = 0; k < 9; k += 3) {
        const x = pa[src + k], y = pa[src + k + 1], z = pa[src + k + 2];
        P[base + k] = m00 * x + m01 * y + m02 * z + m03;
        P[base + k + 1] = m10 * x + m11 * y + m12 * z + m13;
        P[base + k + 2] = m20 * x + m21 * y + m22 * z + m23;
      }
      const ax = P[base], ay = P[base + 1], az = P[base + 2];
      const e1x = P[base + 3] - ax, e1y = P[base + 4] - ay, e1z = P[base + 5] - az;
      const e2x = P[base + 6] - ax, e2y = P[base + 7] - ay, e2z = P[base + 8] - az;
      let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
      const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      nx /= nl; ny /= nl; nz /= nl;
      const anx = nx < 0 ? -nx : nx, any = ny < 0 ? -ny : ny, anz = nz < 0 ? -nz : nz;
      const uvMode = any >= anx && any >= anz ? 0 : anx >= anz ? 1 : 2;
      for (let k = 0; k < 3; k++) {
        const v = vi + k, v3 = v * 3, v2 = v * 2;
        if (smooth) {
          const sx = na[src + k * 3], sy = na[src + k * 3 + 1], sz = na[src + k * 3 + 2];
          let qx = n00 * sx + n01 * sy + n02 * sz, qy = n10 * sx + n11 * sy + n12 * sz, qz = n20 * sx + n21 * sy + n22 * sz;
          const ql = 127 / (Math.sqrt(qx * qx + qy * qy + qz * qz) || 1);
          Nn[v3] = qx * ql; Nn[v3 + 1] = qy * ql; Nn[v3 + 2] = qz * ql;
        } else {
          Nn[v3] = nx * 127; Nn[v3 + 1] = ny * 127; Nn[v3 + 2] = nz * 127;
        }
        if (world) {
          const px = P[v3], py = P[v3 + 1], pz = P[v3 + 2];
          if (uvMode === 0) { U[v2] = px * s; U[v2 + 1] = -pz * s; }
          else if (uvMode === 1) { U[v2] = pz * s; U[v2 + 1] = py * s; }
          else { U[v2] = px * s; U[v2 + 1] = py * s; }
        } else if (ua) {
          U[v2] = ua[(i + k) * 2];
          U[v2 + 1] = ua[(i + k) * 2 + 1];
        }
        C[v3] = r; C[v3 + 1] = g; C[v3 + 2] = bl;
      }
      vi += 3;
    }
    b.n = vi;
    return this;
  }

  /** One triangle in world space with explicit UVs (ignored on world-UV layers). */
  tri(p0, p1, p2, u0, u1, u2, color, layer) {
    const b = this._buf(layer);
    b.ensure(3);
    const [r, g, bl] = typeof color === 'object' && color.length ? color : this._color(color);
    const world = WORLD_UV.has(layer);
    const s = world ? this.lib[layer].userData.uvScale : 1;
    const e1x = p1[0] - p0[0], e1y = p1[1] - p0[1], e1z = p1[2] - p0[2];
    const e2x = p2[0] - p0[0], e2y = p2[1] - p0[1], e2z = p2[2] - p0[2];
    let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl;
    ny /= nl;
    nz /= nl;
    const anx = Math.abs(nx), any = Math.abs(ny), anz = Math.abs(nz);
    const ps = [p0, p1, p2], us = [u0, u1, u2];
    for (let k = 0; k < 3; k++) {
      const v = b.n + k, p = ps[k];
      b.pos[v * 3] = p[0];
      b.pos[v * 3 + 1] = p[1];
      b.pos[v * 3 + 2] = p[2];
      b.nor[v * 3] = nx * 127;
      b.nor[v * 3 + 1] = ny * 127;
      b.nor[v * 3 + 2] = nz * 127;
      if (world) {
        if (any >= anx && any >= anz) {
          b.uv[v * 2] = p[0] * s;
          b.uv[v * 2 + 1] = -p[2] * s;
        } else if (anx >= anz) {
          b.uv[v * 2] = p[2] * s;
          b.uv[v * 2 + 1] = p[1] * s;
        } else {
          b.uv[v * 2] = p[0] * s;
          b.uv[v * 2 + 1] = p[1] * s;
        }
      } else if (us[k]) {
        b.uv[v * 2] = us[k][0];
        b.uv[v * 2 + 1] = us[k][1];
      }
      b.col[v * 3] = r;
      b.col[v * 3 + 1] = g;
      b.col[v * 3 + 2] = bl;
    }
    b.n += 3;
    return this;
  }

  /** Quad p0..p3 (counter-clockwise seen from the front). */
  quad(p0, p1, p2, p3, u0, u1, u2, u3, color, layer) {
    const c = typeof color === 'object' && color.length ? color : this._color(color);
    this.tri(p0, p1, p2, u0, u1, u2, c, layer);
    this.tri(p0, p2, p3, u0, u2, u3, c, layer);
    return this;
  }

  /** Triangle that always faces upward, whatever the input winding. */
  triUp(p0, p1, p2, u0, u1, u2, color, layer) {
    const ny = (p1[2] - p0[2]) * (p2[0] - p0[0]) - (p1[0] - p0[0]) * (p2[2] - p0[2]);
    return ny >= 0 ? this.tri(p0, p1, p2, u0, u1, u2, color, layer) : this.tri(p0, p2, p1, u0, u2, u1, color, layer);
  }
  quadUp(p0, p1, p2, p3, u0, u1, u2, u3, color, layer) {
    const c = typeof color === 'object' && color.length ? color : this._color(color);
    this.triUp(p0, p1, p2, u0, u1, u2, c, layer);
    this.triUp(p0, p2, p3, u0, u2, u3, c, layer);
    return this;
  }

  rgb(color, jitter) {
    return this._color(color, jitter);
  }

  _trs(x, y, z, sx, sy, sz, o) {
    _e.set(o?.rx || 0, o?.ry || 0, o?.rz || 0);
    return _local.compose(_pos.set(x, y, z), _q.setFromEuler(_e), _scl.set(sx, sy, sz));
  }
  _based(x, y, z, sx, h, sz, o) {
    // rotate about the base centre, not the middle
    const m = this._trs(x, y, z, 1, 1, 1, o).clone();
    return m.multiply(_tmp.compose(_pos.set(0, h / 2, 0), _q.identity(), _scl.set(sx, h, sz)));
  }

  /** Box whose base centre sits at (x,y,z). */
  box(x, y, z, w, h, d, color, layer, o) {
    const m = o && (o.rx || o.rz) ? this._based(x, y, z, w, h, d, o) : this._trs(x, y + h / 2, z, w, h, d, o);
    return this.add(unitBox(), m, color, layer, o);
  }

  /** Vertical cylinder or frustum: rb bottom radius, rt top radius. */
  cyl(x, y, z, rb, rt, h, color, layer, o) {
    const seg = o?.seg || 8;
    let geo, sx;
    if (rb <= 0) {
      geo = cached(`cylI|${seg}`, () => new THREE.CylinderGeometry(1, 0, 1, seg, 1));
      sx = rt;
    } else {
      const ratio = Math.round((rt / rb) * 40) / 40;
      geo = cached(`cyl|${ratio}|${seg}|${o?.open ? 1 : 0}`, () => new THREE.CylinderGeometry(ratio, 1, 1, seg, 1, !!o?.open));
      sx = rb;
    }
    const m = o && (o.rx || o.rz) ? this._based(x, y, z, sx, h, sx, o) : this._trs(x, y + h / 2, z, sx, h, sx, o);
    return this.add(geo, m, color, layer, { smooth: seg >= 8, ...o });
  }

  cone(x, y, z, r, h, color, layer, o) {
    return this.cyl(x, y, z, r, 0, h, color, layer, o);
  }

  /** Rounded blob centred at (x,y,z). */
  ball(x, y, z, r, color, layer, o) {
    const det = o?.detail ?? 1;
    const geo = cached(`ico|${det}`, () => new THREE.IcosahedronGeometry(1, det));
    return this.add(geo, this._trs(x, y, z, r * (o?.sx || 1), r * (o?.sy || 1), r * (o?.sz || 1), o), color, layer, { smooth: true, ...o });
  }

  /** Upper hemisphere with its base at y. */
  dome(x, y, z, r, color, layer, o) {
    const seg = o?.seg || 12;
    const geo = cached(`dome|${seg}`, () => new THREE.SphereGeometry(1, seg, 6, 0, Math.PI * 2, 0, Math.PI / 2));
    return this.add(geo, this._trs(x, y, z, r, r * (o?.sy || 1), r, o), color, layer, { smooth: true, ...o });
  }

  /** Gable roof: base w x d at y, ridge along local Z, apex height h. */
  gable(x, y, z, w, h, d, color, layer, o) {
    return this.add(unitGable(), this._trs(x, y, z, w, h, d, o), color, layer, o);
  }

  /** Four-sided pyramid. */
  pyramid(x, y, z, w, h, d, color, layer, o) {
    const geo = cached('pyr', () => new THREE.CylinderGeometry(0, Math.SQRT1_2, 1, 4, 1).rotateY(Math.PI / 4).translate(0, 0.5, 0));
    return this.add(geo, this._trs(x, y, z, w, h, d, o), color, layer, o);
  }

  /** Flat horizontal rectangle at height y. */
  plane(x, y, z, w, d, color, layer, o) {
    const geo = cached('plane', () => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2));
    return this.add(geo, this._trs(x, y, z, w, 1, d, o), color, layer, o);
  }

  /** Flat disc at height y. */
  disc(x, y, z, r, color, layer, o) {
    const seg = o?.seg || 20;
    const geo = cached(`disc|${seg}`, () => new THREE.CircleGeometry(1, seg).rotateX(-Math.PI / 2));
    return this.add(geo, this._trs(x, y, z, r * (o?.sx || 1), 1, r * (o?.sz || 1), o), color, layer, o);
  }

  /** Flat ring between radii r0 and r1. */
  ring(x, y, z, r0, r1, color, layer, o) {
    const seg = o?.seg || 32;
    const ratio = Math.round((r0 / r1) * 100) / 100;
    const geo = cached(`ring|${ratio}|${seg}`, () => new THREE.RingGeometry(ratio, 1, seg).rotateX(-Math.PI / 2));
    return this.add(geo, this._trs(x, y, z, r1, 1, r1, o), color, layer, o);
  }

  /** A beam between two points (rails, wires, railings). */
  beam(x1, y1, z1, x2, y2, z2, w, h, color, layer, o) {
    const dx = x2 - x1, dy = y2 - y1, dz = z2 - z1;
    const len = Math.hypot(dx, dy, dz);
    if (len < 1e-4) return this;
    // orient: local X along the beam, keep local Y as upright as possible
    const yaw = Math.atan2(-dz, dx), pitch = Math.asin(dy / len);
    _e.set(0, yaw, pitch, 'YZX');
    _local.compose(_pos.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2), _q.setFromEuler(_e), _scl.set(len, h, w));
    _e.order = 'XYZ';
    return this.add(unitBox(), _local, color, layer, o);
  }

  /** Horizontal polygon from [[x,z],...] at height y, facing up. */
  poly(points, y, color, layer) {
    const contour = points.map((p) => new THREE.Vector2(p[0], p[1]));
    const faces = THREE.ShapeUtils.triangulateShape(contour, []);
    const c = this._color(color);
    for (const f of faces) {
      let a = points[f[0]], b = points[f[1]], d = points[f[2]];
      // make it face +Y whatever the input winding
      const cross = (b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0]);
      if (cross < 0) [b, d] = [d, b];
      this.tri([a[0], y, a[1]], [d[0], y, d[1]], [b[0], y, b[1]], null, null, null, c, layer);
    }
    return this;
  }

  /** Turn the buffers into meshes. One group per chunk for frustum culling. */
  build(shadows = true) {
    const root = new THREE.Group();
    let tris = 0, meshes = 0;
    const byLayer = {};
    for (const [key, layers] of this.chunks) {
      const g = new THREE.Group();
      g.name = 'chunk:' + key;
      for (const [layer, b] of layers) {
        if (!b.n) continue;
        const mat = this.lib[layer];
        if (!mat) throw new Error('No material for layer ' + layer);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(b.pos.subarray(0, b.n * 3), 3));
        geo.setAttribute('normal', new THREE.BufferAttribute(b.nor.subarray(0, b.n * 3), 3, true));
        geo.setAttribute('uv', new THREE.BufferAttribute(b.uv.subarray(0, b.n * 2), 2));
        geo.setAttribute('color', new THREE.BufferAttribute(b.col.subarray(0, b.n * 3), 3, true));
        geo.computeBoundingSphere();
        geo.computeBoundingBox();
        // The town never changes, so drop the JS copy of each buffer once it is on the GPU.
        if (this.release) for (const k in geo.attributes) geo.attributes[k].onUpload(freeArray);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.name = layer;
        mesh.castShadow = shadows && !NO_SHADOW.has(layer);
        mesh.receiveShadow = layer !== 'glow' && layer !== 'pool';
        if (layer === 'pool') mesh.renderOrder = 3;
        if (DETAIL.has(layer)) {
          if (layer !== 'shop' && layer !== 'stone') mesh.layers.set(1);
          mesh.userData.detail = true;
        }
        mesh.matrixAutoUpdate = false;
        g.add(mesh);
        tris += b.n / 3;
        byLayer[layer] = (byLayer[layer] || 0) + b.n / 3;
        meshes++;
      }
      g.matrixAutoUpdate = false;
      const [ix, iz] = key.split(',').map(Number);
      g.userData.cx = (ix + 0.5) * this.cs;
      g.userData.cz = (iz + 0.5) * this.cs;
      root.add(g);
    }
    this.chunks.clear();
    root.userData.stats = { tris, meshes, byLayer };
    return root;
  }
}
