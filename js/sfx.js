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

let bed = null, bedGain = null, cricket = null, cricketGain = null;
let nextBird = 3, nextHorn = 9, nextBell = 12, nextTrain = 20;

function noiseSource(a, brown) {
  const len = a.sampleRate * 3, buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (brown) {
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    } else d[i] = w;
  }
  const src = a.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  return src;
}

function chirp(a, vol) {
  // a few quick upward sweeps, like a bulbul or a sparrow
  const n = 2 + ((Math.random() * 4) | 0), base = 2200 + Math.random() * 1800;
  for (let i = 0; i < n; i++) {
    const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + i * (0.09 + Math.random() * 0.05);
    o.type = 'sine';
    o.frequency.setValueAtTime(base * (0.9 + Math.random() * 0.2), t);
    o.frequency.exponentialRampToValueAtTime(base * (1.25 + Math.random() * 0.4), t + 0.06);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + 0.1);
  }
}

export const sfx = {
  /** One footfall. `wet` adds a little splash in the rain. */
  step(wet) {
    const a = ac();
    if (!a) return;
    const src = a.createBufferSource(), len = (a.sampleRate * 0.07) | 0, buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
    src.buffer = buf;
    const f = a.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = wet ? 2600 : 700 + Math.random() * 300;
    const g = a.createGain();
    g.gain.value = wet ? 0.09 : 0.11;
    src.connect(f).connect(g).connect(a.destination);
    src.start();
  },
  /**
   * The sound of the place, updated about once a second.
   * env: { bustle 0..1, night 0..1, rain 0..1, green bool, temple bool, station bool }
   */
  ambience(env) {
    const a = ctx;
    if (!a) return;
    const on = store.get('sound');
    if (!bed) {
      bed = noiseSource(a, true);
      const lp = a.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 420;
      bedGain = a.createGain();
      bedGain.gain.value = 0;
      bed.connect(lp).connect(bedGain).connect(a.destination);
      bed.start();
      // crickets: a high tone chopped into pulses
      cricket = a.createOscillator();
      cricket.frequency.value = 4300;
      const am = a.createOscillator(), amGain = a.createGain();
      am.type = 'square';
      am.frequency.value = 31;
      amGain.gain.value = 0.5;
      cricketGain = a.createGain();
      cricketGain.gain.value = 0;
      const chop = a.createGain();
      chop.gain.value = 0.5;
      am.connect(amGain).connect(chop.gain);
      cricket.connect(chop).connect(cricketGain).connect(a.destination);
      cricket.start();
      am.start();
    }
    const t = a.currentTime;
    bedGain.gain.setTargetAtTime(on ? 0.05 + env.bustle * 0.16 : 0, t, 0.8);
    cricketGain.gain.setTargetAtTime(on ? env.night * (1 - env.rain) * 0.012 * (1 - env.bustle * 0.6) : 0, t, 1.5);
    if (!on) return;
    nextBird -= 1;
    if (nextBird <= 0 && env.night < 0.4 && env.rain < 0.5) {
      chirp(a, env.green ? 0.035 : 0.016);
      nextBird = (env.green ? 1 : 3) + Math.random() * 5;
    }
    nextHorn -= 1;
    if (nextHorn <= 0) {
      nextHorn = 5 + Math.random() * (16 - env.bustle * 9);
      if (env.bustle > 0.2) {
        // somebody, somewhere, is always honking
        const f = 380 + Math.random() * 160, v = 0.012 + env.bustle * 0.02;
        tone(f, 0, 0.18, 'square', v);
        tone(f * 1.19, 0, 0.18, 'square', v);
        if (Math.random() < 0.5) {
          tone(f, 0.24, 0.3, 'square', v);
          tone(f * 1.19, 0.24, 0.3, 'square', v);
        }
      }
    }
    nextBell -= 1;
    if (nextBell <= 0) {
      nextBell = 14 + Math.random() * 22;
      if (env.temple) for (const [fq, vv] of [[620, 0.05], [1242, 0.03], [1868, 0.018]]) tone(fq, 0, 2.6, 'sine', vv);
    }
    nextTrain -= 1;
    if (nextTrain <= 0) {
      nextTrain = 30 + Math.random() * 40;
      if (env.station) {
        tone(311, 0, 1.3, 'sawtooth', 0.03);
        tone(370, 0, 1.3, 'sawtooth', 0.03);
      }
    }
  },
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
