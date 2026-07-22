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
- Generated Candidate 03b as a byte-for-byte copy of the hash-pinned, independently accepted Report Builder grouped seed.
- Verified nine fields, six rows, `Region → Region1 → Details`, body-row/hierarchy counts, field and sort references, absence of totals/page breaks/repeat changes, XSD validity, and preservation of Candidates 01, 02, rejected 03, and the grouped seed.
- Preserved the seed's 7-inch width verbatim rather than introducing an unvalidated layout edit. Independent Windows validation of the separately named Candidate 03b artifact remains pending.
- Independent Windows testing subsequently accepted Candidate 03b: checksum, open, Design, Preview, Region grouping, sorting, six-row completeness, and reference checks passed without repair, conversion, upgrade, duplication, omission, or `#Error`.
- Designated Candidate 03b as the canonical grouped compatibility baseline while keeping generalized programmatic group construction explicitly unproven.
- Recorded actual pagination as not provided because the submitted validation result retained the literal `[INSERT RESULT]` placeholder.
- SHA-256 pinned accepted Candidate 03b as Candidate 04's direct input and preserved Candidates 01, 02, rejected 03, 03b, and both canonical seeds.
- Added one subtotal body row and one matching static hierarchy leaf after Region1 inside the outer Region group without changing embedded data or the accepted nested hierarchy.
- Added explicitly Region-scoped Quantity, Revenue, and GrossProfit sums with whole-number/currency formatting and a Region-specific total label.
- Verified three expected runtime subtotal rows, three body rows/leaves, eight effective columns per row, valid scope, six reachable detail rows, no report-level total, no page break, XSD validity, full tests, and checksums. Independent Windows validation remains pending.

## 2026-07-20 — Cross-platform RDL checksum integrity

- Recorded Candidate 03b functional validation as passing on one page while its Windows working-tree SHA-256 mismatched the repository handoff hash.
- Confirmed the repository originally had no `.gitattributes`; the repository blob and macOS working tree both hashed to `f85dfd…0b88`.
- Reproduced the exact Windows `347771…047d` checksum by converting repository LF bytes to CRLF, verifying line-ending conversion as the byte-level cause. The Windows `core.autocrlf` setting itself was not supplied.
- Added `*.rdl -text` so Git preserves exact RDL bytes independent of `core.autocrlf` in fresh/restored checkouts.
- Added regression checks for Git attribute resolution, repository-blob/working-tree identity, exact reproduction of the observed CRLF checksum, and diagnostic CRLF-to-LF canonicalization.
- Left Candidate 03b's accepted logical contents and all existing RDL blob bytes unchanged. Updated Candidate 04 instructions to require a fresh or restored post-policy checkout.

## 2026-07-21 — Candidate 04 Windows rejection

- Independent Windows testing verified Candidate 04's post-policy artifact checksum but failed during Report Builder open with an index-out-of-range exception before Design view.
- Recorded XML, XSD, static repository validation, and checksum as passing; Design and Preview as not reached; Region subtotal execution as not tested; and Candidate 04 acceptance as failed.
- Preserved Candidate 04 unchanged and stopped generated subtotal hierarchy patching. The replacement must derive from the independently accepted Report Builder-authored subtotal seed.

## 2026-07-21 — Candidate 04 subtotal forensics

- Compared accepted Candidate 03b, rejected Candidate 04, and the Report Builder-authored subtotal seed across body rows/cells, hierarchy members, aggregate placement/scope, optional member properties, row heights, designer markers, and row/leaf relationships.
- Recorded four physical subtotal cells plus a five-column span and a body label in the rejected file, versus eight unmerged cells and a static row-hierarchy `Total` header in the seed.
- Recorded explicitly scoped generated aggregates versus Report Builder's unscoped nested-member aggregates. Both files are count-consistent; no single difference is claimed as the exception's root cause.
- Added regression validation that accepts the Report Builder subtotal fingerprint and rejects the failed Candidate 04 structure.

## 2026-07-21 — Candidate 04b subtotal-seed control

- Generated Candidate 04b as a byte-for-byte copy of the SHA-256-pinned Report Builder-authored subtotal seed.
- Preserved the seed's exact hierarchy, eight unmerged subtotal cells, hierarchy-header label, aggregate serialization, ordering, metadata, six rows, nine fields, and seven-inch layout.
- Passed XML, XSD, collection, subtotal regression, seed identity, protected-artifact checksum, full test, lint, typecheck, build, and checksum validation.
- Added an exact clean-clone command and Windows handoff. Report Builder open and Preview remain pending; no Candidate 05 was generated.
- Independent Windows validation subsequently passed checksum, open, Design, Preview, six-detail-row preservation, subtotal structure, and all three expected Region calculations with no repair, conversion, upgrade, blank aggregate, `#Error`, or grand total.
- Accepted Candidate 04b while retaining generalized subtotal construction as not yet proven. Pagination was not recorded because the submitted result contained an unresolved placeholder.

## 2026-07-21 — Candidate 04c template-instantiation implementation

- Added deterministic content instantiation over the hash-pinned Report Builder subtotal template without reconstructing or altering its Tablix subtree.
- Limited mutable content to the report title, embedded DesignerState data cells, and encoded Enter Data query rows; retained all nine field definitions and Report Builder-authored aggregate XML.
- Added independent expected-total tests and guards for template hash, nonidentity, exact protected-Tablix identity, field/data consistency, cross-platform byte policy, and absence of grand totals, page breaks, and parameters.
- Generated the 04c handoff artifact with six replacement rows and expected Central `17 / 4050 / 1610`, East `14 / 5950 / 2270`, and West `30 / 5990 / 2370` subtotals.
- Passed XML, XSD, full repository checks, checksum policy, and protected Candidate/seed hash verification. Independent Windows validation remains pending.
- Independent Windows validation subsequently passed checksum, open, Design, one-page Preview, replacement-title/data verification, six-row completeness, grouping, and all three expected subtotals without repair, stale data, duplicates, omissions, blank aggregates, `#Error`, or grand total.
- Accepted Candidate 04c as proof of the template-instantiation architecture. Recorded narrow-layout wrapping as deferred presentation work.

## 2026-07-21 — Candidate 05 seed prerequisite

- Searched every tracked RDL filename and content after pulling the current spike branch; found no accepted Report Builder-authored report-level grand-total seed.
- Excluded the rejected original generated report from baseline use and did not generate Candidate 05 or guess at a new Tablix hierarchy row.
- Added exact Windows instructions to create, preview, save, reopen, hash, and return `KnownGoodGrandTotal.rdl` using Report Builder's Add Total command on Candidate 04c's outer Region group.

## 2026-07-21 — Candidate 05 grand-total forensics

- Pulled and pinned the reopened, previewed Report Builder-authored grand-total seed.
- Compared it with accepted Candidate 04c across body rows/cells, hierarchy leaves, member placement, headers, aggregate scopes, KeepWithGroup, height, embedded data, page breaks, and parameters.
- Added regression validation for the exact four-row/four-leaf, eight-unmerged-cell, dataset-context grand-total structure. No hierarchy arrangement is inferred.

## 2026-07-21 — Candidate 05 template implementation

- Added Candidate 05 generation directly from the hash-pinned Report Builder grand-total seed.
- Preserved every seed byte except the report-level `Textbox2` visible value, instantiated from `Total` to the required `Grand Total`; no hierarchy XML is constructed.
- Added tests for exact normalized seed identity, six rows, three Region subtotals, four body rows/leaves, dataset-context aggregate expressions, and independently calculated `61 / 15990 / 6250` grand totals.
- Generated Candidate 05 and its Windows handoff. XML, XSD, full tests/build, checksum policy, protected inputs, and exact seed-delta verification pass; independent Report Builder validation remains pending.
- Independent Windows validation subsequently passed checksum, open, Design, Preview, six-detail preservation, three Region subtotals, exactly one labeled Grand Total, and `61 / 15990 / 6250` calculations without repair, blank aggregates, or `#Error`.
- Accepted Candidate 05. Actual pagination remains unrecorded because the submitted result contained an unresolved placeholder.

## 2026-07-21 — Candidate 06 seed prerequisite

- Inspected all accepted canonical RDL seeds for repeating header metadata, FixedData, group page breaks, page-number globals, total-page globals, page size, and margins.
- Found no accepted structural precedent for repeating headers, Region page breaks, or `Page N of M`; rejected scratch-generated RDLs were excluded.
- Did not generate Candidate 06. Added exact Report Builder instructions for a print-safe production-pagination seed plus mandatory close/reopen, Preview, PDF, and Excel verification.

## 2026-07-21 — Production-pagination seed forensics

- Pulled and hash-pinned the Report Builder-authored seed and verified its repeating-header marker, outer-Region page break, Page N of M footer, preserved data, and preserved four-row hierarchy.
- Found explicit `PageWidth=2in` with a `7in` body and `0.5in` side margins, yielding only `1in` printable width and failing the required static print-safe check.
- Recorded unresolved Preview/PDF/Excel counts, blank-page result, and horizontal-clipping result. Did not generate Candidate 06 or silently change a page dimension that the candidate must preserve.
- Added a narrowly scoped correction procedure: preserve the supplied seed, create a separate Report Builder-authored `8.5in × 11in` version with existing 0.5-inch margins, reopen it, rerun Preview/PDF/Excel validation, and return concrete counts plus no-clipping/no-blank-page evidence.
- Pulled the corrected seed and extended the comparison to all three artifacts. The only substantive correction from the first production seed is removal of explicit `PageWidth=2in`; RDL defaults now resolve to Letter `8.5in × 11in`, giving `7.5in` printable width for the `7in` body while preserving pagination structures.
