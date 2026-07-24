# Build log

## 2026-07-23 — RDL structure corpus Gate 2B simple-table acceptance

- Ingested Dylan's personally authored 21,402-byte simple-table source read-only and confirmed SHA-256 `e3a34afe…448e3` before validation.
- Parsed the source with `libxml2-wasm` using NONET/NO_XXE protections and passed the Microsoft RDL 2016/01 XSD.
- Added a deterministic corpus inventory that permits honest null serialized dimensions instead of assigning unproven defaults.
- Recorded one ENTERDATA dataset, five rows, one tablix, one implicit Details member, zero non-detail groups, zero parameters, ten textboxes, zero aggregate expressions, and zero page breaks.
- Recorded actual item names, competing title candidates, Units/UnitCost binding evidence, string-typed numeric fields, explicit currency format, omitted dimensions, and the generic inspector's pre-resolution dimension limitation.
- Recorded independent Windows one-page Preview/PDF and one-worksheet Excel acceptance, with no repair, conversion, blank page, clipping, or `#Error`.
- Added exact identity, safe parse, deterministic inventory, immutability, XSD, embedded data, type, hierarchy, and candidate-evidence regressions.
- Passed changed-file formatting, ESLint, workspace typecheck, 41 test files / 304 tests, and the production build.
- Made no resolver, mutation, planner, Electron, or LLM change. The grouped fixture and Gate 2C remain unstarted.

## 2026-07-23 — RDL Structure Corpus v0.3 Gate 1 design

- Created `codex/rdl-structure-corpus-v0.3` from the independently accepted v0.2 merge without changing any frozen tag.
- Defined simple-table, grouped, parameterized/multi-dataset, and alternate-layout Report Builder fixture plans using personally authored MIT-licensed synthetic Enter Data content.
- Added a strict runtime corpus-index schema covering provenance, structure, title/field evidence, expected classifications, frozen EditPlans, pending source identity, and baseline status.
- Documented likely ambiguity, generic versus profile-review hypotheses, directory contracts, and the seven-gate ladder.
- No RDL source, resolver behavior, mutation, UI, LLM, or Report Builder validation work began.

## 2026-07-23 — Existing RDL Sidecar Gate 6 independent Windows acceptance

- Dylan independently verified the portable EXE size/SHA and executed it from a Windows-local directory in a personally controlled Windows 11 VM.
- Packaged launch without development dependencies, native selection, inspection, canonical review/apply, trusted copy/reveal actions, Explorer label, duplicate-safe output, manifest identity, and unchanged source passed.
- The deterministic edited RDL matched `d84670…bd5bb` and passed Report Builder open, Design, three-page Preview, intended edits, preserved rows/groups/totals/pagination, and no repair, errors, blanks, or clipping.
- PDF export passed with three pages; Excel export passed with three worksheets, no repair warning, and numeric values preserved.
- Gates 1–6 and Existing RDL Sidecar Editor v0.2 are independently accepted.

## 2026-07-23 — Existing RDL Sidecar Gate 6 Windows build

- Re-ran 38 test files/289 tests, formatting, ESLint, workspace typecheck, production build, packaged-resource simulations, preload inspection, and Gates 1–5 regressions.
- Produced the unsigned x64 portable EXE `Power-BI-RDL-Copilot-0.0.1-windows-x64-portable.exe`, 89,625,624 bytes, SHA-256 `b21b726b…5f8`.
- Verified packaged XSD SHA-256 `7714fc8d…b29`, accepted bundled RDL resource SHA-256 `c2d27f75…e17a`, Electron-only preload dependency, in-process `libxml2-wasm`, and no `xmllint` dependency.
- Added exact personally controlled Parallels Windows-local transfer, packaged-sidecar, Report Builder, PDF, and Excel validation instructions. Independent Gate 6 acceptance remains pending.

## 2026-07-23 — Existing RDL Sidecar Gate 5 independent macOS acceptance

- Dylan independently validated native `.rdl` selection, sanitized inspection, canonical request entry, proposal and exact targets, explicit apply, Copy RDL Path, Copy Manifest Path, Reveal in Finder, and busy-state recovery.
- The independently produced `-2` output matched SHA-256 `d84670…bd5bb`; the source remained `c2d27f…e17a`.
- The adjacent manifest existed with `invocationSurface: electron-sidecar`; duplicate-safe naming preserved the prior output.
- Gate 5 is accepted. No Gate 6 acceptance claim is made.

## 2026-07-23 — Existing RDL Sidecar Gate 5 Electron integration

- Replaced the branch UI's primary new-report screen with a compact, resizable existing-RDL sidecar journey while preserving underlying generation services.
- Added native `.rdl` selection, XSD-validated sanitized summaries, in-memory opaque report/plan/output sessions, expiration/invalidation, explicit proposal review, and single-use apply.
- Kept all filesystem, planner, plan, targets, validation, output, clipboard, and reveal authority in main; strict IPC accepts only request text and opaque UUIDs.
- Reused the Gate 4 transaction under `userData/edited-reports` and added `invocationSurface: electron-sidecar` to the shared manifest schema.
- Preserved hardened Electron settings and an Electron-only preload bundle; added Finder/Explorer/File Manager labels from trusted platform state.
- Fixed quoted-title normalization so an em dash is preserved instead of normalized as command punctuation.
- Automated canonical output passed Gate 2/4 byte identity and development launch smoke. Independent macOS UI click-through remains pending; Gate 6 was not started.

## 2026-07-23 — Existing RDL Sidecar Gate 4 CLI transaction

- Added a narrow noninteractive plan/apply CLI using one shared inspect/context/plan/resolve pipeline.
- Added fatal UTF-8 decoding with optional BOM removal, platform-newline normalization through the accepted planner, and em-dash preservation coverage.
- Added repository-root controlled, duplicate-safe output naming without user output arguments or `process.cwd()` dependence.
- Added source revalidation, deterministic mutation, synchronized temporary writes, paired RDL/manifest rename, rollback, and cleanup failure coverage.
- Added a strict audit-manifest schema with sanitized inspection context, resolution evidence, before/after values, validation statuses, and preservation hashes; UUID/timestamp fields do not affect RDL bytes.
- The canonical CLI artifact is byte-identical to Gate 2 at `d84670…bd5bb`; the source remains `c2d27f…e17a`. Gate 5 was not started.

## 2026-07-23 — Existing RDL Sidecar Gate 3 deterministic planner

- Added the `EditPlanner` interface and `LocalSentenceEditPlanner`, a runtime-validated local recognizer with explicit planned/rejected outcomes and no RDL mutation access.
- Added minimized inventory-derived context, NFC/whitespace/hyphen normalization, quote-safe title preservation, full-clause span coverage, unique normalized field matching, compatible style merging, canonical operation ordering, duplicate deduplication, and complete conflict rejection.
- Generated human-readable proposals only from validated plans and recorded canonical plan SHA-256 `879e1543…f5dc`.
- Added phrase variants, conflict/rejection coverage, partial-request rejection, context-safety assertions, platform/locale determinism, and 250 bounded malformed-input fuzz cases.
- Committed Gate 3 validation evidence. Gate 4 and all product integration remain unstarted.

## 2026-07-23 — Existing RDL Sidecar Gate 1 inspection

- Created `codex/existing-rdl-sidecar-v0.2` from accepted `main` without changing either frozen milestone tag.
- Copied the accepted Report Builder-authored production RDL byte-for-byte into a dedicated existing-report fixture and recorded the canonical edit request separately.
- Added a strict versioned RDL inventory service using in-process `libxml2-wasm` parsing with network and external-entity loading disabled.
- Inventoried namespace, ReportSections, page dimensions, margins, datasets, fields, parameters, tablixes, groups, textboxes, static text, expressions, field bindings, formats, and text styles without exposing embedded row values.
- Added fail-closed title and field-display resolution. The fixture resolves `ReportTitle` and Revenue displays `Revenue`, `Textbox10`, and `Textbox19`; the static `HeaderRevenue` label is excluded.
- Generated deterministic Gate 1 inventory evidence and added ambiguity, missing-target, malformed-file, fixture-integrity, structural-inventory, and resolution regressions. Gates 2–6 remain unstarted.

## 2026-07-23 — Existing RDL Sidecar Gate 2 mutation

- Added a strict serializable EditPlan v1 discriminated union with four allowlisted operation types and rejection of raw XPath/XML, unsupported formats/styles, and duplicate or conflicting operations.
- Applied the hand-authored canonical plan through a parsed in-memory mutation service after checksum-reviewed title resolution and exact three-target Revenue resolution.
- Changed only title text/size/weight, PageWidth/PageHeight, and three Revenue formats; retained half-inch margins and seven-inch body width.
- Added a parsed semantic structural-diff guard that normalizes only plan-approved properties and separately hashes embedded data, datasets/fields, tablix hierarchy, page behavior, and footer content without logging row values.
- Added source-checksum and source-recheck enforcement, controlled output naming, source overwrite rejection, atomic write cleanup, XSD validation, final reparse, operation postconditions, and byte determinism checks.
- Generated `regional-sales-existing-copilot-edited.rdl` with SHA-256 `d84670…bd5bb`. The unchanged source remains `c2d27f…e17a`.
- Recorded libxml serialization normalization from CRLF to LF, normalized empty elements, and root attribute ordering; the semantic guard proves these are outside the approved property changes but semantically neutral.
- Gate 2 service tests pass. No planner, product CLI, Electron UI, or Windows validation work began.

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

## 2026-07-21 — Candidate 06 implementation

- Added Candidate 06 generation as a byte-for-byte copy of the hash-pinned, corrected Report Builder production-pagination seed.
- Added deterministic guards for six rows, Region grouping, three subtotals, one Grand Total, outer-Region breaks, repeating headers, Page N of M, effective Letter defaults, half-inch margins, and print-safe width.
- Preserved the seed's independently verified no-blank/no-clipping, PDF, Excel, and reopen results while keeping Candidate 06's own Windows Preview/export acceptance pending.
- Generated the byte-identical Candidate 06 artifact, validation manifest, and final Windows Preview/PDF/Excel handoff. Seed numeric page/sheet counts remain unrecorded because placeholders were submitted.
- Independent Windows validation rejected Candidate 06: checksum and Design passed, but runtime page width was 13 inches and PageHeight was invalid zero. Preview failed before rendering; PDF and Excel were not tested.
- Recorded that the validator's inferred Letter defaults were unsound. Candidate 06 remains unchanged as failure evidence.

## 2026-07-21 — Explicit page-dimension regression

- Removed production validation's unsafe reliance on omitted PageWidth/PageHeight defaults.
- Added exact assertions for positive valid `PageWidth=8.5in`, `PageHeight=11in`, all four `0.5in` margins, and body width within printable width.
- Added regressions that reject failed Candidate 06 and the newly supplied Letter seed because both omit physical dimensions; those two seeds differ only by Report Builder modification timestamp.
- Stopped Candidate 06b generation and documented byte-level verification for a replacement seed with explicit `PageWidth=8.5in` and `PageHeight=11in`.
- Audited attempted correction commit `e1d8252`: Git diff shows only `LastModifiedTimestamp`, and the current blob still contains no PageWidth/PageHeight. Regenerated forensic evidence and retained the 06b block.

## 2026-07-22 — Candidate 06b implementation

- Pulled seed commit `81861fb` and verified literal `PageWidth=8.5in`, `PageHeight=11in`, four half-inch margins, and raw hash `c2d27f75…e17a`.
- Updated pagination forensics and strict dimension tests to accept only the explicit final Letter seed.
- Added Candidate 06b byte-for-byte generation while preserving failed Candidate 06 unchanged and retaining all pagination, data, grouping, subtotal, Grand Total, PDF, and Excel structures.
- Generated the byte-identical Candidate 06b artifact and a Windows handoff requiring concrete Preview/PDF/Excel counts, no blank pages or clipping, correct totals, and a post-test checksum. Candidate acceptance remains pending.
- Independent Windows validation accepted Candidate 06b: checksum, explicit dimensions, open, Design, Preview, hierarchy, rows, subtotals, Grand Total, Region pagination, repeated headings, Page N of M, no blank pages, no clipping, PDF, and Excel passed.
- Closed the compatibility ladder without generating Candidate 07. Numeric Preview/PDF page counts and Excel worksheet count remain unreported placeholders.

## 2026-07-22 — Natural-language RDL MVP specification

- Added a runtime-validated, versioned report specification for the accepted nine-field embedded dataset and production-pagination template.
- Added constrained natural-language parsing for quoted titles and inline synthetic JSON rows, with rejection of unknown templates and malformed data.
- Documented the narrow MVP flow and explicitly deferred template instantiation, charts, template expansion, parameters, and live data sources.
- Implemented checksum-pinned template instantiation with XML escaping, protected-structure comparison, XSD checks, independent totals, atomic writes, and a deterministic CLI.
- Generated the canonical six-row MVP artifact and added security, mathematical-total, byte-determinism, template-integrity, and Windows-handoff evidence.
- Independent Windows validation accepted the first copilot-generated RDL across checksum, open, Design, requested content, Preview, totals, pagination, PDF, and Excel. Numeric page and worksheet counts remain unreported placeholders.

## 2026-07-22 — Minimal Electron RDL generation

- Added strict generate/reveal/copy IPC contracts with request validation, context-isolated preload methods, main-process-only generation, and a controlled application output directory.
- Added the multiline request workflow, visible generation/error states, structured title/rows/Regions/totals/template/checksum summary, Finder reveal, and path copy.
- Added CLI/UI byte-parity, rejected-template, invalid-display, IPC strictness, controlled-path, and template-preservation tests plus focused Mac launch instructions.
- Corrected Electron workspace dependency bundling after the first Mac launch exposed direct TypeScript loading; the second `pnpm dev` launch built main/preload/renderer and started the Electron application successfully.
- Reproduced the Mac acceptance failure: emitted preload contained `require("zod")`, sandbox loading failed, the bridge remained undefined, and the renderer lacked rejection cleanup.
- Removed all non-Electron preload runtime imports, retained Zod validation in main, added missing-bridge and rejected-IPC recovery with `finally`, and verified the built preload contains only `require("electron")`.
- Added sandbox bridge initialization, emitted-bundle, main-process validation, hardened BrowserWindow, and renderer recovery regressions. A final `pnpm dev` smoke launched without preload errors.
- Reproduced the second Mac failure: the generator resolved the template and XSD from `process.cwd()`, which Electron set to `apps/desktop`.
- Added one approved-resource resolver with monorepo-marker discovery for development, explicit `process.resourcesPath` locations and packaging metadata, real-path containment, existence checks, and pinned checksum verification. Electron main now injects the resolved absolute paths.
- Verified generation from repository-root, `apps/desktop`, compiled-main, and simulated packaged locations; rejected missing, wrong-checksum, and symlink-escaped resources.
- Drove the actual built Electron renderer over its context bridge with the canonical request. The UI returned to an enabled state and displayed the accepted SHA; the generated file was byte-identical to the CLI artifact.
- Independent macOS UI validation accepted launch, canonical request generation, visible summary, controlled output creation, expected SHA-256, and byte identity with the accepted CLI artifact. The deterministic RDL copilot MVP checkpoint is complete.

## 2026-07-22 — Packaged Windows validator runtime

- Started `codex/windows-packaged-mvp` from the frozen `rdl-copilot-mvp-v0.1` milestone without changing the accepted feature scope.
- Replaced the generator's external `xmllint` process invocation with deterministic XSD validation through the application-bundled `libxml2-wasm` runtime.
- Added valid-schema and invalid-schema regressions and recorded the validation engine in generation manifests. Portable Windows packaging and independent clean-Windows acceptance remain pending.
- Configured an unsigned x64 Electron portable target with ASAR packaging and fixed `approved-report-resources` copies for the pinned template and XSD.
- Limited packaged Node modules to Zod and `libxml2-wasm`; build tools and bundled renderer/workspace dependencies are development-only.
- Added packaged discovery, missing-resource, wrong-checksum, repository-independent generation, accepted-byte parity, and emitted-main no-`xmllint` coverage.
- Built the portable executable locally at `dist/windows/Power-BI-RDL-Copilot-0.0.1-windows-x64-portable.exe`; independent clean-Windows execution remains pending.

## 2026-07-22 — Windows SmartScreen policy block

- Independent transfer, exact byte size, and SHA-256 verification passed for the unsigned portable EXE.
- A managed Windows device blocked launch through Microsoft Defender SmartScreen and offered no policy-permitted execution option. Application execution, generation, Report Builder, PDF, and Excel were not reached; packaged acceptance remains pending.
- Preserved the security policy without bypass instructions and added a production Authenticode signing, signature-verification, deterministic-output, and approved clean-Windows environment plan.

## 2026-07-22 — Packaged Windows MVP acceptance

- Independently validated the exact 89,624,083-byte portable artifact with SHA-256 `5e47a345…c50b` in a personally controlled Windows 11 Parallels VM without bypassing managed-device policy.
- Passed portable launch, bundled template/XSD discovery, canonical request validation, controlled generation, result summary, path copy, and accepted RDL SHA-256 `ae2ed7f3…d9669c1` without a repository, development server, Node.js, pnpm, Git, or `xmllint`.
- Power BI Report Builder passed open, three-page Preview, six-row completeness, Region subtotals, Grand Total, Region page breaks, repeating headings, Page N of M, no blank pages, no clipping, and no `#Error` values.
- PDF export passed with three pages; Excel export passed with three worksheets, no repair warning, preserved totals, and numeric values.
- Recorded PowerShell's default-decoding corruption of the UTF-8 em dash as a test-environment issue resolved by explicit UTF-8 input. Deferred the Windows `Reveal in Finder` label as cosmetic.

## 2026-07-23 — RDL structure corpus Gate 2A authoring kit

- Continued from accepted Gate 1 commit `d7989831` without changing any frozen milestone tag.
- Added a runtime-validated Gate 2A manifest that locks the manual fixture order, synthetic-only safety policy, source destinations, field schemas/types, row counts, authoring-kit paths, and expected totals.
- Added six UTF-8 tab-delimited Enter Data files: five inventory rows, eight department-sales rows, six budget rows, three parameter-lookup rows, and six project-cost rows.
- Added four Report Builder construction guides covering blank-report creation, exact structures and item names, formats, page settings, Preview, save/close/reopen, PDF, and Excel.
- Added four source-validation worksheets with unfilled SHA-256, namespace, version, page/sheet counts, warnings, authorship, licensing, and behavior evidence.
- Added regressions for manifest policy/order, TSV schemas and counts, required guide/worksheet evidence, and the absence of any corpus `.rdl`.
- Passed changed-file formatting, ESLint, workspace typecheck, 40 test files / 297 tests, and the production build.
- Created no source RDL and changed no resolver, mutation, planner, Electron, or LLM implementation. Gate 2B remains blocked pending Dylan's manual simple-table authoring and validation.
