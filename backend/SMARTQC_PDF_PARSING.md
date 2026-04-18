# SmartQC PDF Parsing — Profile Cards List Fix

## Problem

When importing a **SmartQC "Profile Cards List"** batch PDF (one PDF containing all N cards), the Q-Factor, Resonance Frequency, and Reading Power fields were not populating correctly. Observed wrong values: Q-Factor showing `[13, 7, 2]`, Resonance and Power empty.

## Root Cause

`pdf-parse` extracts PDF table text by reading text objects in document order. For SmartQC Profile Cards List PDFs, it **concatenates adjacent table columns with zero separators** — no spaces, no newlines between them.

A row that visually reads:

| Timestamp           | Resonance (MHz) | Q-Factor | Power (V) |
|---------------------|-----------------|----------|-----------|
| 2026/04/07 16:10:27 | 13.880          | 13       | 7.7       |

arrives from `pdf-parse` as a single string:

```
12026/04/07 16:10:2713.880137.7
```

Where:
- `1` = card number
- `2026/04/07 16:10:27` = timestamp
- `13.880` = resonance frequency (MHz)
- `13` = Q-Factor
- `7.7` = reading power (V)

**All values are jammed together with no separator.**

## Why the Original Regex Failed

The original Strategy 2 used word-boundary (`\b`) anchored patterns:

```js
// Resonance: \b(1[0-9]\.\d{2,4})\b  — failed because "1" from Q-Factor "13" immediately follows "13.880"
// Q-Factor:  \b(\d{1,3})\b          — incorrectly matched "7" (the second digit of "7.7")
// Power:     \b(\d{1,2}\.\d{1,2})\b — failed because "3" from Q-Factor "13" immediately precedes "7.7"
```

Word boundaries require a transition between `\w` and `\W`. In `13.880137.7`, no such transitions exist between the three values — they run together.

## Solution

Added **Strategy 1a** — a concatenated-pattern regex that matches the compact triple directly without relying on separators:

```js
// Matches: resonance (13.xxx MHz) + Q-Factor (integer) + power (N.N V)
// Example: "13.880137.7" → ["13.880", "13", "7.7"]
const concatRegex = /(1[0-9]\.\d{3})(\d{1,3})(\d{1,2}\.\d)/g;
```

**How the backtracking resolves ambiguity in `13.880137.7`:**
1. Resonance `(1[0-9]\.\d{3})` matches `13.880` (exactly 3 decimal digits — stops at `1`).
2. Q-Factor `(\d{1,3})` tries `137` first → fails because `7.7` can't start `(\d{1,2}\.\d)` after a digit that would need to be the "tens" of a two-digit power reading.
3. Backtracks: Q-Factor matches `13` → Power matches `7.7`. 

## Three-Strategy Architecture

The parser (`parseProfileCardsListText` in `backend/controllers/testEntryController.js`) now attempts three strategies in order:

| Strategy | Pattern | Handles |
|----------|---------|---------|
| **1a** — Concatenated | `/(1[0-9]\.\d{3})(\d{1,3})(\d{1,2}\.\d)/g` | No separators between columns (this PDF) |
| **1b** — Space-separated | `/(1[0-9]\.\d{2,4})\s+(\d{1,3})\s+(\d{1,2}\.\d{1,2})/g` | Whitespace between columns |
| **2** — Column-by-column | Extract resonances, powers, Q-Factors independently | pdf-parse reads columns top-to-bottom |

Each strategy checks whether it found exactly `N` matches (where `N` = "Number of cards" from the PDF header). If yes, it returns those cards immediately. If not, it falls through to the next strategy.

## Frontend Mapping

The three fields map to `CardEntryData` as follows:

| PDF field | `CardEntryData` field | Form |
|-----------|----------------------|------|
| `qFactor` | `measurementValue` | QFactorForm |
| `resonanceFrequencyMHz` | `secondaryMeasurementValue` | QFactorForm |
| `readingPowerV` | `measurementValue` | ReadingDistanceForm |
| `resonanceFrequencyMHz` | `secondaryMeasurementValue` (via `notes` JSON) | ReadingDistanceForm |

## Files Modified

- `backend/controllers/testEntryController.js` — `parseProfileCardsListText()` function
- `backend/routes/testEntries.js` — removed temporary debug route
