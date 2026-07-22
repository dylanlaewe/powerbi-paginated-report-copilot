# Candidate 06 final Windows validation

## Result

**FAIL — independently rejected on Windows.** SHA-256 passed and Design opened, but Report Builder resolved page width as `13in` and page height as invalid `0`. Preview failed before rendering with `ReportSection0` PageHeight invalid-size errors. PDF and Excel exports were not tested. Candidate 06 remains unchanged and rejected.

## Final compatibility-ladder acceptance criterion

Not met. Candidate 06 failed before Preview rendering because physical page dimensions were not serialized as valid explicit RDL sizes.

Do not generate Candidate 07, merge, tag, or start the copilot MVP until this entire checklist passes.

## Identity and reproduction

- Candidate: `artifacts/rdl-compatibility-ladder/06-production-pagination.rdl`
- SHA-256: `a9a258a6fab73c0374c4d08dc0c1c923d57e8efd55df2fa04c88215bab06ef2a`
- Corrected Report Builder seed: `samples/report-builder-seeds/KnownGoodProductionPaginationPrintSafe.rdl`
- Derivation: byte-for-byte copy

From a clean clone after `corepack enable && pnpm install --frozen-lockfile`:

```sh
pnpm spike:rdl-compatibility-06 artifacts/rdl-compatibility-ladder
```

The command prints the final absolute report path and does not use `tmp/`.

## Windows procedure

1. Use a fresh checkout of the latest `spike/first-real-rdl-generation`.
2. Record integrity evidence in PowerShell:

   ```powershell
   git check-attr text -- ".\artifacts\rdl-compatibility-ladder\06-production-pagination.rdl"
   git config --show-origin --get-all core.autocrlf
   Get-FileHash ".\artifacts\rdl-compatibility-ladder\06-production-pagination.rdl" -Algorithm SHA256
   ```

   Attribute must end in `text: unset`; SHA-256 must equal `a9a258a6…ef2a`.

3. Open `06-production-pagination.rdl` in Power BI Report Builder through **File → Open → This PC → Browse**.
4. Record and capture every exception, repair, conversion, upgrade, or warning dialog.
5. In Design view, verify:
   - the accepted title, nine fields, and six embedded rows;
   - `Region → Region1 → Details`, three Region subtotals, and one Grand Total;
   - outer Region group `BreakLocation=Between`;
   - static column-header member `RepeatOnNewPage=True`;
   - page-footer expression `="Page " & Globals!PageNumber & " of " & Globals!TotalPages`;
   - effective portrait Letter `8.5in × 11in` configuration;
   - `0.5in` margins and `7in` body width.

6. Capture a full-window Design screenshot with Row Groups Advanced Mode and relevant Properties visible.
7. Select **Run** and record the concrete Preview page count.
8. For every Preview page, capture a full-window screenshot and record:
   - displayed `Page N of M`;
   - Region beginning on that page;
   - whether column headings repeat;
   - whether any horizontal clipping or unexpected blank page exists.

9. Confirm all six details appear exactly once and all totals remain:

   | Scope       | Quantity |    Revenue | Gross Profit |
   | ----------- | -------: | ---------: | -----------: |
   | Central     |       17 |  $4,050.00 |    $1,610.00 |
   | East        |       14 |  $5,950.00 |    $2,270.00 |
   | West        |       30 |  $5,990.00 |    $2,370.00 |
   | Grand Total |       61 | $15,990.00 |    $6,250.00 |

10. Export to PDF. Record the concrete PDF page count and verify every page for repeated headings, Region breaks, matching Page N of M, no blank pages, no horizontal clipping, all rows, and all totals. Capture every PDF page.
11. Export to Excel (`.xlsx`). Record the concrete worksheet count and every sheet name. Verify:
    - all nine columns remain usable and legible;
    - all six detail rows appear once;
    - Region subtotals and Grand Total remain numeric and correct;
    - dates, whole numbers, and currency remain usable/formatted;
    - no omitted rows or columns; and
    - no empty worksheets caused by page breaks.

12. Capture each Excel worksheet showing its data and totals.
13. Close Report Builder and choose **No** if prompted to save, especially after an error, to preserve candidate bytes.

## Required return record

- Candidate SHA-256 and Report Builder version
- Open, Design, Preview, repair/conversion results
- Concrete Preview page count
- Concrete PDF page count
- Concrete Excel worksheet count and sheet names
- Region start page mapping
- Repeated headings: PASS/FAIL
- Page N of M: PASS/FAIL
- Unexpected blank Preview pages: NO/YES
- Unexpected blank PDF pages: NO/YES
- Horizontal clipping in Preview: NO/YES
- Horizontal clipping in PDF: NO/YES
- Six rows, three Region subtotals, and one Grand Total: PASS/FAIL
- PDF export: PASS/FAIL
- Excel export: PASS/FAIL
- All requested screenshots and every dialog
