import { DataService } from '../services/dataService.js';

let isArabic = false;

// ─── Validation Helpers ───────────────────────────────────────────────────────

/** Show an inline error message beneath a form. Never uses alert(). */
function showFormError(containerId, message) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.textContent = message;
    el.style.display = 'block';
}

function clearFormError(containerId) {
    const el = document.getElementById(containerId);
    if (el) { el.textContent = ''; el.style.display = 'none'; }
}

/** Parent: studentId must be 4–10 digits; password min 4 chars */
function validateParentForm(studentId, password) {
    if (!studentId || !password) {
        return isArabic ? 'يرجى ملء جميع الحقول.' : 'Please fill in all fields.';
    }
    if (!/^\d{4,10}$/.test(studentId.trim())) {
        return isArabic
            ? 'رقم الطالب يجب أن يتكون من 4 إلى 10 أرقام.'
            : 'Student ID must be 4–10 numeric digits.';
    }
    if (password.length < 4) {
        return isArabic ? 'كلمة المرور يجب أن تكون 4 أحرف على الأقل.' : 'Password must be at least 4 characters.';
    }
    return null;
}

/** Teacher: valid email + password min 4 chars */
function validateTeacherForm(email, password) {
    if (!email || !password) {
        return isArabic ? 'يرجى ملء جميع الحقول.' : 'Please fill in all fields.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return isArabic ? 'يرجى إدخال بريد إلكتروني صحيح.' : 'Please enter a valid email address.';
    }
    if (password.length < 4) {
        return isArabic ? 'كلمة المرور يجب أن تكون 4 أحرف على الأقل.' : 'Password must be at least 4 characters.';
    }
    return null;
}

/** Admin: username min 3 chars, no spaces; password min 4 chars */
function validateAdminForm(username, password) {
    if (!username || !password) {
        return isArabic ? 'يرجى ملء جميع الحقول.' : 'Please fill in all fields.';
    }
    if (username.trim().length < 3 || /\s/.test(username)) {
        return isArabic
            ? 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل بدون مسافات.'
            : 'Username must be at least 3 characters with no spaces.';
    }
    if (password.length < 4) {
        return isArabic ? 'كلمة المرور يجب أن تكون 4 أحرف على الأقل.' : 'Password must be at least 4 characters.';
    }
    return null;
}

// ─── Init ─────────────────────────────────────────────────────────────────────

window.onload = function () {
    // Clear any leftover preview/session markers on fresh login page load
    sessionStorage.removeItem('viola_current_student_id');
    sessionStorage.removeItem('viola_current_teacher_email');

    const savedLang = DataService.getPreferredLanguage();
    if (savedLang === 'ar') {
        isArabic = true;
        applyLanguageSettings();
    }
};

// ─── Tab Switching ────────────────────────────────────────────────────────────

function changeLoginTab(role) {
    document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.login-form').forEach(form => form.classList.remove('active'));
    const btn = document.getElementById('btn-' + role);
    if (btn) btn.classList.add('active');
    const form = document.getElementById(role + '-login');
    if (form) form.classList.add('active');
    // Clear errors when switching tabs
    ['parent-error', 'teacher-error', 'admin-error'].forEach(clearFormError);
}

// ─── Authentication ───────────────────────────────────────────────────────────

async function authRedirect(role) {
    clearFormError(`${role}-error`);

    let credentials = {};
    let validationError = null;

    if (role === 'parent') {
        const studentId = document.getElementById('parentIdInput').value.trim();
        const password = document.getElementById('parentPassInput').value;
        validationError = validateParentForm(studentId, password);
        if (!validationError) credentials = { studentId, password };

    } else if (role === 'teacher') {
        const email = document.getElementById('teacherEmailInput').value.trim();
        const password = document.querySelector('#teacher-login input[type="password"]').value;
        validationError = validateTeacherForm(email, password);
        if (!validationError) credentials = { email, password };

    } else if (role === 'admin') {
        const username = document.querySelector('#admin-login input[type="text"]').value.trim();
        const password = document.querySelector('#admin-login input[type="password"]').value;
        validationError = validateAdminForm(username, password);
        if (!validationError) credentials = { username, password };
    }

    if (validationError) {
        showFormError(`${role}-error`, validationError);
        return;
    }

    // Show loading state on the button
    const btnMap = {
        parent: 'btn-sign-in-parent',
        teacher: 'btn-sign-in-teacher',
        admin: 'btn-sign-in-admin'
    };
    const btn = document.getElementById(btnMap[role]);
    const originalText = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = isArabic ? 'جار تسجيل الدخول...' : 'Signing In...'; }

    try {
        const user = await DataService.login(role, credentials);

        // Store only non-sensitive UI markers in sessionStorage
        if (role === 'parent') {
            sessionStorage.setItem('viola_current_student_id', user.id || credentials.studentId);
            window.location.href = 'parent_dashboard.html';
        } else if (role === 'teacher') {
            sessionStorage.setItem('viola_current_teacher_email', user.email || credentials.email);
            window.location.href = 'teacher_dashboard.html';
        } else if (role === 'admin') {
            window.location.href = 'admin_dashboard.html';
        }

    } catch (error) {
        // Display a user-friendly message — never the raw error object or stack trace
        const friendlyMessage = (typeof error.message === 'string' && error.message.length < 200)
            ? error.message
            : (isArabic ? 'فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.' : 'Login failed. Please try again.');
        showFormError(`${role}-error`, friendlyMessage);
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = originalText; }
    }
}

// ─── Forgot Password ──────────────────────────────────────────────────────────

function forgotPassword(role) {
    // Passwords are managed server-side only.
    // Client-side password mutation was removed as it stored plaintext credentials.
    const msg = isArabic
        ? 'يرجى مراجعة قسم تكنولوجيا المعلومات لإعادة تعيين كلمة المرور.'
        : 'Please contact IT Support to reset your password.';
    alert(msg);
}

// ─── Language ─────────────────────────────────────────────────────────────────

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
    if (langLabel) langLabel.textContent = isArabic ? 'English' : 'العربية';
    document.querySelectorAll('[data-en]').forEach(el => {
        el.textContent = el.getAttribute(`data-${lang}`);
    });
}

// ─── Expose to HTML ───────────────────────────────────────────────────────────
window.changeLoginTab = changeLoginTab;
window.authRedirect = authRedirect;
window.forgotPassword = forgotPassword;
window.toggleLanguage = toggleLanguage;
