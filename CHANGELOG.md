# Changelog

## [Unreleased]

### Added

- The first natural-language RDL MVP unit: a versioned, runtime-validated specification and constrained parser that allowlists the accepted production-pagination template and synthetic nine-field rows.
- End-to-end deterministic MVP generation using the checksum-pinned accepted template, safe embedded-data substitution, protected-structure validation, independently calculated totals, CLI output, canonical artifact, and Windows handoff.
- Candidate 06b as a byte-identical copy of the corrected Report Builder-authored Letter pagination seed, with strict literal page-dimension regression validation and an independent Windows Preview/PDF/Excel handoff.
- Safe, read-only PBIP discovery with artifact path containment and desktop folder selection.
- Pinned Microsoft PBIR authoring CLI and immutable, MIT-licensed Desktop-produced PBIP spike fixture.
- CLI-first deterministic PBIR spike that authors a real model-bound card, clustered-column chart, and slicer in a disposable PBIP copy, with verified backup, reference checks, official validation, and evidence manifests.

### Validated

- Independent Windows testing accepted the first deterministic natural-language copilot RDL: checksum, requested title and data, open, Design, Preview, grouping, subtotals, Grand Total, pagination, PDF, and Excel passed.
- Independent Windows testing accepted Candidate 06b: explicit physical dimensions, checksum, open, Design, Preview, multipage Region pagination, repeating headings, Page N of M, all rows and totals, no blank pages or clipping, PDF export, and Excel export passed. The RDL compatibility ladder is complete.
- Independent Power BI Desktop testing opened the generated PBIP and recognized its generated page, visual objects, and semantic model without corruption or repair. Fixture-wide data retrieval remained blocked, so populated rendering and interaction are not claimed.

### Added

- CLI-first `Regional Sales Detail.rdl` generation with 24 synthetic embedded `ENTERDATA` rows, grouped tablix, regional and report totals, pagination, deterministic validation, official-XSD preflight, golden tests, backups, checksums, and independent Report Builder handoff.

### Rejected

- Independent Windows validation found that Power BI Report Builder fails to open the generated `Regional Sales Detail.rdl` with an index-out-of-range error. Design, Preview, embedded-data execution, and exports were not reached. The RDL generation mechanism is not proven; future candidates must be derived from a known-good Report Builder seed.

### Added

- Hash-pinned, baseline-derived RDL compatibility ladder tooling with forensic structural comparison and deterministic collection-consistency checks.
- Candidate 01, derived through minimal content edits to the proven Report Builder seed, containing Region and Revenue with three synthetic rows and the `RDL Compatibility Test` title.

### Validated

- Independent Windows testing accepted Candidate 01: Report Builder opened it without repair or conversion, loaded Design view, executed embedded data, previewed all three expected rows, supported inherited group interaction, and rendered the execution-time footer.

### Added

- Candidate 02, derived directly from the accepted Candidate 01 structure, with nine visible detail fields, six embedded synthetic rows, compatible date/numeric metadata and formatting, expanded field-reference/type/value validation, and a dedicated Windows handoff.

### Validated

- Independent Windows testing accepted Candidate 02: Report Builder opened it without repair or conversion, recognized all nine fields, and previewed all six rows without field errors. Narrow-column clipping is deferred layout polish.

### Added

- Candidate 03, directly derived from accepted Candidate 02, with a visible Region group-header row, explicit Region → Details hierarchy, alphabetical group sorting, SaleDate/Salesperson detail sorting, and deterministic hierarchy/group validation.

### Rejected

- Independent Windows validation rejected Candidate 03: Report Builder raised an index-out-of-range exception before Design view despite passing XML, XSD, and static consistency validation. Its hand-modified hierarchy is preserved unchanged pending comparison with a Report Builder-authored grouped seed.

### Added

- Three-way grouped-hierarchy forensics and regression validation distinguishing accepted Candidate 02, rejected Candidate 03, and the accepted Report Builder-authored `Region → Region1 → Details` hierarchy without asserting an unproven root cause.
- Candidate 03b as a byte-for-byte, checksum-pinned copy of the accepted Report Builder-authored grouped seed, with nine fields, six rows, exact hierarchy preservation, regression evidence, and a dedicated Windows handoff.

### Validated

- Independent Windows testing functionally accepted Candidate 03b as the canonical grouped compatibility baseline: open, Design, one-page Preview, Region grouping, sorting, and all six rows passed without repair or field errors. Its Windows working-tree checksum mismatched the repository bytes because of verified CRLF conversion; generalized programmatic grouping remains unproven.

### Fixed

- Disabled Git line-ending conversion for `.rdl` files after LF-to-CRLF conversion reproduced Candidate 03b's exact Windows checksum mismatch. Added raw-byte and canonicalization regression coverage without changing accepted report contents.
- Production pagination validation now requires explicit positive Letter dimensions and half-inch margins instead of assuming defaults for omitted PageWidth/PageHeight.

### Added

- Candidate 04, directly derived from canonical Candidate 03b, with one outer-Region subtotal row per Region, explicitly scoped Quantity/Revenue/GrossProfit sums, deterministic hierarchy/scope validation, and no grand total or page break.

### Rejected

- Independent Windows validation rejected Candidate 04: its checksum and static checks passed, but Report Builder raised an index-out-of-range exception before Design view. Subtotal execution was not tested, and the generated hierarchy is preserved unchanged.
- Independent Windows validation rejected Candidate 06: Design opened, but Report Builder resolved width as 13 inches and PageHeight as invalid zero; Preview failed and exports were not tested.

### Added

- Three-way subtotal forensics and regression validation distinguishing accepted Candidate 03b, rejected Candidate 04, and the Report Builder-authored subtotal structure without asserting an unproven root cause.
- Candidate 04b as a byte-for-byte, checksum-pinned copy of the accepted Report Builder-authored subtotal seed, with regression evidence and a dedicated Windows handoff.
- Candidate 04c template-instantiation tooling that replaces only title and embedded data while preserving the accepted Report Builder-authored Tablix subtree byte-for-byte.
- Candidate 04c artifact, deterministic replacement dataset, independently calculated Region totals, validation evidence, and Windows handoff.
- Grand-total forensics and regression validation pinning the exact Report Builder-authored fourth body row and top-level hierarchy member required for Candidate 05.
- Production-pagination seed forensics confirming its Report Builder structures while detecting a blocking 2-inch page width against the 7-inch report body.
- Three-way pagination forensics confirming the corrected seed uses print-safe Letter defaults while preserving Report Builder-authored Region breaks, repeating headers, and Page N of M.
- Candidate 06 byte-identical generation from the corrected Report Builder production-pagination seed with print-safe and structural regression guards.
- Candidate 06 artifact, validation evidence, and final Windows Preview/PDF/Excel handoff.
- Candidate 06b byte-identical generation from the final explicit-Letter seed with literal page-dimension regression enforcement.
- Candidate 05 template implementation preserving the Report Builder grand-total arrangement and instantiating only its visible report-level label.
- Candidate 05 artifact with six accepted details, three Region subtotals, one dataset-context Grand Total, deterministic validation evidence, and a Windows handoff.

### Validated

- Independent Windows testing accepted Candidate 04b: checksum, open, Design, Preview, all six details, and three mathematically correct Region subtotals passed without repair or report errors. Generalized subtotal construction remains unproven.
- Independent Windows testing accepted Candidate 04c: programmatically replaced title and embedded data rendered on one page with all six rows and three recalculated Region subtotals, proving template instantiation over the preserved Report Builder structure.
- Independent Windows testing accepted Candidate 05: checksum, open, Design, Preview, all six details, three Region subtotals, and exactly one mathematically correct report Grand Total passed without repair or report errors.

### Documentation

- Recorded that Candidate 05 requires a new Report Builder-authored grand-total seed and provided an exact creation/reopen procedure; no guessed Candidate 05 XML was generated.
- Recorded that Candidate 06 requires a Report Builder-authored production-pagination seed and provided exact repeating-header, Region-break, page-number, page-setup, PDF, Excel, and reopen instructions; no Candidate 06 XML was guessed.
- Recorded the delivered production seed's blocking 2-inch page width and provided a Report Builder-only print-safe correction and revalidation procedure.
- Rejected the timestamp-only Candidate 06b seed because it still omits physical dimensions; documented the explicit serialized Letter-size prerequisite.
- Recorded that attempted in-place seed correction `e1d8252` again changed only metadata and did not serialize either required page dimension.

## [0.0.1] - 2026-07-19

### Added

- Secure Electron, React, and Vite application shell.
- Strict TypeScript workspace, runtime-validated domain seed, Vitest, ESLint, and Prettier.
- GitHub Actions quality and secret-scanning workflow.
- Product, architecture, platform, privacy, testing, support, and status documentation baseline.
