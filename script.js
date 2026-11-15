const DEFAULT_PFP = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" fill="#f5e6ea"/><circle cx="48" cy="38" r="17" fill="#9c3452" fill-opacity="0.55"/><path d="M14 96c0-20 15-34 34-34s34 14 34 34z" fill="#9c3452" fill-opacity="0.55"/></svg>');
const CONTACT_ORDER = ['Mother', 'Father', 'Grandmother', 'Grandfather', 'Uncle', 'Aunt', 'Uncle 2', 'Aunt 2'];
const TOTAL_SCHOOL_DAYS = 40;
const FONT_SCALES = { small: 0.85, default: 1, large: 1.15 };
const POLL_INTERVAL = 60000;
const SETTINGS_INDEX = [
  { label: 'Grade format', tab: 'general', id: 'gradeFormat', keys: 'fraction percentage letter score' },
  { label: 'View mode', tab: 'general', id: 'viewMode', keys: 'grid list layout' },
  { label: 'Density', tab: 'general', id: 'densityRange', keys: 'spacing compact comfortable padding gap slider' },
  { label: 'Show guardian contacts', tab: 'general', id: 'contactsToggle', keys: 'guardian contacts parents phone layout' },
  { label: 'Show records', tab: 'general', id: 'recordsToggle', keys: 'records incidents bar layout' },
  { label: 'Dark mode', tab: 'appearance', id: 'darkToggle', keys: 'dark night theme light' },
  { label: 'Follow system theme', tab: 'appearance', id: 'systemToggle', keys: 'system automatic auto theme os' },
  { label: 'Accent color', tab: 'appearance', id: 'accentSelect', keys: 'maroon gold blue green color' },
  { label: 'Corner radius', tab: 'appearance', id: 'radiusSelect', keys: 'sharp rounded pill corners' },
  { label: 'Font size', tab: 'appearance', id: 'fontSelect', keys: 'small default large text size' },
  { label: 'Font', tab: 'appearance', id: 'fontFamilySelect', keys: 'typeface dm sans inter lora roboto family' },
  { label: 'Background pattern', tab: 'appearance', id: 'patternToggle', keys: 'islamic geometric pattern background' },
  { label: 'Reduce motion', tab: 'appearance', id: 'motionToggle', keys: 'animation animations motion accessibility' },
  { label: 'Google Sheet Link', tab: 'advanced', id: 'sheetLink', keys: 'google sheets import data url connect' },
  { label: 'Import .xlsx', tab: 'advanced', id: 'xlsxBtn', keys: 'excel workbook import file upload' },
  { label: 'Write URL', tab: 'advanced', id: 'writeUrl', keys: 'sync apps script write update sheet' },
  { label: 'Log out', tab: 'account', id: 'logoutBtn', keys: 'sign out account logout' }
];


let SHEET_ID = localStorage.getItem('sheetId') || '1uPM8U6GKVYu3mZyTGVLuQDGbKYjLEwMibCFDN-B0zIU';
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
let showRecords = flag('showRecords', true);

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
  $('recordsToggle').checked = showRecords;
}

const DEFAULT_SHEET_ID = '1uPM8U6GKVYu3mZyTGVLuQDGbKYjLEwMibCFDN-B0zIU';
const CORE_TABS = ['Students', 'Teachers', 'Periods', 'Records'];
const SKIP_SUBJECTS = ['Recess', 'Lunch', "Qur'an"];
const PERIOD_TIMES = [[8, 30, 9, 15], [9, 20, 10, 5], [10, 10, 10, 55], [11, 0, 11, 30], [11, 35, 12, 20], [12, 25, 13, 5], [13, 10, 13, 55], [14, 0, 14, 45], [14, 50, 15, 35]];
const ATT_STATUSES = ['Present', 'Absent', 'Tardy', 'Excused'];
const ASG_TYPES = ['Homework', 'Quiz', 'Test', 'Project', 'Classwork'];
const GUARDIANS = [['Mother', 'mother'], ['Father', 'father'], ['Grandmother', 'grandmother'], ['Grandfather', 'grandfather'], ['Uncle', 'uncle'], ['Aunt', 'aunt'], ['Uncle 2', 'uncle2'], ['Aunt 2', 'aunt2']];
const MALE_NAMES = 'yusuf,abdullah,bilal,omar,ibrahim,hamza,idris,musa,ali,tariq,ismail,suleiman,rashid,faisal,adnan,hamid,abdul,kwame,kofi,yaw,nadeem,karim,zubair,fahad,sami,hassan,malik,amir,kareem,tamer,yousef,adam,zaid,rami,khalid,mustafa,mahmoud,yahya,zachary,ayaan,rayyan,ilyas,daud,harun,ishaq,yaqub,sulayman,zakariya,jibril,anas'.split(',');
const FEMALE_NAMES = 'maryam,fatima,aisha,zaynab,khadija,sumayya,safiya,hafsa,amina,layla,ruqayya,naima,huda,nadia,sana,sumaiya,nasreen,zahra,abena,akosua,farah,salma,rabia,mehwish,yasmin,zainab,mariam,noor,aya,sara,lina,dina,rania,hana,nour,jana,maya,laila,samira,farida,asma,iman,sakina,asiya,hajar,bushra,tahira,umaima,rumaisa,yasira'.split(',');

const store = {
  Students: [],
  Teachers: [],
  Contacts: [],
  Periods: [],
  Records: [],
  Attendance: [],
  Assignments: [],
  Items: [],
  Grades: []
};

let studentById = {};
let attIndex = new Map();
let asgIndex = new Map();
let periodTiers = new Map();
let subjectTiersMap = new Map();
let latestDay = '';
let checking = false;
let lastSaveToast = 0;
let editLog = [];

function loadEditLog() {
  try {
    const v = JSON.parse(localStorage.getItem('editLog') || '[]');
    return Array.isArray(v) ? v : [];
  } catch (e) {
    return [];
  }
}

function persistLog() {
  try {
    localStorage.setItem('editLog', JSON.stringify(editLog.slice(-3000)));
  } catch (e) {}
}

function tierOf(grade) {
  return grade <= 4 ? 'primary' : grade <= 8 ? 'middle' : 'upper';
}

function str(v) {
  return String(v == null ? '' : v).trim();
}

function num(v) {
  const n = Number(v);
  return v === '' || v == null || Number.isNaN(n) ? 0 : n;
}

function nameKey(f, l) {
  return str(f).toLowerCase() + '|' + str(l).toLowerCase();
}

function attKey(subject, day, period, sid) {
  return `${subject}|${day}|${period}|${sid}`;
}

function asgKey(a) {
  return `${a.subject}|${a.day}|${a.type}|${a.title}`;
}

function isoDate(v) {
  const s = str(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : '';
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function tableObjects(rows, firstKey) {
  if (!rows || !rows.length) return [];
  const headers = rows[0].map(h => str(h).toLowerCase().replace(/\s+/g, '_'));
  if (!headers[0]) headers[0] = firstKey;
  return rows.slice(1).map(r => {
    const o = {};
    headers.forEach((h, i) => { if (h) o[h] = r[i] === undefined || r[i] === null ? '' : r[i]; });
    return o;
  });
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

function hashText(t) {
  let h = 5381;
  for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0;
  return String(h >>> 0) + ':' + t.length;
}

function hashAll(texts) {
  return Object.keys(texts).sort().map(k => k + '=' + hashText(texts[k])).join('|');
}

function isMarker(r) {
  return str(r[0]) !== '' && str(r[1]) === '' && str(r[2]) === '';
}

function validBlockSheet(rows) {
  return !!rows && rows.length > 1 && str(rows[0][0]).toLowerCase() === 'first name';
}

function recordKind(rec) {
  const loc = rec.location.toLowerCase();
  if (loc.indexOf('nurse') >= 0) return 'Nurse';
  if (loc.indexOf('office') >= 0) return 'Office';
  return /bully|disrupt|behavio|late arrival|detention|principal|warn|suspen|refus|fight|disrespect|cheat/i.test(rec.incident) ? 'Office' : 'Nurse';
}

function parseGradeRows(subject, rows, resolve, out) {
  let day = '';
  let asg = null;
  rows.slice(1).forEach(r => {
    if (isMarker(r)) {
      const t = str(r[0]);
      const d = isoDate(t);
      if (d) {
        day = d;
        asg = null;
        return;
      }
      const m = t.match(/^(.+?)\s+-\s+(.+?)\s+\(out of\s+([\d.]+)\)$/i);
      if (m && day) {
        asg = { subject: subject, day: day, type: m[1].trim(), title: m[2].trim(), max: Number(m[3]), entries: [] };
        out.push(asg);
      }
      return;
    }
    if (!asg) return;
    const first = str(r[0]);
    const last = str(r[1]);
    if (!first || !last) return;
    const sid = resolve(first, last, subject);
    if (!sid) return;
    const m2 = str(r[2]).match(/^([\d.]+)\s*\/\s*([\d.]+)$/);
    asg.entries.push({ student_id: sid, score: m2 ? Number(m2[1]) : null, returned: str(r[3]) });
  });
}

function parseAttendanceRows(subject, rows, resolve, enrolled, out) {
  let day = '';
  let period = 0;
  rows.slice(1).forEach(r => {
    if (isMarker(r)) {
      const t = str(r[0]);
      const d = isoDate(t);
      if (d) {
        day = d;
        period = 0;
        return;
      }
      const m = t.match(/^period\s+(\d+)(\s*\(N\/A\))?$/i);
      period = m && !m[2] ? Number(m[1]) : 0;
      return;
    }
    if (!period || !day) return;
    const first = str(r[0]);
    const last = str(r[1]);
    if (!first || !last) return;
    const sid = resolve(first, last, subject);
    if (!sid || !enrolled(sid, subject, period)) return;
    const raw = str(r[2]).toLowerCase();
    const status = ATT_STATUSES.find(s => s.toLowerCase() === raw);
    if (status) out.push({ student_id: sid, subject: subject, day: day, period: period, status: status });
  });
}

function computeGrades(target) {
  const m = new Map();
  target.Items.forEach(it => {
    const k = it.student_id + '|' + it.subject;
    const o = m.get(k) || { student_id: it.student_id, subject: it.subject, earned: 0, possible: 0 };
    o.earned += it.score;
    o.possible += it.max_score;
    m.set(k, o);
  });
  let id = 1;
  target.Grades = Array.from(m.values()).map(o => {
    const percent = o.possible ? (o.earned / o.possible) * 100 : 0;
    return { id: id++, student_id: o.student_id, subject: o.subject, letter: letterOf(percent), percent: Number(percent.toFixed(1)), earned: o.earned, possible: o.possible };
  });
}

function deriveGrades(target) {
  target.Items = [];
  let id = 1;
  target.Assignments.forEach(a => {
    a.entries.forEach(e => {
      if (e.score !== null) target.Items.push({ id: id++, student_id: e.student_id, subject: a.subject, type: a.type, title: a.title, score: e.score, max_score: a.max, day: a.day, returned: e.returned });
    });
  });
  computeGrades(target);
}

function buildStore(tabs) {
  const next = { Students: [], Teachers: [], Contacts: [], Periods: [], Records: [], Attendance: [], Assignments: [], Items: [], Grades: [] };
  next.Students = tableObjects(tabs.Students, 'id').filter(r => str(r.first_name)).map((r, i) => {
    const o = { id: num(r.id) || i + 1, first_name: str(r.first_name), last_name: str(r.last_name), grade: num(r.grade), email: str(r.email), street: str(r.street), city: str(r.city), state: str(r.state), zip: str(r.zip), has_hifz: num(r.has_hifz), hifz_level: str(r.hifz_level) };
    GUARDIANS.forEach(g => {
      const n = str(r[g[1] + '_name']);
      if (n && n.toUpperCase() !== 'N/A') next.Contacts.push({ student_id: o.id, relation: g[0], name: n, phone: str(r[g[1] + '_phone']) || 'N/A' });
    });
    return o;
  });
  if (!next.Students.length) throw new Error('The Students tab is missing or empty.');
  next.Teachers = tableObjects(tabs.Teachers, 'role').filter(r => str(r.username)).map(r => ({ role: str(r.role).toLowerCase(), first: str(r.first), last: str(r.last), username: str(r.username), password: str(r.password), email: str(r.email), class: str(r.class), id: num(r.id), name: str(r.name) || (str(r.first) + ' ' + str(r.last)).trim(), subject: str(r.subject), access: str(r.access).toLowerCase() }));
  if (!next.Teachers.length) throw new Error('The Teachers tab is missing or empty.');
  next.Periods = tableObjects(tabs.Periods, 'id').filter(r => str(r.subject)).map(r => ({ id: num(r.id), tier: str(r.tier).toLowerCase(), period_no: num(r.period_no), subject: str(r.subject), teacher_id: num(r.teacher_id) }));

  const byId = {};
  const names = new Map();
  const full = new Map();
  next.Students.forEach(s => {
    byId[s.id] = s;
    const k = nameKey(s.first_name, s.last_name);
    if (!names.has(k)) names.set(k, []);
    names.get(k).push(s.id);
    full.set((s.first_name + ' ' + s.last_name).toLowerCase(), s.id);
  });
  const pt = new Map();
  const st = new Map();
  next.Periods.forEach(p => {
    const k = p.subject + '|' + p.period_no;
    if (!pt.has(k)) pt.set(k, new Set());
    pt.get(k).add(p.tier);
    if (!st.has(p.subject)) st.set(p.subject, new Set());
    st.get(p.subject).add(p.tier);
  });
  const resolve = (f, l, subject) => {
    const ids = names.get(nameKey(f, l));
    if (!ids) return 0;
    if (ids.length === 1) return ids[0];
    const t = st.get(subject);
    return ids.filter(i => !t || t.has(tierOf(byId[i].grade)))[0] || ids[0];
  };
  const enrolled = (sid, subject, period) => {
    const set = pt.get(subject + '|' + period);
    return !!set && set.has(tierOf(byId[sid].grade));
  };

  next.Records = tableObjects(tabs.Records, 'student').filter(r => str(r.student)).map(r => {
    const rec = { student: str(r.student), student_id: full.get(str(r.student).toLowerCase()) || 0, date: isoDate(r.date) || str(r.date), incident: str(r.incident), action: str(r.action), location: str(r.location), reason: str(r.reason), staff: str(r.staff) };
    rec.kind = recordKind(rec);
    return rec;
  });

  Object.keys(tabs).forEach(name => {
    const rows = tabs[name];
    let m = name.match(/^(.+?)\s+grades$/i);
    if (m && validBlockSheet(rows)) parseGradeRows(m[1].trim(), rows, resolve, next.Assignments);
    m = name.match(/^(.+?)\s+attendance$/i);
    if (m && validBlockSheet(rows)) parseAttendanceRows(m[1].trim(), rows, resolve, enrolled, next.Attendance);
  });

  if (next.Assignments.length) {
    deriveGrades(next);
  } else if (tabs.Items && tabs.Items.length) {
    next.Items = tableObjects(tabs.Items, 'id').filter(r => str(r.subject)).map((r, i) => ({ id: num(r.id) || i + 1, student_id: num(r.student_id), subject: str(r.subject), type: str(r.type), title: str(r.title), score: num(r.score), max_score: num(r.max_score), day: isoDate(r.day) || str(r.day), returned: '' }));
    computeGrades(next);
  }
  return next;
}

function reindex() {
  studentById = {};
  store.Students.forEach(s => { studentById[s.id] = s; });
  attIndex = new Map();
  latestDay = '';
  store.Attendance.forEach(a => {
    attIndex.set(attKey(a.subject, a.day, a.period, a.student_id), a);
    if (a.day > latestDay) latestDay = a.day;
  });
  asgIndex = new Map();
  store.Assignments.forEach(a => asgIndex.set(asgKey(a), a));
  periodTiers = new Map();
  subjectTiersMap = new Map();
  store.Periods.forEach(p => {
    const k = p.subject + '|' + p.period_no;
    if (!periodTiers.has(k)) periodTiers.set(k, new Set());
    periodTiers.get(k).add(p.tier);
    if (!subjectTiersMap.has(p.subject)) subjectTiersMap.set(p.subject, new Set());
    subjectTiersMap.get(p.subject).add(p.tier);
  });
}

function applyEdit(e) {
  if (e.type === 'attendance') {
    const k = attKey(e.subject, e.day, e.period, e.sid);
    let a = attIndex.get(k);
    if (a) {
      a.status = e.status;
    } else {
      a = { student_id: e.sid, subject: e.subject, day: e.day, period: e.period, status: e.status };
      store.Attendance.push(a);
      attIndex.set(k, a);
      if (a.day > latestDay) latestDay = a.day;
    }
  } else if (e.type === 'assignment') {
    const probe = { subject: e.subject, day: e.day, type: e.atype, title: e.title };
    if (!asgIndex.has(asgKey(probe))) {
      const a = { subject: e.subject, day: e.day, type: e.atype, title: e.title, max: e.max, entries: e.sids.map(i => ({ student_id: i, score: null, returned: '' })) };
      store.Assignments.push(a);
      asgIndex.set(asgKey(a), a);
    }
  } else if (e.type === 'student') {
    const s = studentById[e.sid];
    if (s) Object.assign(s, e.fields);
  } else if (e.type === 'score') {
    const a = asgIndex.get(e.key);
    if (!a) return;
    let en = a.entries.find(x => x.student_id === e.sid);
    if (!en) {
      en = { student_id: e.sid, score: null, returned: '' };
      a.entries.push(en);
    }
    en.score = e.score;
    en.returned = e.returned;
  }
}

function applyLocalEdits() {
  if (!editLog.length) return;
  editLog.forEach(applyEdit);
  deriveGrades(store);
}

function adoptRows(rows) {
  const next = buildStore(rows);
  Object.keys(next).forEach(k => { store[k] = next[k]; });
  reindex();
  applyLocalEdits();
}

function rowsFromWorkbook(wb) {
  const rows = {};
  wb.SheetNames.forEach(n => {
    rows[n] = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '' }).map(r => r.map(c => (c === null || c === undefined ? '' : c)));
  });
  return rows;
}

async function gzipText(s) {
  if (typeof CompressionStream === 'undefined') return 'p:' + s;
  const stream = new Blob([s]).stream().pipeThrough(new CompressionStream('gzip'));
  const buf = new Uint8Array(await new Response(stream).arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  return 'g:' + btoa(bin);
}

async function gunzipText(s) {
  if (s.startsWith('p:')) return s.slice(2);
  const bin = atob(s.slice(2));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return await new Response(stream).text();
}

async function saveCache(rows, hash, id) {
  try {
    localStorage.setItem('sheetCache', await gzipText(JSON.stringify({ id: id, hash: hash, rows: rows })));
    if (id) localStorage.setItem('sheetId', id);
    else localStorage.removeItem('sheetId');
  } catch (e) {
    localStorage.removeItem('sheetCache');
  }
}

async function loadCache() {
  try {
    localStorage.removeItem('sheetData');
    localStorage.removeItem('sheetHash');
    const raw = localStorage.getItem('sheetCache');
    if (!raw) return null;
    const obj = JSON.parse(await gunzipText(raw));
    return obj && obj.rows ? obj : null;
  } catch (e) {
    return null;
  }
}

async function fetchCsv(id, tab) {
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`);
  if (!res.ok) throw new Error('Could not read the ' + tab + ' tab.');
  return await res.text();
}

async function runPool(items, size, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (i < items.length) {
      const k = i++;
      await fn(items[k]);
    }
  }));
}

async function fetchSheetTexts(id) {
  const texts = {};
  await runPool(CORE_TABS, 4, async t => {
    try {
      texts[t] = await fetchCsv(id, t);
    } catch (e) {
      if (t !== 'Records') throw e;
      texts[t] = '';
    }
  });
  const subjects = Array.from(new Set(parseCSV(texts.Periods).slice(1).map(r => str(r[3])).filter(s => s && !SKIP_SUBJECTS.includes(s))));
  const names = [];
  subjects.forEach(s => {
    names.push(s + ' grades');
    names.push(s + ' attendance');
  });
  await runPool(names, 6, async n => {
    try {
      texts[n] = await fetchCsv(id, n);
    } catch (e) {
      texts[n] = '';
    }
  });
  return texts;
}

function parseAllTexts(texts) {
  const rows = {};
  Object.keys(texts).forEach(k => { rows[k] = parseCSV(texts[k]); });
  return rows;
}

async function loadFromSheet(id) {
  const texts = await fetchSheetTexts(id);
  const rows = parseAllTexts(texts);
  const hash = hashAll(texts);
  adoptRows(rows);
  SHEET_ID = id;
  displayedHash = hash;
  savedHash = hash;
  await saveCache(rows, hash, id);
}

async function loadFresh() {
  const ids = Array.from(new Set([localStorage.getItem('sheetId') || '', DEFAULT_SHEET_ID].filter(Boolean)));
  for (const id of ids) {
    try {
      await loadFromSheet(id);
      return true;
    } catch (e) {}
  }
  return false;
}

async function syncFetch() {
  let id = SHEET_ID || DEFAULT_SHEET_ID;
  let texts;
  try {
    texts = await fetchSheetTexts(id);
    buildStore(parseAllTexts(texts));
  } catch (e) {
    if (id === DEFAULT_SHEET_ID) throw e;
    id = DEFAULT_SHEET_ID;
    texts = await fetchSheetTexts(id);
  }
  return { id: id, texts: texts, hash: hashAll(texts) };
}

async function checkForUpdates() {
  if (checking) return;
  checking = true;
  try {
    const r = await syncFetch();
    if (r.hash === savedHash && r.id === SHEET_ID) return;
    const rows = parseAllTexts(r.texts);
    buildStore(rows);
    await saveCache(rows, r.hash, r.id);
    SHEET_ID = r.id;
    savedHash = r.hash;
    $('updateBanner').hidden = false;
  } catch (err) {
  } finally {
    checking = false;
  }
}

async function quietSync() {
  try {
    const r = await syncFetch();
    await saveCache(parseAllTexts(r.texts), r.hash, r.id);
    SHEET_ID = r.id;
    savedHash = r.hash;
  } catch (e) {}
}

function extractSheetId(v) {
  const s = str(v);
  const m = s.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  return /^[a-zA-Z0-9_-]{20,}$/.test(s) ? s : '';
}

async function connectSheet(link) {
  const id = extractSheetId(link);
  if (!id) {
    toast('Enter a valid Google Sheet link.');
    return;
  }
  toast('Connecting…');
  try {
    await loadFromSheet(id);
    closeSettings();
    startApp();
    toast('Connected to Google Sheets.');
  } catch (err) {
    toast('Could not load the sheet. Share it with anyone who has the link.');
  }
}

async function importXlsx(file) {
  try {
    const buf = await file.arrayBuffer();
    const rows = rowsFromWorkbook(XLSX.read(buf, { type: 'array' }));
    adoptRows(rows);
    SHEET_ID = '';
    displayedHash = 'xlsx';
    savedHash = 'xlsx';
    await saveCache(rows, 'xlsx', '');
    closeSettings();
    startApp();
    toast('Data imported successfully!');
  } catch (err) {
    toast('Import failed: ' + err.message);
  } finally {
    $('xlsxInput').value = '';
  }
}

async function sendWrite(payload) {
  const url = localStorage.getItem('writeUrl') || '';
  if (!url) return false;
  try {
    await fetch(url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
    return true;
  } catch (e) {
    return false;
  }
}

function notifySaved(sent) {
  const now = Date.now();
  if (now - lastSaveToast < 2500) return;
  lastSaveToast = now;
  toast(sent ? 'Saved to Google Sheets.' : 'Saved on this device. Add a write URL in Settings to sync.');
}

async function commitEdit(e, payload) {
  applyEdit(e);
  if (e.type !== 'attendance') deriveGrades(store);
  editLog.push(e);
  persistLog();
  const sent = await sendWrite(payload);
  if (sent) {
    editLog = editLog.filter(x => x !== e);
    persistLog();
    setTimeout(quietSync, 5000);
  }
  notifySaved(sent);
}

function teacherMap() {
  const m = {};
  store.Teachers.forEach(t => { m[t.id] = t; });
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
  store.Items.forEach(it => { if (it.day > max) max = it.day; });
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
  $('navDashboard').classList.toggle('active', name === 'dash');
  $('navInfo').classList.toggle('active', name === 'info');
  $('navTools').classList.toggle('active', name === 'tools');
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
  ['list', 'profile', 'grades', 'gradesDir', 'dashboard', 'records', 'module'].forEach(v => { $(v + 'View').hidden = v !== name; });
  $('pageTitle').textContent = title;
  setActive(name === 'list' ? 'home' : name === 'profile' || name === 'records' ? 'info' : name === 'dashboard' ? 'dash' : name === 'module' ? 'tools' : 'grades');
  $('topSearch').hidden = name === 'list';
  watchEl = null;
  $('smartBar').classList.remove('show');
  updateEdges();
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

let session = null;
let notifiedWelcome = false;

function byNameFn(a, b) {
  return a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name);
}

function currentTeacher() {
  if (!session) return null;
  const u = session.username.toLowerCase();
  return store.Teachers.find(t => t.username.toLowerCase() === u) || null;
}

function isAdminUser(t) {
  return !!t && (t.role === 'admin' || t.access === 'full');
}

function b64uToBytes(s) {
  const p = String(s).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(p + '='.repeat((4 - (p.length % 4)) % 4));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function deriveHash(pw, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt, iterations: iterations }, key, 256));
}

async function verifyPassword(pw, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2_sha256') return false;
  const want = b64uToBytes(parts[3]);
  const got = await deriveHash(pw, b64uToBytes(parts[2]), Number(parts[1]));
  if (got.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got[i] ^ want[i];
  return diff === 0;
}

function saveSession(t) {
  session = { username: t.username };
  localStorage.setItem('session', JSON.stringify(session));
}

function restoreSession() {
  try {
    const raw = sessionStorage.getItem('session') || localStorage.getItem('session');
    session = raw ? JSON.parse(raw) : null;
  } catch (e) {
    session = null;
  }
}

function genderOf(s) {
  const n = s.first_name.toLowerCase();
  if (MALE_NAMES.includes(n)) return 'M';
  if (FEMALE_NAMES.includes(n)) return 'F';
  return /(a|ah|een|iya|ya|ie|y)$/.test(n) ? 'F' : 'M';
}

function parseClass(c) {
  const s = String(c || '').trim();
  if (/^tahfeedh/i.test(s)) return { hifz: true, min: 1, max: 99, gender: /girls/i.test(s) ? 'F' : /boys/i.test(s) ? 'M' : null };
  const m = s.match(/^(\d+)\s*-\s*(\d+)\s*([BG])?\b/i);
  if (!m) return null;
  let g = m[3] ? m[3].toUpperCase() : /boys/i.test(s) ? 'B' : /girls/i.test(s) ? 'G' : null;
  return { hifz: false, min: Number(m[1]), max: Number(m[2]), gender: g === 'B' ? 'M' : g === 'G' ? 'F' : null };
}

function classStudentIds(t) {
  const c = parseClass(t.class);
  if (!c) return [];
  return store.Students.filter(s => s.grade >= c.min && s.grade <= c.max && (!c.hifz || s.has_hifz) && (!c.gender || genderOf(s) === c.gender)).map(s => s.id);
}

function scopeSet(t) {
  return t && !isAdminUser(t) ? new Set(classStudentIds(t)) : null;
}

function slotStudents(slot, teacher) {
  const t = teacher || currentTeacher();
  const scope = scopeSet(t);
  const tiers = periodTiers.get(slot.key);
  return store.Students.filter(s => tiers && tiers.has(tierOf(s.grade)) && (!scope || scope.has(s.id))).sort(byNameFn);
}

function teacherSlots(t) {
  const build = pick => {
    const map = new Map();
    store.Periods.filter(p => !SKIP_SUBJECTS.includes(p.subject) && pick(p)).forEach(p => {
      const k = p.subject + '|' + p.period_no;
      if (!map.has(k)) map.set(k, { key: k, subject: p.subject, period_no: p.period_no, tiers: [] });
      map.get(k).tiers.push(p.tier);
    });
    return Array.from(map.values()).filter(sl => slotStudents(sl, t).length > 0);
  };
  let slots = build(p => p.teacher_id === t.id);
  if (!slots.length) {
    const c = parseClass(t.class);
    if (c) {
      const tiers = new Set();
      for (let g = c.min; g <= Math.min(c.max, 13); g++) tiers.add(tierOf(g));
      slots = build(p => tiers.has(p.tier));
    }
  }
  return slots.sort((a, b) => a.period_no - b.period_no);
}

function subjectStudentIds(subject) {
  const tiers = subjectTiersMap.get(subject);
  return store.Students.filter(s => tiers && tiers.has(tierOf(s.grade))).map(s => s.id);
}

function visibleStudents() {
  const t = currentTeacher();
  if (!t) return [];
  if (isAdminUser(t)) return store.Students.slice();
  const ids = new Set(classStudentIds(t));
  return store.Students.filter(s => ids.has(s.id));
}

function fmtTime(h, m) {
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${ap}`;
}

function slotTime(no) {
  const p = PERIOD_TIMES[no - 1];
  return p ? `${fmtTime(p[0], p[1])} - ${fmtTime(p[2], p[3])}` : '';
}

function currentPeriodNo() {
  const d = new Date();
  if (d.getDay() === 0 || d.getDay() === 6) return 0;
  const mins = d.getHours() * 60 + d.getMinutes();
  for (let i = 0; i < PERIOD_TIMES.length; i++) {
    const p = PERIOD_TIMES[i];
    if (mins >= p[0] * 60 + p[1] && mins < p[2] * 60 + p[3]) return i + 1;
  }
  return 0;
}

function activeDay() {
  const t = todayISO();
  return store.Attendance.some(a => a.day === t) ? t : latestDay || t;
}

function showLogin() {
  session = null;
  document.body.classList.add('locked');
  $('loginScreen').hidden = false;
  $('loginError').textContent = store.Teachers.length ? '' : 'No account data is loaded yet.';
  updateSettingsTabs();
}

function enterApp(announce) {
  const t = currentTeacher();
  document.body.classList.remove('locked');
  $('loginScreen').hidden = true;
  $('loginPass').value = '';
  finishBoot();
  updateSettingsTabs();
  openDashboard();
  if (announce && t) toast('Welcome, ' + t.name);
}

function startApp() {
  restoreSession();
  if (currentTeacher()) enterApp(false);
  else showLogin();
}

function logout() {
  localStorage.removeItem('session');
  sessionStorage.removeItem('session');
  session = null;
  students = [];
  closeSettings();
  showLogin();
}

async function submitLogin(e) {
  e.preventDefault();
  const u = $('loginUser').value.trim().toLowerCase();
  const p = $('loginPass').value;
  const err = $('loginError');
  err.textContent = '';
  if (!u || !p) {
    err.textContent = 'Enter your username and password.';
    return;
  }
  if (!window.crypto || !crypto.subtle) {
    err.textContent = 'Secure sign-in is not available in this browser.';
    return;
  }
  const btn = $('loginBtn');
  btn.disabled = true;
  btn.classList.add('busy');
  const t = store.Teachers.find(x => x.username.toLowerCase() === u);
  let ok = false;
  try {
    ok = !!t && (await verifyPassword(p, t.password));
  } catch (x) {
    ok = false;
  }
  btn.disabled = false;
  btn.classList.remove('busy');
  if (!ok) {
    err.textContent = 'Incorrect username or password.';
    return;
  }
  session = { username: t.username };
  if ($('loginRemember').checked) {
    localStorage.setItem('session', JSON.stringify(session));
    sessionStorage.removeItem('session');
  } else {
    sessionStorage.setItem('session', JSON.stringify(session));
    localStorage.removeItem('session');
  }
  enterApp(true);
}

function showEmpty() {
  allSubjects = [];
  buildSubnav();
  $('homeFilter').hidden = true;
  $('studentGrid').className = 'student-grid';
  $('studentGrid').innerHTML = '<div class="empty-state"><i class="fa-solid fa-circle-question"></i><h3>No students found</h3></div>';
  showView('list', 'Students');
}

function finishBoot() {
  students = visibleStudents().sort(byNameFn);
  const ids = new Set(students.map(s => s.id));
  allSubjects = Array.from(new Set(store.Grades.filter(g => ids.has(g.student_id)).map(g => g.subject))).sort();
  computeEndYear();
  buildSubnav();
  buildDashMenu();
  buildToolsMenu();
}

function buildSubnav() {
  $('subnavList').innerHTML = allSubjects.map(s => `<button type="button" class="subnav-item" data-subject="${esc(s)}">${esc(s)}</button>`).join('');
}

function hideLoading() {
  const l = $('loadingScreen');
  l.classList.add('hide');
  setTimeout(() => { l.hidden = true; }, 500);
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
        setTimeout(() => { c.style.transitionDelay = ''; }, 700 + d);
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

function cardHtml(s, right) {
  return `<button type="button" class="student-card popout" data-id="${s.id}"><img class="sc-avatar" src="${DEFAULT_PFP}" alt=""><div class="sc-text"><span class="sc-name">${esc(s.first_name)} ${esc(s.last_name)}</span><span class="sc-sub">${gradeName(s.grade)} · ${esc(s.email)}</span></div><span class="pill">${right}</span></button>`;
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
  const list = sortStudents(students.filter(matchTerm).filter(s => homeGrade === 'all' || s.grade === Number(homeGrade)).filter(s => homeHifz === 'all' || (homeHifz === 'yes' ? !!s.has_hifz : !s.has_hifz)), homeSort);
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
  const total = weightedTotal(grades);
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

function studentRecords(sid) {
  return store.Records.filter(r => r.student_id === sid).sort((a, b) => b.date.localeCompare(a.date));
}

function attendanceCounts(sid) {
  const c = { Present: 0, Absent: 0, Tardy: 0, Excused: 0 };
  store.Attendance.forEach(a => { if (a.student_id === sid) c[a.status]++; });
  return c;
}

function recordRowHtml(r) {
  const tags = [r.location, r.reason, r.staff].filter(Boolean).map(t => `<span class="rec-tag">${esc(t)}</span>`).join('');
  return `<div class="rec-item"><span class="rec-date">${esc(shortDateFull(r.date))}</span><div class="rec-main"><b>${esc(r.incident)}</b><span>${esc(r.action)}</span>${tags ? `<div class="rec-tags">${tags}</div>` : ''}</div><span class="type-badge ${r.kind.toLowerCase()}">${r.kind}</span></div>`;
}

function shortDateFull(d) {
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : d;
}

function weightedTotal(grades) {
  const e = grades.reduce((a, g) => a + (g.earned || 0), 0);
  const p = grades.reduce((a, g) => a + (g.possible || 0), 0);
  return p ? (e / p) * 100 : 0;
}

function openStudent(id) {
  const s = students.find(x => x.id === id);
  if (!s) return;
  currentId = id;
  currentSubject = null;
  const tier = tierOf(s.grade);
  const tm = teacherMap();
  const planFor = t => store.Periods.filter(p => p.tier === t).sort((a, b) => a.period_no - b.period_no).map(p => ({ period_no: p.period_no, subject: p.subject, name: (tm[p.teacher_id] || {}).name || '', role: SKIP_SUBJECTS.slice(0, 2).includes(p.subject) ? 'Monitor' : '' }));
  let periods = planFor(tier);
  if (!periods.length) periods = planFor('upper');
  const schedule = periods.map(p => `<div class="row${p.role === 'Monitor' ? ' mute' : ''}"><span class="p-no">Period ${p.period_no}</span><span class="p-sub">${esc(p.subject)}</span><span class="p-t">${esc(p.name)}</span></div>`).join('');

  let hifzRow = '';
  if (s.has_hifz) {
    const qp = store.Periods.find(p => p.subject === "Qur'an" && p.tier === tier);
    const qt = qp ? tm[qp.teacher_id] : null;
    hifzRow = `<div class="row hifz"><span class="p-no">Extra</span><span class="p-sub">Hifz · ${esc(s.hifz_level)}</span><span class="p-t">${esc(qt ? qt.name : '')}</span></div>`;
  }

  const contactMap = {};
  store.Contacts.filter(c => c.student_id === id).forEach(c => { contactMap[c.relation] = c; });
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
  const recs = studentRecords(id);
  const pos = Math.min(recs.length, 50) / 50 * 100;
  const recList = recs.length ? recs.slice(0, 4).map(recordRowHtml).join('') : '<div class="rec-empty"><i class="fa-regular fa-circle-check"></i><span>No records</span></div>';
  const recCard = showRecords ? `<div class="card popout g-att"><h3><i class="fa-solid fa-clipboard-list"></i> Records</h3><div class="rec-list">${recList}</div><button type="button" class="rec-bar" id="recBar" aria-label="Open records"><span class="rec-track"><i class="rec-mark" style="left:${pos}%"><em>${recs.length}</em></i></span><span class="rec-scale"><b>0</b><b>50</b></span></button></div>` : '';
  const contCard = showContacts ? `<div class="card popout g-cont"><h3><i class="fa-solid fa-people-roof"></i> Guardian contacts</h3>${contacts}</div>` : '';
  const admin = isAdminUser(currentTeacher());

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
      ${admin ? '<button type="button" class="btn ghost" id="editStudent"><i class="fa-solid fa-pen"></i> Edit</button>' : ''}
      <a class="email-pill" href="${gmailLink(s.email)}" target="_blank" rel="noopener"><i class="fa-regular fa-envelope"></i><span>${esc(s.email)}</span></a>
    </div>
    <div class="profile-grid${showRecords ? '' : ' no-att'}${showContacts ? '' : ' no-cont'}">
      ${recCard}
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
        <h3><i class="fa-solid fa-clock"></i> Daily schedule</h3>
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
  if ($('recBar')) $('recBar').onclick = () => openRecords(id);
  if ($('editStudent')) $('editStudent').onclick = () => openStudentEditor(id);
}

function openStudentEditor(id) {
  const s = studentById[id];
  if (!s) return;
  const fields = [['first_name', 'First name', 'text'], ['last_name', 'Last name', 'text'], ['grade', 'Grade', 'number'], ['email', 'Email', 'text'], ['street', 'Street', 'text'], ['city', 'City', 'text'], ['state', 'State', 'text'], ['zip', 'ZIP', 'text'], ['hifz_level', 'Hifz level', 'text']];
  const wrap = document.createElement('div');
  wrap.className = 'overlay editor-overlay';
  wrap.innerHTML = `<form class="kb-modal editor"><button class="modal-close" type="button" id="edClose" aria-label="Close"><i class="fa-solid fa-xmark"></i></button><h3>Edit student</h3><div class="editor-grid">${fields.map(f => `<div class="field"><label for="ed_${f[0]}">${f[1]}</label><input class="text-input" id="ed_${f[0]}" type="${f[2]}" value="${esc(s[f[0]])}"></div>`).join('')}<div class="field inline"><label for="ed_has_hifz">Enrolled in Hifz</label><label class="switch"><input type="checkbox" id="ed_has_hifz"${s.has_hifz ? ' checked' : ''}><span class="slider"></span></label></div></div><div class="import-buttons"><button class="btn" type="submit"><i class="fa-solid fa-check"></i> Save</button></div></form>`;
  document.body.appendChild(wrap);
  const close = () => wrap.remove();
  wrap.querySelector('#edClose').onclick = close;
  wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
  wrap.querySelector('form').addEventListener('submit', async e => {
    e.preventDefault();
    const fv = {};
    fields.forEach(f => { fv[f[0]] = f[2] === 'number' ? num(wrap.querySelector('#ed_' + f[0]).value) : wrap.querySelector('#ed_' + f[0]).value.trim(); });
    fv.has_hifz = wrap.querySelector('#ed_has_hifz').checked ? 1 : 0;
    if (!fv.first_name || !fv.last_name) {
      toast('First and last name are required.');
      return;
    }
    const payload = { action: 'student', id: id, original: { first: s.first_name, last: s.last_name }, fields: fv };
    close();
    await commitEdit({ type: 'student', sid: id, fields: fv }, payload);
    const st = students.find(x => x.id === id);
    if (st) Object.assign(st, fv);
    openStudent(id);
  });
}

function openRecords(studentId) {
  const s = studentById[studentId];
  if (!s) return;
  currentId = studentId;
  const recs = studentRecords(studentId);
  const c = attendanceCounts(studentId);
  const nurse = recs.filter(r => r.kind === 'Nurse').length;
  const office = recs.length - nurse;
  const totalAtt = c.Present + c.Absent + c.Tardy + c.Excused;
  const bars = [
    { label: 'Absences', value: c.Absent, color: 'var(--red)', share: totalAtt ? (c.Absent / totalAtt) * 100 : 0 },
    { label: 'Excused Absences', value: c.Excused, color: 'var(--blue)', share: totalAtt ? (c.Excused / totalAtt) * 100 : 0 },
    { label: 'Tardies', value: c.Tardy, color: 'var(--amber)', share: totalAtt ? (c.Tardy / totalAtt) * 100 : 0 },
    { label: 'Presents', value: c.Present, color: 'var(--green)', share: totalAtt ? (c.Present / totalAtt) * 100 : 0 },
    { label: 'Incidents', value: recs.length, color: 'var(--acc-700)', note: `Nurse ${nurse} · Office ${office}` }
  ];
  $('recordsView').innerHTML = `
    <div class="detail-bar">
      <button type="button" class="back-btn" id="backProfile2"><i class="fa-solid fa-arrow-left"></i> Back to Profile</button>
      <span class="big-subject">Records</span>
    </div>
    <div class="hero grades-hero popout"><div class="g-info"><h2>${esc(s.first_name)} ${esc(s.last_name)}</h2><span>${gradeName(s.grade)} · ${studentCode(s)}</span></div><div class="g-badge"><b>${recs.length}</b><span>incidents</span></div></div>
    <div class="grades-grid">
      <div class="card full"><h3><i class="fa-solid fa-chart-column"></i> Overview</h3><div id="histHolder"></div></div>
      <div class="card full"><h3><i class="fa-solid fa-clipboard-list"></i> All records</h3><div class="rec-list">${recs.length ? recs.map(recordRowHtml).join('') : '<div class="rec-empty"><i class="fa-regular fa-circle-check"></i><span>No records</span></div>'}</div></div>
    </div>`;
  showView('records', `${s.first_name}'s Records`);
  window.scrollTo(0, 0);
  $('backProfile2').onclick = () => openStudent(studentId);
  buildHistogram($('histHolder'), bars);
}

function buildHistogram(holder, bars) {
  const W = 900, H = 360, yW = 58, xH = 40;
  const pL = yW, pR = W, pB = H - xH;
  const pW = pR - pL, pH = pB;
  const X0 = -0.6, X1 = bars.length - 0.4;
  const Y0 = 0;
  const Y1 = Math.max(4, Math.ceil(Math.max(...bars.map(b => b.value)) * 1.15));
  const MAXZ = 12;
  let vx0 = X0, vx1 = X1, vy0 = Y0, vy1 = Y1;
  let drag = null;

  holder.innerHTML = `<svg class="tv" viewBox="0 0 ${W} ${H}">
    <defs>
      <clipPath id="hClipPlot"><rect x="${pL}" y="0" width="${pW}" height="${pH}"/></clipPath>
      <clipPath id="hClipY"><rect x="0" y="0" width="${yW}" height="${pB}"/></clipPath>
      <clipPath id="hClipX"><rect x="${pL}" y="${pB}" width="${pW}" height="${xH}"/></clipPath>
    </defs>
    <rect x="${pL}" y="0" width="${pW}" height="${pH}" style="fill:var(--surface)"/>
    <g clip-path="url(#hClipPlot)"><g id="hGrid"></g><g id="hBars"></g></g>
    <rect x="0" y="0" width="${yW}" height="${H}" style="fill:var(--surface-2)"/>
    <rect x="${pL}" y="${pB}" width="${pW}" height="${xH}" style="fill:var(--surface-2)"/>
    <line class="axis-line" x1="${pL}" x2="${pL}" y1="0" y2="${H}"/>
    <line class="axis-line" x1="0" x2="${W}" y1="${pB}" y2="${pB}"/>
    <g clip-path="url(#hClipY)" id="hY"></g>
    <g clip-path="url(#hClipX)" id="hX"></g>
  </svg>`;
  const svg = holder.querySelector('svg');
  const gridEl = svg.querySelector('#hGrid');
  const barsEl = svg.querySelector('#hBars');
  const yEl = svg.querySelector('#hY');
  const xEl = svg.querySelector('#hX');
  const tip = $('chartTooltip');
  barsEl.innerHTML = bars.map((b, i) => `<rect class="h-bar" data-i="${i}" rx="4" style="fill:${b.color}"/>`).join('');
  const rects = Array.from(barsEl.children);

  const sx = i => pL + ((i - vx0) / (vx1 - vx0)) * pW;
  const sy = v => pB - ((v - vy0) / (vy1 - vy0)) * pH;
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
    gridEl.innerHTML = yt.map(v => `<line class="grid-line" x1="${pL}" x2="${pR}" y1="${sy(v).toFixed(1)}" y2="${sy(v).toFixed(1)}"/>`).join('');
    yEl.innerHTML = yt.map(v => `<text class="axis-text" font-size="11" x="${yW - 8}" y="${(sy(v) + 4).toFixed(1)}" text-anchor="end">${v}</text>`).join('');
    xEl.innerHTML = bars.map((b, i) => `<text class="axis-text" font-size="11" x="${sx(i).toFixed(1)}" y="${pB + 24}" text-anchor="middle">${b.label}</text>`).join('');
    bars.forEach((b, i) => {
      const x0 = sx(i - 0.3);
      const x1 = sx(i + 0.3);
      const top = sy(b.value);
      rects[i].setAttribute('x', x0.toFixed(1));
      rects[i].setAttribute('width', Math.max(1, x1 - x0).toFixed(1));
      rects[i].setAttribute('y', top.toFixed(1));
      rects[i].setAttribute('height', Math.max(0, pB - top).toFixed(1));
    });
  }

  function toSvg(e) {
    const r = svg.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
  }

  svg.addEventListener('wheel', e => {
    const p = toSvg(e);
    if (p.x < pL || p.y > pB) return;
    e.preventDefault();
    zoomAt(e.deltaY < 0 ? 1.18 : 1 / 1.18, ix(p.x), iy(p.y));
    render();
    tip.classList.remove('show');
  }, { passive: false });
  svg.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    const p = toSvg(e);
    if (p.x < pL || p.y > pB) return;
    drag = p;
    svg.setPointerCapture(e.pointerId);
    svg.classList.add('dragging');
    tip.classList.remove('show');
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
    const t = e.target.closest('.h-bar');
    if (!t || drag) return;
    const b = bars[Number(t.dataset.i)];
    const extra = b.note ? `<div class="tt-row"><span>Type</span><b>${b.note}</b></div>` : `<div class="tt-row"><span>Share</span><b>${b.share.toFixed(1)}%</b></div>`;
    tip.innerHTML = `<strong>${b.label}</strong><div class="tt-row"><span>Count</span><b>${b.value}</b></div>${extra}`;
    const rect = t.getBoundingClientRect();
    tip.style.left = rect.left + rect.width / 2 + window.scrollX + 'px';
    tip.style.top = rect.top + window.scrollY + 'px';
    tip.classList.add('show');
  });
  svg.addEventListener('mouseout', e => {
    if (e.target.closest('.h-bar')) tip.classList.remove('show');
  });
  render();
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
    gridEl.innerHTML = yt.map(v => `<line class="grid-line" x1="${pL}" x2="${pR}" y1="${sy(v).toFixed(1)}" y2="${sy(v).toFixed(1)}"/>`).join('') + xt.map(l => `<line class="grid-line" y1="0" y2="${pB}" x1="${sx(l - 1).toFixed(1)}" x2="${sx(l - 1).toFixed(1)}"/>`).join('');
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
  const items = store.Items.filter(it => it.student_id === studentId && it.subject === subject).map(it => ({ id: it.id, title: it.title, type: it.type, score: it.score, max: it.max_score, day: it.day })).sort((a, b) => a.day.localeCompare(b.day) || a.id - b.id);
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
  enhanceSelects($('gradesDirView'));
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
  rows.sort(dirSort === 'grade' ? (a, b) => a.grade - b.grade || byName(a, b) : dirSort === 'high' ? (a, b) => b.percent - a.percent || byName(a, b) : dirSort === 'low' ? (a, b) => a.percent - b.percent || byName(a, b) : byName);
  if (observer) observer.disconnect();
  if (!rows.length) {
    grid.innerHTML = '<div class="empty-state"><i class="fa-solid fa-magnifying-glass"></i><h3>No matches</h3></div>';
    return;
  }
  grid.innerHTML = rows.map(r => cardHtml(r, `${esc(r.letter)} · ${Number(r.percent).toFixed(1)}%`)).join('');
  observeCards(grid);
}

function rerenderCurrent() {
  if (view === 'list' && students.length) renderList();
  else if (view === 'gradesDir') renderDir();
}

function openSettings() {
  updateSettingsTabs();
  $('overlay').hidden = false;
}

function closeSettings() {
  $('overlay').hidden = true;
}

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
    { label: 'Dashboard', sub: 'Page', icon: 'fa-chart-pie', run: () => openDashboard() },
    { label: 'Student Info', sub: 'Page', icon: 'fa-id-card', run: () => { if (students.length) openStudent(students[0].id); } }
  ];
  allSubjects.forEach(s => list.push({ label: 'Grades · ' + s, sub: 'Page', icon: 'fa-graduation-cap', run: () => openGradesDir(s) }));
  return list;
}

function computePalette(raw) {
  let mode = 'all';
  let term = raw.trim().toLowerCase();
  if (term[0] === '@') {
    mode = 'people';
    term = term.slice(1).trim();
  } else if (term[0] === '?') {
    mode = 'settings';
    term = term.slice(1).trim();
  }
  const groups = [];
  if (mode === 'all') {
    const pages = pageEntries().filter(p => !term || p.label.toLowerCase().includes(term));
    if (pages.length) groups.push({ title: 'Pages', items: pages });
  }
  if ((mode === 'all' && term) || mode === 'people') {
    const people = students.filter(s => !term || haystack(s).includes(term)).slice(0, 8).map(s => ({ label: `${s.first_name} ${s.last_name}`, sub: `${gradeName(s.grade)} · ${studentCode(s)}`, icon: 'fa-user', run: () => openStudent(s.id) }));
    if (people.length) groups.push({ title: 'People', items: people });
  }
  if ((mode === 'all' && term) || mode === 'settings') {
    const found = SETTINGS_INDEX.filter(x => tabAllowed(x.tab) && (!term || (x.label + ' ' + x.keys).toLowerCase().includes(term))).map(x => ({ label: x.label, sub: 'Setting', icon: 'fa-sliders', run: () => revealSetting(x) }));
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
  if (!session) return;
  $('palette').hidden = false;
  $('paletteInput').value = '';
  paletteIdx = 0;
  renderPalette();
  $('paletteInput').focus();
}

function closePalette() {
  $('palette').hidden = true;
}

function runPalette(i) {
  const it = paletteItems[i];
  if (!it) return;
  closePalette();
  it.run();
}

function openShortcuts() {
  $('shortcuts').hidden = false;
}

function closeShortcuts() {
  $('shortcuts').hidden = true;
}

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
  $('navInfo').addEventListener('click', () => { if (students.length) openStudent(students[0].id); });
  $('dashList').addEventListener('click', onDashMenu);
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
  bindSetting('recordsToggle', 'change', t => {
    showRecords = t.checked;
    save('showRecords', showRecords);
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

  $('sheetLink').value = `https://docs.google.com/spreadsheets/d/${SHEET_ID || DEFAULT_SHEET_ID}/edit`;
  $('connectBtn').addEventListener('click', () => connectSheet($('sheetLink').value));
  $('xlsxBtn').addEventListener('click', () => $('xlsxInput').click());
  $('xlsxInput').addEventListener('change', e => {
    const f = e.target.files[0];
    if (f) importXlsx(f);
  });
  window.addEventListener('dragover', e => e.preventDefault());
  window.addEventListener('drop', e => e.preventDefault());

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
}

const deskState = { slotKey: '', day: '', asgKey: '', showForm: false };

function schoolAverage() {
  const e = store.Grades.reduce((a, g) => a + g.earned, 0);
  const p = store.Grades.reduce((a, g) => a + g.possible, 0);
  return p ? (e / p) * 100 : 0;
}

function statCard(icon, value, label) {
  return `<div class="stat-card popout"><i class="fa-solid ${icon}"></i><b>${value}</b><span>${label}</span></div>`;
}

function incidentRow(r) {
  return `<div class="rec-item click" data-sid="${r.student_id}"><span class="rec-date">${esc(shortDateFull(r.date))}</span><div class="rec-main"><b>${esc(r.student)}</b><span>${esc(r.incident)} · ${esc(r.action)}</span></div><span class="type-badge ${r.kind.toLowerCase()}">${r.kind}</span></div>`;
}

function recentIncidentCount() {
  let max = '';
  store.Records.forEach(r => { if (r.date > max) max = r.date; });
  if (!max) return 0;
  const d = new Date(max + 'T12:00:00');
  d.setDate(d.getDate() - 30);
  const cut = d.toISOString().slice(0, 10);
  return store.Records.filter(r => r.date >= cut).length;
}

function openDashboard(slotKey) {
  const t = currentTeacher();
  if (!t) return;
  if (isAdminUser(t)) renderAdminDash(t);
  else renderTeacherDash(t, slotKey);
}

function renderAdminDash(t) {
  const recs = store.Records.slice().sort((a, b) => b.date.localeCompare(a.date));
  const avg = schoolAverage();
  const tiles = MODULES.filter(m => m.roles.includes('admin')).map(m => `<button type="button" class="hub-tile popout" data-mod="${m.id}"><i class="fa-solid ${m.icon}"></i><span>${m.title}</span></button>`).join('');
  $('dashboardView').innerHTML = `
    <div class="dash-hello"><h2>Hi, ${esc(t.name)}</h2><span>Admin dashboard</span></div>
    <div class="stat-grid">
      ${statCard('fa-user-graduate', store.Students.length, 'Total Students')}
      ${statCard('fa-chalkboard-user', store.Teachers.length, 'Total Staff')}
      ${statCard('fa-chart-line', `${letterOf(avg)} · ${avg.toFixed(1)}%`, 'Average Grade')}
      ${statCard('fa-triangle-exclamation', recentIncidentCount(), 'Recent Incidents')}
    </div>
    <div class="dash-cols">
      <div class="card popout"><h3><i class="fa-solid fa-clipboard-list"></i> Recent Incidents</h3><div class="rec-list">${recs.slice(0, 8).map(incidentRow).join('') || '<div class="rec-empty"><i class="fa-regular fa-circle-check"></i><span>No records</span></div>'}</div></div>
      <div class="card"><h3><i class="fa-solid fa-grip"></i> School management</h3><div class="hub-grid">${tiles}</div></div>
    </div>`;
  showView('dashboard', 'Dashboard');
  window.scrollTo(0, 0);
  $('dashboardView').onclick = e => {
    const tile = e.target.closest('[data-mod]');
    if (tile) {
      openModule(tile.dataset.mod);
      return;
    }
    const row = e.target.closest('[data-sid]');
    if (row && Number(row.dataset.sid)) openStudent(Number(row.dataset.sid));
  };
}

function deskSlot() {
  const t = currentTeacher();
  return t ? teacherSlots(t).find(s => s.key === deskState.slotKey) || null : null;
}

function subjectAssignments(subject) {
  return store.Assignments.filter(a => a.subject === subject).sort((a, b) => b.day.localeCompare(a.day) || a.title.localeCompare(b.title));
}

function renderTeacherDash(t, slotKey) {
  const slots = teacherSlots(t);
  const cur = currentPeriodNo();
  if (slotKey === undefined) slotKey = (slots.find(s => s.period_no === cur) || {}).key || '';
  deskState.slotKey = slotKey;
  const day = deskState.day || activeDay();
  const mine = students.length;
  let present = 0;
  let total = 0;
  store.Attendance.forEach(a => {
    if (a.day !== day || !slots.some(s => s.subject === a.subject && s.period_no === a.period)) return;
    total++;
    if (a.status === 'Present') present++;
  });
  const subjects = new Set(slots.map(s => s.subject));
  const upcoming = store.Assignments.filter(a => subjects.has(a.subject) && a.day > day).sort((a, b) => a.day.localeCompare(b.day)).slice(0, 5);
  const upList = upcoming.length ? upcoming : store.Assignments.filter(a => subjects.has(a.subject) && a.day <= day).sort((a, b) => b.day.localeCompare(a.day)).slice(0, 5);
  const upRows = upList.map(a => `<div class="rec-item"><span class="rec-date">${esc(shortDateFull(a.day))}</span><div class="rec-main"><b>${esc(a.type)} · ${esc(a.title)}</b><span>${esc(a.subject)} · out of ${a.max}</span></div></div>`).join('') || '<div class="rec-empty"><i class="fa-regular fa-calendar"></i><span>No assignments</span></div>';
  const chips = slots.map(s => `<button type="button" class="class-chip${s.key === slotKey ? ' on' : ''}${s.period_no === cur ? ' now' : ''}" data-slot="${esc(s.key)}"><b>Period ${s.period_no}</b><span>${esc(s.subject)}</span><em>${slotTime(s.period_no)}</em></button>`).join('') || '<div class="rec-empty"><i class="fa-regular fa-calendar"></i><span>No classes</span></div>';
  $('dashboardView').innerHTML = `
    <div class="dash-hello"><h2>Hi, ${esc(t.name)}</h2><span>${esc(t.class)}</span></div>
    <div class="stat-grid three">
      ${statCard('fa-user-graduate', mine, 'My Students')}
      ${statCard('fa-clipboard-user', total ? Math.round((present / total) * 100) + '%' : '-', "Today's Attendance")}
      ${statCard('fa-list-check', upList.length, 'Upcoming Assignments')}
    </div>
    <div class="card"><h3><i class="fa-solid fa-calendar-day"></i> Today's Classes <small>${esc(shortDateFull(day))}</small></h3><div class="class-chips">${chips}</div></div>
    <div id="deskBody"></div>
    <div class="card"><h3><i class="fa-solid fa-calendar-check"></i> Upcoming Assignments</h3><div class="rec-list">${upRows}</div></div>`;
  showView('dashboard', 'Dashboard');
  window.scrollTo(0, 0);
  $('dashboardView').onclick = onDeskClick;
  $('dashboardView').onchange = onDeskChange;
  $('dashboardView').onkeydown = e => {
    if (e.key === 'Enter' && e.target.closest('.asg-form')) {
      e.preventDefault();
      createAssignment();
    }
  };
  renderDesk();
}

function renderDesk() {
  const slot = deskSlot();
  const host = $('deskBody');
  if (!host) return;
  if (!slot) {
    host.innerHTML = '';
    return;
  }
  const day = deskState.day || activeDay();
  const list = slotStudents(slot);
  const rows = list.map(s => {
    const a = attIndex.get(attKey(slot.subject, day, slot.period_no, s.id));
    const cur = a ? a.status : 'Present';
    const opts = [['Present', 'Present'], ['Late', 'Tardy'], ['Absent', 'Absent']];
    if (cur === 'Excused') opts.push(['Excused', 'Excused']);
    return `<div class="att-row" data-id="${s.id}"><span class="att-name">${esc(s.last_name)}, ${esc(s.first_name)}</span><span class="att-btns">${opts.map(o => `<button type="button" class="att-btn ${o[1].toLowerCase()}${cur === o[1] ? ' on' : ''}" data-status="${o[1]}">${o[0]}</button>`).join('')}</span></div>`;
  }).join('') || '<div class="rec-empty"><i class="fa-regular fa-user"></i><span>No students</span></div>';

  const asgs = subjectAssignments(slot.subject);
  if (!asgs.some(a => asgKey(a) === deskState.asgKey)) deskState.asgKey = asgs.length ? asgKey(asgs[0]) : '';
  const asg = asgIndex.get(deskState.asgKey);
  const asgOpts = asgs.map(a => `<option value="${esc(asgKey(a))}">${esc(shortDate(a.day))} · ${esc(a.type)} - ${esc(a.title)} (out of ${a.max})</option>`).join('');
  const typeOpts = ASG_TYPES.map(t => `<option value="${t}">${t}</option>`).join('');
  const form = deskState.showForm ? `<div class="asg-form"><select id="asgType">${typeOpts}</select><input class="text-input" id="asgMax" type="number" min="1" placeholder="Max score"><input class="text-input" id="asgDue" type="date" value="${esc(day)}"><button type="button" class="btn" id="asgCreate"><i class="fa-solid fa-check"></i> Create</button></div>` : '';
  let gradeRows = '<div class="rec-empty"><i class="fa-regular fa-file-lines"></i><span>No assignments</span></div>';
  if (asg) {
    gradeRows = list.map(s => {
      const en = asg.entries.find(x => x.student_id === s.id);
      const sc = en && en.score !== null ? en.score : '';
      const pct = sc !== '' ? Math.round((sc / asg.max) * 100) + '%' : '';
      return `<div class="grade-row" data-id="${s.id}"><span class="att-name">${esc(s.last_name)}, ${esc(s.first_name)}</span><span class="score-wrap"><input class="text-input score-in" type="number" min="0" step="0.5" value="${sc}"><em>/ ${asg.max}</em></span><input class="text-input ret-in" type="date" value="${esc(en ? isoDate(en.returned) || '' : '')}"><span class="pct">${pct}</span></div>`;
    }).join('');
  }
  host.innerHTML = `<div class="desk">
    <div class="card"><h3><i class="fa-solid fa-clipboard-user"></i> Attendance <small>${esc(slot.subject)} · Period ${slot.period_no}</small></h3>
      <div class="desk-tools"><input class="text-input tool-date" type="date" id="deskDay" value="${esc(day)}"><button type="button" class="btn" id="submitAtt"><i class="fa-solid fa-check"></i> Submit</button></div>
      <div class="att-list">${rows}</div></div>
    <div class="card"><h3><i class="fa-solid fa-table-cells"></i> Grade entry <small>${esc(slot.subject)}</small></h3>
      <div class="desk-tools"><select id="deskAsg">${asgOpts || '<option value="">None</option>'}</select><button type="button" class="btn ghost" id="newAsg"><i class="fa-solid fa-plus"></i> Add Assignment</button></div>
      ${form}
      <div class="grade-list">${gradeRows}</div></div>
  </div>`;
  enhanceSelects(host);
  if ($('deskAsg')) $('deskAsg').value = deskState.asgKey;
  if ($('asgType')) $('asgType').value = ASG_TYPES[0];
}

function onDeskClick(e) {
  const chip = e.target.closest('[data-slot]');
  if (chip) {
    deskState.slotKey = chip.dataset.slot;
    openDashboard(chip.dataset.slot);
    return;
  }
  const rec = e.target.closest('[data-sid]');
  if (rec && Number(rec.dataset.sid)) {
    openStudent(Number(rec.dataset.sid));
    return;
  }
  const slot = deskSlot();
  if (!slot) return;
  const day = deskState.day || activeDay();
  const btn = e.target.closest('.att-btn');
  if (btn) {
    const sid = Number(btn.closest('.att-row').dataset.id);
    const s = studentById[sid];
    const status = btn.dataset.status;
    commitEdit({ type: 'attendance', subject: slot.subject, day: day, period: slot.period_no, sid: sid, status: status }, { action: 'attendance', subject: slot.subject, day: day, period: slot.period_no, first: s.first_name, last: s.last_name, status: status });
    btn.parentNode.querySelectorAll('.att-btn').forEach(b => b.classList.toggle('on', b === btn));
    return;
  }
  if (e.target.closest('#submitAtt')) {
    slotStudents(slot).forEach(s => {
      if (attIndex.has(attKey(slot.subject, day, slot.period_no, s.id))) return;
      commitEdit({ type: 'attendance', subject: slot.subject, day: day, period: slot.period_no, sid: s.id, status: 'Present' }, { action: 'attendance', subject: slot.subject, day: day, period: slot.period_no, first: s.first_name, last: s.last_name, status: 'Present' });
    });
    return;
  }
  if (e.target.closest('#newAsg')) {
    deskState.showForm = !deskState.showForm;
    renderDesk();
    return;
  }
  if (e.target.closest('#asgCreate')) createAssignment();
}

function onDeskChange(e) {
  const slot = deskSlot();
  if (!slot) return;
  if (e.target.id === 'deskDay') {
    deskState.day = e.target.value || '';
    renderDesk();
    return;
  }
  if (e.target.id === 'deskAsg') {
    deskState.asgKey = e.target.value;
    renderDesk();
    return;
  }
  const row = e.target.closest('.grade-row');
  if (!row || !(e.target.classList.contains('score-in') || e.target.classList.contains('ret-in'))) return;
  const asg = asgIndex.get(deskState.asgKey);
  if (!asg) return;
  const sid = Number(row.dataset.id);
  const s = studentById[sid];
  const raw = row.querySelector('.score-in').value;
  const score = raw === '' ? null : Math.max(0, Number(raw));
  const returned = row.querySelector('.ret-in').value;
  row.querySelector('.pct').textContent = score === null ? '' : Math.round((score / asg.max) * 100) + '%';
  commitEdit({ type: 'score', key: deskState.asgKey, sid: sid, score: score, returned: returned }, { action: 'score', subject: asg.subject, day: asg.day, type: asg.type, title: asg.title, max: asg.max, first: s.first_name, last: s.last_name, score: score, returned: returned });
}

async function createAssignment() {
  const slot = deskSlot();
  if (!slot) return;
  const type = $('asgType').value;
  const max = Number($('asgMax').value);
  const day = $('asgDue').value;
  if (!(max > 0) || !isoDate(day)) {
    toast('Enter a max score and a due date.');
    return;
  }
  const title = `${type} ${store.Assignments.filter(a => a.subject === slot.subject && a.type === type).length + 1}`;
  const sids = subjectStudentIds(slot.subject);
  const payload = { action: 'assignment', subject: slot.subject, day: day, type: type, title: title, max: max, students: sids.map(i => ({ first: studentById[i].first_name, last: studentById[i].last_name })) };
  deskState.asgKey = asgKey({ subject: slot.subject, day: day, type: type, title: title });
  deskState.showForm = false;
  await commitEdit({ type: 'assignment', subject: slot.subject, day: day, atype: type, title: title, max: max, sids: sids }, payload);
  renderDesk();
}

const BADGE_ICONS = { 'Star Student': 'fa-star', 'Perfect Attendance': 'fa-calendar-check', 'Helping Hand': 'fa-hand-holding-heart', 'Hifz Milestone': 'fa-book-quran', 'Top Scholar': 'fa-graduation-cap' };
const DEFAULT_LINKS = [
  { name: 'IXL', url: 'https://www.ixl.com', icon: 'fa-square-root-variable' },
  { name: 'Khan Academy', url: 'https://www.khanacademy.org', icon: 'fa-graduation-cap' },
  { name: 'Google Classroom', url: 'https://classroom.google.com', icon: 'fa-chalkboard' },
  { name: 'Google Drive', url: 'https://drive.google.com', icon: 'fa-folder-open' },
  { name: 'Gmail', url: 'https://mail.google.com', icon: 'fa-envelope' },
  { name: 'Google Calendar', url: 'https://calendar.google.com', icon: 'fa-calendar-days' },
  { name: 'Zoom', url: 'https://zoom.us', icon: 'fa-video' },
  { name: 'Albaseerah', url: 'https://albaseerah.org', icon: 'fa-mosque' }
];
const MODULES = [
  { id: 'finder', title: 'Student Finder', icon: 'fa-magnifying-glass', roles: ['admin', 'staff'], custom: 'finder' },
  { id: 'admissions', title: 'Admissions', icon: 'fa-file-signature', roles: ['admin'], board: ['Applied', 'Review', 'Interview', 'Accepted', 'Enrolled'], fields: [{ k: 'applicant', l: 'Applicant', t: 'text' }, { k: 'grade', l: 'Grade', t: 'grade' }, { k: 'guardian', l: 'Guardian', t: 'text' }, { k: 'contact', l: 'Contact', t: 'text' }] },
  { id: 'staff', title: 'Staff Directory', icon: 'fa-address-book', roles: ['admin'], custom: 'staff' },
  { id: 'needs', title: 'Individual Needs', icon: 'fa-universal-access', roles: ['admin'], fields: [{ k: 'student', l: 'Student', t: 'student' }, { k: 'type', l: 'Type', t: 'select', o: ['IEP', '504 Plan', 'Accommodation', 'Medical', 'Language Support'] }, { k: 'details', l: 'Details', t: 'textarea' }, { k: 'review', l: 'Review date', t: 'date' }] },
  { id: 'behavior', title: 'Behavior', icon: 'fa-scale-balanced', roles: ['admin', 'staff'], fields: [{ k: 'student', l: 'Student', t: 'student' }, { k: 'level', l: 'Level', t: 'select', o: ['Positive', 'Minor', 'Major'] }, { k: 'description', l: 'Description', t: 'textarea' }, { k: 'action', l: 'Action taken', t: 'text' }, { k: 'date', l: 'Date', t: 'date' }] },
  { id: 'rubrics', title: 'Rubrics', icon: 'fa-table-list', roles: ['admin', 'staff'], fields: [{ k: 'name', l: 'Rubric', t: 'text' }, { k: 'subject', l: 'Subject', t: 'subject' }, { k: 'criteria', l: 'Criteria (one per line)', t: 'textarea' }] },
  { id: 'lessons', title: 'Lesson Plans', icon: 'fa-book-open', roles: ['admin', 'staff'], fields: [{ k: 'name', l: 'Lesson', t: 'text' }, { k: 'subject', l: 'Subject', t: 'subject' }, { k: 'date', l: 'Date', t: 'date' }, { k: 'objectives', l: 'Objectives', t: 'textarea' }, { k: 'activities', l: 'Activities', t: 'textarea' }] },
  { id: 'exams', title: 'Exams', icon: 'fa-file-pen', roles: ['admin', 'staff'], fields: [{ k: 'name', l: 'Exam', t: 'text' }, { k: 'subject', l: 'Subject', t: 'subject' }, { k: 'date', l: 'Date', t: 'date' }, { k: 'max', l: 'Max score', t: 'number' }, { k: 'notes', l: 'Notes', t: 'textarea' }] },
  { id: 'timetable', title: 'Timetable', icon: 'fa-calendar-week', roles: ['admin', 'staff'], custom: 'timetable' },
  { id: 'badges', title: 'Badges', icon: 'fa-award', roles: ['admin', 'staff'], fields: [{ k: 'student', l: 'Student', t: 'student' }, { k: 'badge', l: 'Badge', t: 'select', o: Object.keys(BADGE_ICONS) }, { k: 'note', l: 'Note', t: 'text' }] },
  { id: 'helpdesk', title: 'Help Desk', icon: 'fa-headset', roles: ['admin', 'staff'], board: ['Open', 'In Progress', 'Resolved'], fields: [{ k: 'title', l: 'Request', t: 'text' }, { k: 'category', l: 'Category', t: 'select', o: ['IT', 'Facilities', 'Admin', 'Supplies'] }, { k: 'priority', l: 'Priority', t: 'select', o: ['Low', 'Normal', 'High'] }, { k: 'details', l: 'Details', t: 'textarea' }] },
  { id: 'links', title: 'Info Grid', icon: 'fa-table-cells-large', roles: ['admin', 'staff'], custom: 'links' },
  { id: 'messenger', title: 'Messenger', icon: 'fa-paper-plane', roles: ['admin', 'staff'], custom: 'messenger' }
];

let moduleId = '';

function modData(id) {
  try {
    const v = JSON.parse(localStorage.getItem('mod_' + id) || '[]');
    return Array.isArray(v) ? v : [];
  } catch (e) {
    return [];
  }
}

function saveMod(id, list) {
  localStorage.setItem('mod_' + id, JSON.stringify(list));
}

function userRole() {
  return isAdminUser(currentTeacher()) ? 'admin' : 'staff';
}

function buildToolsMenu() {
  $('toolsList').innerHTML = MODULES.filter(m => m.roles.includes(userRole())).map(m => `<button type="button" class="subnav-item" data-mod="${m.id}">${m.title}</button>`).join('');
}

function fieldControl(f) {
  const id = 'mf_' + f.k;
  if (f.t === 'textarea') return `<textarea class="text-input" id="${id}" rows="3"></textarea>`;
  if (f.t === 'select') return `<select id="${id}">${f.o.map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('')}</select>`;
  if (f.t === 'student') return `<select id="${id}">${students.map(s => `<option value="${s.id}">${esc(s.last_name)}, ${esc(s.first_name)}</option>`).join('')}</select>`;
  if (f.t === 'grade') return `<select id="${id}">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => `<option value="${n}">${gradeName(n)}</option>`).join('')}</select>`;
  if (f.t === 'subject') return `<select id="${id}">${(allSubjects.length ? allSubjects : ['General']).map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('')}</select>`;
  return `<input class="text-input" id="${id}" type="${f.t === 'number' ? 'number' : f.t === 'date' ? 'date' : 'text'}"${f.t === 'date' ? ` value="${todayISO()}"` : ''}>`;
}

function fieldDisplay(f, v) {
  if (f.t === 'student') {
    const s = studentById[Number(v)];
    return s ? `${s.first_name} ${s.last_name}` : '';
  }
  if (f.t === 'grade') return gradeName(v);
  return String(v == null ? '' : v);
}

function entryHtml(m, e) {
  const first = m.fields[0];
  const head = fieldDisplay(first, e[first.k]);
  const meta = m.fields.slice(1).map(f => {
    const v = fieldDisplay(f, e[f.k]);
    if (!v) return '';
    if (f.t === 'textarea') return `<p class="mod-text">${esc(v).replace(/\n/g, '<br>')}</p>`;
    return `<span class="mod-meta"><em>${f.l}</em>${esc(v)}</span>`;
  }).join('');
  const icon = m.id === 'badges' ? `<i class="fa-solid ${BADGE_ICONS[e.badge] || 'fa-award'} badge-ico"></i>` : '';
  const stat = m.board ? `<select class="mod-status" data-id="${e.id}">${m.board.map(b => `<option value="${esc(b)}"${e.status === b ? ' selected' : ''}>${esc(b)}</option>`).join('')}</select>` : '';
  const tag = m.id === 'exams' && e.date ? `<span class="type-badge ${e.date >= todayISO() ? 'quiz' : 'homework'}">${e.date >= todayISO() ? 'Upcoming' : 'Past'}</span>` : m.id === 'behavior' ? `<span class="type-badge ${e.level === 'Major' ? 'nurse' : e.level === 'Minor' ? 'office' : 'homework'}">${esc(e.level)}</span>` : '';
  return `<div class="mod-entry popout" data-id="${e.id}">${icon}<div class="mod-body"><div class="mod-head"><b>${esc(head)}</b>${tag}</div>${meta}</div><div class="mod-side">${stat}<button type="button" class="icon-btn mod-del" aria-label="Delete"><i class="fa-solid fa-trash"></i></button></div></div>`;
}

function renderModuleList(m) {
  const list = modData(m.id).slice().sort((a, b) => b.created - a.created);
  const form = `<form class="card mod-form" id="modForm"><h3><i class="fa-solid ${m.icon}"></i> New entry</h3><div class="mod-fields">${m.fields.map(f => `<div class="field${f.t === 'textarea' ? ' wide' : ''}"><label for="mf_${f.k}">${f.l}</label>${fieldControl(f)}</div>`).join('')}</div><div class="import-buttons"><button class="btn" type="submit"><i class="fa-solid fa-plus"></i> Add</button></div></form>`;
  let body;
  if (m.board) {
    body = `<div class="board" style="--cols:${m.board.length}">${m.board.map(col => `<div class="board-col"><h4>${esc(col)} <small>${list.filter(e => e.status === col).length}</small></h4>${list.filter(e => e.status === col).map(e => entryHtml(m, e)).join('') || '<div class="rec-empty"><span>Empty</span></div>'}</div>`).join('')}</div>`;
  } else {
    body = `<div class="mod-list">${list.map(e => entryHtml(m, e)).join('') || '<div class="rec-empty"><i class="fa-regular fa-folder-open"></i><span>Nothing here yet</span></div>'}</div>`;
  }
  $('moduleView').innerHTML = `<div class="intro"><h2>${m.title}</h2></div>${form}${body}`;
  enhanceSelects($('moduleView'));
  $('modForm').onsubmit = ev => {
    ev.preventDefault();
    const entry = { id: 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), created: Date.now() };
    m.fields.forEach(f => { entry[f.k] = $('mf_' + f.k).value.trim(); });
    if (!entry[m.fields[0].k]) {
      toast('Fill in the first field.');
      return;
    }
    if (m.board) entry.status = m.board[0];
    const all = modData(m.id);
    all.push(entry);
    saveMod(m.id, all);
    toast('Added.');
    renderModuleList(m);
  };
  $('moduleView').onclick = ev => {
    const del = ev.target.closest('.mod-del');
    if (!del) return;
    const id = del.closest('.mod-entry').dataset.id;
    saveMod(m.id, modData(m.id).filter(x => x.id !== id));
    renderModuleList(m);
  };
  $('moduleView').onchange = ev => {
    if (!ev.target.classList.contains('mod-status')) return;
    const all = modData(m.id);
    const en = all.find(x => x.id === ev.target.dataset.id);
    if (en) en.status = ev.target.value;
    saveMod(m.id, all);
    renderModuleList(m);
  };
}

function renderFinder() {
  $('moduleView').innerHTML = `<div class="intro"><h2>Student Finder</h2></div><div class="card"><label class="search finder-search"><i class="fa-solid fa-magnifying-glass"></i><input type="text" id="finderInput" placeholder="Name, email, grade or ID" autocomplete="off"></label><div class="finder-list" id="finderList"></div></div>`;
  const draw = () => {
    const term = $('finderInput').value.trim().toLowerCase();
    const found = students.filter(s => !term || haystack(s).includes(term)).slice(0, 40);
    $('finderList').innerHTML = found.map(s => `<button type="button" class="finder-item" data-id="${s.id}"><img class="sc-avatar" src="${DEFAULT_PFP}" alt=""><span class="finder-name">${esc(s.first_name)} ${esc(s.last_name)}</span><span class="pi-sub">${gradeName(s.grade)} · ${studentCode(s)}</span>${s.has_hifz ? '<span class="chip gold">Hifz</span>' : ''}</button>`).join('') || '<div class="rec-empty"><span>No matches</span></div>';
  };
  $('finderInput').oninput = draw;
  $('finderList').onclick = ev => {
    const b = ev.target.closest('.finder-item');
    if (b) openStudent(Number(b.dataset.id));
  };
  draw();
  $('finderInput').focus();
}

function renderStaff() {
  $('moduleView').innerHTML = `<div class="intro"><h2>Staff Directory</h2></div><div class="card"><label class="search finder-search"><i class="fa-solid fa-magnifying-glass"></i><input type="text" id="staffInput" placeholder="Search staff" autocomplete="off"></label></div><div id="staffBody"></div>`;
  const draw = () => {
    const term = $('staffInput').value.trim().toLowerCase();
    const groups = new Map();
    store.Teachers.filter(t => !term || `${t.name} ${t.class} ${t.email} ${t.username}`.toLowerCase().includes(term)).forEach(t => {
      const dep = isAdminUser(t) ? 'Administration' : t.class || 'General';
      if (!groups.has(dep)) groups.set(dep, []);
      groups.get(dep).push(t);
    });
    $('staffBody').innerHTML = Array.from(groups.entries()).map(g => `<div class="card"><h3><i class="fa-solid fa-building-user"></i> ${esc(g[0])} <small>${g[1].length}</small></h3><div class="staff-grid">${g[1].map(t => `<div class="staff-card popout"><img class="sc-avatar" src="${DEFAULT_PFP}" alt=""><div><b>${esc(t.name)}</b><span>${esc(t.username)} · ${esc(t.role)}</span><a href="${gmailLink(t.email)}" target="_blank" rel="noopener">${esc(t.email)}</a></div></div>`).join('')}</div></div>`).join('') || '<div class="rec-empty"><span>No matches</span></div>';
  };
  $('staffInput').oninput = draw;
  draw();
}

function renderTimetable() {
  const t = currentTeacher();
  const admin = isAdminUser(t);
  const slots = admin ? [] : teacherSlots(t);
  const cur = currentPeriodNo();
  const tm = teacherMap();
  const tiers = ['primary', 'middle', 'upper'];
  const draw = tier => {
    const rows = store.Periods.filter(p => p.tier === tier).sort((a, b) => a.period_no - b.period_no).map(p => {
      const mine = !admin && slots.some(s => s.subject === p.subject && s.period_no === p.period_no);
      return `<div class="tt-line${p.period_no === cur ? ' now' : ''}${mine ? ' mine' : ''}"><span class="p-no">Period ${p.period_no}</span><span class="tt-time">${slotTime(p.period_no)}</span><span class="p-sub">${esc(p.subject)}</span><span class="p-t">${esc((tm[p.teacher_id] || {}).name || '')}</span></div>`;
    }).join('');
    $('ttBody').innerHTML = rows || '<div class="rec-empty"><span>No periods</span></div>';
  };
  const link = localStorage.getItem('calLink') || '';
  $('moduleView').innerHTML = `<div class="intro"><h2>Timetable</h2></div>
    <div class="card"><div class="desk-tools"><select id="ttTier">${tiers.map(x => `<option value="${x}">${x.charAt(0).toUpperCase() + x.slice(1)}</option>`).join('')}</select></div><div id="ttBody"></div></div>
    <div class="card"><h3><i class="fa-brands fa-google"></i> Google Calendar</h3><div class="desk-tools"><input class="text-input" id="calInput" type="text" placeholder="Calendar embed link" value="${esc(link)}"><button type="button" class="btn" id="calSave"><i class="fa-solid fa-plug"></i> Connect</button></div><div id="calBody">${link ? `<iframe class="cal-frame" src="${esc(link)}" title="Calendar"></iframe>` : '<div class="rec-empty"><i class="fa-regular fa-calendar"></i><span>No calendar connected</span></div>'}</div></div>`;
  enhanceSelects($('moduleView'));
  const firstTier = slots.length ? (store.Periods.find(p => p.subject === slots[0].subject && p.period_no === slots[0].period_no) || {}).tier || 'primary' : 'primary';
  $('ttTier').value = firstTier;
  draw(firstTier);
  $('ttTier').onchange = ev => draw(ev.target.value);
  $('calSave').onclick = () => {
    const v = $('calInput').value.trim();
    localStorage.setItem('calLink', v);
    $('calBody').innerHTML = v ? `<iframe class="cal-frame" src="${esc(v)}" title="Calendar"></iframe>` : '<div class="rec-empty"><i class="fa-regular fa-calendar"></i><span>No calendar connected</span></div>';
    toast(v ? 'Calendar connected.' : 'Calendar removed.');
  };
}

function renderLinks() {
  const custom = modData('links');
  const all = DEFAULT_LINKS.concat(custom.map(c => ({ name: c.name, url: c.url, icon: 'fa-link', id: c.id })));
  $('moduleView').innerHTML = `<div class="intro"><h2>Info Grid</h2></div><div class="link-grid">${all.map(l => `<a class="link-tile popout" href="${esc(l.url)}" target="_blank" rel="noopener"><i class="fa-solid ${l.icon}"></i><span>${esc(l.name)}</span>${l.id ? `<button type="button" class="icon-btn link-del" data-id="${l.id}" aria-label="Remove"><i class="fa-solid fa-xmark"></i></button>` : ''}</a>`).join('')}</div>
    <form class="card mod-form" id="linkForm"><h3><i class="fa-solid fa-plus"></i> Add link</h3><div class="mod-fields"><div class="field"><label for="lkName">Name</label><input class="text-input" id="lkName" type="text"></div><div class="field"><label for="lkUrl">URL</label><input class="text-input" id="lkUrl" type="text" placeholder="https://"></div></div><div class="import-buttons"><button class="btn" type="submit"><i class="fa-solid fa-plus"></i> Add</button></div></form>`;
  $('linkForm').onsubmit = ev => {
    ev.preventDefault();
    const name = $('lkName').value.trim();
    let url = $('lkUrl').value.trim();
    if (!name || !url) {
      toast('Enter a name and a URL.');
      return;
    }
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    const list = modData('links');
    list.push({ id: 'l' + Date.now().toString(36), name: name, url: url });
    saveMod('links', list);
    renderLinks();
  };
  $('moduleView').onclick = ev => {
    const d = ev.target.closest('.link-del');
    if (!d) return;
    ev.preventDefault();
    saveMod('links', modData('links').filter(x => x.id !== d.dataset.id));
    renderLinks();
  };
}

function renderMessenger() {
  const posts = modData('messenger').slice().sort((a, b) => b.created - a.created);
  $('moduleView').innerHTML = `<div class="intro"><h2>Messenger</h2></div>
    <form class="card mod-form" id="msgForm"><h3><i class="fa-solid fa-paper-plane"></i> Compose</h3><div class="mod-fields">
      <div class="field"><label for="msgTo">Audience</label><select id="msgTo"><option value="staff">All staff</option><option value="students">All students</option></select></div>
      <div class="field"><label for="msgVia">Channel</label><select id="msgVia"><option value="announcement">Announcement</option><option value="email">Email</option></select></div>
      <div class="field wide"><label for="msgSubject">Subject</label><input class="text-input" id="msgSubject" type="text"></div>
      <div class="field wide"><label for="msgBody">Message</label><textarea class="text-input" id="msgBody" rows="4"></textarea></div></div>
      <div class="import-buttons"><button class="btn" type="submit"><i class="fa-solid fa-paper-plane"></i> Send</button></div></form>
    <div class="card"><h3><i class="fa-solid fa-bullhorn"></i> Announcements</h3><div class="mod-list">${posts.map(p => `<div class="mod-entry"><div class="mod-body"><div class="mod-head"><b>${esc(p.subject)}</b><span class="type-badge quiz">${esc(p.to)}</span></div><p class="mod-text">${esc(p.body).replace(/\n/g, '<br>')}</p><span class="mod-meta"><em>${esc(p.by)}</em>${esc(new Date(p.created).toLocaleString('en-US'))}</span></div></div>`).join('') || '<div class="rec-empty"><i class="fa-regular fa-bell"></i><span>No announcements</span></div>'}</div></div>`;
  enhanceSelects($('moduleView'));
  $('msgForm').onsubmit = ev => {
    ev.preventDefault();
    const subject = $('msgSubject').value.trim();
    const body = $('msgBody').value.trim();
    if (!subject || !body) {
      toast('Enter a subject and a message.');
      return;
    }
    const to = $('msgTo').value;
    const via = $('msgVia').value;
    const list = modData('messenger');
    list.push({ created: Date.now(), subject: subject, body: body, to: to === 'staff' ? 'All staff' : 'All students', by: currentTeacher().name });
    saveMod('messenger', list);
    if (via === 'email') {
      const emails = (to === 'staff' ? store.Teachers.map(t => t.email) : students.map(s => s.email)).filter(Boolean);
      window.open(`https://mail.google.com/mail/?view=cm&fs=1&bcc=${encodeURIComponent(emails.join(','))}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank', 'noopener');
    }
    toast('Message sent.');
    renderMessenger();
  };
}

function openModule(id) {
  const m = MODULES.find(x => x.id === id);
  if (!m || !m.roles.includes(userRole())) return;
  moduleId = id;
  showView('module', m.title);
  window.scrollTo(0, 0);
  if (m.custom === 'finder') renderFinder();
  else if (m.custom === 'staff') renderStaff();
  else if (m.custom === 'timetable') renderTimetable();
  else if (m.custom === 'links') renderLinks();
  else if (m.custom === 'messenger') renderMessenger();
  else renderModuleList(m);
}

let ddOpen = null;
const novaHistory = [];
let novaBusy = false;
let novaPending = '';

function ddLabel(sel) {
  const o = sel.options[sel.selectedIndex];
  return o ? o.textContent : '';
}

function enhanceSelects(root) {
  (root || document).querySelectorAll('select:not([data-dd])').forEach(sel => {
    sel.dataset.dd = '1';
    const wrap = document.createElement('div');
    wrap.className = 'dd';
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);
    sel.classList.add('dd-native');
    sel.tabIndex = -1;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dd-btn';
    btn.innerHTML = '<span class="dd-label"></span><i class="fa-solid fa-chevron-down"></i>';
    wrap.appendChild(btn);
    const sync = () => { btn.querySelector('.dd-label').textContent = ddLabel(sel); };
    const desc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
    Object.defineProperty(sel, 'value', {
      get() { return desc.get.call(this); },
      set(v) {
        desc.set.call(this, v);
        sync();
      },
      configurable: true
    });
    sel.addEventListener('change', sync);
    sync();
    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (ddOpen && ddOpen.sel === sel) closeDd();
      else openDd(sel, btn);
    });
  });
}

function placeDd() {
  if (!ddOpen) return;
  const r = ddOpen.btn.getBoundingClientRect();
  const m = ddOpen.menu;
  m.style.minWidth = r.width + 'px';
  const h = m.offsetHeight;
  let top = r.bottom + 6;
  if (top + h > window.innerHeight - 8 && r.top - h - 6 > 8) top = r.top - h - 6;
  m.style.top = top + 'px';
  m.style.left = Math.max(8, Math.min(r.left, window.innerWidth - m.offsetWidth - 8)) + 'px';
}

function openDd(sel, btn) {
  closeDd();
  const menu = document.createElement('div');
  menu.className = 'dd-menu';
  menu.innerHTML = Array.from(sel.options).map(o => `<button type="button" class="dd-item${o.value === sel.value ? ' sel' : ''}" data-v="${esc(o.value)}">${esc(o.textContent)}</button>`).join('');
  document.body.appendChild(menu);
  ddOpen = { sel: sel, btn: btn, menu: menu };
  placeDd();
  btn.classList.add('open');
  requestAnimationFrame(() => menu.classList.add('open'));
  const selItem = menu.querySelector('.dd-item.sel');
  if (selItem) menu.scrollTop = Math.max(0, selItem.offsetTop - 60);
  menu.addEventListener('click', e => {
    const it = e.target.closest('.dd-item');
    if (!it) return;
    sel.value = it.dataset.v;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    closeDd();
    btn.focus();
  });
}

function closeDd() {
  if (!ddOpen) return;
  const menu = ddOpen.menu;
  ddOpen.btn.classList.remove('open');
  menu.classList.remove('open');
  setTimeout(() => menu.remove(), 260);
  ddOpen = null;
}

function toggleMenu(menuId, btnId) {
  $(menuId).classList.toggle('open');
  $(btnId).classList.toggle('open');
}

function buildDashMenu() {
  const t = currentTeacher();
  let html = '';
  if (t && isAdminUser(t)) {
    html = '<button type="button" class="subnav-item" data-action="dashboard">Admin Dashboard</button>';
  } else if (t) {
    html = '<button type="button" class="subnav-item" data-action="overview">Overview</button>' + teacherSlots(t).map(s => `<button type="button" class="subnav-item" data-action="slot:${esc(s.key)}">Period ${s.period_no} · ${esc(s.subject)}</button>`).join('');
  }
  $('dashList').innerHTML = html;
}

function onDashMenu(e) {
  const b = e.target.closest('.subnav-item');
  if (!b) return;
  const a = b.dataset.action;
  if (a === 'dashboard') openDashboard();
  else if (a === 'overview') openDashboard('');
  else if (a.startsWith('slot:')) openDashboard(a.slice(5));
}

function tabAllowed(tab) {
  if (tab === 'account') return !!session;
  if (tab === 'advanced') return isAdminUser(currentTeacher()) || !store.Teachers.length;
  return true;
}

function updateSettingsTabs() {
  document.querySelectorAll('.tab').forEach(t => { t.hidden = !tabAllowed(t.dataset.tab); });
  const active = document.querySelector('.tab.active');
  if (active && active.hidden) setTab('general');
  const t = currentTeacher();
  $('acctName').textContent = t ? t.name : '';
  $('acctMeta').textContent = t ? `${t.role} · ${t.email}` : '';
}

function rayyanSystem() {
  const t = currentTeacher();
  const admin = isAdminUser(t);
  const ids = new Set(students.map(s => s.id));
  const grades = {};
  store.Grades.forEach(g => {
    if (ids.has(g.student_id)) (grades[g.student_id] = grades[g.student_id] || []).push(`${g.subject} ${g.letter} ${g.percent}%`);
  });
  const att = {};
  const day = activeDay();
  const today = [];
  store.Attendance.forEach(a => {
    if (!ids.has(a.student_id)) return;
    const o = att[a.student_id] || (att[a.student_id] = { Absent: 0, Tardy: 0, Excused: 0 });
    if (a.status !== 'Present') o[a.status]++;
    if (a.day === day && a.status !== 'Present') today.push(`${a.day}|period ${a.period}|${a.subject}|${studentById[a.student_id].first_name} ${studentById[a.student_id].last_name}|${a.status}`);
  });
  const people = students.map(s => {
    const o = att[s.id] || { Absent: 0, Tardy: 0, Excused: 0 };
    return `${s.first_name} ${s.last_name}|${gradeName(s.grade)}|${studentCode(s)}|${s.email}|hifz:${s.has_hifz ? s.hifz_level : 'no'}|absences ${o.Absent}, tardies ${o.Tardy}, excused ${o.Excused}|${(grades[s.id] || []).join('; ')}`;
  });
  const recs = store.Records.filter(r => ids.has(r.student_id)).sort((a, b) => b.date.localeCompare(a.date));
  const recLines = recs.map(r => `${r.date}|${r.student}|${r.kind}|${r.incident}|${r.action}${r.location ? '|' + r.location : ''}${r.reason ? '|' + r.reason : ''}${r.staff ? '|' + r.staff : ''}`);
  const detention = recs.filter(r => /detention/i.test(r.action + ' ' + r.incident)).slice(0, 20).map(r => `${r.date}|${r.student}|${r.incident}|${r.action}`);
  const tm = teacherMap();
  const periods = store.Periods.map(p => `${p.tier}|period ${p.period_no}|${p.subject}|${(tm[p.teacher_id] || {}).name || ''}`);
  const local = ['behavior', 'badges', 'exams'].concat(admin ? ['needs', 'helpdesk'] : []).map(id => {
    const list = modData(id);
    return list.length ? `${id}:\n` + list.map(e => Object.keys(e).filter(k => k !== 'id' && k !== 'created').map(k => k === 'student' && studentById[Number(e[k])] ? studentById[Number(e[k])].first_name + ' ' + studentById[Number(e[k])].last_name : e[k]).join('|')).join('\n') : '';
  }).filter(Boolean).join('\n');
  const staff = admin ? store.Teachers.map(x => `${x.name}|${x.role}|${x.class}|${x.email}`).join('\n') : '';
  const now = new Date();
  return [
    'You are Rayyan, the assistant built into the Albaseerah International Institute staff dashboard. Be concise and friendly. Answer only from the school data below, which is limited to what the signed-in user may see. If the data does not contain the answer, say so. Never invent students, grades or incidents.',
    `Signed-in user: ${t ? t.name : ''} (${admin ? 'admin, sees all students' : 'teacher, sees only their class: ' + t.class}).`,
    `Now: ${now.toDateString()} ${now.toLocaleTimeString('en-US')}. Current period: ${currentPeriodNo() || 'none (outside school hours)'}. Latest attendance day in the data: ${latestDay}. Latest record date: ${recs.length ? recs[0].date : 'none'}.`,
    'Detention means a record whose action says detention was assigned. "Right now" or "currently" means records dated today, or the most recent dates if none are dated today (say which date you used).',
    `STUDENTS (${students.length}) name|grade|student ID|email|hifz|attendance totals|subject grades:\n${people.join('\n')}`,
    `RECORDS (${recLines.length}) date|student|type|incident|action:\n${recLines.join('\n')}`,
    `DETENTION ASSIGNED (newest first):\n${detention.join('\n') || 'none'}`,
    `NOT PRESENT ON ${day} date|period|subject|student|status:\n${today.join('\n') || 'none'}`,
    `TIMETABLE tier|period|subject|teacher:\n${periods.join('\n')}`,
    local ? `LOGS ADDED IN THE DASHBOARD:\n${local}` : '',
    staff ? `STAFF name|role|class|email:\n${staff}` : ''
  ].filter(Boolean).join('\n\n');
}

function novaOpen(open) {
  $('novaWin').classList.toggle('open', open);
  $('novaFab').classList.toggle('hide', open);
  if (open) $('novaInput').focus();
}

function novaBubble(role, html) {
  const d = document.createElement('div');
  d.className = 'nova-msg ' + role;
  d.innerHTML = html;
  $('novaLog').appendChild(d);
  $('novaLog').scrollTop = $('novaLog').scrollHeight;
  return d;
}

function novaText(res) {
  if (typeof res === 'string') return res;
  const c = res && res.message ? res.message.content : res && res.text;
  if (Array.isArray(c)) return c.map(x => x.text || '').join('');
  return typeof c === 'string' ? c : String(res);
}

async function novaSend(text) {
  if (novaBusy || !text) return;
  if (typeof puter === 'undefined') {
    novaBubble('bot error', 'The assistant could not be loaded.');
    return;
  }
  let signed = false;
  try {
    signed = puter.auth.isSignedIn();
  } catch (e) {
    signed = false;
  }
  if (!signed) {
    novaPending = text;
    $('novaSignin').hidden = false;
    return;
  }
  novaBusy = true;
  $('novaInput').value = '';
  novaBubble('user', esc(text));
  novaHistory.push({ role: 'user', content: text });
  const wait = novaBubble('bot', '<span class="typing"><i></i><i></i><i></i></span>');
  try {
    const res = await puter.ai.chat([{ role: 'system', content: rayyanSystem() }].concat(novaHistory), { model: 'gpt-5.4-nano' });
    const out = novaText(res);
    novaHistory.push({ role: 'assistant', content: out });
    wait.innerHTML = DOMPurify.sanitize(marked.parse(out));
  } catch (err) {
    wait.className = 'nova-msg bot error';
    wait.textContent = 'Something went wrong. Your message is saved, try again.';
  }
  novaBusy = false;
  $('novaLog').scrollTop = $('novaLog').scrollHeight;
}

async function novaSignIn() {
  try {
    await puter.auth.signIn();
    $('novaSignin').hidden = true;
    const p = novaPending;
    novaPending = '';
    if (p) novaSend(p);
  } catch (e) {
    toast('Sign-in was cancelled.');
  }
}

function bindExtra() {
  document.querySelector('.nova-title b').textContent = 'Rayyan';
  document.querySelector('.nova-log .nova-msg').textContent = "Hi, I'm Rayyan. Ask me about students, grades, attendance or records.";
  $('novaInput').placeholder = 'Message Rayyan';
  $('novaFab').setAttribute('aria-label', 'Open Rayyan');
  $('novaWin').setAttribute('aria-label', 'Rayyan');
  document.querySelector('#novaSignin p').textContent = 'Rayyan needs a Puter account to reply.';
  $('loginForm').addEventListener('submit', submitLogin);
  $('loginEye').addEventListener('click', () => {
    const p = $('loginPass');
    const show = p.type === 'password';
    p.type = show ? 'text' : 'password';
    $('loginEye').innerHTML = `<i class="fa-regular ${show ? 'fa-eye-slash' : 'fa-eye'}"></i>`;
  });
  $('loginSettings').addEventListener('click', openSettings);
  $('logoutBtn').addEventListener('click', logout);
  $('navDashboard').addEventListener('click', () => {
    toggleMenu('dashSubMenu', 'navDashboard');
    openDashboard();
  });
  $('navTools').addEventListener('click', () => toggleMenu('toolsSubMenu', 'navTools'));
  $('toolsList').addEventListener('click', e => {
    const b = e.target.closest('.subnav-item');
    if (b) openModule(b.dataset.mod);
  });
  $('writeSave').addEventListener('click', () => {
    localStorage.setItem('writeUrl', $('writeUrl').value.trim());
    toast('Write URL saved.');
  });
  $('writeUrl').value = localStorage.getItem('writeUrl') || '';
  $('novaFab').addEventListener('click', () => novaOpen(true));
  $('novaClose').addEventListener('click', () => novaOpen(false));
  $('novaForm').addEventListener('submit', e => {
    e.preventDefault();
    novaSend($('novaInput').value.trim());
  });
  $('novaSignBtn').addEventListener('click', novaSignIn);
  $('novaSignCancel').addEventListener('click', () => { $('novaSignin').hidden = true; });
  document.addEventListener('click', e => {
    if (ddOpen && !e.target.closest('.dd-menu')) closeDd();
  });
  window.addEventListener('resize', placeDd);
  window.addEventListener('scroll', e => {
    if (ddOpen && !(e.target && e.target.closest && e.target.closest('.dd-menu'))) placeDd();
  }, true);
  document.addEventListener('keydown', e => {
    if (!ddOpen) return;
    if (e.key === 'Escape') {
      closeDd();
      e.stopImmediatePropagation();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopImmediatePropagation();
      const items = Array.from(ddOpen.menu.querySelectorAll('.dd-item'));
      const i = items.indexOf(document.activeElement);
      const n = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
      items[n].focus();
    }
  }, true);
}

async function boot() {
  editLog = loadEditLog();
  enhanceSelects(document);
  applyAppearance();
  bindEvents();
  bindExtra();
  let ready = false;
  const cached = await loadCache();
  if (cached) {
    try {
      adoptRows(cached.rows);
      SHEET_ID = cached.id || '';
      displayedHash = cached.hash;
      savedHash = cached.hash;
      ready = true;
    } catch (e) {
      ready = false;
    }
  }
  if (ready) {
    startApp();
    hideLoading();
    checkForUpdates();
  } else {
    await loadFresh();
    startApp();
    hideLoading();
  }
  setInterval(checkForUpdates, POLL_INTERVAL);
}

boot();
