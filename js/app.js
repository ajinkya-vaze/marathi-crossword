import { buildPuzzle } from './puzzle.js';
import { typeKey, BACKSPACE, NEXT } from './input.js';
import { splitAksharas, isCloseEnough } from './akshara.js';
import * as store from './storage.js';
import { createKeyboard } from './keyboard.js';
import { helpHTML } from './help.js';
import { t, num, time, date, getLang, setLang } from './i18n.js';
import { todayISO, addDays, esc, toast, hideToast } from './util.js';

const app = document.getElementById('app');
let teardown = null;

const other = (dir) => (dir === 'across' ? 'down' : 'across');
const dirLabel = (dir) => t(dir);

async function fetchJSON(url) {
  let res;
  try {
    res = await fetch(url, { cache: 'no-cache' });
  } catch (err) {
    err.offline = true; // network failure and nothing cached
    throw err;
  }
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
}

async function route() {
  if (teardown) teardown();
  teardown = null;
  document.querySelectorAll('.backdrop').forEach((b) => b.remove());
  hideToast();
  window.scrollTo(0, 0);
  const hash = location.hash;
  const m = hash.match(/^#\/p\/([\w-]+)$/);
  try {
    if (m) teardown = await renderPlay(m[1]);
    else if (hash === '#/help') renderHelp();
    else await renderHome();
  } catch (err) {
    console.error(err);
    const msg = err.offline || navigator.onLine === false ? t('offlineError') : t('loadError');
    app.innerHTML = `<div class="error-page"><p>${esc(msg)}</p><a class="btn-primary" href="#/">${t('home')}</a></div>`;
  }
}
window.addEventListener('hashchange', route);
route();

// ── offline / install ──
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW', e)));
}
let installPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e;
  document.querySelector('.install-btn')?.removeAttribute('hidden');
});
window.addEventListener('appinstalled', () => {
  installPrompt = null;
  document.querySelector('.install-btn')?.setAttribute('hidden', '');
});

// ───────────────────────── Shared chrome ─────────────────────────

function topbar(title, { backHref } = {}) {
  return `<header class="topbar">
    ${backHref ? `<a class="icon-btn" href="${backHref}" aria-label="${t('back')}">←</a>` : ''}
    <h1>${esc(title)}</h1>
    ${backHref ? '' : `<a class="icon-btn help-btn" href="#/help" aria-label="${t('help')}" title="${t('help')}">?</a>`}
    <button type="button" class="lang-btn" aria-label="${t('otherLangAria')}">${t('otherLang')}</button>
  </header>`;
}

function wireTopbar() {
  app.querySelector('.lang-btn')?.addEventListener('click', () => {
    setLang(getLang() === 'mr' ? 'en' : 'mr');
    route();
  });
}

// ───────────────────────── Home ─────────────────────────

async function renderHome() {
  const index = await fetchJSON('puzzles/index.json');
  const today = todayISO();
  const list = index.puzzles.filter((p) => p.date <= today).sort((a, b) => b.date.localeCompare(a.date));
  const [top, ...rest] = list;
  const settings = store.loadSettings();
  const sizeLabel = (p) => `${t('words', { n: p.words })} · ${t(p.size === 'large' ? 'large' : 'small')}`;
  const status = (s) => `<span class="status ${s}">${t('status.' + s)}</span>`;

  let html = topbar(t('appName')) + `<main class="home">`;
  if (!settings.seenHelp) html += `<p class="hint">${t('firstVisit')}</p>`;
  if (!top) {
    html += `<p class="muted">${t('noPuzzles')}</p>`;
  } else {
    const st = store.statusOf(top.id);
    const cta = st === 'solved' ? t('view') : st === 'progress' ? t('continue') : t('play');
    html += `<section class="today">
        <div class="eyebrow">${top.date === today ? t('todayPuzzle') : t('latestPuzzle')} · ${esc(date(top.date, { weekday: 'long', day: 'numeric', month: 'long' }))}</div>
        <h2 lang="mr">${esc(top.title)}</h2>
        <div class="meta">${sizeLabel(top)} · ${status(st)}</div>
        <a class="btn-primary" href="#/p/${encodeURIComponent(top.id)}">${cta}</a>
      </section>`;
    const streak = store.streakAsOf(today);
    if (streak > 0) html += `<p class="streak">${t('streak', { n: streak })}</p>`;
    if (rest.length) {
      html += `<h3 class="section-title">${t('archive')}</h3><ul class="archive">${rest
        .map((p) => `<li><a href="#/p/${encodeURIComponent(p.id)}">
            <span class="a-date">${esc(date(p.date, { day: 'numeric', month: 'short' }))}</span>
            <span class="a-title"><span lang="mr">${esc(p.title)}</span><small>${sizeLabel(p)}</small></span>
            ${status(store.statusOf(p.id))}</a></li>`)
        .join('')}</ul>`;
    }
  }
  html += `<button type="button" class="btn-secondary install-btn" ${installPrompt ? '' : 'hidden'}>⬇ ${t('install')}</button>`;
  html += `</main>`;
  app.innerHTML = html;
  document.title = t('appName');
  wireTopbar();
  app.querySelector('.install-btn').addEventListener('click', async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice.catch(() => null);
    installPrompt = null;
    app.querySelector('.install-btn')?.setAttribute('hidden', '');
  });

  // Warm the offline cache: the latest puzzle and the next few days' puzzles.
  const soon = index.puzzles.filter((p) => p.date >= (top?.date ?? today) && p.date <= addDays(today, 3));
  const warm = () => soon.forEach((p) => fetch(`puzzles/${encodeURIComponent(p.id)}.json`).catch(() => {}));
  const sw = navigator.serviceWorker;
  if (sw?.controller) warm();
  else sw?.addEventListener('controllerchange', warm, { once: true }); // first visit: wait for the worker
}

// ───────────────────────── Help ─────────────────────────

function renderHelp() {
  const settings = store.loadSettings();
  if (!settings.seenHelp) {
    settings.seenHelp = true;
    store.saveSettings(settings);
  }
  app.innerHTML = topbar(t('help'), { backHref: '#/' }) +
    `<main class="home help">${helpHTML(getLang())}<a class="btn-primary" href="#/">${t('home')}</a></main>`;
  document.title = `${t('help')} · ${t('appName')}`;
  wireTopbar();
}

// ───────────────────────── Sheets & dialogs ─────────────────────────

/**
 * Bottom sheet or centred dialog. Pushes a history entry so Android's back button closes it
 * instead of leaving the puzzle.
 */
function openSheet(inner, { center = false } = {}) {
  const bd = document.createElement('div');
  bd.className = 'backdrop' + (center ? ' center' : '');
  bd.innerHTML = `<div class="${center ? 'dialog' : 'sheet'}" role="dialog" aria-modal="true">${inner}</div>`;
  let closed = false;
  const onPop = () => close(true);
  // Resolves once the sheet's history entry is gone, so a sheet opened next isn't closed by that back step.
  function close(fromBack = false) {
    if (closed) return Promise.resolve();
    closed = true;
    bd.remove();
    window.removeEventListener('popstate', onPop);
    if (fromBack || !history.state?.sheet) return Promise.resolve();
    return new Promise((done) => {
      window.addEventListener('popstate', () => done(), { once: true });
      history.back();
    });
  }
  bd.addEventListener('click', (ev) => {
    if (ev.target === bd || ev.target.closest('[data-close]')) close();
  });
  history.pushState({ sheet: true }, '');
  window.addEventListener('popstate', onPop);
  document.body.appendChild(bd);
  return { el: bd.firstElementChild, close };
}

// ───────────────────────── Play ─────────────────────────

const SENTINEL = '​'; // lets us detect backspace in an otherwise-empty system-keyboard input

async function renderPlay(id) {
  const data = await fetchJSON(`puzzles/${encodeURIComponent(id)}.json`);
  const pz = buildPuzzle(data);
  const settings = store.loadSettings();
  const prog = store.loadProgress(id);

  const S = {
    fills: new Map(Object.entries(prog.fills).map(([k, v]) => [Number(k), v])),
    revealed: new Set(prog.revealed),
    verified: new Set(prog.verified),
    wrong: new Set(prog.wrong),
    near: new Set(prog.near), // close-enough squares: yellow mark
    elapsed: prog.elapsed || 0,
    solved: !!prog.solved,
    solvedAt: prog.solvedAt,
    assisted: !!prog.assisted,
    cell: null,
    dir: 'across',
    composing: false,
    paused: false,
    cellSize: 36,
  };

  document.title = `${pz.title} · ${t('appName')}`;
  app.innerHTML = `
    <div class="play ${settings.input === 'system' ? 'sys' : ''}">
      <header class="playbar">
        <a class="icon-btn" href="#/" aria-label="${t('home')}">←</a>
        <div class="title" lang="mr">${esc(pz.title)}</div>
        <button type="button" class="timer" aria-label="${t('pause')}"></button>
        <button type="button" class="submit-btn" disabled></button>
        <button type="button" class="icon-btn kbd-toggle" aria-label="${t('switchKeyboard')}" title="${t('switchKeyboard')}">⌨</button>
        <button type="button" class="icon-btn menu-btn" aria-label="${t('options')}">⋮</button>
      </header>
      <div class="grid-wrap"><div class="grid" role="grid" lang="mr"></div>
        <div class="pause-overlay"><p>${t('paused')}</p><button type="button" class="btn-primary resume">${t('resume')}</button></div>
      </div>
      <div class="cluebar">
        <button type="button" class="nav prev" aria-label="${t('prevClue')}">‹</button>
        <button type="button" class="clue-text"></button>
        <button type="button" class="nav next" aria-label="${t('nextClue')}">›</button>
      </div>
      <div class="kbd"></div>
      <input class="sysin" type="text" lang="mr" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-label="${t('answerInput')}">
    </div>`;

  const root = app.querySelector('.play');
  const gridEl = root.querySelector('.grid');
  const wrap = root.querySelector('.grid-wrap');
  const timerEl = root.querySelector('.timer');
  const clueEl = root.querySelector('.clue-text');
  const sysIn = root.querySelector('.sysin');
  const submitEl = root.querySelector('.submit-btn');

  // Grid squares
  gridEl.style.setProperty('--cols', pz.cols);
  gridEl.style.setProperty('--rows', pz.rows);
  const cellEls = [];
  const frag = document.createDocumentFragment();
  for (let i = 0; i < pz.rows * pz.cols; i++) {
    const c = pz.cells[i];
    const d = document.createElement('div');
    if (c) {
      d.className = 'cell';
      d.dataset.i = i;
      d.innerHTML = `${c.num ? `<span class="num">${num(c.num)}</span>` : ''}<span class="ch"></span>`;
    } else {
      d.className = 'void';
    }
    cellEls.push(d);
    frag.appendChild(d);
  }
  gridEl.appendChild(frag);

  // ── helpers
  const isLocked = (i) => S.solved || S.revealed.has(i) || S.verified.has(i);
  const currentEntry = () => {
    const c = pz.cells[S.cell];
    return pz.entries[c[S.dir] ?? c[other(S.dir)]];
  };
  const posIn = (e, i) => e.positions.indexOf(i);
  const entryState = (e, pos, composing) => ({
    values: e.positions.map((i) => S.fills.get(i) || ''),
    locked: e.positions.map(isLocked),
    pos,
    composing,
  });
  const firstEmptyPos = (e) => {
    let k = e.positions.findIndex((i) => !isLocked(i) && !S.fills.get(i));
    if (k === -1) k = e.positions.findIndex((i) => !isLocked(i));
    return Math.max(k, 0);
  };
  const nextEntry = (e, step = 1) => {
    const k = pz.ordered.indexOf(e);
    return pz.ordered[(k + step + pz.ordered.length) % pz.ordered.length];
  };
  const setFill = (i, v) => {
    if (v) S.fills.set(i, v);
    else S.fills.delete(i);
    S.wrong.delete(i);
    S.near.delete(i);
  };

  function persist() {
    store.saveProgress(id, {
      fills: Object.fromEntries(S.fills),
      revealed: [...S.revealed],
      verified: [...S.verified],
      wrong: [...S.wrong],
      near: [...S.near],
      elapsed: Math.round(S.elapsed),
      solved: S.solved,
      solvedAt: S.solvedAt,
      assisted: S.assisted,
    });
  }

  // ── rendering
  function update({ scroll = true } = {}) {
    const e = currentEntry();
    const word = new Set(e.positions);
    for (const i of pz.letterCells) {
      const el = cellEls[i];
      const v = S.fills.get(i) || '';
      const ch = el.lastChild;
      if (ch.textContent !== v) {
        ch.textContent = v;
        ch.dataset.len = Math.min(v.length, 5);
      }
      el.classList.toggle('sel', i === S.cell);
      el.classList.toggle('word', word.has(i));
      el.classList.toggle('wrong', S.wrong.has(i));
      el.classList.toggle('near', S.near.has(i));
      el.classList.toggle('revealed', S.revealed.has(i));
    }
    updateSubmit();
    clueEl.innerHTML = `<span class="clue-label">${num(e.num)} ${dirLabel(e.dir)}</span><span lang="mr">${esc(e.clue)}</span> <span class="clue-len">(${num(e.sol.length)})</span>`;
    if (scroll) cellEls[S.cell].scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  function select(i, dir) {
    const c = pz.cells[i];
    if (!c) return;
    if (dir && c[dir] != null) S.dir = dir;
    else if (c[S.dir] == null) S.dir = other(S.dir);
    S.cell = i;
    S.composing = false;
    sysReset();
    update();
  }

  const selectEntry = (e) => select(e.positions[firstEmptyPos(e)], e.dir);

  function toggleDir() {
    const c = pz.cells[S.cell];
    if (c[other(S.dir)] == null) return;
    S.dir = other(S.dir);
    S.composing = false;
    sysReset();
    update();
  }

  function applyResult(e, res) {
    res.values.forEach((v, k) => {
      const i = e.positions[k];
      if ((S.fills.get(i) || '') !== v) setFill(i, v);
    });
    S.cell = e.positions[res.pos];
    S.dir = e.dir;
    S.composing = res.composing;
  }

  function handleKey(key) {
    if (key === 'DIR') return toggleDir();
    if (S.solved || S.paused) return;
    let e = currentEntry();
    let res = typeKey(entryState(e, posIn(e, S.cell), S.composing), key);
    if (res.overflow === NEXT) return selectEntry(nextEntry(e));
    if (res.overflow) {
      e = nextEntry(e);
      res = typeKey(entryState(e, firstEmptyPos(e), false), res.overflow);
      if (res.overflow) return;
    }
    if (res.rejected) {
      navigator.vibrate?.(20);
      return;
    }
    applyResult(e, res);
    afterEdit();
  }

  function afterEdit() {
    persist();
    update();
  }

  // ── submit: enabled only once every square is filled; the answer is judged only on submit
  const filledCount = () => pz.letterCells.reduce((n, i) => n + (S.fills.get(i) ? 1 : 0), 0);

  function updateSubmit() {
    submitEl.hidden = S.solved;
    if (S.solved) return;
    const n = filledCount();
    const total = pz.letterCells.length;
    const full = n === total;
    if (full && submitEl.disabled) {
      // restart the pulse each time the grid becomes full
      submitEl.classList.remove('ready');
      void submitEl.offsetWidth;
      submitEl.classList.add('ready');
    }
    submitEl.disabled = !full;
    submitEl.textContent = full ? t('submit') : `${num(n)}/${num(total)}`;
    submitEl.setAttribute('aria-label', full ? t('submitLabel') : t('filledOf', { n, total }));
  }

  function submit() {
    if (S.solved || S.paused || filledCount() < pz.letterCells.length) return;
    const wrong = [];
    for (const i of pz.letterCells) {
      const v = S.fills.get(i);
      const sol = pz.cells[i].sol;
      if (v === sol) continue;
      if (isCloseEnough(v, sol)) S.near.add(i);
      else wrong.push(i);
    }
    if (!wrong.length) {
      // Close enough everywhere: show the right spelling, keeping the yellow mark.
      for (const i of S.near) S.fills.set(i, pz.cells[i].sol);
      return solve();
    }
    for (const i of wrong) S.wrong.add(i);
    S.composing = false;
    persist();
    update({ scroll: false });
    navigator.vibrate?.(60);
    toast(wrong.length === 1 ? t('submitWrongOne') : t('submitWrong', { n: wrong.length }));
  }

  function solve() {
    tick();
    S.solved = true;
    S.solvedAt = new Date().toISOString();
    S.composing = false;
    persist();
    update({ scroll: false });
    root.classList.add('solved');
    sysIn.blur();
    showSolved();
  }

  // ── finish screen
  function shareText() {
    return t('shareText', {
      app: t('appName'),
      date: date(id, { day: 'numeric', month: 'long', year: 'numeric' }),
      title: pz.title,
      time: time(S.elapsed),
      assisted: S.assisted ? t('shareAssisted') : '',
    }) + '\n' + location.href.replace(/#.*$/, '');
  }

  async function share() {
    const text = shareText();
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
    } catch (e) {
      if (e?.name === 'AbortError') return; // user closed the share sheet
    }
    try {
      await navigator.clipboard.writeText(text);
      toast(t('copied'));
    } catch {
      prompt('', text);
    }
  }

  function showSolved() {
    const today = todayISO();
    const streak = id === today ? store.streakAsOf(today) : 0;
    const { el } = openSheet(
      `<div class="solved-box">
        <div class="big">🎉</div>
        <h2>${t('congrats')}</h2>
        <p>${t('solvedIn', { time: time(S.elapsed) })}</p>
        ${S.assisted ? `<p class="muted">(${t('assisted')})</p>` : ''}
        ${S.near.size ? `<p class="slips">${S.near.size === 1 ? t('slipsOne') : t('slips', { n: S.near.size })}</p>` : ''}
        ${streak > 0 ? `<p class="streak">${t('streak', { n: streak })}</p>` : ''}
        ${id === today ? `<p class="muted">${t('comeTomorrow')}</p>` : ''}
        <button type="button" class="btn-primary share-btn">${t('share')}</button>
        <a class="btn-secondary" href="#/">${t('home')}</a>
        <button type="button" class="link-btn" data-close>${t('view')}</button>
      </div>`,
      { center: true },
    );
    el.querySelector('.share-btn').addEventListener('click', share);
  }

  // ── check & reveal
  function scopeCells(scope) {
    if (scope === 'cell') return [S.cell];
    if (scope === 'word') return currentEntry().positions;
    return pz.letterCells;
  }

  function check(scope) {
    let wrong = 0;
    let near = 0;
    let empty = 0;
    for (const i of scopeCells(scope)) {
      const v = S.fills.get(i);
      const sol = pz.cells[i].sol;
      if (!v) { empty++; continue; }
      if (v === sol) S.verified.add(i);
      else if (isCloseEnough(v, sol)) { S.near.add(i); near++; }
      else { S.wrong.add(i); wrong++; }
    }
    persist();
    update({ scroll: false });
    if (wrong) toast(wrong === 1 ? t('wrongCountOne') : t('wrongCount', { n: wrong }));
    else if (near) toast(near === 1 ? t('nearCountOne') : t('nearCount', { n: near }));
    else if (empty) toast(t('correctSoFar'));
    else toast(t('allCorrect'));
  }

  function reveal(scope) {
    if (scope === 'all' && !confirm(t('confirmRevealAll'))) return;
    for (const i of scopeCells(scope)) {
      const sol = pz.cells[i].sol;
      if (S.fills.get(i) === sol) { S.verified.add(i); continue; }
      S.fills.set(i, sol);
      S.revealed.add(i);
      S.wrong.delete(i);
      S.near.delete(i);
      S.assisted = true;
    }
    S.composing = false;
    afterEdit();
    if (scope === 'all') solve();
  }

  function reset() {
    if (!confirm(t('confirmReset'))) return;
    S.fills.clear();
    S.revealed.clear();
    S.verified.clear();
    S.wrong.clear();
    S.near.clear();
    S.elapsed = 0;
    S.solved = false;
    S.solvedAt = null;
    S.assisted = false;
    root.classList.remove('solved');
    persist();
    selectEntry(pz.ordered[0]);
    tick();
  }

  function openMenu() {
    const { el, close } = openSheet(`
      <div class="sheet-head"><h3>${t('options')}</h3><button type="button" class="icon-btn" data-close aria-label="${t('close')}">✕</button></div>
      <div class="menu">
        <p class="menu-label">${t('check')}</p>
        <div class="btn-row">
          <button type="button" data-act="check:cell">${t('square')}</button>
          <button type="button" data-act="check:word">${t('word')}</button>
          <button type="button" data-act="check:all">${t('puzzle')}</button>
        </div>
        <p class="menu-label">${t('reveal')}</p>
        <div class="btn-row">
          <button type="button" data-act="reveal:cell">${t('square')}</button>
          <button type="button" data-act="reveal:word">${t('word')}</button>
          <button type="button" data-act="reveal:all">${t('puzzle')}</button>
        </div>
        <div class="btn-row menu-foot">
          <button type="button" data-act="help">${t('help')}</button>
          <button type="button" class="danger" data-act="reset">${t('restart')}</button>
        </div>
      </div>`);
    el.addEventListener('click', async (ev) => {
      const b = ev.target.closest('[data-act]');
      if (!b) return;
      const [act, scope] = b.dataset.act.split(':');
      if (act === 'help') {
        // Replace the sheet's history entry with the help page so back returns to the puzzle.
        el.parentElement.remove();
        location.replace('#/help');
        return;
      }
      await close();
      if (S.solved && act !== 'reset') return toast(t('alreadySolved'));
      if (act === 'check') check(scope);
      else if (act === 'reveal') reveal(scope);
      else reset();
    });
  }

  function openClues() {
    let tab = currentEntry().dir;
    const { el, close } = openSheet(`
      <div class="sheet-head">
        <div class="tabs" role="tablist">
          <button type="button" role="tab" data-tab="across">${t('across')}</button>
          <button type="button" role="tab" data-tab="down">${t('down')}</button>
        </div>
        <button type="button" class="icon-btn" data-close aria-label="${t('close')}">✕</button>
      </div>
      <div class="clue-list" lang="mr"></div>`);
    const listEl = el.querySelector('.clue-list');
    const renderList = () => {
      const cur = currentEntry();
      el.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
      listEl.innerHTML = pz[tab]
        .map((e) => {
          const done = e.positions.every((i) => S.fills.get(i));
          return `<button type="button" class="clue-item${e === cur ? ' current' : ''}${done ? ' done' : ''}" data-idx="${e.idx}">
            <b>${num(e.num)}</b><span>${esc(e.clue)} <span class="clue-len">(${num(e.sol.length)})</span></span></button>`;
        })
        .join('');
      listEl.querySelector('.current')?.scrollIntoView({ block: 'center' });
    };
    el.addEventListener('click', (ev) => {
      const tb = ev.target.closest('[data-tab]');
      if (tb) { tab = tb.dataset.tab; renderList(); return; }
      const item = ev.target.closest('.clue-item');
      if (item) {
        close();
        selectEntry(pz.entries[Number(item.dataset.idx)]);
        sysFocus();
      }
    });
    renderList();
  }

  // ── timer
  let last = performance.now();
  let ticks = 0;
  const running = () => !S.solved && !S.paused && document.visibilityState === 'visible';
  function tick() {
    const now = performance.now();
    if (running()) S.elapsed += now - last;
    last = now;
    timerEl.textContent = time(S.elapsed);
    if (++ticks % 5 === 0 && running()) persist();
  }
  const timerId = setInterval(tick, 1000);
  const onVisibility = () => { tick(); persist(); };
  document.addEventListener('visibilitychange', onVisibility);

  function setPaused(p) {
    if (S.solved) return;
    tick();
    S.paused = p;
    root.classList.toggle('paused', p);
    timerEl.setAttribute('aria-label', p ? t('resume') : t('pause'));
    if (p) persist();
  }

  // ── system keyboard (Gboard etc.)
  let sys = null; // { start, orig: Map<pos, value> } for the current typing session

  function sysReset() {
    sys = null;
    if (sysIn.value !== SENTINEL) sysIn.value = SENTINEL;
  }

  function sysFocus() {
    if (settings.input !== 'system' || S.solved) return;
    sysReset();
    sysIn.focus({ preventScroll: true });
    try { sysIn.setSelectionRange(1, 1); } catch { /* not supported */ }
  }

  function sysBackspace() {
    const e = currentEntry();
    let k = posIn(e, S.cell);
    if (isLocked(S.cell) || !S.fills.get(S.cell)) {
      do k--; while (k >= 0 && isLocked(e.positions[k]));
      if (k < 0) return;
    }
    S.cell = e.positions[k];
    setFill(S.cell, '');
    afterEdit();
  }

  sysIn.addEventListener('input', () => {
    if (S.solved || S.paused) return sysReset();
    const v = sysIn.value;
    if (!v.startsWith(SENTINEL)) {
      sysReset();
      sysBackspace();
      return;
    }
    const e = currentEntry();
    if (!sys) sys = { start: posIn(e, S.cell), orig: new Map() };
    const aks = splitAksharas(v.slice(SENTINEL.length));
    const targets = [];
    for (let k = sys.start, j = 0; j < aks.length && k < e.positions.length; k++) {
      if (isLocked(e.positions[k])) continue;
      targets.push(k);
      j++;
    }
    // Restore squares this session touched that are no longer covered (user deleted text).
    for (const [k, val] of sys.orig) {
      if (!targets.includes(k)) { setFill(e.positions[k], val); sys.orig.delete(k); }
    }
    targets.forEach((k, j) => {
      const i = e.positions[k];
      if (!sys.orig.has(k)) sys.orig.set(k, S.fills.get(i) || '');
      setFill(i, aks[j]);
    });
    S.cell = e.positions[targets.length ? targets.at(-1) : sys.start];
    afterEdit();
  });

  sysIn.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      selectEntry(nextEntry(currentEntry()));
      sysFocus();
    }
  });

  function setInputMode(mode) {
    settings.input = mode;
    const s = store.loadSettings();
    s.input = mode;
    store.saveSettings(s);
    root.classList.toggle('sys', mode === 'system');
    if (mode === 'system') {
      sysFocus();
      toast(t('phoneKeyboard'));
    } else {
      sysIn.blur();
      toast(t('appKeyboard'));
    }
  }

  // ── pinch / ctrl-wheel zoom
  function setCellSize(px, focus) {
    const old = S.cellSize;
    S.cellSize = Math.round(Math.min(72, Math.max(22, px)));
    gridEl.style.setProperty('--cell', S.cellSize + 'px');
    if (focus && old !== S.cellSize) {
      const k = S.cellSize / old;
      wrap.scrollLeft = (wrap.scrollLeft + focus.x) * k - focus.x;
      wrap.scrollTop = (wrap.scrollTop + focus.y) * k - focus.y;
    }
  }

  function fitCells() {
    const fitW = (wrap.clientWidth - 16) / pz.cols - 2;
    const fitH = (wrap.clientHeight - 16) / pz.rows - 2;
    setCellSize(Math.min(52, Math.max(26, Math.min(fitW, fitH))));
  }

  let pinch = null;
  const dist = (tt) => Math.hypot(tt[0].clientX - tt[1].clientX, tt[0].clientY - tt[1].clientY);
  const focusPoint = (tt) => {
    const r = wrap.getBoundingClientRect();
    return { x: (tt[0].clientX + tt[1].clientX) / 2 - r.left, y: (tt[0].clientY + tt[1].clientY) / 2 - r.top };
  };
  wrap.addEventListener('touchstart', (ev) => {
    if (ev.touches.length === 2) pinch = { d: dist(ev.touches), size: S.cellSize };
  }, { passive: true });
  wrap.addEventListener('touchmove', (ev) => {
    if (!pinch || ev.touches.length !== 2) return;
    ev.preventDefault();
    setCellSize(pinch.size * (dist(ev.touches) / pinch.d), focusPoint(ev.touches));
  }, { passive: false });
  wrap.addEventListener('touchend', (ev) => { if (ev.touches.length < 2) pinch = null; });
  wrap.addEventListener('wheel', (ev) => {
    if (!ev.ctrlKey) return;
    ev.preventDefault();
    const r = wrap.getBoundingClientRect();
    setCellSize(S.cellSize * (ev.deltaY < 0 ? 1.1 : 0.9), { x: ev.clientX - r.left, y: ev.clientY - r.top });
  }, { passive: false });

  // ── physical keyboard (desktop, or a Marathi IME on a computer)
  function moveArrow(key) {
    const [dr, dc] = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[key];
    const dir = dr ? 'down' : 'across';
    let r = pz.cells[S.cell].r + dr;
    let c = pz.cells[S.cell].c + dc;
    while (r >= 0 && c >= 0 && r < pz.rows && c < pz.cols) {
      const i = r * pz.cols + c;
      if (pz.cells[i]) return select(i, dir);
      r += dr;
      c += dc;
    }
  }

  function onKeydown(ev) {
    if (document.querySelector('.backdrop') || ev.target === sysIn) return;
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const k = ev.key;
    if (k === 'Backspace') handleKey(BACKSPACE);
    else if (k.startsWith('Arrow')) moveArrow(k);
    else if (k === 'Tab' || k === 'Enter') selectEntry(nextEntry(currentEntry(), ev.shiftKey ? -1 : 1));
    else if (k === ' ') toggleDir();
    else if (/^[ऀ-ॿ‌‍]+$/.test(k)) { for (const ch of k) handleKey(ch); }
    else return;
    ev.preventDefault();
  }
  document.addEventListener('keydown', onKeydown);

  // ── wiring
  gridEl.addEventListener('click', (ev) => {
    const el = ev.target.closest('.cell');
    if (!el) return;
    const i = Number(el.dataset.i);
    if (i === S.cell) toggleDir();
    else select(i);
    sysFocus();
  });
  root.querySelector('.prev').addEventListener('click', () => { selectEntry(nextEntry(currentEntry(), -1)); sysFocus(); });
  root.querySelector('.next').addEventListener('click', () => { selectEntry(nextEntry(currentEntry(), 1)); sysFocus(); });
  clueEl.addEventListener('click', openClues);
  root.querySelector('.menu-btn').addEventListener('click', openMenu);
  root.querySelector('.kbd-toggle').addEventListener('click', () => setInputMode(settings.input === 'system' ? 'custom' : 'system'));
  timerEl.addEventListener('click', () => setPaused(!S.paused));
  submitEl.addEventListener('click', submit);
  root.querySelector('.resume').addEventListener('click', () => setPaused(false));
  createKeyboard(root.querySelector('.kbd'), handleKey, { next: t('nextKey'), dir: t('dirKey'), backspace: t('backspaceKey') });

  // ── start
  if (S.solved) root.classList.add('solved');
  sysIn.value = SENTINEL;
  fitCells();
  S.cell = pz.ordered[0].positions[0];
  S.dir = pz.ordered[0].dir;
  if (!S.solved) {
    const firstOpen = pz.ordered.find((e) => e.positions.some((i) => !S.fills.get(i)));
    if (firstOpen) { S.cell = firstOpen.positions[firstEmptyPos(firstOpen)]; S.dir = firstOpen.dir; }
  }
  update();
  tick();

  return () => {
    tick();
    persist();
    clearInterval(timerId);
    document.removeEventListener('visibilitychange', onVisibility);
    document.removeEventListener('keydown', onKeydown);
  };
}
