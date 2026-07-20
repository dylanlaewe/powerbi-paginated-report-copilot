# Candidate 02 Windows validation

## Acceptance criterion

Power BI Report Builder must open and preview `02-detail-columns.rdl` with all six rows and all nine fields displayed correctly. Do not test or advance Candidate 03.

## File identity

- File: `artifacts/rdl-compatibility-ladder/02-detail-columns.rdl`
- SHA-256: `c5c86b7f7f9aa90dbd101f5d8a637c715ae8e3e36d5a6d3a2095f0617a0d5c8b`
- Direct baseline: accepted `01-minimal-enter-data-table.rdl`
- Baseline SHA-256: `151274f425f20e1bd88a7a8f892fca799f9efe9184b1df42e9cec53ab2e016a7`

## Exact Windows steps

1. Clone or update `spike/first-real-rdl-generation` on Windows.
2. Verify both immutable identities in PowerShell:

   ```powershell
   Get-FileHash ".\artifacts\rdl-compatibility-ladder\01-minimal-enter-data-table.rdl" -Algorithm SHA256
   Get-FileHash ".\artifacts\rdl-compatibility-ladder\02-detail-columns.rdl" -Algorithm SHA256
   ```

3. Launch Power BI Report Builder.
4. Open `02-detail-columns.rdl` using **File → Open → This PC → Browse**.
5. Record whether it opens without an exception, repair, conversion, or upgrade request.
6. In Design view, confirm:
   - title: `RDL Compatibility Test`;
   - embedded data source and dataset: `SeedData`;
   - fields: SaleDate, Region, Salesperson, Customer, Product, Category, Quantity, Revenue, and GrossProfit;
   - one tablix with Region in the row-header area and the other eight fields as visible columns; and
   - the inherited execution-time footer remains present.

7. Capture a full-window Design screenshot showing the field list, title, and table.
8. Select **Run**. If Region rows appear collapsed, use the inherited expand controls so all details are visible.
9. Confirm all six rows below. Row ordering may be grouped/sorted by Region:

   | SaleDate   | Region  | Salesperson  | Customer         | Product            | Category        | Quantity | Revenue | GrossProfit |
   | ---------- | ------- | ------------ | ---------------- | ------------------ | --------------- | -------: | ------: | ----------: |
   | 2026-01-05 | Central | Avery Brooks | Northwind Health | Ergo Desk          | Furniture       |        2 |   1,750 |         560 |
   | 2026-02-03 | Central | Jordan Lee   | Bright Labs      | Analytics License  | Software        |       15 |   2,100 |       1,380 |
   | 2026-01-07 | East    | Morgan Chen  | Atlas Finance    | Laptop Pro         | Technology      |        4 |   5,920 |       1,640 |
   | 2026-02-06 | East    | Riley Patel  | Metro Legal      | File Cabinet       | Furniture       |        7 |   2,310 |         700 |
   | 2026-01-09 | West    | Casey Rivera | Pioneer Energy   | Mobile Workstation | Technology      |        3 |   5,460 |       1,490 |
   | 2026-02-14 | West    | Taylor Kim   | Orchard Markets  | Label Roll         | Office Supplies |       40 |     720 |         330 |

10. Confirm dates render readably, Quantity renders as a whole number, and Revenue/GrossProfit render as currency. Confirm the report remains on one page if the local renderer permits.
11. Capture full-window collapsed and expanded Preview screenshots. Capture every error dialog in full and copy all available detail text.
12. Close Report Builder and select **No** if prompted to save, preserving the committed candidate bytes.

## Return evidence

- Both Windows SHA-256 values.
- Report Builder version.
- Open, Design, embedded-data execution, Preview, six-row verification, nine-field verification, formatting, and one-page results.
- Repair/conversion/upgrade result.
- Design, collapsed Preview, expanded Preview, and any error screenshots.

Do not test exports, add totals, or generate later ladder candidates during this gate.
