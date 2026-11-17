// Unit tests for the app's JS. Open /test/ in a browser (served by tools/serve.py) to run them.
import { splitAksharas } from '../js/akshara.js';
import { typeKey, BACKSPACE, NEXT } from '../js/input.js';
import { buildPuzzle } from '../js/puzzle.js';
import { validatePuzzle } from '../tools/validate-lib.js';
import { missingKeys } from '../js/i18n.js';

export const tests = [];
const test = (name, fn) => tests.push({ name, fn });

function eq(actual, expected, msg = '') {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg}\n  expected ${e}\n  got      ${a}`);
}

// ── akshara splitting (cases shared with the Python splitter in tools/akshara.py)
const AKSHARA_CASES = await (await fetch(new URL('./akshara-cases.json', import.meta.url), { cache: 'no-cache' })).json();
for (const [input, expected] of AKSHARA_CASES) {
  test(`splits "${input}" → ${expected.join(' · ') || '(nothing)'}`, () => eq(splitAksharas(input), expected));
}
test('normalizes precomposed nukta letters', () => eq(splitAksharas('क़').length, 1));

// ── answer obfuscation (fixture produced by tools/puzzlelib.py encode_cells)
const OBFUSCATED_FIXTURE = {
  id: 'fixture', title: 'fixture', rows: 3, cols: 4,
  entries: [
    { dir: 'across', row: 0, col: 0, x: 'jceUGonczZXW2xGDntaJ3MoJksHag5/ridzrldfojceK', clue: 'राज्य' },
    { dir: 'down', row: 0, col: 0, x: 'jceUGoncxJXW2xGDnsaJ3fQ=', clue: 'भाषा' },
  ],
};
test('decodes answers encoded by the Python generator', () => {
  const pz = buildPuzzle(OBFUSCATED_FIXTURE);
  eq(pz.entries.map((e) => e.sol), [['म', 'हा', 'रा', 'ष्ट्र'], ['म', 'रा', 'ठी']]);
});

// ── typing rules
const word = (n, extra = {}) => ({ values: Array(n).fill(''), locked: Array(n).fill(false), pos: 0, composing: false, ...extra });
const typeAll = (state, keys) => keys.reduce((s, k) => typeKey(s, k), state);

test('typing a word fills one akshara per square', () => {
  const s = typeAll(word(4), ['म', 'ह', 'ा', 'र', 'ा', 'ष', '्', 'ट', '्', 'र']);
  eq(s.values, ['म', 'हा', 'रा', 'ष्ट्र']);
  eq(s.pos, 3);
});
test('क्ष key fills one square', () => eq(typeAll(word(2), ['क्ष', 'म', 'ा']).values, ['क्ष', 'मा']));
test('a new matra replaces the old one', () => eq(typeAll(word(1), ['क', 'ि', 'ी']).values, ['की']));
test('matra goes before anusvara', () => eq(typeAll(word(1), ['क', 'ं', 'ि']).values, ['किं']));
test('matra after halant replaces the halant', () => eq(typeAll(word(1), ['क', '्', 'ा']).values, ['का']));
test('matra on an empty square is rejected', () => eq(typeKey(word(2), 'ा').rejected, true));
test('matra on an independent vowel is rejected', () => eq(typeAll(word(2), ['अ', 'ा']).rejected, true));
test('anusvara on an independent vowel works', () => eq(typeAll(word(2), ['अ', 'ं', 'ग']).values, ['अं', 'ग']));
test('vowel after halant starts a new square', () => eq(typeAll(word(2), ['क', '्', 'आ']).values, ['क्', 'आ']));
test('first key replaces a filled square that was just selected', () => {
  const s = typeKey(word(3, { values: ['क', 'ख', 'ग'], pos: 1 }), 'म');
  eq(s.values, ['क', 'म', 'ग']);
  eq(s.pos, 1);
});
test('matra on a selected square edits it', () => eq(typeKey(word(2, { values: ['क', 'ग'], pos: 0 }), 'ो').values, ['को', 'ग']));
test('locked squares are skipped', () => {
  const s = typeAll(word(3, { locked: [false, true, false], values: ['', 'रा', ''] }), ['म', 'ठ', 'ी']);
  eq(s.values, ['म', 'रा', 'ठी']);
});
test('base key at the end of the word overflows', () => {
  const s = typeAll(word(2), ['क', 'ख', 'ग']);
  eq(s.values, ['क', 'ख']);
  eq(s.overflow, 'ग');
});
test('backspace removes one character at a time', () => {
  const s = typeAll(word(2), ['क', 'ि', 'म', BACKSPACE]);
  eq(s.values, ['कि', '']);
  eq(s.pos, 1);
  const s2 = typeKey(s, BACKSPACE); // empty square → move back and trim the previous one
  eq(s2.values, ['क', '']);
  eq(s2.pos, 0);
  eq(typeKey(s2, BACKSPACE).values, ['', '']);
});
test('backspace skips locked squares', () => {
  const s = typeKey(word(3, { values: ['क', 'ख', ''], locked: [false, true, false], pos: 2, composing: true }), BACKSPACE);
  eq(s.values, ['', 'ख', '']);
  eq(s.pos, 0);
});
test('NEXT moves on without typing', () => {
  const s = typeAll(word(3), ['क', NEXT]);
  eq([s.pos, s.composing], [1, false]);
  eq(typeAll(word(1), [NEXT]).overflow, NEXT);
});

// ── puzzle model & validation
const sample = {
  id: 't',
  title: 'test',
  rows: 3,
  cols: 4,
  entries: [
    { dir: 'across', row: 0, col: 0, cells: ['म', 'हा', 'रा', 'ष्ट्र'], clue: 'राज्य' },
    { dir: 'down', row: 0, col: 0, cells: ['म', 'रा', 'ठी'], clue: 'भाषा' },
    { dir: 'down', row: 0, col: 2, cells: ['रा', 'जा'], clue: 'नृप' },
  ],
};

test('numbering follows reading order', () => {
  const pz = buildPuzzle(sample);
  eq(pz.entries.map((e) => [e.dir, e.num]), [['across', 1], ['down', 1], ['down', 2]]);
});
test('crossing mismatch throws', () => {
  const bad = structuredClone(sample);
  bad.entries[1].cells[0] = 'मा';
  let threw = false;
  try { buildPuzzle(bad); } catch { threw = true; }
  eq(threw, true);
});
test('valid sample has no errors', () => eq(validatePuzzle(sample), []));
test('validator rejects words over 7 aksharas', () => {
  const bad = structuredClone(sample);
  bad.cols = 8;
  bad.entries[0].cells = ['म', 'हा', 'रा', 'ष्ट्र', 'रा', 'ज्य', 'ना', 'व'];
  eq(validatePuzzle(bad).some((e) => e.includes('> 7')), true);
});
test('validator rejects two aksharas in one square', () => {
  const bad = structuredClone(sample);
  bad.entries[2].cells = ['रा', 'जाजी'];
  eq(validatePuzzle(bad).some((e) => e.includes('not exactly one akshara')), true);
});
test('validator catches accidentally touching words', () => {
  const bad = structuredClone(sample);
  bad.entries.push({ dir: 'down', row: 0, col: 3, cells: ['ष्ट्र', 'प'], clue: 'x' });
  eq(validatePuzzle(bad).some((e) => e.includes('Unclued run') || e.includes('touches')), true);
});

// ── UI language
test('Marathi and English define the same UI strings', () => eq(missingKeys(), []));
