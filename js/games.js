// Street games: a timed lap of Vadale Talav, and a daily hunt for golden modaks
// hidden around town. Both work alone; when you are live, results are shared.

import * as THREE from 'three';
import { along } from './world/geom.js';
import { addSign } from './world/signs.js';
import { buildModel } from './entities/actors.js';
import { mulberry32, hashStr, panvelNow, fmtTime } from './util.js';
import { store } from './store.js';
import { t } from './i18n.js';
import { sfx } from './sfx.js';

const GATES = 10;
const MODAKS = 8;

export function createGames({ scene, world, town, lib, player, live, ui, game, start }) {
  // ---------------------------------------------------------------- the lake lap
  // the walking track around the lake that the rickshaw stand sits beside
  const loops = (town.ctx.promenades || []).map((pts) => {
    const closed = pts.concat([pts[0]]);
    let len = 0, near = Infinity;
    for (let i = 1; i < closed.length; i++) {
      len += Math.hypot(closed[i][0] - closed[i - 1][0], closed[i][1] - closed[i - 1][1]);
      near = Math.min(near, Math.hypot(closed[i][0] - start.x, closed[i][1] - start.z));
    }
    return { pts: closed, len, near };
  }).filter((l) => l.len > 250).sort((a, b) => a.near - b.near);
  const loop = loops[0];
  const race = { ok: !!loop, state: 'idle', next: 0, t0: 0, gates: [], board: [], best: store.get('raceBest') || 0 };
  let ring = null;
  if (race.ok) {
    // start where the track passes closest to the lake's rickshaw stand
    let s0 = 0, bd = Infinity;
    for (let s = 0; s < loop.len; s += 4) {
      const a = along(loop.pts, s);
      const d = Math.hypot(a.x - start.x, a.z - start.z);
      if (d < bd) (bd = d), (s0 = s);
    }
    // a checkpoint that falls on a building slides along the track to open ground
    const open = (a) => !town.footprints.find(a.x, a.z) && !world.inWater(a.x, a.z);
    for (let i = 0; i < GATES; i++) {
      const s = s0 + (loop.len * i) / GATES;
      let a = along(loop.pts, s % loop.len);
      for (let k = 1; k <= 12 && !open(a); k++) {
        for (const off of [k * 6, -k * 6]) {
          const q = along(loop.pts, (s + off + loop.len) % loop.len);
          if (open(q)) {
            a = q;
            break;
          }
        }
      }
      race.gates.push({ x: a.x, z: a.z, dx: a.dx, dz: a.dz });
    }
    race.len = loop.len;
    // the start banner
    const g0 = race.gates[0];
    const ry = Math.atan2(g0.dx, g0.dz);
    const arch = buildModel(lib, (m) => {
      for (const sx of [-2.7, 2.7]) m.cyl(sx, 0, 0, 0.09, 0.09, 4.2, '#e8e4d8', 'gloss', { seg: 8 });
      m.box(0, 3.5, 0, 5.6, 0.9, 0.08, '#1b1b1b', 'flat');
      for (const sx of [-2.7, 2.7]) m.box(sx, 0, 0, 0.5, 0.3, 0.5, '#b9b5ad', 'concrete');
    });
    arch.position.set(g0.x, 0, g0.z);
    arch.rotation.y = ry;
    scene.add(arch);
    for (const flip of [0, Math.PI]) {
      addSign(
        [{ text: 'तलाव शर्यत', size: 56, color: '#f2c21a' }, { text: 'TALAV RACE · START', size: 26, color: '#f5f5f0', weight: 700 }],
        { w: 5.4, h: 0.86, bg: '#1b1b1b', border: '#f2c21a', x: g0.x + Math.sin(ry + flip) * 0.06, y: 3.95, z: g0.z + Math.cos(ry + flip) * 0.06, ry: ry + flip, glow: 0.8, ppm: 90 },
      ).layers.set(1);
    }
    world.addSolid(g0.x + Math.cos(ry) * 2.7, g0.z - Math.sin(ry) * 2.7, 0.3);
    world.addSolid(g0.x - Math.cos(ry) * 2.7, g0.z + Math.sin(ry) * 2.7, 0.3);
    // the glowing ring that marks the next checkpoint
    ring = new THREE.Mesh(
      new THREE.CylinderGeometry(3.6, 3.6, 3.2, 28, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffb627, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false, fog: false }),
    );
    ring.visible = false;
    ring.layers.set(1);
    scene.add(ring);
  }

  function stopRace(why) {
    if (race.state === 'idle') return;
    race.state = 'idle';
    ring.visible = false;
    ui.setBanner(null);
    game.guideTo(null);
    if (why) ui.toast(t(why));
  }

  function nextGate() {
    const g = race.gates[race.next % GATES];
    ring.position.set(g.x, 1.6, g.z);
    ring.visible = true;
    game.guideTo({ x: g.x, z: g.z, label: race.next === GATES ? t('race_finish') : t('race_gate', { n: race.next, t: GATES }), keep: true });
  }

  function startRace() {
    if (!race.ok || race.state !== 'idle') return;
    if (player.mode !== 'walk') return ui.toast(t('race_on_foot'));
    race.state = 'count';
    race.t0 = performance.now() + 3000;
    race.count = 4;
    ui.close();
  }

  // ---------------------------------------------------------------- the daily hunt
  const today = panvelNow().date;
  const dateKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  let saved = store.get('hunt');
  if (!saved || saved.date !== dateKey) saved = { date: dateKey, found: [] };
  const hunt = { date: dateKey, spots: [], found: saved.found, total: MODAKS, done: [] };
  {
    // The same spots for everyone on a given day: chosen only from the street map, not from anything a device builds.
    const rnd = mulberry32(hashStr('modak:' + dateKey));
    const roads = world.allRoads.filter((r) => 'ERL'.includes(r.c) && r.len > 24 && !r.h && !r.tu && !r.br);
    const pl = world.play;
    let guard = 0;
    while (hunt.spots.length < MODAKS && guard++ < 4000) {
      const r = roads[(rnd() * roads.length) | 0];
      const a = along(r.pts, 6 + rnd() * (r.len - 12));
      const side = rnd() < 0.5 ? 1 : -1, off = Math.max(0.6, r.w / 2 - 0.9);
      const x = a.x + a.dz * off * side, z = a.z - a.dx * off * side;
      if (x < pl.minX + 60 || x > pl.maxX - 60 || z < pl.minZ + 60 || z > pl.maxZ - 60) continue;
      if (hunt.spots.some((q) => Math.hypot(q.x - x, q.z - z) < 230) || world.inWater(x, z)) continue;
      hunt.spots.push({ x, z, i: hunt.spots.length, mesh: null });
    }
  }
  const gold = new THREE.MeshStandardMaterial({ color: 0xf5b82e, metalness: 0.85, roughness: 0.28, emissive: 0x7a4a00, emissiveIntensity: 0.9 });
  const beam = new THREE.MeshBasicMaterial({ color: 0xffd76a, transparent: true, opacity: 0.24, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const modakGeo = (() => {
    // a modak: plump at the base, pinched to a point, with pleats
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const v = i / 10;
      pts.push(new THREE.Vector2(Math.sin(v * Math.PI * 0.62) * 0.3 * (1 - v * 0.55) + 0.01, v * 0.5));
    }
    return new THREE.LatheGeometry(pts, 12);
  })();
  for (const sp of hunt.spots) {
    if (hunt.found.includes(sp.i)) continue;
    const g = new THREE.Group();
    const body = new THREE.Mesh(modakGeo, gold);
    body.castShadow = true;
    body.scale.setScalar(1.5);
    const light = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 26, 10, 1, true), beam);
    light.position.y = 13;
    g.add(body, light);
    g.position.set(sp.x, 0.55, sp.z);
    g.traverse((o) => o.layers.set(1));
    scene.add(g);
    sp.mesh = g;
  }

  function nearestModak() {
    let best = null;
    for (const sp of hunt.spots) {
      if (hunt.found.includes(sp.i)) continue;
      const d = Math.hypot(sp.x - player.pos.x, sp.z - player.pos.z);
      if (!best || d < best.d) best = { sp, d };
    }
    return best;
  }

  const games = {
    race, hunt, startRace, stopRace, nearestModak,

    /** Something the player can do right here, if anything. */
    action() {
      if (!race.ok) return null;
      const g0 = race.gates[0];
      if (race.state === 'idle' && player.mode === 'walk' && Math.hypot(g0.x - player.pos.x, g0.z - player.pos.z) < 6) return { text: t('race_start'), run: startRace };
      return null;
    },

    /** A blurred hint: somewhere within 40 m of the nearest modak. */
    hintSpot() {
      const n = nearestModak();
      if (!n) return null;
      const r = mulberry32(hashStr('hint' + n.sp.i + dateKey));
      const a = r() * 6.283, d = 12 + r() * 26;
      return { x: n.sp.x + Math.cos(a) * d, z: n.sp.z + Math.sin(a) * d, d: n.d };
    },

    /** Record a lap someone finished (ours or another visitor's). */
    addResult(name, ms, mine) {
      race.board.push({ name, ms, mine });
      race.board.sort((a, b) => a.ms - b.ms);
      race.board.length = Math.min(race.board.length, 10);
    },

    update(dt, time) {
      // ---- race
      if (race.state === 'count') {
        const g0 = race.gates[0];
        if (Math.hypot(g0.x - player.pos.x, g0.z - player.pos.z) > 9 || player.mode !== 'walk') return stopRace('race_cancelled');
        const left = Math.ceil((race.t0 - performance.now()) / 1000);
        if (left !== race.count) {
          race.count = left;
          if (left > 0) {
            ui.setBanner(`🏁 ${left}`);
            sfx.pop();
          } else {
            race.state = 'run';
            race.next = 1;
            sfx.chime();
            nextGate();
          }
        }
      } else if (race.state === 'run') {
        if (player.mode !== 'walk') return stopRace('race_on_foot');
        const ms = performance.now() - race.t0;
        ui.setBanner(`🏁 ${race.next - 1}/${GATES} · ${fmtTime(ms)}`);
        const g = race.gates[race.next % GATES];
        if (Math.hypot(g.x - player.pos.x, g.z - player.pos.z) < 7.5) {
          if (race.next === GATES) {
            // home
            stopRace();
            const best = !race.best || ms < race.best;
            if (best) {
              race.best = ms;
              store.set('raceBest', ms);
            }
            sfx.stamp();
            ui.toast(t(best ? 'race_best' : 'race_done', { time: fmtTime(ms) }), 'good');
            if (live.online) live.announce('race', { t: Math.round(ms) });
            else games.addResult(store.get('me')?.name || t('you'), ms, true);
            player.person.emote('dance');
          } else {
            race.next++;
            sfx.pop();
            nextGate();
          }
        } else if (ms > 20 * 60000) stopRace('race_cancelled');
        ring.rotation.y += dt * 1.5;
        ring.material.opacity = 0.3 + Math.sin(time * 5) * 0.12;
      }

      // ---- hunt
      for (const sp of hunt.spots) {
        if (!sp.mesh) continue;
        const d = Math.hypot(sp.x - player.pos.x, sp.z - player.pos.z);
        sp.mesh.visible = d < 260;
        if (!sp.mesh.visible) continue;
        sp.mesh.children[0].rotation.y += dt * 2.2;
        sp.mesh.position.y = 0.6 + Math.sin(time * 2.4 + sp.i) * 0.12;
        if (d < 2.2 && player.mode !== 'ride') {
          scene.remove(sp.mesh);
          sp.mesh = null;
          hunt.found.push(sp.i);
          store.set('hunt', { date: dateKey, found: hunt.found });
          sfx.stamp();
          ui.fx(sp.x, 1.6, sp.z, '🥇');
          const all = hunt.found.length === MODAKS;
          ui.toast(t(all ? 'hunt_all' : 'hunt_found', { n: hunt.found.length, t: MODAKS }), 'good');
          if (all) {
            player.person.emote('dance');
            if (live.online) live.announce('hunt');
          }
        }
      }
    },
  };
  return games;
}
