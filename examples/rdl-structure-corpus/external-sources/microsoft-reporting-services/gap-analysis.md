# Official-sample corpus gap analysis

## Selection

| Report                    | Classification       | Reason                                                                                                                                                                                                                                          |
| ------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Country Sales Performance | B — Reference-only   | Excellent landscape, header-title, grouping, aggregate, chart, gauge, visibility, and nested-rectangle evidence, but embedded Code/Code expressions and advanced visuals make direct mutation coverage premature.                               |
| Invoice                   | A — Import candidate | Five embedded datasets, overlapping fields, lookup-driven parameter, filters, three tablixes, nine rectangles including nesting, scoped aggregates, image, header/footer, and visibility provide the strongest realistic compatibility fixture. |
| Labels                    | A — Import candidate | Small self-contained multicolumn report with a parameter and three print columns; isolates a layout not covered by controlled fixtures.                                                                                                         |
| Letter                    | A — Import candidate | Three embedded datasets with overlaps, lookup parameter, three tablixes, five rectangles including nesting, images, and header/footer provide document-layout breadth.                                                                          |
| Organization Expenditures | C — Defer            | Parameter lookup datasets and landscape layout are useful, but the body is chart-only (treemap/sunburst) and does not exercise the current tablix/text-format edit scope.                                                                       |
| Regional Sales            | B — Reference-only   | Strong parameter, lookup-dataset, filter, page-break, landscape, header-title, aggregate, chart, and gauge evidence, but embedded Code/Code expressions require manual review before direct use.                                                |
| Transcript                | A — Import candidate | Two overlapping-field datasets, three tablixes, nested row groups, eight rectangles with depth-two nesting, images, and an expression-based page-header title directly exercise alternate structures.                                           |

No report is rejected for license, provenance, integrity, XML, XSD, or static-security failure.

## Feature coverage matrix

Legend: **D** direct, **P** partial, **N** none, **U** unclear pending later Report Builder validation.

| Requirement                                             | Country | Invoice |         Labels          | Letter |     Org Exp.     | Regional | Transcript |
| ------------------------------------------------------- | :-----: | :-----: | :---------------------: | :----: | :--------------: | :------: | :--------: |
| Simple detail tablix                                    |    P    |    D    |            D            |   D    |        N         |    P     |     D      |
| Semantic row grouping                                   |    D    |    D    |            N            |   N    |    P (charts)    |    D     |     D      |
| Group and dataset aggregate scopes                      |    D    |    D    |            N            |   P    |        N         |    D     |     P      |
| Group page break                                        |    N    |    N    |            N            |   N    |        N         |    D     |     N      |
| Repeated headings                                       |    D    |    D    |            N            |   N    |        N         |    U     |     N      |
| Two or more datasets                                    |    N    |    D    |            N            |   D    |        D         |    D     |     D      |
| Overlapping field names across datasets                 |    N    |    D    |            N            |   D    |        D         |    N     |     D      |
| Lookup dataset supplies parameter values                |    N    |    D    | N (same report dataset) |   D    |        D         |    D     |     N      |
| Main-report dataset separate from lookup                |    N    |    D    |            N            |   D    |        D         |    D     |     N      |
| Parameter-driven main/filter behavior                   |    P    |    D    |            P            |   D    |        D         |    D     |     N      |
| Exact deliberate RegionCode/MetricValue-style ambiguity |    N    |    P    |            N            |   P    |        P         |    N     |     P      |
| Page-header title                                       |    D    |    N    |            N            |   N    |        N         |    D     |     D      |
| Multiple tablixes                                       |    N    |    D    |            N            |   D    |        N         |    N     |     D      |
| Nested rectangles                                       |    D    |    D    |            N            |   D    |        N         |    N     |     D      |
| Landscape with literal dimensions                       |    D    |    U    |            U            |   U    |        D         |    D     |     U      |
| Nonstandard/automatic item names                        |    D    |    D    |            D            |   D    |        D         |    D     |     D      |
| Complex nested row/column groups                        |    D    |    P    |            N            |   N    | D (chart groups) |    P     |     D      |
| Charts/gauges/advanced visuals                          |    D    |    N    |            N            |   N    |        D         |    D     |     N      |
| Multicolumn print layout                                |    N    |    N    |            D            |   N    |        N         |    N     |     N      |
| Images                                                  |    D    |    D    |            N            |   D    |        D         |    D     |     D      |
| Advanced visibility                                     |    D    |    D    |            N            |   N    |        N         |    N     |     N      |

## Specific findings

1. **Overlapping dataset fields:** Invoice, Letter, Organization Expenditures, and Transcript contain overlaps. Examples include Invoice's `Company`, Letter's `Name`/`Address`, Organization Expenditures' key fields, and Transcript's `Name`.
2. **Lookup parameter datasets:** Invoice, Letter, Organization Expenditures, and Regional Sales use one dataset for available values while a different dataset drives primary content.
3. **Deterministic ambiguity:** Several reports contain natural overlap, but none isolates two intentionally duplicated fields with the small, stable expected outcome planned for `RegionCode` and `MetricValue`.
4. **Page-header title:** Country Sales Performance, Regional Sales, and Transcript have suitable header-title evidence.
5. **Multiple tablixes:** Invoice, Letter, and Transcript.
6. **Nested rectangles:** Country Sales Performance, Invoice, Letter, and Transcript.
7. **Landscape:** Country Sales Performance, Organization Expenditures, and Regional Sales serialize `11in × 8.5in`.
8. **Automatic names:** all samples include generic names such as `Textbox1`, `Tablix1`, or `Rectangle1`.
9. **Group/dataset aggregates:** Country Sales Performance, Invoice, and Regional Sales provide direct scoped evidence; Transcript and Letter provide partial aggregate breadth.
10. **Complex groups:** Country Sales Performance and Transcript are strongest; Organization Expenditures has nested chart categories.
11. **Beyond scope:** Country Sales Performance and Regional Sales include Code plus charts/gauges; Organization Expenditures is chart-only; Labels adds multicolumn printing; several reports include images and visibility expressions.

## Controlled-fixture recommendation

### Parameterized ambiguity report

**Narrow to ambiguity-only coverage.** Official Invoice and Regional Sales cover lookup-driven parameters, separate parameter/main datasets, filtering, and realistic multi-dataset behavior. Invoice, Letter, Organization Expenditures, and Transcript cover natural field overlap. None provides the exact isolated condition of two datasets intentionally sharing both `RegionCode` and `MetricValue` with a stable two-row filtered result and total. Retain only that precise deterministic ambiguity experiment; remove redundant general parameter/layout goals.

### Alternate layout

**Narrow to uncovered controlled conditions.** Transcript covers a page-header title, multiple tablixes, deeply nested rectangles, images, nested groups, and automatic names. Country Sales Performance provides literal landscape dimensions and a header title but carries custom Code and advanced visuals. Retain a small controlled fixture combining a static page-header title, literal landscape dimensions, nonstandard names, and deterministic Cost displays; drop any goal whose sole purpose is proving that multiple/nested regions can exist.

## Recommended later order

1. **Invoice** — multi-dataset parameter/filter/overlap and realistic scoped expressions.
2. **Transcript** — page-header title, nested rectangles/groups, multiple tablixes.
3. **Labels** — isolated multicolumn print layout.
4. **Letter** — document-style multi-region, image, parameter, and overlap breadth.

Keep Country Sales Performance and Regional Sales reference-only until a reviewed custom-Code policy exists. Defer Organization Expenditures until chart-aware inspection is in scope.
