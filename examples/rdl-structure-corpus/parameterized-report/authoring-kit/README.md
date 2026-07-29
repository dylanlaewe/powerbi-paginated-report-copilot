# Parameterized report authoring guide

Create this report personally from a blank report. Use only the two supplied UTF-8 tab-delimited files through Enter Data.

## Schemas

`BudgetData` — exactly six rows:

| Field          | Type                       | Format |
| -------------- | -------------------------- | ------ |
| `RegionCode`   | Text (`System.String`)     | text   |
| `Program`      | Text (`System.String`)     | text   |
| `Quarter`      | Text (`System.String`)     | text   |
| `BudgetAmount` | Decimal (`System.Decimal`) | `C2`   |
| `MetricValue`  | Decimal (`System.Decimal`) | `N1`   |

`RegionLookup` — exactly three rows:

| Field         | Type                       |
| ------------- | -------------------------- |
| `RegionCode`  | Text (`System.String`)     |
| `RegionLabel` | Text (`System.String`)     |
| `MetricValue` | Decimal (`System.Decimal`) |

The duplicate `RegionCode` and `MetricValue` declarations are intentional. Do not rename or remove them.

Expected filtered results:

| Parameter                             | Rows | Budget total |
| ------------------------------------- | ---: | -----------: |
| CEN                                   |    2 |  $205,000.00 |
| NTH                                   |    2 |  $192,500.00 |
| STH                                   |    2 |  $180,000.00 |
| All source rows, for cross-check only |    6 |  $577,500.00 |

## Construction

1. Create **Blank Report**. Enter `budget-data.tsv` as `BudgetData`, verify five fields and six rows, then enter `region-lookup.tsv` separately as `RegionLookup`, verifying three fields and three rows.
2. Create a Text report parameter named `RegionCode` with prompt `Region`.
3. Configure **Available Values** from a query: dataset `RegionLookup`, value field `RegionCode`, label field `RegionLabel`.
4. Configure the default value as `CEN`. Do not allow blank, null, or multiple values.
5. Insert one table bound to `BudgetData` with columns Region Code, Program, Quarter, Budget Amount, and Metric Value.
6. Name it `BudgetTable`. Name detail textboxes `DetailRegionCode`, `DetailProgram`, `DetailQuarter`, `DetailBudgetAmount`, and `DetailMetricValue` where permitted.
7. Add a tablix filter: expression `RegionCode`, operator **Equal**, value the `RegionCode` report parameter. Build this through the expression dialog rather than by editing XML.
8. Sort details by Program ascending.
9. Add exactly one grand-total row outside Details using Report Builder's total command. Label it `Grand Total`; sum `BudgetAmount` in the Budget Amount column. Name that aggregate textbox `BudgetGrandTotal`.
10. Format detail and total Budget Amount as `C2`; format Metric Value as `N1`.
11. Add a top-level body textbox above the table with exact title `Synthetic Regional Budget`; name it `BudgetReportHeading`; format it 18pt bold.
12. Do not place parameter text in the title. Do not add a page header/footer, group subtotal, page break, chart, image, or second tablix.
13. Set Letter portrait (`8.5in` × `11in`), four `0.5in` margins, and body width no greater than `7.5in` (target `7in`).
14. Preview with the default CEN value and verify two rows and $205,000.00.
15. Preview NTH and verify two rows and $192,500.00; then STH and verify two rows and $180,000.00. Return the parameter to CEN before saving.
16. Save to `examples/rdl-structure-corpus/parameterized-report/source/synthetic-regional-budget.rdl`.
17. Close, reopen, Preview all three values again, and record warnings and actual page count.
18. With CEN selected, export PDF and Excel. Open both, record actual counts, verify only the two CEN rows and total, and note blank pages, clipping, repair warnings, and numeric preservation.
19. Close without saving after validation if prompted, then hash the exact saved source.

Expected baseline: two embedded datasets, one single-value parameter backed by `RegionLookup`, one filtered detail tablix, exactly one filtered grand total, and no live connection or credential.
