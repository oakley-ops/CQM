# Adding a Specialized Test Entry Form

When a test requires more than a simple Pass/Fail or measurement input (e.g. per-card tables, equipment metadata, cycle counts), you create a dedicated form component and register it in **two files**.

---

## Step 1 — Create the form component

**Location:** `frontend/src/components/CQM/Forms/`

**File naming:** `<TestName>Form.tsx`
Example: `DynamicTorsionalStressForm.tsx`

### Required props interface (copy this pattern for every form)

```tsx
interface MyFormProps {
  def: TestDefinition;
  entry: TestEntryFormData;
  onUpdateEntry: (defId: number, updates: Partial<TestEntryFormData>) => void;
  onUpdateCardEntry: (defId: number, cardNumber: number, updates: Partial<CardEntryData>) => void;
}
```

### Storing form-specific fields

Use `entry.specializedMetadata` for header fields shared across tests (temp, humidity, technician, etc.).

Use `entry.specializedMetadata.extraData` for fields unique to the test (e.g. machine ID, cycle count).

```tsx
const meta: TestEntryMetadata = entry.specializedMetadata ?? {};
const extra = (meta.extraData ?? {}) as MyFormExtra;

const updateMeta = (patch: Partial<TestEntryMetadata>) =>
  onUpdateEntry(def.id, { specializedMetadata: { ...meta, ...patch } });

const updateExtra = (patch: Partial<MyFormExtra>) =>
  updateMeta({ extraData: { ...extra, ...patch } });
```

### Deriving pass/fail for per-card rows

Call `onUpdateCardEntry` with `passStatus` and `isValid: true` once a result is determined.

```tsx
onUpdateCardEntry(def.id, cardNumber, {
  cornerA: value,
  passStatus: value === 'PASS',
  isValid: true,
});
```

### Export from the forms index

Add one line to `frontend/src/components/CQM/Forms/index.ts`:

```ts
export { default as MyForm } from './MyForm';
```

---

## Step 2 — Register in TestEntryPage (the main entry page)

**File:** `frontend/src/pages/cqm/TestEntryPage.tsx`

This is the page users land on when they click a test from the session test list. It is the **primary** place to register specialized forms.

### 2a — Add the import (top of file, with other form imports)

```tsx
import MyForm from '../../components/CQM/Forms/MyForm';
```

### 2b — Add the test_id to SPECIALIZED_FORM_CODES (~line 53)

```tsx
const SPECIALIZED_FORM_CODES = new Set([
  ...existing codes...,
  '#XXXX#',       // add the test_id here
]);
```

### 2c — Add the render branch inside renderForm() (~line 280)

```tsx
if (def.test_id === '#XXXX#') return <MyForm {...sharedProps} />;
```

Place it before the closing `}` of the `if (isSpecialized)` block, after the last existing branch.

---

## Step 3 — Register in TestEntryDialog (the accordion dialog)

**File:** `frontend/src/components/CQM/Forms/TestEntryDialog.tsx`

This dialog is used in other parts of the app (category-based accordion view). Keep it in sync with TestEntryPage.

### 3a — Add the import (top of file)

```tsx
import MyForm from './MyForm';
```

### 3b — Add the test_id to SPECIALIZED_FORM_CODES (~line 49)

```tsx
const SPECIALIZED_FORM_CODES = new Set([
  ...existing codes...,
  '#XXXX#',
]);
```

### 3c — Add the render branch (~line 818)

Find the last `) : def.test_id === '...' ? (` chain and add before `) : null`:

```tsx
        ) : def.test_id === '#XXXX#' ? (
          <MyForm
            def={def}
            entry={entry}
            onUpdateEntry={updateEntry}
            onUpdateCardEntry={updateCardEntry}
          />
        ) : null
```

---

## Step 4 — Verify

```bash
cd frontend && npx tsc --noEmit
```

No output = clean. Then reload the browser.

---

## Quick reference — file locations

| What | File |
|------|------|
| Form component | `frontend/src/components/CQM/Forms/<Name>Form.tsx` |
| Forms index export | `frontend/src/components/CQM/Forms/index.ts` |
| **Primary registration** | `frontend/src/pages/cqm/TestEntryPage.tsx` |
| Secondary registration | `frontend/src/components/CQM/Forms/TestEntryDialog.tsx` |
| Types (CardEntryData, TestEntryMetadata) | `frontend/src/types/cqm/testEntry.types.ts` |

---

## Common mistakes

- **Only updating TestEntryDialog and not TestEntryPage** — the page users see when clicking a test from the session list is `TestEntryPage.tsx`, not the dialog. Both must be updated.
- **Forgetting to add the test_id to SPECIALIZED_FORM_CODES** — without this, the form is never reached and the generic input renders instead.
- **Using the test_method code instead of test_id** — always match against `def.test_id` (e.g. `#3043#`), not the test method reference (e.g. `#8150#`). Check the DB or seed file if unsure which is which.
