# Existing RDL Sidecar v0.2 test record

## Gate 1 — inspection

Fixture:

`examples/existing-rdl-sidecar/source/regional-sales-existing.rdl`

The fixture is a byte-identical copy of the accepted Report Builder-authored `artifacts/rdl-compatibility-ladder/06b-production-pagination-letter.rdl`. Both SHA-256 values are:

`c2d27f7595d9330eb9815f86483aa068129265a00980ca3b0b956f6f3f1de17a`

The frozen source artifact is unchanged.

Generation command:

```bash
pnpm sidecar:inspect \
  --input examples/existing-rdl-sidecar/source/regional-sales-existing.rdl \
  --output examples/existing-rdl-sidecar/inventory/gate-1-inventory.json
```

Expected console result:

```text
Source SHA-256: c2d27f7595d9330eb9815f86483aa068129265a00980ca3b0b956f6f3f1de17a
Title target: ReportTitle
Revenue targets: Revenue, Textbox10, Textbox19
```

Actual inventory summary:

- namespace: `http://schemas.microsoft.com/sqlserver/reporting/2016/01/reportdefinition`
- namespace version: `2016/01`
- datasets: `SeedData`
- fields: SaleDate, Region, Salesperson, Customer, Product, Category, Quantity, Revenue, GrossProfit
- report parameters: none
- tablix: `Tablix1`, dataset `SeedData`
- groups: `Region`, `Region1`, `Details`
- textboxes: 42
- report sections: 1
- title: `ReportTitle`
- Revenue displays: `Revenue`, `Textbox10`, `Textbox19`
- page: portrait `8.5in × 11in`
- body width: `7in`
- margins: `0.5in` on all sides

Automated coverage:

- fixture byte identity
- strict runtime inventory validation
- stable committed inventory evidence
- namespace, dataset, field, parameter, tablix, group, textbox, page, and margin inspection
- static-text discovery
- exact direct and aggregate field-expression discovery
- exclusion of the static Revenue label
- configured and conservative fallback title resolution
- ambiguous and missing title rejection
- Revenue target resolution across detail, Region subtotal, and Grand Total
- missing field and missing display rejection
- non-RDL and malformed-report rejection

Gate 1 is local service validation only. No edited RDL was generated, and no Report Builder rendering claim is made.
