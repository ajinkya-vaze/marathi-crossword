const pad = (n) => String(n).padStart(2, '0');

/** Local date as YYYY-MM-DD */
export function todayISO(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  return todayISO(new Date(y, m - 1, d + n));
}

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

let toastTimer = null;
export function toast(msg, ms = 2400) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = msg;
  // On the play screen, cover the clue bar for a moment so the message never hides grid squares.
  const bar = document.querySelector('.cluebar')?.getBoundingClientRect();
  const low = !!bar?.height;
  el.classList.toggle('low', low);
  el.style.bottom = low ? `${Math.round(document.documentElement.clientHeight - bar.bottom + 4)}px` : '';
  el.style.minHeight = low ? `${Math.round(bar.height - 8)}px` : '';
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

export function hideToast() {
  document.querySelector('.toast')?.classList.remove('show');
}
