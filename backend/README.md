# Card Quality Hub — Backend API

Backend API for the **Card Quality Management (CQM)** system — an internal quality-control platform for smart-card / EMV payment-card manufacturing. It captures and analyzes physical, mechanical, and electrical test data on card samples, and manages the surrounding quality, qualification, and quoting workflows.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm
- (Optional) Redis — used only for the JWT token blocklist; the app degrades gracefully without it

### Installation

1. **Install dependencies**
```bash
npm install
```

2. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your database credentials and API keys
```

3. **Create the PostgreSQL database**
```bash
createdb cqm_db
```

4. **Run database migrations**
```bash
npm run migrate
```

5. **Seed reference data and an admin user**
```bash
npm run seed-cqm     # test categories + test definitions
node create-admin.js # creates the default admin user
```

6. **Start the development server**
```bash
npm run dev
```

The API will be available at `http://localhost:5000`.
In development, interactive API docs (Swagger) are served at `http://localhost:5000/api-docs`.

## 📚 API Modules

The API is organized into the following route groups (all under `/api`):

### Core
- `/api/auth` — authentication (login, register, current user, profile, password)
- `/api/dashboard` — dashboard metrics
- `/api/email` — outbound email
- `/api/export` — Google Sheets export
- `/api/excel-export` — direct Excel (.xlsx) download

### Quality Test Entry
- `/api/test-categories` — test category definitions
- `/api/test-sessions` — test sessions
- `/api/test-entries` — individual measurements
- `/api/sample-cards` — card samples under test
- `/api/punch-tools` — punch tooling
- `/api/kappa-studies` — Kappa / MSA (attribute agreement) studies
- `/api/jobs` — production jobs
- `/api/adhesion-log` — adhesion test log

### Quote Tracker
- `/api/quotes` — quotes
- `/api/clients` — clients
- `/api/quote-milestones` — quote milestones

### Productivity & Knowledge
- `/api/personal-tasks` — personal task management
- `/api/launch` — desktop app launch helpers
- `/api/rag` — RAG knowledge base (document Q&A)

### NEXUS Qualification Hub
- `/api/nexus` — audits, QMS assessments, product scope, CAPA, conformity, components, documents, and the compliance watchdog/alerts

### Autodata
- `/api/autodata` — automated data ingestion pipeline

## 🔐 Default Admin User

Run `node create-admin.js` to create the initial admin account. The script provisions a user with email `admin@cqm.com`; the default password is defined in the script itself.

⚠️ **Change the default password immediately after first login, and never use it in production.**

By default, public self-registration is disabled (`ALLOW_PUBLIC_REGISTRATION=false`) and accounts are admin-provisioned.

## 🛠 Development

```bash
# Run in development mode with auto-reload (nodemon)
npm run dev

# Run tests with coverage
npm test

# Run tests in watch mode
npm run test:watch
```

### Seed scripts
```bash
npm run seed-cqm            # test categories + test definitions
npm run seed-test-categories
npm run seed-test-definitions
npm run seed-icc            # ICC tests
npm run seed-internal       # internal tests
```

## 📁 Project Structure

```
backend/
├── config/          # Database, Swagger, and app constants
├── controllers/     # Route controllers (incl. nexus/ subcontrollers)
├── db/              # Migrations and migration runner
├── middleware/      # Auth, validation, rate limiting, error handling
├── models/          # Sequelize models
├── routes/          # API route definitions
├── utils/           # Logger, email service, Redis client, helpers
└── server.js        # Entry point
```

## 🧰 Tech Stack

- **Express** — HTTP API
- **PostgreSQL** with **Sequelize** (models) plus raw SQL migrations
- **JWT** authentication (`jsonwebtoken`), passwords hashed with **bcryptjs**
- **Redis** (`ioredis`) — optional JWT token blocklist
- **ExcelJS** / **pdf-lib** / **pdf-parse** — exports and PDF handling
- **Groq** (LLM) + **Voyage AI** (embeddings) + **Vectra** — RAG and AI insights
- **Nodemailer** — email; **Socket.IO** — realtime; **Winston** — logging
- **Swagger** (`swagger-jsdoc` / `swagger-ui-express`) — API docs in development

## 🔒 Security Features

- JWT authentication with optional Redis-backed token blocklist
- Password hashing with bcrypt
- Helmet.js security headers
- Configurable CORS allow-list (LAN/production origins always allowed)
- Rate limiting (strict on auth and export routes)
- Input sanitization and validation
- Error-detail stripping on 5xx responses in production

## 📝 Environment Variables

See `.env.example` for the full list. Key variables:

- `NODE_ENV`, `PORT` — server config
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` — PostgreSQL
- `JWT_SECRET`, `JWT_EXPIRE` — auth tokens
- `ALLOW_PUBLIC_REGISTRATION` — open self-signup toggle (default `false`)
- `GROQ_API_KEY`, `VOYAGE_API_KEY` — AI providers (NEXUS insights, RAG, autodata)
- `CORS_ORIGIN` — allowed frontend origin
- `EMAIL_USER`, `EMAIL_PASSWORD` — Gmail credentials for outbound email
- `REDIS_URL` / `REDIS_HOST` / `REDIS_PORT` — optional Redis

## 🐛 Troubleshooting

### Database connection issues
- Verify PostgreSQL is running
- Check credentials in `.env`
- Ensure the database exists: `createdb cqm_db`

### Port already in use
- Change `PORT` in `.env`, or free port 5000:
```bash
npx kill-port 5000   # then save a file to trigger a nodemon restart
```

## 📄 License

MIT
