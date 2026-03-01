/**
 * MAIN.JS
 * Shared logic for Viola Academy (Cart, Checkout, Global Interactions)
 */

import { DataService } from './services/dataService.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- AUTH GUARD ---
    const path = window.location.pathname;

    // Protected pages and their required roles
    const rolePages = {
        'admin_dashboard.html': 'admin',
        'teacher_dashboard.html': 'teacher',
        'parent_dashboard.html': 'parent'
    };

    const protectedPages = ['admin_dashboard.html', 'teacher_dashboard.html', 'parent_dashboard.html', 'checkout.html'];
    const isProtected = protectedPages.some(p => path.includes(p));

    if (isProtected && !DataService.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }

    // Role-based navigation guard: redirect if JWT role doesn't match page
    if (isProtected && DataService.isLoggedIn()) {
        try {
            const token = sessionStorage.getItem('viola_token');
            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const userRole = payload.role;

                // Check if user is on a dashboard that doesn't match their role
                for (const [page, requiredRole] of Object.entries(rolePages)) {
                    if (path.includes(page) && userRole !== requiredRole) {
                        // Redirect to their correct dashboard
                        const correctPage = `${userRole}_dashboard.html`;
                        window.location.href = correctPage;
                        return;
                    }
                }
            }
        } catch (e) {
            console.warn('Role check failed:', e.message);
        }
    }

    updateGlobalCartCount();

    // Check if we are on the Checkout Page
    if (document.getElementById('checkoutTableBody')) {
        initCheckoutPage();
    }
});

/* --- CART & BADGE LOGIC --- */

export function updateGlobalCartCount() {
    // Try to get cart from both possible keys to show total count
    const shopCart = DataService.getCart(DataService.KEYS.CART);
    const lunchCart = DataService.getCart(DataService.KEYS.CART_LUNCH);
    const shopCart2 = DataService.getCart(DataService.KEYS.CART_SHOP);

    // Sum up items from the cart that was last modified or just show generic count
    // For simplicity, we just check the default 'viola_cart' or the one active on page
    const currentKey = window.cartKey || DataService.KEYS.CART;
    const cart = DataService.getCart(currentKey);

    const badges = document.querySelectorAll('.cart-count, #cartBadge, #cartCount');
    badges.forEach(el => {
        el.innerText = cart.length;
        el.style.display = cart.length > 0 ? 'flex' : 'none';
    });
}

// Make globally available for HTML inline calls
window.updateGlobalCartCount = updateGlobalCartCount;

/* --- CHECKOUT PAGE LOGIC --- */

function initCheckoutPage() {
    renderCheckoutItems();
    updateCheckoutWalletUI(); // Load credit balance
    // Note: The form submit listener is handled via onsubmit="processCheckout(event)" in HTML
}

function updateCheckoutWalletUI() {
    const credit = DataService.getStudentCredit();
    const el = document.getElementById('checkoutCreditBalance');
    if (el) {
        el.innerText = credit.toFixed(2) + " JOD";
    }
}

function renderCheckoutItems() {
    const key = window.cartKey || DataService.KEYS.CART;
    const cart = DataService.getCart(key);
    const tbody = document.getElementById('checkoutTableBody');
    const totalEl = document.getElementById('cartTotal');

    // Check for container if table body doesn't exist (e.g. div based layout)
    const divContainer = document.getElementById('cartItemsContainer');

    let total = 0;

    // Handle Table Layout (if exists)
    if (tbody) {
        tbody.innerHTML = '';
        if (cart.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">Cart is empty.</td></tr>`;
        } else {
            cart.forEach((item, index) => {
                const price = parseFloat(item.price) || 0;
                total += price;
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><div class="fw-bold">${item.name}</div></td>
                    <td>${price.toFixed(2)} JOD</td>
                    <td><button type="button" class="btn btn-sm btn-outline-danger" onclick="removeFromCart(${index})"><i class="fas fa-trash"></i></button></td>
                `;
                tbody.appendChild(tr);
            });
        }
    }

    // Handle Div Layout (if exists - like in your checkout.html)
    if (divContainer) {
        divContainer.innerHTML = '';
        if (cart.length === 0) {
            divContainer.innerHTML = `<div class="text-center py-4 opacity-50"><p>Your cart is empty.</p></div>`;
        } else {
            cart.forEach((item, index) => {
                const price = parseFloat(item.price) || 0;
                total += price;
                divContainer.innerHTML += `
                    <div class="summary-item pb-2 border-bottom mb-2" style="display:flex; justify-content:space-between;">
                        <div>
                            <div class="fw-bold text-dark">${item.name}</div>
                            <small class="text-muted" style="font-size:0.8rem">${item.type || 'Item'}</small>
                        </div>
                        <div class="text-end">
                            <div class="fw-bold text-primary">${price.toFixed(2)} JOD</div>
                            <a href="#" onclick="removeFromCart(${index})" class="text-danger small text-decoration-none" style="font-size:0.8rem;"><i class="fas fa-trash-alt me-1"></i>Remove</a>
                        </div>
                    </div>
                `;
            });
        }
    }

    if (totalEl) totalEl.innerText = total.toFixed(2) + " JOD";
}

export function removeFromCart(index) {
    const key = window.cartKey || DataService.KEYS.CART;
    let cart = DataService.getCart(key);
    cart.splice(index, 1);
    DataService.setCart(cart, key);

    // Re-render
    renderCheckoutItems();
    updateGlobalCartCount();
}
window.removeFromCart = removeFromCart;

/* --- ORDER SUBMISSION (UPDATED) --- */

export function processCheckout(e) {
    e.preventDefault();

    // Determine language safely
    const isArabic = document.documentElement.getAttribute('lang') === 'ar' || (window.isArabic === true);
    const key = window.cartKey || DataService.KEYS.CART;

    // 1. Get Form Data
    const parentName = document.getElementById('parentName').value;
    const phone = document.getElementById('parentPhone').value;
    const studentDetails = document.getElementById('studentDetails').value;

    // Get Payment Method safely
    let paymentMethod = "Cash";
    const paymentRadio = document.querySelector('input[name="paymentMethod"]:checked');
    if (paymentRadio) {
        // Try to find the label text within the same container
        const label = paymentRadio.parentElement.querySelector('.fw-bold');
        if (label) paymentMethod = label.innerText;
    }

    // 2. Get Cart Data & Calculate Total
    const cart = DataService.getCart(key);
    if (cart.length === 0) {
        alert(isArabic ? "السلة فارغة" : "Cart is empty");
        return;
    }

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

    // 4. Handle Wallet Payment
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
            const students = DataService.getStudents();
            const idx = students.findIndex(s => s.id == loggedInId);
            if (idx !== -1) {
                students[idx].credit = parseFloat(students[idx].credit || 0) - total;
                DataService.saveStudents(students);
            }
        }
    }

    // 5. SAVE ORDER TO DATABASE (This makes it show in Admin)
    DataService.saveOrder(newOrder);

    // 6. UI Feedback & Reset
    const btn = document.getElementById('submitBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> ${isArabic ? 'جار المعالجة...' : 'Processing...'}`;
    }

    setTimeout(() => {
        // Clear Cart
        DataService.clearCart(key);

        // Success Message
        alert(isArabic ? "تم استلام طلبك بنجاح!" : "Order placed successfully!");

        // Redirect
        window.location.href = "parent_dashboard.html";
    }, 1500);
}
window.processCheckout = processCheckout;

/* --- GLOBAL UTILS --- */

export function toggleMenu() {
    const nav = document.querySelector('.nav-links');
    if (nav) nav.classList.toggle('active');
}
window.toggleMenu = toggleMenu;

/* =========================================
   PROFESSIONAL TOAST NOTIFICATIONS
   ========================================= */

const toastStyles = document.createElement('style');
toastStyles.innerHTML = `
  #toast-container { position: fixed; top: 20px; right: 20px; z-index: 100000; display: flex; flex-direction: column; gap: 10px; pointer-events: none; }
  .toast-popup { background: white; min-width: 300px; padding: 16px 20px; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); display: flex; align-items: center; gap: 15px; animation: slideIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards; border-left: 5px solid #333; opacity: 0; transform: translateX(100%); pointer-events: auto; cursor: pointer; }
  .toast-popup.success { border-left-color: #2ecc71; }
  .toast-popup.error { border-left-color: #e74c3c; }
  .toast-popup.info { border-left-color: #3498db; }
  .toast-popup.warning { border-left-color: #f1c40f; }
  .toast-icon { font-size: 1.4rem; }
  .toast-popup.success .toast-icon { color: #2ecc71; }
  .toast-popup.error .toast-icon { color: #e74c3c; }
  .toast-popup.info .toast-icon { color: #3498db; }
  .toast-popup.warning .toast-icon { color: #f1c40f; }
  .toast-message { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-weight: 600; color: #444; font-size: 0.95rem; }
  @keyframes slideIn { to { opacity: 1; transform: translateX(0); } }
  @keyframes fadeOut { to { opacity: 0; transform: translateX(20px); } }
`;
document.head.appendChild(toastStyles);

const toastContainer = document.createElement('div');
toastContainer.id = 'toast-container';
document.body.appendChild(toastContainer);

window.showToast = function (type, message) {
    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    const toast = document.createElement('div');
    toast.className = `toast-popup ${type}`;
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info} toast-icon"></i><div class="toast-message">${message}</div>`;
    toast.onclick = function () { removeToast(toast); };
    toastContainer.appendChild(toast);
    setTimeout(() => { removeToast(toast); }, 3500);
};

function removeToast(toast) {
    if (!toast.classList.contains('removing')) {
        toast.classList.add('removing');
        toast.style.animation = 'fadeOut 0.4s ease forwards';
        setTimeout(() => { if (toast.parentNode) toast.remove(); }, 400);
    }
}