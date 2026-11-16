// A very small MQTT 3.1.1 client over WebSocket: connect (with a last-will),
// subscribe, unsubscribe, publish at QoS 0, and keep-alive pings. That is all
// the live layer needs, in about 150 lines instead of a 340 KB library.

const enc = new TextEncoder(), dec = new TextDecoder();

function utf8(s) {
  const b = enc.encode(s);
  const out = new Uint8Array(2 + b.length);
  out[0] = b.length >> 8;
  out[1] = b.length & 255;
  out.set(b, 2);
  return out;
}

function packet(first, parts) {
  let len = 0;
  for (const p of parts) len += p.length;
  const head = [first];
  let rest = len;
  do {
    let d = rest % 128;
    rest = Math.floor(rest / 128);
    if (rest > 0) d |= 128;
    head.push(d);
  } while (rest > 0);
  const out = new Uint8Array(head.length + len);
  out.set(head, 0);
  let o = head.length;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

export class Mqtt {
  /** opts: { clientId, will: { topic, payload }, keepalive (s) } */
  constructor(url, opts) {
    this.url = url;
    this.opts = opts;
    this.ws = null;
    this.buf = new Uint8Array(0);
    this.pid = 1;
    this.open = false;
    this.onMessage = null; // (topic, text) => void
    this.onClose = null; // () => void
    this.lastRx = 0;
    this.pingTimer = 0;
  }

  /** Resolves once the broker accepts the connection; rejects on failure or timeout. */
  connect(timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const fail = (why) => {
        if (settled) return;
        settled = true;
        this.close();
        reject(new Error(why));
      };
      const timer = setTimeout(() => fail('timeout'), timeoutMs);
      let ws;
      try {
        ws = this.ws = new WebSocket(this.url, 'mqtt');
      } catch (e) {
        clearTimeout(timer);
        return reject(e);
      }
      ws.binaryType = 'arraybuffer';
      ws.onopen = () => {
        const { clientId, will, keepalive = 30 } = this.opts;
        const flags = 0x02 | (will ? 0x04 : 0);
        const parts = [utf8('MQTT'), new Uint8Array([4, flags, keepalive >> 8, keepalive & 255]), utf8(clientId)];
        if (will) parts.push(utf8(will.topic), utf8(will.payload));
        ws.send(packet(0x10, parts));
      };
      ws.onmessage = (ev) => {
        this.lastRx = Date.now();
        this._feed(new Uint8Array(ev.data), (type, body) => {
          if (type === 2) {
            clearTimeout(timer);
            if (body[1] !== 0) return fail('refused ' + body[1]);
            settled = true;
            this.open = true;
            const every = Math.max(5, (this.opts.keepalive || 30) * 0.6) * 1000;
            this.pingTimer = setInterval(() => {
              if (!this.open) return;
              if (Date.now() - this.lastRx > every * 2.6) return this.close();
              this._send(new Uint8Array([0xc0, 0]));
            }, every);
            resolve();
          }
        });
      };
      ws.onerror = () => fail('socket error');
      ws.onclose = () => {
        clearTimeout(timer);
        const was = this.open;
        this.open = false;
        clearInterval(this.pingTimer);
        if (!settled) fail('closed');
        else if (was) this.onClose?.();
      };
    });
  }

  _send(bytes) {
    if (this.ws && this.ws.readyState === 1) this.ws.send(bytes);
  }

  /** Split the incoming byte stream into MQTT packets. */
  _feed(chunk, onControl) {
    let buf = this.buf;
    if (buf.length) {
      const joined = new Uint8Array(buf.length + chunk.length);
      joined.set(buf);
      joined.set(chunk, buf.length);
      buf = joined;
    } else buf = chunk;
    let o = 0;
    for (;;) {
      if (buf.length - o < 2) break;
      let len = 0, mult = 1, i = o + 1, done = false;
      while (i < buf.length && i < o + 5) {
        const d = buf[i++];
        len += (d & 127) * mult;
        mult *= 128;
        if (!(d & 128)) {
          done = true;
          break;
        }
      }
      if (!done || buf.length - i < len) break;
      const type = buf[o] >> 4, flags = buf[o] & 15;
      const body = buf.subarray(i, i + len);
      if (type === 3) {
        const tl = (body[0] << 8) | body[1];
        let p = 2 + tl;
        const topic = dec.decode(body.subarray(2, p));
        if (flags & 6) p += 2; // packet id, only present above QoS 0
        // payloads are capped: nobody needs more than this to say hello
        if (len - p <= 4096) this.onMessage?.(topic, dec.decode(body.subarray(p)));
      } else onControl?.(type, body);
      o = i + len;
    }
    this.buf = o < buf.length ? buf.slice(o) : new Uint8Array(0);
  }

  subscribe(filters) {
    const parts = [new Uint8Array([this.pid >> 8, this.pid & 255])];
    this.pid = (this.pid % 65535) + 1;
    for (const f of [].concat(filters)) parts.push(utf8(f), new Uint8Array([0]));
    this._send(packet(0x82, parts));
  }

  unsubscribe(filters) {
    const parts = [new Uint8Array([this.pid >> 8, this.pid & 255])];
    this.pid = (this.pid % 65535) + 1;
    for (const f of [].concat(filters)) parts.push(utf8(f));
    this._send(packet(0xa2, parts));
  }

  publish(topic, text) {
    this._send(packet(0x30, [utf8(topic), enc.encode(text)]));
  }

  close() {
    this.open = false;
    clearInterval(this.pingTimer);
    const ws = this.ws;
    this.ws = null;
    if (ws) {
      try {
        if (ws.readyState === 1) ws.send(new Uint8Array([0xe0, 0]));
        ws.close();
      } catch {
        /* already gone */
      }
    }
  }
}
