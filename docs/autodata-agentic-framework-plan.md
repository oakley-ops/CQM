# Autodata-like Agentic Framework — Implementation Plan

## What & Why

Meta's Autodata framework turns AI models into autonomous data scientists that collect, process, annotate, and generate high-quality training data. The goal is to implement an equivalent multi-agent pipeline within the CQM system that autonomously processes quality management data (TestEntries, TestSessions, KPIs) to produce training-ready, annotated datasets for downstream AI model training.

The CQM system already has foundational AI infrastructure that makes this tractable:
- RAG service (Voyage AI + Groq + Vectra) — reuse for ISO context injection
- `@anthropic-ai/sdk` installed but **unused** — use Claude as the agentic orchestrator
- `backend/utils/spcEngine.js` — reuse for statistical profiling
- Rich domain models (TestEntry, TestSession, TestDefinition, KpiConfig, etc.)

---

## Architecture: Multi-Agent Pipeline

Each "agent" is a **Claude tool definition**. Claude's tool-calling loop IS the agentic behavior — no custom framework needed.

```
[Orchestrator (Claude tool-use loop)]
        ↓
[Data Collector Agent]   — queries TestEntry/TestSession/TestDefinition
        ↓
[Data Profiler Agent]    — stats via spcEngine.js, outlier detection
        ↓
[Annotation Agent]       — Claude annotates entries + RAG ISO context
        ↓
[Quality Assessor Agent] — validates consistency, ISO compliance
        ↓
[Dataset Formatter Agent] — writes JSONL/CSV training dataset to disk
```

---

## Files to Create

| Path | Purpose |
|------|---------|
| `backend/services/autodata/orchestratorService.js` | Claude tool-use loop, pipeline coordinator |
| `backend/services/autodata/agents/dataCollectorAgent.js` | Queries TestEntry/TestSession with filters |
| `backend/services/autodata/agents/dataProfilerAgent.js` | Stats via spcEngine.js + outlier detection |
| `backend/services/autodata/agents/annotationAgent.js` | Claude annotates + enriches with RAG context |
| `backend/services/autodata/agents/qualityAssessmentAgent.js` | ISO compliance + consistency validation |
| `backend/services/autodata/agents/datasetFormatterAgent.js` | Outputs JSONL/CSV to `backend/datasets/{runId}/` |
| `backend/routes/autodata.js` | REST endpoints |
| `backend/controllers/autodataController.js` | Route handlers |
| `backend/models/AutodataRun.js` | Tracks pipeline run status + output path |
| `backend/db/migrations/cqm/021_create_autodata_runs.sql` | DB migration |
| `frontend/src/pages/cqm/AutodataPage.tsx` | UI: trigger runs, view status, download datasets |
| `frontend/src/services/autodataService.ts` | Axios API client |
| `frontend/src/store/slices/cqm/autodataSlice.ts` | Redux state |
| `frontend/src/types/cqm/autodata.ts` | TypeScript types |

## Files to Modify

| Path | Change |
|------|--------|
| `backend/server.js` | Mount `require('./routes/autodata')` at `/api/autodata` |
| `backend/models/index.js` | Add `AutodataRun` model + associations |
| `frontend/src/App.tsx` | Add `/autodata` route |

---

## Database Migration — `021_create_autodata_runs.sql`

```sql
CREATE TABLE autodata_runs (
  id SERIAL PRIMARY KEY,
  run_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'queued',   -- queued | running | completed | failed
  config JSONB,           -- filter params: date range, card_type, categories, format
  stats JSONB,            -- profiler output (pass rates, distributions, outlier count)
  sample_count INTEGER,
  dataset_path VARCHAR(500),
  dataset_format VARCHAR(50),            -- jsonl | csv
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Orchestrator Service Sketch

```js
// backend/services/autodata/orchestratorService.js
const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic();

const tools = [
  { name: 'collect_data',    description: 'Query TestEntry/TestSession data matching config filters' },
  { name: 'profile_data',    description: 'Run statistical profiling on collected data' },
  { name: 'annotate_data',   description: 'Use LLM + RAG context to annotate and enrich entries' },
  { name: 'assess_quality',  description: 'Validate annotation quality and ISO compliance' },
  { name: 'format_dataset',  description: 'Write final training dataset to disk as JSONL or CSV' },
];

async function runPipeline(config, runId) {
  const messages = [{ role: 'user', content: buildSystemPrompt(config) }];
  while (true) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      tools,
      messages,
    });
    if (response.stop_reason === 'end_turn') break;
    // Dispatch tool_use blocks → matching agent function
    // Append tool_result → continue loop
  }
}
```

---

## Agent Responsibilities

### Data Collector Agent
- Joins: `TestEntry` → `TestSession`, `TestDefinition`, `TestCategory`, `SampleCard`
- Filters: date range, card_type, category codes, pass_status
- Returns: raw array of entry objects

### Data Profiler Agent
- Reuses `backend/utils/spcEngine.js` for Cpk, control limits, σ calculations
- Detects outliers (measurements beyond 3σ)
- Returns: `{ passRate, categoryBreakdown, outlierIds, distributionStats }`

### Annotation Agent
- Batches entries (multiple per Claude call to reduce API usage)
- Per entry: passes measurement + TestDefinition + top-3 RAG chunks (ISO standard context)
- Claude generates: `{ description, quality_level, root_cause_hypothesis, recommended_action }`

### Quality Assessor Agent
- Checks: assessment matches measurement range, ISO section citations valid
- Flags low-confidence entries (Claude returns `confidence < 0.7`)
- Filters out flagged entries from final dataset

### Dataset Formatter Agent
- Writes to `backend/datasets/{runId}/dataset.jsonl`
- Each line: `{ input: { test_definition, measurement, context }, output: { annotation, quality_level, iso_reference } }`
- Also writes `dataset_card.json`: schema, sample count, date range, quality metrics

---

## API Endpoints

```
POST   /api/autodata/runs            Start pipeline (returns runId immediately, runs async)
GET    /api/autodata/runs            List all runs (paginated)
GET    /api/autodata/runs/:id        Get run status + stats
GET    /api/autodata/runs/:id/download  Stream dataset file download
DELETE /api/autodata/runs/:id        Delete run + dataset files
```

Async pattern: same as `ragService.ingestDocument` — fire background process, update `autodata_runs.status` in DB.

---

## Frontend — `AutodataPage.tsx`

- **Config form**: date range, card_type select, test category multi-select, output format (JSONL/CSV)
- **Run table**: list of past runs with status chips (`queued` / `running` / `completed` / `failed`)
- **Run detail drawer**: shows profiler stats, annotation quality %, download button
- **Live polling**: `GET /api/autodata/runs/:id` every 5 seconds while status is `running`

---

## Key Design Decisions

1. **Claude as orchestrator, not Groq** — Claude's tool-use API is the correct primitive for agentic coordination. Groq stays for RAG chat (cost-optimized).
2. **Agents = Claude tools** — no custom agent framework; Claude's native tool-calling loop provides the agentic loop.
3. **Async pipeline** — matches existing `ragService.ingestDocument` pattern: return `runId`, process in background, poll for status.
4. **RAG for context** — `ragService.queryAll()` injects ISO standard knowledge into the annotation agent.
5. **spcEngine.js reused** — statistical profiling already built; zero new math needed.

---

## Verification Steps

1. Run `npm run migrate` → confirm `autodata_runs` table exists in DB
2. Unit test: mock Claude tool responses, assert each agent called in correct order
3. Integration test: `POST /api/autodata/runs` with valid config → poll until `completed` → download JSONL → inspect structure
4. Frontend: `npm run dev` → navigate to `/autodata` → trigger run against seeded data → download and inspect
5. Error path: run with no matching TestEntry data → confirm `failed` status with meaningful `error_message`
