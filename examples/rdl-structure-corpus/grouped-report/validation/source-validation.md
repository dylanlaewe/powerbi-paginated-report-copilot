# Grouped-report Gate 2C source validation

## Identity and provenance

- Source: `examples/rdl-structure-corpus/grouped-report/source/synthetic-department-sales.rdl`
- Windows authoring path: `C:\Users\dylanlaewe\Downloads\RdlCorpusV03\simple-table\synthetic-department-sales.rdl` (organizational path deviation only)
- Size: `52,651` bytes
- SHA-256 before and after validation: `03c7a6eacd6b003aeaace0264a361267ce208de6388420f0d465608f3540174b`
- Namespace: `http://schemas.microsoft.com/sqlserver/reporting/2016/01/reportdefinition`
- Authoring metadata: PBIRB `15.7.1819.28`
- Windows original and repository copy hash match: PASS
- Personally authored by Dylan from a blank report in a personally controlled Windows 11 VM: YES
- Enter Data with eight fictional rows only: YES
- No copied, employer, customer, proprietary, credentialed, or live-source material: YES
- Personally owned and contributed under the repository MIT license: YES
- Gate 2C modified the source: NO

## Static validation

- Safe XML parse using `libxml2-wasm` with network and external-entity access disabled: PASS
- XML well-formedness: PASS
- Microsoft RDL 2016/01 XSD using `libxml2-wasm`: PASS
- Stable inventory derivation: PASS
- Generic sidecar inspection/resolution: NOT EVALUATED. Literal PageWidth/PageHeight are omitted, so the current generic inspector stops before inventory. Gate 2C does not broaden it.

## Data and structure

- Data source: `DataSource1`, provider `ENTERDATA`, blank connection string
- Dataset: `DepartmentSales`
- Serialized fields: SaleDate `System.DateTime`, Department `System.String`, Representative `System.String`, Units `System.Int32`, Revenue `System.Double`
- Designer types: Date, String, String, Integer, Float
- Embedded dimensions: 8 rows × 5 columns
- Departments: Design, Field Services, Operations, Research; two rows each
- Parameters/charts: 0 / 0
- Tablix: `DepartmentSalesTable`, 4 body columns × 5 body rows, 1-inch row-header region, 5-inch total width
- Textboxes: 26

Hierarchy:

- Static Department column header: `Textbox48`
- Semantic group: `Department`, expression and ascending sort `=Fields!Department.Value`
- Department header: `Department`
- Implicit child group: `Details`
- Department subtotal member: `Textbox63`, within `Department`, `KeepWithGroup=Before`
- Grand Total member: `Textbox64`, top-level outside `Department`, `KeepWithGroup=Before`

Aggregates:

- Department subtotal row: `Textbox54` Units `0`; `DepartmentRevenueSubtotal` Revenue `C2`
- Grand Total row: `Textbox67` Units `0`; `ReportRevenueTotal` Revenue `C2`
- All four expressions use `Sum(...)` without an explicit scope argument. Hierarchy position supplies Department versus dataset scope.

Pagination:

- Department group `PageBreak/BreakLocation`: `Between`
- Tablix `RepeatRowHeaders`: `true`
- Tablix `FixedRowHeaders`: `true`
- `RepeatOnNewPage` elements: 0
- Body width: `7.08333in`
- Literal page width/height: omitted
- Effective Windows configuration: Letter portrait, four explicit 0.5-inch margins

## Title and display evidence

- Title: `ReportTitle`, exact value `Synthetic Department Sales Summary`, 18pt Bold, body, default-left alignment
- SaleDate: `DetailSaleDate`, `=Fields!SaleDate.Value`, no literal format; short-date rendering passed in Windows
- Units: `DetailUnits` `0`; subtotal `Textbox54` `0`; total `Textbox67` `0`
- Revenue: `DetailRevenue` `C2`; `DepartmentRevenueSubtotal` `C2`; `ReportRevenueTotal` `C2`

## Independent Windows baseline

- Initial grouped Preview and reopen Preview: PASS
- Preview pages: 4
- Four departments, two details each, four subtotals, one ending Grand Total: PASS
- Page breaks and repeated headings: PASS
- Repair, conversion, `#Error`, blank page, or clipping: NONE
- PDF: PASS, 4 pages, sections/headings/subtotals/Grand Total preserved
- Excel: PASS, 4 worksheets, eight details and all totals preserved, numeric cells usable, no repair warning

## Recorded deviations

1. The Windows working directory was `simple-table`; repository placement is correct.
2. Revenue serialized as `System.Double`/Float rather than Decimal.
3. SaleDate has no literal short-date `Format`.
4. Page dimensions are defaulted/omitted from XML.
5. Repeated headings use tablix-level row-header flags, not `RepeatOnNewPage`.
6. Aggregate scope is structural rather than an explicit expression argument.
7. The canonical title instruction was corrected after the authoring-kit omission was discovered.

Gate 2C accepts the immutable source with these facts recorded. Resolver evaluation remains deferred.
