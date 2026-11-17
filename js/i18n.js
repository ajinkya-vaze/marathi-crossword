// UI language: Marathi (default) or English. Puzzle content (clues, titles) is always Marathi.
import * as store from './storage.js';

const DEV_DIGITS = '०१२३४५६७८९';

const STRINGS = {
  mr: {
    appName: 'मराठी शब्दकोडे',
    help: 'कसे खेळावे',
    otherLang: 'English',
    otherLangAria: 'Switch to English',
    install: 'ॲप इन्स्टॉल करा',
    todayPuzzle: 'आजचे कोडे',
    latestPuzzle: 'नवीनतम कोडे',
    words: '{n} शब्द',
    small: 'लहान कोडे',
    large: 'मोठे कोडे',
    'status.new': 'नवीन',
    'status.progress': 'सुरू आहे',
    'status.solved': 'सोडवले ✓',
    play: 'खेळा',
    continue: 'पुढे सुरू ठेवा',
    view: 'कोडे पाहा',
    streak: '🔥 सलग {n} दिवस कोडे सोडवले',
    archive: 'जुनी कोडी',
    noPuzzles: 'अजून कोडी उपलब्ध नाहीत.',
    firstVisit: 'पहिल्यांदाच खेळताय? आधी <a href="#/help">कसे खेळावे</a> ते पाहा.',
    loadError: 'कोडे उघडता आले नाही.',
    offlineError: 'इंटरनेट नसल्यामुळे हे कोडे उघडता आले नाही. एकदा उघडलेली कोडी इंटरनेटशिवायही खेळता येतात.',
    home: 'मुख्य पान',
    back: 'मागे',
    across: 'आडवे',
    down: 'उभे',
    pause: 'वेळ थांबवा',
    resume: 'पुढे सुरू करा',
    paused: 'खेळ थांबवला आहे',
    switchKeyboard: 'कीबोर्ड बदला',
    options: 'पर्याय',
    close: 'बंद करा',
    prevClue: 'मागील सूचक',
    nextClue: 'पुढील सूचक',
    answerInput: 'उत्तर लिहा',
    check: 'तपासा',
    reveal: 'उत्तर दाखवा',
    square: 'अक्षर',
    word: 'शब्द',
    puzzle: 'पूर्ण कोडे',
    restart: 'पुन्हा सुरुवात करा',
    confirmRevealAll: 'पूर्ण कोड्याची उत्तरे दाखवायची?',
    confirmReset: 'हे कोडे पुन्हा सुरुवातीपासून सोडवायचे? सर्व उत्तरे पुसली जातील.',
    wrongCount: '{n} चौकटी चुकीच्या आहेत.',
    wrongCountOne: 'एक चौकट चुकीची आहे.',
    nearCount: '{n} चौकटींमध्ये किरकोळ चूक आहे (पिवळी खूण), पण ती चालेल.',
    nearCountOne: 'एका चौकटीत किरकोळ चूक आहे (पिवळी खूण), पण ती चालेल.',
    nearAlso: '{n} चौकटींमध्ये किरकोळ चूक (पिवळी खूण).',
    nearAlsoOne: 'एका चौकटीत किरकोळ चूक (पिवळी खूण).',
    slips: '{n} चौकटींमध्ये किरकोळ चूक होती. पिवळ्या खुणेच्या चौकटीत योग्य लेखन पाहा.',
    slipsOne: 'एका चौकटीत किरकोळ चूक होती. पिवळ्या खुणेच्या चौकटीत योग्य लेखन पाहा.',
    correctSoFar: 'आतापर्यंत भरलेले सर्व बरोबर आहे!',
    allCorrect: 'सर्व बरोबर!',
    alreadySolved: 'कोडे आधीच सोडवले आहे.',
    submit: 'सबमिट',
    submitLabel: 'उत्तरे सबमिट करा',
    filledOf: '{total} पैकी {n} चौकटी भरल्या',
    submitWrong: '{n} चौकटी चुकीच्या आहेत. त्या दुरुस्त करून पुन्हा सबमिट करा.',
    submitWrongOne: 'एक चौकट चुकीची आहे. ती दुरुस्त करून पुन्हा सबमिट करा.',
    phoneKeyboard: 'फोनचा कीबोर्ड वापरत आहात. मराठी कीबोर्ड निवडा.',
    appKeyboard: 'ॲपचा मराठी कीबोर्ड वापरत आहात.',
    congrats: 'अभिनंदन!',
    solvedIn: 'तुम्ही हे कोडे <b>{time}</b> मध्ये सोडवले.',
    assisted: 'काही उत्तरे दाखवण्याची मदत घेतली',
    comeTomorrow: 'उद्या नवीन कोडे येईल.',
    share: 'शेअर करा',
    copied: 'निकाल कॉपी केला — कुठेही पेस्ट करा.',
    shareText: '{app} · {date}\n{title}\n⏱ {time}{assisted}',
    shareAssisted: ' (मदत घेऊन)',
    nextKey: 'पुढे →',
    dirKey: 'दिशा बदला',
    backspaceKey: 'खोडा',
  },
  en: {
    appName: 'Marathi Crossword',
    help: 'How to play',
    otherLang: 'मराठी',
    otherLangAria: 'मराठीत पाहा',
    install: 'Install app',
    todayPuzzle: "Today's puzzle",
    latestPuzzle: 'Latest puzzle',
    words: '{n} words',
    small: 'small',
    large: 'large',
    'status.new': 'New',
    'status.progress': 'In progress',
    'status.solved': 'Solved ✓',
    play: 'Play',
    continue: 'Continue',
    view: 'View puzzle',
    streak: '🔥 {n}-day solving streak',
    archive: 'Past puzzles',
    noPuzzles: 'No puzzles yet.',
    firstVisit: 'New here? Read <a href="#/help">how to play</a> first.',
    loadError: "Couldn't open the puzzle.",
    offlineError: "You're offline and this puzzle hasn't been opened before. Puzzles you've opened once work offline.",
    home: 'Home',
    back: 'Back',
    across: 'Across',
    down: 'Down',
    pause: 'Pause timer',
    resume: 'Resume',
    paused: 'Paused',
    switchKeyboard: 'Switch keyboard',
    options: 'Options',
    close: 'Close',
    prevClue: 'Previous clue',
    nextClue: 'Next clue',
    answerInput: 'Type answer',
    check: 'Check',
    reveal: 'Reveal',
    square: 'Square',
    word: 'Word',
    puzzle: 'Puzzle',
    restart: 'Start over',
    confirmRevealAll: 'Reveal the whole puzzle?',
    confirmReset: 'Start this puzzle over? All your answers will be cleared.',
    wrongCount: '{n} squares are wrong.',
    wrongCountOne: 'One square is wrong.',
    nearCount: '{n} squares have a small slip (yellow mark), but they count.',
    nearCountOne: 'One square has a small slip (yellow mark), but it counts.',
    nearAlso: '{n} have a small slip (yellow mark).',
    nearAlsoOne: 'One has a small slip (yellow mark).',
    slips: '{n} squares had a small slip. The yellow-marked squares show the right spelling.',
    slipsOne: 'One square had a small slip. The yellow-marked square shows the right spelling.',
    correctSoFar: 'Everything filled in so far is correct!',
    allCorrect: 'All correct!',
    alreadySolved: 'This puzzle is already solved.',
    submit: 'Submit',
    submitLabel: 'Submit your answers',
    filledOf: '{n} of {total} squares filled',
    submitWrong: '{n} squares are wrong. Fix them and submit again.',
    submitWrongOne: 'One square is wrong. Fix it and submit again.',
    phoneKeyboard: "Using your phone's keyboard. Pick a Marathi layout.",
    appKeyboard: "Using the app's Marathi keyboard.",
    congrats: 'Well done!',
    solvedIn: 'You solved this puzzle in <b>{time}</b>.',
    assisted: 'with some answers revealed',
    comeTomorrow: "Come back tomorrow for a new puzzle.",
    share: 'Share',
    copied: 'Result copied — paste it anywhere.',
    shareText: '{app} · {date}\n{title}\n⏱ {time}{assisted}',
    shareAssisted: ' (with help)',
    nextKey: 'Next →',
    dirKey: 'Change direction',
    backspaceKey: 'Delete',
  },
};

export const LANGS = Object.keys(STRINGS);

let lang = store.loadSettings().lang === 'en' ? 'en' : 'mr';

export const getLang = () => lang;

export function setLang(next) {
  lang = next === 'en' ? 'en' : 'mr';
  const s = store.loadSettings();
  s.lang = lang;
  store.saveSettings(s);
  document.documentElement.lang = lang;
}

/** Translate a key, filling {placeholders}. Numbers passed in vars are shown with the language's digits. */
export function t(key, vars = {}) {
  let s = STRINGS[lang][key] ?? STRINGS.mr[key] ?? key;
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, typeof v === 'number' ? num(v) : v);
  return s;
}

/** Digits in the UI language: 12 → "१२" in Marathi. */
export const num = (n) => (lang === 'mr' ? String(n).replace(/\d/g, (d) => DEV_DIGITS[d]) : String(n));

const pad = (n) => String(n).padStart(2, '0');

/** milliseconds → "४:०५" / "4:05" */
export function time(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return num(h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`);
}

export function date(iso, opts) {
  const [y, m, d] = iso.split('-').map(Number);
  try {
    return num(new Intl.DateTimeFormat(lang === 'mr' ? 'mr-IN' : 'en-IN', opts).format(new Date(y, m - 1, d)));
  } catch {
    return num(iso);
  }
}

/** For tests: both languages must define the same keys. */
export function missingKeys() {
  const all = new Set(LANGS.flatMap((l) => Object.keys(STRINGS[l])));
  return LANGS.flatMap((l) => [...all].filter((k) => !(k in STRINGS[l])).map((k) => `${l}:${k}`));
}

document.documentElement.lang = lang;
