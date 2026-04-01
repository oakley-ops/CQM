# CQM Quality Inspector Agent — Agentic Demo Spec

## Purpose

Build a Python-based agentic workflow that connects to the existing CQM backend API and autonomously performs quality inspection tasks using natural language commands. This demo is designed to showcase skills directly relevant to agentic workflow development roles: multi-step agent reasoning, tool integrations, observability, and safety guardrails.

---

## What to Build

### Project: `cqm-agent/`

A standalone Python agent (lives alongside the existing `backend/` and `frontend/` directories) that acts as an autonomous quality inspector for the CQM system.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | Python 3.11+ |
| Agent Framework | LangGraph |
| LLM | Claude API via `anthropic` SDK |
| API Client | `httpx` (async) |
| Observability | `structlog` + JSON log sink |
| Config | `pydantic-settings` + `.env` |
| CLI | `typer` |
| Tests | `pytest` + `pytest-asyncio` |

---

## Core Agent Capabilities

### 1. Natural Language Query → API Action
The agent accepts plain English commands and decides which CQM API tools to call.

Examples:
```
"Show me all failed tests from last week"
"Flag batch B-2024-112 for non-conformity"
"Summarize open CAPA actions older than 30 days"
"Which test categories have the highest failure rate this month?"
```

### 2. Multi-Step Reasoning Loop (LangGraph)
The agent runs a stateful graph with these nodes:

```
[user_input] → [planner] → [tool_executor] → [analyzer] → [responder]
                   ↑______________↓ (loop until task complete)
```

- **planner**: Decides what tool(s) to call next
- **tool_executor**: Calls CQM REST API tools
- **analyzer**: Evaluates results, decides if more data is needed
- **responder**: Formats final answer for the user

### 3. CQM API Tool Set
Each tool wraps a CQM backend endpoint:

| Tool Name | API Endpoint | Description |
|---|---|---|
| `get_test_sessions` | `GET /api/test-sessions` | Fetch sessions with filters |
| `get_test_entries` | `GET /api/test-entries` | Fetch test results |
| `get_test_categories` | `GET /api/test-categories` | List categories |
| `create_non_conformity` | `POST /api/non-conformities` | Flag a quality issue |
| `get_capa_actions` | `GET /api/capa-actions` | Retrieve CAPA records |
| `get_batch_summary` | `GET /api/card-batches/:id` | Batch details |
| `generate_report` | Aggregates multiple calls | Builds a summary report |

### 4. Observability
Every agent step emits a structured JSON log entry:

```json
{
  "timestamp": "2026-03-25T14:32:01Z",
  "agent_step": "tool_executor",
  "tool": "get_test_entries",
  "input": {"status": "failed", "days": 7},
  "output_summary": "12 failed entries returned",
  "latency_ms": 143,
  "token_usage": {"input": 312, "output": 88}
}
```

Logs write to both stdout (human-readable) and `cqm-agent/logs/agent.jsonl` (machine-readable for analysis).

### 5. Guardrails
The agent enforces hard boundaries before any write operation:

- **Confirmation gate**: Any `POST`/`PATCH`/`DELETE` action requires explicit user confirmation before execution
- **Scope limiter**: Agent cannot call endpoints outside the approved tool list
- **Rate limiter**: Max 20 API calls per agent run to prevent runaway loops
- **Hallucination check**: If the LLM references a batch ID or test ID not returned by a prior tool call, the run is aborted with an explanation

---

## Project Structure

```
cqm-agent/
├── main.py                  # CLI entry point (typer)
├── agent/
│   ├── graph.py             # LangGraph state graph definition
│   ├── nodes/
│   │   ├── planner.py       # Claude-powered planning node
│   │   ├── tool_executor.py # Runs API tools, enforces guardrails
│   │   ├── analyzer.py      # Evaluates results, decides loop/exit
│   │   └── responder.py     # Final answer formatting
│   ├── tools/
│   │   ├── base.py          # BaseTool class with rate limiter
│   │   ├── test_sessions.py
│   │   ├── test_entries.py
│   │   ├── non_conformities.py
│   │   └── capa_actions.py
│   ├── guardrails.py        # Confirmation gate + scope enforcement
│   └── state.py             # LangGraph AgentState TypedDict
├── observability/
│   ├── logger.py            # structlog setup
│   └── metrics.py           # Token usage + latency tracking
├── config.py                # pydantic-settings config
├── tests/
│   ├── test_tools.py
│   ├── test_guardrails.py
│   └── test_graph.py        # End-to-end graph tests with mocked API
├── requirements.txt
├── .env.example
└── README.md
```

---

## Build Order

### Phase 1 — Foundation (Day 1)
1. Set up `cqm-agent/` directory, `requirements.txt`, `config.py`
2. Implement all API tools in `tools/` with `httpx` async client
3. Write `tests/test_tools.py` with mocked HTTP responses

### Phase 2 — Agent Graph (Day 2)
4. Define `AgentState` in `state.py`
5. Build LangGraph graph in `graph.py` with all four nodes
6. Implement `planner.py` using Claude with tool definitions
7. Implement `tool_executor.py` with guardrail hooks
8. Implement `analyzer.py` and `responder.py`

### Phase 3 — Observability + CLI (Day 3)
9. Add `structlog` structured logging to every node
10. Add token usage and latency tracking in `metrics.py`
11. Build `main.py` CLI with `typer` (interactive + single-command modes)
12. Write end-to-end graph tests

---

## Example CLI Usage

```bash
# Interactive mode
python main.py chat

# Single command
python main.py run "Summarize all open non-conformities for facility F-001"

# With live log output
python main.py run "Flag batch B-2024-112" --verbose

# Replay logs for a past run
python main.py logs --run-id abc123
```

---

## What This Demonstrates (for the Job Application)

| Job Requirement | This Demo |
|---|---|
| Agentic frameworks (LangGraph) | Core architecture |
| Python proficiency | Entire agent is Python |
| LLM API / prompt engineering | Claude tool-use, planner prompts |
| API integrations | 7 CQM tools via httpx |
| Workflow orchestration | LangGraph stateful multi-step loop |
| Monitoring & observability | structlog JSON logs + metrics |
| Guardrails & safety mechanisms | Confirmation gate, rate limiter, scope enforcer |
| Security best practices | Token-authenticated API calls, no secrets in code |

---

## Environment Variables

```env
ANTHROPIC_API_KEY=sk-ant-...
CQM_API_BASE_URL=http://localhost:5000/api
CQM_API_TOKEN=your-jwt-token
AGENT_MAX_ITERATIONS=10
AGENT_MAX_API_CALLS=20
LOG_LEVEL=INFO
LOG_FILE=logs/agent.jsonl
```

---

## Notes

- The agent authenticates to the CQM backend using a JWT obtained via `POST /api/auth/login` at startup
- All write tools (`create_non_conformity`, etc.) are disabled by default in non-interactive mode — pass `--allow-writes` flag to enable
- The demo works against the local dev server (`npm run dev`) with no additional infrastructure needed
