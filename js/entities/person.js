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

const mats = new Map();
function mat(color, rough = 0.85) {
  const key = color + '|' + rough;
  let m = mats.get(key);
  if (!m) mats.set(key, (m = new THREE.MeshStandardMaterial({ color, roughness: rough })));
  return m;
}
let blobMat = null;

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
    const skin = mat(L.skin), top = mat(L.top), bottom = mat(L.bottom), hair = mat(L.hair, 0.6);
    const add = (geo, m, x = 0, y = 0, z = 0, parent = this.body) => {
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const saree = L.garb === 'saree', salwar = L.garb === 'salwar', kurta = L.garb === 'kurta';

    // torso and head
    this.torso = new THREE.Group();
    this.torso.position.y = 0.86;
    this.body.add(this.torso);
    add(g.torso, saree ? mat(L.accent) : top, 0, 0.3, 0, this.torso);
    add(g.neck, skin, 0, 0.6, 0, this.torso);
    this.head = new THREE.Group();
    this.head.position.y = 0.76;
    this.torso.add(this.head);
    add(g.head, skin, 0, 0, 0, this.head);
    add(g.eye, mat('#161616', 0.4), -0.045, 0.012, 0.115, this.head);
    add(g.eye, mat('#161616', 0.4), 0.045, 0.012, 0.115, this.head);

    // hair and headwear
    const hs = L.hairStyle;
    if (hs !== 'bald' && hs !== 'scarf') {
      const cap = add(g.hair, hair, 0, 0.012, -0.012, this.head);
      cap.rotation.x = -0.22;
      if (hs === 'long' || hs === 'plait') add(g.hairLong, hair, 0, -0.14, -0.1, this.head);
      if (hs === 'plait') add(g.box, hair, 0, -0.42, -0.14, this.head).scale.set(0.05, 0.36, 0.05);
      if (hs === 'bun') add(g.bun, hair, 0, 0.0, -0.14, this.head);
    }
    if (hs === 'scarf') {
      const sc = add(g.hair, mat(L.accent), 0, 0.0, -0.02, this.head);
      sc.scale.set(1.1, 1.2, 1.15);
      sc.rotation.x = -0.1;
      add(g.hairLong, mat(L.accent), 0, -0.13, -0.07, this.head).scale.set(1.25, 1.1, 1.3);
    }
    for (const a of L.acc) {
      if (a === 'topi') add(g.box, mat('#f5f5f0'), 0, 0.125, 0, this.head).scale.set(0.2, 0.07, 0.25);
      if (a === 'cap') {
        add(g.cap, mat(L.accent), 0, 0.045, 0, this.head);
        add(g.box, mat(L.accent), 0, 0.07, 0.15, this.head).scale.set(0.16, 0.02, 0.12);
      }
      if (a === 'specs') add(g.box, mat('#1b1b1b', 0.3), 0, 0.014, 0.125, this.head).scale.set(0.2, 0.035, 0.012);
      if (a === 'moustache') add(g.box, mat('#1a1412'), 0, -0.045, 0.122, this.head).scale.set(0.08, 0.018, 0.012);
      if (a === 'beard') add(g.box, mat(L.hair), 0, -0.085, 0.09, this.head).scale.set(0.15, 0.09, 0.08);
      if (a === 'basket') {
        add(g.disc, mat('#b98a4a'), 0, 0.2, 0, this.head);
        add(g.box, mat('#c9d3da', 0.4), 0, 0.27, 0, this.head).scale.set(0.42, 0.05, 0.32);
      }
      if (a === 'bag') add(g.box, mat(L.accent), 0, 0.26, -0.17, this.torso).scale.set(0.3, 0.38, 0.14);
      if (a === 'sling') {
        const st = add(g.box, mat('#3e2f25'), 0, 0.3, 0.02, this.torso);
        st.scale.set(0.035, 0.66, 0.24);
        st.rotation.z = 0.62;
        add(g.box, mat('#3e2f25'), 0.2, -0.02, 0.06, this.torso).scale.set(0.1, 0.2, 0.24);
      }
      if (a === 'binoculars') add(g.box, mat('#222'), 0, 0.36, 0.14, this.torso).scale.set(0.14, 0.08, 0.08);
      if (a === 'apron') add(g.box, mat('#f2ece0'), 0, 0.16, 0.115, this.torso).scale.set(0.3, 0.5, 0.02);
    }

    // arms
    const armMat = saree || salwar || L.garb === 'tee' ? skin : top;
    this.arms = [-1, 1].map((s) => {
      const p = new THREE.Group();
      p.position.set(s * 0.215, 0.52, 0);
      this.torso.add(p);
      add(g.arm, armMat === skin ? skin : top, 0, 0, 0, p);
      if (armMat === skin) add(g.sleeve, saree ? mat(L.accent) : top, 0, 0, 0, p);
      add(g.hand, skin, 0, 0, 0, p);
      return p;
    });

    // legs
    this.legs = [-1, 1].map((s) => {
      const p = new THREE.Group();
      p.position.set(s * 0.085, 0.88, 0);
      this.body.add(p);
      add(g.leg, L.garb === 'shorts' ? skin : bottom, 0, 0, 0, p);
      add(g.shoe, mat(saree || salwar ? '#8a5a3a' : '#2a2422'), 0, 0, 0, p);
      return p;
    });
    if (saree) {
      this.skirt = add(g.skirt, top, 0, 0.44, 0);
      // pallu over the left shoulder
      const pl = add(g.box, top, 0.02, 0.3, 0.02, this.torso);
      pl.scale.set(0.09, 0.72, 0.27);
      pl.rotation.z = -0.66;
      add(g.box, top, -0.19, 0.2, -0.12, this.torso).scale.set(0.1, 0.7, 0.04);
    } else if (salwar || kurta) {
      add(g.kurta, top, 0, 0.66, 0);
      if (salwar) {
        const du = add(g.box, mat(L.accent), 0, 0.5, 0.1, this.torso);
        du.scale.set(0.36, 0.05, 0.05);
        add(g.box, mat(L.accent), -0.16, 0.22, -0.1, this.torso).scale.set(0.07, 0.62, 0.03);
        add(g.box, mat(L.accent), 0.16, 0.22, -0.1, this.torso).scale.set(0.07, 0.62, 0.03);
      }
    }

    // soft contact shadow, for when real shadows are off or far away
    if (!blobMat) blobMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -8 });
    this.blob = new THREE.Mesh(g.shadow, blobMat);
    this.blob.position.y = 0.05;
    this.blob.renderOrder = 2;
    this.root.add(this.blob);

    this.phase = Math.random() * 6.28;
    this.pose = 'stand';
    this.waveT = 0;
    this.height = 1.72 * L.h;
  }

  wave(seconds = 1.6) {
    this.waveT = seconds;
  }

  /** speed in m/s; pose: 'stand' | 'sit' | 'drive'. */
  update(dt, speed = 0, pose = 'stand') {
    this.pose = pose;
    const [la, ra] = this.arms, [ll, rl] = this.legs;
    const k = 1 - Math.exp(-dt * 12);
    let legL = 0, legR = 0, armL = 0, armR = 0, bob = 0, lean = 0, armZ = 0.06;
    if (pose === 'sit' || pose === 'drive') {
      legL = legR = -1.45;
      armL = armR = pose === 'drive' ? -1.1 : -0.35;
      bob = -0.36;
    } else if (speed > 0.15) {
      this.phase += dt * (4.2 + speed * 1.25);
      const amp = Math.min(0.9, 0.34 + speed * 0.085);
      const s = Math.sin(this.phase);
      legL = s * amp;
      legR = -s * amp;
      armL = -s * amp * 0.8;
      armR = s * amp * 0.8;
      bob = Math.abs(Math.cos(this.phase)) * 0.03 * Math.min(1, speed / 3);
      lean = Math.min(0.16, speed * 0.016);
    } else {
      this.phase += dt * 1.4;
      armL = armR = Math.sin(this.phase) * 0.03;
      bob = Math.sin(this.phase * 0.9) * 0.004;
    }
    if (this.skirt) {
      legL *= 0.35;
      legR *= 0.35;
    }
    ll.rotation.x += (legL - ll.rotation.x) * k;
    rl.rotation.x += (legR - rl.rotation.x) * k;
    la.rotation.x += (armL - la.rotation.x) * k;
    if (this.waveT > 0) {
      this.waveT -= dt;
      ra.rotation.x += (-2.7 - ra.rotation.x) * k;
      ra.rotation.z = -0.25 + Math.sin(this.waveT * 13) * 0.32;
    } else {
      ra.rotation.x += (armR - ra.rotation.x) * k;
      ra.rotation.z += (-armZ - ra.rotation.z) * k;
    }
    la.rotation.z = armZ;
    this.body.position.y += (bob - this.body.position.y) * k;
    this.torso.rotation.x += (lean - this.torso.rotation.x) * k;
    if (this.skirt) this.skirt.visible = pose !== 'sit' && pose !== 'drive';
    this.blob.visible = pose !== 'drive';
  }

  setShadows(on) {
    this.root.traverse((o) => {
      if (o.isMesh && o !== this.blob) o.castShadow = on;
    });
  }

  dispose() {
    this.root.removeFromParent();
  }
}
