# PMBOK Backend API

Enterprise-grade Project Management System following PMBOK standards.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

1. **Install dependencies**
```bash
npm install
```

2. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. **Create PostgreSQL database**
```bash
createdb pmbok_db
```

4. **Run database migrations**
```bash
npm run migrate
```

5. **Start development server**
```bash
npm run dev
```

The API will be available at `http://localhost:5000`

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-password` - Change password

### Projects
- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get single project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

## 🔐 Default Credentials

**Email:** admin@pmbok.com  
**Password:** admin123

⚠️ **Change these credentials immediately in production!**

## 🛠 Development

```bash
# Run in development mode with auto-reload
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## 📁 Project Structure

```
pmbok-backend/
├── config/          # Configuration files
├── controllers/     # Route controllers
├── db/             # Database migrations
├── middleware/     # Custom middleware
├── models/         # Sequelize models
├── routes/         # API routes
├── utils/          # Utility functions
└── server.js       # Entry point
```

## 🔒 Security Features

- JWT authentication
- Password hashing with bcrypt
- Helmet.js security headers
- Rate limiting
- CORS protection
- Input validation

## 📝 Environment Variables

See `.env.example` for all available configuration options.

## 🐛 Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check database credentials in `.env`
- Ensure database exists: `createdb pmbok_db`

### Port Already in Use
- Change PORT in `.env` file
- Or kill the process using port 5000

## 📄 License

MIT
