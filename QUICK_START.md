# 🚀 PMBOK Quick Start Guide

## Get Up and Running in 5 Minutes

### Step 1: Install Backend Dependencies
```bash
cd pmbok-backend
npm install
```

### Step 2: Configure Environment
```bash
# Copy environment file
cp .env.example .env

# Edit .env with your PostgreSQL credentials
# Minimum required:
# DB_PASSWORD=your_postgres_password
# JWT_SECRET=change_this_to_random_string
```

### Step 3: Set Up Database
```bash
# Create database (if not exists)
createdb pmbok_db

# Run migrations
npm run migrate
```

### Step 4: Start Backend
```bash
npm run dev
```
✅ Backend running on http://localhost:5000

### Step 5: Install Frontend Dependencies
```bash
# Open new terminal
cd pmbok-frontend
npm install
```

### Step 6: Start Frontend
```bash
npm run dev
```
✅ Frontend running on http://localhost:3000

---

## 🎯 Test It Out

1. **Open browser:** http://localhost:3000
2. **Login with default admin:**
   - Email: `admin@pmbok.com`
   - Password: `admin123`
3. **Create your first project!**

---

## 🐳 Docker Alternative (Even Easier!)

```bash
cd pmbok-backend
docker-compose up -d
```

This starts both PostgreSQL and the backend API automatically!

---

## ⚡ What You Can Do Now

✅ Register new users  
✅ Login/Logout  
✅ Create projects  
✅ View project list  
✅ Update project details  
✅ Delete projects  
✅ Role-based access control  

---

## 📝 Next: Phase 2 Implementation

Ready to add more features? Check out:
- `PMBOK_PROJECT_PLAN.md` - Full implementation roadmap
- `PMBOK_PHASE1_COMPLETE.md` - Detailed Phase 1 documentation

---

**Need Help?** Check the troubleshooting section in `PMBOK_PHASE1_COMPLETE.md`
