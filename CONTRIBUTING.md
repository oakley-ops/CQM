# Contributing & Development Workflow

How we develop the CQM / NEXUS application as a team. This is the process every change follows — it exists so that `main` is always deployable and every change is reviewed and CI-verified before it merges.

---

## Branch & PR workflow

1. **Branch off `cqm-transformation`** (the current integration branch) for every change:
   ```bash
   git checkout cqm-transformation && git pull
   git checkout -b feat/short-description      # or fix/…, chore/…, docs/…
   ```
2. **Commit in small, logical units** with clear messages (see below). Don't mix unrelated changes in one commit.
3. **Push and open a Pull Request** into `cqm-transformation`.
4. **CI runs automatically** on the PR (see [Continuous Integration](#continuous-integration)). All required checks must be green.
5. **At least one review approval** before merge.
6. **Squash or rebase merge** to keep history readable. Delete the branch after merge.

> Direct commits to `cqm-transformation` should be reserved for trivial fixes; everything non-trivial goes through a PR so it's reviewed and CI-gated.

### Commit messages

Conventional-commit style, matching the existing history:

```
<type>(<scope>): <summary>

<body — what and why>

Co-Authored-By: … (if paired)
```

`type` ∈ `feat` · `fix` · `refactor` · `docs` · `test` · `chore`. `scope` is usually `nexus`, `cqm`, or a module. Example: `fix(nexus): keep dismissed watchdog alerts dismissed`.

---

## Continuous Integration

CI is defined in [`.github/workflows/ci.yml`](.github/workflows/ci.yml) and runs on **every push and every pull request**. Two jobs run in parallel:

| Job | What it does | Why |
|---|---|---|
| **Frontend — typecheck & build** | `npm ci`, then `npm run build` (TypeScript typecheck **+** Vite production build), then uploads `dist/` as an artifact. | Proves the frontend compiles and type-checks, and produces the deployable bundle. |
| **Backend — unit tests** | `npm ci` against a **Postgres 15 service container**, then runs the unit suite (`jest tests/unit`). | Proves backend logic is green against a real database engine. |

A red check blocks the merge. Contributors see the result directly on their PR.

### What CI does not yet run (and why)

Two checks are intentionally **deferred** rather than run red — a red-on-arrival pipeline is worse than an honest, smaller green one. Both are tracked in [docs/KNOWN-ISSUES-BACKLOG.md](docs/KNOWN-ISSUES-BACKLOG.md):

- **Frontend lint** — the ESLint config extends `react-app`, which isn't installed. Needs a working config before it can gate. (The `tsc` step in the build already provides real static type-checking in the meantime.)
- **Backend integration tests** (`tests/integration`) — pre-existing failures unrelated to any current change (a legacy `/api/facilities` test; server bootstrap on a hard-coded port). To be fixed and then added to CI.

When each is fixed, add it as a step in `ci.yml` and it becomes a required check.

---

## Required status checks (repo setting)

To enforce the workflow above, an admin should enable branch protection on `cqm-transformation` (GitHub → Settings → Branches → Add rule):

- ☑ Require a pull request before merging
- ☑ Require approvals (1+)
- ☑ Require status checks to pass before merging → select **`Frontend — typecheck & build`** and **`Backend — unit tests`**
- ☑ Require branches to be up to date before merging

This makes the two green CI jobs mandatory gates — no change reaches the integration branch without them passing.

---

## Running the checks locally (before you push)

```bash
# Frontend — same as CI
cd frontend && npm ci && npm run build

# Backend — unit tests (needs a local Postgres; global-setup creates cqm_test)
cd backend && npm test               # full suite (incl. integration — see caveats)
cd backend && npx jest tests/unit    # just the CI-gated unit subset
```

See [docs/DEPLOYMENT-READINESS.md](docs/DEPLOYMENT-READINESS.md) for full environment setup.

---

## CI vs CD — where we are

- **CI (Continuous Integration) — live now.** Every change is built, type-checked, and unit-tested automatically.
- **CD (Continuous Deployment) — deferred, by design.** Automated deployment needs a provisioned target (the Nashville plant host), which doesn't exist yet. The CI frontend job already publishes the built `dist/` artifact, so the deployable output is produced on every green run. Once the plant host and its access model are defined, a deploy job (build → artifact → release to host) is a small, well-scoped addition on top of this pipeline.

This is the sequence we'll follow as the app matures: **CI green and enforced first → deploy target provisioned → CD added.**
