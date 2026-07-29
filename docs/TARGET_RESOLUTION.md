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

## v0.3 Gate 2K field-display outcomes

Field requests contain one bounded field name. Exact field identity is matched
case-insensitively after trimming. Ranking is structural and deterministic but
is never used to break semantic ambiguity.

Stable results distinguish:

- `FIELD_DISPLAY_RESOLVED`
- `NO_FIELD_DISPLAY_CANDIDATE`
- `MULTIPLE_FIELD_DISPLAY_CANDIDATES`
- `MULTIPLE_DATASET_CANDIDATES` and `DATASET_IDENTITY_AMBIGUOUS`
- `MULTIPLE_SCOPE_ROLES` and `CONFLICTING_FIELD_SCOPE`
- `DUPLICATE_VISUAL_LOCATIONS`
- `UNSUPPORTED_FIELD_EXPRESSION` and `FIELD_CONTEXT_INSUFFICIENT`

One unique, certain candidate resolves only as read-only evidence. Grouped
Revenue remains ambiguous across detail, subtotal, and Grand Total. Invoice
Amount and Discount remain ambiguous across tablixes. Transcript Name remains
ambiguous across dataset declarations even though one visual has a local
tablix binding.

Diagnostic IDs are reproducible evidence. Electron replaces them with
inspection-session UUIDs. Neither form, nor a field name, dataset name,
report-item name, structural path, or resolution object is accepted by apply
IPC. Reviewed checksum-based mutation remains unchanged.

## v0.3 Gate 2L review decisions

Read-only resolution no longer flows directly toward any writable construct.
It may now feed an operation-specific `ReviewBundle`:

```text
typed resolution outcome
→ operation-level review decision
→ future target authorization (not implemented)
→ future generic mutation (not implemented)
```

Operation IDs are deterministic hashes of plan identity, operation index, and
the validated operation. Review-draft IDs are unrelated opaque UUIDs. A draft
is bound to one inspection session, immutable source hash, typed plan hash, and
catalog version.

Candidate UUIDs are accepted only by strict review-selection IPC and only when
they belong to that session, operation, and candidate type. Structural paths,
report-item names, diagnostic IDs, review objects, and review-draft IDs remain
invalid mutation inputs.

A fully reviewed bundle still has `mutationAuthorized: false` and
`executable: false`. Generic Apply behavior and target authorization do not
exist. Checksum-reviewed v0.2 resolution remains the sole writable authority.

## v0.3 Gate 2M exact target authorization

Gate 2L review objects remain non-writable. Gate 2M adds a separate ephemeral
main-process capability that can be constructed only from a current,
fully-reviewed bundle with no blocked operation. It maps live review UUIDs back
to the exact title or field candidate captured during inspection and binds
those records to source, plan, review, catalog, and operation identities.

The capability never crosses IPC and is consumed on the first copy attempt.
Reload, session closure, source change, plan replacement, review reset, stale
candidate identity, type mismatch, or structural drift prevents mutation.

Title operations modify only the selected TextRun and relevant style
properties. Field formatting modifies only selected direct or aggregate runs;
multi-candidate selection means exactly those candidates, never an inferred
scope. Structural normalization supports independent title text/style targets.

The output is always a new duplicate-safe file with an atomic audit manifest.
The original remains byte-identical. Omitted page dimensions continue to block
the entire atomic plan with `PAGE_DIMENSIONS_UNSPECIFIED`.

## v0.3 Gate 2N packaged validation boundary

The Gate 2M resolver, review, and authorization semantics are unchanged in the
v0.3.0 Windows release candidate. The portable package includes the same narrow
sandboxed IPC workflow and application-bundled XML/XSD runtime; packaging does
not introduce a fallback target, arbitrary candidate input, or orientation
default.

The validation guide requires the operator to select only the exact reviewed
candidates described for each of four accepted inputs. Independent results are
intentionally blank until Windows Report Builder testing is returned. Generic
mutation remains limited to explicitly reviewed targets, and v0.4 LLM planning
is deferred.

## v0.3 Gate 2O release acceptance

Independent Windows validation confirmed the exact reviewed-candidate boundary
across four structurally different reports. Simple title/style and direct-field
formatting, grouped detail/subtotal/Grand Total subset formatting, Invoice
Quantity formatting, and Transcript page-header title/style mutation all
opened and previewed successfully in Report Builder and exported to PDF and
Excel.

Original preservation and adjacent manifest creation passed in every scenario.
No resolver outcome became implicit authority: ambiguous operations still
require exact user selection and confirmation, and only confirmed candidates
are writable. No grammar, operation, discovery, or omitted-dimension behavior
changed for release.
