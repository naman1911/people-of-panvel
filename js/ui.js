// The interface: title screen, HUD, name plates, panels, toasts.

import * as THREE from 'three';
import { h, fmtClock, isTouch } from './util.js';
import { t, L, getLang, setLang, onLang } from './i18n.js';
import { store } from './store.js';
import { PEOPLE, KATTA_TALK, POSTERS } from './data/people.js';
import { HUBS, FAR_PLACES, STAMPS, ZONES } from './data/places.js';
import { SKIN } from './entities/person.js';
import { sfx } from './sfx.js';

const AV = ['#c2410c', '#0f766e', '#7c3aed', '#be185d', '#1d4ed8', '#b45309', '#15803d', '#9f1239'];
const avatarColor = (id) => AV[[...id].reduce((s, c) => s + c.charCodeAt(0), 0) % AV.length];
const REPO = 'https://github.com/naman1911/people-of-panvel';

export function createUI(game) {
  const root = document.getElementById('ui');
  const platesEl = document.getElementById('plates');
  const ui = { panel: null, panelName: null };
  const touch = isTouch();

  // ---- small builders --------------------------------------------------------
  const langToggle = () =>
    h('div.lang', { role: 'group', 'aria-label': 'Language' },
      ...[['en', 'English'], ['mr', 'मराठी']].map(([k, label]) =>
        h('button' + (getLang() === k ? '.on' : ''), { type: 'button', onclick: () => setLang(k) }, label)));
  const avatar = (def) => h('div.avatar', { style: { background: avatarColor(def.id) } }, L(def.name).trim()[0]);
  const escBtn = () => h('button.esc', { type: 'button', onclick: () => ui.close() }, touch ? '✕' : ['ESC ', '✕']);

  // ---- toasts ----------------------------------------------------------------
  const toasts = h('div.toasts', { 'aria-live': 'polite' });
  root.append(toasts);
  ui.toast = (text, kind) => {
    const el = h('div.toast' + (kind ? '.toast--' + kind : ''), text);
    toasts.append(el);
    while (toasts.children.length > 3) toasts.firstChild.remove();
    setTimeout(() => el.remove(), 4300);
  };

  // ---- title screen -----------------------------------------------------------
  let introEl = null;
  ui.intro = (onEnter) => {
    document.getElementById('boot')?.remove();
    const draw = () => {
      introEl?.remove();
      const hour = game.atmo.hour;
      introEl = h('div.intro',
        h('div.intro-top', h('span.tag', t('open_source')), langToggle()),
        h('div',
          h('div.intro-kicker', 'PEOPLE OF'),
          h('h1', 'PANVEL'),
          h('div.intro-mr', 'पनवेलची माणसं'),
          h('p.intro-line', t('tagline')),
          h('p.intro-sub', t('intro_sub') + ' ' + t('intro_guest')),
          h('div.intro-meta',
            h('span.pill', '🕒 ', t('time_in'), ' ', fmtClock(hour)),
            h('span.pill', game.atmo.raining ? '☔ ' + t('monsoon') : '🌤 ' + t('clear'))),
          h('button.btn', { type: 'button', onclick: () => { sfx.unlock(); sfx.chime(); introEl.remove(); introEl = null; onEnter(); } }, t('enter')),
          h('p.credit', '© OpenStreetMap contributors · ', h('a', { href: REPO, target: '_blank', rel: 'noopener' }, 'GitHub'))));
      root.append(introEl);
    };
    draw();
    ui._redrawIntro = draw;
  };

  // ---- HUD --------------------------------------------------------------------
  const hud = h('div.hud', { hidden: true });
  root.append(hud);
  const board = h('div.board', h('div.board-mr'), h('div.board-en'), h('div.board-area'));
  const center = h('div.hud-center');
  const right = h('div.hud-right');
  const dock = h('div.hud-dock');
  const keys = h('div.hud-keys');
  const promptBtn = h('button.btn.prompt', { type: 'button', hidden: true });
  const guideEl = h('div.pill.guide', { hidden: true });
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const MINI = 168;
  const mini = h('canvas.minimap', { width: MINI * dpr, height: MINI * dpr, title: 'Map', onclick: () => ui.toggle('map') });
  const miniCtx = mini.getContext('2d');
  miniCtx.scale(dpr, dpr);
  const lookHint = h('div.pill.lookhint', { hidden: true });
  hud.append(board, center, right, dock, keys, promptBtn, guideEl, mini, lookHint);
  let street = '';
  ui.setStreet = (name) => {
    if (name === street) return;
    street = name;
    drawArea();
  };
  const drawArea = () => {
    if (!zone) return;
    board.children[2].textContent = street ? '📍 ' + ((getLang() === 'mr' && game.streetMr(street)) || street) : 'PANVEL · ' + L(zone.area);
  };
  ui.drawMini = (px, pz, heading, guide) => game.map.drawMini(miniCtx, MINI, px, pz, heading, guide, game);
  ui.setLookHint = (show) => {
    if (lookHint.hidden === !show) return;
    lookHint.hidden = !show;
    if (show) lookHint.textContent = t('click_look');
  };

  let zone = null, noteEl = null, clockEl = null, wxEl = null, countEl = null;
  const chip = (em, label, key, fn) => h('button.chip', { type: 'button', onclick: fn, title: label }, h('span.em', em), h('span.lbl', label), key && !touch ? h('kbd', key) : null);

  function drawHud() {
    // station board
    if (zone) {
      board.children[0].textContent = zone.mr;
      board.children[1].textContent = zone.en;
      drawArea();
    }
    // centre: guest bar + welcome note
    center.replaceChildren();
    const me = store.get('me');
    if (!me) {
      center.append(h('div.guestbar',
        h('div', h('b', t('guest_title')), h('span', t('guest_sub'))),
        h('button.btn.btn--gold.btn--sm', { type: 'button', onclick: () => ui.open('me') }, t('make_me'), touch ? null : h('kbd', 'M'))));
    }
    if (noteEl) center.append(noteEl);
    // right column
    clockEl = h('button.pill', { type: 'button', onclick: () => game.cycleTime() });
    wxEl = h('button.pill', { type: 'button', onclick: () => game.toggleRain() });
    countEl = h('span.pill');
    right.replaceChildren(
      chip('🔍', t('find'), 'F', () => ui.open('find')),
      chip('🛺', t('travel'), 'T', () => ui.open('travel')),
      h('div', { style: { display: 'flex', gap: '6px' } }, clockEl, wxEl),
      countEl);
    dock.replaceChildren(
      chip('👁', t('view'), 'V', () => game.toggleView()),
      chip('🗺', t('map'), 'N', () => ui.toggle('map')),
      chip('🎫', t('darshan'), 'B', () => ui.open('darshan')),
      chip('🫖', t('katta'), 'C', () => ui.open('katta')),
      chip('🙂', t('me'), 'M', () => ui.open('me')),
      chip('❔', t('help'), 'H', () => ui.open('help')));
    keys.replaceChildren(...[['WASD', 'k_move'], ['SHIFT', 'k_run'], ['🖱', 'k_look'], ['E', 'k_use']].map(([k, s]) => h('span', h('kbd', k), t(s))));
    lookHint.textContent = t('click_look');
    ui.tick();
  }
  ui.showHud = () => {
    hud.hidden = false;
    document.getElementById('boot')?.remove();
    drawHud();
  };
  ui.setZone = (z) => {
    if (z === zone) return;
    zone = z;
    drawHud();
  };
  ui.note = (text, id) => {
    if (!text) {
      noteEl = null;
      drawHud();
      return;
    }
    noteEl = h('div.note', text, h('button.x', { type: 'button', 'aria-label': 'Dismiss', onclick: () => { store.add('seenTips', id); ui.note(null); } }, '✕'));
    drawHud();
    setTimeout(() => { if (noteEl && noteEl.isConnected) ui.note(null); }, 16000);
  };
  /** Refresh the small live readouts. */
  ui.tick = () => {
    if (!clockEl) return;
    const a = game.atmo;
    const night = a.night > 0.5;
    clockEl.textContent = `${night ? '🌙' : '☀️'} ${fmtClock(a.hour)}${a.locked == null ? ' · ' + t('realtime') : ''}`;
    wxEl.textContent = a.raining ? '☔ ' + t('monsoon') : '🌤 ' + t('clear');
    countEl.replaceChildren(h('i.dot'), ' ', t('people_count', { n: PEOPLE.length, m: store.get('met').length }));
  };

  // prompt
  let promptFn = null, promptText = '';
  promptBtn.onclick = () => promptFn?.();
  ui.setPrompt = (text, fn) => {
    promptFn = fn;
    if (text === promptText) return;
    promptText = text;
    promptBtn.hidden = !text;
    if (text) promptBtn.replaceChildren(touch ? null : h('kbd', 'E'), text);
  };

  // guide chip
  ui.setGuide = (g) => {
    guideEl.hidden = !g;
    if (!g) return;
    if (guideEl._label !== g.label) {
      guideEl._label = g.label;
      guideEl.replaceChildren(h('span.arrow', '⬆'), h('span.txt'), h('button.x', { type: 'button', onclick: () => game.guideTo(null) }, '✕'));
    }
    guideEl.children[0].style.transform = `rotate(${g.angle}rad)`;
    guideEl.children[1].textContent = `${g.label} · ${Math.round(g.dist)} m`;
  };

  // ---- name plates ---------------------------------------------------------------
  const plates = new Map();
  const v = new THREE.Vector3();
  function plateFor(key, cls) {
    let p = plates.get(key);
    if (!p) {
      const el = h('div.plate' + (cls || ''), h('div.plate-say'), h('div.plate-status'), h('div.plate-name'), h('div.plate-sub'));
      platesEl.append(el);
      p = { el, name: '', sub: '', status: '', say: '' };
      plates.set(key, p);
    }
    return p;
  }
  function setPlate(p, name, sub, status, say) {
    if (p.name !== name) (p.el.children[2].textContent = p.name = name);
    if (p.sub !== sub) (p.el.children[3].textContent = p.sub = sub);
    if (p.status !== status) {
      p.status = status;
      p.el.children[1].textContent = status;
      p.el.children[1].style.display = status ? '' : 'none';
    }
    if (p.say !== say) {
      p.say = say;
      p.el.children[0].textContent = say || '';
      p.el.classList.toggle('plate--say', !!say);
    }
  }
  function project(p, x, y, z, camera, maxD) {
    v.set(x, y, z);
    const d = v.distanceTo(camera.position);
    v.project(camera);
    if (d > maxD || v.z > 1 || v.z < -1 || Math.abs(v.x) > 1.15 || Math.abs(v.y) > 1.2) {
      p.el.style.display = 'none';
      return;
    }
    p.el.style.display = '';
    p.el.dataset.lod = d < 16 ? 'near' : d < 38 ? 'mid' : 'far';
    p.el.style.transform = `translate(${((v.x + 1) / 2) * innerWidth}px, ${((1 - v.y) / 2) * innerHeight}px) translate(-50%, -100%)`;
  }
  ui.updatePlates = (camera, focusId) => {
    const hide = !!ui.panel && innerWidth < 760;
    platesEl.style.display = hide || hud.hidden ? 'none' : '';
    if (hide || hud.hidden) return;
    for (const n of game.residents.list) {
      const p = plateFor(n.def.id);
      if (!n.person.root.visible) {
        p.el.style.display = 'none';
        continue;
      }
      setPlate(p, L(n.def.name).toUpperCase(), L(n.def.role), L(n.def.status), n.say);
      p.el.classList.toggle('plate--focus', n.def.id === focusId);
      project(p, n.x, n.person.root.position.y + n.person.height * (n.def.mode === 'sit' ? 0.82 : 1) + 0.18, n.z, camera, 75);
    }
    const me = store.get('me');
    const mp = plateFor('@me', '.plate--me');
    if (me && game.player.mode !== 'drive') {
      setPlate(mp, me.name.toUpperCase(), '', me.status || '', null);
      const pl = game.player;
      project(mp, pl.pos.x, pl.y + pl.person.height * (pl.mode === 'sit' ? 0.82 : 1) + 0.2, pl.pos.z, camera, 40);
    } else mp.el.style.display = 'none';
    for (const s of game.strays.list) {
      if (!s.follow) continue;
      const sp = plateFor('@' + s.name.en);
      setPlate(sp, L(s.name).toUpperCase(), '', '', null);
      project(sp, s.x, 0.9, s.z, camera, 30);
    }
  };

  // ---- panels ------------------------------------------------------------------
  ui.close = () => {
    if (!ui.panel) return;
    ui.panel.remove();
    ui.panel = null;
    const was = ui.panelName;
    ui.panelName = null;
    game.onPanel?.(null, was);
  };
  function show(name, side, ...kids) {
    ui.close();
    ui.panel = h('div.panel.panel--' + side.split(' ').join('.panel--'), { role: 'dialog' }, ...kids);
    ui.panelName = name;
    root.append(ui.panel);
    game.onPanel?.(name);
    return ui.panel;
  }
  const head = (tag, title, sub) => [
    h('div.panel-top', tag ? h('span.tag', tag) : h('span'), escBtn()),
    h('h2.panel-title', title),
    sub ? h('p.small', sub) : null,
  ];

  const P = {};

  P.profile = (n) => {
    const d = n.def;
    const first = store.add('met', d.id);
    if (first) {
      ui.toast(t('met_toast', { name: L(d.name) }), 'good');
      game.mission('meet');
    }
    const spoken = h('div');
    const kattaBtn = () => {
      const inK = store.has('katta', d.id);
      return h('button.btn.btn--ghost', { type: 'button', onclick: (e) => { inK ? store.remove('katta', d.id) : store.add('katta', d.id); e.currentTarget.replaceWith(kattaBtn()); } }, inK ? t('in_katta') : t('add_katta'));
    };
    show('profile', 'left',
      h('div.panel-top', h('span.tag', L(d.role)), escBtn()),
      h('div.who', avatar(d), h('h2.panel-title', L(d.name))),
      h('div.status', L(d.status)),
      h('p.quote', L(d.tagline)),
      h('dl.facts',
        h('dt', t('from')), h('dd', L(d.from)),
        h('dt', t('since')), h('dd', L(d.since)),
        h('dt', t('spot')), h('dd', L(d.spot)),
        h('dt', t('speaks')), h('dd', d.speaks)),
      h('p.copy', L(d.story)),
      spoken,
      h('div.row',
        h('button.btn', { type: 'button', onclick: () => { const line = game.say(n); spoken.replaceChildren(h('div.spoken', line)); sfx.hello(); } }, '🙏 ', t('say_namaskar')),
        kattaBtn()),
      h('hr.perf'),
      h('p.small', t('fictional')));
    ui.tick();
  };

  P.map = () => {
    const w = Math.min(720, window.innerWidth - 64);
    const cvs = h('canvas.fullmap', { width: w * dpr, height: 10 });
    const g = cvs.getContext('2d');
    let info = null;
    const draw = () => {
      const hgt = Math.round((game.map.H / game.map.W) * w);
      if (cvs.height !== hgt * dpr) {
        cvs.height = hgt * dpr;
        cvs.style.width = w + 'px';
        cvs.style.height = hgt + 'px';
      }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const pl = game.player;
      info = game.map.drawFull(g, w, pl.pos.x, pl.pos.z, game.heading(), game.guide(), game);
    };
    cvs.onclick = (e) => {
      const r = cvs.getBoundingClientRect();
      const x = (e.clientX - r.left) / info.scale + game.map.x0, z = (e.clientY - r.top) / info.scale + game.map.z0;
      game.guideTo({ x, z, label: t('map_pin') });
      draw();
    };
    show('map', 'center wide', ...head('🗺', t('map_title'), t('map_sub')), cvs,
      h('p.small', '🔴 ', t('map_you'), ' · ⚫ ', t('travel'), ' · ○ ', t('katta_met'), ' · © OpenStreetMap contributors'));
    draw();
    ui._mapTimer = setInterval(() => (ui.panelName === 'map' ? draw() : clearInterval(ui._mapTimer)), 500);
  };

  P.find = () => {
    const list = h('div.list');
    const input = h('input.input', { type: 'search', placeholder: t('find_ph'), autocomplete: 'off' });
    const draw = () => {
      const q = input.value.trim().toLowerCase();
      const rows = game.residents.list
        .filter((n) => {
          if (!q) return true;
          const d = n.def;
          const z = ZONES.find((zz) => zz.id === d.zone);
          return [d.name.en, d.name.mr, d.role.en, d.role.mr, d.tags, d.status.en, z?.en, z?.mr].join(' ').toLowerCase().includes(q);
        })
        .sort((a, b) => a.dist - b.dist);
      list.replaceChildren(...rows.map((n) => {
        const d = n.def, z = ZONES.find((zz) => zz.id === d.zone);
        return h('button.item', { type: 'button', onclick: () => { ui.close(); game.guideTo({ x: n.x, z: n.z, label: L(d.name), person: n }); } },
          avatar(d),
          h('div.item-body', h('b', L(d.name), store.has('met', d.id) ? ' ✓' : ''), h('span', L(d.role) + ' · ' + L(d.status))),
          h('div.item-end', z ? L(z) : '', h('br'), t('away', { d: Math.round(n.dist) })));
      }));
      if (!rows.length) list.append(h('p.small', t('nobody')));
    };
    input.oninput = draw;
    show('find', 'right', ...head(null, t('find'), t('find_sub')), input, list);
    draw();
    if (!touch) input.focus();
  };

  P.travel = () => {
    const here = game.nearestHub();
    show('travel', 'center', ...head('🛺', t('where_to'), t('travel_sub')),
      h('div.list',
        ...HUBS.map((hub) => {
          const isHere = hub.id === here.id && here.dist < 120;
          const got = STAMPS.filter((s) => Math.hypot(s.x - hub.x, s.z - hub.z) < 330);
          const n = got.filter((s) => store.has('stamps', s.id)).length;
          return h('button.item' + (isHere ? '.here' : ''), { type: 'button', disabled: isHere, onclick: () => { ui.close(); game.travelTo(hub); } },
            h('div.big', '🛺'),
            h('div.item-body', h('b', L(hub)), h('span', L(hub.blurb))),
            h('div.item-end', isHere ? t('you_are_here') : t('go'), h('br'), got.length ? `🎫 ${n}/${got.length}` : ''));
        }),
        ...FAR_PLACES.map((f) => h('div.item.soon',
          h('div.big', f.mode === 'train' ? '🚆' : '🚌'),
          h('div.item-body', h('b', L(f)), h('span', L(f.blurb))),
          h('div.item-end', t('coming_soon'))))));
  };

  P.darshan = (selId) => {
    const got = store.get('stamps');
    const factEl = h('div');
    const grid = h('div.stamps');
    const pick = (s) => {
      for (const c of grid.children) c.classList.toggle('sel', c.dataset.id === s.id);
      const has = got.includes(s.id);
      factEl.replaceChildren(h('div.fact',
        h('div.k', { style: { margin: '0 0 4px' } }, has ? t('did_you_know') : t('locked')),
        has ? L(s.fact) : h('span', L(s), ' · ', L(ZONES.find((z) => !z.test && Math.hypot(z.x - s.x, z.z - s.z) < z.r) || ZONES[ZONES.length - 1])),
        h('div.row', h('span'), h('button.btn.btn--sm.btn--ghost', { type: 'button', onclick: () => { ui.close(); game.guideTo({ x: s.x, z: s.z, label: L(s) }); } }, t('show_me'), ' ▸'))));
    };
    for (const s of STAMPS) {
      const has = got.includes(s.id);
      grid.append(h('button.stamp' + (has ? '.got' : ''), { type: 'button', dataset: { id: s.id }, onclick: () => pick(s) }, h('span.ic', s.icon), h('b', L(s)), h('span', has ? '✓' : t('locked'))));
    }
    show('darshan', 'center wide', ...head('🎫', t('darshan_title'), t('darshan_sub')),
      h('div.k', t('stamps_n', { n: got.length, t: STAMPS.length })),
      h('div.progress', h('i', { style: { width: (got.length / STAMPS.length) * 100 + '%' } })),
      grid, factEl);
    const sel = STAMPS.find((s) => s.id === selId);
    if (sel) pick(sel);
  };

  P.katta = () => {
    const row = (id) => {
      const n = game.residents.byId.get(id);
      if (!n) return null;
      return h('button.item', { type: 'button', onclick: () => { ui.close(); game.guideTo({ x: n.x, z: n.z, label: L(n.def.name), person: n }); } },
        avatar(n.def), h('div.item-body', h('b', L(n.def.name)), h('span', L(n.def.status))), h('div.item-end', t('take_me')));
    };
    const fav = store.get('katta'), met = store.get('met').filter((id) => !fav.includes(id));
    show('katta', 'right', ...head('🫖', t('katta_title')),
      !fav.length && !met.length ? h('p.copy', t('katta_empty')) : null,
      fav.length ? [h('div.k', t('katta_fav')), h('div.list', ...fav.map(row))] : null,
      met.length ? [h('div.k', t('katta_met')), h('div.list', ...met.map(row))] : null,
      h('hr.perf'),
      h('div.k', t('stamps_n', { n: store.get('stamps').length, t: STAMPS.length })),
      h('button.btn.btn--ghost.btn--sm', { type: 'button', onclick: () => ui.open('darshan') }, '🎫 ', t('darshan')));
  };

  P.me = () => {
    const cur = store.get('me') || { name: '', status: '', look: { woman: false, garb: 'kurta', top: '#f2efe6', bottom: '#5d6d7e', skin: SKIN[2], hairStyle: 'short', acc: ['bag'] } };
    const look = { ...cur.look };
    const name = h('input.input', { type: 'text', maxLength: 24, placeholder: t('f_name_ph'), value: cur.name });
    const status = h('input.input', { type: 'text', maxLength: 40, placeholder: t('f_status_ph'), value: cur.status || '' });
    const group = (opts, key, render) => {
      const el = h('div.' + (render ? 'swatches' : 'chips'));
      const draw = () => el.replaceChildren(...opts.map(([val, label]) =>
        render
          ? h('button.sw' + (look[key] === val ? '.on' : ''), { type: 'button', style: { background: val }, 'aria-label': val, onclick: () => { look[key] = val; draw(); preview(); } })
          : h('button.opt' + (look[key] === val ? '.on' : ''), { type: 'button', onclick: () => { look[key] = val; if (key === 'garb') look.woman = ['saree', 'salwar'].includes(val) ? true : look.woman; draw(); preview(); } }, label)));
      draw();
      return el;
    };
    const preview = () => game.previewLook(look);
    const GARB = [['shirt', { en: 'Shirt', mr: 'शर्ट' }], ['tee', { en: 'T-shirt', mr: 'टी-शर्ट' }], ['kurta', { en: 'Kurta', mr: 'कुर्ता' }], ['salwar', { en: 'Salwar suit', mr: 'पंजाबी ड्रेस' }], ['saree', { en: 'Saree', mr: 'साडी' }]].map(([k, o]) => [k, L(o)]);
    const HAIRS = [['short', { en: 'Short', mr: 'आखूड' }], ['long', { en: 'Long', mr: 'लांब' }], ['bun', { en: 'Bun', mr: 'अंबाडा' }], ['plait', { en: 'Plait', mr: 'वेणी' }], ['scarf', { en: 'Scarf', mr: 'स्कार्फ' }], ['bald', { en: 'Bald', mr: 'टक्कल' }]].map(([k, o]) => [k, L(o)]);
    const TOPS = ['#f2efe6', '#c2185b', '#00897b', '#f9a825', '#5e35b1', '#e64a19', '#1e88e5', '#2e7d32', '#37474f', '#ff5a3c'].map((c) => [c, c]);
    const save = () => {
      const nm = name.value.trim();
      if (nm.length < 2) {
        name.focus();
        return;
      }
      game.saveMe({ name: nm, status: status.value.trim(), look });
      ui.close();
      ui.toast(t('saved', { name: nm }), 'good');
    };
    show('me', 'right', ...head('🙂', t('me_title'), t('me_sub')),
      h('label.field', h('span', t('f_name')), name),
      h('label.field', h('span', t('f_status')), status),
      h('div.field', h('span', t('f_garb')), group(GARB, 'garb')),
      h('div.field', h('span', t('f_top')), group(TOPS, 'top', true)),
      h('div.field', h('span', t('f_hair')), group(HAIRS, 'hairStyle')),
      h('div.field', h('span', t('f_skin')), group(SKIN.map((c) => [c, c]), 'skin', true)),
      h('div.row', h('button.btn.btn--ghost', { type: 'button', onclick: () => ui.close() }, '✕'), h('button.btn', { type: 'button', onclick: save }, t('save'), ' ▸')),
      store.get('me') ? [h('hr.perf'), h('p.small', t('add_me_sub')), h('a.btn.btn--ghost.btn--sm', { href: game.addMeUrl(), target: '_blank', rel: 'noopener' }, t('add_me'))] : null);
    if (!touch) name.focus();
  };

  P.wall = (boardSpot) => {
    const mine = store.get('posters').filter((p) => p.board === boardSpot.id);
    const fixed = POSTERS.filter((_, i) => (i + boardSpot.id.length) % 2 === 0 || POSTERS.length < 5).slice(0, 5);
    const poster = (p) => h('div.poster', h('b', p.kind + ' ', L(p.title)), h('span', L(p.when)), h('em', '— ' + p.by));
    const title = h('input.input', { type: 'text', maxLength: 40, placeholder: 'Sunday gully cricket' });
    const when = h('input.input', { type: 'text', maxLength: 50, placeholder: 'Sun 7 am · Municipal ground' });
    const kindSel = h('div.chips');
    let kind = '📌';
    const drawKinds = () => kindSel.replaceChildren(...['📌', '🏏', '📚', '🎤', '🥾', '🍲', '🎶', '🧹'].map((k) => h('button.opt' + (k === kind ? '.on' : ''), { type: 'button', onclick: () => { kind = k; drawKinds(); } }, k)));
    drawKinds();
    game.mission('wall');
    show('wall', 'center', ...head('📌', t('wall_title'), t('wall_sub')),
      h('div', ...mine.map(poster), ...fixed.map(poster)),
      h('hr.perf'),
      h('div.k', t('pin')),
      h('div.field', kindSel),
      h('label.field', h('span', t('p_title')), title),
      h('label.field', h('span', t('p_when')), when),
      h('div.row', h('span.small', t('pin_note')),
        h('button.btn', { type: 'button', onclick: () => {
          if (title.value.trim().length < 3) return title.focus();
          const me = store.get('me');
          store.set('posters', [{ id: Date.now(), board: boardSpot.id, kind, title: title.value.trim(), when: when.value.trim(), by: me?.name || 'Guest' }, ...store.get('posters')].slice(0, 20));
          game.redrawBoards();
          ui.toast(t('pinned'), 'good');
          P.wall(boardSpot);
        } }, t('pin'), ' ▸')));
  };

  let chaiTimer = 0;
  P.chai = (seat) => {
    const talk = h('div.talk');
    const lang = getLang();
    const pool = [...KATTA_TALK];
    // residents near this stall join in
    for (const n of game.residents.list) if (Math.hypot(n.x - seat.x, n.z - seat.z) < 22) for (const l of n.def.lines) pool.push({ en: `${n.def.name.en}: “${l.en}”`, mr: `${n.def.name.mr}: “${l.mr}”` });
    const add = () => {
      if (!pool.length) return;
      const line = pool.splice((Math.random() * pool.length) | 0, 1)[0];
      talk.append(h('div.bubble', line[lang] || line.en));
      while (talk.children.length > 6) talk.firstChild.remove();
    };
    add();
    clearInterval(chaiTimer);
    chaiTimer = setInterval(() => (ui.panelName === 'chai' ? add() : clearInterval(chaiTimer)), 3600);
    game.mission('chai');
    show('chai', 'left', ...head('☕', t('chai_title'), t('chai_sub')), talk,
      h('div.row', h('span'), h('button.btn.btn--ghost', { type: 'button', onclick: () => ui.close() }, t('stand_up'))));
  };

  P.first = () => {
    const done = store.get('done');
    const M = [['meet', '🙏'], ['chai', '☕'], ['auto', '🛺'], ['wall', '📌'], ['stamp', '🎫']];
    show('first', 'center', ...head('👋', t('first_title'), t('first_sub')),
      ...M.map(([id, em]) => h('div.mission' + (done.includes(id) ? '.done' : ''),
        h('div', em + ' ', t('m_' + id)),
        done.includes(id) ? h('span.ok', '✓') : h('button.btn.btn--sm', { type: 'button', onclick: () => { ui.close(); game.showMe(id); } }, t('show_me'), ' ▸'))),
      h('div.row',
        h('button.link', { type: 'button', onclick: () => { store.set('hints', false); ui.close(); } }, t('dont_show')),
        h('button.btn.btn--ghost', { type: 'button', onclick: () => ui.close() }, t('look_first'))));
  };

  P.help = () => {
    const q = game.quality();
    show('help', 'center', ...head('❔', t('help_title')),
      h('div.keys',
        ...(touch
          ? [['👆', t('k_move')], ['👉', t('k_look')], ['E', t('k_use')]]
          : [['WASD', t('k_move')], ['SHIFT', t('k_run')], ['🖱 / ← →', t('k_look')], ['V', t('view_help')], ['E', t('k_use')], ['N', t('map')], ['F', t('find')], ['T', t('travel')], ['B', t('darshan')], ['C', t('katta')], ['M', t('me')], ['ESC', t('k_close')]]
        ).flatMap(([k, s]) => [h('kbd', k), h('span', s)])),
      h('div.row', h('button.btn.btn--ghost.btn--sm', { type: 'button', onclick: () => ui.open('first') }, '👋 ', t('first_title'))),
      h('hr.perf'),
      h('div.row', { style: { marginTop: 0 } }, h('span.k', { style: { margin: 0 } }, t('quality')),
        h('div.lang', ...['low', 'medium', 'high'].map((k) => h('button' + (q === k ? '.on' : ''), { type: 'button', onclick: () => game.setQuality(k) }, k.toUpperCase())))),
      h('div.row', h('span.k', { style: { margin: 0 } }, t('sound')),
        h('div.lang', ...[[true, t('on')], [false, t('off')]].map(([val, label]) => h('button' + (store.get('sound') === val ? '.on' : ''), { type: 'button', onclick: () => { store.set('sound', val); P.help(); } }, label)))),
      h('div.row', h('span.k', { style: { margin: 0 } }, 'LANGUAGE · भाषा'), langToggle()),
      h('hr.perf'),
      h('p.small', t('about')),
      h('p.small', '© OpenStreetMap contributors (ODbL) · ', h('a', { href: REPO, target: '_blank', rel: 'noopener' }, 'GitHub')),
      h('div.row', h('span'), h('button.link', { type: 'button', onclick: () => { if (confirm(t('reset') + '?')) game.reset(); } }, t('reset'))));
  };

  ui.open = (name, arg) => {
    sfx.pop();
    P[name](arg);
  };
  ui.toggle = (name, arg) => (ui.panelName === name ? ui.close() : ui.open(name, arg));
  ui.redrawHud = () => !hud.hidden && drawHud();

  // ---- travel overlay --------------------------------------------------------------
  ui.travelFx = (hub, midway) => {
    const el = h('div.travel',
      h('div.travel-k', t('riding')),
      h('div.board', h('div.board-mr', hub.mr), h('div.board-en', hub.en)),
      h('div.travel-road', h('div.travel-auto', '🛺')));
    root.append(el);
    sfx.horn();
    setTimeout(midway, 900);
    setTimeout(() => el.classList.add('out'), 1900);
    setTimeout(() => el.remove(), 2400);
  };

  // ---- touch controls ---------------------------------------------------------------
  if (touch) {
    const joy = h('div.joy', h('i'));
    const act = h('button.touch-btn', { type: 'button' }, 'E');
    const layer = h('div.touch', joy, act);
    root.append(layer);
    game.input.onStick = (ox, oy, dx, dy, on) => {
      joy.classList.toggle('on', on);
      if (!on) return;
      joy.style.left = ox + 'px';
      joy.style.top = oy + 'px';
      joy.firstChild.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    act.onclick = () => promptFn?.();
    ui._touchAct = act;
    const origSet = ui.setPrompt;
    ui.setPrompt = (text, fn) => {
      origSet(text, fn);
      act.classList.toggle('on', !!text && !ui.panel);
    };
  }

  onLang(() => {
    if (introEl) ui._redrawIntro();
    if (!hud.hidden) drawHud();
    promptText = '';
    guideEl._label = null;
    if (ui.panelName && ui.panelName !== 'profile' && ui.panelName !== 'wall' && ui.panelName !== 'chai') P[ui.panelName]();
    else if (ui.panelName) ui.close();
  });

  return ui;
}
