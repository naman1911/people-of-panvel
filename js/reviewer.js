// The reviewer page: make the reviewer's key once, then write personal invites.
// It runs entirely in the reviewer's browser. The key never leaves it, except
// in the backup file the reviewer chooses to download.

import { newReviewer, reviewerPublic, writeInvite, openInvite } from './net/invite.js';
import { cleanName } from './net/safety.js';
import { CONFIG } from './config.js';
import { h } from './util.js';

const KEY = 'people-of-panvel:reviewer';
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
  box.replaceChildren(state.secret ? keyCard() : setupCard(), ...(state.secret ? [inviteCard(), peopleCard()] : []));
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
  const installed = CONFIG.invite.reviewers.includes(pub);
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
      : h('p.warn', '⚠ The site does not know this key yet. Invites you make will not work until the public key below is added to the site.'),
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

draw();
