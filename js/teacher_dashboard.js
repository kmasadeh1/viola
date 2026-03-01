
import { DataService } from '../services/dataService.js';
import { sanitizeText } from './sanitize.js';

let isArabic = false;
let currentClass = "KG1 A";
let students = [];
let galleryImageBase64 = "";
let galleryImageFile = null; // NEW
let studentImageBase64 = "";
let studentImageFile = null; // NEW
let currentEditingStudentId = null;
let selectedDate = new Date().toISOString().split('T')[0];
let currentTerm = "First Semester";
let subjects = [];

window.onload = async function () {
    // ── ROLE GUARD ────────────────────────────────────────────────────────────
    // Allow access only to teachers (or admins using the preview feature).
    const previewData = DataService.getTeacherPreview();
    let loggedUser = null;
    try {
        loggedUser = await DataService.getCurrentUser();
    } catch { /* network offline — fall through to guard below */ }

    if (!previewData && (!loggedUser || loggedUser.role !== 'teacher')) {
        window.location.href = 'login.html';
        return;
    }

    // ── LOGIN & CLASS LOGIC ────────────────────────────────────────────────
    const selector = document.getElementById('classSelector');

    // Determine Teacher Info
    let teacherName = "Ms. Sarah";
    let assignedClass = "KG1 A";

    if (previewData) {
        document.getElementById('adminPreviewBanner').style.display = 'flex';
        document.getElementById('teacherName').innerText = `Admin: ${previewData.name}`;
        document.getElementById('logoutBtn').style.display = 'none';
        teacherName = previewData.name;
        assignedClass = previewData.class;
    } else if (loggedUser && loggedUser.role === 'teacher') {
        document.getElementById('teacherName').innerText = loggedUser.name;
        teacherName = loggedUser.name;
        assignedClass = loggedUser.class;
    }

    // Lock the Class Selector to Assigned Class
    currentClass = assignedClass;
    selector.innerHTML = `<option value="${currentClass}" selected>${currentClass}</option>`;
    selector.disabled = true;

    const datePicker = document.getElementById('attendanceDatePicker');
    datePicker.value = selectedDate;
    datePicker.addEventListener('change', (e) => { selectedDate = e.target.value; renderAttendanceTable(); });
    document.getElementById('currentDateDisplay').innerText = new Date().toLocaleDateString();

    // Load Initial Data
    subjects = await DataService.getSubjects();

    await loadStudentsData();
    populateHomeworkSubjects(); // Initialize Dynamic Subjects
    await loadHomework();
    await loadTeacherSchedule();
    populateBroadcastRecipients(); // NEW: Populate broadcast dropdown
    initDragAndDrop('dropZoneGallery', 'galleryInput', 'galleryPreview', (file, data) => {
        galleryImageFile = file;
        galleryImageBase64 = data;
    });
};

function exitPreview() { sessionStorage.removeItem('viola_preview_teacher'); window.location.href = 'admin_dashboard.html'; }
function showToast(msg) {
    const container = document.getElementById('toast-container');
    const pill = document.createElement('div');
    pill.className = 'toast-pill';
    pill.innerHTML = `<i class="fas fa-check-circle text-success"></i> <span>${msg}</span>`;
    container.appendChild(pill);
    setTimeout(() => { pill.style.opacity = '0'; setTimeout(() => pill.remove(), 300); }, 3000);
}

/* --- DYNAMIC SUBJECTS LOGIC --- */
function populateHomeworkSubjects() {
    const select = document.getElementById('hwSubject');
    select.innerHTML = '';
    subjects.forEach(sub => {
        const opt = document.createElement('option');
        opt.value = sub;
        opt.innerText = sub;
        select.appendChild(opt);
    });
}

/* --- MY SCHEDULE LOGIC --- */
async function loadTeacherSchedule() {
    let teacherName = document.getElementById('teacherName').innerText.replace('Admin: ', '').trim();
    const shortName = teacherName.split(' ')[1] || teacherName;
    const allSchedules = await DataService.getSchedule();
    const tbody = document.getElementById('teacherScheduleBody');
    tbody.innerHTML = "";
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
    const classes = [];

    for (const [cls, dayData] of Object.entries(allSchedules)) {
        for (const [dayIdx, times] of Object.entries(dayData)) {
            for (const [time, details] of Object.entries(times)) {
                if (details.teach && details.teach.toLowerCase().includes(shortName.toLowerCase())) {
                    classes.push({ dayIdx: parseInt(dayIdx), dayName: days[dayIdx] || "Unknown", time: time, className: cls, subject: details.sub });
                }
            }
        }
    }

    classes.sort((a, b) => { if (a.dayIdx !== b.dayIdx) return a.dayIdx - b.dayIdx; return a.time.localeCompare(b.time); });

    if (classes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">No classes scheduled for ${teacherName}</td></tr>`;
    } else {
        tbody.innerHTML = classes.map(c => `<tr><td class="fw-bold text-dark">${c.dayName}</td><td>${c.time}</td><td><span class="schedule-badge">${c.className}</span></td><td>${c.subject}</td></tr>`).join('');
        updateNextSessionWidget(classes);
    }
}

function updateNextSessionWidget(sortedClasses) {
    const now = new Date();
    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;
    let nextClass = sortedClasses.find(c => c.dayIdx === currentDay && c.time > currentTimeStr);
    if (!nextClass) nextClass = sortedClasses.find(c => c.dayIdx > currentDay);
    if (!nextClass) nextClass = sortedClasses[0];

    const displayEl = document.getElementById('nextSessionDisplay');
    if (nextClass) displayEl.innerHTML = `${nextClass.subject} <span style="font-size:0.6em" class="text-muted">(${nextClass.className})</span>`;
    else displayEl.innerText = "--";
}

function changeClass() {
    // Disabled (Locked to assigned class)
}

async function loadStudentsData() {
    let allStudents = await DataService.getStudents();
    if (!allStudents || allStudents.length === 0) {
        allStudents = [
            { id: "202601", name: "Kareem Masadeh", grade: "KG1 A", photo: "" },
            { id: "202602", name: "Layla Ahmed", grade: "KG1 A", photo: "" },
            { id: "202603", name: "Omar Yousef", grade: "KG1 A", photo: "" }
        ];
        await DataService.saveStudents(allStudents);
    }
    students = allStudents.filter(s => s.grade === currentClass);
    loadRoster(); renderAttendanceTable(); renderGradesTable();
    populateBroadcastRecipients(); // Refresh broadcast dropdown
}

/* --- BROADCAST LOGIC (NEW) --- */
function populateBroadcastRecipients() {
    const select = document.getElementById('broadcastRecipient');
    let html = `<option value="class">Whole Class (${sanitizeText(currentClass)})</option>`;
    students.forEach(s => {
        html += `<option value="${sanitizeText(s.id)}">Student: ${sanitizeText(s.name)}</option>`;
    });
    select.innerHTML = html;
}

async function sendTeacherBroadcast() {
    const target = document.getElementById('broadcastRecipient').value;
    const title = document.getElementById('broadcastTitle').value;
    const body = document.getElementById('broadcastBody').value;
    const teacherName = document.getElementById('teacherName').innerText.replace('Admin: ', '').trim();

    if (!title || !body) return showToast("Please enter a title and message.");

    let notifications = await DataService.getNotifications();

    const newMsg = {
        id: Date.now() + Math.random(),
        date: new Date().toLocaleDateString(),
        targetClass: currentClass, // Always set targetClass so basic filtering works
        sender: teacherName,
        title: title,
        body: body
    };

    if (target !== 'class') {
        newMsg.targetStudentId = target; // Tag specific student ID
        newMsg.isPrivate = true;
    }

    notifications.unshift(newMsg);
    await DataService.saveNotifications(notifications);

    // Reset form
    document.getElementById('broadcastTitle').value = "";
    document.getElementById('broadcastBody').value = "";

    const successMsg = (target === 'class') ? "Broadcast Sent to Class" : "Message Sent to Student";
    showToast(isArabic ? (target === 'class' ? "تم الإرسال للصف" : "تم الإرسال للطالب") : successMsg);
}

/* --- ATTENDANCE --- */
async function renderAttendanceTable() {
    const tbody = document.getElementById('attendanceTableBody');
    // Use selectedDate directly for consistency (YYYY-MM-DD)
    const savedData = await DataService.getAttendance(selectedDate);

    if (students.length === 0) { tbody.innerHTML = `<tr><td colspan="2" class="text-center text-muted py-5">${isArabic ? 'لا يوجد طلاب' : 'No students in class'}</td></tr>`; document.getElementById('attendanceCount').innerText = "0/0"; return; }

    tbody.innerHTML = students.map(s => {
        const status = savedData[s.id] || 'present';
        const img = s.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random`;
        return `<tr><td class="ps-3"><div class="d-flex align-items-center gap-3"><img src="${img}" class="avatar-circle"><div><div class="fw-bold text-dark">${s.name}</div><small class="text-muted">ID: ${s.id}</small></div></div></td><td class="text-center"><div class="btn-group shadow-sm rounded-3" role="group"><input type="radio" class="btn-check" name="att_${s.id}" id="p_${s.id}" value="present" ${status === 'present' ? 'checked' : ''} onchange="updateStats()"><label class="btn btn-outline-success" for="p_${s.id}"><i class="fas fa-check"></i></label><input type="radio" class="btn-check" name="att_${s.id}" id="l_${s.id}" value="late" ${status === 'late' ? 'checked' : ''} onchange="updateStats()"><label class="btn btn-outline-warning" for="l_${s.id}"><i class="fas fa-clock"></i></label><input type="radio" class="btn-check" name="att_${s.id}" id="a_${s.id}" value="absent" ${status === 'absent' ? 'checked' : ''} onchange="updateStats()"><label class="btn btn-outline-danger" for="a_${s.id}"><i class="fas fa-times"></i></label></div></td></tr>`
    }).join('');

    students.forEach(s => {
        const pBtn = document.getElementById(`p_${s.id}`);
        const lBtn = document.getElementById(`l_${s.id}`);
        const aBtn = document.getElementById(`a_${s.id}`);
        if (pBtn && lBtn && aBtn && !pBtn.checked && !lBtn.checked && !aBtn.checked) { pBtn.checked = true; }
    });
    updateStats();
}

function updateStats() {
    let present = 0;
    students.forEach(s => { if (document.getElementById(`p_${s.id}`)?.checked || document.getElementById(`l_${s.id}`)?.checked) present++; });
    document.getElementById('attendanceCount').innerText = `${present}/${students.length}`;
}

function markAllPresent() {
    students.forEach(s => { const el = document.getElementById(`p_${s.id}`); if (el) el.checked = true; });
    updateStats(); showToast("All marked Present");
}

async function saveAttendance() {
    let data = await DataService.getAttendance(selectedDate);
    students.forEach(s => {
        const radios = document.getElementsByName(`att_${s.id}`);
        for (const r of radios) if (r.checked) data[s.id] = r.value;
    });
    await DataService.saveAttendance(selectedDate, data);
    showToast(isArabic ? "تم حفظ الحضور" : "Attendance Records Saved");
}

/* --- GRADES --- */
function changeTerm() { currentTerm = document.getElementById('termSelect').value; renderGradesTable(); }
function getGradeStorageKey() { return (currentTerm === "First Semester") ? "viola_grades" : "viola_grades_term2"; }

async function renderGradesTable() {
    const thead = document.getElementById('gradesTableHeader');
    const tbody = document.getElementById('gradesTableBody');
    const savedGrades = await DataService.getGrades(currentTerm);

    let headerHTML = `<tr><th class="ps-3 border-0 rounded-start" style="width: 200px;">${isArabic ? 'الطالب' : 'Student'}</th>`;
    subjects.forEach(sub => { headerHTML += `<th class="text-center border-0">${sub}</th>`; });
    headerHTML += `</tr>`;
    thead.innerHTML = headerHTML;

    if (students.length === 0) { tbody.innerHTML = `<tr><td colspan="${subjects.length + 1}" class="text-center py-5">--</td></tr>`; return; }

    tbody.innerHTML = students.map(s => {
        const img = s.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random`;
        let row = `<tr><td class="ps-3"><div class="d-flex align-items-center gap-3"><img src="${img}" class="avatar-circle"><div class="fw-bold text-dark">${s.name}</div></div></td>`;
        subjects.forEach(sub => {
            const safeKey = sub.replace(/\s+/g, '_').toLowerCase();
            const val = (savedGrades[s.id] && savedGrades[s.id][safeKey]) ? savedGrades[s.id][safeKey] : "";
            row += `<td class="text-center"><input type="number" class="grade-input" id="grade_${s.id}_${safeKey}" value="${val}" placeholder="-" min="0" max="100"></td>`;
        });
        row += `</tr>`;
        return row;
    }).join('');
}

async function addSubject() {
    const val = document.getElementById('newSubjectInput').value.trim();
    if (val && !subjects.includes(val)) {
        subjects.push(val);
        await DataService.saveSubjects(subjects);
        document.getElementById('newSubjectInput').value = "";
        renderGradesTable();
        populateHomeworkSubjects(); // Update homework dropdown
        showToast(isArabic ? "تم إضافة المادة" : "Subject Added");
    } else if (subjects.includes(val)) { showToast("Subject already exists"); }
}

async function saveGrades() {
    const gradesData = await DataService.getGrades(currentTerm);
    students.forEach(s => {
        if (!gradesData[s.id]) gradesData[s.id] = {};
        subjects.forEach(sub => {
            const safeKey = sub.replace(/\s+/g, '_').toLowerCase();
            const el = document.getElementById(`grade_${s.id}_${safeKey}`);
            if (el) gradesData[s.id][safeKey] = el.value;
        });
    });
    await DataService.saveGrades(gradesData, currentTerm);
    showToast(isArabic ? "تم حفظ الدرجات" : "Gradebook Updated");
}

/* --- HOMEWORK, ROSTER, GALLERY --- */
async function loadHomework() {
    const allHomework = await DataService.getHomework();
    const myHomework = allHomework.filter(hw => hw.class === currentClass);
    document.getElementById('activeHwCount').innerText = myHomework.length;
    const container = document.getElementById('homeworkListContainer');
    if (myHomework.length === 0) { container.innerHTML = `<div class="text-center p-4 bg-light rounded text-muted small border border-dashed">${isArabic ? 'لا يوجد واجبات نشطة' : 'No active assignments for this class'}</div>`; return; }
    container.innerHTML = myHomework.map(hw => `<div class="card border-0 shadow-sm mb-2"><div class="card-body p-3 d-flex justify-content-between align-items-center"><div><span class="badge bg-primary-subtle text-primary mb-1">${sanitizeText(hw.subject)}</span><h6 class="fw-bold mb-1 text-dark" style="font-size: 0.9rem;">${sanitizeText(hw.description)}</h6><small class="text-danger fw-bold"><i class="far fa-clock me-1"></i> Due: ${sanitizeText(hw.dueDate)}</small></div><button class="btn btn-light text-danger rounded-circle" onclick="deleteHomework(${hw.id})"><i class="fas fa-trash-alt"></i></button></div></div>`).join('');
}
async function postHomework() {
    const sub = document.getElementById('hwSubject').value; const date = document.getElementById('hwDate').value; const desc = document.getElementById('hwDesc').value;
    if (!date || !desc) return showToast("Please fill all fields");
    const allHomework = await DataService.getHomework();
    allHomework.unshift({ id: Date.now(), class: currentClass, subject: sub, dueDate: date, description: desc });
    await DataService.saveHomework(allHomework);
    document.getElementById('hwDesc').value = ""; loadHomework(); showToast("Homework Posted");
}
async function deleteHomework(id) {
    if (confirm("Delete this assignment?")) {
        let all = await DataService.getHomework();
        all = all.filter(h => h.id !== id);
        await DataService.saveHomework(all);
        loadHomework(); showToast("Assignment Deleted");
    }
}
function loadRoster() {
    document.getElementById('rosterList').innerHTML = students.map(s => {
        const img = s.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random`;
        // img src comes from backend — set safely as attribute, not injected into string
        return `<div class="roster-item d-flex align-items-center justify-content-between" onclick="openStudentModal('${sanitizeText(s.id)}')"><div class="d-flex align-items-center gap-3"><img src="${sanitizeText(img)}" class="avatar-circle" style="width: 35px; height: 35px;"><span class="fw-bold small text-dark">${sanitizeText(s.name)}</span></div><i class="fas fa-chevron-right text-muted" style="font-size: 0.7rem;"></i></div>`
    }).join('');
}
function openStudentModal(id) {
    currentEditingStudentId = id; const s = students.find(x => x.id === id);
    document.getElementById('modalStudentName').innerText = s.name;
    document.getElementById('currentStudentImg').src = s.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random`;
    document.getElementById('studentPreviewContainer').style.display = 'none';
    new bootstrap.Modal(document.getElementById('studentPhotoModal')).show();
}
function previewStudentPhoto(input) {
    if (input.files && input.files[0]) {
        studentImageFile = input.files[0]; // Store file
        const reader = new FileReader();
        reader.onload = function (e) {
            studentImageBase64 = e.target.result;
            document.getElementById('studentPreview').src = e.target.result;
            document.getElementById('studentPreviewContainer').style.display = 'block';
        }
        reader.readAsDataURL(input.files[0]);
    }
}
async function saveStudentPhoto() {
    if (!studentImageFile) return;
    const all = await DataService.getStudents();
    const s = all.find(x => x.id === currentEditingStudentId);
    if (s) {
        await DataService.saveStudent(s, studentImageFile);
        await loadStudentsData();
        bootstrap.Modal.getInstance(document.getElementById('studentPhotoModal')).hide();
        showToast("Profile Photo Updated");
        studentImageFile = null; // Reset
    }
}
function initDragAndDrop(z, i, p, cb) {
    const zone = document.getElementById(z), input = document.getElementById(i), prev = document.getElementById(p);
    zone.onclick = () => input.click();
    input.onchange = (e) => handleFile(e.target.files[0], prev, cb);
    zone.ondragover = (e) => { e.preventDefault(); zone.style.borderColor = '#4361ee'; zone.style.background = '#f0f4ff'; };
    zone.ondragleave = () => { zone.style.borderColor = '#cbd5e0'; zone.style.background = '#fafafa'; };
    zone.ondrop = (e) => { e.preventDefault(); zone.style.borderColor = '#cbd5e0'; zone.style.background = '#fafafa'; handleFile(e.dataTransfer.files[0], prev, cb); };
}
function handleFile(f, p, cb) {
    if (f && f.type.startsWith('image/')) {
        const r = new FileReader();
        r.onload = (e) => {
            p.src = e.target.result;
            p.style.display = 'block';
            cb(f, e.target.result); // Pass file AND dataURL
        };
        r.readAsDataURL(f);
    }
}
document.getElementById('uploadForm').onsubmit = async (e) => {
    e.preventDefault();
    if (!galleryImageFile) return showToast("Select photo first");

    await DataService.uploadGalleryImage(
        document.getElementById('photoCaption').value,
        currentClass,
        galleryImageFile
    );

    showToast("Published to Parent Portal");
    e.target.reset();
    document.getElementById('galleryPreview').style.display = 'none';
    galleryImageBase64 = "";
    galleryImageFile = null;
};
function toggleLanguage() {
    isArabic = !isArabic;
    const lang = isArabic ? 'ar' : 'en';
    document.documentElement.setAttribute('dir', isArabic ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
    document.getElementById('langLabel').innerText = isArabic ? 'English' : 'العربية';
    document.querySelectorAll('[data-en]').forEach(el => el.innerText = el.getAttribute(`data-${lang}`));
    document.querySelectorAll('[data-en-ph]').forEach(el => el.placeholder = el.getAttribute(`data-${lang}-ph`));
}

// Expose functions to global window object
window.exitPreview = exitPreview;
window.markAllPresent = markAllPresent;
window.saveAttendance = saveAttendance;
window.updateStats = updateStats;
window.changeTerm = changeTerm;
window.addSubject = addSubject;
window.saveGrades = saveGrades;
window.postHomework = postHomework;
window.deleteHomework = deleteHomework;
window.openStudentModal = openStudentModal;
window.previewStudentPhoto = previewStudentPhoto;
window.saveStudentPhoto = saveStudentPhoto;
window.sendTeacherBroadcast = sendTeacherBroadcast;
window.toggleLanguage = toggleLanguage;
