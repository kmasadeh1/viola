import { DataService } from '../services/dataService.js';

let isArabic = false;
let studentClass = "KG2 A";
let studentId = "202601";
// ----------------------------------------------------
// UPDATED VARIABLES FOR REAL FEE & CREDIT INTEGRATION
// ----------------------------------------------------
let totalFeeAmount = 0;
let currentPaidAmount = 0;
let currentCreditAmount = 0;

// ADMIN PREVIEW FLAG
let isAdminPreview = false;

document.addEventListener('DOMContentLoaded', async function () {
    // 1. Check for Saved Language
    const savedLang = DataService.getPreferredLanguage();
    if (savedLang === 'ar') {
        isArabic = true;
        toggleLanguage(true); // Apply saved language immediately
    }

    // 2. Check for Admin Preview Flag in Session Storage
    const previewId = sessionStorage.getItem('viola_preview_student_id');
    if (previewId) {
        isAdminPreview = true;
        studentId = previewId; // Override ID with selected student
        document.getElementById('adminPreviewBanner').style.display = 'flex';
        document.getElementById('logoutLink').style.display = 'none'; // Hide logout in preview
    }

    setTimeout(() => { document.getElementById('preloader').style.opacity = '0'; setTimeout(() => document.getElementById('preloader').style.display = 'none', 500); }, 300);
    await loadStudentInfo();
    await loadNotifications();
    await updateScheduleWidget();
    updateBusWidget();
    await updateAttendanceWidget();
    await loadHomework();
    // Note: updateFeesUI and updateCreditUI are called inside loadStudentInfo now
    await loadReportCard();
});

function logout() {
    sessionStorage.removeItem('viola_current_student_id');
    window.location.href = 'login.html';
}

function exitAdminPreview() {
    sessionStorage.removeItem('viola_preview_student_id');
    window.location.href = 'admin_dashboard.html';
}

// --- RESTRICTED ACTIONS ---
function handleShopClick() {
    if (isAdminPreview) {
        alert(isArabic ? "هذه الميزة معطلة في وضع المعاينة" : "Shop is disabled in Admin Preview Mode");
    } else {
        window.location.href = 'shop.html';
    }
}

function handleLunchClick() {
    if (isAdminPreview) {
        alert(isArabic ? "هذه الميزة معطلة في وضع المعاينة" : "Lunch Menu is disabled in Admin Preview Mode");
    } else {
        window.location.href = 'lunch.html';
    }
}

// --- DYNAMIC REPORT CARD ---
async function loadReportCard() {
    const term = document.getElementById('parentTermSelect').value;
    const gradesData = await DataService.getGrades(term);
    const studentGrades = gradesData[studentId] || {};
    const subjectsList = await DataService.getSubjects();

    const tableBody = document.getElementById('reportCardBody');
    tableBody.innerHTML = "";

    let total = 0;
    let count = 0;

    subjectsList.forEach(subName => {
        const key = subName.replace(/\s+/g, '_').toLowerCase();
        let displayScore = studentGrades[key];
        if (displayScore === undefined || displayScore === null || displayScore === "") { displayScore = "-"; }

        const score = parseInt(displayScore) || 0;
        let badgeClass = "bg-secondary";
        let gradeLetter = "-";

        if (displayScore !== "-") {
            total += score;
            count++;
            if (score >= 90) { badgeClass = "grade-high"; gradeLetter = "A"; }
            else if (score >= 80) { badgeClass = "grade-high"; gradeLetter = "B"; }
            else if (score >= 70) { badgeClass = "grade-mid"; gradeLetter = "C"; }
            else if (score >= 60) { badgeClass = "grade-mid"; gradeLetter = "D"; }
            else { badgeClass = "grade-low"; gradeLetter = "F"; }
        }

        tableBody.innerHTML += `<tr><td class="fw-bold">${subName}</td><td class="text-end fw-bold">${displayScore}</td><td class="text-end"><span class="grade-pill ${badgeClass}">${gradeLetter}</span></td></tr>`;
    });

    const gpa = count > 0 ? Math.round(total / count) : 0;
    document.getElementById('gpaText').innerText = isArabic ? `المعدل: ${gpa}%` : `Avg: ${gpa}%`;
}

// --- STUDENT INFO, FEES & CREDIT LOADING (UPDATED) ---
async function loadStudentInfo() {
    try {
        const students = await DataService.getStudents();
        let student;

        // --- FIX: CHECK TOKEN FIRST ---
        const sessionStudentId = sessionStorage.getItem('viola_current_student_id');

        if (isAdminPreview) {
            student = students.find(s => s.id == studentId);
        } else if (sessionStudentId) {
            // LOAD LOGGED IN STUDENT
            student = students.find(s => s.id == sessionStudentId);
        } else {
            // Fallback (e.g. for testing without login)
            student = students.find(s => s.name.includes("Kareem")) || students[0];
        }

        if (student) {
            // 1. Update Profile Info
            document.getElementById('parentName').innerText = (isArabic ? "ولي أمر " : "Parent of ") + student.name.split(' ')[0];
            document.getElementById('studentName').innerText = student.name;
            document.getElementById('studentGrade').innerText = student.grade;
            if (student.photo) document.getElementById('headerStudentImg').src = student.photo;
            else document.getElementById('headerStudentImg').src = "https://ui-avatars.com/api/?name=" + encodeURIComponent(student.name) + "&background=random";

            // 2. Sync Global Variables
            studentId = student.id;
            studentClass = student.grade;

            // 3. LOAD REAL FEE & CREDIT DATA (The Fix)
            totalFeeAmount = parseInt(student.fee || 1000);
            currentPaidAmount = parseInt(student.paid || 0);
            currentCreditAmount = parseFloat(student.credit || 0);

            // 4. Update the UI immediately
            updateFeesUI();
            updateCreditUI();
        }
    } catch (e) { console.error("Error loading student data", e); }
}

// --- BROADCASTS ---
async function loadNotifications() {
    const allMsgs = await DataService.getNotifications();
    const myMsgs = allMsgs.filter(msg => {
        if (msg.isPrivate) return msg.targetStudentId == studentId;
        if (!msg.isPrivate && msg.targetClass === studentClass) return true;
        return false;
    });
    const container = document.getElementById('notificationsList');
    document.getElementById('notifCount').innerText = myMsgs.length;
    if (myMsgs.length > 0) {
        container.innerHTML = myMsgs.slice(0, 3).map(msg => `<div class="notice-item"><div class="d-flex justify-content-between align-items-center"><strong class="text-dark">${msg.title}</strong><small class="text-muted" style="font-size:0.7rem">${msg.date}</small></div><p class="mb-0 small text-secondary">${msg.body}</p></div>`).join('');
    } else {
        container.innerHTML = `<p class="text-muted py-2" data-en="No announcements." data-ar="لا يوجد إعلانات.">${isArabic ? 'لا يوجد إعلانات.' : 'No announcements.'}</p>`;
    }
}

async function openMessagesModal() {
    const allMsgs = await DataService.getNotifications();
    const myMsgs = allMsgs.filter(msg => {
        if (msg.isPrivate) return msg.targetStudentId == studentId;
        if (!msg.isPrivate && msg.targetClass === studentClass) return true;
        return false;
    });
    const container = document.getElementById('allMessagesBody');
    if (myMsgs.length === 0) {
        container.innerHTML = `<p class="text-center text-muted p-3" data-en="No messages found." data-ar="لا يوجد رسائل.">${isArabic ? 'لا يوجد رسائل.' : 'No messages found.'}</p>`;
    } else {
        container.innerHTML = myMsgs.map(msg => `<div class="card mb-3 border-0 shadow-sm"><div class="card-body"><div class="d-flex justify-content-between mb-2 border-bottom pb-2"><h6 class="fw-bold text-primary mb-0">${msg.title}</h6><span class="badge bg-light text-dark border">${msg.date}</span></div><p class="card-text text-secondary">${msg.body}</p></div></div>`).join('');
    }
    new bootstrap.Modal(document.getElementById('messagesModal')).show();
    if (isArabic) toggleLanguage(true);
}

// --- HOMEWORK ---
async function loadHomework() {
    const allHomework = await DataService.getHomework();
    const myHomework = allHomework.filter(hw => hw.class === studentClass);
    document.getElementById('hwCount').innerText = myHomework.length;
    const container = document.getElementById('homeworkListWidget');
    if (myHomework.length === 0) {
        container.innerHTML = `<p class="text-muted small py-2" data-en="No active homework." data-ar="لا يوجد واجبات.">${isArabic ? 'لا يوجد واجبات.' : 'No active homework.'}</p>`;
    } else {
        container.innerHTML = myHomework.map(hw => `<div class="notice-item" style="border-left: 3px solid #9b59b6;"><div class="d-flex justify-content-between align-items-center"><strong class="text-dark">${hw.subject}</strong><small class="text-danger fw-bold" style="font-size:0.7rem">${hw.dueDate}</small></div><p class="mb-0 small text-secondary">${hw.description}</p></div>`).join('');
    }
}

// --- FEES UI ---
function updateFeesUI() {
    const outstanding = totalFeeAmount - currentPaidAmount;
    const percentage = (currentPaidAmount / totalFeeAmount) * 100;
    const card = document.getElementById('feesCard');
    const amountEl = document.getElementById('feeAmount');
    const btn = document.getElementById('payFeesBtn');
    const label = document.getElementById('feeLabel');
    const bar = document.getElementById('feeProgressBar');
    bar.style.width = `${percentage}%`;

    if (outstanding <= 0) {
        card.classList.add('paid'); amountEl.innerText = "0 JOD";
        label.innerText = isArabic ? "مدفوعة بالكامل" : "Fully Paid"; label.setAttribute("data-en", "Fully Paid"); label.setAttribute("data-ar", "مدفوعة بالكامل");
        btn.disabled = true; btn.classList.remove('btn-light', 'text-primary'); btn.classList.add('btn-white', 'text-success'); btn.innerHTML = `<i class="fas fa-check-circle me-1"></i>`;
    } else {
        card.classList.remove('paid'); amountEl.innerText = `${outstanding} JOD`;
        label.innerText = isArabic ? "المستحق:" : "Due:"; label.setAttribute("data-en", "Due:"); label.setAttribute("data-ar", "المستحق:");
        btn.disabled = false; btn.classList.add('btn-light', 'text-primary'); btn.classList.remove('btn-white', 'text-success'); btn.innerHTML = `<span data-en="Pay" data-ar="دفع">${isArabic ? "دفع" : "Pay"}</span>`;
    }
}

// --- CREDIT TOP-UP LOGIC (UPDATED) ---
function updateCreditUI() {
    const el = document.getElementById('creditAmountHeader');
    if (el) el.innerText = currentCreditAmount.toFixed(2) + " JOD";
}

function openBuyCreditModal() {
    if (isAdminPreview) {
        alert(isArabic ? "هذه الميزة معطلة في وضع المعاينة" : "Feature disabled in Admin Preview Mode");
        return;
    }
    new bootstrap.Modal(document.getElementById('buyCreditModal')).show();
}

async function processCreditPurchase(e) {
    e.preventDefault();
    const btn = document.getElementById('creditSubmitBtn');
    const spinner = document.getElementById('creditSpinner');
    const amount = parseFloat(document.getElementById('creditAmountInput').value);

    if (amount <= 0) {
        alert(isArabic ? "يرجى إدخال مبلغ صحيح" : "Please enter a valid amount");
        return;
    }

    btn.disabled = true;
    spinner.classList.remove('d-none');

    // Simulate Payment Processing (Async)
    // In real world, this would be an API call to payment gateway first.
    // For now we just update DB.

    try {
        // UPDATE REAL DB
        let students = await DataService.getStudents();
        const idx = students.findIndex(s => s.id == studentId);
        if (idx !== -1) {
            let oldCredit = parseFloat(students[idx].credit || 0);
            students[idx].credit = oldCredit + amount;
            await DataService.saveStudents(students); // Use API

            // Sync local state
            currentCreditAmount = students[idx].credit;
            DataService.setStudentCredit(currentCreditAmount); // Sync LS for checkout.js

            updateCreditUI();

            const modal = bootstrap.Modal.getInstance(document.getElementById('buyCreditModal'));
            modal.hide();

            showToast(isArabic ? "تم شحن الرصيد بنجاح" : "Credit added successfully!");
        }
    } catch (error) {
        console.error(error);
        alert("Failed to process transaction.");
    } finally {
        spinner.classList.add('d-none');
        btn.disabled = false;
        document.getElementById('creditAmountInput').value = "";
    }
}

// --- PAYMENT MODAL LOGIC (UPDATED) ---
function openPaymentModal() {
    if (isAdminPreview) {
        alert(isArabic ? "الدفع معطل في وضع المعاينة" : "Payment disabled in Admin Preview Mode");
        return;
    }
    const outstanding = totalFeeAmount - currentPaidAmount;
    document.getElementById('modalOutstandingAmount').innerText = `${outstanding} JOD`;
    document.getElementById('modalWalletBalance').innerText = `${currentCreditAmount.toFixed(2)} JOD`;

    const input = document.getElementById('paymentAmountInput');
    input.value = outstanding; input.max = outstanding;
    document.getElementById('methodCard').checked = true; togglePaymentMethod();
    new bootstrap.Modal(document.getElementById('paymentModal')).show();
}

function togglePaymentMethod() {
    const isWallet = document.getElementById('methodWallet').checked;
    const cardFields = document.getElementById('cardFields');
    const inputs = cardFields.querySelectorAll('input');
    if (isWallet) { cardFields.style.display = 'none'; inputs.forEach(i => i.removeAttribute('required')); }
    else { cardFields.style.display = 'block'; inputs.forEach(i => i.setAttribute('required', '')); }
}

async function processPayment(e) {
    e.preventDefault();
    const btn = document.getElementById('paySubmitBtn');
    const spinner = document.getElementById('paySpinner');
    const inputAmount = parseFloat(document.getElementById('paymentAmountInput').value);
    const isWallet = document.getElementById('methodWallet').checked;
    const outstanding = totalFeeAmount - currentPaidAmount;

    if (inputAmount <= 0 || inputAmount > outstanding) { alert(isArabic ? "مبلغ غير صحيح" : "Invalid amount"); return; }
    if (isWallet && inputAmount > currentCreditAmount) { alert(isArabic ? "رصيد المحفظة غير كافٍ" : "Insufficient wallet balance"); return; }

    btn.disabled = true; spinner.classList.remove('d-none');

    // Simulate Payment Processing (Async)
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
        const students = await DataService.getStudents();
        const idx = students.findIndex(s => s.id == studentId);

        if (idx !== -1) {
            // 1. Deduct from wallet if used
            if (isWallet) {
                let oldCredit = parseFloat(students[idx].credit || 0);
                let newCredit = oldCredit - inputAmount;
                students[idx].credit = newCredit;
                currentCreditAmount = newCredit;
            }

            // 2. Update Fees
            let oldPaid = parseInt(students[idx].paid || 0);
            let newPaid = oldPaid + inputAmount;
            students[idx].paid = newPaid;
            currentPaidAmount = newPaid;

            // 3. Save
            await DataService.saveStudents(students);
        }

        const modal = bootstrap.Modal.getInstance(document.getElementById('paymentModal'));
        modal.hide();
        updateFeesUI();
        updateCreditUI();

        btn.disabled = false; spinner.classList.add('d-none');
        alert(isArabic ? "تم الدفع بنجاح!" : "Payment Successful!");
    } catch (error) {
        console.error("Payment failed", error);
        btn.disabled = false; spinner.classList.add('d-none');
        alert("Payment processing failed.");
    }
}

// --- ATTENDANCE & UTILS ---
async function updateAttendanceWidget() {
    const dateStr = new Date().toISOString().split('T')[0];
    const todayData = await DataService.getAttendance(dateStr);
    const status = todayData[studentId];
    const badge = document.getElementById('attendanceBadge');
    if (status === 'present') {
        badge.className = 'status-badge bg-success text-white';
        badge.innerText = isArabic ? 'حاضر' : 'Present';
        badge.setAttribute('data-en', 'Present');
        badge.setAttribute('data-ar', 'حاضر');
    } else if (status === 'late') {
        badge.className = 'status-badge bg-warning text-dark';
        badge.innerText = isArabic ? 'متأخر' : 'Late';
        badge.setAttribute('data-en', 'Late');
        badge.setAttribute('data-ar', 'متأخر');
    } else if (status === 'absent') {
        badge.className = 'status-badge bg-danger text-white';
        badge.innerText = isArabic ? 'غائب' : 'Absent';
        badge.setAttribute('data-en', 'Absent');
        badge.setAttribute('data-ar', 'غائب');
    } else {
        badge.className = 'status-badge bg-secondary text-white';
        badge.innerText = '--';
        badge.setAttribute('data-en', '--');
        badge.setAttribute('data-ar', '--');
    }
}

async function openAttendanceModal() {
    const list = document.getElementById('attendanceHistoryList');
    list.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const data = await DataService.getAttendance(dateStr);
        const status = data[studentId] || 'N/A';
        let icon = '<i class="fas fa-minus text-muted"></i>';
        let label = isArabic ? 'غير مسجل' : 'Not Recorded';
        if (status === 'present') {
            icon = '<i class="fas fa-check-circle text-success"></i>';
            label = isArabic ? 'حاضر' : 'Present';
        } else if (status === 'late') {
            icon = '<i class="fas fa-clock text-warning"></i>';
            label = isArabic ? 'متأخر' : 'Late';
        } else if (status === 'absent') {
            icon = '<i class="fas fa-times-circle text-danger"></i>';
            label = isArabic ? 'غائب' : 'Absent';
        }
        const displayDate = i === 0 ? (isArabic ? 'اليوم' : 'Today') : d.toLocaleDateString();
        list.innerHTML += `<li class="list-group-item d-flex justify-content-between align-items-center"><span>${displayDate}</span><span>${icon} <span class="ms-2 small fw-bold">${label}</span></span></li>`;
    }
    new bootstrap.Modal(document.getElementById('attendanceModal')).show();
}

async function openClassGallery() {
    const galleryData = await DataService.getGallery();
    const classPhotos = galleryData.filter(img => img.targetClass === studentClass);
    const container = document.getElementById('classGalleryBody');
    document.getElementById('galleryClassName').innerText = studentClass;
    if (classPhotos.length === 0) {
        container.innerHTML = `<div class="col-12 text-center py-5"><i class="fas fa-images fa-3x text-muted mb-3" style="opacity: 0.3;"></i><h5 class="text-muted" data-en="No class photos yet." data-ar="لا يوجد صور للصف بعد.">No class photos yet.</h5></div>`;
    } else {
        container.innerHTML = classPhotos.map(img => `<div class="col-md-6 col-lg-4"><div class="card border-0 shadow-sm h-100"><div style="height: 200px; overflow: hidden;"><img src="${img.url}" class="card-img-top h-100 w-100" style="object-fit: cover;" alt="Class Photo"></div><div class="card-body p-2 text-center"><small class="text-muted fw-bold">${img.caption || (isArabic ? 'بدون عنوان' : 'No Caption')}</small></div></div></div>`).join('');
    }
    new bootstrap.Modal(document.getElementById('classGalleryModal')).show();
    if (isArabic) toggleLanguage(true);
}

function updateBusWidget() {
    const h = new Date().getHours();
    let statusEn = "Inactive";
    let statusAr = "غير نشطة";
    let color = "bg-secondary";
    if (h >= 6 && h < 9) {
        statusEn = "Morning Run";
        statusAr = "الجولة الصباحية";
        color = "bg-warning";
    } else if (h >= 13 && h < 16) {
        statusEn = "Afternoon Run";
        statusAr = "جولة العودة";
        color = "bg-warning";
    } else {
        statusEn = "Parked";
        statusAr = "في الموقف";
        color = "bg-success";
    }
    const el = document.getElementById('busStatusBadge');
    el.innerText = isArabic ? statusAr : statusEn;
    el.className = `status-badge text-white ${color}`;
}

async function updateScheduleWidget() {
    const daysEn = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const daysAr = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const todayIndex = new Date().getDay();
    const widget = document.getElementById('nextClassWidget');
    if (todayIndex === 5 || todayIndex === 6) { widget.innerText = isArabic ? "عطلة نهاية الأسبوع" : "Weekend"; return; }
    const allSchedules = await DataService.getSchedule();
    const classData = allSchedules[studentClass] || {};
    const todaySchedule = classData[todayIndex] || {};
    const slots = Object.keys(todaySchedule).sort();
    if (slots.length > 0) {
        const firstSlot = slots[0];
        const subject = todaySchedule[firstSlot].sub;
        widget.innerText = isArabic ? `التالي: ${subject} (${firstSlot})` : `Next: ${subject} (${firstSlot})`;
    } else {
        const dayName = isArabic ? daysAr[todayIndex] : daysEn[todayIndex];
        widget.innerText = isArabic ? `اليوم: ${dayName}` : `Today: ${dayName}`;
    }
}

function toggleLanguage(forceRefresh = false) {
    if (!forceRefresh) {
        isArabic = !isArabic;
        DataService.setPreferredLanguage(isArabic ? 'ar' : 'en');
    }
    const lang = isArabic ? 'ar' : 'en';
    document.documentElement.setAttribute('dir', isArabic ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
    document.querySelectorAll('[data-en]').forEach(el => { el.innerText = el.getAttribute(`data-${lang}`); });
    updateScheduleWidget(); updateBusWidget(); updateAttendanceWidget(); updateFeesUI(); updateCreditUI(); loadReportCard(); loadNotifications(); loadHomework();
}

// Expose functions to window
window.logout = logout;
window.exitAdminPreview = exitAdminPreview;
window.handleShopClick = handleShopClick;
window.handleLunchClick = handleLunchClick;
window.loadReportCard = loadReportCard;
window.openMessagesModal = openMessagesModal;
window.openBuyCreditModal = openBuyCreditModal;
window.processCreditPurchase = processCreditPurchase;
window.openPaymentModal = openPaymentModal;
window.togglePaymentMethod = togglePaymentMethod;
window.processPayment = processPayment;
window.openAttendanceModal = openAttendanceModal;
window.openClassGallery = openClassGallery;
window.toggleLanguage = toggleLanguage;
