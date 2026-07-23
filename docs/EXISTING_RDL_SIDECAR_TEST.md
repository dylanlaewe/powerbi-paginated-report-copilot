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

## Gate 2 — typed deterministic mutation

Input:

- source: `examples/existing-rdl-sidecar/source/regional-sales-existing.rdl`
- source SHA-256: `c2d27f7595d9330eb9815f86483aa068129265a00980ca3b0b956f6f3f1de17a`
- plan: `examples/existing-rdl-sidecar/requests/canonical-gate-2-edit-plan.json`

Output:

- edited fixture: `examples/existing-rdl-sidecar/expected/regional-sales-existing-copilot-edited.rdl`
- edited SHA-256: `d84670ccd232ea9c077e7b438e9bf3ef5a8283a8f8b95968ca91f32fe0cbd5bb`
- validation evidence: `examples/existing-rdl-sidecar/expected/gate-2-validation.json`

Approved before/after values:

| Property                 | Before                                     | After                 |
| ------------------------ | ------------------------------------------ | --------------------- |
| `ReportTitle` Value      | Regional Sales Subtotal Compatibility Test | Weekly Sales Pipeline |
| `ReportTitle` FontSize   | 28pt                                       | 18pt                  |
| `ReportTitle` FontWeight | absent/implicit default                    | Bold                  |
| PageWidth                | 8.5in                                      | 11in                  |
| PageHeight               | 11in                                       | 8.5in                 |
| `Revenue` Format         | C2                                         | C0                    |
| `Textbox10` Format       | C2                                         | C0                    |
| `Textbox19` Format       | C2                                         | C0                    |

The four margins remain `0.5in`; body width remains `7in`.

Structural preservation hashes:

- normalized complete semantic projection: `a3477fcd39d3b522a86fd03489bc2f801bf77d6665561dd71f6ece8740978cce`
- embedded data: `8eb3496b687dfc236efb1503be81c0437e33c31ebf42736250eea807ae55671b`
- datasets/fields: `2f1066eb51f8a45be70c81456d18914fb51a4258ce44519835d2ff8c0590938c`
- tablix hierarchy: `b361502683303dede088d17e9b7545174a280a267163aea64a40a472c7a74c7c`
- page behavior: `c30dbb46d4beecd920c8aaaba06e99f332e6446a6c040dbcd4b4b7dd8d94f655`
- footer: `a2e4125786632f03edf94a3280512ade07c095d8df31fb57c730f98e857144a8`

Validation passes runtime plan parsing, XML parsing, XSD through `libxml2-wasm`, namespace, exact target counts, operation-specific postconditions, the semantic allowlist, embedded-data preservation, and final reparse. Two repeated in-memory runs produce identical bytes and SHA-256.

The serializer converts source CRLF to LF, canonicalizes empty-element spelling such as `<Style />` to `<Style/>`, and normalizes root attribute order. These are raw serialization differences, not semantic changes. The parsed semantic guard is therefore authoritative. The inserted FontWeight is serialized adjacent to the closing Style tag; it remains valid XML/XSD.

Gate 2 regression coverage includes schema validation failures, duplicate/conflicting plan rejection, exact and generic target behavior, title/style/orientation/format mutation, reverse orientation, margin/body preservation, unrelated textbox and format preservation, dataset/group/tablix/footer/page-break/embedded-data preservation, stale and changed source rejection, source overwrite rejection, atomic output, repeat determinism, and one injected unauthorized mutation.

Full repository verification: 34 test files and 191 tests passed; ESLint, workspace typecheck, and the complete production build passed.

No Report Builder rendering claim is made for the edited fixture before Gate 6.
