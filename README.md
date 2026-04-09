# 🌽 RINDEX — Complete VS Code Setup Guide
> Maize Inventory Management System  
> Stack: React (Frontend) + Node.js + Express (Backend) + SQLite (Database)

---

## 📁 PROJECT STRUCTURE

```
rindex/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   └── database.js       ← Database setup & tables
│   │   ├── middleware/
│   │   │   └── auth.js           ← JWT authentication
│   │   ├── routes/
│   │   │   ├── auth.js           ← Login & user management
│   │   │   ├── receipts.js       ← Stock receipts API
│   │   │   ├── issues.js         ← Stock issues API
│   │   │   └── dashboard.js      ← Dashboard & settings API
│   │   └── server.js             ← Main server entry point
│   └── package.json
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   └── Sidebar.js        ← Navigation sidebar
│   │   ├── context/
│   │   │   └── AuthContext.js    ← Global login state
│   │   ├── pages/
│   │   │   ├── Login.js          ← Login page
│   │   │   ├── Dashboard.js      ← Main dashboard
│   │   │   ├── Receipts.js       ← Stock receipts
│   │   │   ├── Issues.js         ← Stock issues
│   │   │   ├── Balance.js        ← Live stock balance
│   │   │   ├── PnL.js            ← Profit & Loss
│   │   │   ├── Settings.js       ← App settings
│   │   │   └── Users.js          ← User management
│   │   ├── utils/
│   │   │   ├── api.js            ← Axios API connector
│   │   │   └── format.js         ← GHS formatting helpers
│   │   ├── App.js                ← Router & app shell
│   │   ├── index.js              ← React entry point
│   │   └── index.css             ← Global styles
│   └── package.json
└── README.md
```

---

## ✅ PREREQUISITES — Install These First

Before anything, make sure you have these installed on your computer:

### 1. Node.js (Required)
- Go to: https://nodejs.org
- Download the **LTS version** (recommended)
- Install it — accept all defaults
- To verify: open a terminal in VS Code and type:
  ```
  node --version
  ```
  You should see something like: `v20.11.0`

### 2. VS Code Extensions (Recommended)
Install these from the Extensions panel in VS Code (Ctrl+Shift+X):
- **ES7+ React/Redux/React-Native snippets** — for React shortcuts
- **Prettier** — for code formatting
- **REST Client** — to test your API

---

## 🚀 STEP-BY-STEP SETUP IN VS CODE

### STEP 1 — Open the Project Folder

1. Open VS Code
2. Go to **File → Open Folder**
3. Select the `rindex` folder
4. You should see both `backend/` and `frontend/` in the Explorer panel

---

### STEP 2 — Install Backend Dependencies

1. Open the **integrated terminal** in VS Code:  
   Press **Ctrl + `** (backtick key, top-left of keyboard)

2. Navigate to the backend folder:
   ```bash
   cd backend
   ```

3. Install all backend packages:
   ```bash
   npm install
   ```
   This downloads: Express, SQLite, JWT, bcrypt, CORS, nodemon  
   ⏱ Takes about 1–2 minutes

4. You should see a `node_modules` folder appear inside `backend/`

---

### STEP 3 — Install Frontend Dependencies

1. In the same terminal, go back to root and then into frontend:
   ```bash
   cd ../frontend
   ```

2. Install all frontend packages:
   ```bash
   npm install
   ```
   ⏱ This takes 3–5 minutes (React + all libraries)

3. You should see a `node_modules` folder appear inside `frontend/`

---

### STEP 4 — Run the Backend Server

1. Open a **new terminal** in VS Code:  
   Click the **+** icon in the terminal panel, or press **Ctrl+Shift+`**

2. Navigate to the backend:
   ```bash
   cd backend
   ```

3. Start the backend server:
   ```bash
   npm run dev
   ```

4. You should see this output:
   ```
   🌽  Rindex Backend API
   ✅  Running on http://localhost:5000
   📦  Database: rindex.db
   🔐  Default login: admin@rindex.com / admin123
   ✅  Database initialised successfully
   ✅  Default admin created: admin@rindex.com / admin123
   ```

5. A file called `rindex.db` will appear in your `backend/` folder — this is your database!

> ⚠️ Keep this terminal open and running. The backend must be running for the app to work.

---

### STEP 5 — Run the Frontend

1. Open another **new terminal** (click the + icon again)

2. Navigate to the frontend:
   ```bash
   cd frontend
   ```

3. Start the React app:
   ```bash
   npm start
   ```

4. After 20–30 seconds, your browser will automatically open at:
   ```
   http://localhost:3000
   ```

5. You will see the **Rindex Login Page**!

> ⚠️ Keep this terminal open too. You now have 2 terminals running — backend on port 5000, frontend on port 3000.

---

### STEP 6 — Log In and Use Rindex

1. On the login page, enter:
   - **Email:** `admin@rindex.com`
   - **Password:** `admin123`

2. Click **Sign In to Rindex**

3. You are now inside the full Rindex application!

---

## 🔐 FIRST THINGS TO DO AFTER LOGIN

### 1. Change the Default Password
- Click **⚙️ Settings** in the left sidebar
- Scroll to **Change Password**
- Enter the current password (`admin123`) and set a new secure password
- Click **Update Password**

### 2. Update Your Business Settings
- While in Settings, update:
  - **Business Name** → Your actual business name
  - **Selling Price per Bag** → Your current price (e.g. 320)
  - **Reorder Level** → Minimum bags before alert fires (e.g. 50)
  - **Warehouse Capacity** → Max bags your warehouse holds (e.g. 1000)
  - **Warehouse Location** → e.g. Accra
- Click **Save Settings**

### 3. Create Staff Accounts
- Click **👥 Manage Users** in the sidebar
- Click **Add User**
- Enter your staff member's name, email, and a password
- Choose their role (Staff or Admin)
- Click **Create User**
- Share the login details with your staff member

---

## 📦 HOW TO USE RINDEX — QUICK REFERENCE

### Recording a Delivery (Stock In)
1. Click **📥 Stock Receipts** in the sidebar
2. Click **Record Delivery** (green button)
3. Fill in: Date, GRN Number, Supplier, Quantity, Unit Cost
4. Click **Save Receipt**
5. Dashboard updates instantly ✅

### Recording a Sale (Stock Out)
1. Click **📤 Stock Issues** in the sidebar
2. Click **Record Sale** (red button)
3. Fill in: Date, Invoice Number, Customer, Quantity
4. Selling price auto-fills from your settings
5. Click **Save Issue**
6. Dashboard updates instantly ✅

### Checking Your Balance
- Click **⚖️ Stock Balance** — shows every transaction with running balance
- OR check the Dashboard KPI cards at the top

### Viewing Profit & Loss
1. Click **💰 P&L Summary**
2. Select the month and year at the top right
3. Add any operating expenses (rent, transport, etc.)
4. Net Profit calculates automatically

---

## 🛠️ TROUBLESHOOTING

### "Cannot connect to backend" or blank pages
- Make sure the backend terminal is still running (`npm run dev` in `backend/`)
- Check that it shows "Running on http://localhost:5000"
- If it stopped, run `npm run dev` again

### "npm install" fails
- Make sure Node.js is installed: `node --version`
- Try deleting the `node_modules` folder and running `npm install` again
- Make sure you're in the correct folder (`backend/` or `frontend/`)

### Port already in use error
- Another app is using port 3000 or 5000
- Backend: open `backend/src/server.js` and change `5000` to `5001`
- Also update `frontend/package.json` — change `"proxy": "http://localhost:5000"` to `"proxy": "http://localhost:5001"`
- Frontend: when it asks "Something is already running on port 3000, use another port? Y" — type Y

### Login says "Invalid email or password"
- Default credentials are exactly: `admin@rindex.com` and `admin123`
- Check for typos or extra spaces
- The database file `rindex.db` must exist in the `backend/` folder

### Database reset (start fresh)
- Stop the backend server (Ctrl+C in that terminal)
- Delete the file `backend/rindex.db`
- Run `npm run dev` again — it recreates the database with default admin

---

## 📋 RUNNING RINDEX EVERY DAY

Every time you want to use Rindex, open VS Code and:

1. Open terminal → go to `backend/` → run `npm run dev`
2. Open another terminal → go to `frontend/` → run `npm start`
3. Browser opens automatically at `http://localhost:3000`
4. Log in and start working

**Tip:** You can use the VS Code "Split Terminal" feature to see both terminals side by side.

---

## 🌐 GOING LIVE ON THE INTERNET (When Ready)

When you are ready to put Rindex on the internet so staff can access it from anywhere:

### Option A — Free Hosting (Recommended to start)
1. **Backend:** Deploy to [Render.com](https://render.com) — free tier available
2. **Frontend:** Deploy to [Vercel.com](https://vercel.com) — free tier available
3. **Database:** Render provides persistent disk storage for SQLite

### Option B — Paid Hosting (More reliable)
1. **VPS:** DigitalOcean ($6/month) or Contabo ($5/month)
2. SSH into the server, install Node.js, copy files, run with PM2
3. Use Nginx as a reverse proxy
4. Buy a domain from Namecheap (~$10/year)

> When you are ready for this step, come back and I will walk you through it in detail.

---

## 💾 BACKING UP YOUR DATA

Your entire data lives in one file: `backend/rindex.db`

**To back up:**
1. Copy `rindex.db` to a USB drive, Google Drive, or email it to yourself
2. Do this weekly minimum

**To restore:**
1. Stop the backend server
2. Replace `rindex.db` with your backup copy
3. Restart the server

---

## 📞 SUMMARY OF COMMANDS

| Action | Folder | Command |
|--------|--------|---------|
| Install backend packages | `backend/` | `npm install` |
| Install frontend packages | `frontend/` | `npm install` |
| Start backend (development) | `backend/` | `npm run dev` |
| Start frontend | `frontend/` | `npm start` |
| Start backend (production) | `backend/` | `npm start` |

---

*Rindex v1.0 — Built for Maize Retail Operations — GHS / 50 kg Bags*
