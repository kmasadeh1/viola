# Viola Academy Frontend

A High-Fidelity School Management Portal.

> [!IMPORTANT]
> This project **must** be served via a local web server. Due to the use of ES6 Modules and browser CORS policies, opening the files directly (using the `file://` protocol) will cause errors.

## How to Run

Choose one of the following methods to serve the frontend locally:

### Option 1: VS Code (Recommended)
1. Install the **Live Server** extension.
2. Open the project folder in VS Code.
3. Right-click on `index.html` in the file explorer.
4. Select **"Open with Live Server"**.

### Option 2: Python
If you have Python installed, run the following command in the project root:
```bash
python -m http.server 8080
```
Then navigate to `http://localhost:8080` in your browser.

### Option 3: Node.js
If you have Node.js installed, you can use `npx`:
```bash
npx serve
```
Then navigate to the URL provided in the terminal (usually `http://localhost:3000` or `http://localhost:5000`).

## Configuration

The frontend is configured to communicate with the Backend API at the following address:
- **Default API URL**: `http://localhost:3000`

If your backend is running on a different port or host, you must update the configuration in:
`[dataService.js](file:///c:/Users/Kareem/Downloads/viola/services/dataService.js)`

Look for the `API_BASE_URL` constant:
```javascript
API_BASE_URL: 'http://localhost:3000/api',
```
