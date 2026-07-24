# Grouped report authoring guide

Create this report personally from a new blank Report Builder report. Use only `department-sales.tsv` through Enter Data.

## Dataset

Name: `DepartmentSales`; exactly eight rows.

| Field            | Type                          | Format |
| ---------------- | ----------------------------- | ------ |
| `SaleDate`       | Date/Time (`System.DateTime`) | `d`    |
| `Department`     | Text (`System.String`)        | text   |
| `Representative` | Text (`System.String`)        | text   |
| `Units`          | Integer (`System.Int32`)      | `0`    |
| `Revenue`        | Decimal (`System.Decimal`)    | `C2`   |

Expected totals:

| Department     | Units |    Revenue |
| -------------- | ----: | ---------: |
| Design         |    13 |  $3,390.00 |
| Field Services |    18 |  $4,620.00 |
| Operations     |    23 |  $5,550.00 |
| Research       |    11 |  $5,650.00 |
| Grand Total    |    65 | $19,210.00 |

## Construction

1. Create **Blank Report**, choose **Enter Data**, paste `department-sales.tsv`, name the dataset `DepartmentSales`, and verify the five types above.
2. Insert one table with columns in this order: Sale Date, Department, Representative, Units, Revenue.
3. Name the tablix `DepartmentSalesTable`. Name the detail textboxes `DetailSaleDate`, `DetailDepartment`, `DetailRepresentative`, `DetailUnits`, and `DetailRevenue` where permitted.
4. Set Sale Date to `d`, Units to `0`, and Revenue to `C2`.
5. In the Row Groups pane, right-click **Details**, choose **Add Group > Parent Group**, group on `Department`, and select **Add group header**. Name the group `Department`.
6. In the new group-header row, merge the five cells and display the Department field. Keep it visually distinct with bold text and a light neutral fill.
7. Sort the Department group ascending by `Department`. Sort Details first by `SaleDate` ascending, then by `Representative` ascending.
8. Use Report Builder's **Add Total > After** command on the Department group. Do not construct the subtotal row by editing XML.
9. Label the subtotal `[Department] Total`. Put `Sum(Units)` and `Sum(Revenue)` in their columns, explicitly scoped to the Department group if Report Builder exposes scope. Name the Revenue textbox `DepartmentRevenueSubtotal`.
10. Use Report Builder's total command to add exactly one total row outside all Department instances. Label it `Grand Total`; sum Units and Revenue. Name the Revenue textbox `ReportRevenueTotal`.
11. Preserve the Details member beneath the Department group. Do not add another dynamic group.
12. Set the outer Department group to page break **Between each instance**.
13. Configure the static column-heading member to repeat on new pages using Report Builder's grouping/advanced-mode properties. Preserve any companion `KeepWithGroup`, `RepeatOnNewPage`, or `FixedData` values authored by Report Builder.
14. Add a body textbox above the tablix with exact text `Synthetic Department Sales`; name it `DepartmentSalesTitle`; format it 18pt bold.
15. Add no page header or footer. Add no parameters, charts, images, rectangles, or other totals.
16. Set Letter portrait (`8.5in` × `11in`), four `0.5in` margins, and body width no greater than `7.5in` (target `7in`).
17. Preview and confirm four alphabetically ordered departments, two details beneath each, the exact totals above, repeated column headings after page breaks, and no `#Error`.
18. Save to `examples/rdl-structure-corpus/grouped-report/source/synthetic-department-sales.rdl`.
19. Close, reopen, and Preview again. Record actual page count and any warning.
20. Export PDF and Excel; open both, record actual page/worksheet counts, confirm all eight details and totals, and record blank pages, clipping, or workbook repair.
21. Close without saving after validation if prompted, then hash the untouched saved source.

Expected baseline: one embedded dataset, one grouped tablix, Department → Details hierarchy, four group subtotals, one grand total, between-group page breaks, repeating headings, and the title and formats above.
