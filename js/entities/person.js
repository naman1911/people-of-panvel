// A person: smooth low-poly figure with clothes that fit Panvel's streets
// (shirts, kurtas, sarees, salwar suits, school and work uniforms) and a
// small set of poses: stand, walk, sit, wave.

import * as THREE from 'three';

const G = {};
function geos() {
  if (G.head) return G;
  G.head = new THREE.SphereGeometry(0.122, 14, 10).scale(1, 1.13, 1.04);
  G.torso = new THREE.CapsuleGeometry(0.165, 0.27, 4, 12).scale(1, 1, 0.66);
  G.arm = new THREE.CapsuleGeometry(0.046, 0.5, 3, 7).translate(0, -0.27, 0);
  G.sleeve = new THREE.CapsuleGeometry(0.058, 0.2, 3, 7).translate(0, -0.12, 0);
  G.leg = new THREE.CapsuleGeometry(0.068, 0.68, 3, 8).translate(0, -0.4, 0);
  G.shoe = new THREE.BoxGeometry(0.1, 0.07, 0.24).translate(0, -0.83, 0.05);
  G.hand = new THREE.SphereGeometry(0.05, 7, 6).translate(0, -0.57, 0);
  G.neck = new THREE.CylinderGeometry(0.05, 0.06, 0.1, 8);
  G.hair = new THREE.SphereGeometry(0.132, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.56).scale(1, 1.1, 1.06);
  G.hairLong = new THREE.CapsuleGeometry(0.105, 0.26, 3, 8).scale(1.1, 1, 0.55);
  G.bun = new THREE.SphereGeometry(0.07, 8, 6);
  G.skirt = new THREE.CylinderGeometry(0.17, 0.27, 0.88, 12, 1, false);
  G.kurta = new THREE.CylinderGeometry(0.175, 0.21, 0.42, 12, 1, false).scale(1, 1, 0.7);
  G.box = new THREE.BoxGeometry(1, 1, 1);
  G.eye = new THREE.SphereGeometry(0.014, 6, 4);
  G.disc = new THREE.CylinderGeometry(0.3, 0.26, 0.12, 12);
  G.cap = new THREE.SphereGeometry(0.136, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.42).scale(1, 0.95, 1.08);
  G.shadow = new THREE.CircleGeometry(0.34, 14).rotateX(-Math.PI / 2);
  return G;
}

// One shared material: every person is a handful of vertex-coloured meshes.
let bodyMat = null, blobMat = null, ghostMat = null;
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
const flatCache = new Map();
function flat(geo) {
  let g = flatCache.get(geo);
  if (!g) flatCache.set(geo, (g = geo.index ? geo.toNonIndexed() : geo));
  return g;
}

/** Collects coloured pieces and bakes them into a single mesh. */
class Baker {
  constructor() {
    this.pos = [];
    this.nor = [];
    this.col = [];
  }
  add(geo, color, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
    const g = flat(geo);
    _m4.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
    const nm = new THREE.Matrix3().getNormalMatrix(_m4);
    const P = g.attributes.position, N = g.attributes.normal;
    _c.set(color);
    for (let i = 0; i < P.count; i++) {
      _p.fromBufferAttribute(P, i).applyMatrix4(_m4);
      this.pos.push(_p.x, _p.y, _p.z);
      _p.fromBufferAttribute(N, i).applyMatrix3(nm).normalize();
      this.nor.push(_p.x, _p.y, _p.z);
      this.col.push(_c.r, _c.g, _c.b);
    }
    return this;
  }
  mesh(parent) {
    if (!this.pos.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    if (!bodyMat) bodyMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.84 });
    const mesh = new THREE.Mesh(g, bodyMat);
    mesh.castShadow = true;
    mesh.layers.set(1);
    parent.add(mesh);
    return mesh;
  }
}

export const EMOTE_SECONDS = { wave: 1.6, namaskar: 2.2, clap: 2.2, dance: 5, laugh: 2.2, cheers: 2.4 };
/** The gestures offered in the interface, in order (keys 1 to 5). */
export const EMOTES = [['namaskar', '🙏'], ['wave', '👋'], ['clap', '👏'], ['dance', '💃'], ['laugh', '😂']];
export const EMOTE_ICON = { namaskar: '🙏', wave: '👋', clap: '👏', dance: '💃', laugh: '😂', cheers: '☕' };

export const SKIN = ['#8d5a3b', '#a4683f', '#b97c52', '#c68e63', '#7a4a2f', '#d2a078'];
const HAIR = ['#1a1412', '#221a16', '#2b1f18', '#3a2a20'];

/** Fill in anything a look leaves unspecified, deterministically from a seed. */
export function completeLook(look = {}, rnd = Math.random) {
  const woman = look.woman ?? rnd() < 0.5;
  const pick = (a) => a[(rnd() * a.length) | 0];
  const garb = look.garb || (woman ? pick(['saree', 'salwar', 'salwar', 'kurta', 'shirt']) : pick(['shirt', 'shirt', 'shirt', 'kurta', 'tee']));
  return {
    woman,
    garb,
    skin: look.skin || pick(SKIN),
    hair: look.hair || pick(HAIR),
    hairStyle: look.hairStyle || (woman ? pick(['bun', 'long', 'long', 'plait']) : pick(['short', 'short', 'short', 'bald'])),
    top: look.top || pick(woman ? ['#c2185b', '#00897b', '#f9a825', '#5e35b1', '#e64a19', '#1e88e5', '#ad1457', '#2e7d32'] : ['#eceff1', '#90caf9', '#fff59d', '#a5d6a7', '#ef9a9a', '#b0bec5', '#ffcc80', '#4e6a8f', '#f5f5f0']),
    bottom: look.bottom || pick(woman ? ['#37474f', '#4e342e', '#283593', '#f5f5f0'] : ['#37474f', '#263238', '#4e342e', '#5d6d7e', '#1f2a44', '#6d5f4b']),
    accent: look.accent || pick(['#f9a825', '#d81b60', '#00838f', '#6a1b9a', '#ef6c00', '#f5f5f0']),
    h: look.h || 0.94 + rnd() * 0.12,
    acc: look.acc || [],
  };
}

export class Person {
  constructor(lookIn, rnd) {
    const L = (this.look = completeLook(lookIn, rnd));
    const g = geos();
    this.root = new THREE.Group();
    this.body = new THREE.Group();
    this.root.add(this.body);
    this.body.scale.setScalar(L.h);
    const skin = L.skin, top = L.top, bottom = L.bottom, hair = L.hair, accent = L.accent;
    const saree = L.garb === 'saree', salwar = L.garb === 'salwar', kurta = L.garb === 'kurta';

    // ---- torso, head, hair and everything worn on them: one mesh -------------------
    this.torso = new THREE.Group();
    this.torso.position.y = 0.86;
    this.body.add(this.torso);
    const T = new Baker();
    T.add(g.torso, saree ? accent : top, 0, 0.3, 0);
    T.add(g.neck, skin, 0, 0.6, 0);
    const HY = 0.76; // head centre above the hips
    T.add(g.head, skin, 0, HY, 0);
    T.add(g.eye, '#161616', -0.045, HY + 0.012, 0.115);
    T.add(g.eye, '#161616', 0.045, HY + 0.012, 0.115);
    const hs = L.hairStyle;
    if (hs !== 'bald' && hs !== 'scarf') {
      T.add(g.hair, hair, 0, HY + 0.012, -0.012, 1, 1, 1, -0.22);
      if (hs === 'long' || hs === 'plait') T.add(g.hairLong, hair, 0, HY - 0.14, -0.1);
      if (hs === 'plait') T.add(g.box, hair, 0, HY - 0.42, -0.14, 0.05, 0.36, 0.05);
      if (hs === 'bun') T.add(g.bun, hair, 0, HY, -0.14);
    }
    if (hs === 'scarf') {
      T.add(g.hair, accent, 0, HY, -0.02, 1.1, 1.2, 1.15, -0.1);
      T.add(g.hairLong, accent, 0, HY - 0.13, -0.07, 1.25, 1.1, 1.3);
    }
    for (const a of L.acc) {
      if (a === 'topi') T.add(g.box, '#f5f5f0', 0, HY + 0.125, 0, 0.2, 0.07, 0.25);
      if (a === 'cap') {
        T.add(g.cap, accent, 0, HY + 0.045, 0);
        T.add(g.box, accent, 0, HY + 0.07, 0.15, 0.16, 0.02, 0.12);
      }
      if (a === 'specs') T.add(g.box, '#1b1b1b', 0, HY + 0.014, 0.125, 0.2, 0.035, 0.012);
      if (a === 'moustache') T.add(g.box, '#1a1412', 0, HY - 0.045, 0.122, 0.08, 0.018, 0.012);
      if (a === 'beard') T.add(g.box, hair, 0, HY - 0.085, 0.09, 0.15, 0.09, 0.08);
      if (a === 'basket') {
        T.add(g.disc, '#b98a4a', 0, HY + 0.2, 0);
        T.add(g.box, '#c9d3da', 0, HY + 0.27, 0, 0.42, 0.05, 0.32);
      }
      if (a === 'bag') T.add(g.box, accent, 0, 0.26, -0.17, 0.3, 0.38, 0.14);
      if (a === 'sling') {
        T.add(g.box, '#3e2f25', 0, 0.3, 0.02, 0.035, 0.66, 0.24, 0, 0, 0.62);
        T.add(g.box, '#3e2f25', 0.2, -0.02, 0.06, 0.1, 0.2, 0.24);
      }
      if (a === 'binoculars') T.add(g.box, '#222222', 0, 0.36, 0.14, 0.14, 0.08, 0.08);
      if (a === 'apron') T.add(g.box, '#f2ece0', 0, 0.16, 0.115, 0.3, 0.5, 0.02);
    }
    if (saree) {
      // pallu over the left shoulder
      T.add(g.box, top, 0.02, 0.3, 0.02, 0.09, 0.72, 0.27, 0, 0, -0.66);
      T.add(g.box, top, -0.19, 0.2, -0.12, 0.1, 0.7, 0.04);
    }
    if (salwar) {
      T.add(g.box, accent, 0, 0.5, 0.1, 0.36, 0.05, 0.05);
      T.add(g.box, accent, -0.16, 0.22, -0.1, 0.07, 0.62, 0.03);
      T.add(g.box, accent, 0.16, 0.22, -0.1, 0.07, 0.62, 0.03);
    }
    T.mesh(this.torso);

    // ---- arms: one mesh each ---------------------------------------------------------
    const bare = saree || salwar || L.garb === 'tee';
    this.arms = [-1, 1].map((s) => {
      const p = new THREE.Group();
      p.position.set(s * 0.215, 0.52, 0);
      this.torso.add(p);
      const A = new Baker();
      A.add(g.arm, bare ? skin : top);
      if (bare) A.add(g.sleeve, saree ? accent : top);
      A.add(g.hand, skin);
      A.mesh(p);
      return p;
    });

    // ---- legs: one mesh each -----------------------------------------------------------
    this.legs = [-1, 1].map((s) => {
      const p = new THREE.Group();
      p.position.set(s * 0.085, 0.88, 0);
      this.body.add(p);
      const B = new Baker();
      B.add(g.leg, L.garb === 'shorts' ? skin : bottom);
      B.add(g.shoe, saree || salwar ? '#8a5a3a' : '#2a2422');
      B.mesh(p);
      return p;
    });
    if (saree) this.skirt = new Baker().add(g.skirt, top, 0, 0.44, 0).mesh(this.body);
    else if (salwar || kurta) new Baker().add(g.kurta, top, 0, 0.66, 0).mesh(this.body);

    // soft contact shadow, for when real shadows are off or far away
    if (!blobMat) blobMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -8 });
    this.blob = new THREE.Mesh(g.shadow, blobMat);
    this.blob.position.y = 0.05;
    this.blob.renderOrder = 2;
    this.blob.layers.set(1);
    this.root.add(this.blob);

    this.phase = Math.random() * 6.28;
    this.pose = 'stand';
    this.emoteT = 0;
    this.emoteAge = 0;
    this.emoteKind = '';
    this.height = 1.72 * L.h;
    this.shadows = true;
  }

  wave(seconds = 1.6) {
    this.emote('wave', seconds);
  }

  /** Play a gesture: wave, namaskar, clap, dance, laugh, cheers. */
  emote(kind, seconds) {
    this.emoteKind = kind;
    this.emoteT = seconds ?? EMOTE_SECONDS[kind] ?? 2;
    this.emoteAge = 0;
  }

  /** speed in m/s; pose: 'stand' | 'sit' | 'drive'. */
  update(dt, speed = 0, pose = 'stand') {
    this.pose = pose;
    const [la, ra] = this.arms, [ll, rl] = this.legs;
    const k = 1 - Math.exp(-dt * 12);
    // targets for this frame
    let legL = 0, legR = 0, aLx = 0, aRx = 0, aLz = 0.06, aRz = -0.06, bob = 0, lean = 0, twist = 0;
    const seated = pose === 'sit' || pose === 'drive';
    if (seated) {
      legL = legR = -1.45;
      aLx = aRx = pose === 'drive' ? -1.1 : -0.35;
      bob = -0.36;
    } else if (speed > 0.15) {
      this.phase += dt * (4.2 + speed * 1.25);
      const amp = Math.min(0.9, 0.34 + speed * 0.085);
      const sw = Math.sin(this.phase);
      legL = sw * amp;
      legR = -sw * amp;
      aLx = -sw * amp * 0.8;
      aRx = sw * amp * 0.8;
      bob = Math.abs(Math.cos(this.phase)) * 0.03 * Math.min(1, speed / 3);
      lean = Math.min(0.16, speed * 0.016);
    } else {
      this.phase += dt * 1.4;
      aLx = aRx = Math.sin(this.phase) * 0.03;
      bob = Math.sin(this.phase * 0.9) * 0.004;
    }
    // a gesture overrides the arms (and, standing still, the body)
    if (this.emoteT > 0) {
      this.emoteT -= dt;
      const t = (this.emoteAge += dt);
      const still = !seated && speed < 0.3;
      switch (this.emoteKind) {
        case 'wave':
          aRx = -2.7;
          aRz = -0.25 + Math.sin(t * 13) * 0.32;
          break;
        case 'namaskar':
          aLx = aRx = -1.18;
          aLz = 0.52;
          aRz = -0.52;
          if (still) lean = 0.24 * Math.min(1, t * 3);
          break;
        case 'clap': {
          const c = 0.26 + 0.24 * Math.sin(t * 19);
          aLx = aRx = -1.3;
          aLz = c;
          aRz = -c;
          break;
        }
        case 'dance': {
          const d = Math.sin(t * 7);
          aLx = -2.5 + d * 0.6;
          aRx = -2.5 - d * 0.6;
          aLz = 0.3;
          aRz = -0.3;
          if (still) {
            bob = Math.abs(d) * 0.07;
            twist = Math.sin(t * 3.5) * 0.5;
            legL = d * 0.3;
            legR = -d * 0.3;
          }
          break;
        }
        case 'laugh':
          aLz = 0.4;
          aRz = -0.4;
          aLx = aRx = -0.25;
          if (still) {
            bob = Math.abs(Math.sin(t * 16)) * 0.035;
            lean = -0.14;
          }
          break;
        case 'cheers':
          aRx = -1.55;
          aRz = -0.12;
          break;
      }
    }
    if (this.skirt) {
      legL *= 0.35;
      legR *= 0.35;
    }
    ll.rotation.x += (legL - ll.rotation.x) * k;
    rl.rotation.x += (legR - rl.rotation.x) * k;
    la.rotation.x += (aLx - la.rotation.x) * k;
    ra.rotation.x += (aRx - ra.rotation.x) * k;
    la.rotation.z += (aLz - la.rotation.z) * k;
    ra.rotation.z += (aRz - ra.rotation.z) * k;
    this.body.position.y += (bob - this.body.position.y) * k;
    this.body.rotation.y += (twist - this.body.rotation.y) * k;
    this.torso.rotation.x += (lean - this.torso.rotation.x) * k;
    if (this.skirt) this.skirt.visible = !seated;
    this.blob.visible = !this.ghost;
  }

  /** A ghost is see-through. */
  setGhost(on) {
    if (on && !ghostMat) ghostMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.84, transparent: true, opacity: 0.42, depthWrite: false });
    this.root.traverse((o) => {
      if (o.isMesh && o !== this.blob) {
        o.material = on ? ghostMat : bodyMat;
        o.castShadow = !on;
      }
    });
    this.blob.visible = !on;
    this.ghost = on;
  }

  setShadows(on) {
    if (on === this.shadows) return;
    this.shadows = on;
    this.root.traverse((o) => {
      if (o.isMesh && o !== this.blob) o.castShadow = on;
    });
  }

  dispose() {
    this.root.removeFromParent();
    this.root.traverse((o) => {
      if (o.isMesh && o !== this.blob) o.geometry.dispose();
    });
  }
}
