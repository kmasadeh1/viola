# System Context: Frontend (Viola Academy)

## 1. Project Overview
**Viola Academy** is a comprehensive School Management System and Portal designed for a kindergarten/academy environment. It acts as a Single Page Application (SPA) simulation, running entirely in the browser.

* **Primary Function:** connects Administrators, Teachers, and Parents via dedicated dashboards.
* **Key Characteristic:** Fully bilingual (English/Arabic) with dynamic LTR/RTL layout switching.
* **Target Audience:** School Admins, Teachers, Parents, Students.

## 2. Tech Stack & Dependencies
* **Core:** HTML5, CSS3, Vanilla JavaScript (ES6+).
* **Framework:** Bootstrap 5.3.0 (CDN).
* **Styling:** Custom CSS (`style.css`) + Bootstrap Utilities.
* **Icons:** FontAwesome 6.0 (CDN).
* **Libraries:**
    * `Chart.js` (Admin Dashboard Analytics).
    * `jsPDF` & `jspdf-autotable` (PDF Generation for Reports/Schedules).
* **Runtime:** Browser-based (Client-side only).

## 3. Frontend Architecture

### 3.1. User Portals
The application is divided into three distinct role-based dashboards:
1.  **Admin Portal (`admin_dashboard.html`)**
    * Central control hub.
    * Manages Students, Teachers, Classes, Fees, and System Settings.
    * CMS capabilities for editing the Landing Page (`index.html`).
2.  **Teacher Portal (`teacher_dashboard.html`)**
    * Classroom management interface.
    * Tools for Attendance, Gradebook, Homework posting, and Gallery uploads.
    * Personalized weekly schedule view.
3.  **Parent Portal (`parent_dashboard.html`)**
    * Self-service dashboard for families.
    * Real-time tracking for Bus and Attendance.
    * Financial status (Fees, Wallet) and academic reports (Report Cards).

### 3.2. Public & Utility Pages
* **Landing Page (`index.html`):** Marketing page with "About Us", "Features", and "Testimonials".
* **Login (`login.html`):** Unified entry point with role-based toggle (Parent/Teacher/Admin).
* **E-Commerce:**
    * `shop.html` (Uniforms).
    * `lunch.html` (Meal ordering).
    * `checkout.html` (Cart review and payment simulation).
* **Features:**
    * `bus.html` (GPS simulation map).
    * `schedule.html` (Weekly class timetables).
    * `gallery.html` (School photo gallery).

## 4. Design System & UI/UX

### 4.1. Color Palette
* **Primary:** Viola Purple (`#6a1b9a`)
* **Secondary:** Playful Yellow (`#ffb300`)
* **Accent:** Cyan (`#00bcd4`)
* **Status Colors:**
    * Success: Green (`#2ecc71`)
    * Warning: Orange (`#f39c12`)
    * Danger: Red (`#e74c3c`)

### 4.2. Typography
* **English (LTR):** 'Segoe UI', sans-serif.
* **Arabic (RTL):** 'Tajawal', sans-serif.

### 4.3. UI Patterns
* **Glassmorphism:** Used for floating toggles (Language) and overlay elements.
* **Cards:** Extensive use of rounded cards with hover "lift" effects.
* **Localization:** Global language toggle (`.lang-toggle`) that switches `dir="ltr/rtl"` and updates text content via `data-en` and `data-ar` attributes.

## 5. Data Schema (Client-Side)
The frontend utilizes `localStorage` as a persistent data store. The agent must be aware of the following key structures (schemas):

* **`viola_students`**: Array of student objects (ID, Name, Grade, Fee, Paid Amount, Wallet Balance, Password).
* **`viola_teachers`**: Array of teacher credentials and assigned classes.
* **`viola_classes`**: List of active class names (e.g., "KG1 A").
* **`viola_attendance_[DATE]`**: Daily attendance records mapped by Student ID.
* **`viola_grades` / `viola_grades_term2`**: Academic scores mapped by Student ID.
* **`viola_schedule_v2`**: Nested object structure for class timetables.
* **`viola_orders`**: Array of completed purchase orders (Shop/Lunch).
* **`viola_notifications`**: Array of broadcast messages.
* **`viola_gallery`**: Array of image objects (Base64/URL + Caption).
* **`viola_cart`**: Temporary array for shopping cart items.

## 6. File Structure
```text
/
├── admin_dashboard.html    # Admin Logic & CMS
├── teacher_dashboard.html  # Teacher Tools
├── parent_dashboard.html   # Student/Parent View
├── index.html              # Landing Page
├── login.html              # Auth Entry
├── shop.html               # Uniform Store
├── lunch.html              # Food Menu
├── checkout.html           # Payment Gateway UI
├── bus.html                # Tracking Simulation
├── schedule.html           # PDF Schedule Viewer
├── gallery.html            # Image Grid
├── style.css               # Global Styles & Variables
├── main.js                 # Shared Logic (Cart, Toasts)
└── public/                 # Static Assets (Images, Logos)