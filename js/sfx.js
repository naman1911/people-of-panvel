// A few synthesised sounds, so the project ships no audio files.

import { store } from './store.js';

let ctx = null, rainGain = null, rainSrc = null;

function ac() {
  if (!store.get('sound')) return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, t0, dur, type = 'sine', vol = 0.12) {
  const a = ac();
  if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, a.currentTime + t0);
  g.gain.linearRampToValueAtTime(vol, a.currentTime + t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(a.currentTime + t0);
  o.stop(a.currentTime + t0 + dur + 0.05);
}

export const sfx = {
  /** Call from a user gesture so browsers allow audio. */
  unlock: () => void ac(),
  pop: () => tone(520, 0, 0.12, 'triangle', 0.09),
  hello() {
    tone(660, 0, 0.14, 'sine', 0.1);
    tone(880, 0.1, 0.2, 'sine', 0.1);
  },
  /** Temple-bell style chime for a new stamp. */
  stamp() {
    for (const [f, t] of [[784, 0], [1175, 0.02], [1568, 0.04]]) tone(f, t, 1.3, 'sine', 0.08);
  },
  /** Two-tone station announcement chime. */
  chime() {
    tone(659, 0, 0.45, 'sine', 0.11);
    tone(523, 0.38, 0.7, 'sine', 0.11);
  },
  horn() {
    tone(392, 0, 0.16, 'square', 0.05);
    tone(466, 0, 0.16, 'square', 0.05);
    tone(392, 0.2, 0.22, 'square', 0.05);
    tone(466, 0.2, 0.22, 'square', 0.05);
  },
  /** Rain hiss, faded with the weather. */
  rain(level) {
    const a = level > 0.02 ? ac() : ctx;
    if (!a) return;
    if (!rainSrc) {
      const len = a.sampleRate * 2, buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      rainSrc = a.createBufferSource();
      rainSrc.buffer = buf;
      rainSrc.loop = true;
      const f = a.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 2400;
      f.Q.value = 0.4;
      rainGain = a.createGain();
      rainGain.gain.value = 0;
      rainSrc.connect(f).connect(rainGain).connect(a.destination);
      rainSrc.start();
    }
    rainGain.gain.setTargetAtTime(store.get('sound') ? level * 0.06 : 0, a.currentTime, 0.5);
  },
};
