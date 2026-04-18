# Access Database Preview

## File 1: `Card Add on 2019511.accdb`
**Table:** `Database1` | **Total Rows:** 5,967

### Columns
| # | Column Name |
|---|-------------|
| 1 | Job Number |
| 2 | Database1 (row index) |
| 3 | Test Date |
| 4 | Test Time |
| 5 | Machine Number |
| 6 | Operator |
| 7 | Card Thickness A |
| 8 | Card Thickness B |
| 9 | Card Thickness C |
| 10 | Hologram Thickness A |
| 11 | Hologram Thickness B |
| 12 | Hologram Thickness C |
| 13 | Sig Panel Thickness A |
| 14 | Sig Panel Thickness B |
| 15 | Sig Panel Thickness C |
| 16 | AVG Card Thickness |
| 17 | AVG Holo Thickness |
| 18 | AVG Sig Thickness |
| 19 | Hologram Results |
| 20 | Sig Panel Results |
| 21 | Foil Thickness A |
| 22 | Foil Thickness B |
| 23 | Foil Thickness C |
| 24 | AVG Foil Thickness |
| 25 | Foil Results |
| 26 | EMV |

### First 5 Rows

| Job Number | Row# | Test Date | Test Time | Machine | Operator | Card Thk A | Card Thk B | Card Thk C | Holo Thk A | Holo Thk B | Holo Thk C | Sig Thk A | Sig Thk B | Sig Thk C | AVG Card | AVG Holo | AVG Sig | Holo Results | Sig Results | Foil A | Foil B | Foil C | AVG Foil | Foil Results | EMV |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Nashvilkle101 | 26 | 2017-09-29 | 14:14:49 | 7 | xm | 0.792 | 0.787 | 0.787 | 0.797 | 0.793 | 0.788 | 0.797 | 0.797 | 0.797 | 0.7887 | 0.7927 | 0.7970 | 0.0040 | 0.0083 | 0.000 | 0.000 | 0.000 | 0.000 | -0.7887 | False |
| 020500H/b14 | 27 | 2017-09-29 | 14:14:58 | 3 | Thanh Truong | 0.754 | 0.755 | 0.755 | 0.753 | 0.753 | 0.752 | 0.760 | 0.761 | 0.760 | 0.7547 | 0.7527 | 0.7603 | -0.0020 | 0.0057 | 0.000 | 0.000 | 0.000 | 0.000 | -0.7547 | False |
| 20499 | 28 | 2017-09-29 | 14:15:02 | 7 | NONEY | 0.753 | 0.751 | 0.752 | 0.757 | 0.755 | 0.756 | 0.758 | 0.759 | 0.757 | 0.7520 | 0.7560 | 0.7580 | 0.0040 | 0.0060 | 0.000 | 0.000 | 0.000 | 0.000 | -0.7520 | False |
| 20475 | 29 | 2017-10-02 | 14:15:04 | 1 | THU | 0.773 | 0.771 | 0.774 | 0.760 | 0.764 | 0.770 | 0.783 | 0.780 | 0.781 | 0.7727 | 0.7647 | 0.7813 | -0.0080 | 0.0087 | 0.000 | 0.000 | 0.000 | 0.000 | -0.7727 | False |
| 20500 | 30 | 2017-10-02 | 14:15:05 | 3 | RACHEL | 0.747 | 0.747 | 0.750 | 0.749 | 0.751 | 0.751 | 0.756 | 0.759 | 0.759 | 0.7480 | 0.7503 | 0.7580 | 0.0023 | 0.0100 | 0.000 | 0.000 | 0.000 | 0.000 | -0.7480 | False |

**Notes:**
- All thickness measurements are in mm
- `Holo Results` / `Sig Results` / `Foil Results` appear to be delta values (measured − baseline)
- `EMV` column is boolean (chip card flag)
- Date range starts: 2017-09-29; contains 5,967 records

---

## File 2: `NEWESTUpdatedCard Dimension Log 1.23.17181.accdb`
**Table:** `Sheet1` | **Total Rows:** 2,153

### Columns (84 total)
| Group | Columns |
|---|---|
| Identity | Operator, TestDate, Time, JobNumber, Batch Number, DiePress |
| Card 1–10 (each) | CardNWidth, CardNHeight, CardNThickA, CardNThickB, CardNThickC, CardNThickD |
| Warpage | WarpageTest1–10 (WapageTest6 — note typo in source) |
| Quality Checks | EMV, Silk Screen Front, CornerImpactTest1–4, Silk Screen Back |

### First 5 Rows (Key Fields Only — Card 1–4 shown for brevity)

| Operator | Test Date | Time | Job Number | Batch | Die Press | C1 Width | C1 Height | C1 ThkA | C1 ThkB | C1 ThkC | C1 ThkD | C2 Width | C2 Height | C2 ThkA | EMV | Silk Fr | Corner 1-4 | Silk Bk |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| nr | 2024-01-08 | 11:17:06 | 37111 | 16/27 | 701 | -0.0490 | -0.0160 | 0.8030 | 0.8030 | 0.7950 | 0.7910 | -0.0590 | -0.0030 | 0.8080 | True | y | y/y/y/y | False |
| nr | 2024-01-09 | 07:02:47 | 37557 | 2/5 | 701 | -0.0240 | -0.0430 | 0.7860 | 0.7880 | 0.7810 | 0.7840 | -0.0230 | -0.0510 | 0.7880 | False | y | y/y/y/y | False |
| er | 2024-01-11 | 08:10:07 | 37523 | 1/1 | 701 | -0.0150 | -0.0690 | 0.7790 | 0.7780 | 0.7780 | 0.7710 | -0.0240 | -0.0610 | 0.7870 | True | y | y/y/y/y | False |
| er | 2024-01-22 | 06:14:00 | 37612 | 1/1 | 701 | -0.0080 | -0.0480 | 0.7880 | 0.7920 | 0.7820 | 0.7850 | -0.0170 | -0.0350 | 0.7900 | True | y | y/y/y/y | False |
| er | 2024-01-22 | 06:36:36 | 37508 | 1/1 | 701 | -0.0330 | -0.0030 | 0.7780 | 0.7750 | 0.7820 | 0.7810 | -0.0310 | -0.0340 | 0.7980 | True | y | y/y/y/y | False |

**Notes:**
- Width/Height values appear to be **delta from nominal** (negative = undersized), in mm
- Thickness A–D are 4-point measurements per card position
- 10 cards sampled per batch session (Card1–Card10)
- Cards 5–10 are `NULL` in the first 5 rows — likely batches where only 4 cards were measured
- Warpage columns are also `NULL` in the first 5 rows
- Date range starts: 2024-01-08; contains 2,153 records
- `DiePress` = 701 consistently in these rows (die press machine identifier)

---

## Summary Comparison

| Attribute | Card Add on 2019511 | NEWESTUpdated Card Dimension Log |
|---|---|---|
| Table | `Database1` | `Sheet1` |
| Total Rows | 5,967 | 2,153 |
| Date Range Start | 2017-09-29 | 2024-01-08 |
| Column Count | 26 | 84 |
| Cards per Row | 1 (single card entry) | 10 (cards 1–10 per batch) |
| Thickness Points | 3 (A/B/C) | 4 (A/B/C/D) |
| Warpage | No | Yes (10 measurements) |
| Hologram / Sig Panel | Yes | No |
| Foil Thickness | Yes | No |
| EMV Flag | Yes | Yes |
| Silk Screen | No | Yes (Front + Back) |
| Corner Impact | No | Yes (4 corners) |
