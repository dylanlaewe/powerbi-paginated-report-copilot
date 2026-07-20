# Build log

## 2026-07-19 — Repository bootstrap

- Verified Node.js, pnpm, Git, GitHub CLI authentication, repository ownership, and push access.
- Initialized the empty remote on `chore/repository-bootstrap`.
- Added secure Electron/React shell, workspace quality tooling, domain runtime validation seed, CI, and documentation baseline.
- Researched official PBIP/PBIR/TMDL/RDL behavior from Microsoft sources.
- Built all processes and launched the Electron application successfully on macOS; stopped the smoke test intentionally with SIGINT.
- Published commit `c9393b6` to `chore/repository-bootstrap`, promoted it to `main`, and set `main` as the remote default branch.

## 2026-07-19 — PBIP project discovery

- Added read-only `.pbip` discovery, runtime JSON validation, artifact resolution, canonical path containment, and symlink escape rejection.
- Connected a single allowlisted Electron IPC operation to native folder selection and the renderer project summary.

## 2026-07-20 — First real PBIR authoring proof

- Installed and used Microsoft’s pinned Power BI report-authoring skill and `@microsoft/powerbi-report-authoring-cli` 0.1.4.
- Imported an immutable MIT-licensed Desktop-produced Roastery PBIP fixture and preserved its provenance.
- Generated a disposable PBIP containing `AI Generation Spike`, a model-bound Revenue card, Revenue by Origin Country chart, and Date slicer.
- Passed custom JSON, reference, identifier, backup, immutability, determinism, and 25-test repository checks. Microsoft validation returned zero errors and one documented schema-URL-unreachable warning.
- Packaged the complete generated project, raw validator output, checksums, and Windows handoff under `artifacts/first-real-pbir-spike/`.
- Independent Windows testing passed PBIP opening, generated page/visual recognition, semantic-model recognition, and corruption/repair checks.
- Data retrieval was blocked fixture-wide: original Page 1 and the generated page could not fetch values. Populated rendering, interactions, and visual quality were not verified.

## 2026-07-20 — First real RDL generation spike

- Created and immediately pushed `spike/first-real-rdl-generation` from the accepted PBIR merge.
- Confirmed Microsoft Report Builder's `ENTERDATA` mechanism and RDL 2016/01 namespace from official documentation.
- Generated `Regional Sales Detail.rdl` with 24 fictional embedded rows, 11 source fields, three regions, six salespeople, and four categories.
- Added a grouped eight-column tablix with detail rows, repeating headers, alternating formatting, regional page breaks/subtotals, report grand totals, print-safe dimensions, and page-count footer.
- Passed well-formedness, the Microsoft XSD compatibility copy, deterministic structure/reference checks, golden output, backup verification, and the full repository test/build pipeline.
- Packaged the RDL, CSV review copy, backup, manifests, hashes, validator output, and exact Windows Preview/PDF/Excel instructions under `artifacts/first-real-rdl-spike/`.

## 2026-07-20 — Independent RDL rejection

- Independent Windows testing launched Power BI Report Builder but failed to open `Regional Sales Detail.rdl`.
- Report Builder reported `Index was out of range. Must be non-negative and less than the size of the collection. Parameter name: index` before reaching Design or Preview.
- Recorded XML well-formedness and existing XSD validation as passing, Report Builder open and spike acceptance as failing, and all downstream runtime/export checks as not reached or not tested.
- Rejected the hand-authored-from-scratch generation strategy without asserting an unproven root cause.
- Kept `spike/first-real-rdl-generation` unmerged and untagged. The next candidate must be minimally derived from the canonical Report Builder-authored seed and independently pass the open gate.

## 2026-07-20 — RDL compatibility ladder candidate 01

- Pulled and SHA-256 pinned the independently proven Report Builder-authored `KnownGoodEnterDataTable.rdl` seed without modifying it.
- Compared the seed with the rejected scratch-generated RDL across namespaces, metadata, ordering, data/query/field structures, tablix collections and hierarchies, grouping, sorting, pagination, footer, styles, fonts, and embedded rows.
- Added deterministic validation for dataset/row order, DesignerState dimensions and coordinates, effective tablix cell counts, hierarchy leaf counts, duplicate field sources and groups, ElementPath declarations, and printable body width.
- Found that both files pass the implemented collection-count checks; no count mismatch or root cause is asserted. Report Builder-specific metadata/serialization and the scratch file's unproven complexity remain compatibility hypotheses for incremental isolation.
- Derived candidate 01 through only a third embedded row, matching DesignerState cells/count, and the requested title. All other seed structures remain intact.
- Passed XML well-formedness, existing XSD validation, collection consistency, deterministic tests, and local repository checks. Report Builder open and Preview remain pending Windows.
- Independent Windows testing subsequently passed Report Builder open, Design view, embedded-data execution, Preview, three-row verification, inherited group interaction, and footer rendering with no repair, conversion, or upgrade request.
- Accepted Candidate 01. Its existing Total row intentionally remained blank because the candidate introduced no aggregate expression.

## 2026-07-20 — RDL compatibility ladder candidate 02

- Extended deterministic validation to reject unknown field references, incompatible ElementPath/CLR field types, invalid dates, nonnumeric decimal values, and nonintegral integer values.
- SHA-256 pinned accepted Candidate 01 as Candidate 02's direct input and verified it remained unchanged after generation.
- Replaced only the embedded grid/query/field schema and tablix content needed for nine visible detail fields and six synthetic rows while retaining the validated Report Builder root, data source, section, title, footer, and Region/detail hierarchy strategy.
- Added compatible date, whole-number, and currency metadata/formatting without totals, page breaks, repeat behavior, parameters, or new header/footer structures.
- Passed the full local pipeline, XSD validation, collection consistency, type/value validation, print-width validation, and artifact checksums. Independent Windows Report Builder validation remains pending.
- Independent Windows testing subsequently passed Report Builder open, Design view, embedded-data execution, Preview, six-row verification, nine-field verification, and field references with no repair, conversion, upgrade, or `#Error` result.
- Accepted Candidate 02. Recorded narrow-column header/expression clipping as deferred layout polish rather than a structural compatibility failure.

## 2026-07-20 — RDL compatibility ladder candidate 03

- Extended generic validation to include group-expression field references and nonempty, unique group names.
- SHA-256 pinned accepted Candidate 02 as Candidate 03's direct input and verified Candidates 01 and 02 remained unchanged.
- Added one merged Region group-header row, an explicit Region → Details hierarchy, alphabetical Region sorting, and SaleDate/Salesperson detail sorting while preserving all nine fields, six rows, and existing detail formatting.
- Added no aggregates, subtotals, grand totals, page breaks, repeat behavior, parameters, or new header/footer structures.
- Passed XML, XSD, embedded-data, tablix cell, hierarchy leaf, group/sort reference, detail reachability, print-width, test-suite, and checksum validation. Independent Windows Report Builder validation remains pending.
- Independent Windows testing subsequently failed during Report Builder open with an index-out-of-range exception before Design view.
- Recorded Design and Preview as not reached, Region grouping as not tested, and Candidate 03 acceptance as failed despite passing static checks.
- Preserved the rejected candidate unchanged and stopped hand-modifying its hierarchy. Candidate 03b must derive from the independently accepted Report Builder-authored grouped seed.
- Compared accepted Candidate 02, rejected Candidate 03, and the accepted Report Builder-authored grouped seed across body rows/cells, hierarchy members, group/sort/header placement, optional member properties, designer metadata, nesting depth, and row/leaf relationships.
- Found that Candidate 03 and the seed are both count-consistent but structurally distinct: the rejected file adds a merged third body row, while Report Builder retains two rows and creates nested row-hierarchy headers plus `Region → Region1 → Details`.
- Added regression validation that accepts the Report Builder grouping fingerprint and rejects the Candidate 03 hierarchy without claiming a single causal token.
