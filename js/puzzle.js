// Puzzle model: turns puzzle JSON into a grid of squares with numbering.

/**
 * Answers in generated puzzles are lightly obfuscated so they aren't readable at a glance:
 * entry.x = base64( utf8("म|हा|रा|ष्ट्र") XOR utf8("mc:" + puzzle id) ).
 * This is not security; anyone determined can decode it. Must match tools/puzzlelib.py.
 * Hand-written puzzles may use plain `cells` instead.
 */
export function decodePuzzle(data) {
  if (!data.entries?.some((e) => e.x)) return data;
  const key = new TextEncoder().encode('mc:' + data.id);
  const entries = data.entries.map((e) => {
    if (!e.x) return e;
    const bin = atob(e.x);
    const bytes = Uint8Array.from(bin, (ch, i) => ch.charCodeAt(0) ^ key[i % key.length]);
    const { x, ...rest } = e;
    return { ...rest, cells: new TextDecoder().decode(bytes).split('|') };
  });
  return { ...data, entries };
}

/**
 * @param {{id:string,title:string,rows:number,cols:number,
 *          entries:{dir:'across'|'down',row:number,col:number,cells:string[],clue:string}[]}} data
 */
export function buildPuzzle(data) {
  data = decodePuzzle(data);
  const { rows, cols } = data;
  if (!(rows > 0 && cols > 0)) throw new Error('Invalid grid size');
  const cells = new Array(rows * cols).fill(null);

  const entries = data.entries.map((e, idx) => {
    if (e.dir !== 'across' && e.dir !== 'down') throw new Error(`Entry ${idx}: bad dir "${e.dir}"`);
    const sol = e.cells.map((s) => s.normalize('NFC'));
    const positions = sol.map((_, k) => {
      const r = e.row + (e.dir === 'down' ? k : 0);
      const c = e.col + (e.dir === 'across' ? k : 0);
      if (r < 0 || c < 0 || r >= rows || c >= cols) throw new Error(`Entry ${idx} runs off the grid`);
      return r * cols + c;
    });
    return { idx, dir: e.dir, row: e.row, col: e.col, clue: e.clue, sol, positions, num: 0 };
  });

  for (const e of entries) {
    e.positions.forEach((i, k) => {
      let cell = cells[i];
      if (!cell) {
        cell = cells[i] = { i, r: Math.floor(i / cols), c: i % cols, sol: e.sol[k], across: null, down: null, num: null };
      } else if (cell.sol !== e.sol[k]) {
        throw new Error(`Crossing mismatch at row ${cell.r + 1}, col ${cell.c + 1}: "${cell.sol}" vs "${e.sol[k]}"`);
      }
      if (cell[e.dir] != null) throw new Error(`Two ${e.dir} entries overlap at row ${cell.r + 1}, col ${cell.c + 1}`);
      cell[e.dir] = e.idx;
    });
  }

  // Standard numbering: every square that starts an entry gets a number, in reading order.
  const starts = [...new Set(entries.map((e) => e.positions[0]))].sort((a, b) => a - b);
  starts.forEach((i, n) => { cells[i].num = n + 1; });
  for (const e of entries) e.num = cells[e.positions[0]].num;

  const byNum = (a, b) => a.num - b.num;
  const across = entries.filter((e) => e.dir === 'across').sort(byNum);
  const down = entries.filter((e) => e.dir === 'down').sort(byNum);

  return {
    id: data.id,
    title: data.title,
    rows,
    cols,
    cells,
    entries,
    across,
    down,
    ordered: [...across, ...down],
    letterCells: cells.filter(Boolean).map((c) => c.i),
  };
}
