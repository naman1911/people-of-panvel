// The reviewer page: make the reviewer's key once, then write personal invites.
// It runs entirely in the reviewer's browser. The key never leaves it, except
// in the backup file the reviewer chooses to download.

import { newReviewer, reviewerPublic, writeInvite, openInvite, checkPass, checkText, sharedKey, reviewerDhKey, unseal } from './net/invite.js';
import { Mqtt } from './net/mqtt.js';
import { PREFIX, RELAYS } from './net/wire.js';
import { cleanName } from './net/safety.js';
import { h } from './util.js';

// Always read the site settings fresh, so this page knows at once when the reviewer's key has been added.
const { CONFIG } = await import('./config.js?t=' + Date.now());

// On this machine only, a test reviewer and a test relay can be named in the address.
const query = new URLSearchParams(location.search);
const dev = /^(127\.0\.0\.1|localhost)$/.test(location.hostname);
const REVIEWERS = [...CONFIG.invite.reviewers, ...(dev && query.get('reviewer') ? [query.get('reviewer')] : [])];
const relays = dev && /^wss?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(query.get('relay') || '') ? [query.get('relay')] : RELAYS;

const KEY = 'people-of-panvel:reviewer';
const LOGKEY = 'people-of-panvel:reviewer-log';
const SITE = location.origin + location.pathname.replace(/[^/]*$/, '');
const app = document.getElementById('app');

let state = { secret: null, people: [] };
try {
  state = { ...state, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
} catch {
  /* start fresh */
}
const save = () => localStorage.setItem(KEY, JSON.stringify(state));
const copy = async (text, btn) => {
  await navigator.clipboard.writeText(text);
  const was = btn.textContent;
  btn.textContent = 'Copied ✓';
  setTimeout(() => (btn.textContent = was), 1600);
};
const day = (ms) => new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const emailFor = (name, link) => ({
  subject: 'Your invite to People of Panvel',
  body: `Namaskar ${name},

You are invited to People of Panvel: a Panvel you can walk through, where the people are real.

Tap this link to walk in. It works on a phone or a computer:
${link}

This invite is yours alone. It lets one person in at a time, so please do not pass it on.

See you at the talav.`,
});

const box = h('div');
app.append(box);

function draw() {
  box.replaceChildren(state.secret ? keyCard() : setupCard(), ...(state.secret ? [inviteCard(), watchCard(), peopleCard()] : []));
}

/** First visit: make a key, or bring one from a backup file. */
function setupCard() {
  const file = h('input', { type: 'file', accept: '.json,application/json', hidden: true });
  file.onchange = async () => {
    try {
      const data = JSON.parse(await file.files[0].text());
      const secret = data.secret || data;
      reviewerPublic(secret); // throws if it is not a key
      if (!secret.d) throw new Error('no private part');
      state.secret = secret;
      save();
      draw();
    } catch {
      alert('That file is not a reviewer key backup.');
    }
  };
  return h('section',
    h('h2', 'Set up this browser'),
    h('p', 'A reviewer signs each invite with a private key. Make yours now. It stays in this browser.'),
    h('button', { type: 'button', onclick: async () => { state.secret = (await newReviewer()).secret; save(); draw(); } }, 'Make my reviewer key'),
    h('button.quiet', { type: 'button', onclick: () => file.click() }, 'I have a key backup file'),
    file);
}

/** The key: its public half, whether the site knows it, and a backup. */
function keyCard() {
  const pub = reviewerPublic(state.secret);
  const installed = REVIEWERS.includes(pub);
  const copyBtn = h('button.quiet', { type: 'button', onclick: () => copy(pub, copyBtn) }, 'Copy public key');
  const backup = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ kind: 'People of Panvel reviewer key', made: new Date().toISOString(), secret: state.secret }, null, 2)], { type: 'application/json' }));
    const a = h('a', { href: url, download: 'panvel-reviewer-key.json' });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };
  return h('section',
    h('h2', 'Your reviewer key'),
    installed
      ? h('p.ok', '✓ The site knows this key. Invites you make here will work.')
      : h('p.warn', '⚠ The site does not know this key yet. Invites you make will not work until the public key below is added to the site settings. It is not an invite code: do not paste it into the site.'),
    h('label', 'PUBLIC KEY (SAFE TO SHARE)'),
    h('textarea', { rows: 2, readOnly: true }, pub),
    copyBtn,
    h('button.quiet', { type: 'button', onclick: backup }, 'Download key backup'),
    h('p.muted', installed ? 'Keep a backup file somewhere private. Anyone who has it can let people in.' : 'Send the public key to whoever looks after the site. It goes into the reviewers list in js/config.js. Keep the backup file private: anyone who has it can let people in.'));
}

/** Write one person's invite. */
function inviteCard() {
  const name = h('input', { type: 'text', maxLength: 24, placeholder: 'As people will see it, e.g. Asha Patil', autocomplete: 'off' });
  const email = h('input', { type: 'email', placeholder: 'Only used to open your email app. Optional.', autocomplete: 'off' });
  const out = h('div');
  const make = h('button', { type: 'button', onclick: async () => {
    const shown = cleanName(name.value);
    if (name.value.trim().length < 2 || shown === 'Guest') return name.focus();
    make.disabled = true;
    try {
      const inv = await writeInvite(state.secret, shown);
      // read it back the way a visitor's browser will, before anyone is told about it
      await openInvite(inv.code, [reviewerPublic(state.secret)]);
      const link = `${SITE}#invite=${inv.code}`;
      state.people.unshift({ name: shown, email: email.value.trim(), mid: inv.mid, at: Date.now() });
      save();
      const mail = emailFor(shown, link);
      const copyLink = h('button.quiet', { type: 'button', onclick: () => copy(link, copyLink) }, 'Copy link');
      const copyMail = h('button.quiet', { type: 'button', onclick: () => copy(mail.body, copyMail) }, 'Copy the whole email');
      out.replaceChildren(
        h('p.ok', `✓ Invite ready for ${shown}. Member id ${inv.mid}.`),
        h('label', 'THEIR PERSONAL LINK'),
        h('textarea', { rows: 4, readOnly: true }, link),
        h('a.btn.gold', { href: `mailto:${email.value.trim().replace(/[^\w.+@-]/g, '')}?subject=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.body)}` }, 'Open email to send it'),
        copyLink, copyMail,
        h('p.muted', 'The link is shown only now. If it is lost, make a new invite for the same person.'));
      name.value = '';
      email.value = '';
      drawPeople();
    } catch (e) {
      out.replaceChildren(h('p.warn', 'Could not make the invite: ' + e.message));
    }
    make.disabled = false;
  } }, 'Make invite');
  return h('section',
    h('h2', 'Invite someone'),
    h('label', 'NAME'), name,
    h('label', 'THEIR EMAIL'), email,
    make,
    out);
}

/** Who has been invited from this browser. */
let peopleBody = null;
function drawPeople() {
  if (!peopleBody) return;
  peopleBody.replaceChildren(...(state.people.length
    ? state.people.map((p, i) => h('tr',
        h('td', p.name), h('td', p.email || ''), h('td', h('code', p.mid)), h('td', day(p.at)),
        h('td', h('button.quiet', { type: 'button', style: { margin: 0, padding: '3px 9px 2px', fontSize: '12px' }, title: 'Remove from this list. This does not withdraw the invite.', onclick: () => { if (confirm(`Remove ${p.name} from this list? Their invite keeps working.`)) { state.people.splice(i, 1); save(); drawPeople(); } } }, '✕'))))
    : [h('tr', h('td', { colSpan: 5 }, 'Nobody yet.'))]));
}
function peopleCard() {
  peopleBody = h('tbody');
  const card = h('section',
    h('h2', 'People you have invited'),
    h('p.muted', 'This list lives only in this browser. To withdraw an invite, the member id goes into the revoked list in js/config.js.'),
    h('table', h('thead', h('tr', h('th', 'NAME'), h('th', 'EMAIL'), h('th', 'MEMBER ID'), h('th', 'INVITED'), h('th', ''))), peopleBody));
  drawPeople();
  return card;
}

// ---- watching the town -------------------------------------------------------------------
// The reviewer's view of everything said: nearby, to everyone, and privately. Private
// messages are sealed for the reviewers as well as for the person they are sent to.
// Members are told, before they walk in, that messages are not secret and can be checked. Nothing is stored anywhere but in this browser,
// and only while this page is open and watching.

let seen = [];
try {
  seen = JSON.parse(localStorage.getItem(LOGKEY) || '[]');
} catch {
  /* start with an empty record */
}
const watch = { on: false, mq: null, peers: new Map(), waiting: [], timer: 0 };
let feedEl = null, statusEl = null, hereEl = null, watchBtn = null;
const clock = (ms) => new Date(ms).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });
const ICONS = { nearby: '📍', everyone: '🏘', private: '🔒' };
const lineOf = (m) => `[${clock(m.at)}] ${m.scope.toUpperCase()} ${m.from} (${m.mid})${m.to ? ' -> ' + m.to + ' (' + (m.toMid || '?') + ')' : ''}: ${m.text}`;

function rowOf(m) {
  return h('div.msg', h('span.when', clock(m.at)), h('span.tag.' + m.scope, ICONS[m.scope] + ' ' + m.scope), h('b', m.from + (m.to ? ' → ' + m.to : '')), h('span', m.text));
}
function record(m) {
  m.at = Date.now();
  seen.push(m);
  if (seen.length > 3000) seen = seen.slice(-3000);
  try {
    localStorage.setItem(LOGKEY, JSON.stringify(seen));
  } catch {
    /* storage full: keep going in memory */
  }
  if (feedEl) {
    const stick = feedEl.scrollTop + feedEl.clientHeight > feedEl.scrollHeight - 40;
    feedEl.querySelector('.empty')?.remove();
    feedEl.append(rowOf(m));
    if (stick) feedEl.scrollTop = feedEl.scrollHeight;
  }
}
function drawHere() {
  if (!hereEl) return;
  const names = [...watch.peers.values()].map((p) => p.name);
  hereEl.textContent = watch.on ? (names.length ? `In town now (${names.length}): ${names.join(', ')}` : 'Nobody is in town right now.') : '';
}

async function onWire(topic, text, mine) {
  const [, kind, id] = topic.split('/');
  if (kind === 'x') {
    if (watch.peers.delete(id)) drawHere();
    return;
  }
  const cut = text.lastIndexOf('\n');
  if (cut < 0) return;
  const body = text.slice(0, cut), sig = text.slice(cut + 1);
  let d;
  try {
    d = JSON.parse(body);
  } catch {
    return;
  }
  if (!d || typeof d !== 'object') return;
  if (kind === 'b') {
    if (d.i !== id) return;
    const who = await checkPass(d.p, REVIEWERS, CONFIG.invite.revoked);
    if (!who || !id.startsWith(who.mid) || !(await checkText(who.key, body, sig))) return;
    const fresh = !watch.peers.has(id);
    watch.peers.set(id, { ...(watch.peers.get(id) || {}), sid: id, mid: who.mid, name: who.name, key: who.key, dh: who.dh, seen: Date.now() });
    if (fresh) {
      drawHere();
      // anything they said before we knew who they were
      const held = watch.waiting.filter((w) => w.from === id);
      watch.waiting = watch.waiting.filter((w) => w.from !== id);
      for (const w of held) await onWire(w.topic, w.text, mine);
    }
    return;
  }
  const from = watch.peers.get(String(d.i || ''));
  if (!from) {
    watch.waiting.push({ from: String(d.i || ''), topic, text, at: Date.now() });
    watch.waiting = watch.waiting.filter((w) => Date.now() - w.at < 20000).slice(-200);
    return;
  }
  if (!(await checkText(from.key, body, sig))) return; // not really from them
  const said = (v) => String(v ?? '').replace(/\s+/g, ' ').slice(0, 400);
  if (kind === 'c') record({ scope: 'nearby', from: from.name, mid: from.mid, text: said(d.t) });
  else if (kind === 't') record({ scope: 'everyone', from: from.name, mid: from.mid, text: said(d.t) });
  else if (kind === 'd') {
    const to = watch.peers.get(String(d.to || ''));
    let out = null;
    if (mine.index >= 0 && Array.isArray(d.r) && d.r[mine.index]) {
      from.aes ||= await sharedKey(mine.dhKey, from.dh);
      out = await unseal(from.aes, d.r[mine.index]);
    }
    record({ scope: 'private', from: from.name, mid: from.mid, to: to ? to.name : 'someone', toMid: to?.mid, text: out === null ? '(sealed: this reviewer key cannot open it)' : said(out) });
  }
}

async function startWatch(attempt = 0) {
  watch.on = true;
  watchBtn.textContent = 'Stop watching';
  statusEl.textContent = 'Connecting…';
  statusEl.className = 'muted';
  const mine = { index: REVIEWERS.indexOf(reviewerPublic(state.secret)), dhKey: await reviewerDhKey(state.secret) };
  const mq = new Mqtt(relays[attempt % relays.length], { clientId: 'pop-rv' + Math.random().toString(36).slice(2, 12), keepalive: 30 });
  mq.onMessage = (topic, text) => void onWire(topic, text, mine).catch(() => {});
  mq.onClose = () => {
    if (watch.mq !== mq) return;
    watch.mq = null;
    watch.peers.clear();
    drawHere();
    if (watch.on) {
      statusEl.textContent = 'Connection lost. Trying again…';
      setTimeout(() => watch.on && !watch.mq && startWatch(attempt + 1), 3000);
    }
  };
  try {
    await mq.connect();
  } catch {
    if (watch.on) {
      statusEl.textContent = 'Cannot reach the town yet. Trying again…';
      setTimeout(() => watch.on && !watch.mq && startWatch(attempt + 1), 3000);
    }
    return;
  }
  if (!watch.on) return mq.close();
  watch.mq = mq;
  mq.subscribe([`${PREFIX}/b/+`, `${PREFIX}/x/+`, `${PREFIX}/c/+`, `${PREFIX}/t`, `${PREFIX}/d/+`]);
  statusEl.textContent = '● Watching. Messages appear here as they are said.';
  statusEl.className = 'ok';
  drawHere();
  clearInterval(watch.timer);
  // forget people whose announcements have stopped
  watch.timer = setInterval(() => {
    let gone = false;
    for (const [sid, p] of watch.peers) if (Date.now() - p.seen > 20000) (watch.peers.delete(sid), (gone = true));
    if (gone) drawHere();
  }, 5000);
}
function stopWatch() {
  watch.on = false;
  clearInterval(watch.timer);
  watch.mq?.close();
  watch.mq = null;
  watch.peers.clear();
  watchBtn.textContent = 'Start watching';
  statusEl.textContent = 'Not watching.';
  statusEl.className = 'muted';
  drawHere();
}

function watchCard() {
  const canRead = REVIEWERS.includes(reviewerPublic(state.secret));
  statusEl = h('p.muted', 'Not watching.');
  hereEl = h('p.muted');
  feedEl = h('div.feed', ...(seen.length ? seen.map(rowOf) : [h('p.muted.empty', 'Nothing recorded yet.')]));
  watchBtn = h('button', { type: 'button', disabled: !canRead, onclick: () => (watch.on ? stopWatch() : startWatch()) }, 'Start watching');
  const download = () => {
    const url = URL.createObjectURL(new Blob([seen.map(lineOf).join('\n') + '\n'], { type: 'text/plain' }));
    const a = h('a', { href: url, download: `panvel-messages-${new Date().toISOString().slice(0, 10)}.txt` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };
  const card = h('section',
    h('h2', 'Watch the town'),
    h('p', 'Everything members say shows here while you are watching: nearby talk, messages to everyone, and private messages.'),
    h('p.muted', 'Members are told that nothing they write is secret and that messages can be checked for safety. Messages are not kept anywhere on the internet: you see only what is said while this page is open and watching, and the record below lives in this browser. Keep it private.'),
    canRead ? null : h('p.warn', '⚠ The site does not know your key yet, so members are not sealing private messages for you.'),
    watchBtn,
    h('button.quiet', { type: 'button', onclick: download }, 'Download the record'),
    h('button.quiet', { type: 'button', onclick: () => { if (confirm('Delete the whole record from this browser?')) { seen = []; localStorage.removeItem(LOGKEY); feedEl.replaceChildren(h('p.muted.empty', 'Nothing recorded yet.')); } } }, 'Clear'),
    statusEl, hereEl, feedEl);
  setTimeout(() => (feedEl.scrollTop = feedEl.scrollHeight), 0);
  return card;
}

draw();
