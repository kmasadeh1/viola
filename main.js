/**
 * MAIN.JS
 * Shared logic for Viola Academy (Cart, Checkout, Global Interactions)
 */

document.addEventListener('DOMContentLoaded', () => {
    updateGlobalCartCount();

    // Check if we are on the Checkout Page
    if (document.getElementById('checkoutTableBody')) {
        initCheckoutPage();
    }
});

/* --- CART & BADGE LOGIC --- */

function updateGlobalCartCount() {
    const cart = JSON.parse(localStorage.getItem('viola_cart')) || [];
    const badges = document.querySelectorAll('.cart-count, #cartBadge, #cartCount'); 
    badges.forEach(el => {
        el.innerText = cart.length;
        el.style.display = cart.length > 0 ? 'flex' : 'none';
    });
}

/* --- CHECKOUT PAGE LOGIC --- */

function initCheckoutPage() {
    renderCheckoutItems();
    updateCheckoutWalletUI(); // Load credit balance

    // Attach listener to the checkout form
    const form = document.getElementById('checkoutForm');
    if (form) {
        form.addEventListener('submit', handleOrderSubmit);
    }
}

function updateCheckoutWalletUI() {
    const credit = parseFloat(localStorage.getItem('viola_student_credit') || "0");
    const el = document.getElementById('checkoutCreditBalance');
    if(el) {
        el.innerText = credit.toFixed(2) + " JOD";
    }
}

function renderCheckoutItems() {
    const cart = JSON.parse(localStorage.getItem('viola_cart')) || [];
    const tbody = document.getElementById('checkoutTableBody');
    const totalEl = document.getElementById('cartTotal');
    
    // Clear current list
    tbody.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center py-4 text-muted">
                    <span data-en="Your cart is empty." data-ar="سلة المشتريات فارغة.">Your cart is empty.</span>
                </td>
            </tr>`;
        if (totalEl) totalEl.innerText = '0.00';
        return;
    }

    cart.forEach((item, index) => {
        const price = parseFloat(item.price) || 0;
        total += price;

        // Determine Label & Translation based on type
        let typeLabelEn = "Item";
        let typeLabelAr = "عنصر";

        if (item.type === 'Lunch') {
            typeLabelEn = "Lunch Meal";
            typeLabelAr = "وجبة غداء";
        } else if (item.type === 'summer') {
            typeLabelEn = "Summer Uniform";
            typeLabelAr = "زي صيفي";
        } else if (item.type === 'winter') {
            typeLabelEn = "Winter Uniform";
            typeLabelAr = "زي شتوي";
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="fw-bold">${item.name}</div>
                <div class="small text-muted">
                    <span data-en="${typeLabelEn}" data-ar="${typeLabelAr}">${typeLabelEn}</span>
                </div>
            </td>
            <td>${price.toFixed(2)} JOD</td>
            <td>
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeFromCart(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    if (totalEl) totalEl.innerText = total.toFixed(2);
    
    // Re-trigger language toggle to fix new element text
    if (typeof isArabic !== 'undefined' && isArabic) {
        document.querySelectorAll('[data-en]').forEach(el => {
            el.innerText = el.getAttribute('data-ar');
        });
    }
}

function removeFromCart(index) {
    let cart = JSON.parse(localStorage.getItem('viola_cart')) || [];
    cart.splice(index, 1);
    localStorage.setItem('viola_cart', JSON.stringify(cart));
    
    // Re-render
    renderCheckoutItems();
    updateGlobalCartCount();
}

/* --- ORDER SUBMISSION --- */

function handleOrderSubmit(e) {
    e.preventDefault();

    const cart = JSON.parse(localStorage.getItem('viola_cart')) || [];
    if (cart.length === 0) {
        alert("Your cart is empty!");
        return;
    }

    const totalAmount = parseFloat(document.getElementById('cartTotal').innerText);
    const paymentMethodEl = document.querySelector('input[name="paymentMethod"]:checked');
    const paymentMethod = paymentMethodEl ? paymentMethodEl.value : 'cash';

    // PAYMENT LOGIC
    let orderStatus = "Pending (Cash)";
    
    if (paymentMethod === 'credit') {
        const currentCredit = parseFloat(localStorage.getItem('viola_student_credit') || "0");
        
        if (currentCredit < totalAmount) {
            const isAr = document.documentElement.getAttribute('lang') === 'ar';
            alert(isAr ? "رصيد المحفظة غير كافٍ!" : "Insufficient wallet credit!");
            return; // STOP ORDER
        }

        // Deduct Credit
        const newBalance = currentCredit - totalAmount;
        localStorage.setItem('viola_student_credit', newBalance);
        orderStatus = "Paid (Credit)";
    }

    // 1. Create Order Object
    const order = {
        id: Date.now(),
        date: new Date().toLocaleString(),
        parentName: document.getElementById('parentName')?.value || "Unknown Parent",
        phone: document.getElementById('phone')?.value || "No Phone",
        studentId: document.getElementById('studentId')?.value || "N/A",
        items: cart,
        total: totalAmount,
        paymentMethod: paymentMethod === 'credit' ? 'Wallet Credit' : 'Cash at School',
        status: orderStatus
    };

    // 2. Save to 'viola_orders'
    const allOrders = JSON.parse(localStorage.getItem('viola_orders')) || [];
    allOrders.push(order);
    localStorage.setItem('viola_orders', JSON.stringify(allOrders));

    // 3. Clear Cart
    localStorage.removeItem('viola_cart');

    // 4. Show Success & Redirect
    const successMsg = document.documentElement.getAttribute('lang') === 'ar' 
        ? "تم إرسال الطلب بنجاح!" 
        : "Order Placed Successfully!";
        
    alert(successMsg);
    window.location.href = "parent_dashboard.html";
}

/* --- GLOBAL UTILS --- */

function toggleMenu() {
    const nav = document.querySelector('.nav-links');
    if (nav) nav.classList.toggle('active');
}

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

window.showToast = function(type, message) {
    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    const toast = document.createElement('div');
    toast.className = `toast-popup ${type}`;
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info} toast-icon"></i><div class="toast-message">${message}</div>`;
    toast.onclick = function() { removeToast(toast); };
    toastContainer.appendChild(toast);
    setTimeout(() => { removeToast(toast); }, 3500);
};

function removeToast(toast) {
    if(!toast.classList.contains('removing')) {
        toast.classList.add('removing');
        toast.style.animation = 'fadeOut 0.4s ease forwards';
        setTimeout(() => { if(toast.parentNode) toast.remove(); }, 400);
    }
}