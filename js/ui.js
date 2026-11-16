// The interface. It is kept small on purpose: where you are, who is around,
// a place to type, and a map. Everything else is the town itself.

import * as THREE from 'three';
import { h, isTouch } from './util.js';
import { t, L, getLang, setLang, onLang } from './i18n.js';
import { store } from './store.js';
import { HUBS } from './data/places.js';
import { SKIN } from './entities/person.js';
import { sfx } from './sfx.js';

const REPO = 'https://github.com/naman1911/people-of-panvel';

export function createUI(game) {
  const root = document.getElementById('ui');
  const platesEl = document.getElementById('plates');
  const ui = { panel: null, panelName: null };
  const touch = isTouch();
  const live = game.live;

  const langToggle = () =>
    h('div.lang', { role: 'group', 'aria-label': 'Language' },
      ...[['en', 'English'], ['mr', 'मराठी']].map(([k, label]) =>
        h('button' + (getLang() === k ? '.on' : ''), { type: 'button', onclick: () => setLang(k) }, label)));
  const choice = (opts, cur, pick) => h('div.lang', ...opts.map(([val, label]) => h('button' + (cur === val ? '.on' : ''), { type: 'button', onclick: () => pick(val) }, label)));
  const escBtn = () => h('button.esc', { type: 'button', 'aria-label': 'Close', onclick: () => ui.close() }, '✕');

  // ---- toasts ----------------------------------------------------------------
  const toasts = h('div.toasts', { 'aria-live': 'polite' });
  root.append(toasts);
  ui.toast = (text, kind) => {
    const el = h('div.toast' + (kind ? '.toast--' + kind : ''), text);
    toasts.append(el);
    while (toasts.children.length > 2) toasts.firstChild.remove();
    setTimeout(() => el.remove(), 4300);
  };

  // ---- title screen -----------------------------------------------------------
  let introEl = null;
  ui.intro = (onEnter) => {
    document.getElementById('boot')?.remove();
    const draw = () => {
      introEl?.remove();
      const m = game.member();
      introEl = h('div.intro',
        h('div.intro-top', h('span'), langToggle()),
        h('div',
          h('div.intro-kicker', 'PEOPLE OF'),
          h('h1', 'PANVEL'),
          h('div.intro-mr', 'पनवेलची माणसं'),
          h('p.intro-line', t('tagline')),
          h('p.intro-sub', m ? t('intro_member', { name: m.name }) : t('intro_ghost')),
          h('button.btn', { type: 'button', onclick: () => { sfx.unlock(); sfx.chime(); introEl.remove(); introEl = null; onEnter(); } }, t('enter'))));
      root.append(introEl);
    };
    draw();
    ui._redrawIntro = draw;
  };

  // ---- HUD --------------------------------------------------------------------
  const hud = h('div.hud', { hidden: true });
  root.append(hud);
  const board = h('div.board', h('div.board-mr'), h('div.board-en'), h('div.board-area'));
  const peopleBtn = h('button.pill.people', { type: 'button', onclick: () => ui.toggle('people') });
  const menuBtn = h('button.pill.menu', { type: 'button', 'aria-label': 'Menu', onclick: () => ui.toggle('menu') }, '☰');
  const top = h('div.hud-top', peopleBtn, menuBtn);
  const promptBtn = h('button.btn.prompt', { type: 'button', hidden: true });
  const guideEl = h('div.pill.guide', { hidden: true });
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const MINI = 168;
  const mini = h('canvas.minimap', { width: MINI * dpr, height: MINI * dpr, title: 'Map', onclick: () => ui.toggle('map') });
  const miniCtx = mini.getContext('2d');
  miniCtx.scale(dpr, dpr);
  const lookHint = h('div.pill.lookhint', { hidden: true });
  // the bottom of the screen: what people nearby are saying, and either a place to type or the ghost's way in
  const sayLog = h('div.saylog', { 'aria-live': 'polite' });
  const sayInput = h('input.input', { type: 'text', maxLength: 200, autocomplete: 'off', enterKeyHint: 'send' });
  const sayForm = h('form.sayform', { hidden: true }, sayInput, h('button.btn', { type: 'submit', 'aria-label': 'Send' }, '➤'));
  const ghostBar = h('div.ghostbar');
  const say = h('div.say', sayLog, sayForm, ghostBar);
  // on a computer, a quiet reminder of the keys
  const keys = h('div.hud-keys');
  hud.append(board, top, promptBtn, guideEl, mini, lookHint, say, keys);

  let zone = null, street = '';
  const drawBoard = () => {
    if (!zone) return;
    board.children[0].textContent = zone.mr;
    board.children[1].textContent = zone.en;
    board.children[2].textContent = street ? '📍 ' + ((getLang() === 'mr' && game.streetMr(street)) || street) : L(zone.area);
  };
  ui.setZone = (z) => {
    if (z === zone) return;
    zone = z;
    drawBoard();
  };
  ui.setStreet = (name) => {
    if (name === street) return;
    street = name;
    drawBoard();
  };
  ui.drawMini = (px, pz, heading, guide) => game.map.drawMini(miniCtx, MINI, px, pz, heading, guide, game);
  ui.setLookHint = (show) => {
    if (lookHint.hidden === !show) return;
    lookHint.hidden = !show;
    if (show) lookHint.textContent = t('click_look');
  };

  /** Who is around, and what this visitor can do about it. Cheap to call often. */
  let lastState = '';
  ui.refresh = () => {
    const c = live.counts();
    const status = game.status(); // ghost | member | waiting | elsewhere
    const key = [status, live.state, c.near, c.all, getLang(), game.firstPerson()].join('|');
    if (key === lastState) return;
    lastState = key;
    // people
    const text = !live.online ? t('looking') : !c.all ? t('people_none') : t(c.all === 1 ? 'people_one' : 'people_n', { n: c.all }) + (c.near ? ' · ' + t('people_near', { n: c.near }) : '');
    peopleBtn.replaceChildren(h('i.dot' + (c.all ? '' : '.off')), text);
    keys.replaceChildren(...[['WASD', 'k_walk'], ['SHIFT', 'k_run'], [game.firstPerson() ? 'MOUSE' : 'DRAG', 'k_look'], ['M', 'k_map'], ['P', 'k_people'], ...(status === 'member' ? [['ENTER', 'k_talk']] : [])].map(([k, label]) => h('span', h('kbd', k), t(label))));
    // typing, or the way in
    const speaking = status === 'member' && live.online;
    sayForm.hidden = !speaking;
    ghostBar.hidden = speaking;
    if (speaking) sayInput.placeholder = c.near ? t(c.near === 1 ? 'say_ph_one' : 'say_ph', { n: c.near }) : t('say_ph_none');
    else if (status === 'member') ghostBar.replaceChildren(h('span', t(live.state === 'retry' ? 'reconnecting' : 'connecting')));
    else if (status === 'waiting') ghostBar.replaceChildren(h('span', t('almost_in')), h('button.btn.btn--gold.btn--sm', { type: 'button', onclick: () => ui.open('rules') }, t('walk_in')));
    else if (status === 'elsewhere') ghostBar.replaceChildren(h('span', t('elsewhere')), h('button.btn.btn--gold.btn--sm', { type: 'button', onclick: () => game.useHere() }, t('use_here')));
    else ghostBar.replaceChildren(h('span', '👻 ', t('ghost_line')), h('button.btn.btn--gold.btn--sm', { type: 'button', onclick: () => ui.open('invite') }, t('come_in')));
  };
  /** Someone walked in or left. */
  ui.peopleChanged = () => {
    ui.refresh();
    if (ui.panelName === 'people') P.people();
  };
  ui.showHud = () => {
    hud.hidden = false;
    document.getElementById('boot')?.remove();
    drawBoard();
    lastState = '';
    ui.refresh();
  };

  // what is being said nearby
  sayForm.onsubmit = (e) => {
    e.preventDefault();
    if (!sayInput.value.trim()) return sayInput.blur();
    if (live.say(sayInput.value)) sayInput.value = '';
    else ui.toast(t('slow_down'));
  };
  sayInput.onfocus = () => say.classList.add('open');
  sayInput.onblur = () => say.classList.remove('open');
  // Focus on the next tick: the Enter that asked for it must not also land in the box and send an empty line.
  ui.focusSay = () => !sayForm.hidden && setTimeout(() => sayInput.focus(), 0);
  ui.blurSay = () => sayInput.blur();
  ui.onChat = (msg) => {
    const line = h('div.sayline' + (msg.mine ? '.mine' : ''), h('b', msg.mine ? t('you') : msg.name), msg.text);
    sayLog.append(line);
    while (sayLog.children.length > 40) sayLog.firstChild.remove();
    sayLog.scrollTop = sayLog.scrollHeight;
    // lines fade from the screen after a while; they come back while you are typing
    setTimeout(() => line.classList.add('old'), 22000);
  };

  // one button for the one thing you can do: greet the person in front of you
  let promptFn = null, promptText = '';
  promptBtn.onclick = () => promptFn?.();
  ui.setPrompt = (text, fn) => {
    promptFn = fn;
    if (text === promptText) return;
    promptText = text;
    promptBtn.hidden = !text;
    if (text) promptBtn.replaceChildren(...(touch ? [text] : [h('kbd', 'E'), text]));
  };

  // where you are being walked to
  ui.setGuide = (g) => {
    guideEl.hidden = !g;
    if (!g) return;
    if (guideEl._label !== g.label) {
      guideEl._label = g.label;
      guideEl.replaceChildren(h('span.arrow', '⬆'), h('span.txt'), h('button.x', { type: 'button', 'aria-label': 'Stop', onclick: () => game.stopWalk() }, '✕'));
    }
    guideEl.children[0].style.transform = `rotate(${g.angle}rad)`;
    guideEl.children[1].textContent = `${g.label} · ${Math.round(g.dist)} m`;
  };

  // ---- name plates: members, and yourself when seen from behind --------------------
  const plates = new Map();
  const v = new THREE.Vector3();
  function plateFor(key, cls) {
    let p = plates.get(key);
    if (!p) {
      const el = h('div.plate' + (cls || ''), h('div.plate-say'), h('div.plate-name'));
      platesEl.append(el);
      p = { el, name: '', say: '' };
      plates.set(key, p);
    }
    return p;
  }
  function setPlate(p, name, sayText) {
    if (p.name !== name) (p.el.children[1].textContent = p.name = name);
    if (p.say !== sayText) {
      p.say = sayText;
      p.el.children[0].textContent = sayText || '';
      p.el.classList.toggle('plate--say', !!sayText);
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
    const hide = (!!ui.panel && innerWidth < 760) || hud.hidden;
    platesEl.style.display = hide ? 'none' : '';
    if (hide) return;
    const seen = new Set();
    for (const q of live.peers.values()) {
      if (!q.person) continue;
      seen.add(q.sid);
      const p = plateFor(q.sid, '.plate--live');
      setPlate(p, q.name.toUpperCase(), q.say);
      p.el.classList.toggle('plate--focus', q.sid === focusId);
      project(p, q.x, q.person.root.position.y + q.person.height + 0.18, q.z, camera, 90);
    }
    for (const [key, pl] of plates) {
      if (key !== '@me' && !seen.has(key)) {
        pl.el.remove();
        plates.delete(key);
      }
    }
    const m = game.member(), mp = plateFor('@me', '.plate--me');
    if (m && !game.firstPerson()) {
      setPlate(mp, m.name.toUpperCase(), null);
      const pl = game.player;
      project(mp, pl.pos.x, pl.y + pl.person.height + 0.2, pl.pos.z, camera, 40);
    } else mp.el.style.display = 'none';
  };

  // ---- panels ------------------------------------------------------------------
  ui.close = () => {
    if (!ui.panel) return;
    ui.panel.remove();
    ui.panel = null;
    hud.classList.remove('has-panel');
    const was = ui.panelName;
    ui.panelName = null;
    game.onPanel(null, was);
  };
  function show(name, side, ...kids) {
    ui.close();
    ui.panel = h('div.panel.panel--' + side.split(' ').join('.panel--'), { role: 'dialog' }, ...kids);
    ui.panelName = name;
    root.append(ui.panel);
    hud.classList.add('has-panel');
    game.onPanel(name);
    return ui.panel;
  }
  const head = (title, sub) => [h('div.panel-top', h('h2.panel-title', title), escBtn()), sub ? h('p.small', sub) : null];
  const away = (d) => (d < 1000 ? t('away', { d: Math.max(1, Math.round(d)) }) : t('away_km', { d: (d / 1000).toFixed(1) }));
  const distTo = (q) => Math.hypot(q.tx - game.player.pos.x, q.tz - game.player.pos.z);

  const P = {};

  /** Everyone who is in town right now. */
  P.people = () => {
    const list = [...live.peers.values()].sort((a, b) => distTo(a) - distTo(b));
    show('people', 'right', ...head(t('people_title'), t('people_sub')),
      list.length
        ? h('div.list', ...list.map((q) => h('button.item', { type: 'button', onclick: () => ui.open('person', q) },
            h('div.avatar', q.name.trim()[0]),
            h('div.item-body', h('b', q.name), h('span', away(distTo(q)))),
            h('div.item-end', '▸'))))
        : h('p.copy', t(live.online ? 'people_empty' : 'looking')));
  };

  /** One member: go to them, or hide them. */
  P.person = (q) => {
    const d = distTo(q);
    const since = new Date(q.issued).toLocaleDateString(getLang() === 'mr' ? 'mr-IN' : 'en-IN', { month: 'long', year: 'numeric' });
    const report = game.reportUrl(q);
    show('person', 'left',
      h('div.panel-top', h('div.who', h('div.avatar', q.name.trim()[0]), h('h2.panel-title', q.name)), escBtn()),
      h('p.small', t('member_since', { when: since }), ' · ', away(d)),
      d > 12 ? h('div.row', h('span'), h('button.btn', { type: 'button', onclick: () => { ui.close(); game.rideTo(q); } }, '🛺 ', t('go_to', { name: q.name }))) : h('p.copy', t('right_here')),
      h('hr.perf'),
      h('div.row', { style: { marginTop: 0 } },
        h('button.link', { type: 'button', onclick: () => { if (confirm(t('hide_sure', { name: q.name }))) { live.block(q.mid); ui.close(); ui.toast(t('hidden')); } } }, t('hide')),
        report ? h('a.link', { href: report }, t('report')) : null));
  };

  /** The whole town. Tap a place to walk there, a rickshaw or a person to ride there. */
  P.map = () => {
    // as large as fits on the screen without scrolling
    const w = Math.round(Math.min(720, window.innerWidth - 40, (window.innerHeight - 200) * (game.map.W / game.map.H)));
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
      const reach = 16 / info.scale; // a finger's width, in metres
      const near = (list, px, pz) => list.reduce((b, q) => { const d = Math.hypot(px(q) - x, pz(q) - z); return d < reach && (!b || d < b.d) ? { q, d } : b; }, null);
      const person = near([...live.peers.values()], (q) => q.tx, (q) => q.tz);
      const hub = near(HUBS, (q) => q.x, (q) => q.z);
      ui.close();
      if (person) game.rideTo(person.q);
      else if (hub) game.travelTo(hub.q);
      else game.walkTo({ x, z, label: t('marker') });
    };
    show('map', 'center wide', ...head(t('map_title'), t('map_sub')), cvs, h('p.small', '© OpenStreetMap contributors'));
    draw();
    const timer = setInterval(() => (ui.panelName === 'map' && cvs.isConnected ? draw() : clearInterval(timer)), 500);
  };

  /** The way in: use an invite code, or ask for one. */
  P.invite = () => {
    const code = h('textarea.input.code', { rows: 3, placeholder: t('code_ph'), autocomplete: 'off', autocapitalize: 'off', spellcheck: false });
    const err = h('p.small.err');
    const go = h('button.btn', { type: 'button', onclick: async () => {
      if (!code.value.trim()) return code.focus();
      // a reviewer's public key is not an invite; say so plainly
      if (/^B[A-Za-z0-9_-]{86}$/.test(code.value.replace(/\s+/g, ''))) return void (err.textContent = t('code_pubkey'));
      go.disabled = true;
      err.textContent = '';
      try {
        await game.enterCode(code.value);
      } catch (e) {
        err.textContent = t('code_' + (['revoked', 'unknown'].includes(e.message) ? e.message : 'shape'));
        go.disabled = false;
      }
    } }, t('come_in'), ' ▸');
    const name = h('input.input', { type: 'text', maxLength: 40, placeholder: t('ask_name_ph'), autocomplete: 'name' });
    const why = h('input.input', { type: 'text', maxLength: 120, placeholder: t('ask_why_ph'), autocomplete: 'off' });
    show('invite', 'center', ...head(t('invite_title'), t('invite_sub')),
      h('div.k', t('have_code')),
      code, err,
      h('div.row', h('span'), go),
      h('hr.perf'),
      h('div.k', t('no_code')),
      h('p.small', t(game.canAsk() ? 'ask_sub' : 'ask_closed')),
      game.canAsk() ? [
        h('label.field', h('span', t('ask_name')), name),
        h('label.field', h('span', t('ask_why')), why),
        h('div.row', h('span.small', t('ask_note')), h('button.btn.btn--ghost', { type: 'button', onclick: () => {
          if (name.value.trim().length < 2) return name.focus();
          window.open(game.askUrl(name.value.trim(), why.value.trim()), '_blank', 'noopener');
        } }, t('ask_send'), ' ▸')),
      ] : null);
  };

  /** Shown once, when an invite is first used on this device. */
  P.rules = () => {
    const m = game.member();
    show('rules', 'center',
      h('h2.panel-title', t('welcome_name', { name: m.name })),
      h('ul.rules', ...['rule_1', 'rule_2', 'rule_3'].map((k) => h('li', t(k)))),
      h('div.row', h('span'), h('button.btn', { type: 'button', onclick: () => { game.acceptRules(); ui.close(); } }, t('walk_in'), ' ▸')));
  };

  /** How your character looks. */
  P.look = () => {
    const look = { ...game.look() };
    const group = (opts, key, swatch) => {
      const el = h('div.' + (swatch ? 'swatches' : 'chips'));
      const draw = () => el.replaceChildren(...opts.map(([val, label]) =>
        swatch
          ? h('button.sw' + (look[key] === val ? '.on' : ''), { type: 'button', style: { background: val }, 'aria-label': val, onclick: () => { look[key] = val; draw(); game.previewLook(look); } })
          : h('button.opt' + (look[key] === val ? '.on' : ''), { type: 'button', onclick: () => { look[key] = val; if (key === 'garb') look.woman = ['saree', 'salwar'].includes(val) ? true : look.woman; draw(); game.previewLook(look); } }, label)));
      draw();
      return el;
    };
    const GARB = [['shirt', { en: 'Shirt', mr: 'शर्ट' }], ['tee', { en: 'T-shirt', mr: 'टी-शर्ट' }], ['kurta', { en: 'Kurta', mr: 'कुर्ता' }], ['salwar', { en: 'Salwar suit', mr: 'पंजाबी ड्रेस' }], ['saree', { en: 'Saree', mr: 'साडी' }]].map(([k, o]) => [k, L(o)]);
    const HAIRS = [['short', { en: 'Short', mr: 'आखूड' }], ['long', { en: 'Long', mr: 'लांब' }], ['bun', { en: 'Bun', mr: 'अंबाडा' }], ['plait', { en: 'Plait', mr: 'वेणी' }], ['scarf', { en: 'Scarf', mr: 'स्कार्फ' }], ['bald', { en: 'Bald', mr: 'टक्कल' }]].map(([k, o]) => [k, L(o)]);
    const TOPS = ['#f2efe6', '#c2185b', '#00897b', '#f9a825', '#5e35b1', '#e64a19', '#1e88e5', '#2e7d32', '#37474f', '#ff5a3c'].map((c) => [c, c]);
    show('look', 'right', ...head(t('look_title')),
      h('div.field', h('span', t('f_garb')), group(GARB, 'garb')),
      h('div.field', h('span', t('f_top')), group(TOPS, 'top', true)),
      h('div.field', h('span', t('f_hair')), group(HAIRS, 'hairStyle')),
      h('div.field', h('span', t('f_skin')), group(SKIN.map((c) => [c, c]), 'skin', true)),
      h('div.row', h('span'), h('button.btn', { type: 'button', onclick: () => { game.setLook(look); ui.close(); } }, t('save'), ' ▸')));
  };

  /** Settings, and what this place is. */
  P.menu = () => {
    const m = game.member();
    const row = (label, control) => h('div.row', h('span.k', { style: { margin: 0 } }, label), control);
    show('menu', 'right', ...head(m ? m.name : t('ghost_name')),
      m
        ? h('div.row', { style: { marginTop: 0 } },
            h('button.btn.btn--ghost.btn--sm', { type: 'button', onclick: () => ui.open('look') }, t('look_title')),
            h('button.link', { type: 'button', onclick: () => { if (confirm(t('leave_sure'))) { ui.close(); game.leave(); } } }, t('leave')))
        : h('div.row', { style: { marginTop: 0 } }, h('span.small', t('ghost_line')), h('button.btn.btn--gold.btn--sm', { type: 'button', onclick: () => ui.open('invite') }, t('come_in'))),
      h('hr.perf'),
      row('LANGUAGE · भाषा', langToggle()),
      row(t('view'), choice([['fp', t('view_fp')], ['tp', t('view_tp')]], game.firstPerson() ? 'fp' : 'tp', (val) => { if ((val === 'fp') !== game.firstPerson()) game.toggleView(); P.menu(); })),
      row(t('sound'), choice([[true, t('on')], [false, t('off')]], store.get('sound'), (val) => { store.set('sound', val); P.menu(); })),
      row(t('quality'), choice(['low', 'medium', 'high'].map((k) => [k, k.toUpperCase()]), game.quality(), (k) => game.setQuality(k))),
      h('hr.perf'),
      h('p.small', t('about')),
      h('p.small', touch ? t('how_touch') : t('how_keys')),
      h('p.small', '© OpenStreetMap contributors · ', h('a', { href: REPO, target: '_blank', rel: 'noopener' }, 'GitHub')));
  };

  ui.open = (name, arg) => {
    sfx.pop();
    P[name](arg);
  };
  ui.toggle = (name, arg) => (ui.panelName === name ? ui.close() : ui.open(name, arg));

  // ---- the rickshaw ride between places ---------------------------------------------
  ui.travelFx = (mr, en, midway) => {
    const el = h('div.travel',
      h('div.travel-k', t('riding')),
      h('div.board', h('div.board-mr', mr), h('div.board-en', en)),
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
    const act = h('button.touch-btn', { type: 'button' }, '👋');
    root.append(h('div.touch', joy, act));
    game.input.onStick = (ox, oy, dx, dy, on) => {
      joy.classList.toggle('on', on);
      if (!on) return;
      joy.style.left = ox + 'px';
      joy.style.top = oy + 'px';
      joy.firstChild.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    act.onclick = () => promptFn?.();
    const base = ui.setPrompt;
    ui.setPrompt = (text, fn) => {
      base(text, fn);
      act.classList.toggle('on', !!text && !ui.panel);
    };
  }

  onLang(() => {
    if (introEl) ui._redrawIntro();
    if (hud.hidden) return;
    drawBoard();
    lastState = '';
    ui.refresh();
    promptText = '';
    guideEl._label = null;
    if (ui.panelName === 'person' || ui.panelName === 'rules') ui.close();
    else if (ui.panelName) P[ui.panelName]();
  });

  return ui;
}
