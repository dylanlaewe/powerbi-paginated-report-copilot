# Simple table source-validation worksheet

Gate 2B is complete. The authoritative completed record, including serialized deviations discovered during read-only ingestion, is `../../validation/source-validation.md`.

## Identity and authorship

- Source path: `examples/rdl-structure-corpus/simple-table/source/synthetic-inventory-detail.rdl`
- Source SHA-256: `e3a34afe7c29c9f773098d9f5bfd65ad2cf60219f78999d46a447250bb2448e3`
- Root RDL namespace: `http://schemas.microsoft.com/sqlserver/reporting/2016/01/reportdefinition`
- File size in bytes: `21,402`
- Report Builder version: `15.7.1819.28`
- Authored by Dylan from a blank report: YES
- Personally controlled Windows 11 VM: YES
- Enter Data only; five fictional rows: YES
- No copied report, proprietary content, credentials, or live connection: YES
- Personally owned and contributed under the repository MIT license: YES

## Structural verification

- Dataset name `InventoryData`: PASS
- Fields and types match the guide: DEVIATION — all fields serialized as `System.String`
- Exactly five embedded rows: PASS
- Visible title and reported formatting: PASS in Windows; XML separates the exact title from the styled title textbox
- Title item names: `ReportTitle` contains `InventoryReportTitle`; `Textbox9` contains the accepted visible title
- Table item name `InventoryTable`: PASS
- Detail names recorded: `DetailItem`, `DetailWarehouse`, `DetailUnit`, `DetailUnitCose`
- Unit Cost detail name `DetailUnitCost`: DEVIATION — serialized as `DetailUnitCose`
- Letter portrait and four 0.5in margins: PASS in Windows; width/height are omitted in XML

## Runtime and export evidence

- Initial Preview: PASS
- Preview after close/reopen: PASS
- Preview page count: 1
- Five rows visible exactly once: PASS
- Units and Unit Cost formats: PASS
- PDF export: PASS
- PDF page count: 1
- PDF blank pages or clipping: NONE
- Excel export: PASS
- Excel worksheet count: 1
- Excel repair warning: NONE
- Excel rows and numeric cells preserved: PASS
- Repair, conversion, or upgrade warnings: NONE

## Acceptance

- Baseline accepted: YES WITH RECORDED DEVIATIONS
- Deviations from guide: See `../../validation/source-validation.md`
- Screenshot/export evidence locations: independently retained by Dylan
- Recorded by and date: Dylan / 2026-07-23
