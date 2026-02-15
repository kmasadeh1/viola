import { DataService } from '../services/dataService.js';

let isArabic = false;

window.onload = async function () {
    // Check Saved Language
    const savedLang = DataService.getPreferredLanguage();
    if (savedLang === 'ar') {
        isArabic = true;
        applyLanguageSettings();
    }

    configureBackButton(); // Set correct back link
    await loadGallery();
};

// --- SMART NAVIGATION LOGIC ---
function configureBackButton() {
    // Check if user came from Dashboard
    if (document.referrer && document.referrer.includes('parent_dashboard.html')) {
        const btns = document.querySelectorAll('.back-btn-dynamic');
        btns.forEach(btn => {
            btn.href = 'parent_dashboard.html';

            // Update Icon
            const icon = btn.querySelector('.icon-dynamic');
            if (icon) {
                icon.classList.remove('fa-home');
                icon.classList.add('fa-arrow-left');
            }

            // Update Text Attributes
            const span = btn.querySelector('.text-dynamic');
            if (span) {
                span.setAttribute('data-en', 'Back to Dashboard');
                span.setAttribute('data-ar', 'عودة للوحة التحكم');
                // Set initial text based on current language
                span.innerText = isArabic ? 'عودة للوحة التحكم' : 'Back to Dashboard';
            }
        });
    }
}

async function loadGallery() {
    const allGalleryData = await DataService.getGallery();
    // Public only
    const publicImages = allGalleryData.filter(img => !img.targetClass || img.targetClass === 'All');
    const container = document.getElementById('galleryGrid');

    if (publicImages.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-camera fa-3x text-muted mb-3" style="opacity:0.3"></i>
                <h4 class="text-muted" data-en="No public photos yet." data-ar="لا يوجد صور عامة بعد.">No public photos yet.</h4>
                <p class="text-muted small" data-en="Admin uploads will appear here." data-ar="صور الإدارة ستظهر هنا.">Admin uploads will appear here.</p>
            </div>
        `;
        // If arabic is active, we need to translate this injected HTML immediately
        if (isArabic) {
            const noPhotoText = container.querySelector('[data-ar]');
            if (noPhotoText) noPhotoText.innerText = noPhotoText.getAttribute('data-ar');
            const subText = container.querySelectorAll('[data-ar]')[1];
            if (subText) subText.innerText = subText.getAttribute('data-ar');
        }
        return;
    }

    container.innerHTML = publicImages.map(img => `
        <div class="col-md-6 col-lg-4">
            <div class="gallery-frame" onclick="viewImage('${img.url}')">
                <div class="img-container">
                    <img src="${img.url}" class="gallery-img" alt="Gallery Image">
                </div>
                <div class="gallery-caption">
                    ${img.caption || (isArabic ? 'صورة' : 'Image')}
                </div>
            </div>
        </div>
    `).join('');
}

function viewImage(url) {
    window.open(url, '_blank');
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
        el.innerText = el.getAttribute(`data-${lang}`);
    });

    // Update Back Button Text specifically (incase it was dynamically set)
    configureBackButton();

    // Re-render gallery to handle empty state text
    loadGallery();
}

// Expose functions
window.toggleLanguage = toggleLanguage;
window.viewImage = viewImage;
