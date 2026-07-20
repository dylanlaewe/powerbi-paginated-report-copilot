# Candidate 04 Windows validation

## Acceptance criterion

Power BI Report Builder must open and preview `04-region-subtotal.rdl` with three correct Region subtotal rows and all six detail rows preserved. Do not generate Candidate 05.

## File identity

- Candidate: `artifacts/rdl-compatibility-ladder/04-region-subtotal.rdl`
- SHA-256: `7621061880e0ee201dd34fd5931c1a86dc44dcb0997fc2b530521b069fbba8fe`
- Direct baseline: accepted `03b-region-group-from-seed.rdl`
- Baseline SHA-256: `f85dfd067e037336cb9a7fe7f5245b19a2030b01e2a997f0430a34b1f5090b88`

## Exact Windows steps

1. Clone or update `spike/first-real-rdl-generation` on Windows.
2. Verify Candidate 03b and Candidate 04 in PowerShell:

   ```powershell
   Get-FileHash ".\artifacts\rdl-compatibility-ladder\03b-region-group-from-seed.rdl" -Algorithm SHA256
   Get-FileHash ".\artifacts\rdl-compatibility-ladder\04-region-subtotal.rdl" -Algorithm SHA256
   ```

3. Launch Power BI Report Builder and open `04-region-subtotal.rdl` using **File → Open → This PC → Browse**.
4. Confirm there is no exception, repair, conversion, or upgrade request.
5. In Design view, confirm:
   - all nine fields and six embedded rows remain in `SeedData`;
   - Row Groups still show `Region → Region1 → Details`;
   - one static member follows Region1 inside Region;
   - the body has column-header, detail, and subtotal rows;
   - the subtotal row contains a five-column label cell followed by Quantity, Revenue, and GrossProfit cells;
   - all three aggregate expressions explicitly use scope `"Region"`; and
   - no grand total, page break, parameter, or new header/footer is present.

6. Capture a full-window Design screenshot showing the table, Row Groups pane, and subtotal expressions.
7. Select **Run** and expand controls if necessary.
8. Confirm all six detail rows remain under their correct Region headers and exactly these three subtotal rows render:

   | Label         | Quantity |   Revenue | GrossProfit |
   | ------------- | -------: | --------: | ----------: |
   | Central Total |       17 | $3,850.00 |   $1,940.00 |
   | East Total    |       11 | $8,230.00 |   $2,340.00 |
   | West Total    |       43 | $6,180.00 |   $1,820.00 |

9. Confirm each subtotal appears once, after its Region's detail rows. Confirm no report-level total appears.
10. Confirm Quantity uses whole-number formatting, Revenue/GrossProfit use currency formatting, and no `#Error`, scope, or reference error appears.
11. Record actual pagination or horizontal overflow. Candidate 04 preserves Candidate 03b's accepted 7-inch width.
12. Capture full-window collapsed and expanded Preview screenshots showing all three subtotals and six details. Capture every error dialog and complete detail text.
13. Close Report Builder and select **No** if prompted to save.

## Return evidence

- Candidate 03b and Candidate 04 Windows hashes.
- Report Builder version.
- Open, Design, Preview, grouping, six-detail-row, three-subtotal-row, aggregate values, formatting, no-grand-total, pagination/width, and repair/conversion results.
- Design, Preview, and any error screenshots.

Do not test exports or advance the ladder during this validation.
