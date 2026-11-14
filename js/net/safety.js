// Everything that arrives from other people is untrusted. These helpers
// clean names, messages and character looks before anything is shown.

const HEX = /^#[0-9a-f]{6}$/i;
const GARB = new Set(['shirt', 'tee', 'kurta', 'salwar', 'saree']);
const HAIRSTYLE = new Set(['short', 'long', 'bun', 'plait', 'scarf', 'bald']);
const ACC = new Set(['bag', 'sling', 'specs', 'cap', 'topi', 'moustache', 'beard']);

// A short list of slurs and abuse in English, Hindi and Marathi (Latin and Devanagari).
// It is deliberately small: it catches the obvious, and people can block the rest.
const BAD = [
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'cunt', 'dick', 'slut', 'whore', 'rape', 'nigg', 'faggot',
  'madarchod', 'maderchod', 'behenchod', 'bhenchod', 'bhosdi', 'bhosad', 'chutiya', 'chutia', 'chut', 'gaand', 'gandu', 'lund', 'lavda', 'lavde', 'lauda', 'randi', 'harami', 'kutte', 'kamina', 'saala', 'zhavad', 'zavad', 'aighal', 'aaighal', 'bhadwa', 'bhadva', 'chinal', 'raand',
  'मादरचोद', 'बहनचोद', 'भेनचोद', 'भोसडी', 'चूतिया', 'चुतिया', 'गांडू', 'गांड', 'लंड', 'लवडा', 'रंडी', 'हरामी', 'झवाड', 'आईघाल', 'भडवा', 'छिनाल', 'रांड',
];
const BAD_RE = new RegExp('(' + BAD.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'giu');
const URL_RE = /\b(?:https?:\/\/|www\.)\S+|\b[\w-]+\.(?:com|in|net|org|io|me|co|app|xyz|link|ly)\b\S*/giu;
const DIGITS_RE = /(?:\d[\s-]?){8,}/gu;

/** Plain single-line text: no control or invisible characters, trimmed, capped. */
export function cleanText(s, max = 200) {
  // only real strings and numbers count as text; anything else is treated as empty
  return (typeof s === 'string' ? s : typeof s === 'number' ? String(s) : '')
    .replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁯﻿]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/** Text as it may be shown to others: abuse masked, links and phone numbers removed. */
export function soften(s, max = 200) {
  return cleanText(s, max).replace(URL_RE, '[link]').replace(DIGITS_RE, '[number] ').replace(BAD_RE, (m) => m[0] + '•'.repeat(Math.max(2, m.length - 1)));
}

export const cleanName = (s) => soften(s, 24).replace(/[<>]/g, '') || 'Guest';

/** Only known garments, styles and colour values survive. */
export function cleanLook(l) {
  const o = l && typeof l === 'object' ? l : {};
  const hex = (v, d) => (typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : d);
  const garb = GARB.has(o.garb) ? o.garb : 'shirt';
  return {
    woman: garb === 'saree' || garb === 'salwar' ? true : !!o.woman,
    garb,
    hairStyle: HAIRSTYLE.has(o.hairStyle) ? o.hairStyle : 'short',
    top: hex(o.top, '#e8e4d8'),
    bottom: hex(o.bottom, '#37474f'),
    skin: hex(o.skin, '#b97c52'),
    hair: hex(o.hair, '#1a1412'),
    accent: hex(o.accent, '#ff5a3c'),
    h: Math.min(1.08, Math.max(0.9, Number(o.h) || 1)),
    acc: Array.isArray(o.acc) ? o.acc.filter((a) => ACC.has(a)).slice(0, 4) : [],
  };
}

export const finite = (v, lo, hi, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
};

/** A simple token bucket per sender, to drop floods. */
export class Bucket {
  constructor(size = 6, perSecond = 0.6) {
    this.size = size;
    this.rate = perSecond;
    this.map = new Map();
  }
  take(id, now = Date.now()) {
    let b = this.map.get(id);
    if (!b) this.map.set(id, (b = { n: this.size, t: now }));
    b.n = Math.min(this.size, b.n + ((now - b.t) / 1000) * this.rate);
    b.t = now;
    if (b.n < 1) return false;
    b.n -= 1;
    return true;
  }
}
