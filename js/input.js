// Typing rules for the custom Marathi keyboard. Pure functions, no DOM.
//
// The state describes the word being typed into:
//   values:    string per square of the word ('' = empty)
//   locked:    bool per square (revealed or verified squares can't change)
//   pos:       index of the cursor square within the word
//   composing: true while the cursor square is the one we just typed into
//
// Rules (see SPEC §5):
//   - A consonant or vowel starts a new square, unless the current square ends with
//     a halant (्), in which case a consonant joins it as a conjunct (क + ् + ष → क्ष).
//   - The first letter typed after selecting a square replaces that square.
//   - A matra modifies the current square (क + ि → कि; कि + ी → की).
//   - ं ँ ः are added to the current square.
//   - Backspace removes the last character of the square, then moves back.

import { charType, VIRAMA } from './akshara.js';

export const BACKSPACE = 'BACKSPACE';
export const NEXT = 'NEXT';

export function keyKind(key) {
  if (key === BACKSPACE) return 'backspace';
  if (key === NEXT) return 'next';
  if (!key) return 'other';
  const t = charType(key[0]);
  if (t === 'consonant' || t === 'vowel' || t === 'avagraha' || t === 'digit') return 'base';
  if (t === 'matra' || t === 'nukta') return 'matra';
  if (t === 'sign') return 'sign';
  if (t === 'virama') return 'virama';
  return 'other';
}

const last = (s) => s.slice(-1);

function splitTrailingSigns(s) {
  let i = s.length;
  while (i > 0 && charType(s[i - 1]) === 'sign') i--;
  return { core: s.slice(0, i), signs: s.slice(i) };
}

/**
 * Apply one key to a word. Returns a new state:
 *   { values, pos, composing, overflow?, rejected? }
 * `overflow` is set (to the key) when there's no room left in this word;
 * the caller should move to the next word and apply it there.
 */
export function typeKey(state, key) {
  const values = state.values.slice();
  const locked = state.locked;
  const n = values.length;
  let pos = state.pos;
  let composing = state.composing;
  const out = (extra) => ({ values, locked, pos, composing, ...extra });
  const nextFree = (from) => { for (let j = from; j < n; j++) if (!locked[j]) return j; return -1; };
  const prevFree = (from) => { for (let j = from; j >= 0; j--) if (!locked[j]) return j; return -1; };
  const cur = values[pos] || '';

  switch (keyKind(key)) {
    case 'base': {
      if (composing && !locked[pos] && last(cur) === VIRAMA && charType(key[0]) === 'consonant') {
        values[pos] = cur + key;
        return out();
      }
      const target = composing && cur ? nextFree(pos + 1) : locked[pos] ? nextFree(pos + 1) : pos;
      if (target === -1) return out({ overflow: key });
      values[target] = key;
      pos = target;
      composing = true;
      return out();
    }
    case 'matra': {
      if (locked[pos] || !cur) return out({ rejected: true });
      const { core, signs } = splitTrailingSigns(cur);
      const lt = core ? charType(last(core)) : 'other';
      let next;
      if (lt === 'matra' || lt === 'virama') next = core.slice(0, -1) + key;
      else if (lt === 'consonant' || lt === 'nukta') next = core + key;
      else return out({ rejected: true }); // matras don't attach to vowels like अ
      values[pos] = next + signs;
      composing = true;
      return out();
    }
    case 'sign': {
      if (locked[pos] || !cur) return out({ rejected: true });
      const lt = charType(last(cur));
      if (lt === 'virama') return out({ rejected: true });
      values[pos] = lt === 'sign' ? cur.slice(0, -1) + key : cur + key;
      composing = true;
      return out();
    }
    case 'virama': {
      if (locked[pos] || !cur) return out({ rejected: true });
      const lt = charType(last(cur));
      if (lt !== 'consonant' && lt !== 'nukta') return out({ rejected: true });
      values[pos] = cur + key;
      composing = true;
      return out();
    }
    case 'backspace': {
      if (!locked[pos] && cur) {
        values[pos] = cur.slice(0, -1);
        composing = true;
        return out();
      }
      const p = prevFree(pos - 1);
      if (p === -1) return out();
      pos = p;
      values[p] = values[p].slice(0, -1);
      composing = true;
      return out();
    }
    case 'next': {
      const t = nextFree(pos + 1);
      if (t === -1) return out({ overflow: NEXT });
      pos = t;
      composing = false;
      return out();
    }
    default:
      return out({ rejected: true });
  }
}
