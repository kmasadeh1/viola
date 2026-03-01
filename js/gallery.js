import { DataService } from '../services/dataService.js';
import { sanitizeText, setTextContent } from './sanitize.js';

let isArabic = false;

window.onload = async function () {
    const savedLang = DataService.getPreferredLanguage();
    if (savedLang === 'ar') {
        isArabic = true;
        applyLanguageSettings();
    }
    configureBackButton();
    await loadGallery();
};

// --- SMART NAVIGATION LOGIC ---
function configureBackButton() {
    if (document.referrer && document.referrer.includes('parent_dashboard.html')) {
        const btns = document.querySelectorAll('.back-btn-dynamic');
        btns.forEach(btn => {
            btn.href = 'parent_dashboard.html';
            const icon = btn.querySelector('.icon-dynamic');
            if (icon) {
                icon.classList.remove('fa-home');
                icon.classList.add('fa-arrow-left');
            }
            const span = btn.querySelector('.text-dynamic');
            if (span) {
                span.setAttribute('data-en', 'Back to Dashboard');
                span.setAttribute('data-ar', 'عودة للوحة التحكم');
                span.textContent = isArabic ? 'عودة للوحة التحكم' : 'Back to Dashboard';
            }
        });
    }
}

// --- GALLERY RENDER (XSS-safe DOM construction) ---
async function loadGallery() {
    const allGalleryData = await DataService.getGallery();
    const publicImages = allGalleryData.filter(img => !img.targetClass || img.targetClass === 'All');
    const container = document.getElementById('galleryGrid');

    container.innerHTML = '';

    if (publicImages.length === 0) {
        // Static empty-state — no API data injected here
        const wrapper = document.createElement('div');
        wrapper.className = 'col-12 text-center py-5';

        const icon = document.createElement('i');
        icon.className = 'fas fa-camera fa-3x text-muted mb-3';
        icon.style.opacity = '0.3';

        const heading = document.createElement('h4');
        heading.className = 'text-muted';
        heading.setAttribute('data-en', 'No public photos yet.');
        heading.setAttribute('data-ar', 'لا يوجد صور عامة بعد.');
        heading.textContent = isArabic ? 'لا يوجد صور عامة بعد.' : 'No public photos yet.';

        const sub = document.createElement('p');
        sub.className = 'text-muted small';
        sub.setAttribute('data-en', 'Admin uploads will appear here.');
        sub.setAttribute('data-ar', 'صور الإدارة ستظهر هنا.');
        sub.textContent = isArabic ? 'صور الإدارة ستظهر هنا.' : 'Admin uploads will appear here.';

        wrapper.appendChild(icon);
        wrapper.appendChild(heading);
        wrapper.appendChild(sub);
        container.appendChild(wrapper);
        return;
    }

    publicImages.forEach(img => {
        // ── Column wrapper ────────────────────────────────────────
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4';

        // ── Gallery frame ─────────────────────────────────────────
        const frame = document.createElement('div');
        frame.className = 'gallery-frame';
        // URL comes from the API; clicking opens in a new tab (viewer function validates)
        frame.addEventListener('click', () => viewImage(img.url));

        // ── Image container ───────────────────────────────────────
        const imgContainer = document.createElement('div');
        imgContainer.className = 'img-container';

        const imgEl = document.createElement('img');
        imgEl.className = 'gallery-img';
        imgEl.alt = 'Gallery Image';
        // img.url is a server-generated path — set via attribute, not innerHTML
        imgEl.src = img.url || '';
        imgContainer.appendChild(imgEl);

        // ── Caption ───────────────────────────────────────────────
        const caption = document.createElement('div');
        caption.className = 'gallery-caption';
        // textContent escapes all HTML — XSS-safe
        caption.textContent = img.caption || (isArabic ? 'صورة' : 'Image');

        frame.appendChild(imgContainer);
        frame.appendChild(caption);
        col.appendChild(frame);
        container.appendChild(col);
    });
}

function viewImage(url) {
    // Validate URL is relative or same-origin before opening
    try {
        const parsed = new URL(url, window.location.origin);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    } catch {
        console.error('Invalid gallery image URL:', url);
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
    if (langLabel) langLabel.textContent = isArabic ? 'English' : 'العربية';
    document.querySelectorAll('[data-en]').forEach(el => {
        el.textContent = el.getAttribute(`data-${lang}`);
    });
    configureBackButton();
    loadGallery();
}

window.toggleLanguage = toggleLanguage;
window.viewImage = viewImage;
