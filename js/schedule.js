import { DataService } from '../services/dataService.js';

let isArabic = false;
let studentClass = "";

const daysEn = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
const daysAr = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];

window.onload = async function () {
    // LOAD PREFERENCE
    const savedLang = DataService.getPreferredLanguage();
    if (savedLang === 'ar') {
        isArabic = true;
        applyLanguageSettings();
    }

    await initStudentClass();
    await loadSchedule();
};

async function initStudentClass() {
    const students = await DataService.getStudents();

    // Check if Admin is previewing a specific student
    const previewId = sessionStorage.getItem('viola_preview_student_id');

    let student = null;
    if (previewId) {
        student = students.find(x => x.id == previewId);
    } else {
        // Default fallback for demo (matches Parent Dashboard logic)
        student = students.find(s => s.name.includes("Kareem")) || students[0];
    }

    if (student) {
        studentClass = student.grade;
        document.getElementById('displayClassName').innerText = studentClass;
    } else {
        studentClass = "KG1 A"; // Fallback if absolutely no data found
        document.getElementById('displayClassName').innerText = studentClass;
    }
}

// --- Helper to fix inconsistent keys ---
function normalizeTimeKey(k) {
    if (!k) return "";
    let [h, m] = k.split(':');
    if (!m || m === "") m = "00";
    if (h.length < 2) h = "0" + h;
    return `${h}:${m}`;
}

async function loadSchedule() {
    const allSchedules = await DataService.getSchedule();
    const classData = allSchedules[studentClass] || {};

    const thead = document.getElementById('scheduleHeader');
    const tbody = document.getElementById('scheduleBody');
    const emptyMsg = document.getElementById('emptyMessage');

    // 1. Find all unique NORMALIZED time slots
    let allTimes = new Set();
    for (let i = 0; i < 5; i++) {
        if (classData[i]) {
            Object.keys(classData[i]).forEach(t => allTimes.add(normalizeTimeKey(t)));
        }
    }

    if (allTimes.size === 0) {
        thead.innerHTML = '';
        tbody.innerHTML = '';
        emptyMsg.classList.remove('d-none');
        return;
    }

    emptyMsg.classList.add('d-none');
    const sortedTimes = Array.from(allTimes).sort();

    // 2. Build Header
    let headerHTML = `<th class="day-column" data-en="Day" data-ar="اليوم">${isArabic ? 'اليوم' : 'Day'}</th>`;
    sortedTimes.forEach(t => {
        headerHTML += `<th>${formatTimeDisplay(t)}</th>`;
    });
    thead.innerHTML = headerHTML;

    // 3. Build Body Rows
    let bodyHTML = '';
    for (let i = 0; i < 5; i++) {
        const dayName = isArabic ? daysAr[i] : daysEn[i];
        const dayData = classData[i] || {};

        let row = `<tr><td class="day-column">${dayName}</td>`;

        sortedTimes.forEach(timeKey => {
            let foundSlot = null;
            Object.keys(dayData).forEach(originalKey => {
                if (normalizeTimeKey(originalKey) === timeKey) {
                    foundSlot = dayData[originalKey];
                }
            });

            row += `<td>${formatSlot(foundSlot)}</td>`;
        });

        row += '</tr>';
        bodyHTML += row;
    }
    tbody.innerHTML = bodyHTML;
}

function formatTimeDisplay(time24) {
    if (!time24) return "";
    let [h, m] = time24.split(':');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${m} ${ampm}`;
}

function formatSlot(slotObj) {
    if (!slotObj || !slotObj.sub) {
        return '<span class="empty-slot">-</span>';
    }
    return `
        <span class="subject-badge">${slotObj.sub}</span>
        <span class="teacher-badge"><i class="fas fa-chalkboard-teacher me-1"></i>${slotObj.teach}</span>
    `;
}

function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Fix PDF title direction based on language
    const title = isArabic ? `جدول - ${studentClass}` : `Schedule - ${studentClass}`;
    doc.text(title, 14, 20);

    doc.autoTable({
        html: '#scheduleTable',
        startY: 30,
        theme: 'grid',
        headStyles: { fillColor: [52, 152, 219] },
        styles: { halign: 'center', font: 'helvetica' }
    });

    doc.save(`Viola_Schedule_${studentClass}.pdf`);
}

function toggleLanguage() {
    isArabic = !isArabic;
    DataService.setPreferredLanguage(isArabic ? 'ar' : 'en');
    applyLanguageSettings();
}

function applyLanguageSettings() {
    const lang = isArabic ? 'ar' : 'en';
    document.documentElement.setAttribute('dir', isArabic ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);

    // Update Toggle Button Text
    const langLabel = document.getElementById('langLabel');
    if (langLabel) {
        langLabel.innerText = isArabic ? 'English' : 'العربية';
    }

    document.querySelectorAll('[data-en]').forEach(el => {
        el.innerText = el.getAttribute(`data-${lang}`);
    });

    // Reload schedule to update Day names (Sunday/الأحد)
    loadSchedule();
}

// Expose functions
window.toggleLanguage = toggleLanguage;
window.downloadPDF = downloadPDF;
