# 📊 PMBOK Project Management System

An enterprise-grade project management system built following PMBOK (Project Management Body of Knowledge) best practices.

## 🎯 Overview

This is a comprehensive project management application with separate frontend and backend services.

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Installation

1. **Install all dependencies:**
   ```bash
   npm run install:all
   ```

2. **Configure environment:**
   - Edit `backend/.env` with your PostgreSQL credentials
   - Default database: `pmbok_db`

3. **Set up database:**
   ```bash
   npm run migrate
   ```

4. **Create admin user:**
   ```bash
   npm run create-admin
   ```
   - Email: `admin@pmbok.com`
   - Password: `admin123`

5. **Start both servers:**
   ```bash
   npm run dev
   ```

   Or start them separately:
   ```bash
   npm run dev:backend    # Starts backend on port 5000
   npm run dev:frontend   # Starts frontend on port 3000
   ```

### Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Documentation**: http://localhost:5000/api-docs

## 📁 Project Structure

```
PMBOK-ProjectManagement/
├── backend/              # Node.js + Express + Sequelize API
│   ├── config/          # Configuration files
│   ├── controllers/     # Request handlers
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── middleware/      # Custom middleware
│   ├── utils/           # Helper functions
│   ├── db/              # Database migrations
│   └── .env            # Environment variables
│
├── frontend/            # React + Vite + TypeScript UI
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API service layer
│   │   ├── store/       # Redux store
│   │   └── types/       # TypeScript types
│   └── vite.config.ts   # Vite configuration
│
├── package.json         # Root package file
└── README.md           # This file
```

## 🎯 Features

### Core Modules
- ✅ **Project Management** - Create, track, and manage projects
- ✅ **Integration Management** - Project charters, stakeholders, change requests, lessons learned
- ✅ **Schedule Management** - Tasks, milestones, Gantt charts, dependencies
- ✅ **Cost Management** - Budgets, expenses, Earned Value Management (EVM)
- ✅ **Quality Management** - Quality metrics, inspections, defect tracking
- ✅ **Resource Management** - Team members, resource allocation
- ✅ **Communications Management** - Status reports, meeting minutes, communication logs
- ✅ **Risk Management** - Risk register, risk matrix, risk assessment
- ✅ **Scope Management** - Requirements, WBS, contracts, vendors
- ✅ **Document Management** - File uploads, document tracking

### Additional Features
- 📊 **Executive Dashboard** - Real-time project metrics
- 💰 **Quote Tracker** - Manage quotes and convert to projects
- ✅ **Personal Task Management** - Todo lists, weekly plans, training calendar
- 📈 **Reporting & Analytics** - Custom reports, PDF exports, email distribution
- 🔐 **Authentication & Authorization** - JWT-based secure access
- 📄 **API Documentation** - Interactive Swagger/OpenAPI docs

## 🛠️ Development

### Backend Development

```bash
cd backend
npm run dev          # Start with auto-reload
npm run migrate      # Run database migrations
npm test            # Run tests
```

### Frontend Development

```bash
cd frontend
npm run dev         # Start Vite dev server
npm run build       # Build for production
npm run preview     # Preview production build
npm run lint        # Run ESLint
```

### Database Management

```bash
# Create admin user
npm run create-admin

# Seed sample data
npm run seed

# Reset database (caution!)
psql -U postgres -c "DROP DATABASE pmbok_db;"
psql -U postgres -c "CREATE DATABASE pmbok_db;"
npm run migrate
```

## 🔧 Configuration

### Backend Environment Variables

Edit `backend/.env`:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pmbok_db
DB_USER=postgres
DB_PASSWORD=your_password

# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:3000
```

### Frontend Configuration

The frontend proxy is configured in `frontend/vite.config.ts`:

```typescript
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true,
    },
  },
}
```

## 📚 API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:5000/api-docs

## 🧪 Testing

```bash
# Run all tests
npm run test:all

# Backend tests only
npm run test:backend

# Frontend tests only
npm run test:frontend
```

## 🚢 Deployment

### Production Build

```bash
# Build frontend
npm run build:frontend

# The build output will be in frontend/dist/
```

### Environment Setup

1. Set `NODE_ENV=production` in backend/.env
2. Update `CORS_ORIGIN` to your production domain
3. Use a strong `JWT_SECRET`
4. Configure production database credentials

## 📖 Documentation

Additional documentation files:
- `QUICK_START.md` - Quick start guide
- `backend/README.md` - Backend-specific documentation
- `backend/WINDOWS_SETUP.md` - Windows setup instructions

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Write/update tests
4. Submit a pull request

## 📄 License

MIT License

## 🆘 Troubleshooting

### Backend won't start
- Check PostgreSQL is running: `Get-Service postgresql*`
- Verify database credentials in `backend/.env`
- Ensure port 5000 is available

### Frontend won't start
- Ensure backend is running first
- Check port 3000 is available
- Clear node_modules and reinstall: `npm run install:frontend`

### Database connection errors
- Verify PostgreSQL is running
- Check database name and credentials
- Ensure `pmbok_db` database exists

### Port conflicts
- Backend: Change `PORT` in `backend/.env`
- Frontend: Change port in `frontend/vite.config.ts`

## 📞 Support

For issues and questions, please create an issue in the project repository.

---

**Built with ❤️ using React, Node.js, and PostgreSQL**

