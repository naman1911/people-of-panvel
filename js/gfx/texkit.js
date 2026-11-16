// Canvas helpers for procedural textures: tileable noise, blending, and
// height-to-normal conversion. Everything here is generated at load time,
// so the project ships no image files.

import * as THREE from 'three';
import { mulberry32 } from '../util.js';

export let maxAniso = 8;
export const setMaxAniso = (n) => (maxAniso = Math.min(16, n || 1));

export function cv(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

/** Tileable fractal value noise as a greyscale canvas. */
export function noiseCanvas(size, cells, octaves, seed, contrast = 1) {
  const rnd = mulberry32(seed);
  const [c, g] = cv(size);
  const img = g.createImageData(size, size);
  const d = img.data;
  const grids = [];
  for (let o = 0; o < octaves; o++) {
    const n = cells << o;
    const a = new Float32Array(n * n);
    for (let i = 0; i < a.length; i++) a[i] = rnd();
    grids.push([n, a]);
  }
  let i = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let v = 0, amp = 0.5, tot = 0;
      for (let o = 0; o < grids.length; o++) {
        const n = grids[o][0], a = grids[o][1];
        const fx = (x / size) * n, fy = (y / size) * n;
        const x0 = fx | 0, y0 = fy | 0;
        const tx = fx - x0, ty = fy - y0;
        const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
        const x1 = (x0 + 1) % n, y1 = (y0 + 1) % n;
        const top = a[y0 * n + x0] + (a[y0 * n + x1] - a[y0 * n + x0]) * sx;
        const bot = a[y1 * n + x0] + (a[y1 * n + x1] - a[y1 * n + x0]) * sx;
        v += amp * (top + (bot - top) * sy);
        tot += amp;
        amp *= 0.5;
      }
      v = (v / tot - 0.5) * contrast + 0.5;
      const b = v < 0 ? 0 : v > 1 ? 255 : (v * 255) | 0;
      d[i] = d[i + 1] = d[i + 2] = b;
      d[i + 3] = 255;
      i += 4;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** Pure per-pixel speckle. */
export function speckleCanvas(size, seed, lo = 90, hi = 165) {
  const rnd = mulberry32(seed);
  const [c, g] = cv(size);
  const img = g.createImageData(size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const b = (lo + rnd() * (hi - lo)) | 0;
    d[i] = d[i + 1] = d[i + 2] = b;
    d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

let _n = null;
/** Shared noise sources, built once. */
export function N() {
  if (_n) return _n;
  const low = noiseCanvas(256, 2, 5, 11, 1.5);
  const mid = noiseCanvas(256, 8, 4, 23, 1.6);
  const hi = noiseCanvas(256, 32, 2, 37, 1.5);
  const fine = speckleCanvas(256, 41);
  // Vertical streaks: 1-D noise stretched downwards (rain stains on walls).
  const [streak, sg] = cv(256);
  const src = noiseCanvas(256, 32, 3, 53, 2.2);
  sg.drawImage(src, 0, 0, 256, 6, 0, 0, 256, 256);
  sg.globalAlpha = 0.35;
  sg.drawImage(mid, 0, 0);
  _n = { low, mid, hi, fine, streak };
  return _n;
}

/** Blend a tiling noise canvas over the whole context. */
export function blend(g, src, mode, alpha, scale = 1, w = g.canvas.width, h = g.canvas.height) {
  g.save();
  g.globalCompositeOperation = mode;
  g.globalAlpha = alpha;
  const p = g.createPattern(src, 'repeat');
  if (scale !== 1) p.setTransform(new DOMMatrix().scale(scale, scale));
  g.fillStyle = p;
  g.fillRect(0, 0, w, h);
  g.restore();
}

let wantNormals = true;
const noop = () => sink;
const sink = new Proxy(noop, {
  get: (t, k) => (k === 'canvas' ? { width: 1, height: 1, getContext: () => sink } : k === Symbol.toPrimitive ? () => 0 : sink),
  set: () => true,
  apply: () => sink,
});
/** A canvas + context for a height map. When normal maps are off this is a sink that ignores all drawing. */
export function heightCv(w, h = w) {
  if (wantNormals) return cv(w, h);
  return [sink.canvas, sink];
}
export const normalsOn = () => wantNormals;
/** Turn normal-map generation off (phones). Generators then return null for normal maps. */
export const setNormals = (on) => (wantNormals = on);

/** Tangent-space normal map from a greyscale height canvas (wraps at edges). */
export function normalFromHeight(hc, strength = 2) {
  if (!wantNormals) return null;
  const w = hc.width, h = hc.height;
  const src = hc.getContext('2d').getImageData(0, 0, w, h).data;
  const [c, g] = cv(w, h);
  const img = g.createImageData(w, h);
  const d = new Uint32Array(img.data.buffer);
  const k = strength / 255;
  for (let y = 0; y < h; y++) {
    const up = ((y + h - 1) % h) * w, dn = ((y + 1) % h) * w, row = y * w;
    for (let x = 0; x < w; x++) {
      const l = x === 0 ? w - 1 : x - 1, r = x === w - 1 ? 0 : x + 1;
      const dx = (src[(row + l) << 2] - src[(row + r) << 2]) * k;
      const dy = (src[(up + x) << 2] - src[(dn + x) << 2]) * k;
      const il = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      // little-endian RGBA
      d[row + x] = 0xff000000 | (((il * 0.5 + 0.5) * 255) << 16) | (((-dy * il * 0.5 + 0.5) * 255) << 8) | ((dx * il * 0.5 + 0.5) * 255);
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** Half-size copy of a canvas (used to shrink textures on phones). */
export function shrink(src, factor = 2) {
  const [c, g] = cv(Math.max(1, src.width / factor) | 0, Math.max(1, src.height / factor) | 0);
  g.imageSmoothingQuality = 'high';
  g.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

/**
 * Quieten a texture by washing it towards its own average colour, so a street
 * or a lawn reads as one clean surface with only a hint of grain.
 */
export function calm(canvas, amount) {
  const [, one] = cv(1, 1);
  one.drawImage(canvas, 0, 0, 1, 1);
  const [r, g, b] = one.getImageData(0, 0, 1, 1).data;
  const ctx = canvas.getContext('2d');
  ctx.globalAlpha = amount;
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = 1;
  return canvas;
}

export function tex(canvas, { srgb = true, repeat = true, aniso = true, mips = true } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = aniso ? maxAniso : 1;
  t.generateMipmaps = mips;
  t.minFilter = mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  return t;
}

export const rgba = (r, g, b, a = 1) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;
export const grey = (v, a = 1) => rgba(v, v, v, a);
export { mulberry32 };
