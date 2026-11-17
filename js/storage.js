// Progress and settings, kept in this browser's localStorage.
// Every access is wrapped: storage can be unavailable (private mode, blocked site data).

import { addDays } from './util.js';

const PREFIX = 'marathi-crossword:v1:';

function read(key, fallback) {
  try {
    const v = localStorage.getItem(PREFIX + key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage unavailable: play continues without saving */
  }
}

export function loadProgress(id) {
  return {
    fills: {},
    revealed: [],
    verified: [],
    wrong: [],
    elapsed: 0,
    solved: false,
    solvedAt: null,
    assisted: false,
    ...read('p:' + id, {}),
  };
}

export function saveProgress(id, progress) {
  write('p:' + id, progress);
}

/** 'new' | 'progress' | 'solved' */
export function statusOf(id) {
  const p = read('p:' + id, null);
  if (!p) return 'new';
  if (p.solved) return 'solved';
  return Object.keys(p.fills || {}).length ? 'progress' : 'new';
}

/**
 * Consecutive days with a solved puzzle, ending today (or yesterday, if today's isn't solved yet).
 * Puzzle ids are their dates, so this needs only storage.
 */
export function streakAsOf(today) {
  const solved = (iso) => statusOf(iso) === 'solved';
  let d = solved(today) ? today : addDays(today, -1);
  let n = 0;
  while (solved(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export function loadSettings() {
  return { input: 'custom', ...read('settings', {}) };
}

export function saveSettings(settings) {
  write('settings', settings);
}
