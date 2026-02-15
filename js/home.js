import { DataService } from '../services/dataService.js';

let isArabic = false;

// Initialize Page
window.addEventListener('load', async function () {
    // Check Language
    const savedLang = DataService.getPreferredLanguage();
    if (savedLang === 'ar') {
        isArabic = true;
        applyLanguageSettings();
    }

    await loadDynamicContent(); // Load Admin Data
    reveal(); // Start Animation
});

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

// --- DYNAMIC CONTENT LOADER ---
async function loadDynamicContent() {
    const homeData = await DataService.getHomeData();

    // If no data saved in Admin yet, keep default HTML
    // We check if empty object {}
    if (Object.keys(homeData).length === 0) return;

    // 1. Load About Section
    if (homeData.about) {
        if (document.getElementById('homeAboutTitle')) document.getElementById('homeAboutTitle').innerText = homeData.about.title;
        if (document.getElementById('homeAboutDesc')) document.getElementById('homeAboutDesc').innerText = homeData.about.desc;
        if (document.getElementById('homeAboutQuote')) document.getElementById('homeAboutQuote').innerText = `"${homeData.about.quote}"`;
        if (document.getElementById('homeAboutAuthor')) document.getElementById('homeAboutAuthor').innerText = homeData.about.author;
        if (homeData.about.image && document.getElementById('homeAboutImg')) document.getElementById('homeAboutImg').src = homeData.about.image;
    }

    // 2. Load Core Functions
    if (homeData.features && homeData.features.length > 0) {
        const fGrid = document.getElementById('homeFeaturesGrid');
        if (fGrid) {
            fGrid.innerHTML = homeData.features.map(f => `
                <div class="feature-card reveal hover-lift">
                    <i class="${f.icon} feature-icon"></i>
                    <h3>${f.title}</h3>
                    <p>${f.desc}</p>
                </div>
            `).join('');
        }
    }

    // 3. Load Testimonials
    if (homeData.testimonials && homeData.testimonials.length > 0) {
        const tGrid = document.getElementById('homeTestimonialsGrid');
        if (tGrid) {
            tGrid.innerHTML = homeData.testimonials.map(t => `
                <div class="col-md-4" style="flex:1; min-width:300px;">
                    <div class="testimonial-card hover-lift">
                        <div class="quote-watermark">“</div>
                        <div class="testimonial-content">
                            <p class="testimonial-text">"${t.quote}"</p>
                            <div class="testimonial-author">
                                <img src="${t.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(t.name) + '&background=random'}" class="author-avatar" alt="Parent">
                                <div class="author-info">
                                    <h5>${t.name}</h5>
                                    <span>${t.role}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }

    // 4. Load Footer
    if (homeData.footer) {
        if (document.getElementById('homeFooterDesc')) document.getElementById('homeFooterDesc').innerText = homeData.footer.desc;
        if (document.getElementById('homeFooterAddr')) document.getElementById('homeFooterAddr').innerText = homeData.footer.address;

        const p = document.getElementById('homeFooterPhone');
        if (p) {
            p.innerText = homeData.footer.phone;
            p.href = "tel:" + homeData.footer.phone;
        }

        const e = document.getElementById('homeFooterEmail');
        if (e) {
            e.innerText = homeData.footer.email;
            e.href = "mailto:" + homeData.footer.email;
        }

        if (homeData.footer.social) {
            if (homeData.footer.social.fb && document.getElementById('socialFb')) document.getElementById('socialFb').href = homeData.footer.social.fb;
            if (homeData.footer.social.insta && document.getElementById('socialInsta')) document.getElementById('socialInsta').href = homeData.footer.social.insta;
            if (homeData.footer.social.twitter && document.getElementById('socialTwitter')) document.getElementById('socialTwitter').href = homeData.footer.social.twitter;
            if (homeData.footer.social.linkedin && document.getElementById('socialLinkedin')) document.getElementById('socialLinkedin').href = homeData.footer.social.linkedin;
        }
    }
}

// --- SCROLL ANIMATION ---
function reveal() {
    var reveals = document.querySelectorAll(".reveal");
    for (var i = 0; i < reveals.length; i++) {
        var windowHeight = window.innerHeight;
        var elementTop = reveals[i].getBoundingClientRect().top;
        var elementVisible = 150;
        if (elementTop < windowHeight - elementVisible) {
            reveals[i].classList.add("active");
        }
    }
}

window.addEventListener("scroll", reveal);

// Expose functions
window.toggleLanguage = toggleLanguage;
