/**
 * dataService.js — Viola Academy Data & Auth Layer
 * =================================================
 * Security Architecture:
 *  - Authentication relies on HttpOnly session cookies set by the backend.
 *    No JWTs are ever stored in localStorage or sessionStorage.
 *  - All authenticated API calls include credentials: 'include' so the
 *    browser automatically attaches the HttpOnly cookie.
 *  - The Authorization: Bearer header is intentionally absent — auth is
 *    handled server-side via the cookie, not a client-readable token.
 */

export const DataService = {
    API_BASE_URL: 'http://localhost:3000/api',

    // Keys (non-sensitive, UI-only preferences — safe for localStorage)
    KEYS: {
        STUDENTS: 'viola_students',
        TEACHERS: 'viola_teachers',
        CLASSES: 'viola_classes',
        CART: 'viola_cart',
        CART_LUNCH: 'viola_cart_lunch',
        CART_SHOP: 'viola_cart_shop',
        ORDERS: 'viola_orders',
        LUNCH_MENU: 'viola_lunch_menu',
        GALLERY: 'viola_gallery',
        SCHEDULE: 'viola_schedule_v2',
        BUS: 'viola_bus_data',
        NOTIFICATIONS: 'viola_notifications',
        SHOP: 'viola_shop_data',
        SETTINGS: 'viola_settings',
        GRADES: 'viola_grades',
        GRADES_TERM2: 'viola_grades_term2',
        SUBJECTS: 'viola_subjects',
        HOMEWORK: 'viola_homework',
        STUDENT_CREDIT: 'viola_student_credit',
        LANGUAGE: 'viola_language',
        HOME: 'viola_home_data'
    },

    // --- DATA MAPPING HELPERS ---
    _toSnakeCase(obj) {
        if (Array.isArray(obj)) {
            return obj.map(v => this._toSnakeCase(v));
        } else if (obj !== null && obj.constructor === Object) {
            return Object.keys(obj).reduce((result, key) => {
                const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                result[snakeKey] = this._toSnakeCase(obj[key]);
                return result;
            }, {});
        }
        return obj;
    },

    _toCamelCase(obj) {
        if (Array.isArray(obj)) {
            return obj.map(v => this._toCamelCase(v));
        } else if (obj !== null && obj.constructor === Object) {
            return Object.keys(obj).reduce((result, key) => {
                const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
                result[camelKey] = this._toCamelCase(obj[key]);
                return result;
            }, {});
        }
        return obj;
    },

    // --- UI-ONLY PREFERENCES (safe for localStorage) ---
    getItem(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error(`Error reading ${key} from localStorage`, e);
            return defaultValue;
        }
    },

    setItem(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error(`Error writing ${key} to localStorage`, e);
        }
    },

    // --- AUTHENTICATION ---

    /**
     * Returns the currently authenticated user from the server session.
     * Calls GET /api/auth/me — authenticates via HttpOnly cookie automatically.
     * @returns {Promise<{id, role, name, class}|null>}
     */
    async getCurrentUser() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/auth/me`, {
                method: 'GET',
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                return this._toCamelCase(data);
            }
            return null;
        } catch (e) {
            // Network error or server offline — treat as unauthenticated
            console.error('Could not verify session:', e);
            return null;
        }
    },

    /**
     * Reads the admin-preview teacher object from sessionStorage.
     * This is NOT authentication — it is a UI-only preview feature for admin.
     * @returns {{name, class}|null}
     */
    getTeacherPreview() {
        try {
            const raw = sessionStorage.getItem('viola_preview_teacher');
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    },

    /**
     * Performs login. On success, the backend sets an HttpOnly cookie.
     * No token is stored client-side.
     * @param {string} role
     * @param {object} credentials
     * @returns {Promise<object>} user object
     */
    async login(role, credentials) {
        const response = await fetch(`${this.API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ role, ...credentials })
        });

        if (!response.ok) {
            let message = 'Login failed. Please check your credentials.';
            try {
                const errorBody = await response.json();
                // Only use the server message if it's a simple string (not a stack trace)
                if (typeof errorBody.message === 'string' && errorBody.message.length < 200) {
                    message = errorBody.message;
                }
            } catch { /* ignore JSON parse errors */ }
            throw new Error(message);
        }

        const data = await response.json();
        return this._toCamelCase(data.user || data);
    },

    /**
     * Logs out the current user.
     * Calls the backend to clear the HttpOnly cookie, then cleans up
     * any non-sensitive sessionStorage entries and redirects to login.
     */
    async logout() {
        try {
            await fetch(`${this.API_BASE_URL}/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });
        } catch (e) {
            // Even if the request fails, proceed with client-side cleanup
            console.error('Logout request failed:', e);
        } finally {
            // Clear UI-only session keys (non-sensitive)
            sessionStorage.removeItem('viola_current_student_id');
            sessionStorage.removeItem('viola_current_teacher_email');
            sessionStorage.removeItem('viola_preview_teacher');
            sessionStorage.removeItem('viola_preview_student_id');
            window.location.href = 'login.html';
        }
    },

    // --- CORE FETCH WRAPPER ---

    /**
     * Authenticated fetch wrapper. Auth is via HttpOnly cookie (credentials: 'include').
     * Handles all HTTP error statuses gracefully — never exposes stack traces to callers.
     * @param {string} endpoint  - e.g. '/students'
     * @param {object} options   - standard fetch options (method, body, etc.)
     * @returns {Promise<Response>}
     */
    async _fetchWithAuth(endpoint, options = {}) {
        const headers = {};

        if (options.body instanceof FormData) {
            // Browser sets Content-Type with multipart boundary for FormData automatically
            // Do NOT set it manually — it WILL break the boundary
        } else if (options.body) {
            headers['Content-Type'] = 'application/json';
        }

        // Merge caller headers (e.g. explicit Content-Type from saveGrades) safely
        const mergedHeaders = { ...headers, ...(options.headers || {}) };

        let response;
        try {
            response = await fetch(`${this.API_BASE_URL}${endpoint}`, {
                ...options,
                headers: mergedHeaders,
                credentials: 'include'  // HttpOnly cookie is sent automatically
            });
        } catch (networkError) {
            throw new Error('Unable to reach the server. Please check your connection.');
        }

        // --- Graceful HTTP status handling ---
        if (response.status === 401) {
            console.warn('Session expired or unauthenticated (401). Redirecting to login.');
            await this.logout();
            throw new Error('Your session has expired. Please log in again.');
        }

        if (response.status === 403) {
            console.error(`Access denied (403) at ${endpoint}`);
            throw new Error('You do not have permission to perform this action.');
        }

        if (response.status === 404) {
            console.error(`Resource not found (404) at ${endpoint}`);
            throw new Error('The requested resource was not found.');
        }

        if (response.status >= 500) {
            console.error(`Server error (${response.status}) at ${endpoint}`);
            throw new Error('A server error occurred. Please try again later.');
        }

        if (!response.ok) {
            console.error(`Unexpected API error (${response.status}) at ${endpoint}`);
            throw new Error(`Request failed (${response.status}). Please try again.`);
        }

        return response;
    },

    // --- ENTITY METHODS ---

    // Students
    async getStudents() {
        try {
            const response = await this._fetchWithAuth('/students');
            const data = await response.json();
            return this._toCamelCase(data);
        } catch (error) {
            console.error('Error fetching students:', error);
            return [];
        }
    },

    async saveStudents(students) {
        const payload = this._toSnakeCase(students);
        await this._fetchWithAuth('/students', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    async saveStudent(student, imageFile) {
        const formData = new FormData();
        const snakeStudent = this._toSnakeCase(student);
        for (const key in snakeStudent) {
            if (Object.prototype.hasOwnProperty.call(snakeStudent, key)) {
                formData.append(key, snakeStudent[key]);
            }
        }
        if (imageFile) {
            formData.append('image', imageFile);
        }
        await this._fetchWithAuth('/students/save', {
            method: 'POST',
            body: formData
        });
    },

    // Student Credit (UI sync only — actual source of truth is the student record)
    getStudentCredit() {
        return parseFloat(localStorage.getItem(this.KEYS.STUDENT_CREDIT) || '0');
    },

    setStudentCredit(amount) {
        localStorage.setItem(this.KEYS.STUDENT_CREDIT, amount);
    },

    // Cart (local only — no sensitive data)
    getCart(key = this.KEYS.CART) {
        return this.getItem(key, []);
    },

    addToCart(item, key = this.KEYS.CART) {
        const cart = this.getCart(key);
        cart.push(item);
        this.setItem(key, cart);
    },

    setCart(cart, key = this.KEYS.CART) {
        this.setItem(key, cart);
    },

    clearCart(key = this.KEYS.CART) {
        this.setItem(key, []);
    },

    // Orders
    async getOrders() {
        try {
            const response = await this._fetchWithAuth('/orders');
            const data = await response.json();
            return this._toCamelCase(data);
        } catch (error) {
            console.error('Error fetching orders:', error);
            return [];
        }
    },

    async saveOrder(order) {
        const payload = this._toSnakeCase(order);
        await this._fetchWithAuth('/orders', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    // Teachers
    async getTeachers() {
        try {
            const response = await this._fetchWithAuth('/teachers');
            const data = await response.json();
            return this._toCamelCase(data);
        } catch (error) {
            console.error('Error fetching teachers:', error);
            return [];
        }
    },

    async saveTeachers(teachers) {
        const payload = this._toSnakeCase(teachers);
        await this._fetchWithAuth('/teachers', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    // Classes
    async getClasses() {
        try {
            const response = await this._fetchWithAuth('/classes');
            return await response.json();
        } catch (error) {
            console.error('Error fetching classes:', error);
            return ['KG1 A', 'KG1 B', 'KG2 A', 'KG2 B'];
        }
    },

    async saveClass(className) {
        await this._fetchWithAuth('/classes', {
            method: 'POST',
            body: JSON.stringify({ name: className })
        });
    },

    async saveClasses(classes) {
        await this._fetchWithAuth('/classes', {
            method: 'POST',
            body: JSON.stringify(classes)
        });
    },

    // Lunch Menu
    async getLunchMenu() {
        try {
            const response = await this._fetchWithAuth('/lunch');
            const data = await response.json();
            return this._toCamelCase(data);
        } catch (error) {
            console.error('Error fetching lunch menu:', error);
            return [];
        }
    },

    async saveLunchMenu(menu) {
        const payload = this._toSnakeCase(menu);
        await this._fetchWithAuth('/lunch', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    async saveLunchItem(item, imageFile) {
        const formData = new FormData();
        const snakeItem = this._toSnakeCase(item);
        for (const key in snakeItem) {
            if (Object.prototype.hasOwnProperty.call(snakeItem, key)) {
                formData.append(key, snakeItem[key]);
            }
        }
        if (imageFile) {
            formData.append('image', imageFile);
        }
        await this._fetchWithAuth('/lunch/save', {
            method: 'POST',
            body: formData
        });
    },

    // Gallery
    async getGallery() {
        try {
            const response = await this._fetchWithAuth('/gallery');
            const data = await response.json();
            return this._toCamelCase(data);
        } catch (error) {
            console.error('Error fetching gallery:', error);
            return [];
        }
    },

    async saveGallery(gallery) {
        const payload = this._toSnakeCase(gallery);
        await this._fetchWithAuth('/gallery', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    async uploadGalleryImage(caption, classId, imageFile) {
        const formData = new FormData();
        formData.append('caption', caption);
        formData.append('target_class', classId);
        if (imageFile) {
            formData.append('image', imageFile);
        }
        await this._fetchWithAuth('/gallery/upload', {
            method: 'POST',
            body: formData
        });
    },

    // Schedule
    async getSchedule() {
        try {
            const response = await this._fetchWithAuth('/schedule');
            const data = await response.json();
            return this._toCamelCase(data);
        } catch (error) {
            console.error('Error fetching schedule:', error);
            return {};
        }
    },

    async saveSchedule(schedule) {
        const payload = this._toSnakeCase(schedule);
        await this._fetchWithAuth('/schedule', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    // Bus
    async getBusData() {
        try {
            const response = await this._fetchWithAuth('/bus');
            const data = await response.json();
            return this._toCamelCase(data);
        } catch (error) {
            console.error('Error fetching bus data:', error);
            return { morning: [], evening: [] };
        }
    },

    async saveBusData(data) {
        const payload = this._toSnakeCase(data);
        await this._fetchWithAuth('/bus', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    // Notifications
    async getNotifications() {
        try {
            const response = await this._fetchWithAuth('/notifications');
            const data = await response.json();
            return this._toCamelCase(data);
        } catch (error) {
            console.error('Error fetching notifications:', error);
            return [];
        }
    },

    async saveNotifications(notifications) {
        const payload = this._toSnakeCase(notifications);
        await this._fetchWithAuth('/notifications', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    // Shop
    async getShopData() {
        try {
            const response = await this._fetchWithAuth('/shop');
            const data = await response.json();
            return this._toCamelCase(data);
        } catch (error) {
            console.error('Error fetching shop data:', error);
            return {
                summer: { price: 15, desc: 'Breathable cotton polo.', img: '' },
                winter: { price: 25, desc: 'Warm wool blazer.', img: '' }
            };
        }
    },

    async saveShopData(shopData) {
        const payload = this._toSnakeCase(shopData);
        await this._fetchWithAuth('/shop', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    // Settings (UI preferences — safe for localStorage)
    getSettings() {
        return this.getItem(this.KEYS.SETTINGS, {
            schoolName: 'Viola Academy',
            phone: '+962 79 000 0000',
            year: '2026-2027',
            language: 'English',
            adminPassword: 'admin123'
        });
    },

    saveSettings(settings) {
        this.setItem(this.KEYS.SETTINGS, settings);
    },

    // Grades
    async getGrades(term = 'First Semester') {
        try {
            const response = await this._fetchWithAuth(`/grades?term=${encodeURIComponent(term)}`);
            const data = await response.json();
            return this._toCamelCase(data);
        } catch (error) {
            console.error('Error fetching grades:', error);
            return {};
        }
    },

    async saveGrades(grades, term = 'First Semester') {
        const payload = this._toSnakeCase(grades);
        await this._fetchWithAuth('/grades', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ term, grades: payload })
        });
    },

    // Subjects
    async getSubjects() {
        try {
            const response = await this._fetchWithAuth('/subjects');
            return await response.json();
        } catch (error) {
            console.error('Error fetching subjects:', error);
            return ['Math', 'Science', 'English'];
        }
    },

    async saveSubjects(subjects) {
        await this._fetchWithAuth('/subjects', {
            method: 'POST',
            body: JSON.stringify(subjects)
        });
    },

    // Homework
    async getHomework() {
        try {
            const response = await this._fetchWithAuth('/homework');
            const data = await response.json();
            return this._toCamelCase(data);
        } catch (error) {
            console.error('Error fetching homework:', error);
            return [];
        }
    },

    async saveHomework(homeworkList) {
        const payload = this._toSnakeCase(homeworkList);
        await this._fetchWithAuth('/homework', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    // Attendance
    async getAttendance(dateStr) {
        try {
            const response = await this._fetchWithAuth(`/attendance?date=${dateStr}`);
            const data = await response.json();
            return this._toCamelCase(data);
        } catch (error) {
            console.error('Error fetching attendance:', error);
            return {};
        }
    },

    async saveAttendance(dateStr, data) {
        const payload = this._toSnakeCase(data);
        await this._fetchWithAuth('/attendance', {
            method: 'POST',
            body: JSON.stringify({ date: dateStr, data: payload })
        });
    },

    // Home Data
    async getHomeData() {
        try {
            const response = await this._fetchWithAuth('/home_data');
            const data = await response.json();
            return this._toCamelCase(data);
        } catch (error) {
            console.error('Error fetching home data:', error);
            return {};
        }
    },

    async saveHomeData(data) {
        const payload = this._toSnakeCase(data);
        await this._fetchWithAuth('/home_data', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    // Language Preference (safe for localStorage — not sensitive)
    getPreferredLanguage() {
        return localStorage.getItem(this.KEYS.LANGUAGE) || 'en';
    },

    setPreferredLanguage(lang) {
        localStorage.setItem(this.KEYS.LANGUAGE, lang);
    }
};
