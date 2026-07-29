# Alternate-layout report authoring guide

Create this report personally from a blank Report Builder report. The unusual placement and item names are intentional resolver evidence; do not normalize them.

## Dataset

Name: `ProjectCosts`; exactly six rows from `project-costs.tsv`.

| Field         | Type                       | Format |
| ------------- | -------------------------- | ------ |
| `ProjectCode` | Text (`System.String`)     | text   |
| `Category`    | Text (`System.String`)     | text   |
| `Owner`       | Text (`System.String`)     | text   |
| `Cost`        | Decimal (`System.Decimal`) | `C2`   |

Expected category totals: Facilities $72,000.00; Operations $61,500.00; Research $80,500.00. Cross-check grand total: $214,000.00. Do not display a grand total in this fixture.

## Construction

1. Create **Blank Report**, enter `project-costs.tsv` through **Enter Data**, name it `ProjectCosts`, and verify the schema and six rows.
2. Set Letter landscape: width `11in`, height `8.5in`, and all margins `0.5in`. Keep body width at or below `10in` (target `9.5in`).
3. Add a page header. Insert a textbox there with exact title `Synthetic Project Cost Landscape`; name it `HdrMainCaption`; format it 18pt bold.
4. Add a page footer with one centered textbox named `FtrPageCaption`. Use Report Builder's expression builder to render `Synthetic fixture | Page N of M` with the built-in page-number and total-page values.
5. In the body, insert a rectangle and name it `CostDetailContainer`.
6. Inside the rectangle add a static body textbox `Project Cost Details`, named `DetailSectionCaption`, at 12pt bold.
7. Inside the same rectangle insert a four-column table bound to `ProjectCosts`, ordered Project Code, Category, Owner, Cost. Name the tablix `CostDetailGrid`.
8. Name its detail textboxes `TxtProjectCode`, `TxtCategoryValue`, `TxtOwnerValue`, and `TxtCostValue` where permitted. Format Cost as `C2`.
9. Keep that table as a simple Details table; do not group it.
10. Outside the rectangle, add a second table bound to `ProjectCosts`, with Category and Cost columns. Name it `CategoryCostSummary`.
11. Add a parent row group on Category and name it `CategorySummaryGroup`. Use Report Builder's grouping UI to show one row per Category; remove the redundant detail row through the designer if necessary.
12. Display Category and `Sum(Cost)` in that group row. Name the aggregate Cost textbox `TxtCategoryCost`; format it `C2`.
13. Sort categories ascending. Do not add a grand total or page break.
14. Add a small static body caption `Category Summary` above the second tablix and name it `CategorySummaryCaption`.
15. Do not add parameters, charts, images, another dataset, or another header/footer item.
16. Preview and verify six detail rows in `CostDetailGrid`, exactly three summary rows in `CategoryCostSummary`, the expected category totals, the header title, and the page footer. Confirm no `#Error`, clipping, or unexpected blank page.
17. Save to `examples/rdl-structure-corpus/alternate-layout/source/synthetic-project-cost-landscape.rdl`.
18. Close, reopen, and Preview again. Record the actual page count and any warning.
19. Export PDF and Excel, open both, record actual page/worksheet counts, and confirm detail and category-summary values. Record blank pages, clipping, or workbook repair.
20. Close without saving after validation if prompted, then hash the exact saved source.

Expected baseline: one embedded dataset, page-header title, page footer, nested detail tablix in a rectangle, separate grouped category-summary tablix, landscape dimensions, six details, three category totals, and no displayed grand total.
