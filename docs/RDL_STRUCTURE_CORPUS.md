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

## Gate 2C grouped-report result

Dylan personally authored and independently validated `synthetic-department-sales.rdl`. The 52,651-byte repository source matches the Windows original at SHA-256 `03c7a6eacd6b003aeaace0264a361267ce208de6388420f0d465608f3540174b`; read-only validation preserved the bytes.

The grouped source passes safe XML parsing and the Microsoft RDL 2016/01 XSD. Its exact Report Builder hierarchy is:

- one `DepartmentSalesTable` with four body columns, five body rows, and a separate one-inch Department row-header region;
- semantic `Department` group on `=Fields!Department.Value`, sorted ascending, with `PageBreak/BreakLocation=Between`;
- nested implicit `Details` member;
- Department subtotal member beneath the group;
- one static Grand Total member outside the Department group;
- four aggregate expressions whose Department versus dataset scope derives from hierarchy position;
- `RepeatRowHeaders=true` and `FixedRowHeaders=true`, with no `RepeatOnNewPage` element.

The accepted canonical title is `Synthetic Department Sales Summary` in body textbox `ReportTitle`, 18pt Bold. This title requirement was not correctly captured before manual authoring, so Gate 2C corrects the authoring guide and manifest without modifying the source.

Authored deviations include Revenue as `System.Double` rather than Decimal, no literal SaleDate format despite accepted short-date rendering, omitted PageWidth/PageHeight, and structural rather than explicit aggregate scope. The generic inspector again stops on omitted physical dimensions; resolver evaluation remains deferred.

## Gate 2D official-sample discovery

Gate 2D is discovery metadata only. It statically inspects seven RDLs from Microsoft's official Reporting Services repository at pinned `master` commit `acc2ee0d1884765e4b5213149430fb063d166719`. No upstream RDL is imported, opened, rendered, queried, executed, or committed.

Deterministic inventories, a security scan, direct license review, exact source hashes, a feature matrix, and selection recommendations are under `examples/rdl-structure-corpus/external-sources/microsoft-reporting-services/`. Static parsing disables network and external-entity resolution. All seven files are XML-well-formed and pass the Microsoft 2016/01 RDL XSD.

Invoice, Transcript, Labels, and Letter are candidates for a later, separately reviewed import gate. Country Sales Performance and Regional Sales remain reference-only because their embedded Code requires review. Organization Expenditures is deferred because its chart-only body is outside the current edit scope.

The parameterized controlled fixture is paused and narrowed to its still-uncovered deliberate `RegionCode`/`MetricValue` ambiguity. The alternate-layout fixture is paused and narrowed to a controlled static page-header title, literal landscape dimensions, nonstandard names, and deterministic Cost displays. Neither fixture was authored in Gate 2D, and no resolver, inspector, mutation, planner, Electron, LLM, or packaging behavior changed.

## Gate 2E pinned Invoice import

Gate 2E imports exactly one external source: Microsoft's official `PaginatedReportSamples/Invoice.rdl` from pinned commit `acc2ee0d1884765e4b5213149430fb063d166719`. The canonical source is `external-sources/microsoft-reporting-services/imported/invoice/source/Invoice.rdl`, preserved byte-for-byte at 222,297 bytes and SHA-256 `6251f6b9f76618dd5c2f9accc614b9e198fc221d2310a39508f6ac4897d53fdc`.

This external fixture is registered separately from the four controlled fixtures. Its unmodified upstream MIT license and Microsoft copyright notice are adjacent to the source. Safe static parsing, XML well-formedness, 2016/01 XSD validation, security scanning, inventory regeneration, attribution, and immutability checks pass.

Invoice provides realistic five-dataset overlap, a Company lookup parameter and filtered dataset, three tablixes, nine rectangles, 15 aggregate expressions, an embedded image, header/footer content, repeated-heading evidence, and advanced visibility. It remains insufficient for the deliberately isolated `RegionCode`/`MetricValue` ambiguity.

No Report Builder open, Preview, rendering, query execution, or export was performed. No resolver or mutation evaluation occurred.

## Gate 2F pinned Transcript import

Gate 2F imports exactly one additional external source: Microsoft's `PaginatedReportSamples/Transcript.rdl` from the same pinned commit. The canonical source is `external-sources/microsoft-reporting-services/imported/transcript/source/Transcript.rdl`, preserved byte-for-byte at 116,709 bytes and SHA-256 `9693231c79853b0881d0414f1c98242c76216efc00784b3bc81acc69430b2e81`.

Transcript is registered separately from both the controlled fixtures and Invoice. Static validation records two Enter Data datasets sharing `Name`, three tablixes, nested `Name → Details` members, eight rectangles with deepest path `Rectangle2 → Rectangle5 → Rectangle6`, two embedded images, and a page-header title in `Textbox1`. The title expression is `="Contoso Professional Certified Transcript"`, with 22pt Bold, left-aligned styling.

Transcript supplies broad realistic alternate-layout evidence but does not replace the narrowed controlled alternate-layout fixture's isolated landscape, naming, title, and Cost-display conditions. Invoice remains unchanged. Neither external report was opened, rendered, queried, published, or exported, and resolver behavior remains unevaluated.

## Gate 2G inspector/resolver baseline

Gate 2G evaluates the unchanged production inspector and grammar across simple-table, grouped-report, Invoice, and Transcript. Every source safely parses but production stops at page-settings normalization with `INVALID_REPORT: ReportSection 0 lacks PageWidth`; no partial production inventory or renderer summary exists.

The separately labeled corpus-assisted diagnostic confirms a wrong simple-table title target, a correct grouped title, an unsupported Transcript page-header title, no confident Invoice title, one correct UnitCost binding, and structurally flattened grouped Revenue targets. Page orientation is blocked for every fixture because effective/default dimensions are not represented.

The simple and grouped grammar requests produce valid typed plans only with diagnostic context, but cannot reach review. Transcript is atomically rejected because the literal phrase `left aligned` is outside the current grammar. No plan is executed and no RDL is generated.

The accepted implementation recommendation begins with nullable serialized page normalization, then structural candidate evidence, title scoring, dataset/scope-aware field resolution, typed ambiguity, page-orientation policy, mutation, and UI review—in that order.

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

`Synthetic Department Sales Summary` uses eight fictional rows, Department parent grouping, details, a group subtotal, Grand Total, repeating headings, and between-group page breaks. Revenue appears at detail, group-subtotal, and report-total scopes.

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
- Gate 2D: discover and classify official external samples without importing source RDLs
- Gate 2E: import and statically validate only the pinned Microsoft Invoice source
- Gate 2F: import and statically validate only the pinned Microsoft Transcript source
- Gate 2G: record the unchanged production inspector/resolver/planner baseline without writes
- Gate 3: inventory and record pre-generalization ambiguity
- Gate 4: evidence-based resolver changes only
- Gate 5: deterministic mutations and preservation
- Gate 6: Electron workflow across corpus
- Gate 7: independent Windows Preview/PDF/Excel validation

No merge is permitted before Gate 7 passes.

## Gate 2H optional page geometry

Production inspection accepts schema-optional omitted `PageWidth`,
`PageHeight`, and margin elements. Each is normalized as either an explicit
source value with parsed inches or an omitted discriminant. Omission is never
zero, Letter, A4, or an inferred Report Builder default. Malformed serialized
sizes remain structured `INVALID_REPORT` failures.

All four accepted sources reach structural inventory and sanitized summary
generation. Their width and height are omitted, so orientation is unknown and
`setPageOrientation` is rejected atomically with
`PAGE_DIMENSIONS_UNSPECIFIED`. No source or output RDL was written. Evidence is
under `examples/rdl-structure-corpus/inspector-normalization-v0.3/`.

Title and numeric target behavior remains the Gate 2G behavior. No fixture hash
was added to production configuration. Future dimension materialization
requires separate design and independent Report Builder validation.

## Gate 2I structural target context

The production read-only path catalogs candidate textboxes with stable
structural evidence: report region, nested rectangle/tablix ancestry, tablix
dataset, row and column member paths, group expressions, static/dynamic member
status, repetition and page-break metadata, visibility, position, dimensions,
style, expression type, field identity, aggregate metadata, format, and
structural scope role.

Constant-string expressions are decoded without evaluation. Arbitrary Visual
Basic, custom code, queries, and report expressions are never executed.
Same-named declarations retain possible datasets and certainty; field displays
in different tablixes remain separate candidates.

Catalogs under `examples/rdl-structure-corpus/target-context-v0.3/` use stable
diagnostic IDs only. Live renderer summaries use new opaque UUIDs per
inspection session. Neither kind is accepted by mutation IPC. No generic title
or field target is selected, and checksum-reviewed mutation remains unchanged.

## Gate 2J read-only title resolution

Title candidates now receive deterministic, inspectable positive and negative
evidence. Name tokens, font prominence, bold style, structural separation,
body/page-header placement, width, concise phrase shape, and generic title
terms contribute positively. Data-region headers and labels, footer placement,
hidden state, small/narrow captions, prompts, metadata, and disclaimers
contribute negatively.

The resolver returns a strict typed outcome rather than forcing the first
ranked candidate. Simple table is `CONFLICTING_TITLE_EVIDENCE`; Grouped and
Transcript are high-confidence read-only resolutions; Invoice is
`NO_CONFIDENT_TITLE_CANDIDATE`. Deterministic tie ordering never overrides
semantic ambiguity.

Artifacts under `title-resolution-v0.3/` use diagnostic IDs. Live Electron
outcomes translate them to session UUIDs. All outcomes explicitly deny mutation
authority, and the checksum-reviewed target remains the only writable path.
