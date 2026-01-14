# Folder Rename Instructions: PMBOK-ProjectManagement → CQM-ProjectManagement

## Summary of Changes Made

All PMBOK references in the codebase have been updated to CQM:

### Files Updated:
- `CLAUDE.md` - Project overview updated
- `README.md` - Full rewrite with CQM branding
- `package.json` - Already had CQM naming
- `backend/.env.example` - DB name: `cqm_db`
- `frontend/.env.example` - App name: `CQM Tracking System`
- `backend/config/database.js` - Default DB: `cqm_db`
- `backend/create-admin.js` - Admin email: `admin@cqm.com`
- `backend/db/migrate.js` - Default DB: `cqm_db`
- `backend/seed-data.js` - Admin email: `admin@cqm.com`
- `backend/utils/logger.js` - Service name: `cqm-api`
- `backend/utils/emailService.js` - Brand: `CQM Tracking System`
- `frontend/index.html` - Title: `CQM Tracking System`
- `frontend/public/index.html` - Title: `CQM Tracking System`
- `frontend/src/components/Auth/Login.tsx` - Title and demo email
- `frontend/src/components/Auth/Register.tsx` - Title
- `frontend/src/App.tsx` - Comment update
- `start-dev.ps1` - Header branding
- `setup.ps1` - Header branding and admin email
- `backend/tests/integration/cqm.integration.test.js` - Test emails

---

## Folder Rename Steps

### Step 1: Close All Applications
1. Close VS Code (or your editor)
2. Stop any running servers (Ctrl+C in terminal windows)
3. Close all terminal windows in the project

### Step 2: Rename the Folder
**Option A: Using File Explorer**
1. Navigate to `C:\Users\Fiser\`
2. Right-click on `PMBOK-ProjectManagement`
3. Select "Rename"
4. Type `CQM-ProjectManagement`
5. Press Enter

**Option B: Using PowerShell (Run as Administrator)**
```powershell
Rename-Item -Path "C:\Users\Fiser\PMBOK-ProjectManagement" -NewName "CQM-ProjectManagement"
```

### Step 3: Update Start Scripts (After Rename)
After renaming, update the paths in the batch files:

**Edit `start-dev.bat`:**
Change the paths from:
```batch
cd /d C:\Users\Fiser\PMBOK-ProjectManagement\backend
cd /d C:\Users\Fiser\PMBOK-ProjectManagement\frontend
```
To:
```batch
cd /d C:\Users\Fiser\CQM-ProjectManagement\backend
cd /d C:\Users\Fiser\CQM-ProjectManagement\frontend
```

### Step 4: Verify Everything Works
```powershell
cd C:\Users\Fiser\CQM-ProjectManagement
npm run dev
```

---

## Database Considerations

Your current database is likely named `pmbok_db`. You have two options:

### Option A: Keep Using pmbok_db (Recommended - No Data Loss)
Just update your `backend/.env` file to point to the existing database:
```env
DB_NAME=pmbok_db
```
This keeps all your existing data.

### Option B: Create New cqm_db Database
If you want a fresh start:
```powershell
# Create new database
psql -U postgres -c "CREATE DATABASE cqm_db;"

# Update backend/.env
DB_NAME=cqm_db

# Run migrations
cd backend
npm run migrate
npm run seed-cqm
node create-admin.js
```

---

## New Admin Credentials

After the rename, the admin login is:
- **Email:** `admin@cqm.com`
- **Password:** `admin123`

If you keep your existing `pmbok_db` database, you'll need to either:
1. Use your existing admin account, OR
2. Run `node create-admin.js` to create the new admin@cqm.com account

---

## Quick Verification Checklist

After renaming:
- [ ] Folder renamed to `CQM-ProjectManagement`
- [ ] Updated `start-dev.bat` paths
- [ ] Updated `backend/.env` if needed
- [ ] Can start servers with `npm run dev`
- [ ] Can access http://localhost:3000
- [ ] Can log in with admin credentials
- [ ] Title shows "CQM Tracking System"

---

## Troubleshooting

### "Cannot find module" errors
Run `npm run install:all` to reinstall dependencies.

### Database connection errors
Check `backend/.env` has correct `DB_NAME` and credentials.

### Page shows old title
Clear browser cache or hard refresh (Ctrl+Shift+R).
