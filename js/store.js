// Everything a visitor does is kept in their own browser. There is no server.

const KEY = 'people-of-panvel:v1';

const defaults = () => ({
  lang: null, // 'en' | 'mr'
  me: null, // { name, look, status, archetype, home }
  stamps: [], // landmark ids
  met: [], // person ids
  katta: [], // bookmarked person ids
  posters: [], // { id, board, kind, title, when, by, ts }
  done: [], // first-steps mission ids
  seenTips: [], // district ids whose welcome note was dismissed
  sound: true,
  hints: true,
  view: 'fp', // 'fp' first person | 'tp' third person
  quality: null,
});

let state = defaults();
try {
  const raw = localStorage.getItem(KEY);
  if (raw) state = { ...defaults(), ...JSON.parse(raw) };
} catch {
  /* private mode or blocked storage: play on without saving */
}

let pending = 0;
function flush() {
  pending = 0;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export const store = {
  get: (k) => state[k],
  set(k, v) {
    state[k] = v;
    if (!pending) pending = setTimeout(flush, 150);
  },
  /** Add to a list once. Returns true if it was new. */
  add(k, v) {
    if (state[k].includes(v)) return false;
    state[k] = [...state[k], v];
    if (!pending) pending = setTimeout(flush, 150);
    return true;
  },
  remove(k, v) {
    state[k] = state[k].filter((x) => x !== v);
    if (!pending) pending = setTimeout(flush, 150);
  },
  has: (k, v) => state[k].includes(v),
  reset() {
    state = defaults();
    flush();
  },
};
