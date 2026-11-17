// Custom on-screen Marathi keyboard.
import { charType } from './akshara.js';
import { BACKSPACE, NEXT } from './input.js';

const MATRAS = ['ा', 'ि', 'ी', 'ु', 'ू', 'े', 'ै', 'ो', 'ौ', 'ं'];

const CONSONANTS = [
  ['क', 'ख', 'ग', 'घ', 'ङ', 'च', 'छ', 'ज', 'झ', 'ञ'],
  ['ट', 'ठ', 'ड', 'ढ', 'ण', 'त', 'थ', 'द', 'ध', 'न'],
  ['प', 'फ', 'ब', 'भ', 'म', 'य', 'र', 'ल', 'व', 'श'],
  ['ष', 'स', 'ह', 'ळ', 'क्ष', 'ज्ञ', '्', 'ृ', 'ँ', 'ः'],
];

const VOWELS = [
  ['अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ए', 'ऐ', 'ओ', 'औ'],
  ['ऋ', 'ॲ', 'ऑ', 'ॅ', 'ॉ', '्', 'ृ', 'ँ', 'ः', 'ऱ'], // ऱ as in कुऱ्हाड, वऱ्हाड
  ['त्र', 'श्र', 'द्ध', 'स्त', 'प्र', 'द्य', 'न्य', 'ष्ट', 'स्थ', 'क्र'],
  ['ग्र', 'ध्य', 'त्त', 'ल्ल', 'च्च', 'म्ह', 'न्ह', 'ल्ह', 'व्ह', 'त्य'],
];

const DOTTED_CIRCLE = '◌';

function keyHTML(k) {
  const t = charType(k[0]);
  const combining = t === 'matra' || t === 'sign' || t === 'virama' || t === 'nukta';
  const label = combining ? DOTTED_CIRCLE + k : k;
  const cls = 'key' + (combining ? ' mod' : '') + (!combining && k.length > 1 ? ' sm' : '');
  return `<button type="button" class="${cls}" data-key="${k}" aria-label="${k}">${label}</button>`;
}

/**
 * @param {HTMLElement} root
 * @param {(key: string) => void} onKey  receives a character, BACKSPACE, NEXT or 'DIR'
 * @param {{next: string, dir: string, backspace: string}} labels  UI-language labels
 */
export function createKeyboard(root, onKey, labels) {
  let layer = 'cons';

  const render = () => {
    const rows = [MATRAS, ...(layer === 'cons' ? CONSONANTS : VOWELS)];
      root.setAttribute('lang', 'mr');
    root.innerHTML =
      rows.map((r) => `<div class="krow">${r.map(keyHTML).join('')}</div>`).join('') +
      `<div class="krow">
        <button type="button" class="key alt wide" data-cmd="LAYER">${layer === 'cons' ? 'अ आ इ' : 'क ख ग'}</button>
        <button type="button" class="key alt" data-cmd="DIR" aria-label="${labels.dir}">⇅</button>
        <button type="button" class="key alt wide" data-cmd="${BACKSPACE}" aria-label="${labels.backspace}">⌫</button>
        <button type="button" class="key alt wider" data-cmd="${NEXT}">${labels.next}</button>
      </div>`;
  };

  root.addEventListener('click', (ev) => {
    const b = ev.target.closest('button.key');
    if (!b) return;
    if (b.dataset.cmd === 'LAYER') {
      layer = layer === 'cons' ? 'vow' : 'cons';
      render();
      return;
    }
    onKey(b.dataset.cmd ?? b.dataset.key);
  });

  render();
}
