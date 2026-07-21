# Candidate 03b Windows validation

## Result

**PASS WITH INTEGRITY FOLLOW-UP — functionally accepted on Windows as the canonical grouped compatibility baseline.** Report Builder opened without repair/conversion/upgrade; Design and Preview succeeded on one page; and Central, East, West plus all six correctly sorted detail rows rendered without duplication, omission, `#Error`, or reference failure. The Windows working-tree hash was `347771…047d`, not the repository hash. LF-to-CRLF conversion reproduces that exact value. `.rdl` files are now marked `-text` to preserve raw bytes. Generalized programmatic group construction remains unproven.

## Acceptance criterion

Power BI Report Builder opened and previewed `03b-region-group-from-seed.rdl` with all six rows under the correct Region headers. This gate is complete.

## File identity and provenance

- Candidate: `artifacts/rdl-compatibility-ladder/03b-region-group-from-seed.rdl`
- Candidate SHA-256: `f85dfd067e037336cb9a7fe7f5245b19a2030b01e2a997f0430a34b1f5090b88`
- Canonical source: `samples/report-builder-seeds/KnownGoodRegionGroup.rdl`
- Source SHA-256: `f85dfd067e037336cb9a7fe7f5245b19a2030b01e2a997f0430a34b1f5090b88`
- Derivation: byte-for-byte copy; `cmp` exit code 0.

The source seed was manually authored from accepted Candidate 02 in Power BI Report Builder and independently opened and previewed successfully. This gate verifies the separately named, committed handoff artifact without altering it.

## Exact Windows steps

1. Clone or update `spike/first-real-rdl-generation` on Windows.
2. Verify the grouped seed and Candidate 03b hashes in PowerShell:

   ```powershell
   Get-FileHash ".\samples\report-builder-seeds\KnownGoodRegionGroup.rdl" -Algorithm SHA256
   Get-FileHash ".\artifacts\rdl-compatibility-ladder\03b-region-group-from-seed.rdl" -Algorithm SHA256
   ```

   Both must equal `F85DFD067E037336CB9A7FE7F5245B19A2030B01E2A997F0430A34B1F5090B88`.

3. Launch Power BI Report Builder and open `03b-region-group-from-seed.rdl` using **File → Open → This PC → Browse**.
4. Confirm there is no exception, repair, conversion, or upgrade request.
5. In Design view, confirm:
   - title `RDL Compatibility Test`;
   - embedded `SeedData` with all nine fields and six rows;
   - two tablix body rows: column header and detail;
   - Row Groups hierarchy `Region → Region1 → Details`;
   - Region group headers are in the row-header hierarchy rather than a merged body row;
   - no subtotal, grand total, page break, parameter, or new header/footer.

6. Capture a full-window Design screenshot showing the table and Row Groups pane.
7. Select **Run** and expand controls if necessary.
8. Confirm all six rows appear beneath the correct Region headers in this order:
   - **Central**
     - 2026-01-05 — Avery Brooks
     - 2026-02-03 — Jordan Lee
   - **East**
     - 2026-01-07 — Morgan Chen
     - 2026-02-06 — Riley Patel
   - **West**
     - 2026-01-09 — Casey Rivera
     - 2026-02-14 — Taylor Kim

9. Confirm all nine detail fields render, existing date/number/currency formatting works, and no `#Error` or missing-reference result appears.
10. Record pagination or horizontal overflow exactly as rendered. The 7-inch width is preserved verbatim from the independently accepted Report Builder seed and is not changed in this compatibility gate.
11. Capture full-window collapsed and expanded Preview screenshots plus every error dialog and its complete details.
12. Close Report Builder and select **No** if prompted to save.

## Return evidence

- Both Windows SHA-256 values.
- Report Builder version.
- Open, Design, Preview, group hierarchy, Region ordering, detail ordering, six-row, nine-field, formatting, pagination/width, and repair/conversion results.
- Design, collapsed Preview, expanded Preview, and any error screenshots.

Do not test exports or advance the ladder during this validation.
