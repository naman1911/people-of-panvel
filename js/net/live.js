// The live layer: how visitors see each other and talk.
//
// There is no server behind this site, so browsers meet on a public MQTT relay.
// There are two kinds of visitor:
//
//   Ghosts   listen only. They see members walking around and what members say
//            nearby. They send nothing, so nobody can see them.
//   Members  hold an invite from a reviewer (see invite.js). Others see their
//            name, look and position, and hear what they say within earshot.
//
// What that means, plainly:
//   - a member's name, look, position and messages pass through the relay and
//     can be read by anyone who connects to it, ghosts included;
//   - nothing is stored: when you leave, you are gone, and so is the talk;
//   - a member's pass is signed by a reviewer and everything they announce or
//     say is signed with their own key, so nobody can pose as a member or put
//     words in a member's mouth. Movement between announcements is not signed;
//   - a private message can be read by the two people in it and by the
//     reviewers, and by nobody else. Members are told before they walk in that
//     messages are not secret and can be checked.
//
// Topics (all under PREFIX):
//   b/<sid>         announcement: session, pass, look and rough position, every few seconds, signed
//   m/<cell>/<sid>  movement, a few times a second, only to nearby cells
//   c/<cell>        things said out loud to people nearby, signed
//   t               things said to everyone in town, signed (members only listen here)
//   d/<sid>         a private message for <sid>: sealed for them and for the reviewers, signed
//   x/<sid>         goodbye, or the relay's notice that <sid> dropped off

import { Mqtt } from './mqtt.js';
import { cleanText, soften, cleanName, cleanLook, finite, Bucket } from './safety.js';
import { checkPass, signText, checkText, sharedKey, reviewerDh, seal, unseal } from './invite.js';
import { PREFIX, RELAYS, CELL, HEAR } from './wire.js';
import { store } from '../store.js';
import { params } from '../util.js';

export { HEAR };
const MAX_PEERS = 160;
const SKEW = 10 * 60000; // clocks on two phones may disagree by this much

const rand = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => (b % 36).toString(36)).join('');
const cellOf = (x, z) => Math.floor((x + 3000) / CELL) + '_' + Math.floor((z + 3000) / CELL);
const split = (text) => {
  const cut = text.lastIndexOf('\n');
  return cut < 0 ? null : [text.slice(0, cut), text.slice(cut + 1)];
};

export class Live {
  /** settings: { reviewers: [public keys], revoked: [member ids] } */
  constructor(settings) {
    this.reviewers = settings.reviewers || [];
    this.revoked = settings.revoked || [];
    this.state = 'off'; // off | connecting | on | retry
    this.member = null; // the opened invite, when this visitor is a member
    this.sid = null;
    this.peers = new Map(); // sid -> member we can see
    this.cells = new Set();
    this.log = []; // what has been said: nearby, to the whole town, and privately
    this.on = {}; // callbacks: status, peers, chat, displaced
    this.mq = null;
    this.attempt = 0;
    this.lastSent = '';
    this.lastSay = 0;
    this.bucket = new Bucket(6, 0.5);
    this.passes = new Map(); // pass text -> checked pass (or null), so each is checked once
    this.heard = new Map(); // session id -> time of the newest announcement accepted from it
    this.pos = { x: 0, z: 0 };
    const local = params.get('relay');
    // a test relay can be named in the URL, but only one on this machine
    this.relays = local && /^wss?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/.*)?$/.test(local) ? [local] : RELAYS;
  }

  get online() {
    return this.state === 'on';
  }
  /** True when others can see and hear this visitor. */
  get speaking() {
    return this.online && !!this.member;
  }
  blocked(mid) {
    return store.get('blocked').includes(mid);
  }
  emit(name, ...args) {
    try {
      this.on[name]?.(...args);
    } catch (e) {
      console.error(e);
    }
  }
  _state(s) {
    if (this.state === s) return;
    this.state = s;
    this.emit('status', s);
  }

  // ---- connecting ------------------------------------------------------------------

  /** Connect. With a member (an opened invite) others see you; without one you only watch. */
  start(pos, member, look) {
    if (this.want) this.stop();
    this.pos = { x: pos.x, z: pos.z };
    this.member = member || null;
    this.look = look || null;
    this.sid = member ? member.mid + rand(3) : null;
    this.since = Date.now();
    this.want = true;
    this._connect();
  }

  async _connect() {
    if (!this.want) return;
    this._state('connecting');
    const url = this.relays[this.attempt % this.relays.length];
    const opts = { clientId: 'pop-' + (this.sid || 'g' + rand(12)), keepalive: 30 };
    if (this.sid) opts.will = { topic: `${PREFIX}/x/${this.sid}`, payload: '1' };
    const mq = new Mqtt(url, opts);
    mq.onMessage = (topic, text) => this._receive(topic, text);
    mq.onClose = () => {
      if (this.mq !== mq) return;
      this.mq = null;
      this._drop();
      this._retry();
    };
    try {
      await mq.connect();
    } catch {
      this.attempt++;
      return this._retry();
    }
    if (!this.want) return mq.close();
    this.mq = mq;
    this.attempt = 0;
    mq.subscribe([`${PREFIX}/b/+`, `${PREFIX}/x/+`]);
    // the town-wide room and private messages are for members
    if (this.sid) mq.subscribe([`${PREFIX}/t`, `${PREFIX}/d/${this.sid}`]);
    this.cells.clear();
    this._cells();
    this._state('on');
    this._beacon();
  }

  _retry() {
    if (!this.want) return this._state('off');
    this._state('retry');
    clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => this._connect(), Math.min(15000, 1500 * (1 + this.attempt)));
  }

  _drop() {
    if (this.peers.size) {
      this.peers.clear();
      this.emit('peers');
    }
  }

  stop() {
    this.want = false;
    clearTimeout(this.retryTimer);
    if (this.mq) {
      const mq = this.mq;
      // say goodbye ourselves; the relay's notice only fires on an unclean drop
      if (this.sid) mq.publish(`${PREFIX}/x/${this.sid}`, '1');
      this.mq = null;
      setTimeout(() => mq.close(), 60);
    }
    this._drop();
    this._state('off');
  }

  // ---- sending -----------------------------------------------------------------------

  setLook(look) {
    this.look = look;
    if (this.speaking) this._beacon();
  }

  async _send(topic, body) {
    const mq = this.mq;
    const sig = await signText(this.member.signKey, body);
    if (this.mq === mq && mq) mq.publish(`${PREFIX}/${topic}`, body + '\n' + sig);
  }

  _beacon() {
    if (!this.speaking) return;
    this.beaconAt = Date.now();
    // The session id is inside the signed text, so an announcement cannot be replayed under another session.
    this._send('b/' + this.sid, JSON.stringify({ i: this.sid, p: this.member.pass, l: this.look, x: Math.round(this.pos.x), z: Math.round(this.pos.z), t: this.beaconAt, s: this.since }));
  }

  _cells() {
    const cx = Math.floor((this.pos.x + 3000) / CELL), cz = Math.floor((this.pos.z + 3000) / CELL);
    const want = new Set();
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) want.add(cx + dx + '_' + (cz + dz));
    const add = [...want].filter((c) => !this.cells.has(c)), del = [...this.cells].filter((c) => !want.has(c));
    if (add.length) this.mq.subscribe(add.flatMap((c) => [`${PREFIX}/m/${c}/+`, `${PREFIX}/c/${c}`]));
    if (del.length) this.mq.unsubscribe(del.flatMap((c) => [`${PREFIX}/m/${c}/+`, `${PREFIX}/c/${c}`]));
    this.cells = want;
    this.cell = cx + '_' + cz;
  }

  /** Call every frame with where the visitor is. */
  update(x, z, yaw, speed) {
    this.pos.x = x;
    this.pos.z = z;
    if (!this.online) return;
    // Network timing runs on the wall clock, so a slow frame rate never makes you look offline.
    const now = Date.now();
    if (cellOf(x, z) !== this.cell) this._cells();
    if (this.member) {
      const sinceMove = now - (this.moveAt || 0);
      if (sinceMove >= 200) {
        const msg = `${Math.round(x * 10)},${Math.round(z * 10)},${Math.round(yaw * 100)},${Math.round(speed * 10)}`;
        // moving: five times a second. standing still: a heartbeat every two seconds.
        if (msg !== this.lastSent || sinceMove >= 2000) {
          this.mq.publish(`${PREFIX}/m/${this.cell}/${this.sid}`, msg);
          this.lastSent = msg;
          this.moveAt = now;
        }
      }
      if (now - (this.beaconAt || 0) >= 5000) this._beacon();
    }
    // forget anyone we have not heard from in a while
    if (!this.sweepT || now - this.sweepT > 3000) {
      this.sweepT = now;
      let gone = false;
      for (const [sid, p] of this.peers) {
        if (now - p.seen > 16000) {
          this.peers.delete(sid);
          gone = true;
        }
      }
      if (gone) this.emit('peers');
    }
  }

  /**
   * Say something. scope: 'near' (people within earshot), 'town' (every member in Panvel),
   * or 'dm' (one member, by member id). Returns false if it could not be sent; `sayError`
   * then says why: 'slow' or 'gone'.
   */
  say(text, scope = 'near', toMid) {
    if (!this.speaking) return false;
    const now = Date.now();
    this.sayError = 'slow';
    if (now - this.lastSay < 1200) return false;
    const t = cleanText(text, 200);
    if (!t) return false;
    const mine = { sid: this.sid, mid: this.member.mid, name: this.member.name, text: t, mine: true };
    if (scope === 'dm') {
      const p = [...this.peers.values()].find((q) => q.mid === toMid);
      this.sayError = 'gone';
      if (!p) return false;
      this.lastSay = now;
      this._whisper(p, t, now).catch(() => {});
      this._log({ ...mine, scope: 'dm', with: p.mid, withName: p.name });
      return true;
    }
    this.lastSay = now;
    this._send(scope === 'town' ? 't' : 'c/' + this.cell, JSON.stringify({ i: this.sid, t, ts: now }));
    this._log({ ...mine, scope: scope === 'town' ? 'town' : 'near' });
    return true;
  }

  /** A private message: sealed once for the person, and once for each reviewer. */
  async _whisper(p, text, ts) {
    p.aes ||= await sharedKey(this.member.dhKey, p.dh);
    this.forReviewers ||= Promise.all(this.reviewers.map((pub) => reviewerDh(pub).then((dh) => sharedKey(this.member.dhKey, dh)).catch(() => null)));
    const keys = await this.forReviewers;
    const body = { i: this.sid, to: p.sid, ts, m: await seal(p.aes, text), r: await Promise.all(keys.map((k) => (k ? seal(k, text) : null))) };
    await this._send('d/' + p.sid, JSON.stringify(body));
  }

  _log(msg) {
    msg.at = Date.now();
    this.log.push(msg);
    if (this.log.length > 60) this.log.shift();
    this.emit('chat', msg);
  }

  // ---- receiving ----------------------------------------------------------------------

  _receive(topic, text) {
    const parts = topic.split('/');
    if (parts[0] !== PREFIX) return;
    const kind = parts[1];
    if (kind === 'm') return this._onMove(parts[3], text);
    if (kind === 'b') return void this._onBeacon(parts[2], text).catch(() => {});
    if (kind === 'x') return this._onGone(parts[2]);
    if (kind === 'c') return void this._onSay(text, 'near').catch(() => {});
    if (kind === 't') return void this._onSay(text, 'town').catch(() => {});
    if (kind === 'd') return void this._onWhisper(parts[2], text).catch(() => {});
  }

  async _onBeacon(sid, text) {
    if (sid === this.sid || !/^[a-z0-9]{11}$/.test(sid) || !this.bucket.take('b' + sid)) return;
    const cut = split(text);
    if (!cut) return;
    const [body, sig] = cut;
    let d;
    try {
      d = JSON.parse(body);
    } catch {
      return;
    }
    if (!d || typeof d !== 'object' || d.i !== sid || typeof d.p !== 'string' || d.p.length > 400) return;
    const now = Date.now(), t = finite(d.t, 0, 9e15);
    if (Math.abs(now - t) > SKEW) return;
    if (t <= (this.heard.get(sid) || 0)) return; // old news, or a replay

    // Who is this? Each pass is checked against the reviewers' keys once, then remembered.
    let who = this.passes.get(d.p);
    if (who === undefined) {
      if (this.passes.size > 600) this.passes.clear();
      who = checkPass(d.p, this.reviewers, this.revoked);
      this.passes.set(d.p, who);
    }
    who = await who;
    if (!who || !sid.startsWith(who.mid) || this.blocked(who.mid)) return;
    if (!(await checkText(who.key, body, sig))) return;

    const since = finite(d.s, 0, 9e15);
    // One invite, one person at a time: the session that started last keeps it.
    if (this.member && who.mid === this.member.mid) {
      if (since > this.since || (since === this.since && sid > this.sid)) this.emit('displaced');
      return;
    }
    for (const [other, q] of this.peers) {
      if (q.mid !== who.mid || other === sid) continue;
      if (q.since > since) return;
      this.peers.delete(other);
    }
    if (t <= (this.heard.get(sid) || 0)) return;
    // Remembered even after they leave, so a recording of someone cannot bring them back.
    if (this.heard.size > 2000) this.heard.clear();
    this.heard.set(sid, t);
    let p = this.peers.get(sid);
    const look = cleanLook(d.l), lookKey = JSON.stringify(look);
    const bx = finite(d.x, -3000, 3000), bz = finite(d.z, -3000, 3000);
    const fresh = !p;
    if (fresh) {
      if (this.peers.size >= MAX_PEERS) return;
      p = { sid, mid: who.mid, id: sid, x: bx, z: bz, tx: bx, tz: bz, yaw: 0, tyaw: 0, v: 0, moved: 0, say: null, sayUntil: 0, sayT: 0, lookRev: 0 };
      this.peers.set(sid, p);
    }
    p.key = who.key;
    p.dh = who.dh;
    p.name = cleanName(who.name);
    p.issued = who.issued;
    p.since = since;
    p.seen = now;
    if (lookKey !== p.lookKey) {
      p.look = look;
      p.lookKey = lookKey;
      p.lookRev++;
    }
    // without recent movement news, trust the announcement's rough position
    if (now - p.moved > 6000) {
      p.tx = bx;
      p.tz = bz;
    }
    if (fresh) this.emit('peers', p);
  }

  _onMove(sid, text) {
    const p = this.peers.get(sid);
    if (!p) return;
    const a = text.split(',');
    if (a.length < 4) return;
    p.tx = finite(a[0], -30000, 30000) / 10;
    p.tz = finite(a[1], -30000, 30000) / 10;
    p.tyaw = finite(a[2], -100000, 100000) / 100;
    p.v = finite(a[3], 0, 250) / 10;
    p.seen = p.moved = Date.now();
  }

  _onGone(sid) {
    if (this.peers.delete(sid)) this.emit('peers');
  }

  async _onSay(text, scope) {
    const cut = split(text);
    if (!cut) return;
    const [body, sig] = cut;
    let d;
    try {
      d = JSON.parse(body);
    } catch {
      return;
    }
    if (!d || typeof d !== 'object') return;
    const sid = String(d.i || '');
    if (sid === this.sid) return; // our own words coming back
    const p = this.peers.get(sid);
    if (!p || !this.bucket.take('c' + sid)) return;
    const now = Date.now(), ts = finite(d.ts, 0, 9e15);
    if (Math.abs(now - ts) > SKEW || ts <= p.sayT) return;
    if (scope === 'near' && Math.hypot(p.tx - this.pos.x, p.tz - this.pos.z) > HEAR) return;
    if (!(await checkText(p.key, body, sig))) return;
    if (ts <= p.sayT || this.blocked(p.mid)) return;
    p.sayT = ts;
    const out = soften(d.t, 200);
    if (!out) return;
    if (scope === 'near') {
      p.say = out;
      p.sayUntil = now + 6500;
    }
    this._log({ scope, sid, mid: p.mid, name: p.name, text: out });
  }

  async _onWhisper(toSid, text) {
    if (!this.member || toSid !== this.sid) return;
    const cut = split(text);
    if (!cut) return;
    const [body, sig] = cut;
    let d;
    try {
      d = JSON.parse(body);
    } catch {
      return;
    }
    if (!d || typeof d !== 'object' || d.to !== this.sid || !d.m || typeof d.m.iv !== 'string' || typeof d.m.c !== 'string') return;
    const p = this.peers.get(String(d.i || ''));
    if (!p || this.blocked(p.mid) || !this.bucket.take('d' + p.sid)) return;
    const now = Date.now(), ts = finite(d.ts, 0, 9e15);
    if (Math.abs(now - ts) > SKEW || ts <= (p.dmT || 0)) return;
    if (!(await checkText(p.key, body, sig))) return;
    if (ts <= (p.dmT || 0)) return;
    p.dmT = ts;
    p.aes ||= await sharedKey(this.member.dhKey, p.dh);
    const out = soften(await unseal(p.aes, d.m), 200);
    if (out) this._log({ scope: 'dm', with: p.mid, withName: p.name, sid: p.sid, mid: p.mid, name: p.name, text: out });
  }

  // ---- hiding people ---------------------------------------------------------------------

  block(mid) {
    store.add('blocked', mid);
    for (const [sid, p] of this.peers) if (p.mid === mid) this.peers.delete(sid);
    this.log = this.log.filter((m) => m.mid !== mid && m.with !== mid);
    this.emit('peers');
  }

  /** How many members are within earshot, and how many are in town in all. */
  counts() {
    let near = 0;
    for (const p of this.peers.values()) if (Math.hypot(p.tx - this.pos.x, p.tz - this.pos.z) < HEAR) near++;
    return { near, all: this.peers.size };
  }
}
