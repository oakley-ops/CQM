# 🚀 CQM Transformation Quick Start Guide

**Get started transforming your PMBOK app into a CQM tracking system**

---

## 📋 Before You Begin

### Prerequisites Checklist
- [ ] Read `CQM_TRANSFORMATION_GAMEPLAN.md` (overview)
- [ ] Review `CQM_DATABASE_SCHEMA.md` (technical details)
- [ ] Backup your current database
- [ ] Ensure development environment is working
- [ ] Have access to git for version control

### Recommended Resources to Obtain
- [ ] CQM Requirements Document V2.22 (from Smart Consulting)
- [ ] ISO 7810 standard documentation
- [ ] ISO 7816 standard documentation (all parts)
- [ ] ISO 10373 test methods
- [ ] EMVCo specifications

---

## 🎯 WEEK 1: IMMEDIATE ACTIONS

### Day 1: Setup & Planning (2-3 hours)

#### 1. Create Development Branch
```bash
# Navigate to your project
cd C:\Users\Fiser\PMBOK-ProjectManagement

# Ensure you're on main branch with no uncommitted changes
git status
git add .
git commit -m "Pre-CQM transformation checkpoint"

# Create new branch for CQM work
git checkout -b cqm-transformation

# Push branch to remote (if applicable)
git push -u origin cqm-transformation
```

#### 2. Backup Current Database
```bash
# Navigate to backend
cd backend

# Create backups folder
mkdir backups

# Backup database (adjust credentials as needed)
pg_dump -U postgres -d pmbok_db > backups/pmbok_backup_before_cqm.sql

# Verify backup was created
dir backups
```

#### 3. Create CQM Test Database
```bash
# Create new test database for CQM
psql -U postgres -c "CREATE DATABASE cqm_tracking_test;"

# Restore backup to test database
psql -U postgres -d cqm_tracking_test < backups/pmbok_backup_before_cqm.sql

# Test connection
psql -U postgres -d cqm_tracking_test -c "SELECT COUNT(*) FROM projects;"
```

---

### Day 2: Initial Rebranding (3-4 hours)

#### 1. Update Package Names

**backend/package.json:**
```json
{
  "name": "cqm-backend",
  "version": "1.0.0",
  "description": "Card Quality Management (CQM) Tracking System - Backend API",
  "keywords": [
    "cqm",
    "card-quality-management",
    "smart-card",
    "iso-compliance",
    "quality-management"
  ]
}
```

**frontend/package.json:**
```json
{
  "name": "cqm-frontend",
  "version": "1.0.0",
  "description": "Card Quality Management (CQM) Tracking System - Frontend"
}
```

**package.json (root):**
```json
{
  "name": "cqm-tracking-system",
  "version": "1.0.0",
  "description": "Card Quality Management System for Smart Card Manufacturing"
}
```

#### 2. Update Startup Scripts

**start-dev.bat:**
```batch
@echo off
echo ========================================
echo   CQM Tracking System
echo   Starting Development Servers
echo ========================================
echo.

echo Starting Backend Server (Port 5000)...
start "CQM Backend" cmd /k "cd backend && npm run dev"

timeout /t 3 /nobreak > nul

echo Starting Frontend Server (Port 3000)...
start "CQM Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo   Servers Starting...
echo ========================================
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:3000
echo   API Docs: http://localhost:5000/api-docs
echo ========================================
```

**setup.bat:**
```batch
@echo off
echo ========================================
echo   CQM Tracking System
echo   Initial Setup
echo ========================================
echo.

echo Step 1: Installing root dependencies...
call npm install
echo.

echo Step 2: Installing backend dependencies...
cd backend
call npm install
cd ..
echo.

echo Step 3: Installing frontend dependencies...
cd frontend
call npm install
cd ..
echo.

echo Step 4: Running database migrations...
cd backend
call npm run migrate
cd ..
echo.

echo Step 5: Creating admin user...
cd backend
call node create-admin.js
cd ..
echo.

echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Login credentials:
echo   Email: admin@cqm.com
echo   Password: admin123
echo.
echo To start the application:
echo   Run: start-dev.bat
echo.
echo Or visit: http://localhost:3000
echo ========================================
pause
```

#### 3. Update Environment Variables

**backend/.env:**
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cqm_tracking_test
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

# Application
APP_NAME=CQM Tracking System
APP_VERSION=1.0.0
```

#### 4. Commit Initial Changes
```bash
git add .
git commit -m "Initial rebranding: Update app name from PMBOK to CQM"
```

---

### Day 3: Database Planning (4-5 hours)

#### 1. Create Migrations Folder Structure
```bash
cd backend
mkdir -p db/migrations/cqm
```

#### 2. Create First Migration: Rename Tables

**db/migrations/cqm/001_rename_core_tables.sql:**
```sql
-- CQM Transformation Migration 001: Rename Core Tables
-- Description: Rename PMBOK tables to CQM equivalents
-- Date: 2025-12-16

BEGIN;

-- Rename core tables
ALTER TABLE IF EXISTS projects RENAME TO manufacturing_facilities;
ALTER TABLE IF EXISTS tasks RENAME TO test_results;
ALTER TABLE IF EXISTS milestones RENAME TO audits;
ALTER TABLE IF EXISTS risks RENAME TO non_conformities;
ALTER TABLE IF EXISTS change_requests RENAME TO capa_actions;
ALTER TABLE IF EXISTS project_documents RENAME TO qms_documents;
ALTER TABLE IF EXISTS quality_metrics RENAME TO iso_compliance_records;

-- Rename indexes (if they exist)
ALTER INDEX IF EXISTS idx_projects_status RENAME TO idx_facilities_status;
ALTER INDEX IF EXISTS idx_tasks_project RENAME TO idx_test_results_facility;
ALTER INDEX IF EXISTS idx_milestones_project RENAME TO idx_audits_facility;
ALTER INDEX IF EXISTS idx_risks_project RENAME TO idx_nc_facility;

-- Rename constraints (adjust based on your actual constraint names)
-- ALTER TABLE manufacturing_facilities RENAME CONSTRAINT projects_pkey TO manufacturing_facilities_pkey;

COMMIT;
```

#### 3. Create Second Migration: Add CQM Fields

**db/migrations/cqm/002_add_facility_cqm_fields.sql:**
```sql
-- CQM Transformation Migration 002: Add Facility CQM Fields
-- Description: Add CQM-specific fields to manufacturing_facilities
-- Date: 2025-12-16

BEGIN;

-- Add location information
ALTER TABLE manufacturing_facilities 
ADD COLUMN IF NOT EXISTS country_code CHAR(2),
ADD COLUMN IF NOT EXISTS location_code VARCHAR(2),
ADD COLUMN IF NOT EXISTS technology_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS manufacturing_capabilities TEXT[];

-- Add CQM label fields
ALTER TABLE manufacturing_facilities
ADD COLUMN IF NOT EXISTS cqm_label VARCHAR(11) UNIQUE,
ADD COLUMN IF NOT EXISTS label_country_code CHAR(2),
ADD COLUMN IF NOT EXISTS label_location_code VARCHAR(2),
ADD COLUMN IF NOT EXISTS label_technology VARCHAR(4),
ADD COLUMN IF NOT EXISTS label_status CHAR(1);

-- Add certification fields
ALTER TABLE manufacturing_facilities
ADD COLUMN IF NOT EXISTS certification_status VARCHAR(50) DEFAULT 'Not Certified',
ADD COLUMN IF NOT EXISTS certificate_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS certificate_issue_date DATE,
ADD COLUMN IF NOT EXISTS certificate_expiry_date DATE,
ADD COLUMN IF NOT EXISTS last_audit_date DATE,
ADD COLUMN IF NOT EXISTS next_audit_due_date DATE;

-- Add Letter of Approval fields
ALTER TABLE manufacturing_facilities
ADD COLUMN IF NOT EXISTS loa_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS loa_reference_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS loa_issue_date DATE;

-- Add contact information
ALTER TABLE manufacturing_facilities
ADD COLUMN IF NOT EXISTS facility_manager_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS quality_manager_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS quality_manager_email VARCHAR(255);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_facilities_country ON manufacturing_facilities(country_code);
CREATE INDEX IF NOT EXISTS idx_facilities_tech ON manufacturing_facilities(technology_type);
CREATE INDEX IF NOT EXISTS idx_facilities_cqm_label ON manufacturing_facilities(cqm_label);
CREATE INDEX IF NOT EXISTS idx_facilities_expiry ON manufacturing_facilities(certificate_expiry_date);

-- Add check constraints
ALTER TABLE manufacturing_facilities
ADD CONSTRAINT IF NOT EXISTS valid_technology CHECK (
    technology_type IN ('Contact', 'Dual', 'Contactless') OR technology_type IS NULL
);

ALTER TABLE manufacturing_facilities
ADD CONSTRAINT IF NOT EXISTS valid_cert_status CHECK (
    certification_status IN ('Not Certified', 'In Process', 'Certified', 'Suspended', 'Expired')
);

COMMIT;
```

#### 4. Create Migration Runner Script

**db/migrations/cqm/run-cqm-migrations.js:**
```javascript
const { Client } = require('pg');
require('dotenv').config();

const migrations = [
    '001_rename_core_tables.sql',
    '002_add_facility_cqm_fields.sql',
    // Add more as you create them
];

async function runMigrations() {
    const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    });

    try {
        await client.connect();
        console.log('🔌 Connected to database');

        for (const migration of migrations) {
            console.log(`\n📄 Running migration: ${migration}`);
            const fs = require('fs');
            const path = require('path');
            const sql = fs.readFileSync(
                path.join(__dirname, migration),
                'utf8'
            );
            
            await client.query(sql);
            console.log(`✅ Completed: ${migration}`);
        }

        console.log('\n🎉 All migrations completed successfully!');
    } catch (error) {
        console.error('❌ Migration error:', error);
        throw error;
    } finally {
        await client.end();
    }
}

runMigrations();
```

---

### Day 4-5: Test Definition Planning (6-8 hours)

#### 1. Create Test Categories Seed Data

**backend/seed-data/test-categories.json:**
```json
[
    {
        "category_name": "Physical Tests (ISO 7810)",
        "category_code": "PHY",
        "primary_iso_standard": "ISO 7810",
        "description": "Physical characteristics and durability tests",
        "subcategories": [
            "Toxicity Testing",
            "Chemical Resistance",
            "Durability Testing",
            "Delamination/Solidity",
            "Dimensional Stability",
            "Warpage Testing",
            "Surface Distortions"
        ]
    },
    {
        "category_name": "Smart Card Tests (ISO 7816-1)",
        "category_code": "SMC",
        "primary_iso_standard": "ISO 7816-1",
        "description": "Smart card specific physical tests",
        "subcategories": [
            "UV Light Exposure",
            "X-ray Exposure",
            "Contact Surface Profile",
            "Temperature Testing",
            "Humidity Testing",
            "Static Discharge"
        ]
    },
    {
        "category_name": "EMV Chip Functionality",
        "category_code": "EMV",
        "primary_iso_standard": "EMVCo",
        "description": "EMV chip functionality and interoperability",
        "subcategories": [
            "Chip Functionality Verification",
            "EMV Interoperability Testing",
            "Electrical Interface Testing",
            "Communication Protocols"
        ]
    },
    {
        "category_name": "Magnetic Stripe Tests",
        "category_code": "MAG",
        "primary_iso_standard": "ISO 7811",
        "description": "Magnetic stripe encoding and quality",
        "subcategories": [
            "Encoding Quality",
            "Track Data Integrity",
            "Read Reliability",
            "Coercivity Testing"
        ]
    }
]
```

#### 2. Create Sample Test Definitions

**backend/seed-data/sample-test-definitions.json:**
```json
[
    {
        "test_code": "PHY-TOX-001",
        "test_name": "Toxicity Testing",
        "test_short_name": "Toxicity Test",
        "category_code": "PHY",
        "test_type": "Physical",
        "iso_standard": "ISO 7810",
        "iso_section": "5.1",
        "test_objective": "Verify card materials are non-toxic and safe for handling",
        "test_procedure": "Extract card materials and test against ISO toxicity standards using approved chemical analysis methods",
        "acceptance_criteria": "No toxic substances detected above permitted limits",
        "measurement_unit": "Pass/Fail",
        "criticality": "Critical",
        "is_mandatory": true
    },
    {
        "test_code": "PHY-CHEM-001",
        "test_name": "Chemical Resistance - Acids",
        "test_short_name": "Acid Resistance",
        "category_code": "PHY",
        "test_type": "Physical",
        "iso_standard": "ISO 7810",
        "iso_section": "5.2.1",
        "test_objective": "Verify card resistance to acidic substances",
        "test_procedure": "Expose card sample to specified acidic solution for required duration, then inspect for damage",
        "acceptance_criteria": "No visible damage, discoloration, or delamination",
        "measurement_unit": "Pass/Fail",
        "test_duration_minutes": 60,
        "criticality": "High",
        "is_mandatory": true
    },
    {
        "test_code": "EMV-CHIP-001",
        "test_name": "Chip Functionality Verification",
        "test_short_name": "Chip Function",
        "category_code": "EMV",
        "test_type": "Functional",
        "iso_standard": "EMVCo",
        "test_objective": "Verify EMV chip responds correctly to all commands",
        "test_procedure": "Use EMV test terminal to send command sequences and verify responses",
        "acceptance_criteria": "All mandatory commands return correct responses per EMVCo spec",
        "measurement_unit": "Pass/Fail",
        "test_equipment_required": ["EMV Terminal Analyzer", "Test Cards"],
        "criticality": "Critical",
        "is_mandatory": true
    },
    {
        "test_code": "MAG-ENC-001",
        "test_name": "Magnetic Stripe Encoding Quality",
        "test_short_name": "Mag Encoding",
        "category_code": "MAG",
        "test_type": "Electrical",
        "iso_standard": "ISO 7811",
        "test_objective": "Verify magnetic stripe is encoded correctly with proper signal quality",
        "test_procedure": "Read magnetic stripe multiple times and verify data integrity and signal strength",
        "acceptance_criteria": "100% read success rate, signal amplitude within spec",
        "measurement_unit": "mV",
        "min_value": 150,
        "max_value": 600,
        "criticality": "Critical",
        "is_mandatory": true
    }
]
```

#### 3. Create Seed Script

**backend/seed-cqm-data.js:**
```javascript
const { TestCategory, TestDefinition } = require('./models');
const categoryData = require('./seed-data/test-categories.json');
const testData = require('./seed-data/sample-test-definitions.json');

async function seedCQMData() {
    try {
        console.log('🌱 Seeding CQM test categories...');
        
        // Seed categories
        for (const cat of categoryData) {
            await TestCategory.findOrCreate({
                where: { category_code: cat.category_code },
                defaults: cat
            });
            console.log(`✅ Category: ${cat.category_name}`);
        }

        console.log('\n🌱 Seeding test definitions...');
        
        // Seed test definitions
        for (const test of testData) {
            // Find category by code
            const category = await TestCategory.findOne({
                where: { category_code: test.category_code }
            });

            if (category) {
                test.category_id = category.category_id;
                delete test.category_code;

                await TestDefinition.findOrCreate({
                    where: { test_code: test.test_code },
                    defaults: test
                });
                console.log(`✅ Test: ${test.test_name}`);
            }
        }

        console.log('\n🎉 Seeding completed successfully!');
    } catch (error) {
        console.error('❌ Seeding error:', error);
    }
}

seedCQMData();
```

---

## 📅 DAYS 6-7: Testing & Documentation

### Day 6: Test Migrations (3-4 hours)

#### 1. Run Migrations on Test Database
```bash
cd backend
node db/migrations/cqm/run-cqm-migrations.js
```

#### 2. Verify Tables
```bash
psql -U postgres -d cqm_tracking_test

# Check renamed tables
\dt

# Check manufacturing_facilities structure
\d manufacturing_facilities

# Check test_results structure  
\d test_results

# Exit psql
\q
```

#### 3. Test Data Integrity
```bash
# Check record counts
psql -U postgres -d cqm_tracking_test -c "SELECT COUNT(*) FROM manufacturing_facilities;"
psql -U postgres -d cqm_tracking_test -c "SELECT COUNT(*) FROM test_results;"
```

---

### Day 7: Document Progress (2-3 hours)

#### 1. Update Progress Checklist
- Open `CQM_TRANSFORMATION_CHECKLIST.md`
- Check off completed items
- Add notes about any issues or decisions

#### 2. Create Progress Log

**PROGRESS_LOG.md:**
```markdown
# CQM Transformation Progress Log

## Week 1: December 16-20, 2025

### Completed
- [x] Created development branch: cqm-transformation
- [x] Backed up original database
- [x] Created test database: cqm_tracking_test
- [x] Updated package.json files with CQM branding
- [x] Updated startup scripts
- [x] Created first two migration scripts
- [x] Defined test categories structure
- [x] Created sample test definitions

### Issues Encountered
- None

### Decisions Made
- Using separate test database for development
- Starting with 4 main test categories
- Will expand to 100+ tests gradually

### Next Week Goals
- Create remaining migration scripts
- Build new backend models
- Start updating controllers
```

#### 3. Commit Week 1 Work
```bash
git add .
git commit -m "Week 1: Database planning and initial migrations"
git push origin cqm-transformation
```

---

## 🎯 WEEK 2 PREVIEW: Backend Models

### What You'll Do Next Week

1. **Create New Models**
   - ManufacturingFacility.js
   - TestDefinition.js
   - TestCategory.js
   - TestResult.js
   - Audit.js
   - NonConformity.js
   - CapaAction.js
   - Certification.js

2. **Update Existing Models**
   - Rename files
   - Update fields
   - Update relationships

3. **Test Models**
   - Create test scripts
   - Verify CRUD operations
   - Test relationships

---

## 📚 HELPFUL COMMANDS REFERENCE

### Git Commands
```bash
# Check current branch
git branch

# View changes
git status

# Commit changes
git add .
git commit -m "Your message"

# Push changes
git push origin cqm-transformation

# Create backup branch
git checkout -b backup-$(date +%Y%m%d)
```

### Database Commands
```bash
# Connect to database
psql -U postgres -d cqm_tracking_test

# List tables
\dt

# Describe table
\d table_name

# Run SQL file
psql -U postgres -d cqm_tracking_test -f migration.sql

# Backup database
pg_dump -U postgres cqm_tracking_test > backup.sql

# Restore database
psql -U postgres -d cqm_tracking_test < backup.sql
```

### NPM Commands
```bash
# Install dependencies
npm install

# Start backend dev server
cd backend && npm run dev

# Start frontend dev server
cd frontend && npm run dev

# Run migrations
cd backend && npm run migrate

# Run tests
npm test
```

---

## ⚠️ IMPORTANT REMINDERS

### Do's ✅
- ✅ Always work in the `cqm-transformation` branch
- ✅ Commit frequently with clear messages
- ✅ Test migrations on test database first
- ✅ Keep backups of working states
- ✅ Document decisions and issues
- ✅ Test after each significant change

### Don'ts ❌
- ❌ Don't work directly on main branch
- ❌ Don't skip database backups
- ❌ Don't run untested migrations on production
- ❌ Don't delete old code until new code is tested
- ❌ Don't commit broken code
- ❌ Don't skip documentation

---

## 🆘 TROUBLESHOOTING

### Migration Fails
```bash
# Rollback database to backup
psql -U postgres -c "DROP DATABASE cqm_tracking_test;"
psql -U postgres -c "CREATE DATABASE cqm_tracking_test;"
psql -U postgres -d cqm_tracking_test < backups/pmbok_backup_before_cqm.sql
```

### Server Won't Start
```bash
# Check for port conflicts
netstat -ano | findstr :5000
netstat -ano | findstr :3000

# Kill process if needed (use PID from above)
taskkill /PID <pid> /F
```

### Database Connection Issues
- Check PostgreSQL service is running
- Verify .env credentials
- Ensure database exists
- Check firewall settings

---

## 📞 RESOURCES

### Documentation
- `CQM_TRANSFORMATION_GAMEPLAN.md` - Full strategy
- `CQM_DATABASE_SCHEMA.md` - Database design
- `CQM_TRANSFORMATION_CHECKLIST.md` - Task tracking

### External Resources
- Smart Consulting CQM: https://www.smart-consulting.com/card-quality-management/
- EMVCo: https://www.emvco.com
- ISO Standards: https://www.iso.org

---

## ✨ MOTIVATION

You're embarking on an exciting transformation! This will create a specialized, valuable tool for card manufacturing quality management. Take it one step at a time, test thoroughly, and enjoy the journey! 🚀

**Remember:** Complex projects are completed one commit at a time. You've got this! 💪

---

**Document Version:** 1.0  
**Last Updated:** December 16, 2025  
**Status:** Ready to Begin!



