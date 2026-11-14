// Painted and lit signboards: station nameboards, stall names, stand signs.
// Each is a small textured plane; a town needs only a few dozen.

import * as THREE from 'three';
import { cv, tex } from '../gfx/texkit.js';

const FONT = '"Baloo 2","Mukta","Noto Sans Devanagari",sans-serif';
export const signGroup = new THREE.Group();
signGroup.name = 'signs';
const lit = [];

/**
 * lines: [{ text, size (px at 256 px/m), color, weight }]
 * o: { w, h (metres), bg, border, x, y, z, ry, glow (0..1), double }
 */
export function addSign(lines, o) {
  const ppm = o.ppm || 128;
  const W = Math.max(32, Math.round(o.w * ppm)), H = Math.max(32, Math.round(o.h * ppm));
  const [c, g] = cv(W, H);
  g.fillStyle = o.bg || '#f2c21a';
  g.fillRect(0, 0, W, H);
  if (o.border) {
    g.strokeStyle = o.border;
    g.lineWidth = Math.max(3, H * 0.04);
    g.strokeRect(g.lineWidth, g.lineWidth, W - g.lineWidth * 2, H - g.lineWidth * 2);
  }
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const total = lines.reduce((s, l) => s + l.size * 1.12, 0);
  let y = (H - total) / 2;
  for (const l of lines) {
    let size = l.size;
    g.font = `${l.weight || 800} ${size}px ${FONT}`;
    while (g.measureText(l.text).width > W * 0.92 && size > 8) g.font = `${l.weight || 800} ${--size}px ${FONT}`;
    g.fillStyle = l.color || '#111';
    g.fillText(l.text, W / 2, y + l.size * 0.56);
    y += l.size * 1.12;
  }
  const map = tex(c, { repeat: false });
  const mat = new THREE.MeshStandardMaterial({ map, roughness: 0.7, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 0, side: o.double ? THREE.DoubleSide : THREE.FrontSide });
  mat.userData.glow = o.glow ?? 0.5;
  lit.push(mat);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(o.w, o.h), mat);
  mesh.position.set(o.x, o.y, o.z);
  mesh.rotation.y = o.ry || 0;
  mesh.castShadow = false;
  signGroup.add(mesh);
  return mesh;
}

export function setSignNight(n) {
  for (const m of lit) m.emissiveIntensity = 0.04 + n * m.userData.glow * 1.6;
}
