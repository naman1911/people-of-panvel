// The live layer: lets visitors see each other walking around and talk.
//
// There is no server behind this site, so browsers meet on a public MQTT
// relay. What that means, plainly:
//   - your name, look, position and public messages pass through that relay
//     and can be read by anyone who connects to it;
//   - nothing is stored: when you leave, you are gone, and so is the chat;
//   - private chats are encrypted end to end (ECDH P-256 + AES-GCM), so the
//     relay only carries ciphertext;
//   - identities are not verified. Names can be imitated. Block freely.
//
// Topics (all under PREFIX):
//   b/<id>          beacon: who I am and roughly where, every few seconds
//   m/<cell>/<id>   movement, a few times a second, only to nearby cells
//   c/<cell>        things said out loud to people nearby
//   c/town          the town-wide room
//   d/<id>          private requests and encrypted private messages for <id>
//   k/<group>       a katta circle: people sitting together at one stall or bench
//   g/<game>        game results: race times, treasure hunt finishes
//   x/<id>          last-will: published by the relay when <id> drops off

import { Mqtt } from './mqtt.js';
import { cleanText, soften, cleanName, cleanLook, finite, Bucket } from './safety.js';
import { store } from '../store.js';
import { params } from '../util.js';

const PREFIX = 'pop1';
const RELAYS = ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt'];
const CELL = 300; // metres; you hear movement and speech from your cell and its neighbours
const HEAR = 60; // metres: how far a spoken message carries
const MAX_PEERS = 160;
const GESTURES = new Set(['wave', 'namaskar', 'clap', 'dance', 'laugh', 'cheers']);

const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const rand = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => (b % 36).toString(36)).join('');
const cellOf = (x, z) => Math.floor((x + 3000) / CELL) + '_' + Math.floor((z + 3000) / CELL);
/** People are remembered (for blocking) by the stable part of their id. */
export const baseId = (id) => String(id).slice(0, 10);

export class Live {
  constructor() {
    let base = store.get('netId');
    if (!base || !/^[a-z0-9]{10}$/.test(base)) {
      base = rand(10);
      store.set('netId', base);
    }
    this.id = base + rand(3); // unique per tab, so two tabs do not knock each other off
    this.state = 'off'; // off | connecting | on | retry
    this.peers = new Map();
    this.cells = new Set();
    this.links = new Map(); // peer id -> 'asking' | 'asked' | 'open'
    this.logs = { near: [], town: [] }; // plus dm:<id>
    this.on = {}; // callbacks: status, peers, chat, request, link
    this.me = null;
    this.mq = null;
    this.attempt = 0;
    this.lastSent = '';
    this.lastSay = 0;
    this.bucket = new Bucket(6, 0.5);
    this.keys = null;
    this.pub = '';
    this.pos = { x: 0, z: 0 };
    const local = params.get('relay');
    // a test relay can be named in the URL, but only one on this machine
    this.relays = local && /^wss?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/.*)?$/.test(local) ? [local] : RELAYS;
  }

  get online() {
    return this.state === 'on';
  }
  blocked(id) {
    return store.get('blocked').includes(baseId(id));
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

  async start(me, pos) {
    this.me = me;
    this.pos = pos;
    this.want = true;
    if (this.state !== 'off' && this.state !== 'retry') return;
    if (!this.keys) {
      this.keys = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveKey']);
      this.pub = b64(await crypto.subtle.exportKey('raw', this.keys.publicKey));
    }
    this._connect();
  }

  async _connect() {
    if (!this.want) return;
    this._state('connecting');
    const url = this.relays[this.attempt % this.relays.length];
    const mq = new Mqtt(url, { clientId: 'pop-' + this.id, keepalive: 30, will: { topic: `${PREFIX}/x/${this.id}`, payload: '1' } });
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
    this.relay = url;
    mq.subscribe([`${PREFIX}/b/+`, `${PREFIX}/x/+`, `${PREFIX}/c/town`, `${PREFIX}/d/${this.id}`, `${PREFIX}/g/+`]);
    if (this.circle) mq.subscribe(`${PREFIX}/k/${this.circle}`);
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
      // say goodbye ourselves; the last-will only fires on an unclean drop
      this.mq.publish(`${PREFIX}/x/${this.id}`, '1');
      const mq = this.mq;
      this.mq = null;
      setTimeout(() => mq.close(), 60);
    }
    this._drop();
    this.links.clear();
    this.circle = null;
    this._state('off');
  }

  // ---- sending -----------------------------------------------------------------------

  setMe(me) {
    this.me = me;
    if (this.online) this._beacon();
  }

  _beacon() {
    if (!this.mq) return;
    this.beaconAt = Date.now();
    const m = this.me;
    this.mq.publish(`${PREFIX}/b/${this.id}`, JSON.stringify({ n: m.name, s: m.status || '', l: m.look, x: Math.round(this.pos.x), z: Math.round(this.pos.z), k: this.pub }));
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

  /** Call every frame with where the player is and how they stand. */
  update(dt, x, z, yaw, speed, mode, ref) {
    this.pos.x = x;
    this.pos.z = z;
    if (!this.online) return;
    // Network timing runs on the wall clock, so a slow frame rate never makes you look offline.
    const now = Date.now();
    const sinceMove = now - (this.moveAt || 0);
    if (sinceMove >= 200) {
      const msg = `${Math.round(x * 10)},${Math.round(z * 10)},${Math.round(yaw * 100)},${Math.round(speed * 10)},${mode}${mode === 3 && ref ? ',' + ref : ''}`;
      // moving: five times a second. standing still: a heartbeat every two seconds.
      if (msg !== this.lastSent || sinceMove >= 2000) {
        if (cellOf(x, z) !== this.cell) this._cells();
        this.mq.publish(`${PREFIX}/m/${this.cell}/${this.id}`, msg);
        this.lastSent = msg;
        this.moveAt = now;
      }
    }
    if (now - (this.beaconAt || 0) >= 5000) this._beacon();
    // forget anyone we have not heard from in a while
    if (!this.sweepT || now - this.sweepT > 3000) {
      this.sweepT = now;
      let gone = false;
      for (const [id, p] of this.peers) {
        if (now - p.seen > 16000) {
          this.peers.delete(id);
          gone = true;
        }
      }
      if (gone) this.emit('peers');
    }
  }

  /** Say something. scope: 'near' (people around you) or 'town' (everyone online). */
  say(text, scope = 'near', pin) {
    if (!this.online) return false;
    const now = Date.now();
    if (now - this.lastSay < 1200) return false;
    const t = cleanText(text, 200);
    if (!t) return false;
    this.lastSay = now;
    const topic = scope === 'town' ? 'c/town' : 'c/' + this.cell;
    const body = { i: this.id, n: this.me.name, t, x: Math.round(this.pos.x), z: Math.round(this.pos.z) };
    if (pin) body.p = [Math.round(pin[0]), Math.round(pin[1])];
    this.mq.publish(`${PREFIX}/${topic}`, JSON.stringify(body));
    return true;
  }

  // ---- katta circles: people sitting together ----------------------------------------

  joinCircle(group) {
    if (!/^[a-z0-9_-]{1,24}$/.test(group)) return;
    this.leaveCircle();
    this.circle = group;
    this.logs.katta = [];
    if (this.online) this.mq.subscribe(`${PREFIX}/k/${group}`);
  }

  leaveCircle() {
    if (!this.circle) return;
    if (this.online) this.mq.unsubscribe(`${PREFIX}/k/${this.circle}`);
    this.circle = null;
  }

  /** Say something to the people sitting with you. `gift` offers everyone a cutting chai. */
  circleSay(text, gift) {
    if (!this.online || !this.circle) return false;
    const now = Date.now();
    if (now - this.lastSay < 1000) return false;
    const t = gift ? '' : cleanText(text, 200);
    if (!gift && !t) return false;
    this.lastSay = now;
    this.mq.publish(`${PREFIX}/k/${this.circle}`, JSON.stringify(gift ? { i: this.id, n: this.me.name, e: 'chai' } : { i: this.id, n: this.me.name, t }));
    return true;
  }

  // ---- games ----------------------------------------------------------------------------

  /** Tell the town about a result: a race time (ms) or a finished treasure hunt. */
  announce(game, data = {}) {
    if (!this.online || !/^[a-z]{1,12}$/.test(game)) return;
    this.mq.publish(`${PREFIX}/g/${game}`, JSON.stringify({ i: this.id, n: this.me.name, ...data }));
  }

  /** Show a gesture to people nearby. */
  emote(kind) {
    if (!this.online || !GESTURES.has(kind)) return;
    const now = Date.now();
    if (now - (this.lastEmote || 0) < 700) return;
    this.lastEmote = now;
    this.mq.publish(`${PREFIX}/c/${this.cell}`, JSON.stringify({ i: this.id, e: kind }));
  }
  wave() {
    this.emote('wave');
  }

  // ---- private chats ---------------------------------------------------------------------

  _direct(to, body) {
    this.mq?.publish(`${PREFIX}/d/${to}`, JSON.stringify({ f: this.id, n: this.me.name, ...body }));
  }

  /** Ask someone for a private chat. It opens only if they agree. */
  ask(id) {
    if (!this.online || !this.peers.has(id)) return;
    const st = this.links.get(id);
    if (st === 'open' || st === 'asking') return;
    if (st === 'asked') return this.answer(id, true);
    this.links.set(id, 'asking');
    this._direct(id, { r: 'ask' });
    this.emit('link', id, 'asking');
  }

  answer(id, yes) {
    if (this.links.get(id) !== 'asked') return;
    if (yes) {
      this.links.set(id, 'open');
      this._direct(id, { r: 'yes' });
      this.emit('link', id, 'open');
    } else {
      this.links.delete(id);
      this._direct(id, { r: 'no' });
      this.emit('link', id, 'closed');
    }
  }

  close(id) {
    if (!this.links.has(id)) return;
    this.links.delete(id);
    this._direct(id, { r: 'bye' });
    this.emit('link', id, 'closed');
  }

  async _aes(peer) {
    if (!peer.k) throw new Error('no key');
    if (!peer.aes) {
      const pub = await crypto.subtle.importKey('raw', unb64(peer.k), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
      peer.aes = await crypto.subtle.deriveKey({ name: 'ECDH', public: pub }, this.keys.privateKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    }
    return peer.aes;
  }

  async whisper(id, text) {
    const peer = this.peers.get(id);
    if (!this.online || !peer || this.links.get(id) !== 'open') return false;
    const now = Date.now();
    if (now - this.lastSay < 700) return false;
    const t = cleanText(text, 300);
    if (!t) return false;
    this.lastSay = now;
    const iv = crypto.getRandomValues(new Uint8Array(12));
    let c;
    try {
      c = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await this._aes(peer), new TextEncoder().encode(t));
    } catch {
      return false; // their key is missing or unusable
    }
    this._direct(id, { r: 'msg', iv: b64(iv), c: b64(c) });
    this._log('dm:' + id, { id: this.id, name: this.me.name, text: t, mine: true });
    return true;
  }

  // ---- receiving ---------------------------------------------------------------------------

  _log(channel, msg) {
    const list = (this.logs[channel] ||= []);
    msg.at = Date.now();
    list.push(msg);
    if (list.length > 80) list.shift();
    this.emit('chat', channel, msg);
  }

  _receive(topic, text) {
    const parts = topic.split('/');
    if (parts[0] !== PREFIX) return;
    const kind = parts[1];
    try {
      if (kind === 'm') return this._onMove(parts[3], text);
      if (kind === 'b') return this._onBeacon(parts[2], JSON.parse(text));
      if (kind === 'x') return this._onGone(parts[2]);
      if (kind === 'c') return this._onSay(parts[2], JSON.parse(text));
      if (kind === 'd') return this._onDirect(JSON.parse(text));
      if (kind === 'k') return this._onCircle(parts[2], JSON.parse(text));
      if (kind === 'g') return this._onGame(parts[2], JSON.parse(text));
    } catch {
      /* malformed: ignore */
    }
  }

  _onBeacon(id, d) {
    if (id === this.id || !/^[a-z0-9]{13}$/.test(id) || this.blocked(id) || !d || typeof d !== 'object') return;
    // Clean everything first, so a malformed beacon can never leave a half-made visitor behind.
    const name = cleanName(d.n), status = soften(d.s, 40), look = cleanLook(d.l), lookKey = JSON.stringify(look);
    const bx = finite(d.x, -3000, 3000), bz = finite(d.z, -3000, 3000);
    const key = typeof d.k === 'string' && d.k.length < 140 ? d.k : null;
    let p = this.peers.get(id);
    const fresh = !p;
    if (fresh) {
      if (this.peers.size >= MAX_PEERS) return;
      p = { id, x: bx, z: bz, tx: bx, tz: bz, yaw: 0, tyaw: 0, v: 0, mode: 0, moved: 0, say: null, sayUntil: 0, gesture: null, gestureAt: 0, ref: null, lookRev: 0 };
      this.peers.set(id, p);
    }
    p.seen = Date.now();
    p.name = name;
    p.status = status;
    if (lookKey !== p.lookKey) {
      p.look = look;
      p.lookKey = lookKey;
      p.lookRev++;
    }
    if (key && key !== p.k) {
      p.k = key;
      p.aes = null;
    }
    // without recent movement news, trust the beacon's rough position
    if (Date.now() - p.moved > 6000) {
      p.tx = bx;
      p.tz = bz;
    }
    if (fresh) this.emit('peers', p);
  }

  _onMove(id, text) {
    const p = this.peers.get(id);
    if (!p) return;
    const a = text.split(',');
    if (a.length < 5) return;
    p.tx = finite(a[0], -30000, 30000) / 10;
    p.tz = finite(a[1], -30000, 30000) / 10;
    p.tyaw = finite(a[2], -100000, 100000) / 100;
    p.v = finite(a[3], 0, 250) / 10;
    p.mode = finite(a[4], 0, 3) | 0;
    // passengers name the driver they are riding with
    p.ref = p.mode === 3 && /^[a-z0-9]{13}$/.test(a[5] || '') ? a[5] : null;
    p.seen = p.moved = Date.now();
  }

  _onGone(id) {
    if (this.peers.delete(id)) {
      this.links.delete(id);
      this.emit('peers');
      this.emit('link', id, 'gone');
    }
  }

  _onSay(room, d) {
    if (!d || typeof d !== 'object') return;
    const id = String(d.i || '');
    if (id === this.id) {
      // our own words, echoed back by the relay: now we know they were sent
      if (d.t) this._log(room === 'town' ? 'town' : 'near', { id, name: this.me.name, text: cleanText(d.t, 200), mine: true, pin: Array.isArray(d.p) ? d.p : undefined });
      return;
    }
    const p = this.peers.get(id);
    if (!p || this.blocked(id) || !this.bucket.take(id)) return;
    if (room !== 'town') {
      const dist = Math.hypot(p.tx - this.pos.x, p.tz - this.pos.z);
      if (dist > HEAR) return;
      if (d.e) {
        if (GESTURES.has(d.e)) {
          p.gesture = d.e;
          p.gestureAt = Date.now();
          this.emit('emote', p, d.e);
        }
        return;
      }
    }
    const textOut = soften(d.t, 200);
    if (!textOut) return;
    if (room !== 'town') {
      p.say = textOut;
      p.sayUntil = Date.now() + 6500;
    }
    const msg = { id, name: p.name, text: textOut };
    if (Array.isArray(d.p) && d.p.length === 2) msg.pin = [finite(d.p[0], -3000, 3000), finite(d.p[1], -3000, 3000)];
    this._log(room === 'town' ? 'town' : 'near', msg);
  }

  _onCircle(group, d) {
    if (group !== this.circle || !d || typeof d !== 'object') return;
    const id = String(d.i || '');
    const mine = id === this.id;
    const p = mine ? null : this.peers.get(id);
    if (!mine && (!p || this.blocked(id) || !this.bucket.take('k' + id))) return;
    const name = mine ? this.me.name : p.name;
    if (d.e === 'chai') return this.emit('chai', mine ? null : p, name);
    const textOut = mine ? cleanText(d.t, 200) : soften(d.t, 200);
    if (!textOut) return;
    if (p) {
      p.say = textOut;
      p.sayUntil = Date.now() + 6500;
    }
    this._log('katta', { id, name, text: textOut, mine });
  }

  _onGame(game, d) {
    if (!d || typeof d !== 'object') return;
    const id = String(d.i || '');
    const mine = id === this.id;
    const p = mine ? null : this.peers.get(id);
    if (!mine && (!p || this.blocked(id) || !this.bucket.take('g' + id))) return;
    const name = mine ? this.me.name : p.name;
    if (game === 'race') {
      const ms = finite(d.t, 0, 3600000);
      // nobody laps the lake in under 40 seconds on foot
      if (ms < 40000) return;
      this.emit('game', 'race', { id, name, ms, mine });
    } else if (game === 'hunt') this.emit('game', 'hunt', { id, name, mine });
  }

  async _onDirect(d) {
    if (!d || typeof d !== 'object') return;
    const id = String(d.f || '');
    const p = this.peers.get(id);
    if (!p || this.blocked(id) || !this.bucket.take('d' + id)) return;
    const st = this.links.get(id);
    if (d.r === 'ask') {
      if (st === 'open') return;
      if (st === 'asking') {
        // we both asked: that is a yes
        this.links.set(id, 'open');
        this._direct(id, { r: 'yes' });
        return this.emit('link', id, 'open');
      }
      this.links.set(id, 'asked');
      this.emit('request', p);
    } else if (d.r === 'yes') {
      if (st !== 'asking') return;
      this.links.set(id, 'open');
      this.emit('link', id, 'open');
    } else if (d.r === 'no' || d.r === 'bye') {
      if (!st) return;
      this.links.delete(id);
      this.emit('link', id, d.r === 'no' ? 'declined' : 'closed');
    } else if (d.r === 'msg') {
      if (st !== 'open' || typeof d.iv !== 'string' || typeof d.c !== 'string' || d.c.length > 1000) return;
      try {
        const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(d.iv) }, await this._aes(p), unb64(d.c));
        const textOut = soften(new TextDecoder().decode(plain), 300);
        if (textOut) this._log('dm:' + id, { id, name: p.name, text: textOut });
      } catch {
        /* not for us, or tampered with */
      }
    }
  }

  // ---- blocking ------------------------------------------------------------------------------

  block(id) {
    store.add('blocked', baseId(id));
    for (const pid of [...this.peers.keys()]) {
      if (baseId(pid) === baseId(id)) {
        this.close(pid);
        this.peers.delete(pid);
      }
    }
    for (const k of Object.keys(this.logs)) this.logs[k] = this.logs[k].filter((m) => baseId(m.id) !== baseId(id));
    this.emit('peers');
  }

  /** How many visitors are within earshot, and how many are online in all. */
  counts() {
    let near = 0;
    for (const p of this.peers.values()) if (Math.hypot(p.tx - this.pos.x, p.tz - this.pos.z) < 150) near++;
    return { near, all: this.peers.size };
  }
}
