import { DataService } from '../services/dataService.js';

let isArabic = false;
let menuData = [];

window.onload = async function () {
    // Check Saved Language
    const savedLang = DataService.getPreferredLanguage();
    if (savedLang === 'ar') {
        isArabic = true;
        applyLanguageSettings();
    }
    await renderMenu();
    updateCartCount();
};

async function renderMenu() {
    menuData = await DataService.getLunchMenu();

    const categories = {
        'sandwiches': document.getElementById('sandwichesList'),
        'snacks': document.getElementById('snacksList'),
        'drinks': document.getElementById('drinksList')
    };

    // Clear containers
    Object.values(categories).forEach(el => el.innerHTML = '');

    if (menuData.length === 0) {
        // If empty, show message in current language
        const msg = isArabic ? 'القائمة لم تنشر بعد.' : 'Menu not published yet.';
        document.querySelector('.container').innerHTML += `
            <div class="text-center mt-5 text-muted">
                <i class="fas fa-carrot fa-3x mb-3" style="opacity: 0.3;"></i>
                <h4>${msg}</h4>
            </div>`;
        return;
    }

    menuData.forEach((item, index) => {
        const container = categories[item.category] || categories['sandwiches'];

        // Dynamic Button Text
        const btnText = isArabic ? 'إضافة للسلة' : 'Add to Cart';

        // Uses external placeholder if no image provided in DB
        const card = `
            <div class="col-md-6 col-lg-3">
                <div class="menu-item-card">
                    <img src="${item.image || 'https://via.placeholder.com/300x200?text=Viola+Food'}" class="item-img" alt="${item.name}">
                    <div class="item-details">
                        <div class="item-name">${item.name}</div>
                        <div class="item-price">${item.price} JOD</div>
                        <button class="btn-add" onclick="addToCart(${index})">
                            <i class="fas fa-cart-plus me-2"></i><span>${btnText}</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += card;
    });
}

function addToCart(index) {
    const item = menuData[index];
    const cartItem = {
        id: Date.now(),
        name: item.name,
        price: item.price,
        type: 'Lunch'
    };

    // Saves to 'viola_cart_lunch' which checkout.html reads when type=lunch
    DataService.addToCart(cartItem, DataService.KEYS.CART_LUNCH);

    updateCartCount();

    const btn = event.currentTarget;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = isArabic ? '<i class="fas fa-check"></i> تمت الإضافة' : '<i class="fas fa-check"></i> Added';
    btn.style.background = '#27ae60';
    setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.style.background = '#2c3e50';
    }, 1000);
}

function updateCartCount() {
    const cart = DataService.getCart(DataService.KEYS.CART_LUNCH);
    document.getElementById('cartCount').innerText = cart.length;
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

    renderMenu();
}

// Expose functions to window
window.addToCart = addToCart;
window.toggleLanguage = toggleLanguage;
