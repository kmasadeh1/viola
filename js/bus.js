import { DataService } from '../services/dataService.js';

let isArabic = false;

// 1. Load Data
// 1. Load Data
let busData = { morning: [], evening: [] };

// Fallback data if empty (DataService returns default structure, but if empty inside)
if (busData.morning.length === 0 && busData.evening.length === 0) {
    busData.morning = [
        { time: "06:30", loc: "Housing Bank Circle" },
        { time: "07:00", loc: "Nuwayjis Intersection" },
        { time: "07:30", loc: "Signal 2 (Bakery)" },
        { time: "07:55", loc: "Viola Academy" }
    ];
    busData.evening = [
        { time: "14:00", loc: "Viola Academy" },
        { time: "14:30", loc: "Signal 2 (Bakery)" },
        { time: "15:00", loc: "Nuwayjis Intersection" },
        { time: "15:30", loc: "Housing Bank Circle" }
    ];
}

window.onload = async function () {
    // Check saved language
    const savedLang = DataService.getPreferredLanguage();
    if (savedLang === 'ar') {
        isArabic = true;
        applyLanguageSettings();
    }
    const data = await DataService.getBusData();
    if (data.morning && data.morning.length > 0) busData.morning = data.morning;
    if (data.evening && data.evening.length > 0) busData.evening = data.evening;

    renderRoutes();

    // Poll every 30 seconds for live updates
    setInterval(async () => {
        try {
            const freshData = await DataService.getBusData();
            if (freshData.morning && freshData.morning.length > 0) busData.morning = freshData.morning;
            if (freshData.evening && freshData.evening.length > 0) busData.evening = freshData.evening;
            renderRoutes();
        } catch (e) {
            console.warn('Bus polling failed:', e.message);
        }
    }, 30000);
};

// 2. Render Timelines
function renderRoutes() {
    renderTimeline('morning', 'morningTimeline');
    renderTimeline('evening', 'eveningTimeline');
}

function renderTimeline(type, containerId) {
    const container = document.getElementById(containerId);
    const route = busData[type];

    if (!route || route.length === 0) {
        container.innerHTML = `<p class="text-muted" data-en="No stops added." data-ar="لم تتم إضافة محطات.">${isArabic ? 'لم تتم إضافة محطات.' : 'No stops added.'}</p>`;
        return;
    }

    const now = new Date();
    const currentTimeVal = now.getHours() * 60 + now.getMinutes();

    let html = '';

    route.forEach(stop => {
        const [h, m] = stop.time.split(':').map(Number);
        const stopTimeVal = h * 60 + m;
        const isCompleted = currentTimeVal > stopTimeVal;
        const dotClass = isCompleted ? 'timeline-dot completed' : 'timeline-dot';

        html += `
            <div class="timeline-item">
                <div class="${dotClass}"></div>
                <div class="timeline-content d-flex justify-content-between align-items-center">
                    <span>${stop.loc}</span>
                    <span class="badge bg-light text-dark border">${stop.time}</span>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// 3. Language Toggle
function toggleLanguage() {
    isArabic = !isArabic;
    DataService.setPreferredLanguage(isArabic ? 'ar' : 'en');
    applyLanguageSettings();
}

function applyLanguageSettings() {
    const lang = isArabic ? 'ar' : 'en';

    document.documentElement.setAttribute('dir', isArabic ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);

    // Update button text
    const langLabel = document.getElementById('langLabel');
    if (langLabel) langLabel.innerText = isArabic ? 'English' : 'العربية';

    document.querySelectorAll('[data-en]').forEach(el => {
        el.innerText = el.getAttribute(`data-${lang}`);
    });

    renderRoutes(); // Re-render to update dynamic empty message if needed
}

// Expose functions
window.toggleLanguage = toggleLanguage;
