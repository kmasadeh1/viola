import { DataService } from '../services/dataService.js';

let isArabic = false;

// Load Data from DataService
// Updated defaults to use public/ images
// Load Data from DataService
// Updated defaults to use public/ images
let shopData = {};

window.onload = async function () {
    // Check Saved Language
    const savedLang = DataService.getPreferredLanguage();
    if (savedLang === 'ar') {
        isArabic = true;
        applyLanguageSettings();
    }
    shopData = await DataService.getShopData();
    renderShopItems();
    updateCartCount();
};

function renderShopItems() {
    // Render Summer
    if (shopData.summer) {
        document.getElementById('summerPrice').innerText = shopData.summer.price;
        if (shopData.summer.img) document.getElementById('summerImg').src = shopData.summer.img;

        if (shopData.summer.desc && shopData.summer.desc !== "Standard Summer Uniform") {
            const descEl = document.getElementById('summerDesc');
            descEl.innerText = shopData.summer.desc;
            descEl.removeAttribute('data-en');
            descEl.removeAttribute('data-ar');
        }
    }

    // Render Winter
    if (shopData.winter) {
        document.getElementById('winterPrice').innerText = shopData.winter.price;
        if (shopData.winter.img) document.getElementById('winterImg').src = shopData.winter.img;

        if (shopData.winter.desc && shopData.winter.desc !== "Standard Winter Uniform") {
            const descEl = document.getElementById('winterDesc');
            descEl.innerText = shopData.winter.desc;
            descEl.removeAttribute('data-en');
            descEl.removeAttribute('data-ar');
        }
    }
}

function addToCart(type) {
    const item = shopData[type];
    const name = type === 'summer'
        ? (isArabic ? "الزي الصيفي" : "Summer Uniform")
        : (isArabic ? "الزي الشتوي" : "Winter Uniform");

    const cartItem = {
        id: Date.now(),
        name: name,
        price: item.price,
        type: type
    };

    DataService.addToCart(cartItem);

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
    const cart = DataService.getCart();
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
}

// Expose functions to window
window.addToCart = addToCart;
window.toggleLanguage = toggleLanguage;
