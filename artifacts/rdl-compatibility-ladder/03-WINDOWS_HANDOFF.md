# Candidate 03 Windows validation

## Result

**FAIL — independently rejected on Windows.** Report Builder failed before Design view with `Index was out of range. Must be non-negative and less than the size of the collection. Parameter name: index`. Preview and Region grouping were not reached or tested. The candidate remains preserved as failure evidence and must not be modified by hierarchy guesswork.

## Acceptance criterion

Candidate 03 did not meet its acceptance criterion. Do not use it as a compatibility baseline.

## File identity

- Candidate: `artifacts/rdl-compatibility-ladder/03-region-group.rdl`
- SHA-256: `5dd58b2d5acd39a66bc734e16956a592f1c84afa9ae7080101f7003030661c0b`
- Direct baseline: accepted `02-detail-columns.rdl`
- Baseline SHA-256: `c5c86b7f7f9aa90dbd101f5d8a637c715ae8e3e36d5a6d3a2095f0617a0d5c8b`

## Exact Windows steps

1. Clone or update `spike/first-real-rdl-generation` on Windows.
2. Verify Candidates 01–03 in PowerShell:

   ```powershell
   Get-FileHash ".\artifacts\rdl-compatibility-ladder\01-minimal-enter-data-table.rdl" -Algorithm SHA256
   Get-FileHash ".\artifacts\rdl-compatibility-ladder\02-detail-columns.rdl" -Algorithm SHA256
   Get-FileHash ".\artifacts\rdl-compatibility-ladder\03-region-group.rdl" -Algorithm SHA256
   ```

3. Launch Power BI Report Builder and open `03-region-group.rdl` using **File → Open → This PC → Browse**.
4. Record whether it opens without an exception, repair, conversion, or upgrade request.
5. In Design view, confirm:
   - the title remains `RDL Compatibility Test`;
   - `SeedData` retains all nine Candidate 02 fields and six rows;
   - the tablix has its column-header row, a distinct Region group-header row, and a detail row;
   - the Row Groups pane shows Region containing Details; and
   - no total row, aggregate expression, page break, parameter, or new header/footer is present.

6. Capture a full-window Design screenshot showing the table and Row Groups pane.
7. Select **Run**. Expand inherited controls if needed to expose all detail rows.
8. Confirm alphabetical group order and the detail ordering below:
   - **Central**
     - 2026-01-05 — Avery Brooks
     - 2026-02-03 — Jordan Lee
   - **East**
     - 2026-01-07 — Morgan Chen
     - 2026-02-06 — Riley Patel
   - **West**
     - 2026-01-09 — Casey Rivera
     - 2026-02-14 — Taylor Kim

9. Confirm all nine detail fields remain visible for every row, existing date/whole-number/currency formatting still renders, and no `#Error` or missing-reference result appears.
10. Confirm the report remains inside the page body. Candidate 02's narrow-column clipping may remain; layout polish is not this gate.
11. Capture full-window Preview screenshots showing all three Region headers and all six detail rows. Capture every error dialog in full and copy all available details.
12. Close Report Builder and select **No** if prompted to save.

## Return evidence

- Candidate 01, 02, and 03 SHA-256 values from Windows.
- Report Builder version.
- Open, Design, embedded-data execution, Preview, Region grouping, Region ordering, detail ordering, six-row, nine-field, formatting, page-body, and repair/conversion results.
- Design, Preview, and any error screenshots.

Do not test exports, add totals, or advance the ladder during this validation.
