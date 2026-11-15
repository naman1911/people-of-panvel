// The material library. Every surface in town is one of these, so a whole
// neighbourhood batches into a handful of draw calls.

import * as THREE from 'three';
import * as SF from './surfaces.js';
import { FACADES, shopAtlas } from './facades.js';
import { tex, shrink, setNormals } from './texkit.js';

/**
 * Each entry: [surface generator, metres per texture repeat, roughness, options].
 * Geometry on these layers gets world-space UVs automatically.
 */
const SURFACES = {
  asphalt: [SF.asphalt, 7, 0.92, { wet: true, puddles: true }],
  paver: [SF.pavers, 3.2, 0.88, { wet: true }],
  concrete: [SF.concrete, 5.12, 0.9, { wet: true }],
  earth: [SF.earth, 14, 1, { wet: true }],
  grass: [SF.grass, 6, 1, {}],
  plaster: [SF.plaster, 5, 0.92, {}],
  terrace: [SF.terrace, 8, 0.9, { wet: true }],
  tile: [SF.clayTiles, 2.56, 0.8, {}],
  tin: [SF.tinSheet, 2.56, 0.55, { metalness: 0.35 }],
  stone: [SF.stone, 2.56, 0.88, {}],
  wood: [SF.wood, 2, 0.8, {}],
  leaf: [SF.leaves, 2.2, 0.9, { normalScale: 1.6 }],
  bark: [SF.bark, 1.5, 0.95, {}],
};

export function buildMaterials(quality) {
  const lib = {};
  // Phones get half-size textures and no normal maps: a quarter of the memory and far less work.
  const small = quality === 'low';
  setNormals(!small);
  const fit = (c, f = 2) => (small && c ? shrink(c, f) : c);
  const wetList = [];
  const nightList = [];

  for (const [name, [gen, scale, rough, o]] of Object.entries(SURFACES)) {
    const s = gen();
    const m = new THREE.MeshStandardMaterial({
      map: tex(fit(s.map)),
      normalMap: s.normalMap ? tex(s.normalMap, { srgb: false }) : null,
      roughness: rough,
      metalness: o.metalness || 0,
      vertexColors: true,
    });
    if (o.normalScale) m.normalScale.setScalar(o.normalScale);
    if (s.roughnessMap && o.puddles) m.userData.puddleMap = tex(s.roughnessMap, { srgb: false });
    m.userData.uvScale = 1 / scale;
    m.userData.baseRough = rough;
    if (o.wet) wetList.push(m);
    lib[name] = m;
  }
  // Ground decals sit a hair above the base ground without z-fighting.
  for (const k of ['asphalt', 'paver', 'concrete', 'grass', 'earth']) {
    lib[k].polygonOffset = true;
    lib[k].polygonOffsetFactor = k === 'asphalt' ? -3 : k === 'earth' ? 0 : -2;
    lib[k].polygonOffsetUnits = k === 'asphalt' ? -3 : k === 'earth' ? 0 : -2;
  }

  // Railway track bed: U runs across the track, V along it.
  {
    const s = SF.ballast();
    lib.ballast = new THREE.MeshStandardMaterial({
      map: tex(fit(s.map)), normalMap: s.normalMap ? tex(s.normalMap, { srgb: false }) : null, roughness: 0.95, vertexColors: true,
      polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    });
  }

  // Facades: explicit UVs (bays across, floors up), tinted by vertex colour.
  for (const [name, gen] of Object.entries(FACADES)) {
    const s = gen(7 + name.length * 13);
    const m = new THREE.MeshStandardMaterial({
      map: tex(fit(s.map)),
      normalMap: s.normalMap ? tex(s.normalMap, { srgb: false }) : null,
      roughnessMap: tex(fit(s.roughnessMap), { srgb: false }),
      emissiveMap: tex(fit(s.emissiveMap)),
      emissive: 0xffffff,
      emissiveIntensity: 0,
      roughness: 1,
      metalness: name === 'glass' ? 0.25 : 0,
      vertexColors: true,
    });
    m.userData.nightGain = name === 'glass' || name === 'office' ? 1.6 : 2.2;
    nightList.push(m);
    lib['f_' + name] = m;
  }

  const sa = shopAtlas();
  lib.shop = new THREE.MeshStandardMaterial({
    map: tex(fit(sa.map), { repeat: false }),
    normalMap: sa.normalMap ? tex(sa.normalMap, { srgb: false, repeat: false }) : null,
    emissiveMap: tex(fit(sa.emissiveMap), { repeat: false }),
    emissive: 0xffffff,
    emissiveIntensity: 0,
    roughness: 0.8,
  });
  lib.shop.userData.nightGain = 1.15;
  lib.shop.userData.dayGlow = 0.1;
  nightList.push(lib.shop);

  // Untextured, vertex-coloured: vehicles, furniture, metalwork, painted things.
  lib.flat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.05 });
  lib.gloss = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.28, metalness: 0.35 });
  // Metalwork and dark glazing share the glossy material to keep draw calls down.
  lib.metal = lib.gloss;
  lib.glassDark = lib.gloss;
  // Painted road markings and other flat decals above the asphalt.
  lib.mark = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.75, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6,
  });
  // Things that are always bright: bulbs, signals, neon.
  lib.glow = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  lib.glow.userData.isGlow = true;
  // Pools of lamplight on the ground, faded in at dusk.
  lib.pool = new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -8, toneMapped: false,
  });

  /** Called by the sky every frame-ish with night (0..1) and wetness (0..1). */
  lib.setConditions = (night, wet) => {
    for (const m of nightList) m.emissiveIntensity = (m.userData.dayGlow || 0) + night * m.userData.nightGain;
    lib.pool.opacity = night * 0.5;
    lib.glow.color.setScalar(0.35 + night * 1.4);
    for (const m of lib.satMats || []) {
      const k = 1 - wet * 0.35;
      m.color.setRGB(k, k, k * 1.03);
      m.roughness = 1 - wet * 0.45;
    }
    for (const m of wetList) {
      const base = m.userData.baseRough;
      // wet ground is darker and shinier, but still ground rather than a mirror
      m.roughness = base - wet * (base - 0.34);
      const k = 1 - wet * 0.45;
      m.color.setRGB(k, k, k * 1.03);
      m.envMapIntensity = 1 + wet * 0.35;
    }
  };

  lib.quality = quality;
  return lib;
}

/** Layers whose UVs come from world position. */
export const WORLD_UV = new Set(Object.keys(SURFACES));
