# Simple-table Gate 2B source validation

## Identity and provenance

- Source: `examples/rdl-structure-corpus/simple-table/source/synthetic-inventory-detail.rdl`
- Size: `21,402` bytes
- SHA-256 before and after validation: `e3a34afe7c29c9f773098d9f5bfd65ad2cf60219f78999d46a447250bb2448e3`
- Namespace: `http://schemas.microsoft.com/sqlserver/reporting/2016/01/reportdefinition`
- Authoring metadata: PBIRB `15.7.1819.28`
- Windows original and repository copy hash match: PASS
- Dylan personally authored from a blank report in a personally controlled Windows 11 VM: YES
- Enter Data with five fictional rows only: YES
- No copied, employer, customer, proprietary, credentialed, or live-source material: YES
- Personally owned and contributed under the repository MIT license: YES
- Gate 2B modified the source: NO

## Static validation

- Safe XML parse using `libxml2-wasm` with network and external-entity access disabled: PASS
- XML well-formedness: PASS
- Microsoft RDL 2016/01 XSD using `libxml2-wasm`: PASS
- Stable inventory derivation: PASS
- Generic sidecar inspection/resolution: NOT EVALUATED. The current generic inspector requires literal PageWidth and PageHeight and stops before inventory when Report Builder omits them. Gate 2B does not change that behavior.

## Structure

- Data sources: 1, provider `ENTERDATA`
- Datasets: 1, `InventoryData`
- Fields: Item, Warehouse, Units, UnitCost
- Serialized field types: all four are `System.String`
- Embedded DesignerState: 5 rows × 4 columns, all declared `String`
- Parameters: 0
- Tablixes: 1, `InventoryTable`, bound to `InventoryData`
- Tablix body: 4 columns × 2 rows
- Serialized groups: 1 implicit `Details` member
- Non-detail groups/group expressions: 0
- Textboxes: 10
- Aggregate expressions: 0
- Page breaks: 0
- Body width: `7.08729in`
- Serialized page width/height: omitted
- Effective page configuration verified in Report Builder: Letter portrait, `8.5in` × `11in`
- Margins: four explicit `0.5in` values

## Candidate evidence and actual names

Title evidence is intentionally recorded without resolving it:

- `ReportTitle`: body textbox, value `InventoryReportTitle`, 18pt Bold, strongest name/style evidence.
- `Textbox9`: body textbox above the tablix, exact accepted visible title `Synthetic Inventory Detail`, but no serialized 18pt/Bold style.

Numeric evidence:

- Units header: `DetailUnits`, static `Units`, format `0`.
- Units detail: `DetailUnit`, expression `=Fields!Units.Value`, format `0`.
- Unit Cost header: `Textbox4`, static `Unit Cost`.
- Unit Cost detail: `DetailUnitCose`, expression `=Fields!UnitCost.Value`, format `'$'0.00;('$'0.00)`.

## Independent Windows baseline

- Initial Preview: PASS
- Close/reopen and Preview: PASS
- Preview pages: 1
- Five details, required order, visible title, numeric rendering: PASS
- Repair, conversion, upgrade, `#Error`, blank page, or clipping: NONE
- PDF: PASS, 1 page, five rows, no blank page or clipping
- Excel: PASS, 1 worksheet, five rows, no repair warning, numeric values usable as numbers

## Recorded deviations

1. Units and UnitCost serialized as strings rather than Int32 and Decimal.
2. The 18pt Bold textbox contains `InventoryReportTitle`; the accepted visible title is separate unstyled `Textbox9`.
3. The intended detail names became `DetailUnit` and misspelled `DetailUnitCose`; `DetailUnits` belongs to the static header.
4. UnitCost uses an explicit Report Builder currency pattern rather than literal `C2`.
5. Page dimensions are defaulted/omitted from XML, although Windows validation confirms Letter portrait.
6. Report Builder serialized an implicit Details member; there is no semantic parent grouping.

Gate 2B accepts the immutable source with these facts recorded. Resolver evaluation remains deferred.
