const DEFAULT_PFP = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" fill="#f5e6ea"/><circle cx="48" cy="38" r="17" fill="#9c3452" fill-opacity="0.55"/><path d="M14 96c0-20 15-34 34-34s34 14 34 34z" fill="#9c3452" fill-opacity="0.55"/></svg>');
const CONTACT_ORDER = ['Mother', 'Father', 'Grandmother', 'Grandfather', 'Uncle', 'Aunt', 'Uncle 2', 'Aunt 2'];
const TOTAL_SCHOOL_DAYS = 40;
const FONT_SCALES = { small: 0.85, default: 1, large: 1.15 };
const POLL_INTERVAL = 60000;
const SHEET_TABS = ['Students', 'Teachers', 'Contacts', 'Attendance', 'Periods', 'Grades', 'Items'];
const REQUIRED = { Students: 'first_name', Teachers: 'name', Contacts: 'relation', Attendance: 'status', Periods: 'tier', Grades: 'letter', Items: 'max_score' };
const NUMERIC = {
  Students: ['id', 'grade', 'has_hifz'],
  Teachers: ['id'],
  Contacts: ['id', 'student_id'],
  Attendance: ['id', 'student_id'],
  Periods: ['id', 'period_no', 'teacher_id'],
  Grades: ['id', 'student_id', 'percent'],
  Items: ['id', 'student_id', 'score', 'max_score']
};
const SETTINGS_INDEX = [
  { label: 'Grade format', tab: 'general', id: 'gradeFormat', keys: 'fraction percentage letter score' },
  { label: 'View mode', tab: 'general', id: 'viewMode', keys: 'grid list layout' },
  { label: 'Density', tab: 'general', id: 'densityRange', keys: 'spacing compact comfortable padding gap slider' },
  { label: 'Show guardian contacts', tab: 'general', id: 'contactsToggle', keys: 'guardian contacts parents phone layout' },
  { label: 'Show attendance chart', tab: 'general', id: 'attendanceToggle', keys: 'attendance pie donut chart layout' },
  { label: 'Dark mode', tab: 'appearance', id: 'darkToggle', keys: 'dark night theme light' },
  { label: 'Follow system theme', tab: 'appearance', id: 'systemToggle', keys: 'system automatic auto theme os' },
  { label: 'Accent color', tab: 'appearance', id: 'accentSelect', keys: 'maroon gold blue green color' },
  { label: 'Corner radius', tab: 'appearance', id: 'radiusSelect', keys: 'sharp rounded pill corners' },
  { label: 'Font size', tab: 'appearance', id: 'fontSelect', keys: 'small default large text size' },
  { label: 'Font', tab: 'appearance', id: 'fontFamilySelect', keys: 'typeface dm sans inter lora roboto family' },
  { label: 'Background pattern', tab: 'appearance', id: 'patternToggle', keys: 'islamic geometric pattern background' },
  { label: 'Reduce motion', tab: 'appearance', id: 'motionToggle', keys: 'animation animations motion accessibility' },
  { label: 'Google Sheet Link', tab: 'advanced', id: 'sheetLink', keys: 'google sheets import data url connect' },
  { label: 'Import .xlsx', tab: 'advanced', id: 'xlsxBtn', keys: 'excel workbook import file upload' }
];

const DAY_START_MIN = 8 * 60;
const PERIOD_MIN = 40;
const PASS_MIN = 5;
const NUM_PERIODS = 9;

const store = {
  Students: [],
  Teachers: [],
  Contacts: [],
  Attendance: [],
  Periods: [],
  Grades: [],
  Items: []
};

let SHEET_ID = localStorage.getItem('sheetId') || '';
let SHEET_KIND = localStorage.getItem('sheetKind') || '';
let displayedHash = null;
let savedHash = null;
let students = [];
let allSubjects = [];
let studentSubjects = [];
let view = 'list';
let searchTerm = '';
let currentId = null;
let currentSubject = null;
let dirSubject = null;
let observer = null;
let swipeBusy = false;
let watchEl = null;
let endYear = null;
let magnet = null;
let paletteIdx = 0;
let paletteItems = [];
let fabData = { email: '', phone: '', code: '' };
let homeGrade = 'all';
let homeHifz = 'all';
let homeSort = 'name';
let dirGrade = 'all';
let dirLetter = 'all';
let dirPerf = 'all';
let dirSort = 'name';
let currentPeriod = 0;
let periodTimer = null;

const flag = (k, d) => {
  const v = localStorage.getItem(k);
  return v === null ? d : v === 'true';
};
const storedDensity = localStorage.getItem('densityValue');
let gradeFormat = localStorage.getItem('gradeFormat') || 'fraction';
let viewMode = localStorage.getItem('viewMode') || 'grid';
let densityValue = storedDensity === null ? 100 : Number(storedDensity);
let isDarkMode = flag('darkMode', false);
let systemTheme = flag('systemTheme', false);
let accent = localStorage.getItem('accent') || 'maroon';
let radius = localStorage.getItem('radius') || 'rounded';
let fontSize = localStorage.getItem('fontSize') || 'default';
let fontFamily = localStorage.getItem('fontFamily') || 'DM Sans';
let patternOn = flag('patternOn', false);
let reduceMotion = flag('reduceMotion', false);
let showContacts = flag('showContacts', true);
let showAttendance = flag('showAttendance', true);

const $ = id => document.getElementById(id);

function esc(v) {
  return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function gradeName(n) {
  n = Number(n);
  if (n === 1) return '1st grade';
  if (n === 2) return '2nd grade';
  if (n === 3) return '3rd grade';
  return `${n}th grade`;
}
function letterOf(p) {
  return p >= 97 ? 'A+' : p >= 93 ? 'A' : p >= 90 ? 'A-' : p >= 87 ? 'B+' : p >= 83 ? 'B' : p >= 80 ? 'B-' : p >= 77 ? 'C+' : p >= 73 ? 'C' : p >= 70 ? 'C-' : 'D';
}
function fmtScore(score, max) {
  const pct = max ? (score / max) * 100 : 0;
  if (gradeFormat === 'percentage') return `${Math.round(pct)}%`;
  if (gradeFormat === 'letter') return letterOf(pct);
  return `${score}/${max}`;
}
function shortDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function toast(msg) {
  const t = $('toast');
  t.innerHTML = `<span>${esc(msg)}</span><i class="toast-bar"></i>`;
  t.classList.remove('show');
  void t.offsetWidth;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 3000);
}
function save(key, value) {
  localStorage.setItem(key, String(value));
}
function applyDensity() {
  const root = document.documentElement;
  const t = densityValue / 100;
  const r = (a, b) => (a + (b - a) * t).toFixed(3) + 'rem';
  root.style.setProperty('--card-pad-y', r(0.375, 1));
  root.style.setProperty('--card-pad-x', r(0.625, 1.125));
  root.style.setProperty('--card-gap', r(0.5, 1));
  root.style.setProperty('--avatar', r(1.75, 3.25));
  root.style.setProperty('--col-min', r(12.5, 18.75));
  document.querySelectorAll('.student-grid').forEach(g => g.classList.toggle('tight', densityValue < 20));
}
function applyAppearance() {
  const root = document.documentElement;
  const dark = systemTheme ? window.matchMedia('(prefers-color-scheme: dark)').matches : isDarkMode;
  if (dark) root.setAttribute('data-theme', 'dark');
  else root.removeAttribute('data-theme');
  root.setAttribute('data-accent', accent);
  root.setAttribute('data-radius', radius);
  root.setAttribute('data-motion', reduceMotion ? 'reduce' : 'full');
  root.setAttribute('data-pattern', patternOn ? 'on' : 'off');
  root.style.setProperty('--font-scale', FONT_SCALES[fontSize] || 1);
  root.style.setProperty('--font-body', `'${fontFamily}', system-ui, sans-serif`);
  applyDensity();
  $('gradeFormat').value = gradeFormat;
  $('viewMode').value = viewMode;
  $('densityRange').value = densityValue;
  $('darkToggle').checked = dark;
  $('darkToggle').disabled = systemTheme;
  $('systemToggle').checked = systemTheme;
  $('accentSelect').value = accent;
  $('radiusSelect').value = radius;
  $('fontSelect').value = fontSize;
  $('fontFamilySelect').value = fontFamily;
  $('patternToggle').checked = patternOn;
  $('motionToggle').checked = reduceMotion;
  $('contactsToggle').checked = showContacts;
  $('attendanceToggle').checked = showAttendance;
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQ = false;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQ = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQ = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter(r => r.length > 1 || r[0] !== '');
}
function rowsToObjects(values) {
  if (!values.length) return [];
  const headers = values[0].map(h => String(h).trim());
  return values.slice(1).map(r => {
    const o = {};
    headers.forEach((h, i) => {
      o[h] = r[i] === undefined ? '' : r[i];
    });
    return o;
  });
}
function normalize(tab, rows) {
  const cols = NUMERIC[tab] || [];
  return rows.map(r => {
    cols.forEach(c => {
      const v = r[c];
      r[c] = v === '' || v == null ? 0 : Number(v);
    });
    return r;
  });
}
function dataFromRows(rowsByTab) {
  const next = {};
  SHEET_TABS.forEach(t => {
    const rows = rowsByTab[t];
    const ok = rows && rows.length && rows[0].map(h => String(h).trim()).includes(REQUIRED[t]);
    if (!ok) throw new Error('The ' + t + ' tab is missing or has the wrong columns.');
    next[t] = normalize(t, rowsToObjects(rows));
  });
  return next;
}
function adopt(next) {
  SHEET_TABS.forEach(t => {
    store[t] = next[t];
  });
}
function hashText(t) {
  let h = 5381;
  for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0;
  return String(h >>> 0) + ':' + t.length;
}
function hashAll(texts) {
  return SHEET_TABS.map(t => hashText(texts[t])).join('|');
}
function inferKind(id) {
  return String(id).startsWith('2PACX') ? 'published' : 'edit';
}
function extractSheetId(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  let m = s.match(/\/d\/e\/([a-zA-Z0-9_-]+)/);
  if (m) {
    SHEET_KIND = 'published';
    return m[1];
  }
  m = s.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m) {
    SHEET_KIND = 'edit';
    return m[1];
  }
  if (/^2PACX-[a-zA-Z0-9_-]+$/.test(s)) {
    SHEET_KIND = 'published';
    return s;
  }
  if (/^[a-zA-Z0-9_-]{20,}$/.test(s)) {
    SHEET_KIND = 'edit';
    return s;
  }
  return '';
}
function tabUrls(id, tab) {
  const kind = SHEET_KIND || inferKind(id);
  const s = encodeURIComponent(tab);
  return kind === 'published'
    ? [
        `https://docs.google.com/spreadsheets/d/e/${id}/gviz/tq?tqx=out:csv&sheet=${s}`,
        `https://docs.google.com/spreadsheets/d/e/${id}/pub?output=csv&sheet=${s}`
      ]
    : [`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${s}`];
}
async function fetchTabCsv(id, tab) {
  let last = null;
  for (const url of tabUrls(id, tab)) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      const text = await res.text();
      const head = text.slice(0, 400).toLowerCase();
      if (head.includes('<!doctype html') || head.includes('<html')) throw new Error('Google returned a login page — sheet is not public');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      if (!text.trim()) throw new Error('Empty response');
      return text;
    } catch (e) {
      last = e;
    }
  }
  throw new Error(`Tab "${tab}": ${last ? last.message : 'unknown error'}`);
}
async function fetchSheetTexts(id) {
  const results = await Promise.all(SHEET_TABS.map(async tab => {
    try {
      return { tab, text: await fetchTabCsv(id, tab) };
    } catch (e) {
      return { tab, error: e.message };
    }
  }));
  const failed = results.filter(r => r.error);
  if (failed.length) {
    if (failed.length === results.length && failed.every(r => /login|public/i.test(r.error))) {
      throw new Error('Sheet is not public. In Google Sheets: Share → Anyone with the link → Viewer.');
    }
    throw new Error(failed.map(r => r.error).join(' · '));
  }
  const texts = {};
  results.forEach(r => {
    texts[r.tab] = r.text;
  });
  return texts;
}
function parseTexts(texts) {
  const rows = {};
  SHEET_TABS.forEach(t => {
    rows[t] = parseCSV(texts[t]);
  });
  return rows;
}
function saveCache(rowsByTab, hash, id) {
  try {
    localStorage.setItem('sheetData', JSON.stringify(rowsByTab));
    localStorage.setItem('sheetHash', hash);
    if (id) localStorage.setItem('sheetId', id);
    else localStorage.removeItem('sheetId');
    if (SHEET_KIND) localStorage.setItem('sheetKind', SHEET_KIND);
  } catch (e) {
    localStorage.removeItem('sheetData');
    localStorage.removeItem('sheetHash');
    if (id) localStorage.setItem('sheetId', id);
  }
}
function loadCache() {
  try {
    const raw = localStorage.getItem('sheetData');
    const hash = localStorage.getItem('sheetHash');
    if (!raw || !hash) return null;
    return { data: dataFromRows(JSON.parse(raw)), hash: hash };
  } catch (e) {
    return null;
  }
}
async function loadFromSheet(id) {
  const kind = SHEET_KIND || inferKind(id);
  SHEET_KIND = kind;
  const texts = await fetchSheetTexts(id);
  const rows = parseTexts(texts);
  const next = dataFromRows(rows);
  const hash = hashAll(texts);
  adopt(next);
  saveCache(rows, hash, id);
  SHEET_ID = id;
  localStorage.setItem('sheetKind', kind);
  displayedHash = hash;
  savedHash = hash;
}
async function checkForUpdates() {
  if (!SHEET_ID) return;
  try {
    const texts = await fetchSheetTexts(SHEET_ID);
    const hash = hashAll(texts);
    if (hash === savedHash) return;
    const rows = parseTexts(texts);
    dataFromRows(rows);
    saveCache(rows, hash, SHEET_ID);
    savedHash = hash;
    $('updateBanner').hidden = false;
  } catch (err) {}
}
async function connectSheet(link) {
  SHEET_KIND = '';
  const id = extractSheetId(link);
  if (!id) {
    toast('Enter a valid Google Sheet link.');
    return;
  }
  toast('Connecting…');
  try {
    await loadFromSheet(id);
    closeSettings();
    finishBoot();
    toast('Connected to Google Sheets.');
  } catch (err) {
    toast(String(err.message || err));
  }
}
async function importXlsx(file) {
  try {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const rows = {};
    SHEET_TABS.forEach(t => {
      const ws = wb.Sheets[t];
      rows[t] = ws ? XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) : [];
    });
    const next = dataFromRows(rows);
    adopt(next);
    saveCache(rows, 'xlsx', '');
    SHEET_ID = '';
    SHEET_KIND = '';
    localStorage.removeItem('sheetKind');
    displayedHash = 'xlsx';
    savedHash = 'xlsx';
    closeSettings();
    finishBoot();
    toast('Data imported successfully!');
  } catch (err) {
    toast('Import failed: ' + err.message);
  } finally {
    $('xlsxInput').value = '';
  }
}

function computeCurrentPeriod(now = new Date()) {
  const day = now.getDay();
  if (day === 0 || day === 6) return 0;
  const mins = now.getHours() * 60 + now.getMinutes();
  const slot = PERIOD_MIN + PASS_MIN;
  const idx = Math.floor((mins - DAY_START_MIN) / slot) + 1;
  return idx < 1 || idx > NUM_PERIODS ? 0 : idx;
}
function tierForGrade(g) {
  return g <= 4 ? 'primary' : g <= 8 ? 'middle' : 'upper';
}
function subjectAtPeriod(tier, periodNo) {
  const row = store.Periods.find(p => p.tier === tier && Number(p.period_no) === Number(periodNo));
  return row ? row.subject : '';
}
function refreshCurrentPeriod() {
  const prev = currentPeriod;
  currentPeriod = computeCurrentPeriod();
  if (prev !== currentPeriod) rerenderLiveState();
  else rerenderLiveState();
}
function rerenderLiveState() {
  const label = currentPeriod ? `Period ${currentPeriod}` : 'Outside periods';
  const badge = $('periodBadge');
  if (badge) badge.textContent = label;
  const smart = $('smartBar');
  if (smart) {
    let existing = smart.querySelector('.sb-period');
    if (smart.classList.contains('show')) {
      if (!existing) {
        existing = document.createElement('span');
        existing.className = 'sb-period';
        smart.appendChild(existing);
      }
      existing.innerHTML = `<i class="fa-solid fa-clock"></i>${label}`;
    }
  }
  if (view === 'profile' && currentId != null) {
    document.querySelectorAll('#profileView .row[data-period]').forEach(row => {
      row.classList.toggle('lit', Number(row.dataset.period) === currentPeriod);
    });
  }
  if (view === 'gradesDir') renderDir();
}

function teacherMap() {
  const m = {};
  store.Teachers.forEach(t => {
    m[t.id] = t;
  });
  return m;
}
function dirRows() {
  return store.Grades.filter(g => g.subject === dirSubject).map(g => {
    const s = students.find(x => x.id === g.student_id);
    return s ? { id: s.id, first_name: s.first_name, last_name: s.last_name, grade: s.grade, email: s.email, letter: g.letter, percent: g.percent } : null;
  }).filter(Boolean);
}
function computeEndYear() {
  let d = new Date();
  let max = '';
  store.Items.forEach(it => {
    if (it.day > max) max = it.day;
  });
  if (max) d = new Date(max + 'T12:00:00');
  endYear = d.getFullYear() + (d.getMonth() >= 7 ? 1 : 0);
}
function initialNum(ch) {
  const c = String(ch || 'A').toUpperCase().charCodeAt(0);
  return ((((c - 65) % 9) + 9) % 9) + 1;
}
function studentCode(s) {
  const grad = endYear + 12 - s.grade;
  const join = endYear - 1 - (s.id % Math.max(1, s.grade));
  return '#' + String(grad).slice(-2) + initialNum(s.first_name[0]) + initialNum(s.last_name[0]) + String(join).slice(-2);
}
function gmailLink(email) {
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`;
}
function setActive(name) {
  $('navHome').classList.toggle('active', name === 'home');
  $('navDash').classList.toggle('active', name === 'dash');
  $('navGrades').classList.toggle('active', name === 'grades');
}
function checkSmart() {
  const bar = $('smartBar');
  if (!watchEl) {
    bar.classList.remove('show');
    return;
  }
  bar.classList.toggle('show', watchEl.getBoundingClientRect().bottom < $('topbar').getBoundingClientRect().bottom + 8);
}
function setSmart(html, el) {
  $('smartBar').innerHTML = html;
  const span = document.createElement('span');
  span.className = 'sb-period';
  span.innerHTML = `<i class="fa-solid fa-clock"></i>${currentPeriod ? 'Period ' + currentPeriod : 'Outside periods'}`;
  $('smartBar').appendChild(span);
  watchEl = el;
  checkSmart();
}
function navList() {
  if (view === 'profile') return { ids: students.map(s => s.id), cur: currentId };
  if (view === 'grades') return { ids: studentSubjects, cur: currentSubject };
  if (view === 'gradesDir') return { ids: allSubjects, cur: dirSubject };
  return null;
}
function updateEdges() {
  const n = navList();
  $('edgePrev').hidden = !n;
  $('edgeNext').hidden = !n;
  if (!n) return;
  const off = n.ids.length < 2;
  $('edgePrev').disabled = off;
  $('edgeNext').disabled = off;
}
function showView(name, title) {
  view = name;
  ['list', 'profile', 'grades', 'gradesDir'].forEach(v => {
    $(v + 'View').hidden = v !== name;
  });
  $('pageTitle').textContent = title;
  setActive(name === 'list' ? 'home' : name === 'profile' ? 'dash' : 'grades');
  $('topSearch').hidden = name === 'list';
  $('fab').hidden = name !== 'profile';
  $('fab').classList.remove('open');
  watchEl = null;
  $('smartBar').classList.remove('show');
  updateEdges();
  if (name === 'profile') rerenderLiveState();
}
function swipe(dir, fn) {
  if (reduceMotion) {
    fn();
    return;
  }
  swipeBusy = true;
  const el = $(view + 'View');
  el.classList.add(dir > 0 ? 'out-left' : 'out-right');
  setTimeout(() => {
    el.classList.remove('out-left', 'out-right');
    fn();
    const nv = $(view + 'View');
    nv.classList.add(dir > 0 ? 'in-right' : 'in-left');
    setTimeout(() => {
      nv.classList.remove('in-right', 'in-left');
      swipeBusy = false;
    }, 520);
  }, 220);
}
function navigate(dir) {
  const n = navList();
  if (!n || swipeBusy) return;
  const len = n.ids.length;
  if (len < 2) return;
  const i = (n.ids.indexOf(n.cur) + dir + len) % len;
  const target = n.ids[i];
  swipe(dir, () => {
    if (view === 'profile') openStudent(target);
    else if (view === 'grades') openGradesPage(currentId, target);
    else openGradesDir(target);
  });
}
function showEmpty() {
  students = [];
  allSubjects = [];
  buildSubnav();
  $('homeFilter').hidden = true;
  $('studentGrid').className = 'student-grid';
  $('studentGrid').innerHTML = '<div class="empty-state"><i class="fa-solid fa-circle-question"></i><h3>No data found</h3><div class="source-grid"><div class="source-card"><h4><i class="fa-solid fa-table"></i> Google Sheet Link</h4><input class="text-input" type="text" id="emptyLink" placeholder="https://docs.google.com/spreadsheets/d/..." autocomplete="off"><button class="btn" type="button" id="emptyConnect"><i class="fa-solid fa-plug"></i> Connect</button></div><div class="source-card drop-zone" id="dropZone"><h4><i class="fa-solid fa-file-excel"></i> Excel workbook</h4><span>Drop .xlsx here</span><button class="btn ghost" type="button" id="emptyPick"><i class="fa-solid fa-file-import"></i> Choose file</button></div></div></div>';
  showView('list', 'Students');
  $('emptyConnect').onclick = () => connectSheet($('emptyLink').value);
  $('emptyPick').onclick = () => $('xlsxInput').click();
  const dz = $('dropZone');
  dz.ondragover = e => {
    e.preventDefault();
    dz.classList.add('over');
  };
  dz.ondragleave = () => dz.classList.remove('over');
  dz.ondrop = e => {
    e.preventDefault();
    dz.classList.remove('over');
    const f = e.dataTransfer.files[0];
    if (f) importXlsx(f);
  };
}
function buildSubnav() {
  $('subnavList').innerHTML = allSubjects.map(s => `<button type="button" class="subnav-item" data-subject="${esc(s)}">${esc(s)}</button>`).join('');
}
function finishBoot() {
  students = store.Students.slice().sort((a, b) => a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name) || a.id - b.id);
  allSubjects = Array.from(new Set(store.Grades.map(g => g.subject))).sort();
  if (!students.length) {
    showEmpty();
    return;
  }
  computeEndYear();
  buildSubnav();
  goList();
}
function hideLoading() {
  const l = $('loadingScreen');
  l.classList.add('hide');
  setTimeout(() => {
    l.hidden = true;
  }, 500);
}
function gridClass() {
  return 'student-grid' + (viewMode === 'list' ? ' list-mode' : '') + (densityValue < 20 ? ' tight' : '');
}
function haystack(s) {
  return `${s.first_name} ${s.last_name} ${s.email} ${gradeName(s.grade)} ${s.grade} ${studentCode(s)}`.toLowerCase();
}
function matchTerm(s) {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return true;
  return haystack(s).includes(term);
}
function gradeOptions() {
  let out = '<option value="all">All grades</option>';
  for (let n = 1; n <= 12; n++) out += `<option value="${n}">${gradeName(n)}</option>`;
  return out;
}
function sortStudents(list, mode) {
  const byName = (a, b) => a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name);
  const arr = list.slice();
  if (mode === 'grade') arr.sort((a, b) => a.grade - b.grade || byName(a, b));
  else if (mode === 'id') arr.sort((a, b) => studentCode(a).localeCompare(studentCode(b)) || byName(a, b));
  else arr.sort(byName);
  return arr;
}
function syncSearch(v) {
  searchTerm = v;
  $('searchInput').value = v;
  $('homeSearch').value = v;
  rerenderCurrent();
}
function observeCards(grid) {
  if (observer) observer.disconnect();
  observer = new IntersectionObserver(entries => {
    let n = 0;
    entries.forEach(e => {
      const c = e.target;
      if (e.isIntersecting) {
        const d = n++ * 50;
        c.style.transitionDelay = d + 'ms';
        c.classList.add('in');
        setTimeout(() => {
          c.style.transitionDelay = '';
        }, 700 + d);
      } else {
        c.style.transitionDelay = '';
        c.classList.remove('in');
      }
    });
  }, { threshold: 0.05 });
  grid.querySelectorAll('.student-card').forEach(c => observer.observe(c));
}
function bindTilt(grid) {
  grid.addEventListener('mousemove', e => {
    if (reduceMotion) return;
    const c = e.target.closest('.student-card');
    if (!c || !c.classList.contains('in')) return;
    const r = c.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    c.classList.add('tilting');
    c.style.transform = `perspective(700px) rotateX(${(-py * 8).toFixed(2)}deg) rotateY(${(px * 8).toFixed(2)}deg) translateY(-2px) scale(1.015)`;
  });
  grid.addEventListener('mouseout', e => {
    const c = e.target.closest('.student-card');
    if (!c || c.contains(e.relatedTarget)) return;
    c.classList.remove('tilting');
    c.style.transform = '';
  });
}
function cardHtml(s, right, lit = false) {
  return `<button type="button" class="student-card popout${lit ? ' lit' : ''}" data-id="${s.id}"><img class="sc-avatar" src="${DEFAULT_PFP}" alt=""><div class="sc-text"><span class="sc-name">${esc(s.first_name)} ${esc(s.last_name)}</span><span class="sc-sub">${gradeName(s.grade)} · ${esc(s.email)}</span></div><span class="pill">${right}</span></button>`;
}
function goList() {
  currentId = null;
  currentSubject = null;
  if (!students.length) {
    showEmpty();
    return;
  }
  showView('list', 'Students');
  $('homeFilter').hidden = false;
  renderList();
}
function renderList() {
  const grid = $('studentGrid');
  grid.className = gridClass();
  const list = sortStudents(
    students.filter(matchTerm)
      .filter(s => homeGrade === 'all' || s.grade === Number(homeGrade))
      .filter(s => homeHifz === 'all' || (homeHifz === 'yes' ? !!s.has_hifz : !s.has_hifz)),
    homeSort
  );
  if (observer) observer.disconnect();
  if (!list.length) {
    grid.innerHTML = '<div class="empty-state"><i class="fa-solid fa-magnifying-glass"></i><h3>No matches</h3></div>';
    return;
  }
  grid.innerHTML = list.map(s => cardHtml(s, gradeName(s.grade))).join('');
  observeCards(grid);
}
function ring(segs, r, sw) {
  const C = 2 * Math.PI * r;
  const total = segs.reduce((a, s) => a + s.v, 0);
  let out = '<svg viewBox="0 0 42 42" class="ring">';
  if (!total) {
    out += `<circle cx="21" cy="21" r="${r}" fill="none" style="stroke:var(--line)" stroke-width="${sw}"/>`;
  } else {
    let cum = 0;
    segs.forEach(s => {
      if (!s.v) return;
      const len = (s.v / total) * C;
      out += `<circle cx="21" cy="21" r="${r}" fill="none" style="stroke:${s.color}" stroke-width="${sw}" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${C / 4 - cum}"/>`;
      cum += len;
    });
  }
  return out + '</svg>';
}
function legend(segs) {
  return '<div class="legend">' + segs.map(s => `<div class="legend-row"><span class="dot" style="background:${s.color}"></span>${s.label}<b>${s.v}</b></div>`).join('') + '</div>';
}
function wheel(grades) {
  const n = grades.length;
  if (!n) return '<svg class="wheel" viewBox="0 0 400 400"></svg>';
  const cx = 200, cy = 200, r1 = 82, r2 = 192;
  const step = 360 / n;
  const rad = a => (a * Math.PI) / 180;
  const pt = (r, a) => [(cx + r * Math.sin(rad(a))).toFixed(2), (cy - r * Math.cos(rad(a))).toFixed(2)];
  const total = grades.reduce((a, g) => a + Number(g.percent), 0) / n;
  let defs = '<mask id="wheelMask" maskUnits="userSpaceOnUse" x="-50" y="-50" width="500" height="500"><circle class="wheel-reveal" cx="200" cy="200" r="140" fill="none" stroke="#fff" stroke-width="280" pathLength="100" transform="rotate(-90 200 200)"/></mask>';
  let body = '';
  grades.forEach((g, i) => {
    const a1 = i * step + 0.6;
    const a2 = (i + 1) * step - 0.6;
    const mid = (a1 + a2) / 2;
    const large = a2 - a1 > 180 ? 1 : 0;
    const [x1, y1] = pt(r2, a1);
    const [x2, y2] = pt(r2, a2);
    const [x3, y3] = pt(r1, a2);
    const [x4, y4] = pt(r1, a1);
    const d = `M${x1} ${y1}A${r2} ${r2} 0 ${large} 1 ${x2} ${y2}L${x3} ${y3}A${r1} ${r1} 0 ${large} 0 ${x4} ${y4}Z`;
    const bottom = mid > 90 && mid < 270;
    const arc = (rc, fs, tag) => {
      const rr = bottom ? rc + fs * 0.35 : rc - fs * 0.35;
      const pad = 3;
      const [sx, sy] = pt(rr, bottom ? a2 - pad : a1 + pad);
      const [ex, ey] = pt(rr, bottom ? a1 + pad : a2 - pad);
      defs += `<path id="wp${i}${tag}" d="M${sx} ${sy}A${rr.toFixed(2)} ${rr.toFixed(2)} 0 ${large} ${bottom ? 0 : 1} ${ex} ${ey}"/>`;
    };
    arc(166, 14, 'n');
    arc(112, 24, 'l');
    const dx = (Math.sin(rad(mid)) * 9).toFixed(2);
    const dy = (-Math.cos(rad(mid)) * 9).toFixed(2);
    body += `<g class="slice" data-subject="${esc(g.subject)}" style="--dx:${dx}px;--dy:${dy}px"><path d="${d}" style="fill:var(--s${(i % 6) + 1})"/><text class="wt" font-size="14"><textPath href="#wp${i}n" startOffset="50%" text-anchor="middle">${esc(g.subject)}</textPath></text><text class="wt-letter" font-size="24"><textPath href="#wp${i}l" startOffset="50%" text-anchor="middle">${esc(g.letter)}</textPath></text></g>`;
  });
  const center = `<text class="wc-letter" x="200" y="204" text-anchor="middle" font-size="40">${letterOf(total)}</text><text class="wc-pct" x="200" y="228" text-anchor="middle" font-size="15">${total.toFixed(1)}%</text>`;
  return `<svg class="wheel" viewBox="0 0 400 400"><defs>${defs}</defs><g mask="url(#wheelMask)">${body}</g>${center}</svg>`;
}
function openStudent(id) {
  const s = students.find(x => x.id === id);
  if (!s) return;
  currentId = id;
  currentSubject = null;

  let absent = 0;
  let tardy = 0;
  store.Attendance.forEach(r => {
    if (r.student_id !== id) return;
    if (r.status === 'Absent') absent++;
    if (r.status === 'Tardy') tardy++;
  });
  const attended = Math.max(0, TOTAL_SCHOOL_DAYS - absent - tardy);
  const attSegs = [
    { label: 'Attended', v: attended, color: 'var(--green)' },
    { label: 'Tardy', v: tardy, color: 'var(--amber)' },
    { label: 'Absent', v: absent, color: 'var(--red)' }
  ];

  const tier = tierForGrade(s.grade);
  const tm = teacherMap();
  const planFor = t => store.Periods
    .filter(p => p.tier === t)
    .sort((a, b) => a.period_no - b.period_no)
    .map(p => ({
      period_no: p.period_no,
      subject: p.subject,
      name: (tm[p.teacher_id] || {}).name || '',
      role: (tm[p.teacher_id] || {}).role || ''
    }));
  let periods = planFor(tier);
  if (!periods.length) periods = planFor('upper');

  const schedule = periods.map(p => {
    const lit = Number(p.period_no) === currentPeriod ? ' lit' : '';
    return `<div class="row${p.role === 'Monitor' ? ' mute' : ''}${lit}" data-period="${p.period_no}"><span class="p-no">Period ${p.period_no}</span><span class="p-sub">${esc(p.subject)}</span><span class="p-t">${esc(p.name)}</span></div>`;
  }).join('');

  let hifzRow = '';
  if (s.has_hifz) {
    const qt = store.Teachers.find(t => t.subject === "Qur'an");
    hifzRow = `<div class="row hifz"><span class="p-no">Extra</span><span class="p-sub">Hifz · ${esc(s.hifz_level)}</span><span class="p-t">${esc(qt ? qt.name : '')}</span></div>`;
  }

  const contactMap = {};
  store.Contacts.filter(c => c.student_id === id).forEach(c => {
    contactMap[c.relation] = c;
  });
  const contacts = CONTACT_ORDER.map(rel => {
    const c = contactMap[rel];
    return c
      ? `<div class="contact"><small>${rel}</small><div><b>${esc(c.name)}</b><span>${esc(c.phone)}</span></div></div>`
      : `<div class="contact na"><small>${rel}</small><div><b>N/A</b></div></div>`;
  }).join('');
  const firstContact = CONTACT_ORDER.map(r => contactMap[r]).find(Boolean);
  const phone = firstContact ? firstContact.phone : 'N/A';

  const grades = store.Grades.filter(g => g.student_id === id).sort((a, b) => a.subject.localeCompare(b.subject));
  const code = studentCode(s);
  fabData = { email: s.email, phone: phone, code: code };

  const attCard = showAttendance
    ? `<div class="card popout g-att"><h3><i class="fa-solid fa-calendar-check"></i> Attendance</h3><div class="att-wrap">${ring(attSegs, 15.9155, 6)}${legend(attSegs)}</div></div>`
    : '';
  const contCard = showContacts
    ? `<div class="card popout g-cont"><h3><i class="fa-solid fa-people-roof"></i> Guardian contacts</h3>${contacts}</div>`
    : '';

  $('profileView').innerHTML = `
    <div class="detail-bar">
      <button type="button" class="back-btn" id="backList"><i class="fa-solid fa-arrow-left"></i> All students</button>
      <span class="count">${code}</span>
    </div>
    <div class="hero popout" id="hero">
      <img class="hero-avatar" src="${DEFAULT_PFP}" alt="">
      <div class="hero-info">
        <div class="name-row"><h2>${esc(s.first_name)} ${esc(s.last_name)}</h2><span class="sid">${code}</span></div>
        <div class="chips">
          <span class="chip">${gradeName(s.grade)}</span>
          ${s.has_hifz ? `<span class="chip gold"><i class="fa-solid fa-book-quran"></i> Hifz · ${esc(s.hifz_level)}</span>` : ''}
        </div>
      </div>
      <a class="email-pill" href="${gmailLink(s.email)}" target="_blank" rel="noopener"><i class="fa-regular fa-envelope"></i><span>${esc(s.email)}</span></a>
    </div>
    <div class="profile-grid${showAttendance ? '' : ' no-att'}${showContacts ? '' : ' no-cont'}">
      ${attCard}
      <div class="card popout g-wheel wheel-card">
        <h3><i class="fa-solid fa-chart-pie"></i> Grades</h3>
        ${wheel(grades)}
      </div>
      <div class="card popout g-addr">
        <h3><i class="fa-solid fa-location-dot"></i> Address</h3>
        <div class="addr-row"><span>Street</span><b>${esc(s.street)}</b></div>
        <div class="addr-row"><span>City</span><b>${esc(s.city)}</b></div>
        <div class="addr-row"><span>State · ZIP</span><b>${esc(s.state)} ${esc(s.zip)}</b></div>
        <div class="addr-row"><span>Country</span><b>United States</b></div>
      </div>
      <div class="card popout g-sched">
        <h3><i class="fa-solid fa-clock"></i> Daily schedule <span id="periodBadge" class="period-badge"></span></h3>
        ${schedule}${hifzRow}
      </div>
      ${contCard}
    </div>`;

  showView('profile', `${s.first_name} ${s.last_name}`);
  window.scrollTo(0, 0);
  setSmart(`<img src="${DEFAULT_PFP}" alt=""><strong>${esc(s.first_name)} ${esc(s.last_name)}</strong><span class="sb-id">${code}</span><span class="sb-mail"><i class="fa-regular fa-envelope"></i>${esc(s.email)}</span><span><i class="fa-solid fa-phone"></i>${esc(phone)}</span>`, $('hero'));

  $('backList').onclick = goList;
  $('profileView').querySelectorAll('.slice').forEach(g => {
    g.onclick = () => openGradesPage(id, g.dataset.subject);
  });
  refreshCurrentPeriod();
}
function refreshProfile() {
  if (view !== 'profile' || currentId == null) return;
  const y = window.scrollY;
  openStudent(currentId);
  window.scrollTo(0, y);
}
function niceStep(range, target) {
  const raw = range / target;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / mag;
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag;
}
function buildChart(holder, items) {
  const W = 900, H = 380, yW = 58, xH = 32;
  const pL = yW, pR = W, pB = H - xH;
  const pW = pR - pL, pH = pB;
  const n = items.length;
  const pcts = items.map(it => (it.score / it.max) * 100);
  const X0 = -1, X1 = n;
  const Y0 = Math.max(0, Math.floor((Math.min(...pcts) - 8) / 5) * 5);
  let Y1 = Math.min(110, Math.ceil((Math.max(...pcts) + 5) / 5) * 5);
  if (Y1 < Y0 + 10) Y1 = Y0 + 10;
  const MAXZ = 25;
  let vx0 = X0, vx1 = X1, vy0 = Y0, vy1 = Y1;
  let drag = null;

  holder.innerHTML = `<svg class="tv" viewBox="0 0 ${W} ${H}">
    <defs>
      <clipPath id="tvClipPlot"><rect x="${pL}" y="0" width="${pW}" height="${pH}"/></clipPath>
      <clipPath id="tvClipY"><rect x="0" y="0" width="${yW}" height="${pB}"/></clipPath>
      <clipPath id="tvClipX"><rect x="${pL}" y="${pB}" width="${pW}" height="${xH}"/></clipPath>
      <linearGradient id="tvArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#6b1e2e" stop-opacity="0.26"/><stop offset="100%" stop-color="#6b1e2e" stop-opacity="0"/></linearGradient>
    </defs>
    <rect x="${pL}" y="0" width="${pW}" height="${pH}" style="fill:var(--surface)"/>
    <g clip-path="url(#tvClipPlot)">
      <g id="tvGrid"></g>
      <path id="tvAreaPath" fill="url(#tvArea)"/>
      <path id="tvLine" class="line-path"/>
      <g id="tvDots"></g>
      <g id="tvTargets"></g>
    </g>
    <rect x="0" y="0" width="${yW}" height="${H}" style="fill:var(--surface-2)"/>
    <rect x="${pL}" y="${pB}" width="${pW}" height="${xH}" style="fill:var(--surface-2)"/>
    <line class="axis-line" x1="${pL}" x2="${pL}" y1="0" y2="${H}"/>
    <line class="axis-line" x1="0" x2="${W}" y1="${pB}" y2="${pB}"/>
    <g clip-path="url(#tvClipY)" id="tvYLabels"></g>
    <g clip-path="url(#tvClipX)" id="tvXLabels"></g>
  </svg>`;

  const svg = holder.querySelector('svg');
  const gridEl = svg.querySelector('#tvGrid');
  const yEl = svg.querySelector('#tvYLabels');
  const xEl = svg.querySelector('#tvXLabels');
  const lineEl = svg.querySelector('#tvLine');
  const areaEl = svg.querySelector('#tvAreaPath');
  const dotsEl = svg.querySelector('#tvDots');
  const targetsEl = svg.querySelector('#tvTargets');
  const tip = $('chartTooltip');

  dotsEl.innerHTML = items.map((it, i) => `<circle class="data-point" r="3.5" data-i="${i}" data-title="${esc(it.title)}" data-score="${it.score}/${it.max}" data-date="${shortDate(it.day)}" data-avg="${it.avg.toFixed(1)}"/>`).join('');
  targetsEl.innerHTML = items.map((it, i) => `<circle class="hover-target" r="10" data-i="${i}"/>`).join('');
  const dots = Array.from(dotsEl.children);
  const targets = Array.from(targetsEl.children);

  const sx = i => pL + ((i - vx0) / (vx1 - vx0)) * pW;
  const sy = p => pB - ((p - vy0) / (vy1 - vy0)) * pH;
  const ix = px => vx0 + ((px - pL) / pW) * (vx1 - vx0);
  const iy = py => vy0 + ((pB - py) / pH) * (vy1 - vy0);

  function clampView() {
    const w = vx1 - vx0;
    const h = vy1 - vy0;
    if (vx0 < X0) { vx0 = X0; vx1 = X0 + w; }
    if (vx1 > X1) { vx1 = X1; vx0 = X1 - w; }
    if (vy0 < Y0) { vy0 = Y0; vy1 = Y0 + h; }
    if (vy1 > Y1) { vy1 = Y1; vy0 = Y1 - h; }
  }
  function zoomAt(factor, ax, ay) {
    const full = X1 - X0;
    const cur = vx1 - vx0;
    const nw = Math.min(full, Math.max(full / MAXZ, cur / factor));
    const ratio = nw / cur;
    const nh = (vy1 - vy0) * ratio;
    vx0 = ax - (ax - vx0) * ratio;
    vx1 = vx0 + nw;
    vy0 = ay - (ay - vy0) * ratio;
    vy1 = vy0 + nh;
    clampView();
  }
  function render() {
    const ys = niceStep(vy1 - vy0, 6);
    const yt = [];
    for (let v = Math.ceil(vy0 / ys - 1e-9) * ys; v <= vy1 + 1e-9; v += ys) yt.push(+v.toFixed(4));
    const xs = Math.max(1, niceStep(vx1 - vx0, 8));
    const xt = [];
    for (let l = Math.ceil((vx0 + 1) / xs - 1e-9) * xs; l - 1 <= vx1 + 1e-9; l += xs) {
      if (l >= 1 && l <= n) xt.push(l);
    }
    gridEl.innerHTML = yt.map(v => `<line class="grid-line" x1="${pL}" x2="${pR}" y1="${sy(v).toFixed(1)}" y2="${sy(v).toFixed(1)}"/>`).join('') +
      xt.map(l => `<line class="grid-line" y1="0" y2="${pB}" x1="${sx(l - 1).toFixed(1)}" x2="${sx(l - 1).toFixed(1)}"/>`).join('');
    yEl.innerHTML = yt.map(v => `<text class="axis-text" font-size="11" x="${yW - 8}" y="${(sy(v) + 4).toFixed(1)}" text-anchor="end">${v}</text>`).join('');
    xEl.innerHTML = xt.map(l => `<text class="axis-text" font-size="11" x="${sx(l - 1).toFixed(1)}" y="${pB + 20}" text-anchor="middle">${l}</text>`).join('');
    let d = '';
    items.forEach((it, i) => {
      const x = sx(i);
      const y = sy(pcts[i]);
      d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
      dots[i].setAttribute('cx', x.toFixed(1));
      dots[i].setAttribute('cy', y.toFixed(1));
      targets[i].setAttribute('cx', x.toFixed(1));
      targets[i].setAttribute('cy', y.toFixed(1));
    });
    lineEl.setAttribute('d', d);
    areaEl.setAttribute('d', `${d}L${sx(n - 1).toFixed(1)} ${pB}L${sx(0).toFixed(1)} ${pB}Z`);
  }
  function toSvg(e) {
    const r = svg.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
  }
  function hideTip() {
    tip.classList.remove('show');
    dots.forEach(p => p.setAttribute('r', 3.5));
  }
  svg.addEventListener('wheel', e => {
    const p = toSvg(e);
    if (p.x < pL || p.y > pB) return;
    e.preventDefault();
    zoomAt(e.deltaY < 0 ? 1.18 : 1 / 1.18, ix(p.x), iy(p.y));
    render();
    hideTip();
  }, { passive: false });
  svg.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    const p = toSvg(e);
    if (p.x < pL || p.y > pB) return;
    drag = p;
    svg.setPointerCapture(e.pointerId);
    svg.classList.add('dragging');
    hideTip();
  });
  svg.addEventListener('pointermove', e => {
    if (!drag) return;
    const p = toSvg(e);
    const w = vx1 - vx0;
    const h = vy1 - vy0;
    vx0 -= ((p.x - drag.x) / pW) * w;
    vx1 = vx0 + w;
    vy0 += ((p.y - drag.y) / pH) * h;
    vy1 = vy0 + h;
    clampView();
    drag = p;
    render();
  });
  const endDrag = () => {
    drag = null;
    svg.classList.remove('dragging');
  };
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);
  svg.addEventListener('mouseover', e => {
    const t = e.target.closest('.hover-target');
    if (!t || drag) return;
    const p = dots[Number(t.dataset.i)];
    p.setAttribute('r', 7);
    tip.innerHTML = `<strong>${p.dataset.title}</strong><div class="tt-row"><span>Score</span><b>${p.dataset.score}</b></div><div class="tt-row"><span>Date</span><b>${p.dataset.date}</b></div><div class="tt-row tt-avg"><span>Class average</span><b>${p.dataset.avg}%</b></div>`;
    const rect = p.getBoundingClientRect();
    tip.style.left = rect.left + rect.width / 2 + window.scrollX + 'px';
    tip.style.top = rect.top + window.scrollY + 'px';
    tip.classList.add('show');
  });
  svg.addEventListener('mouseout', e => {
    if (e.target.closest('.hover-target')) hideTip();
  });
  render();
}
function openGradesPage(studentId, subject) {
  const s = students.find(x => x.id === studentId);
  if (!s) return;
  currentId = studentId;
  currentSubject = subject;
  studentSubjects = store.Grades.filter(g => g.student_id === studentId).map(g => g.subject).sort();
  const items = store.Items
    .filter(it => it.student_id === studentId && it.subject === subject)
    .map(it => ({ id: it.id, title: it.title, type: it.type, score: it.score, max: it.max_score, day: it.day }))
    .sort((a, b) => a.day.localeCompare(b.day) || a.id - b.id);
  const g = store.Grades.find(x => x.student_id === studentId && x.subject === subject) || { letter: '-', percent: 0 };

  const sums = {};
  store.Items.forEach(it => {
    if (it.subject !== subject) return;
    const k = it.title + '|' + it.day;
    const o = sums[k] || (sums[k] = { t: 0, n: 0 });
    o.t += it.max_score ? (it.score / it.max_score) * 100 : 0;
    o.n++;
  });
  items.forEach(it => {
    const o = sums[it.title + '|' + it.day];
    it.avg = o ? o.t / o.n : 0;
  });

  const counts = [0, 0, 0, 0];
  items.forEach(it => {
    const p = (it.score / it.max) * 100;
    if (p < 50) counts[0]++;
    else if (p < 70) counts[1]++;
    else if (p < 90) counts[2]++;
    else counts[3]++;
  });
  const distSegs = [
    { label: 'Below 50%', v: counts[0], color: 'var(--red)' },
    { label: '50-70%', v: counts[1], color: 'var(--amber)' },
    { label: '70-90%', v: counts[2], color: 'var(--blue)' },
    { label: 'Above 90%', v: counts[3], color: 'var(--green)' }
  ];

  const rows = items.slice().reverse().map(it => {
    const p = (it.score / it.max) * 100;
    const cls = p >= 90 ? ' good' : p < 70 ? ' bad' : '';
    return `<div class="assign-row"><span class="type-badge ${esc(it.type).toLowerCase()}">${esc(it.type)}</span><span class="a-title">${esc(it.title)}</span><span class="a-date">${shortDate(it.day)}</span><span class="a-score${cls}">${fmtScore(it.score, it.max)}</span></div>`;
  }).join('');

  $('gradesView').innerHTML = `
    <div class="detail-bar">
      <button type="button" class="back-btn" id="backProfile"><i class="fa-solid fa-arrow-left"></i> Back to Profile</button>
      <span class="big-subject">${esc(subject)}</span>
    </div>
    <div class="hero grades-hero popout" id="gHero">
      <div class="g-info"><h2>${esc(s.first_name)} ${esc(s.last_name)}</h2><span>${gradeName(s.grade)} · ${studentCode(s)}</span></div>
      <div class="g-badge"><b>${esc(g.letter)}</b><span>${Number(g.percent).toFixed(1)}%</span></div>
    </div>
    <div class="grades-grid">
      <div class="card full">
        <h3><i class="fa-solid fa-chart-line"></i> Progress Over Time</h3>
        <div id="chartHolder"></div>
      </div>
      <div class="card popout">
        <h3><i class="fa-solid fa-chart-pie"></i> Score Distribution</h3>
        <div class="pie-wrap">${ring(distSegs, 8, 16)}${legend(distSegs)}</div>
      </div>
      <div class="card popout">
        <h3><i class="fa-solid fa-list-check"></i> All Assignments</h3>
        <div class="assign-list">${rows}</div>
      </div>
    </div>`;

  showView('grades', `${s.first_name}'s ${subject}`);
  window.scrollTo(0, 0);
  setSmart(`<strong>${esc(subject)}</strong><span>${esc(s.first_name)} ${esc(s.last_name)}</span>`, $('gHero'));
  $('backProfile').onclick = () => openStudent(studentId);
  if (items.length) buildChart($('chartHolder'), items);
}
function openGradesDir(subject) {
  dirSubject = subject;
  const subjOpts = allSubjects.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('');
  $('gradesDirView').innerHTML = `<div class="intro"><h2>${esc(subject)}</h2></div>
    <div class="filter-bar">
      <select id="dirSubject">${subjOpts}</select>
      <select id="dirGradeSel">${gradeOptions()}</select>
      <select id="dirLetterSel"><option value="all">All letters</option><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option><option value="F">F</option></select>
      <select id="dirPerfSel"><option value="all">All ranges</option><option value="high">Above 90%</option><option value="mid">70% - 89%</option><option value="low">Below 70%</option></select>
      <span class="fb-sep"></span>
      <select id="dirSortSel"><option value="name">Sort: Last Name (A-Z)</option><option value="grade">Sort: Grade Level (Low to High)</option><option value="high">Sort: Highest Grade (100% - 0%)</option><option value="low">Sort: Lowest Grade (0% - 100%)</option></select>
    </div>
    <div id="dirGrid"></div>`;
  showView('gradesDir', subject);
  window.scrollTo(0, 0);
  $('dirSubject').value = subject;
  $('dirGradeSel').value = dirGrade;
  $('dirLetterSel').value = dirLetter;
  $('dirPerfSel').value = dirPerf;
  $('dirSortSel').value = dirSort;
  $('dirSubject').onchange = e => openGradesDir(e.target.value);
  $('dirGradeSel').onchange = e => { dirGrade = e.target.value; renderDir(); };
  $('dirLetterSel').onchange = e => { dirLetter = e.target.value; renderDir(); };
  $('dirPerfSel').onchange = e => { dirPerf = e.target.value; renderDir(); };
  $('dirSortSel').onchange = e => { dirSort = e.target.value; renderDir(); };
  $('dirGrid').onclick = e => {
    const c = e.target.closest('.student-card');
    if (c) openGradesPage(Number(c.dataset.id), dirSubject);
  };
  bindTilt($('dirGrid'));
  renderDir();
}
function inCurrentPeriodForTier(studentGrade) {
  if (!currentPeriod) return false;
  return subjectAtPeriod(tierForGrade(studentGrade), currentPeriod) === dirSubject;
}
function renderDir() {
  const grid = $('dirGrid');
  if (!grid) return;
  grid.className = gridClass();
  const byName = (a, b) => a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name);
  const rows = dirRows()
    .filter(matchTerm)
    .filter(r => dirGrade === 'all' || r.grade === Number(dirGrade))
    .filter(r => dirLetter === 'all' || String(r.letter).charAt(0) === dirLetter)
    .filter(r => {
      const p = Number(r.percent);
      return dirPerf === 'all' || (dirPerf === 'high' ? p >= 90 : dirPerf === 'mid' ? p >= 70 && p < 90 : p < 70);
    });
  rows.sort(
    dirSort === 'grade' ? (a, b) => a.grade - b.grade || byName(a, b)
    : dirSort === 'high' ? (a, b) => b.percent - a.percent || byName(a, b)
    : dirSort === 'low'  ? (a, b) => a.percent - b.percent || byName(a, b)
    : byName
  );
  if (observer) observer.disconnect();
  if (!rows.length) {
    grid.innerHTML = '<div class="empty-state"><i class="fa-solid fa-magnifying-glass"></i><h3>No matches</h3></div>';
    return;
  }
  grid.innerHTML = rows.map(r => {
    const lit = inCurrentPeriodForTier(r.grade);
    return cardHtml(r, `${esc(r.letter)} · ${Number(r.percent).toFixed(1)}%`, lit);
  }).join('');
  observeCards(grid);
}
function rerenderCurrent() {
  if (view === 'list' && students.length) renderList();
  else if (view === 'gradesDir') renderDir();
}
function openSettings() { $('overlay').hidden = false; }
function closeSettings() { $('overlay').hidden = true; }
function setTab(name) {
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x.dataset.tab === name));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + name));
}
function revealSetting(entry) {
  openSettings();
  setTab(entry.tab);
  setTimeout(() => {
    const el = $(entry.id);
    const box = el.closest('.field') || el.closest('.import-card') || el;
    box.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    box.classList.add('hl');
    setTimeout(() => box.classList.remove('hl'), 2200);
  }, 60);
}
function pageEntries() {
  const list = [
    { label: 'Home', sub: 'Page', icon: 'fa-house', run: goList },
    { label: 'Dashboards', sub: 'Page', icon: 'fa-chart-pie', run: () => { if (students.length) openStudent(students[0].id); } }
  ];
  allSubjects.forEach(s => list.push({ label: 'Grades · ' + s, sub: 'Page', icon: 'fa-graduation-cap', run: () => openGradesDir(s) }));
  return list;
}
function computePalette(raw) {
  let mode = 'all';
  let term = raw.trim().toLowerCase();
  if (term[0] === '@') { mode = 'people'; term = term.slice(1).trim(); }
  else if (term[0] === '?') { mode = 'settings'; term = term.slice(1).trim(); }
  const groups = [];
  if (mode === 'all') {
    const pages = pageEntries().filter(p => !term || p.label.toLowerCase().includes(term));
    if (pages.length) groups.push({ title: 'Pages', items: pages });
  }
  if ((mode === 'all' && term) || mode === 'people') {
    const people = students
      .filter(s => !term || haystack(s).includes(term))
      .slice(0, 8)
      .map(s => ({ label: `${s.first_name} ${s.last_name}`, sub: `${gradeName(s.grade)} · ${studentCode(s)}`, icon: 'fa-user', run: () => openStudent(s.id) }));
    if (people.length) groups.push({ title: 'People', items: people });
  }
  if ((mode === 'all' && term) || mode === 'settings') {
    const found = SETTINGS_INDEX
      .filter(x => !term || (x.label + ' ' + x.keys).toLowerCase().includes(term))
      .map(x => ({ label: x.label, sub: 'Setting', icon: 'fa-sliders', run: () => revealSetting(x) }));
    if (found.length) groups.push({ title: 'Settings', items: found });
  }
  return groups;
}
function renderPalette() {
  const groups = computePalette($('paletteInput').value);
  paletteItems = [];
  let html = '';
  groups.forEach(g => {
    html += `<div class="palette-group">${g.title}</div>`;
    g.items.forEach(it => {
      html += `<button type="button" class="palette-item${paletteItems.length === paletteIdx ? ' active' : ''}" data-i="${paletteItems.length}"><i class="fa-solid ${it.icon}"></i><span class="pi-label">${esc(it.label)}</span><span class="pi-sub">${esc(it.sub)}</span></button>`;
      paletteItems.push(it);
    });
  });
  if (!paletteItems.length) html = '<div class="palette-empty">No results</div>';
  $('paletteResults').innerHTML = html;
  const active = $('paletteResults').querySelector('.palette-item.active');
  if (active) active.scrollIntoView({ block: 'nearest' });
}
function openPalette() {
  $('palette').hidden = false;
  $('paletteInput').value = '';
  paletteIdx = 0;
  renderPalette();
  $('paletteInput').focus();
}
function closePalette() { $('palette').hidden = true; }
function runPalette(i) {
  const it = paletteItems[i];
  if (!it) return;
  closePalette();
  it.run();
}
function openShortcuts() { $('shortcuts').hidden = false; }
function closeShortcuts() { $('shortcuts').hidden = true; }
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (err) {
      ok = false;
    }
    document.body.removeChild(ta);
    return ok;
  }
}
function bindSetting(id, event, apply) {
  $(id).addEventListener(event, e => apply(e.target));
}
function bindEvents() {
  $('navHome').addEventListener('click', goList);
  $('navDash').addEventListener('click', () => { if (students.length) openStudent(students[0].id); });
  $('navGrades').addEventListener('click', () => {
    $('gradesSubMenu').classList.toggle('open');
    $('navGrades').classList.toggle('open');
  });
  $('navSettings').addEventListener('click', openSettings);
  $('settingsBtn').addEventListener('click', openSettings);
  $('settingsClose').addEventListener('click', closeSettings);
  $('overlay').addEventListener('click', e => { if (e.target === $('overlay')) closeSettings(); });
  $('helpBtn').addEventListener('click', openShortcuts);
  $('shortcutsClose').addEventListener('click', closeShortcuts);
  $('shortcuts').addEventListener('click', e => { if (e.target === $('shortcuts')) closeShortcuts(); });
  $('palette').addEventListener('click', e => { if (e.target === $('palette')) closePalette(); });

  $('subnavList').addEventListener('click', e => {
    const b = e.target.closest('.subnav-item');
    if (b) openGradesDir(b.dataset.subject);
  });

  document.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', () => setTab(t.dataset.tab));
  });

  $('studentGrid').addEventListener('click', e => {
    const c = e.target.closest('.student-card');
    if (c) openStudent(Number(c.dataset.id));
  });
  bindTilt($('studentGrid'));

  $('searchInput').addEventListener('input', e => syncSearch(e.target.value));
  $('searchInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      syncSearch(e.target.value);
      goList();
    }
  });
  $('homeSearch').addEventListener('input', e => syncSearch(e.target.value));
  $('homeGrade').innerHTML = gradeOptions();
  $('homeGrade').value = homeGrade;
  $('homeHifz').value = homeHifz;
  $('homeSort').value = homeSort;
  $('homeGrade').addEventListener('change', e => { homeGrade = e.target.value; renderList(); });
  $('homeHifz').addEventListener('change', e => { homeHifz = e.target.value; renderList(); });
  $('homeSort').addEventListener('change', e => { homeSort = e.target.value; renderList(); });

  bindSetting('gradeFormat', 'change', t => {
    gradeFormat = t.value;
    save('gradeFormat', gradeFormat);
    if (view === 'grades' && currentId != null && currentSubject) {
      const y = window.scrollY;
      openGradesPage(currentId, currentSubject);
      window.scrollTo(0, y);
    }
  });
  bindSetting('viewMode', 'change', t => {
    viewMode = t.value;
    save('viewMode', viewMode);
    rerenderCurrent();
  });
  bindSetting('densityRange', 'input', t => {
    densityValue = Number(t.value);
    save('densityValue', densityValue);
    applyDensity();
  });
  bindSetting('contactsToggle', 'change', t => {
    showContacts = t.checked;
    save('showContacts', showContacts);
    refreshProfile();
  });
  bindSetting('attendanceToggle', 'change', t => {
    showAttendance = t.checked;
    save('showAttendance', showAttendance);
    refreshProfile();
  });
  bindSetting('darkToggle', 'change', t => {
    isDarkMode = t.checked;
    save('darkMode', isDarkMode);
    applyAppearance();
  });
  bindSetting('systemToggle', 'change', t => {
    systemTheme = t.checked;
    save('systemTheme', systemTheme);
    applyAppearance();
  });
  bindSetting('accentSelect', 'change', t => {
    accent = t.value;
    save('accent', accent);
    applyAppearance();
  });
  bindSetting('radiusSelect', 'change', t => {
    radius = t.value;
    save('radius', radius);
    applyAppearance();
  });
  bindSetting('fontSelect', 'change', t => {
    fontSize = t.value;
    save('fontSize', fontSize);
    applyAppearance();
  });
  bindSetting('fontFamilySelect', 'change', t => {
    fontFamily = t.value;
    save('fontFamily', fontFamily);
    applyAppearance();
  });
  bindSetting('patternToggle', 'change', t => {
    patternOn = t.checked;
    save('patternOn', patternOn);
    applyAppearance();
  });
  bindSetting('motionToggle', 'change', t => {
    reduceMotion = t.checked;
    save('reduceMotion', reduceMotion);
    applyAppearance();
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (systemTheme) applyAppearance();
  });

  $('sheetLink').value = SHEET_ID
    ? (SHEET_KIND === 'published'
        ? `https://docs.google.com/spreadsheets/d/e/${SHEET_ID}/pubhtml`
        : `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`)
    : '';
  $('connectBtn').addEventListener('click', () => connectSheet($('sheetLink').value));
  $('xlsxBtn').addEventListener('click', () => $('xlsxInput').click());
  $('xlsxInput').addEventListener('change', e => {
    const f = e.target.files[0];
    if (f) importXlsx(f);
  });
  window.addEventListener('dragover', e => e.preventDefault());
  window.addEventListener('drop', e => e.preventDefault());

  $('fabMain').addEventListener('click', e => {
    e.stopPropagation();
    $('fab').classList.toggle('open');
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('#fab')) $('fab').classList.remove('open');
  });
  $('fabEmail').addEventListener('click', () => window.open(gmailLink(fabData.email), '_blank', 'noopener'));
  $('fabCall').addEventListener('click', () => {
    if (fabData.phone && fabData.phone !== 'N/A') window.location.href = 'tel:' + fabData.phone.replace(/[^0-9+]/g, '');
    else toast('No phone number on file.');
  });
  $('fabCopy').addEventListener('click', async () => {
    toast((await copyText(fabData.code)) ? 'Student ID copied.' : 'Could not copy the ID.');
  });

  $('paletteInput').addEventListener('input', () => {
    paletteIdx = 0;
    renderPalette();
  });
  $('paletteInput').addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (paletteItems.length) paletteIdx = (paletteIdx + 1) % paletteItems.length;
      renderPalette();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (paletteItems.length) paletteIdx = (paletteIdx - 1 + paletteItems.length) % paletteItems.length;
      renderPalette();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runPalette(paletteIdx);
    }
  });
  $('paletteResults').addEventListener('click', e => {
    const b = e.target.closest('.palette-item');
    if (b) runPalette(Number(b.dataset.i));
  });

  $('edgePrev').addEventListener('click', () => navigate(-1));
  $('edgeNext').addEventListener('click', () => navigate(1));
  window.addEventListener('scroll', checkSmart, { passive: true });
  window.addEventListener('resize', checkSmart);

  document.addEventListener('mousemove', e => {
    if (reduceMotion) return;
    const b = e.target.closest ? e.target.closest('.btn:not(.ghost)') : null;
    if (magnet && magnet !== b) {
      magnet.style.transform = '';
      magnet = null;
    }
    if (!b) return;
    magnet = b;
    const r = b.getBoundingClientRect();
    const dx = ((e.clientX - (r.left + r.width / 2)) / r.width) * 10;
    const dy = ((e.clientY - (r.top + r.height / 2)) / r.height) * 8;
    b.style.transform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) scale(1.03)`;
  });
  document.addEventListener('mouseout', e => {
    const b = e.target.closest ? e.target.closest('.btn') : null;
    if (b && !b.contains(e.relatedTarget)) {
      b.style.transform = '';
      if (magnet === b) magnet = null;
    }
  });

  document.addEventListener('keydown', e => {
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    const typing = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';
    if (e.key === 'Escape') {
      if (!$('palette').hidden) closePalette();
      else if (!$('shortcuts').hidden) closeShortcuts();
      else if (!$('overlay').hidden) closeSettings();
      return;
    }
    if (e.key === '\\' && !typing) {
      e.preventDefault();
      openPalette();
      return;
    }
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if (typing || !$('overlay').hidden || !$('palette').hidden || !$('shortcuts').hidden) return;
    navigate(e.key === 'ArrowLeft' ? -1 : 1);
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshCurrentPeriod();
  });

  periodTimer = setInterval(refreshCurrentPeriod, 30000);
  refreshCurrentPeriod();
}

async function boot() {
  applyAppearance();
  bindEvents();
  const cached = loadCache();
  if (cached) {
    adopt(cached.data);
    displayedHash = cached.hash;
    savedHash = cached.hash;
    finishBoot();
    hideLoading();
    checkForUpdates();
  } else if (SHEET_ID) {
    SHEET_KIND = SHEET_KIND || inferKind(SHEET_ID);
    try {
      await loadFromSheet(SHEET_ID);
      finishBoot();
    } catch (err) {
      SHEET_ID = '';
      SHEET_KIND = '';
      localStorage.removeItem('sheetId');
      localStorage.removeItem('sheetKind');
      showEmpty();
    }
    hideLoading();
  } else {
    showEmpty();
    hideLoading();
  }
  setInterval(checkForUpdates, POLL_INTERVAL);
}

boot();
