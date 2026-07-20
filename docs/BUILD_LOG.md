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
