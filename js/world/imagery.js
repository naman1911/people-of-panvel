// Real satellite imagery for the ground and rooftops.
//
// Web-map tiles are fetched for the playable town, stitched into a few large
// textures, and laid over the ground. Every building roof is textured from the
// same photos, so from above the town looks like the real place.
//
// Our local coordinates are metres east (x) and south (z) of the map origin,
// which makes tile edges straight, axis-aligned lines: no reprojection needed.

import * as THREE from 'three';
import { cv, tex, N } from '../gfx/texkit.js';

const TILE = 256;
const PER = 8; // tiles per atlas side, at most (2048 px)

/** Sutherland–Hodgman: the part of a polygon inside an axis-aligned rectangle. */
function clipRect(poly, x0, x1, z0, z1) {
  const edges = [
    [(p) => p[0] >= x0, (a, b) => [x0, a[1] + ((b[1] - a[1]) * (x0 - a[0])) / (b[0] - a[0])]],
    [(p) => p[0] <= x1, (a, b) => [x1, a[1] + ((b[1] - a[1]) * (x1 - a[0])) / (b[0] - a[0])]],
    [(p) => p[1] >= z0, (a, b) => [a[0] + ((b[0] - a[0]) * (z0 - a[1])) / (b[1] - a[1]), z0]],
    [(p) => p[1] <= z1, (a, b) => [a[0] + ((b[0] - a[0]) * (z1 - a[1])) / (b[1] - a[1]), z1]],
  ];
  let out = poly;
  for (const [inside, cut] of edges) {
    const src = out;
    out = [];
    for (let i = 0; i < src.length; i++) {
      const a = src[i], b = src[(i + 1) % src.length];
      const ia = inside(a), ib = inside(b);
      if (ia) out.push(a);
      if (ia !== ib) out.push(cut(a, b));
    }
    if (out.length < 3) return null;
  }
  return out;
}

export function createImagery(cfg, tier, meta, lib, override) {
  const key = override?.key ?? cfg.key;
  const url = override?.url ?? cfg.url;
  if (!url || (url.includes('{key}') && !key)) return { enabled: false, update() {}, start() {} };

  const [LAT0, LON0] = meta.origin;
  const MX = 111320 * Math.cos((LAT0 * Math.PI) / 180), MZ = 110540;
  const z = override?.zoom ?? cfg.zoom[tier.name] ?? 17;
  const n = 2 ** z;
  const lonOf = (x) => LON0 + x / MX, latOf = (zz) => LAT0 - zz / MZ;
  const tileX = (lon) => ((lon + 180) / 360) * n;
  const tileY = (lat) => {
    const r = (lat * Math.PI) / 180;
    return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n;
  };
  const tileUrl = (tx, ty) => url.replace('{z}', z).replace('{x}', tx).replace('{y}', ty).replace('{key}', encodeURIComponent(key || ''));
  const xOfTile = (tx) => ((tx / n) * 360 - 180 - LON0) * MX;
  const zOfTile = (ty) => -((Math.atan(Math.sinh(Math.PI * (1 - (2 * ty) / n))) * 180) / Math.PI - LAT0) * MZ;

  // Cover the playable town plus a little beyond its edge.
  const pad = Math.min(tier.margin ?? 150, 160);
  const p = meta.play;
  const tx0 = Math.floor(tileX(lonOf(p.minX - pad))), tx1 = Math.floor(tileX(lonOf(p.maxX + pad)));
  const ty0 = Math.floor(tileY(latOf(p.minZ - pad))), ty1 = Math.floor(tileY(latOf(p.maxZ + pad)));
  const cols = tx1 - tx0 + 1, rows = ty1 - ty0 + 1;
  const nx = Math.ceil(cols / PER), ny = Math.ceil(rows / PER);
  const split = (count, parts) => {
    const out = [];
    let at = 0;
    for (let i = 0; i < parts; i++) {
      const size = Math.ceil((count - at) / (parts - i));
      out.push([at, size]);
      at += size;
    }
    return out;
  };

  const detail = tex(N().fine, { srgb: false });
  const atlases = [];
  for (const [cy, ah] of split(rows, ny)) {
    for (const [cx, aw] of split(cols, nx)) {
      const [canvas, g] = cv(aw * TILE, ah * TILE);
      g.fillStyle = '#8c8676'; // plain ground until the photos arrive
      g.fillRect(0, 0, canvas.width, canvas.height);
      const map = tex(canvas, { repeat: false });
      const mat = new THREE.MeshStandardMaterial({ map, roughness: 1, vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
      const a = {
        i: atlases.length, canvas, g, map, mat, dirty: false, last: 0,
        tx: tx0 + cx, ty: ty0 + cy, aw, ah,
        x0: xOfTile(tx0 + cx), x1: xOfTile(tx0 + cx + aw), z0: zOfTile(ty0 + cy), z1: zOfTile(ty0 + cy + ah),
      };
      // From above, the photo is shown as it is. Standing on it is another matter: each pixel is
      // half a metre of flattened treetop and shadow. So near a walker the ground eases to the
      // photo's own colours, blurred and lifted out of the shadows, with a fine grain on top.
      // It is still the real place, without the smears. Rooftops always keep the photo.
      const reps = (a.x1 - a.x0) / 2.2;
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uDetail = { value: detail };
        shader.uniforms.uReps = { value: reps };
        shader.uniforms.uLod = { value: Math.max(2, z - 13) }; // a blur of roughly 18 m
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vSatWorld;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vSatWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <map_pars_fragment>', '#include <map_pars_fragment>\nuniform sampler2D uDetail;\nuniform float uReps;\nuniform float uLod;\nvarying vec3 vSatWorld;')
          .replace('#include <map_fragment>', `#include <map_fragment>
#ifdef USE_MAP
  float satPhoto = 1.0;
  if (vSatWorld.y < 1.0) {
    satPhoto = max(smoothstep(22.0, 75.0, cameraPosition.y), smoothstep(90.0, 260.0, distance(cameraPosition, vSatWorld)));
    vec3 satAvg = textureLod(map, vMapUv, uLod).rgb;
    float satLum = dot(satAvg, vec3(0.2126, 0.7152, 0.0722));
    vec3 satSoft = satAvg * (clamp(satLum, 0.15, 0.42) / max(satLum, 0.02));
    diffuseColor.rgb = mix(satSoft, diffuseColor.rgb, satPhoto);
  }
  diffuseColor.rgb *= 0.78 + 0.44 * texture2D(uDetail, vMapUv * uReps).g;
#endif`);
      };
      lib['sat' + a.i] = mat;
      atlases.push(a);
    }
  }
  (lib.satMats ||= []).push(...atlases.map((a) => a.mat));

  const at = (x, zz) => {
    for (const a of atlases) if (x >= a.x0 && x < a.x1 && zz >= a.z0 && zz < a.z1) return a;
    return null;
  };
  const uv = (a, x, zz) => [(x - a.x0) / (a.x1 - a.x0), 1 - (zz - a.z0) / (a.z1 - a.z0)];
  const WHITE = [255, 255, 255];

  const im = {
    enabled: true,
    zoom: z,
    atlases,
    total: cols * rows,
    loaded: 0,
    failed: 0,
    attribution: override?.attribution ?? cfg.attribution,

    /** Lay the photo on the ground. */
    ground(m) {
      for (const a of atlases) {
        m.chunk((a.x0 + a.x1) / 2, (a.z0 + a.z1) / 2);
        // split each atlas into a few quads so chunk culling still works
        const sx = Math.max(1, Math.round(a.aw / 4)), sz = Math.max(1, Math.round(a.ah / 4));
        for (let i = 0; i < sx; i++) {
          for (let j = 0; j < sz; j++) {
            const xa = a.x0 + ((a.x1 - a.x0) * i) / sx, xb = a.x0 + ((a.x1 - a.x0) * (i + 1)) / sx;
            const za = a.z0 + ((a.z1 - a.z0) * j) / sz, zb = a.z0 + ((a.z1 - a.z0) * (j + 1)) / sz;
            m.chunk((xa + xb) / 2, (za + zb) / 2);
            m.quadUp([xa, 0.006, za], [xb, 0.006, za], [xb, 0.006, zb], [xa, 0.006, zb], uv(a, xa, za), uv(a, xb, za), uv(a, xb, zb), uv(a, xa, zb), WHITE, 'sat' + a.i);
          }
        }
      }
    },

    /** Texture a flat roof from the photo. Returns false if the roof lies outside the imagery. */
    roof(m, pts, y) {
      let done = false;
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (const q of pts) {
        x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); z0 = Math.min(z0, q[1]); z1 = Math.max(z1, q[1]);
      }
      for (const a of atlases) {
        if (x1 <= a.x0 || x0 >= a.x1 || z1 <= a.z0 || z0 >= a.z1) continue;
        const inside = x0 >= a.x0 && x1 <= a.x1 && z0 >= a.z0 && z1 <= a.z1;
        const piece = inside ? pts : clipRect(pts, a.x0, a.x1, a.z0, a.z1);
        if (!piece) continue;
        const contour = piece.map((q) => new THREE.Vector2(q[0], q[1]));
        for (const f of THREE.ShapeUtils.triangulateShape(contour, [])) {
          const A = piece[f[0]], B = piece[f[1]], C = piece[f[2]];
          m.triUp([A[0], y, A[1]], [B[0], y, B[1]], [C[0], y, C[1]], uv(a, A[0], A[1]), uv(a, B[0], B[1]), uv(a, C[0], C[1]), WHITE, 'sat' + a.i);
        }
        done = true;
      }
      return done;
    },

    /** Texture one sloping roof face (four 3-D points) from the photo. */
    slope(m, a3, b3, c3, d3) {
      const a = at((a3[0] + c3[0]) / 2, (a3[2] + c3[2]) / 2);
      if (!a) return false;
      const u = (q) => uv(a, q[0], q[2]);
      m.quadUp(a3, b3, c3, d3, u(a3), u(b3), u(c3), u(d3), WHITE, 'sat' + a.i);
      return true;
    },

    /**
     * Fetch one photo, to make sure the key and the network are good before the
     * town is built around the photos. Resolves true or false; never rejects.
     */
    probe(fx, fz, ms = 4000) {
      return new Promise((res) => {
        const img = new Image();
        const done = (ok) => {
          clearTimeout(timer);
          res(ok);
        };
        const timer = setTimeout(() => done(false), ms);
        img.crossOrigin = 'anonymous';
        img.onload = () => done(img.naturalWidth > 0);
        img.onerror = () => done(false);
        img.src = tileUrl(Math.floor(tileX(lonOf(fx))), Math.floor(tileY(latOf(fz))));
      });
    },

    /** Begin fetching photos, nearest to (fx, fz) first. */
    start(fx, fz, onDone) {
      const jobs = [];
      for (const a of atlases) {
        for (let j = 0; j < a.ah; j++) {
          for (let i = 0; i < a.aw; i++) {
            const tx = a.tx + i, ty = a.ty + j;
            const cx = xOfTile(tx + 0.5), cz = zOfTile(ty + 0.5);
            jobs.push({ a, i, j, tx, ty, d: Math.hypot(cx - fx, cz - fz) });
          }
        }
      }
      jobs.sort((p1, p2) => p1.d - p2.d);
      let active = 0, next = 0, stopped = false;
      const pump = () => {
        while (!stopped && active < 6 && next < jobs.length) {
          const job = jobs[next++];
          active++;
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.decoding = 'async';
          img.onload = () => {
            active--;
            job.a.g.drawImage(img, job.i * TILE, job.j * TILE, TILE, TILE);
            job.a.dirty = true;
            im.loaded++;
            if (im.loaded + im.failed === jobs.length) onDone?.(true);
            pump();
          };
          img.onerror = () => {
            active--;
            im.failed++;
            // if nothing at all loads, the key or the network is the problem: stop asking
            if (im.failed >= 12 && im.loaded === 0) {
              stopped = true;
              im.broken = true;
              onDone?.(false);
              return;
            }
            if (im.loaded + im.failed === jobs.length) onDone?.(im.loaded > 0);
            pump();
          };
          img.src = tileUrl(job.tx, job.ty);
        }
      };
      pump();
    },

    /** Push newly arrived photos to the graphics card, a few times a second at most. */
    update(now) {
      for (const a of atlases) {
        if (a.dirty && now - a.last > 0.45) {
          a.dirty = false;
          a.last = now;
          a.map.needsUpdate = true;
        }
      }
    },
  };
  return im;
}
