// People of Panvel — entry point and game loop.

import * as THREE from 'three';
import { params, mulberry32, hashStr, clamp, h, isTouch } from './util.js';
import { store } from './store.js';
import { t, getLang } from './i18n.js';
import { createRenderer, pickTier } from './gfx/renderer.js';
import { buildMaterials } from './gfx/materials.js';
import { Atmosphere } from './gfx/sky.js';
import { buildTown } from './world/town.js';
import { createWater } from './world/water.js';
import { furnish } from './world/props.js';
import { special, placeSetpieces } from './world/setpieces.js';
import { placeNames } from './world/naming.js';
import { signGroup, setSignNight } from './world/signs.js';
import { World } from './world/world.js';
import { createImagery } from './world/imagery.js';
import { CONFIG } from './config.js';
import { Input } from './input.js';
import { Player, CameraRig, Traffic, Rickshaws, Strays, LocalTrain, Visitors } from './entities/actors.js';
import { completeLook } from './entities/person.js';
import { Live } from './net/live.js';
import { openInvite, tidyCode } from './net/invite.js';
import { SPAWN, TITLE_SHOT, zoneAt } from './data/places.js';
import { createUI } from './ui.js';
import { createMap } from './minimap.js';
import { STREET_MR } from './data/streets.js';
import { sfx } from './sfx.js';

const canvas = document.getElementById('city');
const bootMsg = document.getElementById('boot-msg');
const say = (s) => (bootMsg.textContent = s);
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
// Let the browser paint without waiting for a frame or a (possibly throttled) timer.
const channel = new MessageChannel();
const breathe = () => new Promise((r) => {
  channel.port1.onmessage = () => r();
  channel.port2.postMessage(0);
});

const marks = [['start', performance.now()]];
const mark = (name) => marks.push([name, performance.now()]);

// start the map download straight away; textures are painted while it arrives
const dataPromise = fetch('data/panvel.json');
// An invite link carries its code after the #. Take it out of the address bar at once, so it is not left in history.
const linkCode = /[#&]invite=([\w-]+)/.exec(location.hash)?.[1] || null;
if (linkCode) history.replaceState(null, '', location.pathname + location.search);

async function start() {
  const tierName = params.get('q') || store.get('quality') || pickTier();
  const R = createRenderer(canvas, tierName);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(56, window.innerWidth / window.innerHeight, 0.3, R.tier.far);
  camera.layers.enable(1); // layer 1: small detail the lake mirror skips

  say(t('loading'));
  // Signboards are painted with these fonts; if the network is slow, carry on with system fonts.
  await Promise.race([
    Promise.all([
      document.fonts.load('800 40px "Baloo 2"', 'पनवेल ABC'),
      document.fonts.load('700 20px "Baloo 2"', 'पनवेल ABC'),
      document.fonts.load('600 16px "Mukta"', 'पनवेल ABC'),
    ]).catch(() => {}),
    new Promise((r) => setTimeout(r, 2500)),
  ]);
  const bar = document.getElementById('boot-bar');
  let lastYield = performance.now();
  const progress = async (f) => {
    if (performance.now() - lastYield < 140) return;
    if (bar) bar.style.width = Math.round(8 + f * 92) + '%';
    await breathe();
    lastYield = performance.now();
  };
  await progress(0);
  mark('fonts');
  await nextFrame();
  const lib = buildMaterials(tierName);
  mark('textures');

  const data = await (await dataPromise).json();
  mark('map data');
  await nextFrame();
  const t0 = performance.now();
  // Development checks, on this machine only: ?tiles=osm lays ordinary map tiles instead of photos, to see
  // that tiles line up with the town; ?satkey= tries an imagery key; ?reviewer= trusts a test reviewer's key.
  const dev = /^(127\.0\.0\.1|localhost)$/.test(location.hostname);
  const devTiles = dev && params.get('tiles') === 'osm';
  const noImagery = { enabled: false, update() {}, start() {} };
  let imagery = params.get('tiles') === 'off' ? noImagery
    : createImagery(CONFIG.imagery, R.tier, data.meta, lib, devTiles ? { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '© OpenStreetMap contributors', zoom: parseInt(params.get('z') || '17', 10) } : dev && params.get('satkey') ? { key: params.get('satkey') } : null);
  // A wrong or expired key must not leave the town standing on blank ground: check one photo first.
  if (imagery.enabled && !(await imagery.probe(SPAWN.x, SPAWN.z))) {
    console.warn('Satellite imagery could not be loaded (check the key in js/config.js). Using the drawn ground instead.');
    imagery = noImagery;
  }
  const town = await buildTown(data, lib, R.tier, {
    special,
    imagery,
    progress,
    async furnish(m, env) {
      await furnish(m, env);
      await env.step(0.88);
      placeSetpieces(m, env);
      placeNames(m, env);
    },
  });
  await progress(0.96);
  scene.add(town.group, signGroup);
  signGroup.traverse((o) => o.layers.set(1));
  const chunks = town.group.children.filter((c) => c.userData.cx !== undefined).map((c) => ({ c, detail: c.children.filter((mesh) => mesh.userData.detail), flat: c.children.filter((mesh) => mesh.name === 'asphalt' || mesh.name === 'paver'), shown: true }));
  mark('town');
  console.info(`town built in ${Math.round(performance.now() - t0)} ms`, JSON.stringify(town.stats));

  const atmo = new Atmosphere(scene, R.renderer, lib, R.tier);
  if (params.has('time')) {
    atmo.setTime(parseFloat(params.get('time')));
    atmo.hour = atmo.locked;
  }
  if (params.has('rain')) {
    atmo.setRain(params.get('rain') === '1');
    atmo.rain = atmo.rainTarget;
  }
  const water = createWater(town.waterPolys, R.tier, scene);
  R.setup(scene, camera);

  if (imagery.enabled) {
    imagery.start(SPAWN.x, SPAWN.z, (ok) => !ok && console.warn('Satellite imagery could not be loaded; check the key in js/config.js'));
    document.body.append(h('div.imgcredit', imagery.attribution));
  }
  const world = new World(town, data);
  const spots = town.ctx.spots;
  const input = new Input(canvas);
  const player = new Player(scene, world);
  const rig = new CameraRig(camera);
  const light = R.tier.name === 'low';
  // The town's own life is vehicles and animals only. Every person you see here is a real member.
  const traffic = new Traffic(scene, world, lib, light ? 9 : 22);
  new Rickshaws(scene, world, lib, spots.autos);
  new Strays(scene, world, lib, spots.hubs.map((s, i) => ({ x: s.x + 5 + i, z: s.z - 6 })));
  const train = spots.trainPath ? new LocalTrain(scene, lib, spots.trainPath) : null;

  // street lamps that actually light things near you at night
  const lampPool = [];
  for (let i = 0; i < (light ? 2 : 4); i++) {
    const pl = new THREE.PointLight(0xffd9a0, 0, 34, 1.7);
    scene.add(pl);
    lampPool.push(pl);
  }
  const lamps = town.ctx.lamps || [];

  // a shaft of light over the place you are being walked to
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.9, 60, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffb627, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide, fog: false }),
  );
  beacon.visible = false;
  scene.add(beacon);
  // a ring on the ground under the member you are about to greet
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.62, 0.8, 40).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xf2c21a, transparent: true, opacity: 0.95, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 }),
  );
  ring.visible = false;
  ring.layers.set(1);
  scene.add(ring);

  // ---- who this visitor is: a ghost, or a member with an invite -----------------------
  const settings = { reviewers: [...CONFIG.invite.reviewers], revoked: [...CONFIG.invite.revoked] };
  if (dev && params.get('reviewer')) settings.reviewers.push(params.get('reviewer'));
  const live = new Live(settings);
  const visitors = new Visitors(scene, world);
  let member = null; // the opened invite
  let elsewhere = false; // the invite is in use on another device right now
  let linkProblem = null;

  /** ghost: looking only. waiting: has an invite, has not walked in yet. member: in. elsewhere: bumped by another device. */
  const status = () => (!member ? 'ghost' : elsewhere ? 'elsewhere' : !store.get('rulesOk') ? 'waiting' : 'member');
  const ghostLook = { woman: false, garb: 'kurta', top: '#f2efe6', bottom: '#5d6d7e', hairStyle: 'short', skin: '#b97c52', acc: [], accent: '#ff5a3c', h: 1 };
  /** Dress the character: a member's own look, or a see-through ghost. */
  function dress(look) {
    player.setLook(look || (member && store.get('look')) || ghostLook);
    player.person.setGhost(status() !== 'member');
  }
  /** Open an invite code and make this visitor that member. Throws 'shape', 'unknown' or 'revoked'. */
  async function adopt(code) {
    const m = await openInvite(code, settings.reviewers, settings.revoked);
    member = m;
    elsewhere = false;
    store.set('invite', tidyCode(code));
    // everyone starts with a look of their own, drawn from their member id
    if (!store.get('look')) store.set('look', completeLook({}, mulberry32(hashStr('look:' + m.mid))));
    dress();
    return m;
  }
  /** Join the relay: seen and heard as a member, or silently as a ghost. */
  function connect() {
    live.start(player.pos, status() === 'member' ? member : null, store.get('look'));
    dress();
    ui.refresh();
  }
  for (const code of [linkCode, store.get('invite')]) {
    if (!code || member) continue;
    try {
      await adopt(code);
    } catch (e) {
      if (code === linkCode) linkProblem = e.message;
      else if (e.message !== 'unknown') store.set('invite', null); // 'unknown' may only mean the reviewer's key is not on the site yet
    }
  }

  // ---- what the interface can ask for -------------------------------------------------
  let state = 'intro', time = 0, guide = null;
  rig.setFirstPerson((params.get('view') || store.get('view')) === 'fp');
  const reticle = h('div.reticle', { hidden: true });
  document.body.append(reticle);
  /** True if you could walk from where you stand to (x, z) without a wall or water in between. */
  const clearWay = (x, z) => world.walls.cast(player.pos.x, player.pos.z, x, z) >= 1;
  /** Arrive somewhere by rickshaw: a short ride across the screen, then you are there. */
  function ride(mr, en, x, z, face) {
    game.stopWalk();
    input.enabled = false;
    ui.travelFx(mr, en, () => {
      player.place(x, z, face);
      rig.yaw = face + Math.PI;
      rig.snap(player);
      input.enabled = !ui.panel;
    });
  }

  const game = {
    input, player, live,
    member: () => member,
    status,
    // the 2-D map is drawn the first time it is needed, not during loading
    get map() {
      return (this._map ||= createMap(data));
    },
    streetMr: (n) => STREET_MR[n],
    firstPerson: () => rig.fp,
    toggleView() {
      rig.setFirstPerson(!rig.fp);
      store.set('view', rig.fp ? 'fp' : 'tp');
      if (!rig.fp) input.unlock();
      rig.snap(player);
    },
    heading: () => -rig.yaw, // map arrow: clockwise from north
    guide: () => guide,

    /** Walk somewhere by yourself: straight there if nothing is in the way, otherwise round by the streets. */
    walkTo(g) {
      const near = Math.hypot(g.x - player.pos.x, g.z - player.pos.z) < 140 && clearWay(g.x, g.z);
      const pts = near ? [[g.x, g.z]] : world.route(player.pos.x, player.pos.z, g.x, g.z);
      if (!pts) return ui.toast(t('no_route'));
      guide = g;
      beacon.visible = true;
      player.autoEnded = null;
      player.auto = { pts, i: 0, stop: 2.5 };
    },
    stopWalk() {
      guide = null;
      beacon.visible = false;
      player.auto = null;
      ui.setGuide(null);
    },
    /** Ride to a rickshaw stand. */
    travelTo(hub) {
      const spot = spots.hubs.find((s) => s.id === hub.id) || hub;
      ride(hub.mr, hub.en, spot.x + 1.5, spot.z + 1.5, hub.face);
    },
    /** Ride to where a member is standing, and arrive a few steps away, facing them. */
    rideTo(q) {
      const a = Math.random() * 6.283, x = q.tx + Math.cos(a) * 4, z = q.tz + Math.sin(a) * 4;
      ride(q.name, '', x, z, Math.atan2(q.tx - x, q.tz - z));
    },

    /** Use an invite code typed or pasted by the visitor. */
    async enterCode(code) {
      await adopt(code);
      if (store.get('rulesOk')) {
        ui.close();
        connect();
        ui.toast(t('welcome_name', { name: member.name }), 'good');
      } else ui.open('rules');
    },
    acceptRules() {
      store.set('rulesOk', true);
      connect();
      ui.toast(t('welcome_name', { name: member.name }), 'good');
    },
    /** Take the invite back from another device. */
    useHere() {
      elsewhere = false;
      connect();
    },
    /** Forget the invite on this device and go back to being a ghost. */
    leave() {
      store.set('invite', null);
      member = null;
      connect();
      ui.toast(t('left'));
    },
    canAsk: () => !!(CONFIG.invite.requestUrl || CONFIG.invite.requestEmail),
    askUrl(name, why) {
      if (CONFIG.invite.requestUrl) return CONFIG.invite.requestUrl;
      const body = `Namaskar,\n\nI would like an invite to People of Panvel.\n\nName: ${name}\nAbout me and Panvel: ${why}\n`;
      return `mailto:${CONFIG.invite.requestEmail}?subject=${encodeURIComponent('Invite request: ' + name)}&body=${encodeURIComponent(body)}`;
    },
    reportUrl(q) {
      if (!CONFIG.invite.requestEmail) return null;
      const body = `Member: ${q.name}\nMember id: ${q.mid}\nWhen: ${new Date().toISOString()}\n\nWhat happened:\n`;
      return `mailto:${CONFIG.invite.requestEmail}?subject=${encodeURIComponent('Report: ' + q.name)}&body=${encodeURIComponent(body)}`;
    },

    look: () => store.get('look') || player.person.look,
    previewLook: (look) => dress(look),
    setLook(look) {
      store.set('look', look);
      dress();
      live.setLook(look);
    },
    quality: () => R.tier.name,
    setQuality(k) {
      store.set('quality', k);
      setTimeout(() => location.reload(), 250);
    },
    onPanel(name, was) {
      if (name) input.unlock();
      input.enabled = !name;
      if (was === 'look') dress(); // drop a look that was tried on but not saved
    },
  };
  const ui = createUI(game);
  live.on.status = (st) => {
    ui.refresh();
    if (st === 'retry' && live.attempt === 3) ui.toast(t('relay_down'));
  };
  live.on.peers = () => ui.peopleChanged();
  live.on.chat = (msg) => {
    ui.onChat(msg);
    if (!msg.mine) sfx.pop();
  };
  // the same invite was opened somewhere else: step back to a ghost here
  live.on.displaced = () => {
    elsewhere = true;
    connect();
    ui.toast(t('elsewhere'));
  };
  window.addEventListener('pagehide', () => live.stop());
  input.wantLock = () => state === 'play' && rig.fp && !ui.panel;
  const touchDevice = isTouch();

  // The one thing to do besides walking and talking: greet the member in front of you.
  let action = null;
  function findAction() {
    let best = null;
    for (const q of live.peers.values()) if (q.person && q.dist < 3.2 && (!best || q.dist < best.dist)) best = q;
    return best ? { text: '👋 ' + best.name.toUpperCase(), id: best.sid, who: best, run: () => ui.open('person', best) } : null;
  }

  input.onPress = (code) => {
    if (state !== 'play') {
      if (code === 'Enter' || code === 'Space') document.querySelector('.intro .btn')?.click();
      return;
    }
    if (code === 'Escape') {
      if (document.activeElement && document.activeElement.tagName === 'INPUT') return ui.blurSay();
      return ui.panel ? ui.close() : game.stopWalk();
    }
    if (ui.panel) return;
    if (code === 'Enter') return ui.focusSay();
    if (code === 'KeyE') return action?.run();
    if (code === 'KeyM' || code === 'Tab') return ui.open('map');
    if (code === 'KeyP') return ui.open('people');
    if (code === 'KeyV') return game.toggleView();
  };

  function enter() {
    state = 'play';
    const at = params.get('at')?.split(',').map(Number);
    // arrive looking north, across the lake
    rig.yaw = params.has('yaw') ? parseFloat(params.get('yaw')) : 0.15;
    player.place(at ? at[0] : SPAWN.x, at ? at[1] : SPAWN.z, rig.yaw + Math.PI);
    rig.pitch = params.has('pitch') ? parseFloat(params.get('pitch')) : rig.fp ? 0.02 : 0.26;
    if (params.has('dist')) rig.dist = parseFloat(params.get('dist'));
    rig.snap(player);
    ui.setZone(zoneAt(player.pos.x, player.pos.z));
    ui.showHud();
    connect();
    if (linkProblem) setTimeout(() => ui.toast(t('link_' + (linkProblem === 'revoked' ? 'revoked' : 'bad'))), 1200);
    else if (status() === 'waiting') setTimeout(() => !ui.panel && ui.open('rules'), 900);
    else if (!store.get('hinted')) {
      store.set('hinted', true);
      setTimeout(() => ui.toast(t(touchDevice ? 'hint_touch' : 'hint_keys')), 1200);
    }
    if (params.has('panel')) setTimeout(() => ui.open(params.get('panel')), 300);
  }
  dress();
  if (params.has('play')) enter();
  else ui.intro(enter);

  window.addEventListener('resize', () => R.resize(camera));
  document.addEventListener('visibilitychange', () => clock.getDelta());

  // ---- loop -----------------------------------------------------------------------------
  const clock = new THREE.Clock();
  const focus = new THREE.Vector3();
  const maxFrames = parseInt(params.get('frames') || '0', 10);
  let frames = 0, slow = 0, acc = 0, step = 0, degrade = 0, lampT = 0, readT = 0, miniT = 0, lastStep = 0, cullT = 0, wasHigh = false;

  function frame() {
    const dt = Math.min(0.05, clock.getDelta());
    time += dt;

    if (state === 'intro') {
      const a = time * 0.03 + 0.4;
      const [lx, ly, lz] = TITLE_SHOT.look;
      camera.position.set(lx + Math.cos(a) * 250, 58 + Math.sin(time * 0.1) * 5, lz + Math.sin(a) * 250);
      camera.lookAt(lx, ly + 8, lz);
      focus.set(lx, 0, lz);
    } else {
      const look = input.consumeLook();
      player.update(dt, input, rig.yaw, traffic);
      if (player.autoEnded) {
        // arrived, or the walker took over, or something was in the way
        if (player.autoEnded === 'stuck') ui.toast(t('walk_stuck'));
        player.autoEnded = null;
        game.stopWalk();
      }
      rig.update(dt, look, input.turn(), player, world);
      traffic.update(dt, player);
      // facing: where you look in first person, where the body points otherwise
      live.update(player.pos.x, player.pos.z, rig.fp && !player.auto ? rig.yaw + Math.PI : player.yaw, player.speed);
      visitors.update(dt, live, player);
      train?.update(dt, (ev) => {
        // you hear it if you are near the station
        if (zoneAt(player.pos.x, player.pos.z).id === 'junction') {
          if (ev === 'arriving') sfx.chime();
          if (ev === 'leaving') sfx.horn();
        }
      });
      focus.set(player.pos.x, 0, player.pos.z);

      action = ui.panel ? null : findAction();
      ui.setPrompt(action ? action.text : '', () => action?.run());
      ring.visible = !!action;
      if (action) ring.position.set(action.who.x, world.heightAt(action.who.x, action.who.z) + 0.04, action.who.z);

      // footsteps, in time with the stride
      if (player.speed > 0.6) {
        const k = Math.floor(player.person.phase / Math.PI);
        if (k !== lastStep) {
          lastStep = k;
          sfx.step(atmo.rain > 0.5);
        }
      }
      reticle.hidden = !rig.fp || !!ui.panel;
      ui.setLookHint(rig.fp && !input.locked && !touchDevice && !ui.panel);
      miniT += dt;
      if (miniT > 0.1) {
        miniT = 0;
        ui.drawMini(player.pos.x, player.pos.z, -rig.yaw, guide);
      }

      step += dt;
      if (step > 0.25) {
        step = 0;
        const px = player.pos.x, pz = player.pos.z, now = Date.now();
        ui.setZone(zoneAt(px, pz));
        ui.setStreet(world.streetNameAt(px, pz) || '');
        ui.refresh();
        for (const q of live.peers.values()) {
          const d = q.dist ?? 1e9;
          // someone has come within earshot
          if (d < 50 && !q.noticed) {
            q.noticed = true;
            ui.toast(t('near_toast', { name: q.name }));
            sfx.hello();
          } else if (d > 90) q.noticed = false;
          // two members who meet fold their hands to each other
          if (d < 6 && live.speaking && now - (q.greeted || 0) > 120000) {
            q.greeted = now;
            q.person?.emote('namaskar');
            player.person.emote('namaskar');
          }
        }
        if (world.atEdge && time - (game.edgeT || -99) > 8) {
          game.edgeT = time;
          ui.toast(t('edge'));
        }
      }
      readT += dt;
      if (readT > 1) {
        readT = 0;
        sfx.rain(atmo.rain);
        const px = player.pos.x, pz = player.pos.z;
        let near = 0;
        for (const v of traffic.list) if (v.active && Math.hypot(v.x - px, v.z - pz) < 80) near++;
        const zn = zoneAt(px, pz).id;
        sfx.ambience({
          bustle: clamp(near / 7 + (['bazaar', 'stand', 'junction', 'chowk'].includes(zn) ? 0.3 : 0.08), 0, 1) * (1 - atmo.night * 0.5),
          night: atmo.night, rain: atmo.rain,
          green: zn === 'talav' || !!town.greens.find(px, pz),
          temple: Math.hypot(px + 473, pz + 205) < 80,
          station: zn === 'junction',
        });
      }
      if (guide) {
        const dx = guide.x - player.pos.x, dz = guide.z - player.pos.z, d = Math.hypot(dx, dz);
        beacon.position.set(guide.x, 30, guide.z);
        beacon.material.opacity = 0.18 + Math.sin(time * 3) * 0.08;
        const fx = -Math.sin(rig.yaw), fz = -Math.cos(rig.yaw), rx = Math.cos(rig.yaw), rz = -Math.sin(rig.yaw);
        ui.setGuide({ label: guide.label, dist: d, angle: Math.atan2(dx * rx + dz * rz, dx * fx + dz * fz) });
      }
      // move the real lights to the nearest lamp posts
      lampT -= dt;
      if (lampT <= 0 && lamps.length) {
        lampT = 0.5;
        const px = player.pos.x, pz = player.pos.z;
        const near = [];
        for (const l of lamps) {
          const d = (l[0] - px) * (l[0] - px) + (l[2] - pz) * (l[2] - pz);
          if (d < 3600) near.push([d, l]);
        }
        near.sort((a, b) => a[0] - b[0]);
        lampPool.forEach((pl, i) => {
          const l = near[i];
          if (l) pl.position.set(l[1][0], l[1][1] - 0.4, l[1][2]);
          pl.userData.on = !!l;
        });
      }
      for (const pl of lampPool) pl.intensity = pl.userData.on ? atmo.night * 150 : 0;
    }

    imagery.update(time);
    atmo.update(dt, camera.position, focus);
    water.update(dt, camera.position, atmo, camera);
    // far-away blocks drop their small street-level detail
    cullT -= dt;
    if (cullT <= 0) {
      cullT = 0.3;
      const range = R.tier.detailRange + Math.max(0, camera.position.y - 20) * 3;
      // From high up, with photos on the ground, the drawn road surface gives way to the real one in the photo.
      const high = imagery.enabled && camera.position.y > 60;
      for (const ch of chunks) {
        const show = Math.hypot(ch.c.userData.cx - camera.position.x, ch.c.userData.cz - camera.position.z) < range + 170;
        if (show !== ch.shown || high !== wasHigh) {
          ch.shown = show;
          for (const mesh of ch.detail) mesh.visible = show && !(high && mesh.name === 'mark');
          for (const mesh of ch.flat) mesh.visible = !high;
        }
      }
      wasHigh = high;
    }
    setSignNight(atmo.night);
    R.setNight(atmo.night);
    if (state === 'play') ui.updatePlates(camera, action?.id);
    R.render(scene, camera);

    // drop effects if the machine cannot keep up
    if (!maxFrames && state === 'play' && time > 6) {
      acc += dt;
      if (dt > 0.042) slow += dt;
      if (acc > 4) {
        if (slow / acc > 0.6) {
          degrade++;
          if (degrade === 1) water.disableMirror();
          R.degrade(degrade - 1);
        }
        acc = slow = 0;
      }
    }

    frames++;
    if (maxFrames && frames >= maxFrames) {
      window.__ready = true;
      return;
    }
    if (frames === 1) {
      mark('first frame');
      window.__marks = marks.map(([n, at], i) => `${n} ${Math.round(at - (i ? marks[i - 1][1] : 0))}`).join(' | ');
      console.info('load: ' + window.__marks);
    }
    if (frames === 3) window.__ready = true;
    requestAnimationFrame(frame);
  }
  mark('entities');
  frame();
  window.__pop = { scene, camera, R, atmo, town, lib, world, imagery, player, rig, game, ui, spots, live, visitors };
}

start().catch((e) => {
  console.error(e);
  say('Something went wrong while building Panvel: ' + e.message);
  window.__error = String(e && e.stack ? e.stack : e);
});
