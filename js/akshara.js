// Devanagari akshara (syllable cluster) utilities.
// One crossword square holds exactly one akshara, e.g. महाराष्ट्र → म · हा · रा · ष्ट्र

export const VIRAMA = '्';
const ZWJ = '‍';
const ZWNJ = '‌';

/** Classify a single Devanagari character. */
export function charType(ch) {
  const c = ch.codePointAt(0);
  if (c === 0x094D) return 'virama';
  if (c === 0x200D || c === 0x200C) return 'joiner';
  if (c === 0x093C) return 'nukta';
  if (c === 0x093D) return 'avagraha';
  if ((c >= 0x0915 && c <= 0x0939) || (c >= 0x0958 && c <= 0x095F) || (c >= 0x0978 && c <= 0x097F)) return 'consonant';
  if ((c >= 0x0904 && c <= 0x0914) || c === 0x0960 || c === 0x0961 || (c >= 0x0972 && c <= 0x0977)) return 'vowel';
  if ((c >= 0x093A && c <= 0x094C) || c === 0x094E || c === 0x094F || (c >= 0x0955 && c <= 0x0957) || c === 0x0962 || c === 0x0963) return 'matra';
  if (c >= 0x0900 && c <= 0x0903) return 'sign'; // chandrabindu ँ, anusvara ं, visarga ः
  if (c >= 0x0966 && c <= 0x096F) return 'digit';
  return 'other';
}

function endsWithLink(s) {
  const last = s.at(-1);
  if (last === VIRAMA) return true;
  return (last === ZWJ || last === ZWNJ) && s.at(-2) === VIRAMA;
}

/**
 * Split Marathi text into aksharas. Whitespace and punctuation are dropped.
 * A consonant joins the previous akshara only when that akshara ends in a virama (्),
 * which is how conjuncts like क्ष, ष्ट्र, त्र are formed.
 */
export function splitAksharas(text) {
  const out = [];
  let cur = '';
  const flush = () => { if (cur) out.push(cur); cur = ''; };
  for (const ch of text.normalize('NFC')) {
    switch (charType(ch)) {
      case 'consonant':
        if (cur && endsWithLink(cur)) cur += ch;
        else { flush(); cur = ch; }
        break;
      case 'vowel':
      case 'avagraha':
      case 'digit':
        flush(); cur = ch;
        break;
      case 'matra':
      case 'sign':
      case 'nukta':
      case 'virama':
      case 'joiner':
        cur += ch;
        break;
      default:
        flush();
    }
  }
  flush();
  return out;
}
