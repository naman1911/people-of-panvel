// What this browser remembers about its visitor. There is no server.

const KEY = 'people-of-panvel:v2';

const defaults = () => ({
  lang: null, // 'en' | 'mr'
  sound: true,
  view: 'tp', // 'tp' from behind | 'fp' through your own eyes
  quality: null,
  invite: null, // the member's invite code, once they have used one here
  look: null, // how the member's character looks
  rulesOk: 0, // which version of "what being a member means" this visitor has agreed to
  blocked: [], // member ids this visitor has hidden
  hinted: false, // has seen the one-line "how to move" hint
});

let state = defaults();
try {
  const raw = localStorage.getItem(KEY);
  if (raw) state = { ...defaults(), ...JSON.parse(raw) };
} catch {
  /* private mode or blocked storage: carry on without saving */
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
};
