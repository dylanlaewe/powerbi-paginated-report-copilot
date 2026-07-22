# Candidate 06 prerequisite: production-pagination seed

## Delivered seed disposition

`KnownGoodProductionPagination.rdl` was delivered and proves repeating headers, outer-Region breaks, Page N of M, Preview, PDF, and Excel structures. Forensics found explicit `PageWidth=2in` against a `7in` body and `0.5in` side margins. Candidate 06 remains blocked on the print-safe correction documented in `06-SEED_CORRECTION_REQUIRED.md`.

The correction is now resolved by `KnownGoodProductionPaginationPrintSafe.rdl`; Candidate 06 has been packaged from its exact bytes and awaits independent Windows validation.

## Repository finding

No accepted Report Builder-authored seed in the current branch contains the full Candidate 06 structural requirements. Content-level inspection found no canonical seed with:

- `RepeatOnNewPage` or `FixedData` tablix-member metadata;
- a Region group `PageBreak`;
- `Globals!PageNumber` or `Globals!TotalPages`; or
- explicitly proven print-safe page size plus margins.

The rejected original `Regional Sales Detail.rdl` contains some of these constructs but failed to open in Report Builder. It is prohibited as a compatibility baseline. Candidate 06 has therefore **not** been generated.

## Create the required seed in Power BI Report Builder

Use Report Builder UI and property panels only. Do not edit RDL XML.

1. Start from a fresh checkout of accepted Candidate 05. Verify:

   ```powershell
   Get-FileHash ".\artifacts\rdl-compatibility-ladder\05-grand-total.rdl" -Algorithm SHA256
   ```

   Expected SHA-256: `13a62fcb5858fc53c45cf465de70d53d481c82722e1855c59d6aa2e72378c6dc`.

2. Open Candidate 05 in Power BI Report Builder. Confirm Design and Preview still show six details, three Region subtotals, and the `61 / $15,990.00 / $6,250.00` Grand Total before editing.
3. Immediately use **File → Save As** to create a separate working file. Never overwrite Candidate 05.

### Print-safe page setup

4. Open **Report Properties → Page Setup** and select portrait Letter:
   - width: `8.5in`;
   - height: `11in`;
   - left margin: `0.5in`;
   - right margin: `0.5in`;
   - top margin: `0.5in`;
   - bottom margin: `0.5in`.

   Keep the existing `7in` body width. Body plus horizontal margins is `8in`, within the `8.5in` page width.

### Controlled Region page breaks

5. In **Row Groups**, right-click the outer dynamic **Region** group—not `Region1`, `Details`, a subtotal member, or Grand Total—and open **Group Properties → Page Breaks**.
6. Enable **Between each instance of a group**. Do not add a break before the first Region, after the last Region, on Region1, on Details, or on the Grand Total member.

### Repeating column headers

7. Select the tablix and first use the supported **Tablix Properties** option **Repeat header rows on each page**, if available.
8. In the Row Groups pane menu, enable **Advanced Mode**. Select the static member that corresponds to the column-header row and set these properties through Report Builder's Properties pane:
   - `RepeatOnNewPage = True`
   - `KeepWithGroup = After`
   - `FixedData = True`

   If Report Builder exposes nested static members for the two row-header columns, preserve their existing nesting and use the UI to configure only the member(s) Report Builder identifies as the header row. Do not add, delete, reorder, or hand-create members.

### Page numbering

9. In the existing page footer, use the expression editor to replace the execution-time textbox value with:

   ```vb
   ="Page " & Globals!PageNumber & " of " & Globals!TotalPages
   ```

   Keep it in the page footer and retain right alignment. Do not place page-number globals in the report body.

### Report Builder verification and canonical save

10. Preview and confirm:
    - the report has multiple pages;
    - Central, East, and West begin on controlled Region pages;
    - the column header repeats on every later Region page;
    - page labels run consecutively as `Page N of M` and `M` equals the Preview page count;
    - all six details, three Region subtotals, and the single Grand Total remain correct;
    - the Grand Total appears exactly once after all Region groups; and
    - there is no unexpected blank page or horizontal page overflow.

11. Export to PDF. Verify page count, repeated headers, Region breaks, page numbers, no clipped columns, no unexpected blank pages, and the final Grand Total.
12. Export to Excel (`.xlsx`). Verify all nine fields remain legible in a tabular layout; every detail appears once; Region subtotals and Grand Total remain numeric and correct; dates/numbers/currency retain usable types or formats; no columns or rows are silently omitted; and Region page breaks do not produce empty worksheets.
13. Save as:

    `samples/report-builder-seeds/KnownGoodProductionPagination.rdl`

14. Close Report Builder, reopen the exact saved RDL, Preview again, and repeat the multiple-page/header/page-number/Region-break checks. Reopen validation is mandatory.
15. Record:
    - Report Builder version;
    - RDL SHA-256;
    - actual Preview and PDF page counts;
    - page on which each Region and the Grand Total begins;
    - `git check-attr text` result (`text: unset` expected);
    - Design screenshot with Advanced Mode and header member selected;
    - Preview screenshots of every page;
    - PDF page screenshots;
    - Excel worksheet screenshots and sheet names; and
    - every warning or error dialog.

16. Commit and push only the validated RDL seed to `spike/first-real-rdl-generation`. Do not commit PDF or Excel exports unless they are separately confirmed sanitized and requested for evidence.

After this accepted seed exists, Candidate 06 can be generated with a forensic/template-derived method. Candidate 06 must then undergo separate independent Windows Preview, PDF, and Excel validation before the ladder ends.
