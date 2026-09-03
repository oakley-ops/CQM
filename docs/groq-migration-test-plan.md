# Groq Migration Test Plan
**Migration:** Anthropic Claude Sonnet → Groq Llama 3.3 70B Versatile  
**Affected files:** `alertController.js`, `aiController.js`, `annotationAgent.js`, `orchestratorService.js`

---

## Friction Point 1 — Autodata Pipeline (Multi-turn Tool Calls)

The orchestrator runs 5 sequential tool stages via multi-turn conversation:
`collect_data → profile_data → annotate_data → assess_quality → format_dataset`

Llama 3.3 may skip stages, repeat stages, or stop early.

### Test Cases

#### 1.1 Full pipeline happy path
- **Setup:** Have at least one `TestSession` with approved `TestEntry` records in the DB
- **Action:** `POST /api/nexus/autodata/runs` with a valid config, then poll `GET /api/nexus/autodata/runs/:id` until status is `completed`
- **Pass:** Status is `completed`, `dataset_path` is set, `stats.collected > 0`, `stats.valid > 0`
- **Fail indicators:** Status is `failed`, any stage shows 0 when previous stage had data

#### 1.2 Stage ordering — verify all 5 stages executed
- **Action:** After a completed run, check `stats` object in the run record
- **Pass:** `stats.collected`, `stats.profiled`, `stats.annotated`, `stats.valid` are all populated and non-null
- **Fail indicators:** `stats.annotated` is 0 while `stats.collected > 0` (annotate_data was skipped)

#### 1.3 Tool chaining — model does not repeat or skip stages
- **Action:** Enable debug logging, run the pipeline, inspect the message history in logs
- **Pass:** Each tool appears exactly once in the conversation in the correct order
- **Fail indicators:** Same tool called twice, `format_dataset` called before `assess_quality`

#### 1.4 Pipeline stops at MAX_LOOPS guard
- **Setup:** Temporarily set `MAX_LOOPS = 3` in `orchestratorService.js`
- **Action:** Trigger a run
- **Pass:** Run ends with `failed` or partial status — does not hang indefinitely
- **Restore:** Set `MAX_LOOPS` back to `10`

#### 1.5 Empty data graceful handling
- **Setup:** Run with a config filter that matches no sessions
- **Action:** `POST /api/nexus/autodata/runs` with `card_type` that doesn't exist
- **Pass:** Run completes or fails cleanly with a meaningful `error_message`, no unhandled exception

---

## Friction Point 2 — JSON-Only Responses

Three endpoints require the model to return raw JSON with no markdown fences.
The code already strips ` ``` ` fences as a fallback, but Llama triggers this more often than Claude.

### Test Cases

#### 2.1 Alert advice — valid JSON returned
- **Setup:** Dismiss or create a `NexusAlert` with severity `critical`
- **Action:** `POST /api/nexus/alerts/:id/advice`
- **Pass:** Response is a valid JSON object with keys `steps` (array), `urgency` (string), `evidence_needed` (array), `who_to_involve` (array)
- **Fail indicators:** 500 error with `JSON parse error`, or response contains raw markdown text

#### 2.2 Audit readiness score — valid JSON returned
- **Setup:** Have a `NexusAuditRecord` with associated `NexusQmsAssessment` rows
- **Action:** `POST /api/nexus/ai/readiness/:auditId`
- **Pass:** Response has `score` (number 0–100), `rating` (string), `actions` (array of strings)
- **Fail indicators:** 500 error, or `score` is `null`/`NaN`

#### 2.3 SPC analysis — valid JSON returned
- **Setup:** Have ≥5 approved `TestSession` entries for a given `card_type` with `measurement_value` set
- **Action:** `POST /api/nexus/ai/spc/:cardType`
- **Pass:** Response has `analysis.summary` (string), `analysis.findings` (array with `test`, `status`, `message` per item)
- **Fail indicators:** 500 error or `analysis` is null

#### 2.4 Fence-stripping fallback fires without breaking response
- **Action:** Run tests 2.1–2.3 and check backend logs for the regex replace being hit
- **Pass:** Even when the model wraps JSON in ` ```json ... ``` `, the response is still parsed correctly
- **Note:** Look for log lines or add a temporary `logger.warn` around the fence-strip line to confirm

#### 2.5 Malformed JSON resilience
- **Action:** If a call returns a non-parseable response, the endpoint should return a 500 with `{ error: '...' }` — not crash the process
- **Pass:** Other API routes still respond normally after a failed AI call

---

## Friction Point 3 — Rate Limits

Groq free tier: **30 requests/minute**, **14,400 tokens/minute**

The annotationAgent batches 15 entries per API call. A large run can exhaust the token limit quickly.

### Test Cases

#### 3.1 Small batch — under rate limit
- **Setup:** Run autodata pipeline with a config that returns ≤30 entries (2 annotation batches)
- **Action:** Trigger and complete a run
- **Pass:** Run completes without a `429 Too Many Requests` error

#### 3.2 Medium batch — approaching limit
- **Setup:** Run with a config returning ~90–120 entries (6–8 annotation batches)
- **Action:** Trigger and complete a run, watch for errors in logs
- **Pass:** Run completes; if rate limited, `error_message` on the run record contains `429` or `rate limit`
- **Note:** If this fails, add retry-with-backoff logic to `annotationAgent.js`

#### 3.3 Concurrent AI endpoint calls
- **Action:** Simultaneously call alert advice, readiness score, and SPC analysis (3 requests at once)
- **Pass:** All three return valid responses; no 429 errors
- **Fail indicators:** One or more returns 429 or a timeout

#### 3.4 Rate limit error surfaces cleanly (not a 500 crash)
- **Setup:** If you can trigger a 429 (rapid repeated calls in a loop), confirm error handling
- **Action:** Call `POST /api/nexus/alerts/:id/advice` 35 times in rapid succession
- **Pass:** Responses after the limit are `500` with `{ error: 'Failed to get AI advice' }` — the server does not crash
- **Note:** Future improvement — add `Retry-After` header handling and return `429` to the client instead of `500`

---

## Quick Smoke Test Checklist

Run these after any deployment to confirm the migration is healthy:

- [ ] `POST /api/nexus/alerts/:id/advice` returns valid JSON with `steps` array
- [ ] `POST /api/nexus/ai/readiness/:auditId` returns `score` between 0 and 100
- [ ] `POST /api/nexus/ai/spc/:cardType` returns `analysis.findings` array
- [ ] Autodata run reaches `completed` status with `sample_count > 0`
- [ ] No `Anthropic` references remain in backend JS files (`grep -r "Anthropic" backend --include="*.js"`)
- [ ] `GROQ_API_KEY` is set in `.env` and not empty

---

## Notes

- Groq model in use: `llama-3.3-70b-versatile`
- Free tier limits: 30 RPM / 14,400 TPM / 500,000 TPD
- If rate limits become a problem, upgrade to Groq's paid tier or add `p-retry` with exponential backoff in `annotationAgent.js`
- If JSON reliability is a problem, add `response_format: { type: 'json_object' }` to `chat.completions.create` calls — Groq supports this for structured output
