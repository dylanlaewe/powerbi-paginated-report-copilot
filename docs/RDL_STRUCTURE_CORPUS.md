# RDL Structure Corpus and Resolver Validation v0.3

## Gate 1 scope

Gate 1 defines the corpus only. It creates no RDL, modifies no resolver, runs no mutation, changes no Electron behavior, and makes no Report Builder claim.

The runtime-validated design contract is `examples/rdl-structure-corpus/index.json`.

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

- Gate 2: author and independently validate source baselines
- Gate 3: inventory and record pre-generalization ambiguity
- Gate 4: evidence-based resolver changes only
- Gate 5: deterministic mutations and preservation
- Gate 6: Electron workflow across corpus
- Gate 7: independent Windows Preview/PDF/Excel validation

No merge is permitted before Gate 7 passes.
