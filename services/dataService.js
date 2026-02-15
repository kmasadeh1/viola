export const DataService = {
    API_BASE_URL: 'http://localhost:3000/api',
    // Keys
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

    // --- DATA MAPPING HELPERS (QA & JSON ALIGNMENT) ---
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

    // Generic Helpers
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
            // Fallback for simple values if not JSON
            // But we aim for all JSON here
        }
    },

    // --- Specific Entities ---

    // --- Specific Entities ---

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
        try {
            const payload = this._toSnakeCase(students);
            await this._fetchWithAuth('/students', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        } catch (error) {
            console.error('Error saving students:', error);
            throw error;
        }
    },

    async saveStudent(student, imageFile) {
        try {
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
        } catch (error) {
            console.error('Error saving student:', error);
            throw error;
        }
    },

    // Student Credit (Derived from Student Data or separate endpoint? Plan didn't specify, sticking to students list for now or separate if needed. 
    // Current app architecture mixes them. I will assume credit is part of student object in /students list for now as per previous logic)
    // BUT getStudentCredit() was reading a scalar from localStorage. 
    // Usage: checkout.js calls getStudentCredit(). 
    // Logic: It should probably fetch the *current logged in user's* credit.
    // However, the prompt only explicitly mentioned Students, Teachers, Classes, Orders.
    // I will leave getStudentCredit using localStorage for now OR better, refactor it to use the session user data if possible, but that might break "Admin view".
    // Actually, `getStudentCredit` is used in `checkout.js` for the *parent* to see their balance.
    // I'll keep it as is for now to avoid scope creep, or update it if it relies on `students` array which I'm now fetching async.
    // Wait, if `getStudents` is async, `getStudentCredit` (which reads from LS `viola_student_credit`) is separate. 
    // I will leave `getStudentCredit` / `setStudentCredit` alone for this specific "Data API Integration" phase unless it breaks. 
    // The previous implementation of `setStudentCredit` updated `viola_student_credit`.
    // The `processCheckout` updated BOTH `viola_student_credit` AND the student record in `viola_students`.
    // If I change `saveStudents` to API, `processCheckout` needs to await it.

    getStudentCredit() {
        return parseFloat(localStorage.getItem(this.KEYS.STUDENT_CREDIT) || "0");
    },

    setStudentCredit(amount) {
        localStorage.setItem(this.KEYS.STUDENT_CREDIT, amount);
    },

    // Cart (Local Only)
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
        try {
            const payload = this._toSnakeCase(order);
            await this._fetchWithAuth('/orders', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        } catch (error) {
            console.error('Error saving order:', error);
            throw error;
        }
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
        try {
            const payload = this._toSnakeCase(teachers);
            await this._fetchWithAuth('/teachers', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        } catch (error) {
            console.error('Error saving teachers:', error);
            throw error;
        }
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
        try {
            await this._fetchWithAuth('/classes', {
                method: 'POST',
                body: JSON.stringify({ name: className })
            });
        } catch (error) {
            console.error('Error saving class:', error);
            throw error;
        }
    },

    async saveClasses(classes) {
        try {
            // Check if backend supports bulk update, or use saveClass
            await this._fetchWithAuth('/classes', {
                method: 'POST',
                body: JSON.stringify(classes)
            });
        } catch (error) {
            console.error('Error saving classes:', error);
            throw error;
        }
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
        try {
            const payload = this._toSnakeCase(menu);
            await this._fetchWithAuth('/lunch', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        } catch (error) {
            console.error('Error saving lunch menu:', error);
            throw error;
        }
    },

    async saveLunchItem(item, imageFile) {
        try {
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
        } catch (error) {
            console.error('Error saving lunch item:', error);
            throw error;
        }
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
        try {
            const payload = this._toSnakeCase(gallery);
            await this._fetchWithAuth('/gallery', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        } catch (error) {
            console.error('Error saving gallery:', error);
            throw error;
        }
    },

    async uploadGalleryImage(caption, classId, imageFile) {
        try {
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
        } catch (error) {
            console.error('Error uploading gallery image:', error);
            throw error;
        }
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
        try {
            const payload = this._toSnakeCase(schedule);
            await this._fetchWithAuth('/schedule', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        } catch (error) {
            console.error('Error saving schedule:', error);
            throw error;
        }
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
        try {
            const payload = this._toSnakeCase(data);
            await this._fetchWithAuth('/bus', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        } catch (error) {
            console.error('Error saving bus data:', error);
            throw error;
        }
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
        try {
            const payload = this._toSnakeCase(notifications);
            await this._fetchWithAuth('/notifications', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        } catch (error) {
            console.error('Error saving notifications:', error);
            throw error;
        }
    },

    // Shop Settings
    async getShopData() {
        try {
            const response = await this._fetchWithAuth('/shop');
            const data = await response.json();
            return this._toCamelCase(data);
        } catch (error) {
            console.error('Error fetching shop data:', error);
            return {
                summer: { price: 15, desc: "Breathable cotton polo.", img: "" },
                winter: { price: 25, desc: "Warm wool blazer.", img: "" }
            };
        }
    },

    async saveShopData(shopData) {
        try {
            const payload = this._toSnakeCase(shopData);
            await this._fetchWithAuth('/shop', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        } catch (error) {
            console.error('Error saving shop data:', error);
            throw error;
        }
    },

    // Settings
    getSettings() {
        return this.getItem(this.KEYS.SETTINGS, {
            schoolName: "Viola Academy",
            phone: "+962 79 000 0000",
            year: "2026-2027",
            language: "English",
            adminPassword: "admin123"
        });
    },

    saveSettings(settings) {
        this.setItem(this.KEYS.SETTINGS, settings);
    },

    // Grades
    async getGrades(term = 'First Semester') {
        try {
            // Encode term to handle spaces
            const response = await this._fetchWithAuth(`/grades?term=${encodeURIComponent(term)}`);
            const data = await response.json();
            return this._toCamelCase(data);
        } catch (error) {
            console.error('Error fetching grades:', error);
            return {};
        }
    },

    async saveGrades(grades, term = 'First Semester') {
        try {
            // term is a string, grades is an object.
            // grades keys are student IDs (strings), values are objects.
            // We need to map the grades object.
            const payload = this._toSnakeCase(grades);
            await this._fetchWithAuth('/grades', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ term, grades: payload })
            });
        } catch (error) {
            console.error('Error saving grades:', error);
            throw error;
        }
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
        try {
            await this._fetchWithAuth('/subjects', {
                method: 'POST',
                body: JSON.stringify(subjects)
            });
        } catch (error) {
            console.error('Error saving subjects:', error);
            throw error;
        }
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
        try {
            const payload = this._toSnakeCase(homeworkList);
            await this._fetchWithAuth('/homework', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        } catch (error) {
            console.error('Error saving homework:', error);
            throw error;
        }
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
        try {
            // data is object {studentId: status}
            // status is string (present/absent) - no mapping needed for values
            // but structure might need snake case if keys were camel? student IDs are numbers/strings.
            // We'll apply it just in case.
            const payload = this._toSnakeCase(data);
            await this._fetchWithAuth('/attendance', {
                method: 'POST',
                body: JSON.stringify({ date: dateStr, data: payload })
            });
        } catch (error) {
            console.error('Error saving attendance:', error);
            throw error;
        }
    },

    // Home Data
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
        try {
            const payload = this._toSnakeCase(data);
            await this._fetchWithAuth('/home_data', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        } catch (error) {
            console.error('Error saving home data:', error);
            throw error;
        }
    },

    // --- AUTHENTICATION & API ---

    _setToken(token) {
        if (token) {
            sessionStorage.setItem('viola_jwt', token);
        } else {
            sessionStorage.removeItem('viola_jwt');
        }
    },

    _getToken() {
        return sessionStorage.getItem('viola_jwt');
    },

    isLoggedIn() {
        return !!this._getToken();
    },

    logout() {
        this._setToken(null);
        window.location.href = 'login.html';
    },

    async _fetchWithAuth(endpoint, options = {}) {
        const token = this._getToken();
        const headers = { 'Authorization': `Bearer ${token}` };

        if (options.body instanceof FormData) {
            // Browser sets Content-Type with boundary for FormData
            // Do NOT set it manually
        } else {
            headers['Content-Type'] = 'application/json';
        }

        const response = await fetch(`${this.API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });

        if (response.status === 401) {
            console.warn("Session expired (401), logging out...");
            this.logout();
            throw new Error('Session expired');
        }

        if (!response.ok) {
            alert(`API Error: ${response.statusText} (${response.status})`);
            console.error(`API Error ${response.status} at ${endpoint}:`, response.statusText);
        }

        return response;
    },

    async login(role, credentials) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role, ...credentials })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Login failed');
            }

            const data = await response.json();
            this._setToken(data.token);

            return data.user;
        } catch (error) {
            console.error('Login Error:', error);
            throw error;
        }
    },

    // Language Preference
    getPreferredLanguage() {
        return localStorage.getItem(this.KEYS.LANGUAGE) || 'en';
    },

    setPreferredLanguage(lang) {
        localStorage.setItem(this.KEYS.LANGUAGE, lang);
    }
};
