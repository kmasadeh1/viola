import { DataService } from '../services/dataService.js';
import { sanitizeText } from './sanitize.js';

let isArabic = false;
let cartKey = DataService.KEYS.CART;
let sourcePage = 'shop.html';

window.onload = function () {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');

    if (type === 'lunch') {
        cartKey = DataService.KEYS.CART_LUNCH;
        sourcePage = 'lunch.html';
    } else if (type === 'shop') {
        cartKey = DataService.KEYS.CART_SHOP;
        sourcePage = 'shop.html';
    } else {
        cartKey = DataService.KEYS.CART;
        sourcePage = 'shop.html';
    }

    document.getElementById('backBtn').href = sourcePage;

    const savedLang = DataService.getPreferredLanguage();
    if (savedLang === 'ar') {
        isArabic = true;
        applyLanguageSettings();
    }

    updateWalletBalanceDisplay();
    renderCheckoutItems();
};

// ─── Validation Helpers ───────────────────────────────────────────────────────

function showError(fieldId, message) {
    const el = document.getElementById(fieldId);
    if (el) { el.textContent = message; el.style.display = 'block'; }
}

function clearAllErrors() {
    document.querySelectorAll('.checkout-field-error').forEach(el => {
        el.textContent = '';
        el.style.display = 'none';
    });
}

/**
 * Validates the checkout form fields.
 * @returns {boolean} true if all fields are valid
 */
function validateCheckoutForm(parentName, phone, studentDetails) {
    let valid = true;

    if (!parentName || parentName.trim().length < 2 || parentName.trim().length > 100) {
        showError('error-parentName', isArabic
            ? 'يرجى إدخال اسم صحيح (2 إلى 100 حرف).'
            : 'Please enter a valid name (2–100 characters).');
        valid = false;
    }

    if (!phone || !/^\+?[\d\s\-]{7,15}$/.test(phone.trim())) {
        showError('error-phone', isArabic
            ? 'يرجى إدخال رقم هاتف صحيح (7 إلى 15 رقماً).'
            : 'Please enter a valid phone number (7–15 digits).');
        valid = false;
    }

    if (!studentDetails || studentDetails.trim().length < 2) {
        showError('error-studentDetails', isArabic
            ? 'يرجى إدخال تفاصيل الطالب.'
            : 'Please enter student details.');
        valid = false;
    }

    return valid;
}

// ─── UI ───────────────────────────────────────────────────────────────────────

function updateWalletBalanceDisplay() {
    const credit = DataService.getStudentCredit().toFixed(2);
    const el = document.getElementById('walletBalanceText');
    if (el) {
        const enText = `Balance: ${credit} JOD`;
        const arText = `الرصيد: ${credit} دينار`;
        el.setAttribute('data-en', enText);
        el.setAttribute('data-ar', arText);
        el.textContent = isArabic ? arText : enText;
    }
}

function renderCheckoutItems() {
    const cart = DataService.getCart(cartKey);
    const container = document.getElementById('cartItemsContainer');
    const totalEl = document.getElementById('cartTotal');

    container.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        const msg = document.createElement('div');
        msg.className = 'text-center py-4 opacity-50';
        const icon = document.createElement('i');
        icon.className = 'fas fa-shopping-basket fa-3x mb-2 text-muted';
        const p = document.createElement('p');
        p.setAttribute('data-en', 'Your cart is empty.');
        p.setAttribute('data-ar', 'سلتك فارغة.');
        p.textContent = isArabic ? 'سلتك فارغة.' : 'Your cart is empty.';
        msg.appendChild(icon);
        msg.appendChild(p);
        container.appendChild(msg);
        totalEl.textContent = '0 JOD';
        document.getElementById('submitBtn').disabled = true;
        document.getElementById('submitBtn').classList.add('opacity-50');
        return;
    }

    document.getElementById('submitBtn').disabled = false;
    document.getElementById('submitBtn').classList.remove('opacity-50');

    cart.forEach((item, index) => {
        total += parseFloat(item.price);

        let displayName = item.name;
        if (isArabic) {
            if (item.name.includes('Summer')) displayName = 'الزي الصيفي';
            if (item.name.includes('Winter')) displayName = 'الزي الشتوي';
        } else {
            if (item.name === 'الزي الصيفي') displayName = 'Summer Uniform';
            if (item.name === 'الزي الشتوي') displayName = 'Winter Uniform';
        }

        // Build DOM nodes — no innerHTML with API data
        const wrapper = document.createElement('div');
        wrapper.className = 'summary-item pb-2 border-bottom mb-2';

        const left = document.createElement('div');
        const nameEl = document.createElement('div');
        nameEl.className = 'fw-bold text-dark';
        nameEl.textContent = displayName; // textContent — XSS-safe

        const typeEl = document.createElement('small');
        typeEl.className = 'text-muted';
        typeEl.style.fontSize = '0.8rem';
        typeEl.textContent = item.type || 'Item';

        left.appendChild(nameEl);
        left.appendChild(typeEl);

        const right = document.createElement('div');
        right.className = 'text-end';
        const priceEl = document.createElement('div');
        priceEl.className = 'fw-bold text-primary';
        priceEl.textContent = `${sanitizeText(item.price)} JOD`;

        const removeLink = document.createElement('a');
        removeLink.href = '#';
        removeLink.className = 'text-danger small text-decoration-none';
        removeLink.style.cssText = 'font-size:0.8rem; opacity:0.7;';
        removeLink.addEventListener('click', (e) => { e.preventDefault(); removeItem(index); });
        const removeIcon = document.createElement('i');
        removeIcon.className = 'fas fa-trash-alt me-1';
        const removeSpan = document.createElement('span');
        removeSpan.setAttribute('data-en', 'Remove');
        removeSpan.setAttribute('data-ar', 'حذف');
        removeSpan.textContent = isArabic ? 'حذف' : 'Remove';
        removeLink.appendChild(removeIcon);
        removeLink.appendChild(removeSpan);

        right.appendChild(priceEl);
        right.appendChild(removeLink);
        wrapper.appendChild(left);
        wrapper.appendChild(right);
        container.appendChild(wrapper);
    });

    totalEl.textContent = `${total.toFixed(2)} JOD`;
}

function removeItem(index) {
    let cart = DataService.getCart(cartKey);
    cart.splice(index, 1);
    DataService.setCart(cart, cartKey);
    renderCheckoutItems();
}

// ─── Checkout Submission ──────────────────────────────────────────────────────

async function processCheckout(e) {
    e.preventDefault();
    clearAllErrors();

    const parentName = document.getElementById('parentName').value;
    const phone = document.getElementById('parentPhone').value;
    const studentDetails = document.getElementById('studentDetails').value;
    const paymentMethodEl = document.querySelector('input[name="paymentMethod"]:checked');

    if (!paymentMethodEl) {
        showError('error-payment', isArabic ? 'يرجى اختيار طريقة الدفع.' : 'Please select a payment method.');
        return;
    }
    const paymentMethod = paymentMethodEl.parentNode.querySelector('.fw-bold')?.textContent || 'Unknown';

    if (!validateCheckoutForm(parentName, phone, studentDetails)) return;

    const cart = DataService.getCart(cartKey);
    if (cart.length === 0) return;

    let total = 0;
    cart.forEach(item => total += parseFloat(item.price));

    // Wallet payment validation
    if (paymentMethod.includes('Wallet') || paymentMethod.includes('محفظة')) {
        const currentCredit = DataService.getStudentCredit();
        if (isNaN(currentCredit) || currentCredit < total) {
            showError('error-payment', isArabic ? 'رصيد المحفظة غير كافٍ!' : 'Insufficient wallet balance!');
            return;
        }
    }

    const newOrder = {
        id: Date.now(),
        date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
        parentName: parentName.trim(),
        phone: phone.trim(),
        studentDetails: studentDetails.trim(),
        items: cart,
        total: total,
        paymentMethod: paymentMethod,
        status: 'Pending'
    };

    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>${isArabic ? 'جار المعالجة...' : 'Processing...'}`;

    try {
        if (paymentMethod.includes('Wallet') || paymentMethod.includes('محفظة')) {
            const currentCredit = DataService.getStudentCredit();
            DataService.setStudentCredit(currentCredit - total);

            const loggedInId = sessionStorage.getItem('viola_current_student_id');
            if (loggedInId) {
                const students = await DataService.getStudents();
                const idx = students.findIndex(s => s.id == loggedInId);
                if (idx !== -1) {
                    students[idx].credit = parseFloat(students[idx].credit || 0) - total;
                    await DataService.saveStudents(students);
                }
            }
        }

        await DataService.saveOrder(newOrder);
        DataService.clearCart(cartKey);
        alert(isArabic ? 'تم استلام طلبك بنجاح!' : 'Order placed successfully!');
        window.location.href = 'parent_dashboard.html';

    } catch (error) {
        // Show user-friendly error — never the raw error object
        const msg = (typeof error.message === 'string' && error.message.length < 200)
            ? error.message
            : (isArabic ? 'حدث خطأ. يرجى المحاولة مجدداً.' : 'An error occurred. Please try again.');
        showError('error-payment', msg);
        btn.disabled = false;
        btn.textContent = isArabic ? 'تأكيد الطلب' : 'Place Order';
    }
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
        if (el.tagName === 'INPUT' && el.hasAttribute(`data-ph-${lang}`)) {
            el.placeholder = el.getAttribute(`data-ph-${lang}`);
        } else {
            el.textContent = el.getAttribute(`data-${lang}`);
        }
    });
    updateWalletBalanceDisplay();
    renderCheckoutItems();
}

window.removeItem = removeItem;
window.processCheckout = processCheckout;
window.toggleLanguage = toggleLanguage;
