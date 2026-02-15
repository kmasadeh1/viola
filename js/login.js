import { DataService } from '../services/dataService.js';

let isArabic = false;

window.onload = function () {
    // Clear previous session on load to ensure clean login
    sessionStorage.removeItem('viola_current_student_id');
    sessionStorage.removeItem('viola_current_teacher_email');

    const savedLang = DataService.getPreferredLanguage();
    if (savedLang === 'ar') {
        isArabic = true;
        applyLanguageSettings();
    }
};

function changeLoginTab(role) {
    document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.login-form').forEach(form => form.classList.remove('active'));
    const btn = document.getElementById('btn-' + role);
    if (btn) btn.classList.add('active');
    const form = document.getElementById(role + '-login');
    if (form) form.classList.add('active');
}

async function authRedirect(role) {
    const btnData = {
        'parent': { btnId: 'btn-sign-in-parent', loading: 'Signing In...', original: 'Sign In' },
        'teacher': { btnId: 'btn-sign-in-teacher', loading: 'Signing In...', original: 'Teacher Access' },
        'admin': { btnId: 'btn-sign-in-admin', loading: 'Signing In...', original: 'Dashboard Access' }
    };

    // UI Helpers for loading state (if buttons have IDs, otherwise just alert)
    // Note: In current HTML buttons don't have unique IDs for submit, so we skip UI loading state update for simplicity specific to button text unless we add IDs.
    // However, we can disable interaction generally.

    try {
        let credentials = {};

        if (role === 'parent') {
            const idInput = document.getElementById('parentIdInput').value;
            const passInput = document.getElementById('parentPassInput').value;

            if (!idInput || !passInput) {
                alert(isArabic ? "يرجى ملء جميع الحقول" : "Please fill in all fields");
                return;
            }
            credentials = { studentId: idInput, password: passInput };
        }
        else if (role === 'teacher') {
            const email = document.getElementById('teacherEmailInput').value;
            // Assuming password input exists for teacher now, or we use email as generic
            // In previous mocked version only email was checked. For API we likely need password.
            // Looking at HTML, there is a password input for teacher.
            const passInput = document.querySelector('#teacher-login input[type="password"]').value;

            if (!email || !passInput) {
                alert(isArabic ? "يرجى ملء جميع الحقول" : "Please fill in all fields");
                return;
            }
            credentials = { email: email, password: passInput };
        }
        else if (role === 'admin') {
            const usernameInput = document.querySelector('#admin-login input[type="text"]').value;
            const passInput = document.querySelector('#admin-login input[type="password"]').value;

            if (!usernameInput || !passInput) {
                alert(isArabic ? "يرجى ملء جميع الحقول" : "Please fill in all fields");
                return;
            }
            credentials = { username: usernameInput, password: passInput };
        }

        // Call API
        const user = await DataService.login(role, credentials);

        // Success - Store User Info locally for UI if needed (optional)
        // DataService already stored token.

        // Redirect
        if (role === 'parent') {
            sessionStorage.setItem('viola_current_student_id', user.id || credentials.studentId); // Keep for legacy compatibility if needed
            window.location.href = 'parent_dashboard.html';
        } else if (role === 'teacher') {
            sessionStorage.setItem('viola_current_teacher_email', user.email || credentials.email);
            window.location.href = 'teacher_dashboard.html';
        } else if (role === 'admin') {
            window.location.href = 'admin_dashboard.html';
        }

    } catch (error) {
        alert(error.message);
    }
}

function forgotPassword(role) {
    if (role === 'parent') {
        const studentId = prompt(isArabic ? "أدخل رقم الطالب:" : "Enter Student ID to reset password:");
        if (!studentId) return;

        let students = DataService.getStudents();
        const studentIndex = students.findIndex(s => s.id == studentId);

        if (studentIndex === -1) {
            alert(isArabic ? "لم يتم العثور على طالب بهذا الرقم." : "Student ID not found.");
            return;
        }

        const newPass = prompt(isArabic ? "أدخل كلمة المرور الجديدة:" : "Enter New Password:");
        if (!newPass) return;

        students[studentIndex].password = newPass;
        DataService.saveStudents(students);

        alert(isArabic ? "تم تحديث كلمة المرور بنجاح!" : "Password updated successfully!");
    } else {
        const msg = isArabic
            ? "يرجى مراجعة قسم تكنولوجيا المعلومات لإعادة تعيين كلمة المرور."
            : "Please contact IT Support to reset your password.";
        alert(msg);
    }
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
    const langLabel = document.getElementById('langLabel');
    if (langLabel) langLabel.innerText = isArabic ? 'English' : 'العربية';
    document.querySelectorAll('[data-en]').forEach(el => {
        el.innerText = el.getAttribute(`data-${lang}`);
    });
}

// Expose functions
window.changeLoginTab = changeLoginTab;
window.authRedirect = authRedirect;
window.forgotPassword = forgotPassword;
window.toggleLanguage = toggleLanguage;
