// People of Panvel — entry point and game loop.

import * as THREE from 'three';
import { params, mulberry32, clamp, h } from './util.js';
import { store } from './store.js';
import { t, L, getLang } from './i18n.js';
import { createRenderer, pickTier } from './gfx/renderer.js';
import { buildMaterials } from './gfx/materials.js';
import { Atmosphere } from './gfx/sky.js';
import { cv, tex } from './gfx/texkit.js';
import { buildTown } from './world/town.js';
import { createWater } from './world/water.js';
import { furnish } from './world/props.js';
import { special, placeSetpieces } from './world/setpieces.js';
import { placeNames } from './world/naming.js';
import { signGroup, setSignNight } from './world/signs.js';
import { World } from './world/world.js';
import { createImagery } from './world/imagery.js';
import { CONFIG } from './config.js';
import * as M from './world/models.js';
import { Input } from './input.js';
import { Player, CameraRig, Residents, Crowd, Traffic, Rickshaws, Strays, Walkers, LocalTrain, Visitors, buildModel } from './entities/actors.js';
import { Live } from './net/live.js';
import { createGames } from './games.js';
import { EMOTE_ICON, EMOTES } from './entities/person.js';
import { fmtTime } from './util.js';
import { PEOPLE, POSTERS } from './data/people.js';
import { HUBS, STAMPS, SPAWN, TITLE_SHOT, zoneAt } from './data/places.js';
import { createUI } from './ui.js';
import { createMap } from './minimap.js';
import { STREET_MR } from './data/streets.js';
import { isTouch } from './util.js';
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
const REPO = 'https://github.com/naman1911/people-of-panvel';

const marks = [['start', performance.now()]];
const mark = (name) => marks.push([name, performance.now()]);

// start the map download straight away; textures are painted while it arrives
const dataPromise = fetch('data/panvel.json');

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
  // that tiles line up with the town; ?satkey= tries an imagery key before it goes into js/config.js.
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
  const residents = new Residents(scene, world, PEOPLE);
  const light = R.tier.name === 'low';
  const crowd = new Crowd(scene, world, light ? 12 : 34);
  const traffic = new Traffic(scene, world, lib, light ? 9 : 22);
  const rickshaws = new Rickshaws(scene, world, lib, spots.autos);
  const strays = new Strays(scene, world, lib, spots.hubs.map((s, i) => ({ x: s.x + 5 + i, z: s.z - 6 })));

  const live = new Live();
  const visitors = new Visitors(scene, world, lib);
  visitors.rickshaws = rickshaws;
  const walkers = new Walkers(scene, town.ctx.promenades || [], light ? 6 : 16);
  const train = spots.trainPath ? new LocalTrain(scene, lib, spots.trainPath) : null;

  // somewhere to sit for residents who sit
  for (const n of residents.list) {
    if (n.def.mode !== 'sit') continue;
    const g = buildModel(lib, (m) => M.bench(m, '#6b4a2f'));
    g.position.set(n.x, 0, n.z);
    g.rotation.y = n.baseYaw;
    scene.add(g);
  }

  // street lamps that actually light things near you at night
  const lampPool = [];
  for (let i = 0; i < (light ? 2 : 4); i++) {
    const pl = new THREE.PointLight(0xffd9a0, 0, 34, 1.7);
    scene.add(pl);
    lampPool.push(pl);
  }
  const lamps = town.ctx.lamps || [];

  // notice boards carry live posters
  const boards = spots.boards.map((b) => {
    const [c, g] = cv(768, 400);
    const map = tex(c, { repeat: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.46), new THREE.MeshStandardMaterial({ map, roughness: 0.9 }));
    mesh.position.set(b.x + Math.sin(b.ry) * 0.06, 1.64, b.z + Math.cos(b.ry) * 0.06);
    mesh.rotation.y = b.ry;
    scene.add(mesh);
    return { spot: b, c, g, map };
  });
  function redrawBoards() {
    const lang = getLang();
    const F = '"Baloo 2","Mukta",sans-serif';
    for (const b of boards) {
      const { g } = b;
      g.fillStyle = '#b89c74';
      g.fillRect(0, 0, 768, 400);
      const mine = store.get('posters').filter((p) => p.board === b.spot.id);
      const list = [...mine, ...POSTERS.filter((_, i) => (i + b.spot.id.length) % 2 === 0)].slice(0, 3);
      list.forEach((p, i) => {
        const x = 18 + i * 250, y = 22 + (i % 2) * 14;
        g.save();
        g.translate(x + 116, y + 170);
        g.rotate((i - 1) * 0.02);
        g.fillStyle = ['#f7efdc', '#fff6c9', '#e9f3ea'][i % 3];
        g.fillRect(-116, -170, 232, 340);
        g.fillStyle = ['#1f5ba8', '#b3261e', '#2f7d4f'][i % 3];
        g.fillRect(-116, -170, 232, 74);
        g.fillStyle = '#fff';
        g.font = `800 44px ${F}`;
        g.textAlign = 'center';
        g.fillText(p.kind, 0, -118);
        g.fillStyle = '#1b1b1b';
        g.font = `800 30px ${F}`;
        wrap(g, typeof p.title === 'string' ? p.title : p.title[lang] || p.title.en, 0, -52, 208, 34, 3);
        g.font = `600 20px ${F}`;
        g.fillStyle = '#3a3a3a';
        wrap(g, typeof p.when === 'string' ? p.when : p.when[lang] || p.when.en, 0, 72, 208, 24, 3);
        g.font = `600 17px ${F}`;
        g.fillStyle = '#6a5d4a';
        g.fillText('— ' + p.by, 0, 152);
        g.restore();
      });
      b.map.needsUpdate = true;
    }
  }
  function wrap(g, text, x, y, maxW, lh, maxLines) {
    const words = String(text).split(' ');
    let line = '', n = 0;
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (g.measureText(test).width > maxW && line) {
        g.fillText(line, x, y + n * lh);
        line = w;
        if (++n >= maxLines) return;
      } else line = test;
    }
    g.fillText(line, x, y + n * lh);
  }
  redrawBoards();

  // guide beacon
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.9, 60, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffb627, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide, fog: false }),
  );
  beacon.visible = false;
  scene.add(beacon);

  // ---- game object the UI talks to ------------------------------------------------
  let state = 'intro', time = 0, guide = null, follow = null, riders = new Set();
  const me0 = store.get('me');
  if (me0) player.setLook(me0.look);

  const reticle = h('div.reticle', { hidden: true });
  document.body.append(reticle);
  rig.setFirstPerson((params.get('view') || store.get('view')) !== 'tp');

  /** True if you could walk from where you stand to (x, z) without a wall or water in between. */
  const clearWay = (x, z) => world.walls.cast(player.pos.x, player.pos.z, x, z) >= 1;
  const game = {
    input, atmo, residents, player, strays, store, live,
    /** Become visible to other visitors. Needs a character and agreement to the rules first. */
    goLive() {
      const me = store.get('me');
      if (!me) {
        ui.toast(t('need_me'));
        return ui.open('me');
      }
      if (!store.get('liveOk')) return ui.open('golive');
      store.set('live', true);
      live.start(me, { x: player.pos.x, z: player.pos.z });
    },
    leaveLive() {
      store.set('live', false);
      live.stop();
      ui.toast(t('live_left'));
    },
    reportUrl(v) {
      const body = `Name shown: ${v.name}\nId: ${v.id}\nWhen: ${new Date().toISOString()}\n\nWhat happened:\n`;
      return `${REPO}/issues/new?title=${encodeURIComponent('Report: ' + v.name)}&body=${encodeURIComponent(body)}`;
    },
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
      ui.redrawHud();
    },
    // map arrow: clockwise from north
    heading: () => -rig.yaw,
    guide: () => guide,
    say: (n) => residents.speak(n, time, getLang()),
    mission(id) {
      if (store.add('done', id)) sfx.pop();
    },
    nearestHub() {
      let best = null;
      for (const hb of HUBS) {
        const d = Math.hypot(hb.x - player.pos.x, hb.z - player.pos.z);
        if (!best || d < best.dist) best = { id: hb.id, dist: d };
      }
      return best;
    },
    guideTo(g) {
      guide = g;
      beacon.visible = !!g;
      if (!g) ui.setGuide(null);
      if (!g && player.auto && !follow) player.auto = null;
    },
    /** Do a gesture: you, anyone watching live, and residents close by all see it. */
    emote(kind) {
      player.person.emote(kind);
      live.emote(kind);
      sfx.hello();
      if (rig.fp && player.mode !== 'drive') ui.fx(null, 0, 0, EMOTE_ICON[kind]);
      else ui.fx(player.pos.x, player.y + player.person.height + 0.5, player.pos.z, EMOTE_ICON[kind]);
      // residents answer in kind
      const back = { namaskar: 'namaskar', wave: 'wave', clap: 'namaskar', dance: 'clap', laugh: 'laugh' }[kind];
      for (const n of residents.list) {
        if (n.dist < 7 && back) setTimeout(() => {
          n.person.emote(back);
          ui.fx(n.x, n.person.root.position.y + n.person.height + 0.5, n.z, EMOTE_ICON[back]);
        }, 500 + Math.random() * 400);
      }
    },
    /** Walk to the marker by yourself, along the streets. */
    walkToGuide() {
      if (!guide || player.mode !== 'walk') return;
      // straight there if nothing is in the way, otherwise round by the streets
      const near = Math.hypot(guide.x - player.pos.x, guide.z - player.pos.z) < 140 && clearWay(guide.x, guide.z);
      const pts = near ? [[guide.x, guide.z]] : world.route(player.pos.x, player.pos.z, guide.x, guide.z);
      if (!pts) return ui.toast(t('walk_no_route'));
      follow = null;
      player.autoEnded = null;
      player.auto = { pts, i: 0, stop: 3 };
      ui.toast(t('walk_started'));
    },
    /** Keep walking after another visitor until you take the controls back. */
    follow(v) {
      if (player.mode === 'sit') player.stand();
      if (player.mode !== 'walk') return;
      follow = { id: v.id, name: v.name, at: 0 };
      game.guideTo({ x: v.x, z: v.z, label: v.name, peer: v, keep: true });
      ui.toast(t('following', { name: v.name }));
    },
    /** Ride along in a visitor's rickshaw. */
    hopIn(v) {
      if (v.mode !== 2 || (v.dist ?? 99) > 7) return ui.toast(t('hop_in_far', { name: v.name }));
      if (player.mode === 'sit') player.stand();
      if (player.mode !== 'walk') return;
      follow = null;
      player.ride(v.id);
      sfx.horn();
      ui.toast(t('riding_with', { name: v.name }), 'good');
    },
    showMe(id) {
      const px = player.pos.x, pz = player.pos.z;
      const nearest = (arr) => arr.reduce((b, s) => (!b || Math.hypot(s.x - px, s.z - pz) < Math.hypot(b.x - px, b.z - pz) ? s : b), null);
      let target = null;
      if (id === 'meet') {
        const n = nearest(residents.list);
        target = { x: n.x, z: n.z, label: L(n.def.name), person: n };
      } else if (id === 'chai') target = { ...nearest(spots.seats.filter((s) => s.chai)), label: t('chai_title') };
      else if (id === 'auto') target = { ...nearest(rickshaws.list.filter((r) => !r.takenBy)), label: t('drive') };
      else if (id === 'wall') target = { ...nearest(spots.boards), label: t('wall_title') };
      else if (id === 'stamp') {
        const s = nearest(STAMPS.filter((q) => !store.has('stamps', q.id)));
        if (s) target = { x: s.x, z: s.z, label: L(s) };
      }
      if (target) game.guideTo(target);
    },
    travelTo(hub) {
      input.enabled = false;
      ui.travelFx(hub, () => {
        if (player.mode === 'drive') player.exit();
        if (player.mode === 'sit') player.stand();
        if (player.mode === 'ride') player.leaveRide();
        follow = null;
        player.auto = null;
        const spot = spots.hubs.find((s) => s.id === hub.id) || hub;
        player.place(spot.x + 1.5, spot.z + 1.5, hub.face);
        rig.yaw = hub.face + Math.PI;
        rig.snap(player);
        for (const s of strays.list) if (s.follow) (s.x = player.pos.x + 1), (s.z = player.pos.z + 1);
        input.enabled = true;
        setTimeout(() => ui.toast(t('arrived', { name: L(hub) })), 1100);
      });
    },
    saveMe(me) {
      const first = !store.get('me');
      store.set('me', me);
      player.setLook(me.look);
      live.setMe(me);
      ui.showHud();
      // a new character's natural next step is to meet people
      if (first && !live.want) setTimeout(() => !ui.panel && game.goLive(), 900);
    },
    previewLook: (look) => player.setLook(look),
    addMeUrl() {
      const me = store.get('me');
      const body = `Please add me to Panvel.\n\n\`\`\`json\n${JSON.stringify(me, null, 2)}\n\`\`\`\n\nWhere I'd like to stand: \nA line or two about me: \n\nI confirm this is me and I'm happy to appear in the project.`;
      return `${REPO}/issues/new?title=${encodeURIComponent('Add me to Panvel: ' + (me?.name || ''))}&body=${encodeURIComponent(body)}`;
    },
    redrawBoards,
    cycleTime() {
      const modes = [null, 7.5, 12.5, 17.8, 21];
      const i = modes.findIndex((m) => m === atmo.locked);
      atmo.locked = modes[(i + 1) % modes.length];
      ui.tick();
    },
    toggleRain() {
      atmo.setRain(!atmo.raining);
      ui.tick();
    },
    quality: () => R.tier.name,
    setQuality(k) {
      store.set('quality', k);
      setTimeout(() => location.reload(), 250);
    },
    reset() {
      store.reset();
      location.reload();
    },
    onPanel(name, was) {
      if (name) input.unlock();
      input.enabled = !name || ['profile', 'chai', 'katta', 'chat', 'visitor'].includes(name);
      // a panel that takes over the screen also stops any walking the game was doing for you
      if (name && !input.enabled) {
        player.auto = null;
        follow = null;
      }
      if (was === 'chai' && player.mode === 'sit' && !ui.swapping) player.stand();
      if (was === 'me') {
        const me = store.get('me');
        player.setLook(me ? me.look : player.person.look);
      }
    },
  };
  const ui = createUI(game);
  const games = (game.games = createGames({ scene, world, town, lib, player, live, ui, game, start: HUBS.find((hb) => hb.id === 'talav') || SPAWN }));
  live.on.emote = (p, kind) => p.person && ui.fx(p.rx ?? p.x, p.person.root.position.y + p.person.height + 0.5, p.rz ?? p.z, EMOTE_ICON[kind]);
  // someone at your stall ordered a round: everybody raises a glass
  live.on.chai = (p, name) => {
    ui.toast('☕ ' + t(p ? 'chai_round' : 'chai_round_mine', { name }), 'good');
    sfx.stamp();
    player.person.emote('cheers');
    ui.fx(null, 0, 0, '☕');
    for (const q of live.peers.values()) {
      if (q.person && q.mode === 1 && q.dist < 9) {
        q.person.emote('cheers');
        ui.fx(q.x, q.person.root.position.y + q.person.height + 0.4, q.z, '☕');
      }
    }
  };
  live.on.game = (kind, r) => {
    if (kind === 'race') {
      games.addResult(r.mine ? t('you') : r.name, r.ms, r.mine);
      if (!r.mine) ui.toast('🏁 ' + t('race_other', { name: r.name, time: fmtTime(r.ms) }));
    } else if (kind === 'hunt') {
      games.hunt.done.push(r.mine ? t('you') : r.name);
      if (!r.mine) ui.toast('🥇 ' + t('hunt_other', { name: r.name }));
    }
    if (ui.panelName === 'games') ui.redraw('games');
  };
  live.on.status = (st) => {
    ui.liveChanged();
    // went live while sitting at a stall: the people at the stall join the conversation
    if (st === 'on' && player.mode === 'sit' && ui.panelName === 'chai') {
      live.joinCircle(circleOf(player.seat));
      ui.redraw('chai', player.seat);
    }
    if (st === 'retry' && live.attempt === 3) ui.toast(t('live_down'));
  };
  live.on.peers = (p) => {
    ui.liveChanged();
    if (p && Math.hypot(p.tx - player.pos.x, p.tz - player.pos.z) < 150) {
      ui.toast('🟢 ' + t('joined', { name: p.name }));
      sfx.pop();
    }
  };
  live.on.chat = (channel, msg) => {
    ui.onChat(channel, msg);
    if (!msg.mine) sfx.pop();
  };
  live.on.request = (p) => ui.request(p);
  const names = new Map();
  live.on.link = (id, st) => {
    const p = live.peers.get(id);
    if (p) names.set(id, p.name);
    ui.onLink(id, st, names.get(id) || '…');
  };
  window.addEventListener('pagehide', () => live.stop());
  input.wantLock = () => state === 'play' && rig.fp && !ui.panel;
  const touchDevice = isTouch();

  // ---- what can be used right now -----------------------------------------------------
  let action = null;
  function findAction() {
    const px = player.pos.x, pz = player.pos.z;
    if (player.mode === 'drive') return { text: t('leave_auto'), run: () => player.exit() };
    if (player.mode === 'ride') return { text: t('get_out'), run: () => player.leaveRide() };
    if (player.mode === 'sit') return { text: t('stand_up'), run: () => { player.stand(); if (ui.panelName === 'chai') ui.close(); } };
    const play = games.action();
    if (play) return play;
    let best = null;
    const offer = (d, max, make) => {
      const score = d / max;
      if (score < 1 && (!best || score < best.score)) best = { score, make };
    };
    for (const n of residents.list) if (n.dist < 3.4) offer(n.dist, 3.4, () => ({ text: t('meet', { name: L(n.def.name).toUpperCase() }), id: n.def.id, run: () => ui.open('profile', n) }));
    for (const v of live.peers.values()) {
      if (!v.person) continue;
      // a visitor waiting in a rickshaw is offering a lift
      if (v.mode === 2 && v.v < 2.5 && v.dist < 4.5) offer(v.dist * 0.6, 4.5, () => ({ text: t('hop_in', { name: v.name.toUpperCase() }), id: v.id, run: () => game.hopIn(v) }));
      else if (v.dist < 3.2) offer(v.dist, 3.2, () => ({ text: t('meet_live', { name: v.name.toUpperCase() }), id: v.id, run: () => ui.open('visitor', v) }));
    }
    for (const v of rickshaws.list) if (!v.takenBy) offer(Math.hypot(v.x - px, v.z - pz), 3, () => ({ text: t('drive'), run: () => { player.enter(v); game.mission('auto'); sfx.horn(); } }));
    for (const s of spots.seats) offer(Math.hypot(s.x - px, s.z - pz), 2, () => ({ text: t(s.chai ? 'sit_chai' : 'sit'), run: () => sitDown(s) }));
    for (const b of spots.boards) offer(Math.hypot(b.x - px, b.z - pz), 3.6, () => ({ text: t('read_wall'), run: () => ui.open('wall', b) }));
    for (const hb of spots.hubs) offer(Math.hypot(hb.x - px, hb.z - pz), 4, () => ({ text: t('catch_rick'), run: () => ui.open('travel') }));
    for (const s of strays.list) offer(Math.hypot(s.x - px, s.z - pz), 2.4, () => ({ text: t(s.follow ? 'send_stray' : 'call_stray', { name: L(s.name) }), run: () => { s.follow = !s.follow; sfx.pop(); } }));
    return best ? best.make() : null;
  }

  // Sitting at a stall or on a bench puts you in that spot's circle with whoever else sits there.
  const circleOf = (s) => (s.hub ? 't-' + s.hub : `b${Math.round(s.x / 10)}_${Math.round(s.z / 10)}`);
  function sitDown(s) {
    follow = null;
    player.auto = null;
    player.sit(s);
    if (live.online) live.joinCircle(circleOf(s));
    if (s.chai || live.online) ui.open('chai', s);
  }

  input.onPress = (code) => {
    if (state !== 'play') {
      if (code === 'Enter' || code === 'Space') document.querySelector('.intro .btn')?.click();
      return;
    }
    if (code === 'Escape') return ui.panel ? ui.close() : game.guideTo(null);
    if (code === 'Enter' && live.online) return ui.open('chat');
    if (code === 'KeyE' || code === 'Enter') return action?.run();
    if (code === 'KeyL') return live.state === 'off' ? game.goLive() : ui.open('chat');
    if (/^Digit[1-5]$/.test(code)) return game.emote(EMOTES[+code[5] - 1][0]);
    const map = { KeyF: 'find', KeyT: 'travel', KeyB: 'darshan', KeyC: 'katta', KeyM: 'me', KeyH: 'help', Slash: 'help', KeyN: 'map', Tab: 'map', KeyP: 'games' };
    if (map[code]) ui.toggle(map[code]);
    if (code === 'KeyV') game.toggleView();
    if (code === 'KeyG' && player.mode === 'drive') sfx.horn();
  };

  function enter() {
    state = 'play';
    const at = params.get('at')?.split(',').map(Number);
    player.place(at ? at[0] : SPAWN.x, at ? at[1] : SPAWN.z, SPAWN.face);
    rig.yaw = params.has('yaw') ? parseFloat(params.get('yaw')) : 2.6;
    rig.pitch = params.has('pitch') ? parseFloat(params.get('pitch')) : 0.26;
    if (params.has('dist')) rig.dist = parseFloat(params.get('dist'));
    rig.snap(player);
    ui.setZone(zoneAt(player.pos.x, player.pos.z));
    ui.showHud();
    if (!store.has('seenTips', 'welcome') && !at) ui.note(t('welcome'), 'welcome');
    if ((store.get('live') || params.has('live')) && store.get('liveOk') && store.get('me')) game.goLive();
    if (store.get('hints') && store.get('done').length < 5 && !params.has('play')) setTimeout(() => !ui.panel && ui.open('first'), 1400);
    if (params.has('panel')) setTimeout(() => ui.open(params.get('panel'), params.get('panel') === 'profile' ? residents.list[0] : undefined), 300);
  }
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
      residents.update(dt, { pos: { x: lx, z: lz }, mode: 'walk' }, time, getLang());
    } else {
      const look = input.consumeLook();
      if (player.mode === 'ride') {
        // sit wherever the driver's rickshaw is; the ride ends when they stop driving or leave
        const d = live.peers.get(player.rideId);
        if (!d || d.mode !== 2) {
          player.leaveRide();
          ui.toast(t('ride_over'));
        } else {
          const a = Visitors.autoOf(d);
          const st = Visitors.seat(a.x, a.z, a.h, live.id.charCodeAt(12) % 2 ? 1 : -1);
          player.rideSeat = { x: st.x, z: st.z, h: a.h, v: d.v };
        }
      }
      player.update(dt, input, rig.yaw, traffic);
      if (player.autoEnded) {
        if (player.autoEnded === 'cancel' && follow) {
          follow = null;
          game.guideTo(null);
          ui.toast(t('follow_stopped'));
        } else if (player.autoEnded === 'stuck') {
          // following someone: stop cutting corners and go round by the street
          if (follow) follow.byRoad = true;
          else ui.toast(t('walk_stuck'));
        }
        player.autoEnded = null;
      }
      if (follow) {
        const p = live.peers.get(follow.id);
        const mv = input.move();
        if (Math.hypot(mv.x, mv.y) > 0.05) {
          // taking the controls back ends it, whether or not a route was being walked at that moment
          follow = null;
          player.auto = null;
          player.autoEnded = null;
          game.guideTo(null);
          ui.toast(t('follow_stopped'));
        } else if (!p || player.mode !== 'walk') {
          if (!p) ui.toast(t('follow_lost', { name: follow.name }));
          follow = null;
          player.auto = null;
          game.guideTo(null);
        } else if (performance.now() - follow.at > 1200) {
          // re-plan whenever they have moved on
          follow.at = performance.now();
          const d = Math.hypot(p.x - player.pos.x, p.z - player.pos.z);
          const end = player.auto?.pts[player.auto.pts.length - 1];
          if (d > 4 && (!end || Math.hypot(end[0] - p.x, end[1] - p.z) > 4)) {
            const pts = d < 140 && !follow.byRoad && clearWay(p.x, p.z) ? [[p.x, p.z]] : world.route(player.pos.x, player.pos.z, p.x, p.z);
            if (pts) player.auto = { pts, i: 0, stop: 2.4 };
          }
        }
      }
      rig.update(dt, look, input.turn(), player, world);
      residents.update(dt, player, time, getLang());
      crowd.update(dt, player);
      traffic.update(dt, player);
      strays.update(dt, player);
      walkers.update(dt, player);
      // facing: where you look in first person, where the body points otherwise
      live.update(dt, player.pos.x, player.pos.z, rig.fp && player.mode === 'walk' && !player.auto ? rig.yaw + Math.PI : player.yaw, player.speed, { walk: 0, sit: 1, drive: 2, ride: 3 }[player.mode], player.rideId);
      visitors.update(dt, live, player);
      train?.update(dt, (ev) => {
        // you hear it if you are near the station
        if (Math.hypot(train.path.pts[0][0] - player.pos.x, train.path.pts[0][1] - player.pos.z) < 900 && zoneAt(player.pos.x, player.pos.z).id === 'junction') {
          if (ev === 'arriving') sfx.chime();
          if (ev === 'leaving') sfx.horn();
        }
      });
      focus.set(player.pos.x, 0, player.pos.z);
      games.update(dt, time);

      action = ui.panel && !['profile', 'katta', 'chat'].includes(ui.panelName) ? null : findAction();
      if ((ui.panelName === 'profile' || ui.panelName === 'visitor') && action?.id) action = null;
      ui.setPrompt(action ? action.text : '', () => action?.run());

      // footsteps, in time with the stride
      if (player.mode === 'walk' && player.speed > 0.6) {
        const k = Math.floor(player.person.phase / Math.PI);
        if (k !== lastStep) {
          lastStep = k;
          sfx.step(atmo.rain > 0.5);
        }
      }
      const fpNow = rig.fp && player.mode !== 'drive';
      if (player.mode === 'drive' || player.mode === 'ride') lastStep = -1;
      reticle.hidden = !fpNow || !!ui.panel;
      ui.setLookHint(fpNow && !input.locked && !touchDevice && !ui.panel);
      miniT += dt;
      if (miniT > 0.1) {
        miniT = 0;
        ui.drawMini(player.pos.x, player.pos.z, -rig.yaw, guide);
      }

      step += dt;
      if (step > 0.25) {
        step = 0;
        const px = player.pos.x, pz = player.pos.z;
        ui.setZone(zoneAt(px, pz));
        ui.setStreet(world.streetNameAt(px, pz) || '');
        for (const s of STAMPS) {
          if (Math.hypot(s.x - px, s.z - pz) < s.r && store.add('stamps', s.id)) {
            ui.toast(t('stamp_toast', { name: L(s) }), 'good');
            sfx.stamp();
            game.mission('stamp');
            ui.note(s.icon + ' ' + L(s.fact), 'stamp-' + s.id);
          }
        }
        // the circle you sit in follows you: join on sitting (or on going live while seated), leave on standing
        if (player.mode === 'sit' && live.online && !live.circle && player.seat) live.joinCircle(circleOf(player.seat));
        else if (player.mode !== 'sit' && live.circle) live.leaveCircle();
        // tell the driver who has climbed in
        const now = new Set();
        for (const p of live.peers.values()) {
          if (p.mode !== 3 || p.ref !== live.id) continue;
          now.add(p.id);
          if (!riders.has(p.id)) {
            ui.toast('🛺 ' + t('rider_joined', { name: p.name }), 'good');
            sfx.pop();
          }
        }
        riders = now;
        if (world.atEdge && time - (game.edgeT || -99) > 8) {
          game.edgeT = time;
          ui.toast(t('edge'));
        }
      }
      readT += dt;
      if (readT > 1) {
        readT = 0;
        ui.tick();
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
        if (guide.person) (guide.x = guide.person.x), (guide.z = guide.person.z);
        if (guide.peer) (guide.x = guide.peer.rx ?? guide.peer.x), (guide.z = guide.peer.rz ?? guide.peer.z);
        const dx = guide.x - player.pos.x, dz = guide.z - player.pos.z, d = Math.hypot(dx, dz);
        beacon.position.set(guide.x, 30, guide.z);
        beacon.material.opacity = 0.18 + Math.sin(time * 3) * 0.08;
        const fx = -Math.sin(rig.yaw), fz = -Math.cos(rig.yaw), rx = Math.cos(rig.yaw), rz = -Math.sin(rig.yaw);
        ui.setGuide({ label: guide.label, dist: d, angle: Math.atan2(dx * rx + dz * rz, dx * fx + dz * fz), walk: !guide.keep && !player.auto && player.mode === 'walk' && d > 20 });
        if (d < 5 && !guide.keep) game.guideTo(null);
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
      const high = imagery.enabled && camera.position.y > 70;
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
      window.__marks = marks.map(([n, t], i) => `${n} ${Math.round(t - (i ? marks[i - 1][1] : 0))}`).join(' | ');
      console.info('load: ' + window.__marks);
    }
    if (frames === 3) window.__ready = true;
    requestAnimationFrame(frame);
  }
  mark('entities');
  frame();
  window.__pop = { scene, camera, R, atmo, town, lib, world, imagery, player, rig, residents, game, ui, rickshaws, spots, train, walkers, live, visitors, games };
  void mulberry32;
}

start().catch((e) => {
  console.error(e);
  say('Something went wrong while building Panvel: ' + e.message);
  window.__error = String(e && e.stack ? e.stack : e);
});
