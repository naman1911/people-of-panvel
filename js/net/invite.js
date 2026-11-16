// Invites: how a ghost becomes a member, with no server to ask.
//
// A reviewer holds a private signing key. For each person they let in, the
// reviewer page makes a fresh key pair for that person and signs a small pass:
// member id, name, date, and the person's public key. The invite code is that
// pass plus the person's private key.
//
// Every browser checks passes against the reviewers' public keys in
// js/config.js, and members sign what they say with their own key. So a pass
// copied off the network is useless to anyone else, and nobody can make one up.
//
// Layout of a pass (bytes):
//   1  version
//   5  member id
//   2  day issued, counted from 1 Jan 2025
//   1  length of the name in bytes, then the name (UTF-8)
//  64  the member's public key (x, y)
//  64  the reviewer's signature over everything above
// An invite code is a pass followed by the 32 bytes of the member's private key.

const VERSION = 1;
const TAG = new TextEncoder().encode('pop-invite-v1');
const EPOCH = Date.UTC(2025, 0, 1);
const DAY = 86400000;
const CURVE = { name: 'ECDSA', namedCurve: 'P-256' };
const SIGN = { name: 'ECDSA', hash: 'SHA-256' };
const DH = { name: 'ECDH', namedCurve: 'P-256' };
const B32 = 'abcdefghjkmnpqrstuvwxyz234567890'.slice(0, 32);
const MAX_NAME = 72;

export const b64u = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export function unb64u(s) {
  const t = String(s).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(t + '='.repeat((4 - (t.length % 4)) % 4)), (c) => c.charCodeAt(0));
}
const join = (...parts) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) (out.set(p, at), (at += p.length));
  return out;
};
/** Five bytes as eight letters and digits: the member id people can read out. */
function midText(b) {
  let bits = 0n;
  for (const v of b) bits = (bits << 8n) | BigInt(v);
  let s = '';
  for (let i = 7; i >= 0; i--) s += B32[Number((bits >> BigInt(i * 5)) & 31n)];
  return s;
}

/** Split a pass into its fields. Returns null if it is not shaped like one. */
function readPass(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 9 + 128 || bytes[0] !== VERSION) return null;
  const n = bytes[8];
  if (n < 1 || n > MAX_NAME || bytes.length !== 9 + n + 128) return null;
  let name;
  try {
    name = new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(9, 9 + n));
  } catch {
    return null;
  }
  const body = bytes.subarray(0, 9 + n + 64);
  return {
    mid: midText(bytes.subarray(1, 6)),
    issued: EPOCH + ((bytes[6] << 8) | bytes[7]) * DAY,
    name,
    x: bytes.subarray(9 + n, 9 + n + 32),
    y: bytes.subarray(9 + n + 32, 9 + n + 64),
    sig: bytes.subarray(9 + n + 64),
    body,
  };
}

const reviewerKeys = new Map();
async function reviewerKey(pub) {
  let k = reviewerKeys.get(pub);
  if (!k) {
    k = crypto.subtle.importKey('raw', unb64u(pub), CURVE, false, ['verify']).catch(() => null);
    reviewerKeys.set(pub, k);
  }
  return k;
}

/**
 * Check a pass. `reviewers` are public keys from the site settings, `revoked` are member ids.
 * Resolves to { mid, name, issued, key, pass } or to null.
 */
export async function checkPass(pass, reviewers, revoked = []) {
  let bytes;
  try {
    bytes = typeof pass === 'string' ? unb64u(pass) : pass;
  } catch {
    return null;
  }
  const p = readPass(bytes);
  if (!p || revoked.includes(p.mid)) return null;
  const signed = join(TAG, p.body);
  for (const pub of reviewers) {
    const rk = await reviewerKey(pub);
    if (!rk) continue;
    if (await crypto.subtle.verify(SIGN, rk, p.sig, signed).catch(() => false)) {
      const pub = { kty: 'EC', crv: 'P-256', x: b64u(p.x), y: b64u(p.y) };
      const key = await crypto.subtle.importKey('jwk', pub, CURVE, false, ['verify']).catch(() => null);
      const dh = await crypto.subtle.importKey('jwk', pub, DH, false, []).catch(() => null);
      if (!key || !dh) return null;
      return { mid: p.mid, name: p.name, issued: p.issued, key, dh, pass: typeof pass === 'string' ? pass : b64u(bytes) };
    }
  }
  return null;
}

/** Pull the code out of whatever was pasted: the bare code, or the whole link from the email. */
export function tidyCode(text) {
  const s = String(text || '').trim();
  const m = /[#?&]invite=([A-Za-z0-9_-]+)/.exec(s);
  return (m ? m[1] : s).replace(/[^A-Za-z0-9_-]/g, '');
}

/**
 * Open an invite code. Resolves to the member: { mid, name, issued, pass, key, dh, signKey, dhKey }.
 * Rejects with an Error whose message is 'shape', 'revoked' or 'unknown'.
 */
export async function openInvite(code, reviewers, revoked = []) {
  let bytes;
  try {
    bytes = unb64u(tidyCode(code));
  } catch {
    throw new Error('shape');
  }
  if (bytes.length < 9 + 128 + 32) throw new Error('shape');
  const passBytes = bytes.subarray(0, bytes.length - 32), d = bytes.subarray(bytes.length - 32);
  const p = readPass(passBytes);
  if (!p) throw new Error('shape');
  if (revoked.includes(p.mid)) throw new Error('revoked');
  const member = await checkPass(passBytes, reviewers, revoked);
  if (!member) throw new Error('unknown');
  let signKey, dhKey;
  try {
    const priv = { kty: 'EC', crv: 'P-256', x: b64u(p.x), y: b64u(p.y), d: b64u(d) };
    signKey = await crypto.subtle.importKey('jwk', priv, CURVE, false, ['sign']);
    dhKey = await crypto.subtle.importKey('jwk', priv, DH, false, ['deriveKey']);
    // the private half must match the public half in the pass
    const probe = new Uint8Array([1, 2, 3]);
    if (!(await crypto.subtle.verify(SIGN, member.key, await crypto.subtle.sign(SIGN, signKey, probe), probe))) throw new Error('shape');
  } catch {
    throw new Error('shape');
  }
  return { ...member, signKey, dhKey };
}

/** Sign a piece of text as a member. */
export const signText = async (signKey, text) => b64u(await crypto.subtle.sign(SIGN, signKey, new TextEncoder().encode(text)));
/** Check a member's signature on a piece of text. Never throws. */
export async function checkText(key, text, sig) {
  try {
    return await crypto.subtle.verify(SIGN, key, unb64u(sig), new TextEncoder().encode(text));
  } catch {
    return false;
  }
}

// ---- private messages --------------------------------------------------------------------
// A private message is sealed twice: once for the person it is sent to, and once for each
// reviewer. Other members cannot read it. Reviewers can, to keep people safe. Members are
// told, before they walk in, that messages are not secret and can be checked.

/** The secret two people share: my private half, their public half. */
export const sharedKey = (myDhKey, theirDh) => crypto.subtle.deriveKey({ name: 'ECDH', public: theirDh }, myDhKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
/** A reviewer's public key (as listed in the site settings), for sealing. */
export const reviewerDh = (pub) => crypto.subtle.importKey('raw', unb64u(pub), DH, false, []);
/** A reviewer's own private half, for reading what was sealed to them. */
export const reviewerDhKey = (secret) => crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: secret.x, y: secret.y, d: secret.d }, DH, false, ['deriveKey']);

export async function seal(aes, text) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  return { iv: b64u(iv), c: b64u(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aes, new TextEncoder().encode(text))) };
}
/** Returns the text, or null if it was not sealed with this key. */
export async function unseal(aes, box) {
  try {
    return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64u(box.iv) }, aes, unb64u(box.c)));
  } catch {
    return null;
  }
}

// ---- for the reviewer page only -----------------------------------------------------------

/** Make a reviewer key. `secret` stays with the reviewer; `pub` goes into the site settings. */
export async function newReviewer() {
  const pair = await crypto.subtle.generateKey(CURVE, true, ['sign', 'verify']);
  return { secret: await crypto.subtle.exportKey('jwk', pair.privateKey), pub: b64u(await crypto.subtle.exportKey('raw', pair.publicKey)) };
}
/** The public key that goes with a reviewer's secret. */
export const reviewerPublic = (secret) => b64u(join(new Uint8Array([4]), unb64u(secret.x), unb64u(secret.y)));

/** Write an invite for one person. Resolves to { code, mid, name, issued }. */
export async function writeInvite(secret, name) {
  const nameBytes = new TextEncoder().encode(name);
  if (nameBytes.length < 1 || nameBytes.length > MAX_NAME) throw new Error('name');
  const signer = await crypto.subtle.importKey('jwk', { ...secret, key_ops: ['sign'] }, CURVE, false, ['sign']);
  const pair = await crypto.subtle.generateKey(CURVE, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  const days = Math.floor((Date.now() - EPOCH) / DAY);
  const body = join(new Uint8Array([VERSION]), crypto.getRandomValues(new Uint8Array(5)), new Uint8Array([days >> 8, days & 255, nameBytes.length]), nameBytes, unb64u(jwk.x), unb64u(jwk.y));
  const sig = new Uint8Array(await crypto.subtle.sign(SIGN, signer, join(TAG, body)));
  return { code: b64u(join(body, sig, unb64u(jwk.d))), mid: midText(body.subarray(1, 6)), name, issued: EPOCH + days * DAY };
}
