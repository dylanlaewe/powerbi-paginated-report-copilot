# Candidate 06b independent Windows handoff

Candidate 06b is a byte-identical control copy of the corrected, Report Builder-authored Letter seed. It is not accepted until this exact candidate passes independent Windows validation.

## Integrity

- File: `artifacts/rdl-compatibility-ladder/06b-production-pagination-letter.rdl`
- Expected SHA-256: `c2d27f7595d9330eb9815f86483aa068129265a00980ca3b0b956f6f3f1de17a`
- Seed commit: `81861fb434547f101f0f455b7ca0ad2bd68cc86e`
- Derivation: byte-for-byte copy of `samples/report-builder-seeds/KnownGoodProductionPaginationLetter.rdl`

From PowerShell at the repository root:

```powershell
(Get-FileHash ".\artifacts\rdl-compatibility-ladder\06b-production-pagination-letter.rdl" -Algorithm SHA256).Hash.ToLower()
Select-String -Path ".\artifacts\rdl-compatibility-ladder\06b-production-pagination-letter.rdl" -Pattern '<PageWidth>8.5in</PageWidth>','<PageHeight>11in</PageHeight>'
```

The hash must match and both searches must return a literal match before opening the report.

## Report Builder validation

1. Open the exact Candidate 06b file in Power BI Report Builder. Record the Report Builder version.
2. Confirm no repair, conversion, upgrade, or error dialog appears. Capture any dialog verbatim if it does.
3. In Design view, confirm Letter portrait `8.5in × 11in`, four `0.5in` margins, and a `7in` body.
4. Preview and record the exact page count. Confirm each Region begins on a separate page, column headings repeat, the footer renders `Page N of M`, no blank pages appear, and nothing is horizontally clipped.
5. Confirm all six detail rows appear exactly once, three Region subtotal rows appear, and exactly one Grand Total appears.
6. Verify totals:
   - Central: Quantity 17; Revenue $4,050.00; Gross Profit $1,610.00
   - East: Quantity 14; Revenue $5,950.00; Gross Profit $2,270.00
   - West: Quantity 30; Revenue $5,990.00; Gross Profit $2,370.00
   - Grand Total: Quantity 61; Revenue $15,990.00; Gross Profit $6,250.00
7. Export to PDF. Record its page count and confirm no blank pages or horizontal clipping.
8. Export to Excel. Record its worksheet count and confirm Excel shows no repair warning.
9. Close Report Builder using **Don't Save**. Recompute SHA-256 and confirm it is unchanged.

Return screenshots of Design view with page properties, every Preview page, every PDF page, the Excel worksheets, and any error or warning dialog. Return the exact Preview/PDF page counts and Excel worksheet count; these were not supplied numerically for the seed and must not be inferred.

## Acceptance criterion

Candidate 06b passes only if Report Builder opens and previews it with correct multipage Region pagination, repeated headings, Page N of M, correct totals, no blank pages, no horizontal clipping, and successful PDF and Excel exports, while preserving the expected SHA-256.
