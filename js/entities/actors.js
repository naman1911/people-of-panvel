// Everything that moves: you, the camera, the named residents, passers-by,
// traffic, the rickshaws you can drive, and the strays.

import * as THREE from 'three';
import { Person, completeLook } from './person.js';
import { Mesher } from '../world/mesher.js';
import * as M from '../world/models.js';
import { along } from '../world/geom.js';
import { clamp, angDiff, mulberry32, hashStr } from '../util.js';

// A brisk walk and an easy jog: real paces, so streets feel their real length.
const WALK = 2.9, RUN = 6.8;

// ---- player ---------------------------------------------------------------------

export class Player {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.pos = { x: 0, z: 0 };
    this.y = 0;
    this.yaw = 0;
    this.speed = 0;
    this.mode = 'walk'; // walk | sit | drive
    this.vehicle = null;
    this.seat = null;
    this.person = null;
    this.setLook({ woman: false, garb: 'kurta', top: '#f2efe6', bottom: '#5d6d7e', hairStyle: 'short', skin: '#b97c52', acc: ['bag'], accent: '#ff5a3c', h: 1 });
  }
  setLook(look) {
    if (this.person) this.person.dispose();
    this.person = new Person(look, mulberry32(7));
    this.scene.add(this.person.root);
  }
  place(x, z, face = 0) {
    const p = this.world.findFree(x, z, 0.4);
    this.pos.x = p.x;
    this.pos.z = p.z;
    this.yaw = face;
    this.y = this.world.heightAt(p.x, p.z);
    this.mode = 'walk';
    this.vehicle = null;
    this.seat = null;
  }
  sit(seat) {
    this.mode = 'sit';
    this.seat = seat;
    this.pos.x = seat.x;
    this.pos.z = seat.z;
    this.yaw = seat.ry;
    this.speed = 0;
  }
  stand() {
    if (this.mode !== 'sit') return;
    const s = this.seat;
    this.mode = 'walk';
    this.seat = null;
    const p = this.world.findFree(s.x + Math.sin(s.ry) * 1.0, s.z + Math.cos(s.ry) * 1.0, 0.4, 6);
    this.pos.x = p.x;
    this.pos.z = p.z;
  }
  enter(vehicle) {
    this.mode = 'drive';
    this.vehicle = vehicle;
    vehicle.driven = true;
    if (vehicle.solid) this.world.removeSolid(vehicle.solid);
    vehicle.solid = null;
  }
  exit() {
    const v = this.vehicle;
    if (!v) return;
    v.driven = false;
    v.speed = 0;
    v.solid = this.world.addSolid(v.x, v.z, 1.2);
    this.mode = 'walk';
    this.vehicle = null;
    // step out on the left
    const p = this.world.findFree(v.x + Math.sin(v.yaw) * -1.6, v.z + Math.cos(v.yaw) * -1.6, 0.4, 8);
    this.pos.x = p.x;
    this.pos.z = p.z;
  }

  update(dt, input, camYaw, traffic) {
    const w = this.world;
    const mv = input.move();
    if (this.mode === 'drive') {
      const v = this.vehicle;
      const max = mv.run ? 19 : 14;
      if (mv.y > 0.1) v.speed += 9 * dt * mv.y;
      else if (mv.y < -0.1) v.speed += (v.speed > 0.5 ? 22 : 6) * dt * mv.y;
      else v.speed -= Math.sign(v.speed) * Math.min(Math.abs(v.speed), 5 * dt);
      v.speed = clamp(v.speed, -5, max);
      const steer = -mv.x;
      v.yaw += steer * 1.9 * dt * clamp(Math.abs(v.speed) / 5, 0, 1) * Math.sign(v.speed || 1);
      const p = { x: v.x + Math.cos(v.yaw) * v.speed * dt, z: v.z - Math.sin(v.yaw) * v.speed * dt };
      if (w.resolve(p, 1.05)) v.speed *= Math.pow(0.02, dt);
      if (w.inWater(p.x, p.z)) {
        p.x = v.x;
        p.z = v.z;
        v.speed = 0;
      }
      v.x = p.x;
      v.z = p.z;
      v.group.position.set(v.x, 0, v.z);
      v.group.rotation.y = v.yaw;
      // sit in the driver's seat
      this.pos.x = v.x + Math.cos(v.yaw) * 0.25;
      this.pos.z = v.z - Math.sin(v.yaw) * 0.25;
      this.yaw = v.yaw + Math.PI / 2;
      this.speed = Math.abs(v.speed);
      this.y = 0;
      this.person.root.position.set(this.pos.x, 0.27, this.pos.z);
      this.person.root.rotation.y = this.yaw;
      this.person.update(dt, 0, 'drive');
      return;
    }
    if (this.mode === 'sit') {
      this.person.root.position.set(this.pos.x, this.y - 0.06, this.pos.z);
      this.person.root.rotation.y = this.yaw;
      this.person.update(dt, 0, 'sit');
      return;
    }
    const mag = Math.hypot(mv.x, mv.y);
    const target = mag > 0.05 ? (mv.run ? RUN : WALK) * Math.min(1, mag) : 0;
    this.speed += (target - this.speed) * (1 - Math.exp(-dt * 10));
    if (mag > 0.05) {
      const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
      const dx = (fx * mv.y + rx * mv.x) / mag, dz = (fz * mv.y + rz * mv.x) / mag;
      const want = Math.atan2(dx, dz);
      this.yaw += angDiff(this.yaw, want) * (1 - Math.exp(-dt * 12));
      const p = { x: this.pos.x + dx * this.speed * dt, z: this.pos.z + dz * this.speed * dt };
      w.resolve(p, 0.36);
      if (traffic) traffic.pushOut(p, 0.36);
      this.pos.x = p.x;
      this.pos.z = p.z;
    }
    const gy = w.heightAt(this.pos.x, this.pos.z);
    this.y += (gy - this.y) * (1 - Math.exp(-dt * 14));
    this.person.root.position.set(this.pos.x, this.y, this.pos.z);
    this.person.root.rotation.y = this.yaw;
    this.person.update(dt, this.speed, 'stand');
  }
}

// ---- camera ---------------------------------------------------------------------

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.yaw = 0.6;
    this.pitch = 0.3;
    this.dist = 7.5;
    this.cur = 7.5;
    this.target = new THREE.Vector3();
    this.idle = 0;
    this.fp = true; // first person: see Panvel through your own eyes
    this.eye = 0;
  }
  setFirstPerson(on) {
    this.fp = on;
    this.pitch = on ? 0.02 : 0.28;
    this.camera.fov = on ? 68 : 56;
    this.camera.updateProjectionMatrix();
  }
  snap(player) {
    this.target.set(player.pos.x, player.y + 1.45, player.pos.z);
    this.cur = this.dist;
    this.eye = player.y + 1.6;
  }
  update(dt, look, turn, player, world) {
    if (look.x || look.y) this.idle = 0;
    else this.idle += dt;
    const fp = this.fp && player.mode !== 'drive';
    this.yaw -= look.x * (fp ? 0.0028 : 0.0046) + turn * 1.9 * dt;
    this.pitch = clamp(this.pitch + look.y * (fp ? 0.0026 : 0.0036), fp ? -1.25 : -0.12, 1.3);
    const c = this.camera;
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);

    if (fp) {
      // eyes: head height, with the small rise and sway of each step
      const h = player.person.height;
      const base = player.y + (player.mode === 'sit' ? h * 0.68 : h * 0.94);
      const stride = Math.min(1, player.speed / 3);
      const bob = Math.sin(player.person.phase * 2) * 0.03 * stride;
      const sway = Math.cos(player.person.phase) * 0.022 * stride;
      this.eye += (base - this.eye) * (1 - Math.exp(-dt * 14));
      const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw), rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
      c.position.set(player.pos.x + rx * sway + fx * 0.08, this.eye + bob, player.pos.z + rz * sway + fz * 0.08);
      this.target.set(c.position.x + fx * cp, c.position.y - sp, c.position.z + fz * cp);
      c.lookAt(this.target);
      player.person.root.visible = false;
      return;
    }

    if (look.zoom) this.dist = clamp(this.dist * Math.pow(1.14, look.zoom), 2.4, 46);
    // swing in behind the rickshaw while driving, unless the player is looking around
    if (player.mode === 'drive' && this.idle > 0.8 && Math.abs(player.vehicle.speed) > 1.5) {
      const v = player.vehicle;
      const want = Math.atan2(-Math.cos(v.yaw), Math.sin(v.yaw));
      this.yaw += angDiff(this.yaw, want) * (1 - Math.exp(-dt * 2.2));
    }
    const k = 1 - Math.exp(-dt * 12);
    const ty = player.y + (player.mode === 'walk' ? 1.45 : 1.25);
    this.target.x += (player.pos.x - this.target.x) * k;
    this.target.y += (ty - this.target.y) * k;
    this.target.z += (player.pos.z - this.target.z) * k;
    const tp = this.fp ? Math.max(0.22, this.pitch) : this.pitch;
    const cq = Math.cos(tp), sq = Math.sin(tp);
    const dx = Math.sin(this.yaw) * cq, dz = Math.cos(this.yaw) * cq;
    let want = this.dist * (player.mode === 'drive' ? 1.25 : 1);
    // keep walls from coming between you and the camera
    if (this.target.y + sq * want < 13) {
      const t = world.walls.cast(this.target.x, this.target.z, this.target.x + dx * want, this.target.z + dz * want);
      if (t < 1) want = Math.max(1.1, want * t - 0.4);
    }
    this.cur += (want - this.cur) * (want < this.cur ? 1 - Math.exp(-dt * 30) : 1 - Math.exp(-dt * 4));
    c.position.set(this.target.x + dx * this.cur, Math.max(0.35, this.target.y + sq * this.cur), this.target.z + dz * this.cur);
    c.lookAt(this.target);
    player.person.root.visible = this.cur > 1.9;
  }
}

// ---- named residents --------------------------------------------------------------

export class Residents {
  constructor(scene, world, defs) {
    this.world = world;
    this.list = defs.map((def) => {
      const rnd = mulberry32(hashStr(def.id));
      const person = new Person(def.look, rnd);
      const p = world.findFree(def.at[0], def.at[1], 0.45, 30);
      person.root.position.set(p.x, world.heightAt(p.x, p.z), p.z);
      scene.add(person.root);
      const n = {
        def, person, x: p.x, z: p.z, hx: p.x, hz: p.z, yaw: rnd() * 6.28, baseYaw: 0, speed: 0,
        t: rnd() * 4, target: null, say: null, sayUntil: 0, nextSay: 4 + rnd() * 18, rnd, solid: null, near: false,
      };
      n.baseYaw = n.yaw;
      if (def.mode !== 'wander') n.solid = world.addSolid(p.x, p.z, 0.35);
      return n;
    });
    this.byId = new Map(this.list.map((n) => [n.def.id, n]));
  }

  update(dt, player, time, lang) {
    const px = player.pos.x, pz = player.pos.z;
    for (const n of this.list) {
      const d = Math.hypot(n.x - px, n.z - pz);
      n.dist = d;
      const vis = d < 170;
      n.person.root.visible = vis;
      if (!vis) continue;
      const close = d < 3.6 && player.mode !== 'drive';
      n.near = close;
      let speed = 0;
      if (close) {
        // turn to face whoever walked up
        const want = Math.atan2(px - n.x, pz - n.z);
        n.yaw += angDiff(n.yaw, want) * (1 - Math.exp(-dt * 7));
      } else if (n.def.mode === 'wander') {
        n.t -= dt;
        if (!n.target && n.t <= 0) {
          const a = n.rnd() * 6.283, r = (0.3 + n.rnd() * 0.7) * n.def.r;
          const tx = n.hx + Math.cos(a) * r, tz = n.hz + Math.sin(a) * r;
          if (this.world.isFree(tx, tz, 0.4) && !this.world.walls.blocked(n.x, n.z, tx, tz)) n.target = { x: tx, z: tz };
          else n.t = 0.6;
        }
        if (n.target) {
          const dx = n.target.x - n.x, dz = n.target.z - n.z, dl = Math.hypot(dx, dz);
          if (dl < 0.4) {
            n.target = null;
            n.t = 2 + n.rnd() * 6;
          } else {
            speed = 1.5;
            const want = Math.atan2(dx, dz);
            n.yaw += angDiff(n.yaw, want) * (1 - Math.exp(-dt * 6));
            const p = { x: n.x + (dx / dl) * speed * dt, z: n.z + (dz / dl) * speed * dt };
            if (this.world.resolve(p, 0.35)) {
              n.stuck = (n.stuck || 0) + dt;
              if (n.stuck > 1) (n.target = null), (n.stuck = 0), (n.t = 1);
            } else n.stuck = 0;
            n.x = p.x;
            n.z = p.z;
          }
        }
      } else {
        n.yaw += angDiff(n.yaw, n.baseYaw) * (1 - Math.exp(-dt * 2));
      }
      n.speed += (speed - n.speed) * (1 - Math.exp(-dt * 8));
      const root = n.person.root;
      const sitting = n.def.mode === 'sit';
      root.position.set(n.x, this.world.heightAt(n.x, n.z) + (sitting ? -0.06 : 0), n.z);
      root.rotation.y = n.yaw;
      n.person.update(dt, n.speed, sitting ? 'sit' : 'stand');
      n.person.setShadows(d < 45);
      // idle chatter
      n.nextSay -= dt;
      if (n.nextSay <= 0 && d < 28) {
        const line = n.def.lines[(n.rnd() * n.def.lines.length) | 0];
        n.say = line[lang] || line.en;
        n.sayUntil = time + 4.2;
        n.nextSay = 14 + n.rnd() * 26;
      }
      if (n.say && time > n.sayUntil) n.say = null;
    }
  }

  speak(n, time, lang, idx) {
    const lines = n.def.lines;
    n.lineIdx = idx ?? ((n.lineIdx ?? -1) + 1) % lines.length;
    const line = lines[n.lineIdx];
    n.say = line[lang] || line.en;
    n.sayUntil = time + 5;
    n.nextSay = 20;
    n.person.wave(1.4);
    return n.say;
  }
}

// ---- passers-by ---------------------------------------------------------------------

export class Crowd {
  constructor(scene, world, count) {
    this.world = world;
    this.rnd = mulberry32(99);
    this.list = [];
    for (let i = 0; i < count; i++) {
      const person = new Person(completeLook({}, this.rnd), this.rnd);
      person.root.visible = false;
      scene.add(person.root);
      this.list.push({ person, active: false, r: null, s: 0, dir: 1, side: 1, v: 1.3 + this.rnd() * 0.6, wait: this.rnd() * 3 });
    }
  }
  spawn(w, px, pz) {
    const r = this.world.randomRoadNear(px, pz, 35, 120, this.rnd, (q) => 'ERLSV'.includes(q.c));
    if (!r) return;
    w.r = r;
    w.dir = this.rnd() < 0.5 ? 1 : -1;
    w.s = this.rnd() * r.len;
    w.side = this.rnd() < 0.5 ? 1 : -1;
    w.active = true;
    w.person.root.visible = true;
  }
  update(dt, player) {
    const px = player.pos.x, pz = player.pos.z;
    for (const w of this.list) {
      if (!w.active) {
        w.wait -= dt;
        if (w.wait <= 0) {
          this.spawn(w, px, pz);
          w.wait = 1 + this.rnd() * 2;
        }
        continue;
      }
      w.s += w.dir * w.v * dt;
      if (w.s < 0 || w.s > w.r.len) {
        const j = w.s < 0 ? w.r.a : w.r.b;
        const ex = this.world.exits(j, w.r).filter((e) => 'ERLSV'.includes(e.r.c));
        if (!ex.length) w.dir = -w.dir;
        else {
          const e = ex[(this.rnd() * ex.length) | 0];
          w.r = e.r;
          w.dir = e.end === 0 ? 1 : -1;
          w.s = e.end === 0 ? 0 : e.r.len;
        }
        w.s = clamp(w.s, 0, w.r.len);
      }
      const a = along(w.r.pts, w.s);
      const off = (w.r.w / 2 + ('PSE'.includes(w.r.c) ? 1.3 : 0.6)) * w.side;
      const x = a.x + a.dz * off, z = a.z - a.dx * off;
      const d = Math.hypot(x - px, z - pz);
      if (d > 130) {
        w.active = false;
        w.person.root.visible = false;
        continue;
      }
      const yaw = Math.atan2(a.dx * w.dir, a.dz * w.dir);
      const root = w.person.root;
      root.position.set(x, 'PSE'.includes(w.r.c) ? 0.15 : 0, z);
      root.rotation.y += angDiff(root.rotation.y, yaw) * (1 - Math.exp(-dt * 6));
      w.person.update(dt, w.v, 'stand');
      w.person.setShadows(d < 45);
    }
  }
}

// ---- traffic ----------------------------------------------------------------------

export function buildModel(lib, fn) {
  const m = new Mesher(lib, 1e6);
  fn(m);
  const g = m.build(true);
  g.traverse((o) => o.layers.set(1));
  return g;
}

export class Traffic {
  constructor(scene, world, lib, count) {
    this.world = world;
    this.rnd = mulberry32(4711);
    this.list = [];
    const kinds = ['auto', 'scooter', 'car', 'scooter', 'auto', 'tempo', 'car', 'bus', 'scooter', 'auto', 'suv', 'scooter', 'car', 'auto', 'scooter', 'tempo', 'bus', 'scooter', 'auto', 'car', 'scooter', 'auto'];
    for (let i = 0; i < count; i++) {
      const kind = kinds[i % kinds.length];
      const group = buildModel(lib, (m) => {
        if (kind === 'auto') M.auto(m);
        else if (kind === 'scooter') M.scooter(m, this.rnd, true);
        else if (kind === 'tempo') M.tempo(m, this.rnd);
        else if (kind === 'bus') M.bus(m, 'st');
        else M.car(m, this.rnd, kind === 'suv' ? 'suv' : undefined);
      });
      group.visible = false;
      scene.add(group);
      const radius = kind === 'bus' ? 2.6 : kind === 'scooter' ? 0.7 : kind === 'auto' ? 1.2 : 1.5;
      this.list.push({ group, kind, active: false, r: null, s: 0, dir: 1, v: 0, top: kind === 'bus' ? 8 : kind === 'scooter' ? 8 + this.rnd() * 5 : 7 + this.rnd() * 5, wait: this.rnd() * 4, x: 0, z: 0, yaw: 0, radius });
    }
  }
  ok(r, kind) {
    return kind === 'bus' ? 'PSE'.includes(r.c) : 'PSER'.includes(r.c) && r.w >= 5.5;
  }
  update(dt, player) {
    const px = player.pos.x, pz = player.pos.z;
    for (const v of this.list) {
      if (!v.active) {
        v.wait -= dt;
        if (v.wait <= 0) {
          v.wait = 1.5 + this.rnd() * 3;
          const r = this.world.randomRoadNear(px, pz, 70, 230, this.rnd, (q) => this.ok(q, v.kind));
          if (!r) continue;
          v.r = r;
          v.dir = this.rnd() < 0.5 ? 1 : -1;
          v.s = this.rnd() * r.len;
          v.active = true;
          v.group.visible = true;
          v.v = v.top * 0.6;
          const a0 = along(r.pts, v.s);
          v.yaw = Math.atan2(-a0.dz * v.dir, a0.dx * v.dir);
        }
        continue;
      }
      // slow for the player and for the vehicle ahead
      let target = v.top;
      const fx = Math.cos(v.yaw), fz = -Math.sin(v.yaw);
      const tx = px - v.x, tz = pz - v.z, td = Math.hypot(tx, tz);
      if (td < 11 && (tx * fx + tz * fz) / (td || 1) > 0.55) target = td < 5.5 ? 0 : 2.5;
      for (const o of this.list) {
        if (o === v || !o.active) continue;
        const ox = o.x - v.x, oz = o.z - v.z, od = Math.hypot(ox, oz);
        if (od < 9 + o.radius && (ox * fx + oz * fz) / (od || 1) > 0.8) target = Math.min(target, od < 5 + o.radius ? 0 : o.v * 0.9);
      }
      v.v += clamp(target - v.v, -14 * dt, 5 * dt);
      v.s += v.dir * v.v * dt;
      if (v.s < 0 || v.s > v.r.len) {
        const j = v.s < 0 ? v.r.a : v.r.b;
        const ex = this.world.exits(j, v.r).filter((e) => this.ok(e.r, v.kind));
        if (!ex.length) v.dir = -v.dir;
        else {
          const e = ex[(this.rnd() * ex.length) | 0];
          v.r = e.r;
          v.dir = e.end === 0 ? 1 : -1;
          v.s = e.end === 0 ? 0 : e.r.len;
        }
        v.s = clamp(v.s, 0, v.r.len);
      }
      const a = along(v.r.pts, v.s);
      // India drives on the left
      const lane = Math.min(v.r.w / 4, 2.4) + (v.kind === 'scooter' ? 0.9 : 0);
      const ddx = a.dx * v.dir, ddz = a.dz * v.dir;
      v.x = a.x + ddz * lane;
      v.z = a.z - ddx * lane;
      const want = Math.atan2(-ddz, ddx);
      v.yaw += angDiff(v.yaw, want) * (1 - Math.exp(-dt * 5));
      v.group.position.set(v.x, 0, v.z);
      v.group.rotation.y = v.yaw;
      if (Math.hypot(v.x - px, v.z - pz) > 280) {
        v.active = false;
        v.group.visible = false;
      }
    }
  }
  pushOut(p, r) {
    for (const v of this.list) {
      if (!v.active) continue;
      const dx = p.x - v.x, dz = p.z - v.z, d = Math.hypot(dx, dz), min = r + v.radius * 0.85;
      if (d < min && d > 1e-4) {
        p.x = v.x + (dx / d) * min;
        p.z = v.z + (dz / d) * min;
      }
    }
  }
}

// ---- rickshaws you can drive ----------------------------------------------------------

export class Rickshaws {
  constructor(scene, world, lib, spots) {
    this.list = spots.map((s) => {
      const group = buildModel(lib, (m) => M.auto(m));
      const p = world.findFree(s.x, s.z, 1.3, 25);
      group.position.set(p.x, 0, p.z);
      group.rotation.y = s.yaw;
      scene.add(group);
      return { group, x: p.x, z: p.z, yaw: s.yaw, speed: 0, driven: false, solid: world.addSolid(p.x, p.z, 1.2) };
    });
  }
}

// ---- strays -----------------------------------------------------------------------

function animal(m, kind) {
  const col = kind === 'cat' ? ['#d98a3a', '#2a2a2a', '#e9e2d2'][(Math.random() * 3) | 0] : ['#b5895a', '#3a2f28', '#d9c7a3', '#8a6a48'][(Math.random() * 4) | 0];
  const s = kind === 'cat' ? 0.55 : 1;
  m.box(0, 0.32 * s, 0, 0.72 * s, 0.26 * s, 0.26 * s, col, 'flat');
  m.box(0.42 * s, 0.42 * s, 0, 0.26 * s, 0.24 * s, 0.22 * s, col, 'flat');
  m.box(0.56 * s, 0.4 * s, 0, 0.14 * s, 0.1 * s, 0.12 * s, col, 'flat');
  for (const e of [-1, 1]) m.box(0.42 * s, 0.64 * s, e * 0.08 * s, 0.06 * s, 0.1 * s, 0.06 * s, col, 'flat');
  for (const x of [-0.26, 0.26]) for (const z of [-0.08, 0.08]) m.box(x * s, 0, z * s, 0.07 * s, 0.34 * s, 0.07 * s, col, 'flat');
  m.box(-0.42 * s, 0.44 * s, 0, 0.3 * s, 0.06 * s, 0.06 * s, col, 'flat', { rz: -0.7 });
}

export class Strays {
  constructor(scene, world, lib, spots) {
    const names = [['Moti', 'मोती', 'dog'], ['Raja', 'राजा', 'dog'], ['Mau', 'माऊ', 'cat'], ['Kalu', 'काळू', 'dog'], ['Chiu', 'चिऊ', 'cat'], ['Tommy', 'टॉमी', 'dog']];
    this.world = world;
    this.list = spots.map((s, i) => {
      const [en, mr, kind] = names[i % names.length];
      const group = buildModel(lib, (m) => animal(m, kind));
      const p = world.findFree(s.x, s.z, 0.5, 20);
      group.position.set(p.x, 0, p.z);
      group.rotation.y = i * 1.7;
      scene.add(group);
      return { group, kind, name: { en, mr }, x: p.x, z: p.z, hx: p.x, hz: p.z, yaw: i * 1.7, follow: false, t: 0 };
    });
  }
  update(dt, player) {
    for (const a of this.list) {
      a.t += dt;
      let tx = a.hx, tz = a.hz, stop = 0.4;
      if (a.follow && player.mode !== 'drive') (tx = player.pos.x), (tz = player.pos.z), (stop = 1.6);
      const dx = tx - a.x, dz = tz - a.z, d = Math.hypot(dx, dz);
      let moving = false;
      if (d > stop) {
        const sp = Math.min(a.follow ? 11 : 4, d * 2.2);
        const p = { x: a.x + (dx / d) * sp * dt, z: a.z + (dz / d) * sp * dt };
        this.world.walls.resolve(p, 0.25);
        a.x = p.x;
        a.z = p.z;
        a.yaw += angDiff(a.yaw, Math.atan2(-dz, dx)) * (1 - Math.exp(-dt * 8));
        moving = true;
      }
      const g = a.group;
      g.position.set(a.x, moving ? Math.abs(Math.sin(a.t * 14)) * 0.05 : 0, a.z);
      g.rotation.y = a.yaw;
      // curled up asleep when left alone
      g.scale.y = !moving && !a.follow ? 0.62 : 1;
    }
  }
}

// ---- evening walkers circling the lakes -------------------------------------------

export class Walkers {
  constructor(scene, loops, count) {
    this.rnd = mulberry32(2024);
    this.list = [];
    const usable = loops.map((pts) => {
      let len = 0;
      const closed = pts.concat([pts[0]]);
      for (let i = 1; i < closed.length; i++) len += Math.hypot(closed[i][0] - closed[i - 1][0], closed[i][1] - closed[i - 1][1]);
      return { pts: closed, len };
    }).filter((l) => l.len > 150);
    if (!usable.length) return;
    const total = usable.reduce((s, l) => s + l.len, 0);
    for (let i = 0; i < count; i++) {
      // longer tracks get more walkers
      let pick = this.rnd() * total, loop = usable[0];
      for (const l of usable) {
        if ((pick -= l.len) <= 0) {
          loop = l;
          break;
        }
      }
      const jog = this.rnd() < 0.25;
      const person = new Person(completeLook(jog ? { garb: 'tee' } : {}, this.rnd), this.rnd);
      scene.add(person.root);
      this.list.push({ person, loop, s: this.rnd() * loop.len, dir: this.rnd() < 0.7 ? 1 : -1, v: jog ? 3.4 + this.rnd() : 1.2 + this.rnd() * 0.5, off: (this.rnd() - 0.5) * 3 });
    }
  }
  update(dt, player) {
    for (const w of this.list) {
      w.s = (w.s + w.dir * w.v * dt + w.loop.len) % w.loop.len;
      const a = along(w.loop.pts, w.s);
      const x = a.x + a.dz * w.off, z = a.z - a.dx * w.off;
      const d = Math.hypot(x - player.pos.x, z - player.pos.z);
      const root = w.person.root;
      root.visible = d < 150;
      if (!root.visible) continue;
      root.position.set(x, 0, z);
      root.rotation.y = Math.atan2(a.dx * w.dir, a.dz * w.dir);
      w.person.update(dt, w.v, 'stand');
      w.person.setShadows(d < 45);
    }
  }
}

// ---- the local that pulls in and out of Panvel ---------------------------------------

export class LocalTrain {
  constructor(scene, lib, path) {
    this.path = path;
    this.cars = [];
    const n = 6;
    for (let i = 0; i < n; i++) {
      const g = buildModel(lib, (m) => M.coach(m, i === 0 ? 1 : i === n - 1 ? -1 : 0));
      g.visible = false;
      scene.add(g);
      this.cars.push(g);
    }
    this.L = 21.7;
    this.half = (n * this.L) / 2;
    this.state = 'away';
    this.t = 6;
    this.dir = 1;
    this.s = 0;
    this.v = 0;
    this.x = 0;
    this.z = 0;
  }
  update(dt, onEvent) {
    const p = this.path, lo = this.half + 2, hi = p.len - this.half - 2;
    const stop = Math.min(hi, Math.max(lo, p.stop));
    if (this.state === 'away') {
      this.t -= dt;
      if (this.t > 0) return;
      this.dir = -this.dir;
      this.s = this.dir > 0 ? lo : hi;
      this.v = 15;
      this.state = 'in';
      for (const c of this.cars) c.visible = true;
      onEvent?.('arriving');
    } else if (this.state === 'in') {
      const dist = Math.abs(stop - this.s);
      this.v = Math.min(16, Math.max(0.6, Math.sqrt(2 * 0.9 * dist)));
      this.s += this.dir * this.v * dt;
      if (dist < 0.6 || (this.dir > 0 ? this.s >= stop : this.s <= stop)) {
        this.s = stop;
        this.v = 0;
        this.state = 'dwell';
        this.t = 22;
        onEvent?.('stopped');
      }
    } else if (this.state === 'dwell') {
      this.t -= dt;
      if (this.t <= 0) {
        this.state = 'out';
        onEvent?.('leaving');
      }
    } else {
      this.v = Math.min(17, this.v + 0.8 * dt);
      this.s += this.dir * this.v * dt;
      if (this.s <= lo || this.s >= hi) {
        this.state = 'away';
        this.t = 35 + Math.random() * 30;
        for (const c of this.cars) c.visible = false;
        return;
      }
    }
    const n = this.cars.length;
    for (let i = 0; i < n; i++) {
      const a = along(p.pts, this.s + (((n - 1) / 2 - i) * this.L));
      const c = this.cars[i];
      c.position.set(a.x, 0.18, a.z);
      c.rotation.y = Math.atan2(-a.dz, a.dx);
      if (i === (n >> 1)) (this.x = a.x), (this.z = a.z);
    }
  }
}

// ---- other visitors, live ------------------------------------------------------------

export class Visitors {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.shown = new Map(); // peer id -> Person
    this.rnd = mulberry32(31337);
  }
  update(dt, live, player) {
    const now = Date.now();
    const k = 1 - Math.exp(-dt * 9);
    let count = 0;
    for (const p of live.peers.values()) {
      // ease towards the last reported position; snap if they jumped (rickshaw ride, rejoin)
      if (Math.hypot(p.tx - p.x, p.tz - p.z) > 14) (p.x = p.tx), (p.z = p.tz);
      p.x += (p.tx - p.x) * k;
      p.z += (p.tz - p.z) * k;
      p.yaw += angDiff(p.yaw, p.tyaw) * k;
      const d = Math.hypot(p.x - player.pos.x, p.z - player.pos.z);
      p.dist = d;
      const want = d < 170 && count < 30;
      let person = this.shown.get(p.id);
      if (!want) {
        if (person) {
          person.dispose();
          this.shown.delete(p.id);
        }
        p.person = null;
        continue;
      }
      count++;
      if (!person || person.rev !== p.lookRev) {
        if (person) person.dispose();
        person = new Person(p.look, this.rnd);
        person.rev = p.lookRev;
        this.scene.add(person.root);
        this.shown.set(p.id, person);
      }
      p.person = person;
      const seated = p.mode !== 0;
      person.root.position.set(p.x, this.world.heightAt(p.x, p.z) + (seated ? -0.06 : 0), p.z);
      person.root.rotation.y = p.yaw;
      if (p.wave && now - p.wave < 500) {
        person.wave(1.6);
        p.wave = 0;
      }
      // if news stops arriving, they stand still rather than walk on the spot
      const moving = now - p.moved < 900 ? p.v : 0;
      person.update(dt, seated ? 0 : moving, seated ? 'sit' : 'stand');
      person.setShadows(d < 45);
      if (p.say && now > p.sayUntil) p.say = null;
    }
    for (const [id, person] of this.shown) {
      if (!live.peers.has(id)) {
        person.dispose();
        this.shown.delete(id);
      }
    }
  }
}
