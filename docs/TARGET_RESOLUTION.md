# Target Resolution Design

## v0.3 Gate 1 evidence model

No resolver behavior changes in Gate 1. This document defines evidence to measure before implementation.

### Title evidence

Candidate evidence may include:

- exact descriptive report-item name, when present
- one static text value with no field, parameter, or aggregate expression
- top-level containment or reviewed page-header placement
- position above tablixes
- font-size/weight prominence and report-width placement
- absence from tablix header, group label, parameter prompt, and footer roles
- lack of repetition that indicates a page label rather than report title

The future resolver must return one title only above a documented confidence threshold. Ranked evidence must be visible. Ties, insufficient evidence, and missing candidates reject.

Page-header placement is not automatically a title: Gate 4 must distinguish the alternate-layout title from footer text and ordinary repeated header labels.

### Field-display evidence

Candidate evidence may include:

- exact `Fields!Name.Value` expression
- recognized aggregate expression
- declaring dataset and tablix dataset scope
- tablix membership
- row/group hierarchy position
- detail, group-subtotal, or grand-total scope
- existing format
- exclusion of static labels and unrelated expressions

Target count is fixture-specific. The grouped fixture anticipates three Revenue displays; simple table anticipates one UnitCost display; parameterized anticipates two BudgetAmount displays; alternate layout anticipates two Cost displays across two tablixes.

Duplicate field declarations across datasets are ambiguous unless dataset and tablix evidence uniquely bind the request. Ambiguity must never be resolved by array order.

### Optional profiles

A future profile may be used only if general evidence cannot safely resolve a reviewed structure. It must be strict, declarative, runtime-validated, evidence-based, and reported in validation output. It may name expected report items and structural facts but may not contain XPath or suppress competing candidates.

The parameterized and alternate-layout fixtures are marked `profileReviewPending`; this is not authorization to add profiles before Gate 4.

## v0.3 Gate 2G current-production baseline

Gate 2G changes no resolver behavior. The exact baseline is under `examples/rdl-structure-corpus/resolver-baseline-v0.3/`.

All four accepted sources safely parse and expose the expected 2016/01 namespace, but the production inspector stops during page-settings normalization with `INVALID_REPORT: ReportSection 0 lacks PageWidth`. It returns no partial inventory, so production candidate discovery, target resolution, planner-context creation, and renderer summaries are unreachable.

A separate corpus-assisted diagnostic applied the existing generic conservative title filter and direct/`Sum` field-binding rules without routing those models into production. The actual sidecar/mutation entry point is checksum-configured title resolution, and none of the four corpus hashes is configured:

- Simple table: current title logic would select styled `ReportTitle` containing `InventoryReportTitle`, not visible `Textbox9`; `UnitCost` has one correct direct display.
- Grouped report: `ReportTitle` is correct; Revenue has one detail and two aggregate displays, but the production target loses group versus report scope.
- Invoice: no current conservative title candidate; field targets lose dataset, tablix, and group identity.
- Transcript: correct `Textbox1` is omitted because it is a page-header constant expression; current discovery searches body static text only. Its overlapping `Name` field would be ambiguous.

Production has no candidate scoring. It also contains a mutation-specific exactly-three-Revenue target check. Diagnostic scores in the baseline are evaluation evidence only. Future implementation must generalize read-only normalization and structural evidence before changing resolver selection or mutation.

## v0.3 Gate 2H boundary

Only optional page geometry is generalized. Candidate discovery is reachable
because inspection completes, but title scoring and selection, field
selection, ambiguity representation, and the exactly-three-Revenue rule are
unchanged.

Reports without both explicit dimensions expose unknown orientation.
Orientation plans are accepted by the unchanged grammar but blocked before
target resolution or XML mutation with `PAGE_DIMENSIONS_UNSPECIFIED`. This
keeps mixed requests atomic and prevents fabricated page defaults.

## v0.3 Gate 2I read-only catalogs

Candidate discovery preserves structural context that Gate 2G showed was
previously lost. Title-like constants are cataloged across body, page header,
page footer, rectangles, and tablix cells. Direct-field and aggregate
candidates are separate records with dataset certainty, tablix binding,
member paths, groups, formats, and conservative structural roles.

This is discovery, not resolution. Candidate ordering is deterministic but no
generic score, winner, or approved target exists. Diagnostic IDs support
reproducible evidence only. Live candidate IDs are inspection-session handles,
and no existing IPC accepts them for planning or mutation. The
checksum-reviewed mapping remains the sole path to a writable target.

## v0.3 Gate 2J title outcomes

Generic title discovery now feeds a read-only resolver with four outcomes:
`resolved`, `ambiguous`, `notFound`, and `unsupported`. Stable reason codes
distinguish missing candidates, insufficient confidence, comparable candidates,
conflicting evidence, unsupported expressions, and insufficient context.

A result is resolved only above the plausible-title threshold and without a
comparable or semantically conflicting alternative. Page-header placement is
positive evidence but not an automatic winner. Constant-string expressions are
decoded safely; field, aggregate, compound, report-global, parameter, and code
expressions are never executed as title text.

This does not alter reviewed resolution. Generic outcomes, candidate IDs,
diagnostic IDs, item names, and paths remain invalid mutation inputs. User
review and generic target authorization are future gates.
