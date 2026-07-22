# Candidate 06 seed correction required

## Resolution

**REOPENED AFTER WINDOWS FAILURE.** `KnownGoodProductionPaginationPrintSafe.rdl` omitted PageWidth/PageHeight. Candidate 06 proved those omissions resolved as runtime `13in × 0` and failed. The later `KnownGoodProductionPaginationLetter.rdl` also omits both dimensions and differs only by timestamp. See `06b-SEED_REJECTED.md` for the explicit replacement requirement.

## Blocking evidence

The delivered `KnownGoodProductionPagination.rdl` proves the fragile Report Builder structures, but its exact XML contains:

- body width: `7in`
- page width: `2in`
- left margin: `0.5in`
- right margin: `0.5in`
- printable width: `1in`

This fails the required print-safe check (`7in > 1in`). Preview/PDF/Excel counts, unexpected blank pages, and horizontal clipping were submitted as unresolved placeholders, so they cannot establish that the 2-inch page is intentional or output-safe.

Candidate 06 was not generated. The supplied seed remains unchanged as forensic evidence.

## Correct through Report Builder

1. Use a fresh checkout and verify the supplied seed:

   ```powershell
   Get-FileHash ".\samples\report-builder-seeds\KnownGoodProductionPagination.rdl" -Algorithm SHA256
   ```

   Expected SHA-256: `53c8dc9dac7e53830673c13f50363e69d1a6f528bf8d3e0199eda348e01db196`.

2. Open that seed in Power BI Report Builder and confirm its current repeating headers, Region breaks, Page N of M, six details, three Region subtotals, and Grand Total.
3. Use **File → Save As** and create:

   `samples/report-builder-seeds/KnownGoodProductionPaginationPrintSafe.rdl`

   Preserve the original seed unchanged.

4. In **Report Properties → Page Setup**, change only the page dimensions to:
   - width: `8.5in`
   - height: `11in`

   Retain:
   - body width: `7in`
   - left/right/top/bottom margins: `0.5in`
   - portrait orientation
   - existing repeating-header member metadata
   - existing outer-Region `Between` page break
   - existing Page N of M footer expression
   - all data, groups, Region subtotals, and Grand Total

5. Save, close, reopen, and Preview the corrected file.
6. Export the reopened file to PDF and Excel.
7. Return concrete values—no placeholders—for:
   - Preview page count
   - PDF page count
   - Excel worksheet count
   - page on which Central begins
   - page on which East begins
   - page on which West begins
   - page on which Grand Total appears
   - unexpected blank pages: `NO`
   - horizontal clipping: `NO`

8. Confirm repeated headings on every later Region page, correct `Page N of M`, all six details once, three correct Region subtotals, one correct Grand Total, successful PDF export, and successful Excel export.
9. Provide the corrected RDL SHA-256, Report Builder version, Design screenshot, every Preview page, PDF pages, Excel sheet names/screenshots, and any warning/error dialog.
10. Commit and push only the corrected RDL seed to `spike/first-real-rdl-generation`. Its Git attribute must resolve to `text: unset`.

Once this corrected Report Builder-authored seed exists, Candidate 06 can preserve its exact bytes and proceed to independent Windows acceptance. Do not generate Candidate 07.
