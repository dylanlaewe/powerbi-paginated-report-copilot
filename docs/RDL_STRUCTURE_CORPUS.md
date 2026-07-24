# RDL Structure Corpus and Resolver Validation v0.3

## Gate 1 scope

Gate 1 defines the corpus only. It creates no RDL, modifies no resolver, runs no mutation, changes no Electron behavior, and makes no Report Builder claim.

The runtime-validated design contract is `examples/rdl-structure-corpus/index.json`.

## Gate 2A authoring kit

Gate 1 review is approved. Gate 2A prepares instructions and synthetic paste data; it does not create an RDL or assert Report Builder behavior.

The runtime-validated kit manifest is `examples/rdl-structure-corpus/authoring-kit.json`. The required manual order is:

1. `simple-table`
2. `grouped-report`
3. `parameterized-report`
4. `alternate-layout`

Each fixture has an `authoring-kit/README.md`, one or more UTF-8 `.tsv` files, and an empty-evidence `source-validation.md` worksheet. The guides prescribe blank-report creation, Enter Data, item naming where the designer permits it, structure, formatting, physical page setup, Preview, save/close/reopen, PDF and Excel exports, and observed-count recording.

Gate 2A is complete. Report Builder-created source bytes must be placed at the manifest's `sourceRelativePath` without hand editing or transformation.

## Gate 2B simple-table result

Dylan personally authored and independently validated `synthetic-inventory-detail.rdl` in Power BI Report Builder. The repository copy is 21,402 bytes with SHA-256 `e3a34afe7c29c9f773098d9f5bfd65ad2cf60219f78999d46a447250bb2448e3`; validation did not change those bytes.

Read-only ingestion passed safe XML parsing and the Microsoft RDL 2016/01 XSD. The committed deterministic inventory records one `ENTERDATA` dataset, five rows, one four-column/two-row tablix, ten textboxes, zero parameters, zero non-detail groups, zero aggregates, and zero page breaks.

Report Builder authored several material differences from the design:

- all four fields, including Units and UnitCost, serialized as `System.String`;
- the 18pt Bold `ReportTitle` contains `InventoryReportTitle`, while exact accepted title `Synthetic Inventory Detail` is in unstyled `Textbox9`;
- detail names are `DetailUnit` and misspelled `DetailUnitCose`;
- UnitCost uses an explicit currency pattern rather than literal `C2`;
- page width and height are omitted, while independent Windows behavior confirms Letter portrait;
- an implicit `Details` member exists, but no semantic parent group exists.

The current generic inspector stops on the omitted physical dimensions. Gate 2B records that limitation and does not change or evaluate resolution. Gate 2C remains blocked pending review.

## Provenance and licensing plan

All four additional fixtures will be authored personally by Dylan in Microsoft Power BI Report Builder on a personally controlled Windows 11 VM:

1. Start from a blank Report Builder report.
2. Use Enter Data with only the synthetic fields and row counts specified in the index.
3. Construct the designated structure through Report Builder UI.
4. Preview, save, close, reopen, and preview again.
5. Record the exact Report Builder version and baseline Preview/PDF/Excel behavior.
6. Copy the saved bytes into the designated `source/` directory without further transformation.
7. Record SHA-256, namespace, file size, and ownership evidence.

Dylan owns the synthetic fixture content and will contribute it under the repository MIT license. No employer report, customer data, credential, real connection string, internal query, or copied report asset is allowed.

Gate 2 must stop if Report Builder authors a materially different structure than this design; the index must be reviewed rather than silently rewritten.

## Proposed fixtures

### Simple table

`Synthetic Inventory Detail` uses one `InventoryData` dataset, five fictional rows, one ungrouped detail tablix, one prominent body title, and detail-only `UnitCost`.

Edit: change title to `Inventory Cost Review`; format `UnitCost` as `C2`.

Primary risk: the static Unit Cost column label must never be selected as a title or numeric display.

### Grouped report

`Synthetic Department Sales` uses eight fictional rows, Department parent grouping, details, a group subtotal, Grand Total, repeating headings, and between-group page breaks. Revenue appears at detail, group-subtotal, and report-total scopes.

Edit: change and style the title; format every true Revenue display as `C0`.

Primary risks: classify aggregate scope from authored hierarchy without a global target-count assumption; exclude group labels and Grand Total label from title ranking.

### Parameterized report

`Synthetic Regional Budget` uses `BudgetData`, `RegionLookup`, and a `RegionCode` parameter. The two datasets intentionally share `RegionCode` and `MetricValue`; `BudgetAmount` remains unique to the displayed budget tablix.

Edit: change title; format detail and Grand Total `BudgetAmount` as `C2`.

Primary risks: exclude parameter prompts and expressions from title candidates; detect ambiguous duplicated field declarations by dataset rather than merging them.

### Alternate layout

`Synthetic Project Cost Landscape` is authored in landscape with a page-header title, nested body rectangle, detail tablix, separate category-summary tablix, and noncanonical textbox names.

Edit: change header title; switch to portrait; format detail and category-summary `Cost` as `C0`.

Primary risks: current generic title resolution excludes page-header titles; footer text, rectangle captions, and two sets of labels must not win. A reviewed declarative profile may be necessary, but Gate 1 does not define one.

## Directory contract

Each fixture will contain:

- `source/`: immutable Report Builder-authored source
- `requests/`: UTF-8 sentence and expected EditPlan
- `expected/`: deterministic edited RDL after Gate 5
- `inventory/`: stable sanitized inspection evidence
- `validation/`: provenance, resolution, mutation, preservation, and Windows evidence

The index records source identity, namespace, structural/count summary, title and field expectations, generic/profile status, edit scenario, and Report Builder status. Gate 1 deliberately uses null hashes/namespaces and pending validation states.

## Acceptance ladder

- Gate 2A: prepare the manual authoring kit without creating source RDL
- Gate 2B onward: personally author and independently validate source baselines in the approved order
- Gate 3: inventory and record pre-generalization ambiguity
- Gate 4: evidence-based resolver changes only
- Gate 5: deterministic mutations and preservation
- Gate 6: Electron workflow across corpus
- Gate 7: independent Windows Preview/PDF/Excel validation

No merge is permitted before Gate 7 passes.
