# Status

Current milestone: **RDL Structure Corpus and Resolver Validation v0.3 — Gate 2K dataset- and scope-aware read-only field-display resolution complete, review pending**.

The frozen `rdl-copilot-mvp-v0.1`, `rdl-copilot-windows-v0.1`, and `rdl-copilot-sidecar-v0.2` checkpoints remain unchanged.

Gates 1–4 remain accepted. Gate 5 exposes those services through a narrow sandboxed Electron sidecar with native `.rdl` selection, sanitized inspection, opaque report/plan/output sessions, explicit review before single-use apply, user-data-contained output, and trusted copy/reveal actions. Automated canonical output is byte-identical to Gates 2 and 4.

Independent macOS and packaged Windows customer-path validation passed. The Windows-produced edited RDL passed Report Builder Design, three-page Preview, all requested edits, preserved rows/groups/totals/pagination, three-page PDF export, and three-worksheet Excel export.

Work continues on `codex/rdl-structure-corpus-v0.3`. Gate 1 and Gate 2A are accepted. Dylan personally authored the simple-table fixture, and Gate 2B read-only validation confirms exact source identity, safe XML/XSD validity, deterministic structural inventory, and independent one-page Preview/PDF plus one-worksheet Excel behavior.

The simple-table source remains accepted with its recorded deviations. Gate 2C now also accepts Dylan's immutable grouped-report source: one typed eight-row ENTERDATA dataset, one Department → Details hierarchy, four group subtotals, one outside-group Grand Total, between-group page breaks, repeated headings, and independent four-page Preview/PDF plus four-worksheet Excel validation.

The grouped source records actual `System.Double` Revenue typing, defaulted SaleDate formatting, omitted physical dimensions, tablix-level repeated-heading flags, and hierarchy-derived aggregate scope. The missing canonical title instruction is corrected in the kit without rewriting the source.

Gate 2D statically assessed all seven official Microsoft Reporting Services paginated samples at pinned commit `acc2ee0d1884765e4b5213149430fb063d166719`. The repository contains discovery metadata only: exact provenance and hashes, direct MIT license review, safe security findings, XML/XSD results, structural inventories, a feature matrix, and later-import recommendations. No external RDL was imported.

Invoice, Transcript, Labels, and Letter are later import candidates; Country Sales Performance and Regional Sales are reference-only pending a custom-Code policy; Organization Expenditures is deferred as chart-only. The parameterized manual fixture remains paused and is narrowed to deliberate field ambiguity. Alternate-layout authoring remains paused and is narrowed to uncovered controlled layout conditions.

No resolver, generic-inspector, mutation, planner, Electron, LLM, packaging, or supported-operation change is part of Gate 2D. No later gate has started.

Gate 2E imports the official Microsoft Invoice sample as the corpus's first pinned external compatibility fixture. Its canonical 222,297-byte source matches upstream SHA-256 `6251f6b9f76618dd5c2f9accc614b9e198fc221d2310a39508f6ac4897d53fdc`; its adjacent upstream MIT license matches the pinned license hash.

The source passes safe static XML parsing, Microsoft 2016/01 XSD validation, security-baseline verification, deterministic inventory comparison, and immutability checks. It is registered separately from personally authored controlled fixtures and is not described as Report Builder-validated. Invoice was not opened, rendered, queried, or exported. No other Microsoft sample or manual fixture was imported or authored.

Gate 2F adds Transcript as the second statically validated pinned external fixture. Its 116,709-byte source matches upstream SHA-256 `9693231c79853b0881d0414f1c98242c76216efc00784b3bc81acc69430b2e81`. Deterministic evidence records its overlapping `Name` field, three nested-region tablixes, nested row members, depth-two rectangle containment, page-header title, and two embedded images.

Invoice remains byte-identical. Transcript and Invoice were not opened, previewed, rendered, queried, published, or exported. No resolver, generic-inspector, mutation, planner, Electron, LLM, packaging, or supported-operation behavior changed, and no later gate started.

Gate 2G invokes the unchanged production inspector on all four accepted sources. All four stop deterministically during page-settings normalization with `INVALID_REPORT: ReportSection 0 lacks PageWidth`; no partial inventory or usable renderer summary is returned.

Corpus-assisted diagnostics—explicitly not product behavior—record current candidate consequences: simple-table title selection would be wrong, grouped title selection would be correct, Invoice has no confident title, and Transcript's page-header title is outside current discovery. UnitCost is uniquely addressable; grouped Revenue returns detail plus two aggregate bindings without retaining scope. Page orientation is unreachable for all four.

The simple/grouped sentences parse into typed plans using diagnostic contexts but cannot reach review. Transcript is atomically rejected on unsupported `left aligned` syntax. No plan was executed, no edited RDL was generated, and all four sources remain unchanged.

Gate 2H treats omitted `PageWidth`, `PageHeight`, and margins as explicit
`omitted` states rather than invalid reports. All four sources reach production
structural inventory and a sanitized summary without inferred dimensions.
Orientation remains unknown and mutation is blocked before writes with
`PAGE_DIMENSIONS_UNSPECIFIED`. Explicit-dimension orientation behavior,
title/field resolution, planner grammar, and source bytes remain unchanged.

Gate 2I adds a strict read-only structural candidate catalog. It preserves
body/header/footer region, rectangle and tablix ancestry, dataset identity,
row/column member paths, group context, visibility, safe expression
classification, and evidence-based detail/header/subtotal/Grand Total roles.
Page-header constant-string titles are represented without evaluating Visual
Basic expressions.

Generic discovery still selects no target and authorizes no mutation.
Deterministic artifacts use stable diagnostic IDs; Electron summaries replace
them with inspection-session UUIDs. Existing mutation IPC accepts neither
candidate IDs, report-item names, nor structural paths. The checksum-reviewed
v0.2 target path remains the only writable authority.

Gate 2J adds deterministic evidence ranking and strict `resolved`,
`ambiguous`, `notFound`, and `unsupported` title outcomes. Simple-table title
evidence remains ambiguous, Grouped and Transcript resolve with high confidence,
and Invoice remains `notFound`. Page-header constants participate through safe
literal extraction; compound and code expressions are never executed.

Every generic outcome has `mutationAuthorized: false`. Live outcomes use
inspection-session UUIDs and cannot enter planning or mutation IPC. The
checksum-reviewed title target remains the only writable title path.

Gate 2K adds strict field-name-only read-only resolution over the Gate 2I
catalog. Matching is trimmed, case-insensitive, and exact; it never uses
substring, fuzzy, plural, alias, report-item-name, or positional matching.
Dataset overlap, tablix location, expression kind, hierarchy groups, and
detail/subtotal/Grand Total roles remain explicit evidence.

Simple `UnitCost`, Invoice `Quantity`/`SalesPrice`, and Transcript `Date`
resolve with high confidence. Grouped `Revenue` remains ambiguous across
detail, group-subtotal, and Grand Total roles. Invoice `Amount`/`Discount`
remain ambiguous across separate visual locations, and Transcript `Name`
retains its multiple-dataset ambiguity. Every outcome denies mutation; the
narrow Electron method returns session UUIDs and neither planning nor apply
accepts field-resolution evidence.

The deterministic CLI and minimal Electron UI accept a constrained title-plus-JSON request, validate a versioned nine-field `ReportSpecification`, select one checksum-pinned Report Builder-authored template, safely replace the title and embedded rows, preserve protected report structures, calculate expected totals, validate the RDL, and write it atomically to a controlled location.

Independent acceptance:

- Windows Report Builder: canonical generated RDL passed checksum, open, Design, Preview, requested content, six details, three Region subtotals, Grand Total, Region pagination, repeated headings, Page N of M, no blank pages or clipping, PDF, and Excel.
- macOS Electron UI: application launch, canonical request generation, visible summary, controlled output creation, expected SHA-256, and byte identity with the accepted CLI artifact passed.

The accepted `rdl-copilot-mvp-v0.1` tag remains frozen. The Windows portable packages that exact narrow workflow with application-bundled WebAssembly XSD validation and fixed approved resources. Independent testing in a personally controlled Windows 11 VM passed artifact integrity, portable launch without development dependencies, canonical deterministic generation, three-page Report Builder Preview, correct details and totals, pagination, PDF export, and three-worksheet Excel export.

The earlier managed-device SmartScreen block remains valid environment evidence; it was not bypassed. Code signing is deferred. The Windows `Reveal in Finder` label is a non-blocking cosmetic issue, and PowerShell request-file transfer requires explicit UTF-8 decoding to preserve the canonical em dash.

See `KNOWN_LIMITATIONS.md`, `ARCHITECTURE.md`, `RDL_COPILOT_MVP.md`, `MAC_ELECTRON_MVP_TEST.md`, `WINDOWS_PACKAGED_MVP_TEST.md`, and `WINDOWS_CODE_SIGNING_PLAN.md` for scope and operation.
