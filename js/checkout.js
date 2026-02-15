import { DataService } from '../services/dataService.js';

let isArabic = false;
// UPDATED: Default to 'viola_cart' to match Shop.html and Main.js
let cartKey = DataService.KEYS.CART;
let sourcePage = 'shop.html';

window.onload = function () {
    // 1. Determine Cart Context
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');

    if (type === 'lunch') {
        cartKey = DataService.KEYS.CART_LUNCH;
        sourcePage = 'lunch.html';
    } else if (type === 'shop') {
        // IMPORTANT: Shop.html uses 'viola_cart_shop'
        cartKey = DataService.KEYS.CART_SHOP;
        sourcePage = 'shop.html';
    } else {
        cartKey = DataService.KEYS.CART;
        sourcePage = 'shop.html';
    }

    // Update Back Button
    document.getElementById('backBtn').href = sourcePage;

    // 2. Check Saved Language
    const savedLang = DataService.getPreferredLanguage();
    if (savedLang === 'ar') {
        isArabic = true;
        applyLanguageSettings();
    }

    updateWalletBalanceDisplay();
    renderCheckoutItems();
};

function updateWalletBalanceDisplay() {
    const credit = DataService.getStudentCredit().toFixed(2);
    const el = document.getElementById('walletBalanceText');
    if (el) {
        const enText = `Balance: ${credit} JOD`;
        const arText = `الرصيد: ${credit} دينار`;

        el.setAttribute('data-en', enText);
        el.setAttribute('data-ar', arText);
        el.innerText = isArabic ? arText : enText;
    }
}

function renderCheckoutItems() {
    const cart = DataService.getCart(cartKey);
    const container = document.getElementById('cartItemsContainer');
    const totalEl = document.getElementById('cartTotal');

    container.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        container.innerHTML = `<div class="text-center py-4 opacity-50"><i class="fas fa-shopping-basket fa-3x mb-2 text-muted"></i><p data-en="Your cart is empty." data-ar="سلتك فارغة.">${isArabic ? 'سلتك فارغة.' : 'Your cart is empty.'}</p></div>`;
        totalEl.innerText = "0 JOD";
        document.getElementById('submitBtn').disabled = true;
        document.getElementById('submitBtn').classList.add('opacity-50');
        return;
    }

    document.getElementById('submitBtn').disabled = false;
    document.getElementById('submitBtn').classList.remove('opacity-50');

    cart.forEach((item, index) => {
        total += parseFloat(item.price);

        // Localization check for item names
        let displayName = item.name;
        if (isArabic) {
            if (item.name.includes("Summer")) displayName = "الزي الصيفي";
            if (item.name.includes("Winter")) displayName = "الزي الشتوي";
        } else {
            if (item.name === "الزي الصيفي") displayName = "Summer Uniform";
            if (item.name === "الزي الشتوي") displayName = "Winter Uniform";
        }

        container.innerHTML += `
            <div class="summary-item pb-2 border-bottom mb-2">
                <div>
                    <div class="fw-bold text-dark">${displayName}</div>
                    <small class="text-muted" style="font-size:0.8rem">${item.type || 'Item'}</small>
                </div>
                <div class="text-end">
                    <div class="fw-bold text-primary">${item.price} JOD</div>
                    <a href="#" onclick="removeItem(${index})" class="text-danger small text-decoration-none" style="font-size:0.8rem; opacity:0.7;">
                        <i class="fas fa-trash-alt me-1"></i><span data-en="Remove" data-ar="حذف">${isArabic ? 'حذف' : 'Remove'}</span>
                    </a>
                </div>
            </div>
        `;
    });

    totalEl.innerText = total + " JOD";
}

function removeItem(index) {
    let cart = DataService.getCart(cartKey);
    cart.splice(index, 1);
    DataService.setCart(cart, cartKey);
    renderCheckoutItems();
}

async function processCheckout(e) {
    e.preventDefault();

    // 1. Get Form Data
    const parentName = document.getElementById('parentName').value;
    const phone = document.getElementById('parentPhone').value;
    const studentDetails = document.getElementById('studentDetails').value;
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').parentNode.querySelector('.fw-bold').innerText;

    // 2. Get Cart Data & Calculate Total
    const cart = DataService.getCart(cartKey);
    if (cart.length === 0) return;

    let total = 0;
    cart.forEach(item => total += parseFloat(item.price));

    // 3. Create Order Object
    const newOrder = {
        id: Date.now(), // Unique Order ID
        date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
        parentName: parentName,
        phone: phone,
        studentDetails: studentDetails,
        items: cart,
        total: total,
        paymentMethod: paymentMethod,
        status: 'Pending'
    };

    // 4. Handle Wallet Payment (Optional logic)
    if (paymentMethod.includes('Wallet') || paymentMethod.includes('محفظة')) {
        const currentCredit = DataService.getStudentCredit();
        if (currentCredit < total) {
            alert(isArabic ? "رصيد المحفظة غير كافٍ!" : "Insufficient wallet balance!");
            return;
        }
        // Deduct balance globally
        DataService.setStudentCredit(currentCredit - total);

        // Also try to update specific student if logged in (Best effort)
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

    // 5. SAVE ORDER TO DATABASE (This makes it show in Admin)
    await DataService.saveOrder(newOrder);

    // 6. UI Feedback & Reset
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> ${isArabic ? 'جار المعالجة...' : 'Processing...'}`;

    setTimeout(() => {
        // Clear Cart
        DataService.clearCart(cartKey);

        // Success Message
        alert(isArabic ? "تم استلام طلبك بنجاح!" : "Order placed successfully!");

        // Redirect
        window.location.href = "parent_dashboard.html";
    }, 1500);
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
    if (langLabel) langLabel.innerText = isArabic ? 'English' : 'العربية';

    // Translate Static Elements
    document.querySelectorAll('[data-en]').forEach(el => {
        // Handle Inputs with Placeholders
        if (el.tagName === 'INPUT' && el.hasAttribute(`data-ph-${lang}`)) {
            el.placeholder = el.getAttribute(`data-ph-${lang}`);
        }
        // Handle everything else
        else {
            el.innerText = el.getAttribute(`data-${lang}`);
        }
    });

    // Re-render items
    updateWalletBalanceDisplay();
    renderCheckoutItems();
}

// Expose functions to window
window.removeItem = removeItem;
window.processCheckout = processCheckout;
window.toggleLanguage = toggleLanguage;
