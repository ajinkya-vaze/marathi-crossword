// Puzzle validation rules (SPEC §6). Pure: works in Node and in the browser.
import { splitAksharas } from '../js/akshara.js';
import { buildPuzzle, decodePuzzle } from '../js/puzzle.js';

export const MAX_WORDS = 100;
export const MAX_AKSHARAS = 7;

/** Returns a list of human-readable problems; empty means the puzzle is valid. */
export function validatePuzzle(data) {
  const errors = [];
  const err = (m) => errors.push(m);

  if (!data || typeof data !== 'object') return ['Not a JSON object'];
  try {
    data = decodePuzzle(data);
  } catch (e) {
    return [`Cannot decode answers: ${e.message}`];
  }
  if (!data.id) err('Missing id');
  if (!data.title) err('Missing title');
  if (!Number.isInteger(data.rows) || !Number.isInteger(data.cols)) err('rows/cols must be integers');
  if (!Array.isArray(data.entries) || data.entries.length === 0) return [...errors, 'No entries'];
  if (data.entries.length > MAX_WORDS) err(`Too many words: ${data.entries.length} > ${MAX_WORDS}`);

  const answers = new Set();
  data.entries.forEach((e, i) => {
    const name = `Entry ${i + 1} (${(e.cells || []).join('')})`;
    if (!Array.isArray(e.cells) || e.cells.length < 2) return err(`${name}: needs at least 2 squares`);
    if (e.cells.length > MAX_AKSHARAS) err(`${name}: ${e.cells.length} aksharas > ${MAX_AKSHARAS}`);
    e.cells.forEach((s, k) => {
      const parts = splitAksharas(s);
      if (parts.length !== 1 || parts[0] !== s.normalize('NFC')) err(`${name}: square ${k + 1} "${s}" is not exactly one akshara`);
    });
    if (typeof e.clue !== 'string' || !e.clue.trim()) err(`${name}: missing clue`);
    const word = e.cells.join('');
    if (answers.has(word)) err(`${name}: duplicate answer`);
    answers.add(word);
  });
  if (errors.length) return errors;

  let pz;
  try {
    pz = buildPuzzle(data);
  } catch (e) {
    return [e.message];
  }

  // Every run of 2+ adjacent squares must be exactly one entry, and vice versa.
  // This catches words that accidentally touch and form unclued "words".
  const has = (r, c) => r >= 0 && c >= 0 && r < pz.rows && c < pz.cols && !!pz.cells[r * pz.cols + c];
  const runs = new Set();
  for (let r = 0; r < pz.rows; r++) {
    for (let c = 0; c < pz.cols; c++) {
      if (!has(r, c)) continue;
      if (!has(r, c - 1) && has(r, c + 1)) {
        let n = 0;
        while (has(r, c + n)) n++;
        runs.add(`across:${r}:${c}:${n}`);
      }
      if (!has(r - 1, c) && has(r + 1, c)) {
        let n = 0;
        while (has(r + n, c)) n++;
        runs.add(`down:${r}:${c}:${n}`);
      }
    }
  }
  const entryKeys = new Set(data.entries.map((e) => `${e.dir}:${e.row}:${e.col}:${e.cells.length}`));
  for (const k of runs) if (!entryKeys.has(k)) err(`Unclued run of squares ${describe(k)}`);
  for (const k of entryKeys) if (!runs.has(k)) err(`Entry ${describe(k)} touches neighbouring squares`);

  return errors;
}

function describe(key) {
  const [dir, r, c, n] = key.split(':');
  return `${dir} at row ${+r + 1}, col ${+c + 1}, length ${n}`;
}

/** Validate index.json against the puzzle files it lists. `load(id)` returns parsed puzzle JSON. */
export async function validateAll(index, load) {
  const report = [];
  const ids = new Set();
  for (const p of index.puzzles || []) {
    const errors = [];
    if (ids.has(p.id)) errors.push('Duplicate id in index.json');
    ids.add(p.id);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date || '')) errors.push(`Bad date "${p.date}"`);
    let data;
    try {
      data = await load(p.id);
    } catch (e) {
      report.push({ id: p.id, errors: [...errors, `Cannot load: ${e.message}`] });
      continue;
    }
    if (data.id !== p.id) errors.push(`id mismatch: index "${p.id}" vs file "${data.id}"`);
    if (data.entries && p.words !== data.entries.length) errors.push(`index says ${p.words} words, file has ${data.entries.length}`);
    errors.push(...validatePuzzle(data));
    report.push({ id: p.id, errors });
  }
  return report;
}
