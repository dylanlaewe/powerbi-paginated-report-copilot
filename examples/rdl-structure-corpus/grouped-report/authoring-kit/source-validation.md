# Grouped report source-validation worksheet

Gate 2C is complete. The authoritative detailed record is `../../validation/source-validation.md`.

- Source path: `examples/rdl-structure-corpus/grouped-report/source/synthetic-department-sales.rdl`
- Source SHA-256: `03c7a6eacd6b003aeaace0264a361267ce208de6388420f0d465608f3540174b`
- Root RDL namespace: `http://schemas.microsoft.com/sqlserver/reporting/2016/01/reportdefinition`
- File size / Report Builder version: `52,651` / `15.7.1819.28`
- Dylan personally authored from Blank Report in controlled Windows VM: YES
- Enter Data only; 8 fictional rows; no copied/proprietary/credentialed/live source: YES
- Personally owned and MIT-licensed contribution confirmed: YES
- Dataset, field identities, and row count: PASS
- Actual types: DateTime, String, String, Int32, Double
- Title text/style/name `ReportTitle`: PASS — `Synthetic Department Sales Summary`, 18pt Bold
- Department → Details hierarchy and Department ascending sort: PASS
- Detail names: `DetailSaleDate`, `DetailRepresentative`, `DetailUnits`, `DetailRevenue`
- `DepartmentRevenueSubtotal` / `ReportRevenueTotal`: PASS
- Four expected subtotals and Grand Total: PASS
- Between-group page breaks and repeated headings: PASS
- Letter portrait, 0.5in margins, print-safe width: PASS in Windows; dimensions omitted in XML
- Initial Preview / reopen Preview: PASS / PASS
- Preview page count: 4
- PDF result and page count: PASS / 4
- PDF blank pages or clipping: NONE
- Excel result and worksheet count: PASS / 4
- Excel repair warning and numeric preservation: NONE / PASS
- Repair/conversion/upgrade warnings: NONE
- Baseline accepted and deviations: YES WITH RECORDED DEVIATIONS / see authoritative record
- Evidence locations, recorder, and date: independently retained by Dylan / Dylan / 2026-07-27
