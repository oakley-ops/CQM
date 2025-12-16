# Windows Setup Guide for PMBOK Backend

## 🔧 Fix the Issues

### Issue 1: Update .env File

Edit `c:\Users\servi\TR_Inventory_PM\pmbok-backend\.env` and update these lines:

```env
# Use the SAME PostgreSQL credentials as your inventory system
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pmbok_db
DB_USER=postgres
DB_PASSWORD=YOUR_ACTUAL_POSTGRES_PASSWORD_HERE

# Change this JWT secret to something random
JWT_SECRET=change_this_to_something_random_and_secure
```

**Important:** Use the same `DB_PASSWORD` that your inventory system uses!

---

### Issue 2: Create Database (Windows Method)

Since `createdb` command doesn't work on Windows, use one of these methods:

#### Method A: Using pgAdmin (Easiest)
1. Open **pgAdmin**
2. Right-click on **Databases**
3. Select **Create** → **Database**
4. Name it: `pmbok_db`
5. Click **Save**

#### Method B: Using psql Command
```powershell
# Open PowerShell and run:
psql -U postgres -c "CREATE DATABASE pmbok_db;"
```

#### Method C: Using SQL Query
```powershell
# Connect to PostgreSQL
psql -U postgres

# Then run this SQL:
CREATE DATABASE pmbok_db;

# Exit
\q
```

---

## ✅ Complete Setup Steps

### Step 1: Install Dependencies (if not done)
```powershell
cd C:\Users\servi\TR_Inventory_PM\pmbok-backend
npm install
```

### Step 2: Update .env File
Edit `.env` file with your PostgreSQL password (see above)

### Step 3: Create Database
Use one of the methods above to create `pmbok_db`

### Step 4: Run Migrations
```powershell
npm run migrate
```

You should see:
```
✅ Connected to database
⏳ Running migration: 001_initial_schema.sql
✅ Completed: 001_initial_schema.sql
🎉 All migrations completed successfully!
```

### Step 5: Start Backend
```powershell
npm run dev
```

You should see:
```
╔═══════════════════════════════════════════════════════╗
║   🚀 PMBOK API Server Running                        ║
║   Environment: development                            ║
║   Port: 5000                                          ║
║   Database: Connected ✅                              ║
╚═══════════════════════════════════════════════════════╝
```

---

## 🔍 Troubleshooting

### Error: "password authentication failed"
**Solution:** Update `DB_PASSWORD` in `.env` file with your actual PostgreSQL password

### Error: "database pmbok_db does not exist"
**Solution:** Create the database using pgAdmin or psql (see methods above)

### Error: "Cannot find module"
**Solution:** Run `npm install` first

### Error: "Port 5000 already in use"
**Solution:** Change `PORT=5001` in `.env` file

---

## 🎯 Quick Commands Reference

```powershell
# Navigate to backend
cd C:\Users\servi\TR_Inventory_PM\pmbok-backend

# Install dependencies
npm install

# Run migrations
npm run migrate

# Start development server
npm run dev

# Check if PostgreSQL is running
Get-Service -Name postgresql*
```

---

## ✅ Verification

After setup, test the API:

```powershell
# Test health endpoint
curl http://localhost:5000/health
```

Should return:
```json
{
  "success": true,
  "message": "PMBOK API is running",
  "timestamp": "2025-11-14T..."
}
```

---

## 📝 What Password to Use?

Use the **SAME password** that works for your inventory system!

Check your inventory backend `.env` file at:
`C:\Users\servi\TR_Inventory_PM\backend\.env`

Look for the `DB_PASSWORD` value and use that same password in the PMBOK `.env` file.

---

**Need Help?** The database credentials should match your existing inventory system since they use the same PostgreSQL server.
