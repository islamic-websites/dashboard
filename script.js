const SHEET_ID = '1uPM8U6GKVYu3mZyTGVLuQDGbKYjLEwMibCFDN-B0zIU';
const GVIZ_BASE = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=`;
const SHEETS = {
  students: 'Students',
  teachers: 'Teachers',
  periods: 'Periods',
  records: 'Records',
  grades: ['Algebra I grades', 'Arabic grades', 'Biology grades', 'Chemistry grades', 'English grades', 'Geometry grades', 'Islamic Studies grades', 'Life Science grades', 'Mathematics grades', 'Pre-Algebra grades', 'Science grades', 'Social Studies grades']
};

let currentUser = null;
let studentsData = [];
let teachersData = [];
let periodsData = [];
let recordsData = [];
let gradesData = {};
let chatHistory = [{ role: 'system', content: 'You are Rayyan, the AI assistant for the Albaseerah Staff Dashboard. You can help users navigate the website, understand its features, and answer questions about the data. Be concise and helpful.' }];
let dataHash = '';
let cachedData = {};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function showToast(msg, duration = 3000) {
  const container = $('#toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

function showModal(content) {
  const container = $('#modal-container');
  $('#modal-body').innerHTML = content;
  container.classList.remove('hidden');
}

function hideModal() {
  $('#modal-container').classList.add('hidden');
}

function base64UrlToBuffer(base64Url) {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4));
  const binary = atob(base64 + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function verifyPassword(password, storedHash) {
  const parts = storedHash.split('$');
  if (parts.length !== 4) return false;
  const [, iterations, saltB64, hashB64] = parts;
  const salt = base64UrlToBuffer(saltB64);
  const expectedHash = base64UrlToBuffer(hashB64);
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const derivedBits = await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    salt: salt,
    iterations: parseInt(iterations),
    hash: 'SHA-256'
  }, keyMaterial, 256);
  const derivedArray = new Uint8Array(derivedBits);
  const expectedArray = new Uint8Array(expectedHash);
  if (derivedArray.length !== expectedArray.length) return false;
  for (let i = 0; i < derivedArray.length; i++) {
    if (derivedArray[i] !== expectedArray[i]) return false;
  }
  return true;
}

async function fetchCSV(sheetName) {
  const res = await fetch(GVIZ_BASE + encodeURIComponent(sheetName));
  const text = await res.text();
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        currentField += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\n' || (char === '\r' && next === '\n')) {
        if (char === '\r') i++;
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }
  if (currentField || currentRow.length) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }
  return rows;
}

function parseStudents(rows) {
  if (rows.length < 2) return [];
  const headers = rows[0].map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const students = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0] && !row[1]) continue;
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = row[idx] || '';
    });
    students.push(obj);
  }
  return students;
}

function parseTeachers(rows) {
  if (rows.length < 2) return [];
  const headers = rows[0].map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const teachers = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0] && !row[1]) continue;
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = row[idx] || '';
    });
    teachers.push(obj);
  }
  return teachers;
}

function parsePeriods(rows) {
  if (rows.length < 2) return [];
  const headers = rows[0].map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const periods = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0]) continue;
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = row[idx] || '';
    });
    periods.push(obj);
  }
  return periods;
}

function parseRecords(rows) {
  if (rows.length < 2) return [];
  const headers = rows[0].map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const records = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0]) continue;
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = row[idx] || '';
    });
    records.push(obj);
  }
  return records;
}

async function loadAllData(forceRefresh = false) {
  const cacheKey = 'albaseerah_data_cache';
  if (!forceRefresh) {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      studentsData = parsed.students || [];
      teachersData = parsed.teachers || [];
      periodsData = parsed.periods || [];
      recordsData = parsed.records || [];
      gradesData = parsed.grades || {};
      dataHash = parsed.hash || '';
      if (studentsData.length > 0) return;
    }
  }

  try {
    const [studentsRows, teachersRows, periodsRows, recordsRows] = await Promise.all([
      fetchCSV(SHEETS.students),
      fetchCSV(SHEETS.teachers),
      fetchCSV(SHEETS.periods),
      fetchCSV(SHEETS.records).catch(() => [])
    ]);
    studentsData = parseStudents(studentsRows);
    teachersData = parseTeachers(teachersRows);
    periodsData = parsePeriods(periodsRows);
    recordsData = parseRecords(recordsRows);
    
    for (const gradeSheet of SHEETS.grades) {
      try {
        const rows = await fetchCSV(gradeSheet);
        if (rows.length > 0) {
          gradesData[gradeSheet] = rows;
        }
      } catch (e) {}
    }

    dataHash = JSON.stringify({
      students: studentsData.length,
      teachers: teachersData.length,
      periods: periodsData.length,
      records: recordsData.length
    });

    localStorage.setItem(cacheKey, JSON.stringify({
      students: studentsData,
      teachers: teachersData,
      periods: periodsData,
      records: recordsData,
      grades: gradesData,
      hash: dataHash
    }));
  } catch (e) {
    console.error('Failed to load data', e);
  }
}

async function pollData() {
  try {
    const [studentsRows, teachersRows] = await Promise.all([
      fetchCSV(SHEETS.students),
      fetchCSV(SHEETS.teachers)
    ]);
    const newHash = JSON.stringify({
      students: studentsRows.length,
      teachers: teachersRows.length
    });
    if (newHash !== dataHash) {
      $('#data-banner').classList.remove('hidden');
    }
  } catch (e) {}
}

function startPolling() {
  setInterval(pollData, 60000);
}

function getCurrentPeriod() {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const time = hour * 60 + minute;
  const periods = [
    { start: 8 * 60, end: 8 * 60 + 45 },
    { start: 8 * 60 + 50, end: 9 * 60 + 35 },
    { start: 9 * 60 + 40, end: 10 * 60 + 25 },
    { start: 10 * 60 + 30, end: 10 * 60 + 45 },
    { start: 10 * 60 + 50, end: 11 * 60 + 35 },
    { start: 11 * 60 + 40, end: 12 * 60 + 25 },
    { start: 12 * 60 + 30, end: 13 * 60 + 15 },
    { start: 13 * 60 + 20, end: 14 * 60 + 5 },
    { start: 14 * 60 + 10, end: 14 * 60 + 55 }
  ];
  for (let i = 0; i < periods.length; i++) {
    if (time >= periods[i].start && time < periods[i].end) {
      return i + 1;
    }
  }
  return null;
}

function getTeacherPeriods(teacherId) {
  return periodsData.filter(p => parseFloat(p.teacher_id) === parseFloat(teacherId));
}

function getStudentsForPeriod(period) {
  const gradeSheet = period.subject + ' grades';
  if (gradesData[gradeSheet]) {
    const rows = gradesData[gradeSheet];
    if (rows.length < 2) return [];
    const headers = rows[0].map(h => h.trim());
    const nameIdx = headers.findIndex(h => h.toLowerCase().includes('name'));
    if (nameIdx === -1) return [];
    const studentNames = [];
    for (let i = 1; i < rows.length; i++) {
      const name = rows[i][nameIdx];
      if (name && !name.includes('Date') && !name.includes('period')) {
        studentNames.push(name);
      }
    }
    return studentsData.filter(s => {
      const fullName = (s.first_name + ' ' + s.last_name).toLowerCase();
      return studentNames.some(n => fullName.includes(n.toLowerCase()) || n.toLowerCase().includes(fullName));
    });
  }
  return studentsData;
}

function renderLogin() {
  $('#login-screen').classList.remove('hidden');
  $('#app').classList.add('hidden');
}

function renderApp() {
  $('#login-screen').classList.add('hidden');
  $('#app').classList.remove('hidden');
  if (currentUser) {
    showToast(`Welcome, ${currentUser.first}`);
    if (currentUser.access === 'full') {
      renderAdminDashboard();
    } else {
      renderTeacherDashboard();
    }
  }
}

function logout() {
  currentUser = null;
  localStorage.removeItem('albaseerah_user');
  renderLogin();
}

function renderAdminDashboard() {
  const container = $('#view-container');
  const totalStudents = studentsData.length;
  const totalStaff = teachersData.length;
  const recentIncidents = recordsData.slice(-5).reverse();
  
  let totalGradeSum = 0;
  let gradeCount = 0;
  for (const sheet in gradesData) {
    const rows = gradesData[sheet];
    if (rows.length < 2) continue;
    const headers = rows[0];
    const pointsIdx = headers.findIndex(h => h.toLowerCase().includes('points'));
    if (pointsIdx === -1) continue;
    for (let i = 1; i < rows.length; i++) {
      const val = parseFloat(rows[i][pointsIdx]);
      if (!isNaN(val)) {
        totalGradeSum += val;
        gradeCount++;
      }
    }
  }
  const avgGrade = gradeCount > 0 ? (totalGradeSum / gradeCount).toFixed(1) : 'N/A';

  container.innerHTML = `
    <h2 style="color:var(--maroon);margin-bottom:24px;font-size:28px">Hi, ${currentUser.first}</h2>
    <div class="stats-grid">
      <div class="stat-card card">
        <h3>Total Students</h3>
        <div class="value">${totalStudents}</div>
      </div>
      <div class="stat-card card">
        <h3>Total Staff</h3>
        <div class="value">${totalStaff}</div>
      </div>
      <div class="stat-card card">
        <h3>Average Grade</h3>
        <div class="value">${avgGrade}</div>
      </div>
      <div class="stat-card card">
        <h3>Recent Incidents</h3>
        <div class="value">${recentIncidents.length}</div>
      </div>
    </div>
    <h3 style="margin-bottom:20px;color:var(--maroon);font-size:20px">SMS Features</h3>
    <div class="helpdesk-grid">
      <div class="helpdesk-card" data-feature="admissions"><h4>Admissions</h4></div>
      <div class="helpdesk-card" data-feature="finder"><h4>Student Finder</h4></div>
      <div class="helpdesk-card" data-feature="staffdir"><h4>Staff Directory</h4></div>
      <div class="helpdesk-card" data-feature="iep"><h4>Individual Needs</h4></div>
      <div class="helpdesk-card" data-feature="behavior"><h4>Behavior Log</h4></div>
      <div class="helpdesk-card" data-feature="rubrics"><h4>Rubrics</h4></div>
      <div class="helpdesk-card" data-feature="lesson"><h4>Lesson Planning</h4></div>
      <div class="helpdesk-card" data-feature="exams"><h4>Exam Tracking</h4></div>
      <div class="helpdesk-card" data-feature="timetable"><h4>Timetable</h4></div>
      <div class="helpdesk-card" data-feature="badges"><h4>Badges</h4></div>
      <div class="helpdesk-card" data-feature="helpdesk"><h4>Help Desk</h4></div>
      <div class="helpdesk-card" data-feature="info"><h4>Info Grid</h4></div>
    </div>
  `;

  $$('.helpdesk-card').forEach(card => {
    card.addEventListener('click', () => handleAdminFeature(card.dataset.feature));
  });
}

function renderTeacherDashboard() {
  const container = $('#view-container');
  const teacherPeriods = getTeacherPeriods(currentUser.id);
  const currentPeriod = getCurrentPeriod();
  let todayPeriods = teacherPeriods.filter(p => p.period_no === String(currentPeriod));
  if (todayPeriods.length === 0) todayPeriods = teacherPeriods;

  let html = `<h2 style="color:var(--maroon);margin-bottom:24px;font-size:28px">Hi, ${currentUser.first}</h2>`;
  
  if (todayPeriods.length === 0) {
    html += `<p>No classes scheduled for today.</p>`;
  } else {
    todayPeriods.forEach(period => {
      const students = getStudentsForPeriod(period);
      html += `<div class="card" style="margin-bottom:24px">
        <h3 style="color:var(--maroon);margin-bottom:16px;font-size:18px">${period.subject} (Period ${period.period_no})</h3>
        <div class="student-grid">`;
      
      students.forEach((student, idx) => {
        const fullName = `${student.first_name} ${student.last_name}`;
        html += `<div class="student-card" style="animation-delay:${idx * 50}ms">
          <h4 style="color:var(--maroon);margin-bottom:4px">${fullName}</h4>
          <p style="font-size:12px;color:#666;margin-bottom:12px">Grade ${student.grade}</p>
          <div class="attendance-toggle" data-student="${student.id || fullName}" data-period="${period.id}">
            <button class="att-btn present active" data-status="present">Present</button>
            <button class="att-btn late" data-status="late">Late</button>
            <button class="att-btn absent" data-status="absent">Absent</button>
          </div>
          <div style="margin-top:16px;display:flex;align-items:center;gap:8px">
            <label style="font-size:12px;font-weight:600;color:var(--maroon)">Score:</label>
            <input type="number" class="grade-input" data-student="${student.id || fullName}" data-period="${period.id}" placeholder="0">
          </div>
        </div>`;
      });
      html += `</div></div>`;
    });
  }
  container.innerHTML = html;

  $$('.att-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const parent = e.target.closest('.attendance-toggle');
      parent.querySelectorAll('.att-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
    });
  });

  $$('.grade-input').forEach(input => {
    input.addEventListener('change', (e) => {
      showToast(`Score ${e.target.value} saved for ${e.target.dataset.student}`);
    });
  });
}

function handleAdminFeature(feature) {
  switch (feature) {
    case 'admissions':
      showModal(`
        <h3 style="color:var(--maroon);margin-bottom:20px">Admissions Workflow</h3>
        <div style="margin-bottom:16px"><input type="text" placeholder="Applicant Name" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;margin-bottom:8px"></div>
        <div style="margin-bottom:16px"><select style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px"><option>Pending Review</option><option>Interview Scheduled</option><option>Accepted</option><option>Rejected</option></select></div>
        <button class="btn-primary" style="width:auto;padding:10px 24px" onclick="hideModal();showToast('Application submitted')">Submit Application</button>
      `);
      break;
    case 'finder':
      showModal(`
        <h3 style="color:var(--maroon);margin-bottom:20px">Fast Student Finder</h3>
        <input type="text" id="finder-input" placeholder="Search students..." style="width:100%;padding:12px;margin-bottom:16px;border:1px solid #ddd;border-radius:8px">
        <div id="finder-results" style="max-height:300px;overflow-y:auto"></div>
      `);
      $('#finder-input').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        const results = studentsData.filter(s => `${s.first_name} ${s.last_name}`.toLowerCase().includes(q));
        $('#finder-results').innerHTML = results.map(s => `<div style="padding:12px;border-bottom:1px solid #eee">${s.first_name} ${s.last_name} (Grade ${s.grade})</div>`).join('');
      });
      break;
    case 'staffdir':
      showModal(`
        <h3 style="color:var(--maroon);margin-bottom:20px">Staff Directory</h3>
        <div style="max-height:400px;overflow-y:auto">
          ${teachersData.map(t => `<div style="padding:12px;border-bottom:1px solid #eee"><strong>${t.first} ${t.last}</strong><br><span style="font-size:12px;color:#666">${t.subject} (${t.access})</span></div>`).join('')}
        </div>
      `);
      break;
    case 'iep':
      showModal(`
        <h3 style="color:var(--maroon);margin-bottom:20px">Individual Needs (IEPs)</h3>
        <div style="margin-bottom:16px"><textarea placeholder="Accommodations..." style="width:100%;height:100px;padding:12px;border:1px solid #ddd;border-radius:6px"></textarea></div>
        <button class="btn-primary" style="width:auto;padding:10px 24px" onclick="hideModal();showToast('IEP updated')">Save IEP</button>
      `);
      break;
    case 'behavior':
      showModal(`
        <h3 style="color:var(--maroon);margin-bottom:20px">Behavior / Discipline Logging</h3>
        <div style="margin-bottom:12px"><input type="text" placeholder="Student Name" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px"></div>
        <div style="margin-bottom:12px"><textarea placeholder="Incident Description..." style="width:100%;height:80px;padding:12px;border:1px solid #ddd;border-radius:6px"></textarea></div>
        <button class="btn-primary" style="width:auto;padding:10px 24px" onclick="hideModal();showToast('Behavior logged')">Log Incident</button>
      `);
      break;
    case 'rubrics':
      showModal(`
        <h3 style="color:var(--maroon);margin-bottom:20px">Rubrics</h3>
        <p style="margin-bottom:16px">Create and manage grading rubrics.</p>
        <button class="btn-primary" style="width:auto;padding:10px 24px" onclick="hideModal();showToast('Rubric created')">Create Rubric</button>
      `);
      break;
    case 'lesson':
      showModal(`
        <h3 style="color:var(--maroon);margin-bottom:20px">Lesson Planning</h3>
        <div style="margin-bottom:12px"><input type="text" placeholder="Lesson Title" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px"></div>
        <div style="margin-bottom:12px"><textarea placeholder="Lesson Details..." style="width:100%;height:120px;padding:12px;border:1px solid #ddd;border-radius:6px"></textarea></div>
        <button class="btn-primary" style="width:auto;padding:10px 24px" onclick="hideModal();showToast('Lesson plan saved')">Save Plan</button>
      `);
      break;
    case 'exams':
      showModal(`
        <h3 style="color:var(--maroon);margin-bottom:20px">Exam Tracking</h3>
        <p style="margin-bottom:16px">Track upcoming and past exams.</p>
        <button class="btn-primary" style="width:auto;padding:10px 24px" onclick="hideModal();showToast('Exam added')">Add Exam</button>
      `);
      break;
    case 'timetable':
      showModal(`
        <h3 style="color:var(--maroon);margin-bottom:20px">Timetable</h3>
        <p style="margin-bottom:16px">Google Calendar Integration Placeholder.</p>
        <div style="height:200px;background:#f0f0f0;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#999">Calendar View</div>
      `);
      break;
    case 'badges':
      showModal(`
        <h3 style="color:var(--maroon);margin-bottom:20px">Badges & Rewards</h3>
        <p style="margin-bottom:16px">Award badges to students for achievements.</p>
        <button class="btn-primary" style="width:auto;padding:10px 24px" onclick="hideModal();showToast('Badge awarded')">Award Badge</button>
      `);
      break;
    case 'helpdesk':
      showModal(`
        <h3 style="color:var(--maroon);margin-bottom:20px">Help Desk</h3>
        <div style="margin-bottom:12px"><select style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px"><option>IT Support</option><option>Admin Request</option><option>Maintenance</option></select></div>
        <div style="margin-bottom:12px"><textarea placeholder="Describe your issue..." style="width:100%;height:100px;padding:12px;border:1px solid #ddd;border-radius:6px"></textarea></div>
        <button class="btn-primary" style="width:auto;padding:10px 24px" onclick="hideModal();showToast('Request submitted')">Submit Request</button>
      `);
      break;
    case 'info':
      showModal(`
        <h3 style="color:var(--maroon);margin-bottom:20px">Info Grid</h3>
        <div class="info-grid">
          <div class="info-card"><h4>IXL</h4></div>
          <div class="info-card"><h4>Khan Academy</h4></div>
          <div class="info-card"><h4>Google Classroom</h4></div>
          <div class="info-card"><h4>Canvas</h4></div>
        </div>
      `);
      break;
  }
}

function renderRecords() {
  const container = $('#view-container');
  let incidentCounts = {};
  recordsData.forEach(r => {
    const student = r.student || 'Unknown';
    incidentCounts[student] = (incidentCounts[student] || 0) + 1;
  });

  const maxIncidents = 50;
  let html = `<h2 style="color:var(--maroon);margin-bottom:24px;font-size:28px">Records</h2>`;
  html += `<div class="records-bar-container"><div class="records-bar"><div class="records-marker" style="left:0%"></div></div></div>`;
  html += `<div id="records-list" style="display:flex;flex-direction:column;gap:16px">`;

  const sortedStudents = studentsData.slice().sort((a, b) => {
    const nameA = `${a.first_name} ${a.last_name}`;
    const nameB = `${b.first_name} ${b.last_name}`;
    const countA = incidentCounts[nameA] || 0;
    const countB = incidentCounts[nameB] || 0;
    return countB - countA;
  });

  sortedStudents.forEach(s => {
    const name = `${s.first_name} ${s.last_name}`;
    const count = incidentCounts[name] || 0;
    const percent = Math.min((count / maxIncidents) * 100, 100);
    html += `<div class="card" style="cursor:pointer" data-student="${name}" data-count="${count}">
      <h4 style="color:var(--maroon);margin-bottom:4px">${name}</h4>
      <p style="font-size:12px;color:#666;margin-bottom:12px">Incidents: ${count}</p>
      <div class="records-bar-container" style="margin:0">
        <div class="records-bar"><div class="records-marker" style="left:${percent}%"></div></div>
      </div>
    </div>`;
  });
  html += `</div>`;
  container.innerHTML = html;

  $$('.card[data-student]').forEach(card => {
    card.addEventListener('click', () => showRecordsPage(card.dataset.student));
  });
}

function showRecordsPage(studentName) {
  const container = $('#view-container');
  const studentRecords = recordsData.filter(r => r.student === studentName);
  
  const absences = studentRecords.filter(r => r.incident && r.incident.toLowerCase().includes('absence')).length;
  const excused = studentRecords.filter(r => r.incident && r.incident.toLowerCase().includes('excused')).length;
  const tardies = studentRecords.filter(r => r.incident && r.incident.toLowerCase().includes('tardy')).length;
  const presents = studentRecords.filter(r => r.incident && r.incident.toLowerCase().includes('present')).length;
  const incidents = studentRecords.length;

  container.innerHTML = `
    <button id="back-to-records" class="btn-primary" style="width:auto;padding:8px 16px;margin-bottom:24px">Back to Records</button>
    <h2 style="color:var(--maroon);margin-bottom:24px;font-size:28px">Records for ${studentName}</h2>
    <div class="histogram-container"><canvas id="histogram-chart"></canvas></div>
    <div id="records-detail-list" style="display:flex;flex-direction:column;gap:8px">
      ${studentRecords.map(r => `<div class="card" style="padding:16px"><strong>${r.date || 'N/A'}</strong> - ${r.incident || 'N/A'} (${r.action || 'N/A'}) at ${r.location || 'N/A'}</div>`).join('')}
    </div>
  `;

  $('#back-to-records').addEventListener('click', renderRecords);

  const ctx = document.getElementById('histogram-chart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Absences', 'Excused', 'Tardies', 'Presents', 'Incidents'],
      datasets: [{
        label: 'Count',
        data: [absences, excused, tardies, presents, incidents],
        backgroundColor: ['#3498db', '#f39c12', '#e67e22', '#27ae60', '#c0392b'],
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

function renderStudents() {
  const container = $('#view-container');
  let html = `<h2 style="color:var(--maroon);margin-bottom:24px;font-size:28px">Students</h2><div class="student-grid">`;
  studentsData.forEach((student, idx) => {
    html += `<div class="student-card" style="animation-delay:${idx * 50}ms">
      <h4 style="color:var(--maroon);margin-bottom:4px">${student.first_name} ${student.last_name}</h4>
      <p style="font-size:12px;color:#666;margin-bottom:4px">Grade ${student.grade}</p>
      <p style="font-size:12px;color:#666">${student.email || ''}</p>
    </div>`;
  });
  html += `</div>`;
  container.innerHTML = html;
}

function renderStaff() {
  const container = $('#view-container');
  let html = `<h2 style="color:var(--maroon);margin-bottom:24px;font-size:28px">Staff Directory</h2><div class="student-grid">`;
  teachersData.forEach((teacher, idx) => {
    html += `<div class="student-card" style="animation-delay:${idx * 50}ms">
      <h4 style="color:var(--maroon);margin-bottom:4px">${teacher.first} ${teacher.last}</h4>
      <p style="font-size:12px;color:#666;margin-bottom:4px">${teacher.subject || ''}</p>
      <p style="font-size:12px;color:#666">${teacher.email || ''}</p>
    </div>`;
  });
  html += `</div>`;
  container.innerHTML = html;
}

function renderMessages() {
  const container = $('#view-container');
  container.innerHTML = `
    <h2 style="color:var(--maroon);margin-bottom:24px;font-size:28px">Unified Messenger</h2>
    <div class="messenger-container">
      <div class="messenger-list">
        <div class="messenger-item"><strong style="color:var(--maroon)">Announcements</strong><br><span style="font-size:12px;color:#666">School-wide</span></div>
        <div class="messenger-item"><strong style="color:var(--maroon)">Staff Room</strong><br><span style="font-size:12px;color:#666">All staff</span></div>
        <div class="messenger-item"><strong style="color:var(--maroon)">Parents</strong><br><span style="font-size:12px;color:#666">Grade 5 parents</span></div>
      </div>
      <div class="messenger-chat">
        <div class="messenger-messages" id="msg-messages"></div>
        <div class="messenger-input-area">
          <input type="text" id="msg-input" placeholder="Type a message...">
          <button id="msg-send" class="btn-primary" style="width:auto;padding:10px 24px">Send</button>
        </div>
      </div>
    </div>
  `;
  $('#msg-send').addEventListener('click', () => {
    const input = $('#msg-input');
    if (input.value.trim()) {
      const msg = document.createElement('div');
      msg.className = 'chat-msg user';
      msg.style.margin = '8px 0';
      msg.textContent = input.value;
      $('#msg-messages').appendChild(msg);
      input.value = '';
    }
  });
}

function renderHelpdesk() {
  const container = $('#view-container');
  container.innerHTML = `
    <h2 style="color:var(--maroon);margin-bottom:24px;font-size:28px">Help Desk</h2>
    <div class="helpdesk-grid" style="margin-bottom:24px">
      <div class="helpdesk-card"><h4>IT Support</h4></div>
      <div class="helpdesk-card"><h4>Admin Requests</h4></div>
      <div class="helpdesk-card"><h4>Maintenance</h4></div>
    </div>
    <div class="card">
      <h3 style="color:var(--maroon);margin-bottom:16px">Submit a Request</h3>
      <textarea id="helpdesk-desc" placeholder="Describe your issue..." style="width:100%;height:120px;padding:12px;border:1px solid #ddd;border-radius:8px;font-family:inherit;margin-bottom:16px"></textarea>
      <button id="helpdesk-submit" class="btn-primary" style="width:auto;padding:10px 24px">Submit</button>
    </div>
  `;
  $('#helpdesk-submit').addEventListener('click', () => {
    if ($('#helpdesk-desc').value.trim()) {
      showToast('Help desk request submitted');
      $('#helpdesk-desc').value = '';
    }
  });
}

function renderInfoGrid() {
  const container = $('#view-container');
  container.innerHTML = `
    <h2 style="color:var(--maroon);margin-bottom:24px;font-size:28px">Quick Links</h2>
    <div class="info-grid">
      <div class="info-card"><h4>IXL</h4></div>
      <div class="info-card"><h4>Khan Academy</h4></div>
      <div class="info-card"><h4>Google Classroom</h4></div>
      <div class="info-card"><h4>Canvas</h4></div>
      <div class="info-card"><h4>Zoom</h4></div>
      <div class="info-card"><h4>School Portal</h4></div>
    </div>
  `;
}

function switchView(view) {
  switch (view) {
    case 'overview':
      if (currentUser.access === 'full') renderAdminDashboard();
      else renderTeacherDashboard();
      break;
    case 'period1':
    case 'period2':
    case 'period3':
    case 'period4':
    case 'period5':
    case 'period6':
    case 'period7':
    case 'period8':
    case 'period9':
      renderTeacherDashboard();
      break;
    case 'students': renderStudents(); break;
    case 'staff': renderStaff(); break;
    case 'records': renderRecords(); break;
    case 'messages': renderMessages(); break;
    case 'helpdesk': renderHelpdesk(); break;
    case 'info': renderInfoGrid(); break;
  }
}

function initChat() {
  const fab = $('#chat-fab');
  const chatWindow = $('#chat-window');
  const closeChat = $('#close-chat');
  const sendBtn = $('#send-chat');
  const chatInput = $('#chat-input');
  const chatMessages = $('#chat-messages');

  fab.addEventListener('click', () => chatWindow.classList.toggle('hidden'));
  closeChat.addEventListener('click', () => chatWindow.classList.add('hidden'));

  sendBtn.addEventListener('click', async () => {
    const text = chatInput.value.trim();
    if (!text) return;

    if (!puter.auth.isSignedIn()) {
      showModal(`
        <h3 style="color:var(--maroon);margin-bottom:16px">Sign in to Puter</h3>
        <p style="margin-bottom:20px">Please sign in to use Rayyan AI.</p>
        <button id="puter-signin" class="btn-primary" style="width:auto;padding:10px 24px">Sign In</button>
      `);
      $('#puter-signin').addEventListener('click', () => {
        puter.auth.signIn().then(() => {
          hideModal();
          showToast('Signed in to Puter');
        });
      });
      return;
    }

    const userMsg = document.createElement('div');
    userMsg.className = 'chat-msg user';
    userMsg.textContent = text;
    chatMessages.appendChild(userMsg);
    chatInput.value = '';
    chatHistory.push({ role: 'user', content: text });

    const botMsg = document.createElement('div');
    botMsg.className = 'chat-msg bot';
    botMsg.textContent = 'Rayyan is thinking...';
    chatMessages.appendChild(botMsg);

    try {
      const response = await puter.ai.chat(chatHistory, { model: 'gpt-5.4-nano' });
      const reply = response.message.content;
      chatHistory.push({ role: 'assistant', content: reply });
      botMsg.innerHTML = DOMPurify.sanitize(marked.parse(reply));
    } catch (e) {
      botMsg.textContent = 'Sorry, I encountered an error. Please try again.';
    }
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

function initCommandPalette() {
  const palette = $('#command-palette');
  const input = $('#cmd-input');
  const results = $('#cmd-results');

  const allCommands = [
    { name: 'Dashboard', action: () => switchView('overview') },
    { name: 'Students', action: () => switchView('students') },
    { name: 'Staff', action: () => switchView('staff') },
    { name: 'Records', action: () => switchView('records') },
    { name: 'Messages', action: () => switchView('messages') },
    { name: 'Help Desk', action: () => switchView('helpdesk') },
    { name: 'Info Grid', action: () => switchView('info') },
    { name: 'Logout', action: () => logout() },
    { name: 'Toggle Theme', action: () => {
      const html = document.documentElement;
      const current = html.getAttribute('data-theme');
      html.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
    }}
  ];

  document.addEventListener('keydown', (e) => {
    if (e.key === '\\') {
      e.preventDefault();
      palette.classList.toggle('hidden');
      if (!palette.classList.contains('hidden')) {
        input.value = '';
        input.focus();
        renderCmdResults(allCommands, '');
      }
    }
    if (e.key === 'Escape') palette.classList.add('hidden');
  });

  input.addEventListener('input', () => {
    let q = input.value.toLowerCase();
    if (q.startsWith('@')) {
      const search = q.substring(1);
      const people = studentsData.concat(teachersData.map(t => ({ first_name: t.first, last_name: t.last, email: t.email, grade: t.subject })));
      const filtered = people.filter(p => `${p.first_name} ${p.last_name}`.toLowerCase().includes(search));
      results.innerHTML = filtered.map(p => `<div class="cmd-result-item">${p.first_name} ${p.last_name} (${p.email || p.grade})</div>`).join('');
      return;
    }
    if (q === '?') {
      results.innerHTML = `<div class="cmd-result-item" data-action="toggle-theme">Toggle Dark Mode</div><div class="cmd-result-item" data-action="toggle-pill">Toggle Pill Mode</div>`;
      $$('.cmd-result-item[data-action]').forEach(item => {
        item.addEventListener('click', () => {
          if (item.dataset.action === 'toggle-theme') {
            const html = document.documentElement;
            html.setAttribute('data-theme', html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
          }
          if (item.dataset.action === 'toggle-pill') {
            const current = localStorage.getItem('pill-mode') === 'true';
            localStorage.setItem('pill-mode', !current);
            document.body.style.setProperty('--card-radius', !current ? '50px' : '16px');
          }
          palette.classList.add('hidden');
        });
      });
      return;
    }
    const filtered = allCommands.filter(c => c.name.toLowerCase().includes(q));
    renderCmdResults(filtered, q);
  });

  function renderCmdResults(cmds, q) {
    results.innerHTML = cmds.map(c => `<div class="cmd-result-item" data-name="${c.name}">${c.name}</div>`).join('');
    $$('.cmd-result-item[data-name]').forEach(item => {
      item.addEventListener('click', () => {
        const cmd = cmds.find(c => c.name === item.dataset.name);
        if (cmd) cmd.action();
        palette.classList.add('hidden');
      });
    });
  }

  $('#cmd-overlay').addEventListener('click', () => palette.classList.add('hidden'));
}

function initSettings() {
  $('#settings-btn').addEventListener('click', () => {
    showModal(`
      <h3 style="color:var(--maroon);margin-bottom:20px">Settings</h3>
      <div style="margin-bottom:20px">
        <label style="display:flex;align-items:center;gap:12px;cursor:pointer">
          <input type="checkbox" id="dark-mode-toggle" style="width:18px;height:18px">
          <span style="font-size:14px;font-weight:500">Dark Mode</span>
        </label>
      </div>
      <div style="margin-bottom:24px">
        <label style="display:flex;align-items:center;gap:12px;cursor:pointer">
          <input type="checkbox" id="pill-mode-toggle" style="width:18px;height:18px">
          <span style="font-size:14px;font-weight:500">Pill Mode</span>
        </label>
      </div>
      <button id="settings-save" class="btn-primary" style="width:auto;padding:10px 24px">Save</button>
    `);

    const darkToggle = $('#dark-mode-toggle');
    const pillToggle = $('#pill-mode-toggle');
    const html = document.documentElement;
    
    darkToggle.checked = html.getAttribute('data-theme') === 'dark';
    pillToggle.checked = localStorage.getItem('pill-mode') === 'true';

    $('#settings-save').addEventListener('click', () => {
      html.setAttribute('data-theme', darkToggle.checked ? 'dark' : 'light');
      localStorage.setItem('pill-mode', pillToggle.checked);
      document.body.style.setProperty('--card-radius', pillToggle.checked ? '50px' : '16px');
      hideModal();
    });
  });
}

function initExcelImport() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.xlsx,.xls';
  input.id = 'excel-import';
  input.style.display = 'none';
  document.body.appendChild(input);

  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetNames = workbook.SheetNames;
      sheetNames.forEach(name => {
        if (name.includes('grades')) {
          const sheet = workbook.Sheets[name];
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          gradesData[name] = rows;
        }
      });
      showToast('Excel data imported successfully');
    };
    reader.readAsArrayBuffer(file);
  });

  const btn = document.createElement('button');
  btn.textContent = 'Import Excel';
  btn.className = 'btn-icon';
  btn.style.marginLeft = '12px';
  btn.addEventListener('click', () => input.click());
  $('.topbar-right').appendChild(btn);
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadAllData();
  startPolling();

  const savedUser = localStorage.getItem('albaseerah_user');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    renderApp();
  } else {
    renderLogin();
  }

  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = $('#username').value.trim();
    const password = $('#password').value;
    const remember = $('#remember-me').checked;
    const errorEl = $('#login-error');
    errorEl.textContent = '';

    const teacher = teachersData.find(t => t.username === username);
    if (!teacher) {
      errorEl.textContent = 'Invalid username or password';
      return;
    }

    const valid = await verifyPassword(password, teacher.password);
    if (!valid) {
      errorEl.textContent = 'Invalid username or password';
      return;
    }

    currentUser = teacher;
    if (remember) {
      localStorage.setItem('albaseerah_user', JSON.stringify(teacher));
    }
    renderApp();
  });

  $('#toggle-password').addEventListener('click', () => {
    const pw = $('#password');
    pw.type = pw.type === 'password' ? 'text' : 'password';
    $('#toggle-password').textContent = pw.type === 'password' ? 'Show' : 'Hide';
  });

  $('#logout-btn').addEventListener('click', logout);

  $('#refresh-data').addEventListener('click', async () => {
    $('#data-banner').classList.add('hidden');
    await loadAllData(true);
    switchView('overview');
  });

  $$('.nav-item[data-view]').forEach(item => {
    item.addEventListener('click', () => switchView(item.dataset.view));
  });

  $$('.dropdown-item[data-view]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      switchView(item.dataset.view);
      $('.dropdown').classList.remove('active');
    });
  });

  $('#dashboard-toggle').addEventListener('click', (e) => {
    e.stopPropagation();
    $('.dropdown').classList.toggle('active');
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown')) {
      $('.dropdown').classList.remove('active');
    }
  });

  initChat();
  initCommandPalette();
  initSettings();
  initExcelImport();

  const currentPeriod = getCurrentPeriod();
  if (currentPeriod) switchView('period' + currentPeriod);

  document.addEventListener('mousemove', (e) => {
    const magnetic = e.target.closest('.magnetic');
    if (magnetic) {
      const rect = magnetic.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      magnetic.style.transform = `translate(${x * 0.1}px, ${y * 0.1}px)`;
    }
  });

  document.addEventListener('mouseleave', (e) => {
    const magnetic = e.target.closest('.magnetic');
    if (magnetic) magnetic.style.transform = 'translate(0, 0)';
  });

  document.addEventListener('mouseover', (e) => {
    const card = e.target.closest('.student-card, .card');
    if (card) {
      card.addEventListener('mousemove', (ev) => {
        const rect = card.getBoundingClientRect();
        const x = ev.clientX - rect.left;
        const y = ev.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = (y - centerY) / 20;
        const rotateY = (centerX - x) / 20;
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
      });
    }
  });
});
