import { DataService } from '../services/dataService.js';

let isArabic = false;
// Data Initialization
let students = [];
let teachers = [];
let classes = [];
let orders = [];

// Sync Data (Keep as is for now, or refactor later if Phase 3 expands)
let lunchMenu = [];
let galleryData = [];
let scheduleData = {};
let busData = { morning: [], evening: [] };
let notifications = [];
let shopData = { summer: {}, winter: {} };
let homeworkList = [];
let selectedLunchImage = "";

let settings = DataService.getSettings();


let feesChartInstance = null;
let attendanceChartInstance = null;

window.onload = async function () {
    try {
        // Load Async Data - PHASE 4 UPDATE
        const results = await Promise.all([
            DataService.getStudents(),
            DataService.getTeachers(),
            DataService.getClasses(),
            DataService.getOrders(),
            DataService.getLunchMenu(),
            DataService.getGallery(),
            DataService.getSchedule(),
            DataService.getBusData(),
            DataService.getNotifications(),
            DataService.getShopData(),
            DataService.getHomework(),
            DataService.getHomeData() // PHASE 5: Website Editor Data
        ]);

        [students, teachers, classes, orders, lunchMenu, galleryData, scheduleData, busData, notifications, shopData, homeworkList, homeData] = results;

        // Initialize Website Editor
        loadWebsiteEditor();

    } catch (error) {
        console.error("Failed to load dashboard data", error);
        showToast('error', 'Failed to load data from server.');
    }

    // AUTOMATIC DUPLICATE CLEANUP
    const unique = [];
    const seen = new Set();
    let hasDuplicates = false;

    students.forEach(s => {
        if (!seen.has(s.id)) {
            seen.add(s.id);
            unique.push(s);
        } else {
            hasDuplicates = true;
        }
    });

    if (hasDuplicates) {
        students = unique;
        await DataService.saveStudents(students);
        console.log("Auto-fixed duplicates in student list.");
    }

    populateClassDropdowns();
    renderTable();
    renderTeacherTable();
    renderClassList();
    loadGallery(); renderLunchMenu(); setupLunchDragAndDrop(); loadDaySchedule(); renderBusLists(); loadAdminHistory(); loadShopSettings(); renderOrders(); renderHomework();
    setupShopImageInputs();
    initCharts();
    loadRCStudents();
    loadSettings();

    // NEW: Initialize broadcast dropdowns
    populateBroadcastOptions();

    // --- FIX START: APPLY DEFAULT LANGUAGE ON LOAD ---
    if (settings.language === 'Arabic' && !isArabic) {
        toggleLanguage();
    }
    // --- FIX END ---
};

// Duplicate showPanel removed

/* --- SETTINGS LOGIC --- */
function loadSettings() {
    if (settings) {
        document.getElementById('settingSchoolName').value = settings.schoolName;
        document.getElementById('settingPhone').value = settings.phone;
        document.getElementById('settingYear').value = settings.year;
        if (settings.language) document.getElementById('settingLanguage').value = settings.language;

        // Load Admin Password
        document.getElementById('settingAdminPass').value = settings.adminPassword || "admin123";

        const brand = document.querySelector('.brand-name');
        if (brand) brand.innerText = settings.schoolName + " Admin";
    }
}

function saveSettings() {
    settings.schoolName = document.getElementById('settingSchoolName').value;
    settings.phone = document.getElementById('settingPhone').value;
    settings.year = document.getElementById('settingYear').value;

    // --- FIX START: CAPTURE AND APPLY LANGUAGE ---
    const newLang = document.getElementById('settingLanguage').value;
    settings.language = newLang;

    // Save Admin Password
    settings.adminPassword = document.getElementById('settingAdminPass').value || "admin123";

    DataService.saveSettings(settings);

    // Apply language immediately if it changed
    if (newLang === 'Arabic' && !isArabic) {
        toggleLanguage();
    } else if (newLang === 'English' && isArabic) {
        toggleLanguage();
    }
    // --- FIX END ---

    showToast('success', isArabic ? "تم حفظ الإعدادات" : "Settings Saved Successfully");
    loadSettings();
}

/* --- SECURITY HELPER --- */
function verifyAction() {
    const p = prompt(isArabic ? "أدخل كلمة مرور المسؤول للتأكيد:" : "Enter Admin Password to confirm action:");
    if (p === settings.adminPassword) return true;
    alert(isArabic ? "كلمة المرور خاطئة!" : "Incorrect Password!");
    return false;
}

async function backupData() {
    // Fetch all data for backup
    const grades1 = await DataService.getGrades("First Semester");
    const grades2 = await DataService.getGrades("Second Semester");

    const subjects = await DataService.getSubjects();

    const backup = {
        students: students,
        teachers: teachers,
        classes: classes,
        grades: grades1,
        grades2: grades2,
        subjects: subjects,
        orders: orders,
        lunch: lunchMenu,
        gallery: galleryData,
        schedule: scheduleData,
        bus: busData,
        notifications: notifications,
        shop: shopData,
        homework: homeworkList,
        homeData: homeData,
        attendance: "Attendance Data Not Exported in Basic Backup"
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "viola_backup_" + new Date().toISOString() + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function factoryReset() {
    if (confirm("CRITICAL WARNING: This will delete ALL data. Are you sure?")) {
        if (verifyAction()) {
            localStorage.clear();
            location.reload();
        }
    }
}

/* --- DANGER ZONE: TRANSFER & DELETE --- */
function openTransferModal() {
    document.getElementById('transferModal').style.display = 'block';
    renderTransferList();
}

function renderTransferList() {
    const sourceClass = document.getElementById('transferSourceClass').value;
    const container = document.getElementById('transferListContainer');
    container.innerHTML = "";

    if (!sourceClass) {
        container.innerHTML = '<p class="text-center text-muted">Select source class</p>';
        return;
    }

    const classStudents = students.filter(s => s.grade === sourceClass);
    if (classStudents.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No students in this class</p>';
        return;
    }

    // Select All Checkbox
    const selectAllDiv = document.createElement('div');
    selectAllDiv.style.borderBottom = "1px solid #ddd";
    selectAllDiv.style.padding = "5px";
    selectAllDiv.style.fontWeight = "bold";
    selectAllDiv.innerHTML = `<input type="checkbox" onchange="toggleTransferAll(this)"> Select All`;
    container.appendChild(selectAllDiv);

    classStudents.forEach(s => {
        const div = document.createElement('div');
        div.className = 'transfer-item';
        div.innerHTML = `<input type="checkbox" class="transfer-checkbox" value="${s.id}"> ${s.name} (${s.id})`;
        container.appendChild(div);
    });
}

function toggleTransferAll(source) {
    document.querySelectorAll('.transfer-checkbox').forEach(cb => cb.checked = source.checked);
}

async function executeTransfer() {
    const targetClass = document.getElementById('transferTargetClass').value;
    const sourceClass = document.getElementById('transferSourceClass').value;
    const checkboxes = document.querySelectorAll('.transfer-checkbox:checked');

    if (!targetClass || targetClass === sourceClass) {
        alert("Please select a valid target class.");
        return;
    }
    if (checkboxes.length === 0) {
        alert("No students selected.");
        return;
    }

    if (confirm(`Transfer ${checkboxes.length} students to ${targetClass}?`)) {
        if (verifyAction()) {
            checkboxes.forEach(cb => {
                const sIndex = students.findIndex(s => s.id == cb.value);
                if (sIndex !== -1) {
                    students[sIndex].grade = targetClass;
                }
            });
            await DataService.saveStudents(students);
            showToast('success', "Students Transferred");
            closeModal('transferModal');
            renderTable(); // Refresh student table
        }
    }
}

async function updateCredit() {
    const amount = parseFloat(document.getElementById('creditAmount').value);
    const studentId = document.getElementById('creditStudentId').value;

    if (studentId && !isNaN(amount)) {
        const studentIndex = students.findIndex(s => s.id == studentId);
        if (studentIndex > -1) {
            students[studentIndex].credit = (parseFloat(students[studentIndex].credit) || 0) + amount;
            await DataService.saveStudents(students);
            alert(isArabic ? "تم تحديث الرصيد!" : "Credit Updated!");
            document.getElementById('creditAmount').value = '';
            document.getElementById('creditStudentId').value = '';
        } else {
            alert(isArabic ? "المستخدم غير موجود" : "User not found");
        }
    }
}

async function deleteClassRoster() {
    const targetClass = document.getElementById('deleteClassSelect').value;
    if (!targetClass) return;

    // Count students to be deleted
    const studentsToDelete = students.filter(s => s.grade === targetClass);
    if (studentsToDelete.length === 0) {
        alert("Class is already empty.");
        return;
    }

    if (confirm(`WARNING: This will delete ALL ${studentsToDelete.length} students in ${targetClass}. This action cannot be undone. Proceed?`)) {
        if (verifyAction()) {
            // 1. Clean up associated data (grades) for these students
            const grades1 = await DataService.getGrades("First Semester");
            const grades2 = await DataService.getGrades("Second Semester");

            studentsToDelete.forEach(s => {
                delete grades1[s.id];
                delete grades2[s.id];
            });

            await DataService.saveGrades(grades1, "First Semester");
            await DataService.saveGrades(grades2, "Second Semester");

            // 2. Remove students from main array
            students = students.filter(s => s.grade !== targetClass);
            await DataService.saveStudents(students);

            showToast('success', "Class Roster Deleted");
            renderTable();
            initCharts();
        }
    }
}

// --- REPORT CARD LOGIC ---
function loadRCStudents() {
    const cls = document.getElementById('rcClassSelect').value;
    const studentSelect = document.getElementById('rcStudentSelect');
    studentSelect.innerHTML = "";
    document.getElementById('rcEditorArea').style.display = 'none';

    const filtered = students.filter(s => s.grade === cls);

    if (filtered.length === 0) {
        studentSelect.innerHTML = "<option>No students</option>";
        return;
    }

    filtered.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.innerText = s.name;
        studentSelect.appendChild(opt);
    });

    renderAdminReportCard();
}

async function renderAdminReportCard() {
    const sid = document.getElementById('rcStudentSelect').value;
    const term = document.getElementById('rcTermSelect').value;
    const sName = students.find(s => s.id == sid)?.name || "Student";

    if (!sid) return;

    document.getElementById('rcEditorArea').style.display = 'block';
    document.getElementById('rcStudentNameDisplay').innerText = sName;
    document.getElementById('rcTermDisplay').innerText = term;

    const gradesData = await DataService.getGrades(term);
    const studentGrades = gradesData[sid] || {};
    const subjectsList = await DataService.getSubjects();

    const tbody = document.getElementById('rcTableBody');
    tbody.innerHTML = "";

    subjectsList.forEach(sub => {
        const safeKey = sub.replace(/\s+/g, '_').toLowerCase();
        const score = studentGrades[safeKey] || "";

        let gradeLetter = "-";
        if (score) {
            const num = parseInt(score);
            if (num >= 90) gradeLetter = "A";
            else if (num >= 80) gradeLetter = "B";
            else if (num >= 70) gradeLetter = "C";
            else if (num >= 60) gradeLetter = "D";
            else gradeLetter = "F";
        }

        tbody.innerHTML += `
                    <tr>
                        <td>${sub}</td>
                        <td><input type="number" class="rc-input" id="rc_grade_${safeKey}" value="${score}" placeholder="-"></td>
                        <td><span class="badge bg-secondary">${gradeLetter}</span></td>
                    </tr>
                `;
    });
}

async function saveAdminGrades() {
    const sid = document.getElementById('rcStudentSelect').value;
    const term = document.getElementById('rcTermSelect').value;

    const gradesData = await DataService.getGrades(term);
    if (!gradesData[sid]) gradesData[sid] = {};

    const subjectsList = await DataService.getSubjects();

    subjectsList.forEach(sub => {
        const safeKey = sub.replace(/\s+/g, '_').toLowerCase();
        const input = document.getElementById(`rc_grade_${safeKey}`);
        if (input) {
            gradesData[sid][safeKey] = input.value;
        }
    });

    await DataService.saveGrades(gradesData, term);
    showToast('success', isArabic ? 'تم حفظ الدرجات' : 'Grades Updated Successfully');
    renderAdminReportCard();
}

async function downloadAdminReportCardPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const sid = document.getElementById('rcStudentSelect').value;
    const term = document.getElementById('rcTermSelect').value;
    const sName = students.find(s => s.id == sid)?.name || "Student";
    const sGrade = students.find(s => s.id == sid)?.grade || "";

    doc.setFontSize(18);
    doc.text(settings.schoolName, 105, 20, null, null, 'center');
    doc.setFontSize(12);
    doc.text(`Student: ${sName} (${sid})`, 14, 35);
    doc.text(`Class: ${sGrade}`, 14, 42);
    doc.text(`Term: ${term} (${settings.year})`, 14, 49);

    const gradesData = await DataService.getGrades(term);
    const studentGrades = gradesData[sid] || {};
    const subjectsList = await DataService.getSubjects();

    const tableData = subjectsList.map(sub => {
        const safeKey = sub.replace(/\s+/g, '_').toLowerCase();
        const score = studentGrades[safeKey] || "-";
        let grade = "-";
        if (score !== "-") {
            const n = parseInt(score);
            if (n >= 90) grade = "A"; else if (n >= 80) grade = "B"; else if (n >= 70) grade = "C"; else if (n >= 60) grade = "D"; else grade = "F";
        }
        return [sub, score, grade];
    });

    doc.autoTable({
        head: [['Subject', 'Score', 'Grade']],
        body: tableData,
        startY: 60,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] }
    });

    doc.save(`${sName}_ReportCard_${term}.pdf`);
}

// --- CLASS MANAGEMENT LOGIC ---
async function renderClassList() {
    const list = document.getElementById('classList');
    list.innerHTML = classes.map((c, i) => `
                <li class="list-group-item d-flex justify-content-between align-items-center p-3 border-bottom">
                    <span class="fw-bold">${c}</span>
                    <button class="btn btn-sm btn-danger py-1" onclick="deleteClass(${i})"><i class="fas fa-trash"></i></button>
                </li>
            `).join('');
    await DataService.saveClasses(classes);
    populateClassDropdowns();
}

async function addClass(e) {
    if (e) e.preventDefault();
    const nameInput = document.getElementById('newClassName');
    const name = nameInput.value.trim();

    if (name && !classes.includes(name)) {
        try {
            // Optimistic Update
            classes.push(name);
            nameInput.value = "";
            renderClassList(); // Update UI immediately

            // Save to Backend
            await DataService.saveClass(name);
            showToast('success', isArabic ? "تم إضافة الصف" : "Class Added");
        } catch (error) {
            console.error("Failed to add class", error);
            // Revert on failure
            classes = classes.filter(c => c !== name);
            renderClassList();
            showToast('error', "Failed to save class.");
        }
    } else if (classes.includes(name)) {
        showToast('warning', isArabic ? "الصف موجود بالفعل" : "Class already exists");
    }
}

async function deleteClass(i) {
    if (confirm("Delete this class?")) {
        if (verifyAction()) {
            classes.splice(i, 1);
            await DataService.saveClasses(classes);
            renderClassList();
        }
    }
}

function populateClassDropdowns() {
    const dropdowns = document.querySelectorAll('.class-dropdown');
    dropdowns.forEach(dd => {
        const currentVal = dd.value;
        let html = dd.id === 'sectionFilter' ? '<option value="All">All Classes</option>' : '';
        classes.forEach(c => html += `<option value="${c}">${c}</option>`);
        dd.innerHTML = html;
        if (currentVal) dd.value = currentVal;
    });
}

// --- TEACHER MANAGEMENT LOGIC ---
function renderTeacherTable() {
    const tbody = document.getElementById('teacherTableBody');
    tbody.innerHTML = teachers.map((t, i) => `
                <tr>
                    <td>${t.name}</td>
                    <td><span class="badge bg-info text-dark">${t.class}</span></td>
                    <td>${t.username}</td>
                    <td>${t.password}</td>
                    <td>
                        <button class="btn btn-warning py-1 px-2" onclick="previewTeacher(${i})" title="Preview Dashboard"><i class="fas fa-eye"></i></button>
                        <button class="btn btn-secondary py-1 px-2" onclick="openTeacherModal(${i})"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-danger py-1 px-2" onclick="deleteTeacher(${i})"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');
}

function openTeacherModal(i = null) {
    document.getElementById('teacherModal').style.display = 'block';
    document.getElementById('teacherIndex').value = i !== null ? i : "-1";
    if (i !== null) {
        const t = teachers[i];
        document.getElementById('tName').value = t.name;
        document.getElementById('tClass').value = t.class;
        document.getElementById('tUser').value = t.username;
        document.getElementById('tPass').value = t.password;
    } else {
        document.getElementById('tName').value = "";
        document.getElementById('tClass').value = classes[0];
        document.getElementById('tUser').value = "";
        document.getElementById('tPass').value = "";
    }
}

async function saveTeacher() {
    const idx = parseInt(document.getElementById('teacherIndex').value);
    const tObj = {
        name: document.getElementById('tName').value,
        class: document.getElementById('tClass').value,
        username: document.getElementById('tUser').value,
        password: document.getElementById('tPass').value
    };

    if (idx === -1) teachers.push(tObj);
    else teachers[idx] = tObj;

    await DataService.saveTeachers(teachers);
    closeModal('teacherModal');
    renderTeacherTable();
    showToast('success', "Teacher Saved");
}

async function addTeacher(e) {
    e.preventDefault();
    const name = document.getElementById('teacherName').value;
    const subject = document.getElementById('teacherSubject').value;
    const email = document.getElementById('teacherEmail').value;
    if (name && subject && email) {
        teachers.push({ id: Date.now(), name, subject, email });
        await DataService.saveTeachers(teachers);
        renderTeacherTable();
        document.getElementById('addTeacherForm').reset();
        bootstrap.Modal.getInstance(document.getElementById('addTeacherModal')).hide();
        showToast('success', isArabic ? "تم إضافة المعلم" : "Teacher Added");
    }
}

async function deleteTeacher(i) {
    if (confirm("Remove this teacher account?")) {
        if (verifyAction()) {
            teachers.splice(i, 1);
            await DataService.saveTeachers(teachers);
            renderTeacherTable();
        }
    }
}

// --- PREVIEW REDIRECTS ---
function previewTeacher(i) {
    const t = teachers[i];
    sessionStorage.setItem('viola_preview_teacher', JSON.stringify(t));
    // LINK CHECK: Points to root teacher dashboard
    window.location.href = 'teacher_dashboard.html';
}

function previewStudent(i) {
    const s = students[i];
    sessionStorage.setItem('viola_preview_student_id', s.id);
    // LINK CHECK: Points to root parent dashboard
    window.location.href = 'parent_dashboard.html';
}

// --- STUDENT MANAGEMENT LOGIC ---
function renderTable() {
    const tbody = document.getElementById('studentTableBody');
    if (!tbody) return;

    // Safety check for students array
    if (!Array.isArray(students)) {
        console.error("renderTable: students is not an array", students);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error loading student data</td></tr>';
        return;
    }

    const filter = document.getElementById('sectionFilter').value;
    const search = document.getElementById('studentSearch').value.toLowerCase();

    tbody.innerHTML = '';
    let count = 0, totalRev = 0, totalOut = 0;

    students.forEach((s, i) => {
        if ((filter === "All" || s.grade === filter) && (s.name.toLowerCase().includes(search) || s.id.toString().includes(search))) {
            count++;
            const paid = parseInt(s.paid || 0), fee = parseInt(s.fee || 1000);
            const credit = parseFloat(s.credit || 0).toFixed(2);
            totalRev += paid; totalOut += (fee - paid);

            tbody.innerHTML += `
                        <tr>
                            <td>${s.id}</td>
                            <td>${s.name}</td>
                            <td>${s.grade}</td>
                            <td style="color:${paid >= fee ? 'green' : 'orange'}">${paid} / ${fee} JOD</td>
                            <td><span class="badge bg-warning text-dark">${credit} JOD</span></td>
                            <td>
                                <button class="btn btn-warning py-1 px-2" onclick="previewStudent(${i})" title="Preview Portal"><i class="fas fa-eye"></i></button>
                                <button class="btn btn-secondary py-1 px-2" onclick="openStudentModal(${i})"><i class="fas fa-edit"></i></button> 
                                <button class="btn btn-danger py-1 px-2" onclick="deleteStudent(${i})"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>`;
        }
    });

    // Safety check for summary elements
    const countEl = document.getElementById('totalStudentsCount');
    const revEl = document.getElementById('totalRevenue');
    const outEl = document.getElementById('totalOutstanding');

    if (countEl) countEl.innerText = count;
    if (revEl) revEl.innerText = totalRev + " JOD";
    if (outEl) outEl.innerText = totalOut + " JOD";
}

function openStudentModal(i = null) {
    document.getElementById('studentModal').style.display = 'block';
    document.getElementById('editIndex').value = (i !== null) ? i : "-1";
    if (i !== null) {
        const s = students[i];
        document.getElementById('sName').value = s.name; document.getElementById('sID').value = s.id; document.getElementById('sPass').value = s.password || "123456";
        document.getElementById('sGrade').value = s.grade; document.getElementById('sFee').value = s.fee; document.getElementById('sPaid').value = s.paid; document.getElementById('sCredit').value = s.credit || 0;
    } else {
        document.getElementById('sName').value = ""; document.getElementById('sID').value = ""; document.getElementById('sPass').value = "123456";
        document.getElementById('sFee').value = "1000"; document.getElementById('sPaid').value = "0"; document.getElementById('sCredit').value = "0";
    }
}
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

async function saveStudent() {
    const index = parseInt(document.getElementById('editIndex').value);
    const idVal = document.getElementById('sID').value;

    if (index === -1 && students.some(s => s.id == idVal)) {
        alert(isArabic ? "معرف الطالب موجود بالفعل" : "Student ID already exists!");
        return;
    }

    const oldAttendance = (index !== -1 && students[index].attendance) ? students[index].attendance : "Present";
    const creditVal = document.getElementById('sCredit').value || 0;

    // Construct Student Object
    const sObj = {
        id: idVal,
        password: document.getElementById('sPass').value || "123456",
        name: document.getElementById('sName').value,
        grade: document.getElementById('sGrade').value,
        fee: document.getElementById('sFee').value,
        paid: document.getElementById('sPaid').value,
        credit: creditVal,
        attendance: oldAttendance,
        // photo property handled by backend via file upload usually, 
        // but we keep existing photo if no new one? 
        // DataService.saveStudent handles merging if imageFile is null? 
        // Or backend does. We pass blank/existing if we want.
        // For now, we trust the FormData upload to handle the photo update.
        // We might want to pass 'photo' string if we want to PERSIST existing URL when no new file?
        // But FormData logic in DataService sends fields.
        photo: (index !== -1) ? students[index].photo : ""
    };

    const photoInput = document.getElementById('studentPhoto');
    const imageFile = photoInput.files[0];

    // Use DataService to save (FormData)
    await DataService.saveStudent(sObj, imageFile);

    // Update Credit specifically if needed (though sObj has it, setStudentCredit is LS)
    DataService.setStudentCredit(creditVal);

    // Refresh Data from Server to get new URLs/IDs
    students = await DataService.getStudents();

    closeModal('studentModal');
    renderTable();
    initCharts();
    showToast('success', isArabic ? 'تم حفظ الحساب' : 'Student Account Saved Successfully');
}

async function addStudent(e) {
    e.preventDefault();
    const name = document.getElementById('studentName').value;
    const grade = document.getElementById('studentGrade').value;
    const parentName = document.getElementById('parentName').value;
    const parentEmail = document.getElementById('parentEmail').value;
    const id = document.getElementById('studentId').value;
    const password = document.getElementById('studentPassword').value;

    if (name && grade && id && password) {
        students.push({
            id, name, grade, parentName, parentEmail, password,
            credit: 0
        });
        await DataService.saveStudents(students);
        renderTable();
        document.getElementById('addStudentForm').reset();
        bootstrap.Modal.getInstance(document.getElementById('addStudentModal')).hide();
        showToast('success', isArabic ? "تم إضافة الطالب بنجاح" : "Student Added Successfully");
    }
}

async function deleteStudent(i) {
    if (confirm(isArabic ? "هل أنت متأكد؟" : "Delete this student account?")) {
        if (verifyAction()) {
            // Database cleanup for single student
            const studentId = students[i].id;
            const grades1 = await DataService.getGrades("First Semester");
            const grades2 = await DataService.getGrades("Second Semester");
            delete grades1[studentId];
            delete grades2[studentId];
            await DataService.saveGrades(grades1, "First Semester");
            await DataService.saveGrades(grades2, "Second Semester");

            students.splice(i, 1);
            await DataService.saveStudents(students);
            renderTable(); initCharts(); showToast('error', isArabic ? 'تم الحذف' : 'Student Deleted');
        }
    }
}

// --- EXPORT PDF ---
function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.font = "helvetica";
    doc.setFontSize(18); doc.text(settings.schoolName + " - Student List", 14, 22);
    doc.setFontSize(11); doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 30);
    const tableColumn = ["ID", "Name", "Section", "Total Fee", "Paid", "Balance"];
    const tableRows = [];
    students.forEach(s => { const balance = parseInt(s.fee) - parseInt(s.paid); tableRows.push([s.id, s.name, s.grade, s.fee + " JOD", s.paid + " JOD", balance + " JOD"]); });
    doc.autoTable({ head: [tableColumn], body: tableRows, startY: 40, theme: 'grid', headStyles: { fillColor: [46, 204, 113] } });
    doc.save("Viola_Students_Report.pdf");
    showToast('success', isArabic ? "تم تحميل الملف" : "PDF Downloaded Successfully");
}

// --- SCHEDULE MANAGEMENT ---
function loadDaySchedule() {
    const c = document.getElementById('scheduleClass').value;
    const d = document.getElementById('scheduleDay').value;
    const dt = scheduleData[c]?.[d] || {};
    const container = document.getElementById('slotsContainer');
    container.innerHTML = "";
    const times = Object.keys(dt).sort();
    times.forEach(time => { renderSlotRow(time, dt[time].sub, dt[time].teach); });
}

function getTeacherOptions(selected) {
    let html = `<option value="">${isArabic ? 'اختر المعلم' : 'Select Teacher'}</option>`;
    teachers.forEach(t => { const sel = t.name === selected ? 'selected' : ''; html += `<option value="${t.name}" ${sel}>${t.name}</option>`; });
    return html;
}

function renderSlotRow(time, sub, teach) {
    const container = document.getElementById('slotsContainer');
    const div = document.createElement('div');
    div.className = 'schedule-row';
    div.dataset.time = time;
    let displayTime = time.includes(":") ? time : time + ":00";
    div.innerHTML = `<div class="schedule-time" style="width: 120px; background: #f8f9fa; padding: 10px; border-radius: 5px; text-align: center;">${displayTime}</div><input type="text" class="form-control slot-sub" placeholder="Subject" value="${sub || ''}" data-en-ph="Subject" data-ar-ph="المادة"><select class="form-control slot-teach">${getTeacherOptions(teach)}</select><button class="btn-delete-sm" onclick="this.parentElement.remove()" style="margin-left: 10px;"><i class="fas fa-trash"></i></button>`;
    container.appendChild(div);
}

function addTimeSlot() {
    const timeInput = document.getElementById('newSlotTime');
    const time = timeInput.value;
    if (!time) return alert(isArabic ? "يرجى اختيار وقت" : "Please select a time");
    const existing = document.querySelector(`.schedule-row[data-time="${time}"]`);
    if (existing) return alert(isArabic ? "هذا الوقت موجود مسبقاً" : "Time slot already exists");
    renderSlotRow(time, "", "");
}

async function saveDaySchedule() {
    const c = document.getElementById('scheduleClass').value;
    const d = document.getElementById('scheduleDay').value;
    if (!scheduleData[c]) scheduleData[c] = {};
    const newDayData = {};
    const rows = document.querySelectorAll('.schedule-row');
    rows.forEach(row => {
        const t = row.dataset.time;
        const sub = row.querySelector('.slot-sub').value;
        const teach = row.querySelector('.slot-teach').value;
        if (sub || teach) { newDayData[t] = { sub, teach }; }
    });
    scheduleData[c][d] = newDayData;
    await DataService.saveSchedule(scheduleData);
    showToast('success', isArabic ? "تم حفظ الجدول" : "Schedule Saved!");
    loadDaySchedule();
}

// --- HOMEWORK, SHOP, ETC. ---
async function postHomework() {
    const cls = document.getElementById('hwClass').value; const sub = document.getElementById('hwSubject').value; const date = document.getElementById('hwDate').value; const desc = document.getElementById('hwDesc').value;
    if (!cls || !sub || !date || !desc) { alert(isArabic ? "يرجى تعبئة جميع الحقول" : "Please fill all fields"); return; }
    homeworkList.unshift({ id: Date.now(), class: cls, subject: sub, dueDate: date, description: desc });
    await DataService.saveHomework(homeworkList); renderHomework(); document.getElementById('hwDesc').value = ""; showToast('success', isArabic ? "تم نشر الواجب" : "Homework Posted Successfully");
}
function renderHomework() {
    const container = document.getElementById('homeworkListContainer');
    if (homeworkList.length === 0) { container.innerHTML = `<p class="text-muted text-center py-3">${isArabic ? 'لا يوجد واجبات' : 'No active homework assignments'}</p>`; return; }
    container.innerHTML = homeworkList.map((hw, i) => `<div class="homework-item"><div><div class="mb-1"><span class="homework-badge">${hw.class}</span><span class="homework-badge" style="background:#e3f2fd; color:#1976d2;">${hw.subject}</span><small class="text-danger fw-bold"><i class="far fa-clock"></i> ${hw.dueDate}</small></div><p class="mb-0 small text-secondary">${hw.description}</p></div><button class="btn-delete-sm" onclick="deleteHomework(${i})"><i class="fas fa-trash"></i></button></div>`).join('');
}
async function deleteHomework(index) {
    if (confirm("Delete this assignment?")) {
        if (verifyAction()) {
            homeworkList.splice(index, 1);
            await DataService.saveHomework(homeworkList);
            renderHomework();
        }
    }
}
function initCharts() {
    // Array safety check
    if (!Array.isArray(students)) {
        console.error("initCharts: students is not an array", students);
        return;
    }

    let totalPaid = 0, totalOutstanding = 0;
    students.forEach(s => {
        const paid = parseInt(s.paid || 0);
        const fee = parseInt(s.fee || 1000);
        totalPaid += paid;
        totalOutstanding += (fee - paid);
    });

    if (feesChartInstance) feesChartInstance.destroy();
    if (attendanceChartInstance) attendanceChartInstance.destroy();

    const ctxFees = document.getElementById('feesChart');
    const ctxAtt = document.getElementById('attendanceChart');

    if (ctxFees && ctxAtt) {
        const labelsFees = isArabic ? ['تم التحصيل', 'المتبقي'] : ['Collected', 'Outstanding'];
        const labelsAtt = isArabic ? 'معدل الحضور %' : 'Attendance Rate %';
        const months = isArabic ? ['أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر', 'يناير'] : ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'];

        feesChartInstance = new Chart(ctxFees, {
            type: 'doughnut',
            data: {
                labels: labelsFees,
                datasets: [{
                    data: [totalPaid, totalOutstanding],
                    backgroundColor: ['#2ecc71', '#e74c3c'],
                    borderWidth: 0
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });

        attendanceChartInstance = new Chart(ctxAtt, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: labelsAtt,
                    data: [85, 88, 92, 90, 85, 94],
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, max: 100 } }
            }
        });
    }
}
async function saveShopSettings() { shopData.summer.price = document.getElementById('summerPrice').value; shopData.summer.desc = document.getElementById('summerDesc').value; shopData.winter.price = document.getElementById('winterPrice').value; shopData.winter.desc = document.getElementById('winterDesc').value; await DataService.saveShopData(shopData); showToast('success', isArabic ? "تم تحديث المتجر" : "Shop Updated Successfully!"); }
async function completeOrder(index) { if (confirm("Mark order as completed?")) { orders.splice(index, 1); await DataService.setItem(DataService.KEYS.ORDERS, orders); renderOrders(); showToast('success', isArabic ? 'تم إكمال الطلب' : 'Order Completed'); } }

// --- NEW BROADCAST LOGIC ---
function populateBroadcastOptions() {
    // Fill Class Dropdown
    const classSelect = document.getElementById('broadcastClassSelect');
    classSelect.innerHTML = classes.map(c => `<option value="${c}">${c}</option>`).join('');

    // Fill Student Dropdown
    const studentSelect = document.getElementById('broadcastStudentSelect');
    studentSelect.innerHTML = students.map(s => `<option value="${s.id}">${s.name} (${s.id})</option>`).join('');
}

function toggleBroadcastTarget() {
    const type = document.querySelector('input[name="broadcastType"]:checked').value;
    const classDiv = document.getElementById('broadcastClassContainer');
    const studentDiv = document.getElementById('broadcastStudentContainer');

    classDiv.style.display = 'none';
    studentDiv.style.display = 'none';

    if (type === 'class') classDiv.style.display = 'block';
    if (type === 'student') studentDiv.style.display = 'block';
}

async function sendAdminBroadcast() {
    const title = document.getElementById('adminMsgTitle').value;
    const body = document.getElementById('adminMsgBody').value;
    const type = document.querySelector('input[name="broadcastType"]:checked').value;

    if (!title || !body) return showToast('error', "Title and Message Required");

    let targetList = [];

    if (type === 'all') {
        targetList = classes; // Send to all classes
    } else if (type === 'class') {
        const cls = document.getElementById('broadcastClassSelect').value;
        if (cls) targetList = [cls];
    } else if (type === 'student') {
        const sid = document.getElementById('broadcastStudentSelect').value;
        if (sid) {
            // Direct message logic
            const msg = {
                id: Date.now(),
                date: new Date().toLocaleDateString(),
                sender: "Admin",
                title: title,
                body: body,
                targetStudentId: sid,
                isPrivate: true,
                targetClass: students.find(s => s.id == sid)?.grade // Fallback for filtering
            };
            notifications.unshift(msg);
            finishBroadcast();
            return;
        }
    }

    // Standard Class Broadcast (All or Specific)
    targetList.forEach(c => {
        notifications.unshift({
            id: Date.now() + Math.random(),
            date: new Date().toLocaleDateString(),
            targetClass: c,
            sender: "Admin",
            title: title,
            body: body
        });
    });

    finishBroadcast();
}

async function finishBroadcast() {
    await DataService.saveNotifications(notifications);
    showToast('info', isArabic ? "تم الإرسال" : "Broadcast Sent!");
    document.getElementById('adminMsgTitle').value = "";
    document.getElementById('adminMsgBody').value = "";
    loadAdminHistory();
}

function toggleLanguage() { isArabic = !isArabic; const lang = isArabic ? 'ar' : 'en'; document.documentElement.setAttribute('dir', isArabic ? 'rtl' : 'ltr'); document.documentElement.setAttribute('lang', lang); document.querySelectorAll('[data-en]').forEach(el => { el.innerText = el.getAttribute(`data-${lang}`); }); document.querySelectorAll('[data-en-ph]').forEach(el => { el.placeholder = el.getAttribute(`data-${lang}-ph`); }); initCharts(); }
function setupShopImageInputs() { ['summer', 'winter'].forEach(type => { const input = document.getElementById(type + 'Input'); if (input) { input.onchange = (e) => { if (e.target.files[0]) { const r = new FileReader(); r.onload = (ev) => { shopData[type].img = ev.target.result; document.getElementById(type + 'Preview').src = ev.target.result; document.getElementById(type + 'Preview').style.display = 'block'; }; r.readAsDataURL(e.target.files[0]); } }; } }); }
function loadShopSettings() { if (shopData.summer) { document.getElementById('summerPrice').value = shopData.summer.price; document.getElementById('summerDesc').value = shopData.summer.desc; if (shopData.summer.img) { document.getElementById('summerPreview').src = shopData.summer.img; document.getElementById('summerPreview').style.display = 'block'; } } if (shopData.winter) { document.getElementById('winterPrice').value = shopData.winter.price; document.getElementById('winterDesc').value = shopData.winter.desc; if (shopData.winter.img) { document.getElementById('winterPreview').src = shopData.winter.img; document.getElementById('winterPreview').style.display = 'block'; } } }
function renderOrders() { const container = document.getElementById('ordersContainer'); if (orders.length === 0) { container.innerHTML = '<p class="text-muted">' + (isArabic ? 'لا يوجد طلبات' : 'No pending orders.') + '</p>'; } else { container.innerHTML = orders.map((o, i) => `<div class="order-card"><div style="display:flex; justify-content:space-between;"><strong>Order #${o.id.toString().slice(-4)}</strong><small>${o.date}</small></div><div style="margin:5px 0;">Parent: ${o.parentName || 'Mr. Masadeh'}</div><ul style="padding-left:20px; margin:5px 0;">${o.items.map(item => `<li>${item.name} (${item.price} JOD)</li>`).join('')}</ul><div style="font-weight:bold; margin-top:5px;">Total: ${o.total} JOD</div><div class="text-secondary small">Paid via: ${o.paymentMethod || 'Cash'}</div><button class="btn btn-primary" style="padding:5px 10px; margin-top:5px; font-size:0.8rem;" onclick="completeOrder(${i})">${isArabic ? 'إكمال' : 'Mark Complete'}</button></div>`).join(''); } }
function loadAdminHistory() { const u = [], s = new Set(); notifications.filter(m => m.sender == "Admin").slice(0, 5).forEach(m => { if (!s.has(m.title)) { u.push(m); s.add(m.title); } }); document.getElementById('adminMsgHistory').innerHTML = u.map(m => `<div class="msg-history-item"><strong>${m.title}</strong><br><small>${m.date}</small></div>`).join(''); }
function setupLunchDragAndDrop() { const z = document.getElementById('lunchDropZone'), i = document.getElementById('lunchImageInput'), p = document.getElementById('lunchPreview'); z.onclick = () => i.click(); i.onchange = (e) => { if (i.files[0]) { const r = new FileReader(); r.onload = (ev) => { selectedLunchImage = ev.target.result; p.src = selectedLunchImage; p.style.display = 'block'; document.getElementById('lunchDropText').style.display = 'none'; }; r.readAsDataURL(i.files[0]); } }; }
async function addLunchItem(e) { e.preventDefault(); lunchMenu.push({ name: document.getElementById('lunchName').value, category: document.getElementById('lunchCategory').value, price: document.getElementById('lunchPrice').value, image: selectedLunchImage }); await DataService.saveLunchMenu(lunchMenu); renderLunchMenu(); }
function renderLunchMenu() { document.getElementById('adminLunchList').innerHTML = lunchMenu.map((m, i) => `<li>${m.name} <button style="color:red;border:none;" onclick="deleteLunch(${i})">X</button></li>`).join(''); }
async function deleteLunch(i) {
    if (confirm("Delete this lunch item?")) {
        if (verifyAction()) {
            lunchMenu.splice(i, 1);
            await DataService.saveLunchMenu(lunchMenu);
            renderLunchMenu();
        }
    }
}
async function clearLunchMenu() {
    if (confirm("Delete ALL lunch items?")) {
        if (verifyAction()) {
            lunchMenu = [];
            await DataService.saveLunchMenu(lunchMenu);
            renderLunchMenu();
        }
    }
}
async function uploadGalleryImage() {
    const i = document.getElementById('galleryInput');
    const c = document.getElementById('galleryCaption').value;

    if (i.files[0]) {
        await DataService.uploadGalleryImage(c, 'All', i.files[0]);
        // Refresh
        galleryData = await DataService.getGallery();
        i.value = "";
        document.getElementById('galleryCaption').value = "";
        loadGallery();
        showToast('success', isArabic ? "تم الرفع" : "Image Uploaded");
    }
}
function loadGallery() { document.getElementById('adminGalleryGrid').innerHTML = galleryData.map((m, i) => `<div style="border:1px solid #ddd;"><img src="${m.url || m}" style="width:100%;height:100px;object-fit:cover;"><button onclick="deleteGallery(${i})" style="width:100%;background:red;color:white;">Delete</button></div>`).join(''); }
async function deleteGallery(i) {
    if (confirm("Delete this image?")) {
        if (verifyAction()) {
            galleryData.splice(i, 1);
            await DataService.saveGallery(galleryData);
            loadGallery();
        }
    }
}
function renderBusLists() { document.getElementById('morningBusList').innerHTML = busData.morning.map((s, i) => `<div class="admin-timeline-item"><div><strong>${s.time}</strong> ${s.loc}</div><button class="btn-delete-sm" onclick="delBus('morning',${i})">x</button></div>`).join(''); document.getElementById('eveningBusList').innerHTML = busData.evening.map((s, i) => `<div class="admin-timeline-item"><div><strong>${s.time}</strong> ${s.loc}</div><button class="btn-delete-sm" onclick="delBus('evening',${i})">x</button></div>`).join(''); }
async function addBusStop(t) { const l = document.getElementById(t == 'morning' ? 'busMorningLoc' : 'busEveningLoc').value, tm = document.getElementById(t == 'morning' ? 'busMorningTime' : 'busEveningTime').value; if (l && tm) { busData[t].push({ loc: l, time: tm }); busData[t].sort((a, b) => a.time.localeCompare(b.time)); await DataService.saveBusData(busData); renderBusLists(); } }
async function delBus(t, i) {
    if (confirm("Delete this bus stop?")) {
        if (verifyAction()) {
            busData[t].splice(i, 1);
            await DataService.saveBusData(busData);
            renderBusLists();
        }
    }
}

function showToast(type, msg) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-msg toast-${type}`;
    toast.innerText = msg;

    container.appendChild(toast);

    // Fade in
    setTimeout(() => {
        toast.style.opacity = '1';
    }, 10);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
    }, 3000);
}

/* --- WEBSITE EDITOR LOGIC --- */

// Default Data Structure
/* --- WEBSITE EDITOR LOGIC (SECURE) --- */

// Default Data Structure
// Default Data Structure
let homeData = {};

// Initialize Editor on Load
// Initialize Editor on Load - MERGED INTO MAIN ONLOAD
// window.addEventListener('load', function () {
//    loadWebsiteEditor();
// });

function showWebSection(id) {
    document.querySelectorAll('.web-section').forEach(el => el.style.display = 'none');
    document.getElementById(id).style.display = 'block';
}

function loadWebsiteEditor() {
    // 1. Load About
    document.getElementById('editAboutTitle').value = homeData.about.title;
    document.getElementById('editAboutDesc').value = homeData.about.desc;
    document.getElementById('editAboutQuote').value = homeData.about.quote;
    document.getElementById('editAboutAuthor').value = homeData.about.author;
    document.getElementById('editAboutPreview').src = homeData.about.image;

    // 2. Load Features
    renderEditorFeatures();

    // 3. Load Testimonials
    renderEditorTestimonials();

    // 4. Load Footer
    document.getElementById('editFooterDesc').value = homeData.footer.desc;
    document.getElementById('editFooterAddr').value = homeData.footer.address;
    document.getElementById('editFooterPhone').value = homeData.footer.phone;
    document.getElementById('editFooterEmail').value = homeData.footer.email;

    // Load Socials (Safe check)
    if (!homeData.footer.social) homeData.footer.social = { fb: "#", insta: "#", twitter: "#", linkedin: "#" };
    document.getElementById('editSocialFb').value = homeData.footer.social.fb;
    document.getElementById('editSocialInsta').value = homeData.footer.social.insta;
    document.getElementById('editSocialTwitter').value = homeData.footer.social.twitter;
    document.getElementById('editSocialLinkedin').value = homeData.footer.social.linkedin;
}

// --- Features Logic ---
function renderEditorFeatures() {
    const container = document.getElementById('featuresListContainer');
    container.innerHTML = homeData.features.map((f, i) => `
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 10px; border: 1px solid #eee;">
            <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
                <div style="width: 40px; text-align: center;"><i class="${f.icon} fa-lg text-muted"></i></div>
                <input type="text" class="form-control" value="${f.icon}" onchange="updateFeature(${i}, 'icon', this.value)" placeholder="Icon Class (e.g. fas fa-star)">
                <input type="text" class="form-control" value="${f.title}" onchange="updateFeature(${i}, 'title', this.value)" placeholder="Title">
                <button class="btn btn-danger" onclick="deleteFeature(${i})"><i class="fas fa-trash"></i></button>
            </div>
            <input type="text" class="form-control" value="${f.desc}" onchange="updateFeature(${i}, 'desc', this.value)" placeholder="Description">
        </div>
    `).join('');
}

function addFeatureItem() {
    homeData.features.push({ icon: "fas fa-star", title: "New Feature", desc: "Description here." });
    renderEditorFeatures();
}

async function deleteFeature(i) {
    // SECURITY CHECK: Requires Admin Password
    if (confirm(isArabic ? "هل أنت متأكد من حذف هذه الميزة؟" : "Are you sure you want to delete this feature?")) {
        if (verifyAction()) {
            homeData.features.splice(i, 1);
            renderEditorFeatures();
            showToast('success', isArabic ? "تم الحذف" : "Feature Deleted");
        }
    }
}

function updateFeature(i, key, val) { homeData.features[i][key] = val; }

// --- Testimonials Logic ---
function renderEditorTestimonials() {
    const container = document.getElementById('testimonialsListContainer');
    container.innerHTML = homeData.testimonials.map((t, i) => `
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 10px; border: 1px solid #eee;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                <input type="text" class="form-control" value="${t.name}" onchange="updateTestimonial(${i}, 'name', this.value)" placeholder="Name">
                <input type="text" class="form-control" value="${t.role}" onchange="updateTestimonial(${i}, 'role', this.value)" placeholder="Role (e.g. Mother of X)">
            </div>
            <textarea class="form-control mb-2" onchange="updateTestimonial(${i}, 'quote', this.value)" placeholder="Quote" rows="2">${t.quote}</textarea>
            <div style="text-align: right;">
                <button class="btn btn-danger" onclick="deleteTestimonial(${i})"><i class="fas fa-trash"></i> Delete Testimonial</button>
            </div>
        </div>
    `).join('');
}

function addTestimonialItem() {
    homeData.testimonials.push({ name: "Parent Name", role: "Parent", quote: "Great school!", avatar: "" });
    renderEditorTestimonials();
}

function deleteTestimonial(i) {
    // SECURITY CHECK: Requires Admin Password
    if (confirm(isArabic ? "هل أنت متأكد من حذف هذا الرأي؟" : "Are you sure you want to delete this testimonial?")) {
        if (verifyAction()) {
            homeData.testimonials.splice(i, 1);
            renderEditorTestimonials();
            showToast('success', isArabic ? "تم الحذف" : "Testimonial Deleted");
        }
    }
}

function updateTestimonial(i, key, val) { homeData.testimonials[i][key] = val; }

// --- Image Handling ---
function previewWebImage(input, imgId) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            document.getElementById(imgId).src = e.target.result;
            // Update data immediately for About Image
            if (imgId === 'editAboutPreview') homeData.about.image = e.target.result;
        }
        reader.readAsDataURL(input.files[0]);
    }
}

// --- Save Function ---
async function saveWebsiteContent() {
    // Sync About Inputs
    homeData.about.title = document.getElementById('editAboutTitle').value;
    homeData.about.desc = document.getElementById('editAboutDesc').value;
    homeData.about.quote = document.getElementById('editAboutQuote').value;
    homeData.about.author = document.getElementById('editAboutAuthor').value;

    // Sync Footer Inputs
    homeData.footer.desc = document.getElementById('editFooterDesc').value;
    homeData.footer.address = document.getElementById('editFooterAddr').value;
    homeData.footer.phone = document.getElementById('editFooterPhone').value;
    homeData.footer.email = document.getElementById('editFooterEmail').value;

    // Sync Socials
    homeData.footer.social = {
        fb: document.getElementById('editSocialFb').value,
        insta: document.getElementById('editSocialInsta').value,
        twitter: document.getElementById('editSocialTwitter').value,
        linkedin: document.getElementById('editSocialLinkedin').value
    };

    if (verifyAction()) {
        await DataService.saveHomeData(homeData);
        showToast('success', isArabic ? 'تم حفظ محتوى الموقع' : 'Website Content Saved');
    }
}


// --- EXPOSED FUNCTIONS ---

function showPanel(id) {
    document.querySelectorAll('.panel').forEach(p => {
        p.style.display = 'none';
        p.classList.remove('active');
    });
    document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));

    const panel = document.getElementById(id);
    if (panel) {
        panel.style.display = 'block';
        panel.classList.add('active');
    }

    // Activate sidebar button
    const btns = document.querySelectorAll('.sidebar-btn');
    btns.forEach(b => {
        const onclick = b.getAttribute('onclick');
        if (onclick && onclick.includes(`'${id}'`)) {
            b.classList.add('active');
        }
    });

    if (id === 'students' && typeof initCharts === 'function') initCharts();
}

// Expose functions to global window for HTML onclick events
window.showPanel = showPanel;
window.toggleLanguage = toggleLanguage;
window.exportToPDF = exportToPDF;
window.openStudentModal = openStudentModal;
window.closeModal = closeModal;
window.saveStudent = saveStudent;
window.saveTeacher = saveTeacher;
window.openTeacherModal = openTeacherModal;
window.addClass = addClass;
window.deleteClassRoster = deleteClassRoster;
window.factoryReset = factoryReset;
window.saveSettings = saveSettings;
window.backupData = backupData;
window.openTransferModal = openTransferModal;
window.executeTransfer = executeTransfer;
window.saveWebsiteContent = saveWebsiteContent;
window.showWebSection = showWebSection;
window.previewWebImage = previewWebImage;
window.addFeatureItem = addFeatureItem;
window.addTestimonialItem = addTestimonialItem;
window.renderTable = renderTable;
window.loadRCStudents = loadRCStudents;
window.renderAdminReportCard = renderAdminReportCard;
window.downloadAdminReportCardPDF = downloadAdminReportCardPDF;
window.saveAdminGrades = saveAdminGrades;
window.saveShopSettings = saveShopSettings;
window.loadDaySchedule = loadDaySchedule;
window.addTimeSlot = addTimeSlot;
window.saveDaySchedule = saveDaySchedule;
window.postHomework = postHomework;
window.addBusStop = addBusStop;
window.addLunchItem = addLunchItem;
window.clearLunchMenu = clearLunchMenu;
window.uploadGalleryImage = uploadGalleryImage;
window.sendAdminBroadcast = sendAdminBroadcast;
window.toggleBroadcastTarget = toggleBroadcastTarget;

window.initCharts = initCharts;

window.saveShopSettings = saveShopSettings;
window.completeOrder = completeOrder;

window.setupShopImageInputs = setupShopImageInputs;
window.loadShopSettings = loadShopSettings;

window.populateBroadcastOptions = populateBroadcastOptions;
window.toggleBroadcastTarget = toggleBroadcastTarget;
window.sendAdminBroadcast = sendAdminBroadcast;

window.toggleLanguage = toggleLanguage;

window.setupLunchDragAndDrop = setupLunchDragAndDrop;
window.addLunchItem = addLunchItem;
window.deleteLunch = deleteLunch;
window.clearLunchMenu = clearLunchMenu;

window.uploadGalleryImage = uploadGalleryImage;
window.loadGallery = loadGallery;
window.deleteGallery = deleteGallery;

window.renderBusLists = renderBusLists;
window.addBusStop = addBusStop;
window.delBus = delBus;

window.saveWebsiteContent = saveWebsiteContent;
window.showWebSection = showWebSection;
window.addFeatureItem = addFeatureItem;
window.deleteFeature = deleteFeature;
window.updateFeature = updateFeature;
window.addTestimonialItem = addTestimonialItem;
window.deleteTestimonial = deleteTestimonial;
window.updateTestimonial = updateTestimonial;
window.previewWebImage = previewWebImage;
window.showToast = showToast;

