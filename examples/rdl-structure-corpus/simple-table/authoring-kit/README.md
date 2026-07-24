# Simple table authoring guide

Create this fixture first. The result must be personally authored from a blank report in Microsoft Power BI Report Builder. Do not start from an existing report or copy any report item from another RDL.

## Before opening Report Builder

1. Work only in the personally controlled Windows 11 Parallels VM.
2. Copy `inventory-data.tsv` to Windows without changing its UTF-8 encoding.
3. Open the file in a UTF-8-aware editor, select all five data rows plus the header row, and copy them.
4. Do not use a company or customer report, data source, query, name, brand, or layout.

## Exact schema and rows

Dataset name: `InventoryData`

| Position | Field       | Report Builder data type   | Values                |
| -------- | ----------- | -------------------------- | --------------------- |
| 1        | `Item`      | Text (`System.String`)     | fictional item names  |
| 2        | `Warehouse` | Text (`System.String`)     | fictional depot names |
| 3        | `Units`     | Integer (`System.Int32`)   | whole numbers         |
| 4        | `UnitCost`  | Decimal (`System.Decimal`) | decimal numbers       |

The authoritative rows are in `inventory-data.tsv`. There must be exactly five rows. Expected `Units` sum: **65**.

## Click-by-click construction

Report Builder labels can vary slightly by version. If a named command is not visible, use the equivalent command in the ribbon or the Report Data pane; do not hand-edit XML.

1. Open **Microsoft Power BI Report Builder**.
2. Choose **Blank Report**. Do not choose a wizard template or open an existing file.
3. In the **Home** ribbon, choose **Enter Data**. If it is not on Home, right-click **Datasets** in the Report Data pane and choose the Enter Data option.
4. Click the upper-left cell in the Enter Data grid and paste the copied tab-delimited content.
5. Confirm that four columns and exactly five data rows appear. Remove any accidental blank row.
6. Set the dataset name to `InventoryData`.
7. Confirm or set the types as follows: `Item` Text, `Warehouse` Text, `Units` Integer, and `UnitCost` Decimal. If the Enter Data dialog infers types, inspect the resulting dataset fields and verify the corresponding .NET types before continuing.
8. Finish the Enter Data dialog. Under **Datasets**, verify `InventoryData` and the four fields.
9. Choose **Insert > Table > Insert Table** and draw one table in the report body.
10. Populate the detail cells from left to right with `Item`, `Warehouse`, `Units`, and `UnitCost`. Use the field picker or drag each field from `InventoryData`; do not type field expressions manually.
11. Verify that the header row reads `Item`, `Warehouse`, `Units`, and `Unit Cost`, in that order.
12. Select the table and, in the Properties pane, set **Name** to `InventoryTable`.
13. Select the four detail textboxes and set their names, where the Properties pane permits it, to `DetailItem`, `DetailWarehouse`, `DetailUnits`, and `DetailUnitCost`.
14. Select the `Units` detail textbox and set **Number > Custom** to `0`.
15. Select the `UnitCost` detail textbox and set **Number > Currency** with two decimal places. Verify the format property is `C2` or an equivalent Report Builder currency format with two decimals.
16. Choose **Insert > Text Box** and draw a textbox above the table, directly in the body rather than inside the table.
17. Enter the exact title `Synthetic Inventory Detail`.
18. Set the title textbox name to `InventoryReportTitle`, where naming is permitted.
19. Format the title as **18pt**, **Bold**, left aligned. Keep it wider than any single table column so it is visibly the report title.
20. Do not add a page header, page footer, parameter, group, subtotal, total row, chart, image, rectangle, or page break.
21. Open **Report Properties > Page Setup** and set:
    - Paper size: Letter
    - Width: `8.5in`
    - Height: `11in`
    - Orientation: Portrait
    - Left, right, top, and bottom margins: `0.5in`
22. Keep the body width at or below `7.5in`; target `7in`. Ensure the right edge of the table stays inside the body.
23. Choose **Run** or **Preview**.
24. Confirm five rows render once, fields are in the required order, Units are whole numbers, Unit Cost is currency with two decimals, and no `#Error` appears.
25. Record the actual preview page count in `source-validation.md`; do not assume it is one page.
26. Return to Design view and choose **File > Save As**.
27. Save exactly as `synthetic-inventory-detail.rdl`.
28. Place the resulting file at `examples/rdl-structure-corpus/simple-table/source/synthetic-inventory-detail.rdl` when transferring it back to the repository. Gate 2A does not create this file or directory.
29. Close the report, reopen the saved RDL in Report Builder, and run Preview again. Record any repair, conversion, or upgrade message verbatim.
30. From Preview, export to **PDF**. Open the PDF, count its pages, and check all five rows, title, and numeric formats.
31. Export separately to **Excel**. Open the workbook, record the worksheet count and any repair warning, and confirm the five rows and numeric cells.
32. Close Report Builder using **Don't Save** after validation if it offers to rewrite the file. Hash the exact saved source bytes after the final close.

## Baseline expectation

- One body title: `Synthetic Inventory Detail`
- One embedded dataset: `InventoryData`
- One ungrouped four-column detail table
- Five rows; Units sum to 65
- `Units` shown as whole numbers; `UnitCost` shown as currency with two decimals
- Letter portrait, four 0.5-inch margins, body no wider than 7.5 inches
- No parameters, groups, totals, page breaks, page header, or page footer
- Preview, PDF export, Excel export, close/reopen, and second Preview all succeed without repair or conversion

Complete `source-validation.md` using observed values only.
