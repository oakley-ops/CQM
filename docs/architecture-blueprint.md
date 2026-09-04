# CQM System — Architectural Blueprint

**Card Quality Management (CQM) Tracking System**
**Stack:** Node.js + Express + PostgreSQL (backend) · React 18 + TypeScript + Redux (frontend)
**Date:** April 2026

---

## 1. System Overview

The CQM system is a quality management web application for smart card manufacturing. It captures ISO-compliant test measurements across card types (ICM, CB, ICC, PICC), tracks manufacturing jobs, performs Statistical Process Control (SPC) analysis, manages Kappa/MSA studies, and exports results to Excel, Google Sheets, and PDF.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                    │
│  Browser                                                                │
│  React 18 + TypeScript (Vite, port 3000)                               │
│                                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │  Redux   │  │  React   │  │  Axios   │  │  Zod +  │               │
│  │ Toolkit  │  │  Router  │  │ Services │  │  RHF     │               │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘               │
└────────────────────────────┬────────────────────────────────────────────┘
                             │ HTTP/REST  /api/*
                             │ (Vite proxy → localhost:5000)
┌────────────────────────────▼────────────────────────────────────────────┐
│                         API LAYER                                       │
│  Express 4.18 (port 5000)                                              │
│                                                                         │
│  Middleware stack:                                                      │
│  Helmet → CORS → Rate Limiter → Body Parser → JWT Auth → Routes        │
│                                                                         │
│  30 route modules → 32 controllers                                     │
│  Swagger UI at /api-docs                                               │
└─────────────────┬──────────────────────┬───────────────────────────────┘
                  │                      │
┌─────────────────▼──────┐   ┌──────────▼───────────────────────────────┐
│    SERVICE LAYER       │   │           EXTERNAL SERVICES               │
│  Sequelize ORM (v6)    │   │  ┌──────────────┐  ┌──────────────────┐  │
│  44 model definitions  │   │  │ Google Sheets │  │  Nodemailer/SMTP │  │
│  associations in       │   │  │   (googleapis)│  │   (Email export) │  │
│  models/index.js       │   │  └──────────────┘  └──────────────────┘  │
└─────────────────┬──────┘   │  ┌──────────────┐  ┌──────────────────┐  │
                  │           │  │ Anthropic SDK │  │   Puppeteer PDF  │  │
┌─────────────────▼──────┐   │  │  (RAG/Claude) │  │   (PDF reports)  │  │
│     DATA LAYER         │   │  └──────────────┘  └──────────────────┘  │
│  PostgreSQL (port 5432)│   └──────────────────────────────────────────┘
│  Redis (token store,   │
│  rate limiter)         │
└────────────────────────┘
```

---

## 2. Backend Architecture

### 2.1 Request Lifecycle

```
Incoming HTTP Request
        │
        ▼
  ┌───────────┐
  │  Helmet   │  Security headers (XSS, HSTS, etc.)
  └─────┬─────┘
        ▼
  ┌───────────┐
  │   CORS    │  Whitelist: localhost:3000/3007/3002 + env override
  └─────┬─────┘
        ▼
  ┌─────────────────┐
  │  Rate Limiter   │  General: 2000/15min
  │                 │  Auth:    Strict brute-force protection
  │                 │  Export:  Separate limit
  └─────┬───────────┘
        ▼
  ┌─────────────────┐
  │  Body Parser    │  JSON + urlencoded, 15MB limit (for base64 images)
  └─────┬───────────┘
        ▼
  ┌─────────────────┐
  │  JWT Auth MW    │  Validate Bearer token → attach req.user
  │  (middleware/   │  Token blocklist checked via Redis
  │   auth.js)      │
  └─────┬───────────┘
        ▼
  ┌─────────────────┐
  │  Route Handler  │  express-validator input validation + Swagger docs
  └─────┬───────────┘
        ▼
  ┌─────────────────┐
  │   Controller    │  Business logic, error handling
  └─────┬───────────┘
        ▼
  ┌─────────────────┐
  │ Sequelize Model │  ORM query → PostgreSQL
  └─────┬───────────┘
        ▼
  ┌─────────────────┐
  │  JSON Response  │  { data, meta, error }
  └─────────────────┘
```

### 2.2 Route Modules (30 total)

```
/api
 ├── CQM CORE
 │    ├── /test-categories      testCategoryController    Test specs by card type
 │    ├── /test-sessions        testSessionController     Batch test sessions
 │    ├── /test-entries         testEntryController       Measurement records
 │    ├── /sample-cards         sampleCardController      Sample card tracking
 │    ├── /punch-tools          punchToolController       Tooling maintenance
 │    ├── /kappa-studies         kappaController           MSA/Kappa studies
 │    ├── /jobs                 jobController             Manufacturing jobs
 │    └── /adhesion-log         adhesionLogController     Adhesion log entries
 │
 ├── AUTH & USERS
 │    └── /auth                 authController            Login, register, refresh
 │
 ├── REPORTING & EXPORT
 │    ├── /dashboard            dashboardController       KPI aggregations
 │    ├── /reports              reportingController       Report generation
 │    ├── /export               exportController          Google Sheets export
 │    └── /excel-export         excelExportController     Direct Excel download
 │
 ├── KNOWLEDGE BASE
 │    └── /rag                  ragController             RAG documents + Claude AI
 │
 ├── QUOTE TRACKER
 │    ├── /quotes               quoteController
 │    ├── /clients              clientController
 │    └── /quote-milestones     quoteMilestoneController
 │
 ├── PROJECT MANAGEMENT (Legacy/Enterprise)
 │    ├── /budgets, /expenses, /evm
 │    ├── /inspections, /defects
 │    ├── /resources
 │    ├── /communications
 │    ├── /scope, /stakeholders, /lessons-learned
 │    └── /personal-tasks
 │
 └── UTILITIES
      ├── /email                emailController
      ├── /launch               launchController          Desktop app support
      └── /health               Healthcheck endpoint
```

### 2.3 Database Model Hierarchy

```
CORE CQM DOMAIN
═══════════════

TestCategory
 ├── card_type: ICM | CB | ICC | PICC
 └── [has many] TestDefinition
                 ├── test_id (e.g. 3001, 3003, 3044)
                 ├── name, unit, spec_min, spec_max
                 └── [has many] TestSession
                                 ├── session_type: incoming | in-process | final | periodic
                                 ├── sample_size, monitoring_frequency
                                 ├── job_number → Job
                                 └── [has many] TestEntry
                                                 ├── measurement_value
                                                 ├── pass/fail status
                                                 └── [has one] TestEntryMetadata
                                                              (pdf_pages, secondary_measurement)

Job
 ├── job_number (unique)
 ├── card_type, quantity, status
 └── [has many] TestSession

SampleCard
 └── linked to TestSession

PunchTool
 └── tool tracking with maintenance dates

KappaStudy
 ├── study setup (n raters, n items)
 └── [has many] KappaRating → computed Cohen's Kappa

AdhesionLog
 └── standalone adhesion measurement log

QUOTE TRACKER DOMAIN
════════════════════

Client ──< Quote ──< QuoteMilestone ──< QuoteMilestoneTracking
              └──< QuoteAction
              └──< QuoteDocument
              └──< QuoteActivityLog

ENTERPRISE / LEGACY DOMAIN
═══════════════════════════

User ──< Project ──< Task, Milestone, Risk, ChangeRequest
                └──< Stakeholder, Budget, Expense
                └──< Requirement, WBSItem, Vendor, Contract
                └──< QualityInspection, Defect
                └──< StatusReport, MeetingMinute, CommunicationLog
                └──< LessonLearned, ResourceAllocation, TeamMember
```

### 2.4 Utility Services

| Service | Purpose | Tech |
|---|---|---|
| `spcEngine.js` | SPC rules, Cpk, Cp calculations | Custom JS |
| `pdfGenerator.js` | Report PDF rendering | Puppeteer |
| `googleSheetsService.js` | Export to Google Sheets | googleapis |
| `emailService.js` | Send report emails | Nodemailer |
| `ragController.js` / Claude | Knowledge base Q&A | @anthropic-ai/sdk |
| `logger.js` | Structured logging | Winston |
| `auditLogger.js` | Audit trail | Winston |
| `tokenBlocklist.js` | JWT revocation | ioredis |
| `redisClient.js` | Session/cache store | ioredis |

---

## 3. Frontend Architecture

### 3.1 Application Layer Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    App.tsx  (React Router v6)                   │
│                                                                 │
│  /                   CQMDashboard      (main landing)          │
│  /quality-test       QualityTestDataEntry                       │
│  /quality-test/      TestEntryPage     (per-test form)         │
│    session/:id                                                  │
│    /test/:defId                                                 │
│  /sessions           SessionHistory                            │
│  /session/:id        SessionDetail                             │
│  /kpis               KPIPage                                   │
│  /jobs               JobList → JobDetail                       │
│  /adhesion-log       AdhesionLogPage                           │
│  /knowledge-base     KnowledgeBase     (RAG chat)              │
│  /kappa              KappaStudyList → Detail → Create          │
│  Legacy: /projects, /quotes, /milestones, /clients, /my-tasks  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 State Management (Redux Toolkit)

```
store.ts
 ├── auth            authSlice          User, token, roles
 ├── cqm/dashboard   dashboardSlice     KPIs, chart data
 ├── cqm/testEntry   testEntrySlice     Selected category/definition/session
 ├── cqm/jobs        jobSlice           Job list/detail
 ├── project         projectSlice       Project list/detail (legacy)
 ├── cost            costSlice          Budget, expense, EVM
 ├── quality         qualitySlice       Defect, inspection, metric
 ├── integration     integrationSlice   Charter, ChangeRequest, LessonLearned
 ├── schedule        scheduleSlice      Task, Milestone, Gantt
 ├── resource        resourceSlice      Resource allocation
 ├── risk            riskSlice          Risk register
 └── rag             ragSlice           Document store
```

### 3.3 Data Flow — Test Entry

```
User opens QualityTestDataEntry
         │
         ▼
  CategorySelector component
  → dispatches fetchTestCategories()
  → testEntryService.getTestCategories() → GET /api/test-categories
  → stored in testEntrySlice.categories
         │
         ▼
  User picks CardType + TestDefinition
  → dispatches setSelectedDefinition()
         │
         ▼
  User creates/selects TestSession
  → testEntryService.createSession() → POST /api/test-sessions
         │
         ▼
  TestEntryPage renders SPECIALIZED FORM
  (determined by test_id mapping)
  ┌──────────────────────────────────────┐
  │  test_id → Form Component            │
  │  3001 → PeelStrengthForm             │
  │  3003 → CornerImpactForm             │
  │  3005 → CoreLayerPeelForm            │
  │  3044 → TempHumidityExposureForm     │
  │  3048 → UseConditionsForm            │
  │  3050 → ESDConductivityForm          │
  │  2515 → SoftwareLoadForm             │
  │  ... (26 specialized forms total)    │
  └──────────────────────────────────────┘
         │
         ▼
  react-hook-form + Zod validation
  → testEntryService.saveEntries() → POST /api/test-entries
         │
         ▼
  SPC Charts rendered (IMRChart, CapabilityPanel)
  via recharts + spcEngine calculations
```

### 3.4 Component Architecture

```
Layout.tsx  (navigation shell)
 └── Page Components
      ├── CQMDashboard
      │    ├── StatsCard (x4 KPI widgets)
      │    ├── BarChart / TrendChart
      │    ├── CategoryTestSummary
      │    └── RecentEntriesList
      │
      ├── QualityTestDataEntry
      │    ├── CategorySelector
      │    ├── TestSearchBar
      │    └── TestEntryDialog
      │
      ├── TestEntryPage
      │    ├── [Specialized Form Component]  ← 26 variants
      │    │    (react-hook-form + Zod)
      │    └── SPC/
      │         ├── IMRChart
      │         ├── CapabilityPanel
      │         ├── CapabilityHistogram
      │         ├── SpecLimitEditor
      │         └── RunRuleAlerts
      │
      ├── KPIPage
      │    └── KpiConfig + chart widgets
      │
      ├── KappaStudyDetail
      │    └── KappaGauge + rating tables
      │
      └── SessionHistory / SessionDetail
           └── FilterPanel + data tables
```

### 3.5 API Service Layer

```
frontend/src/services/
 ├── api.ts                  Axios base (baseURL=/api, auth interceptor)
 │
 ├── cqm/
 │    ├── testEntryService.ts    categories, definitions, sessions, entries, SPC metrics
 │    ├── dashboardService.ts    KPI aggregations
 │    ├── jobService.ts          CRUD jobs
 │    ├── adhesionLogService.ts  Adhesion log
 │    ├── kappaService.ts        MSA study operations
 │    └── punchToolService.ts    Punch tool tracking
 │
 ├── authService.ts          Login, register, token refresh, logout
 ├── ragService.ts           RAG document management
 ├── quote/quoteService.ts   Quote CRUD
 ├── cost/                   Budget, Expense, EVM
 ├── quality/                Defect, Inspection, Metric
 ├── risk/riskService.ts     Risk register
 ├── schedule/               Task, Milestone
 ├── resource/               Resource allocation
 ├── integration/            Charter, ChangeRequest, LessonLearned
 └── reporting/              Report generation
```

---

## 4. Database Schema

### 4.1 CQM Core Tables

```
test_categories
 id | card_type | name | description | created_at | updated_at

test_definitions
 id | category_id (FK) | test_id | name | description | unit
    | spec_min | spec_max | is_active

test_sessions
 id | definition_id (FK) | job_id (FK) | session_type
    | sample_size | monitoring_frequency | status
    | operator | notes | created_at | updated_at

test_entries
 id | session_id (FK) | sample_number | measurement_value
    | pass_fail | operator | notes | created_at | updated_at

test_entry_metadata
 id | entry_id (FK) | pdf_pages | secondary_measurement
    | additional_data (JSONB)

jobs
 id | job_number (UNIQUE) | card_type | quantity | status
    | customer | created_at | updated_at

sample_cards
 id | session_id (FK) | card_identifier | notes

punch_tools
 id | tool_id | description | last_maintenance | next_maintenance

kappa_studies
 id | name | rater_count | item_count | notes | created_at

kappa_ratings
 id | study_id (FK) | rater | item | rating

kpi_configs
 id | kpi_key | kpi_name | description | target_value | warning_threshold | unit | higher_is_better | is_active

adhesion_log
 id | job_number | card_type | measurement | unit | operator
    | pass_fail | notes | created_at
```

### 4.2 Migration Strategy

Migrations are plain SQL files in `backend/db/migrations/` numbered sequentially (004–041+). The migration runner (`backend/db/migrate.js`) tracks applied migrations in a `migrations` table.

```
004  Session job fields
005  Card type → test categories
...
020  Jobs table
...
031  Rename IT-PHY-003 → #3005
032  Rename IT-MCH-001 → #3055
033  Rename IT-MCH-005 → #3054
034  Insert 3044 Temp/Humidity
035  Insert 3045 Resistance to Heat
036  Insert 3050 ESD Conductivity
037  Insert 2515 Software Load
038  Insert 3048 Use Conditions
039  Remove IT-PHY-005 Opacity
040  Adhesion log table
041  Remove 3015 Overlay Peel
```

---

## 5. Security Architecture

```
┌──────────────────────────────────────────────────┐
│  Transport Security                              │
│  HTTPS in production (reverse proxy)            │
│  Helmet headers (XSS, HSTS, Content-Type)       │
└──────────────────────────────────────────────────┘
                         │
┌──────────────────────────────────────────────────┐
│  Authentication                                  │
│  JWT (jsonwebtoken)                              │
│  bcryptjs password hashing                       │
│  Redis token blocklist (logout/revocation)       │
│  Rate limiting on /api/auth (brute-force)        │
└──────────────────────────────────────────────────┘
                         │
┌──────────────────────────────────────────────────┐
│  Authorization                                   │
│  Role-based: admin | manager | technician        │
│  JWT middleware attaches req.user to all routes  │
│  Controller-level role checks                    │
└──────────────────────────────────────────────────┘
                         │
┌──────────────────────────────────────────────────┐
│  Input Validation                                │
│  express-validator on all write routes           │
│  Zod schemas on all frontend forms               │
│  Body size limit 15MB                            │
│  XSS sanitization middleware                     │
└──────────────────────────────────────────────────┘
                         │
┌──────────────────────────────────────────────────┐
│  Rate Limiting                                   │
│  General: 2000 req / 15 min per IP               │
│  Auth endpoints: strict (configurable)           │
│  Export endpoints: separate limit                │
└──────────────────────────────────────────────────┘
```

---

## 6. Integration Architecture

```
                    ┌──────────────────────┐
                    │    CQM Application   │
                    └───────┬──────────────┘
                            │
          ┌─────────────────┼─────────────────────┐
          │                 │                     │
          ▼                 ▼                     ▼
  ┌──────────────┐  ┌──────────────┐   ┌──────────────────┐
  │ Google Sheets│  │   Email      │   │    Claude AI     │
  │   Export     │  │  (SMTP/      │   │  (RAG Knowledge  │
  │              │  │  Nodemailer) │   │   Base Q&A)      │
  │ googleapis   │  │              │   │ @anthropic-ai/sdk│
  │ OAuth 2.0    │  │ report PDFs  │   │ + vectra vector  │
  └──────────────┘  └──────────────┘   │   store          │
                                        │ + voyageai embed │
                                        └──────────────────┘
          │
          ▼
  ┌──────────────┐
  │ Excel Export │
  │  (exceljs)   │
  │ Direct XLSX  │
  │  download    │
  └──────────────┘
          │
          ▼
  ┌──────────────┐
  │  PDF Reports │
  │ (Puppeteer)  │
  │  Headless    │
  │  Chromium    │
  └──────────────┘
```

---

## 7. Deployment Architecture

```
┌──────────────────────────────────────────────────────┐
│  Development (local)                                │
│                                                     │
│  npm run dev                                        │
│   ├── backend: nodemon → port 5000                  │
│   └── frontend: Vite dev server → port 3000         │
│        └── /api/* proxied → localhost:5000          │
│                                                     │
│  PostgreSQL: localhost:5432 / cqm_db                │
│  Redis: localhost:6379                              │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  Production (recommended)                           │
│                                                     │
│  Reverse Proxy (Nginx/Caddy)                        │
│   ├── HTTPS termination                             │
│   ├── / → static frontend build (dist/)            │
│   └── /api/* → Express backend (port 5000)         │
│                                                     │
│  PostgreSQL (managed or self-hosted)                │
│  Redis (managed or self-hosted)                     │
│  Environment vars via .env                          │
└──────────────────────────────────────────────────────┘
```

---

## 8. Key Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| ORM | Sequelize | Mature, PostgreSQL-native, migration support |
| State management | Redux Toolkit | Predictable state for complex test entry flows |
| Form validation | react-hook-form + Zod | Type-safe, performant, composable |
| Migrations | Raw SQL files | Explicit control, database-independent logic |
| Auth | JWT + Redis blocklist | Stateless tokens with revocation capability |
| PDF generation | Puppeteer | Full CSS rendering for complex reports |
| AI integration | Anthropic SDK + vectra | Local vector store, no external vector DB dependency |
| Specialised forms | 26 per-test components | Each test type has unique measurement fields and validation rules |
| SPC | Custom spcEngine.js | Domain-specific rules (Western Electric, Nelson) |

---

## 9. Test Coverage Map

| Domain | Route | Controller | Model | Frontend Form |
|---|---|---|---|---|
| Test Entry | testEntries.js | testEntryController.js | TestEntry.js | 26 form components |
| Sessions | testSessions.js | testSessionController.js | TestSession.js | QualityTestDataEntry |
| Categories | testCategories.js | testCategoryController.js | TestCategory.js | CategorySelector |
| Jobs | jobs.js | jobController.js | Job.js | JobList/Detail |
| MSA/Kappa | kappa.js | kappaController.js | KappaStudy.js | KappaStudyDetail |
| Adhesion | adhesionLog.js | adhesionLogController.js | AdhesionLog.js | AdhesionLogForm |
| SPC | (inline in testEntry) | — | — | IMRChart, CapabilityPanel |
| Reporting | reports.js, export.js | reportingController.js | — | ExportButton |

---

## 10. Identified Architecture Notes

1. **Legacy enterprise models** (`Project`, `Task`, `Risk`, `Milestone`, etc.) in `models/index.js` are real, independent models — not aliases for CQM concepts. They are used by the project-management scaffolding that predates the CQM pivot. Do not conflate them with CQM manufacturing concepts (e.g. `Project` is not a manufacturing facility, `Milestone` is not an audit).

2. **26 specialized test forms** are dispatched by `test_id` in `TestEntryPage` — any new test definition requires both a migration (to insert the `test_definitions` row) and a new form component.

3. **SPC calculations** are performed backend-side in `spcEngine.js` and returned as pre-computed metrics; the frontend charts (`recharts`) are purely presentational.

4. **Redis** serves two purposes: JWT token blocklist (logout/revoke) and rate limiter state across restarts. It is a required dependency in production.

5. **Body size limit of 15MB** is set specifically to support `OverlayPeelForm` which embeds base64-encoded image data in test entry payloads.

6. **vectra** (local vector store) is used for RAG — no external vector database is needed. Documents are embedded via `voyageai` and queried by `ragController.js`, which then passes context to the Anthropic Claude API.
