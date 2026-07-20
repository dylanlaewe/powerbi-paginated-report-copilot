# Changelog

## [Unreleased]

### Added

- Safe, read-only PBIP discovery with artifact path containment and desktop folder selection.
- Pinned Microsoft PBIR authoring CLI and immutable, MIT-licensed Desktop-produced PBIP spike fixture.
- CLI-first deterministic PBIR spike that authors a real model-bound card, clustered-column chart, and slicer in a disposable PBIP copy, with verified backup, reference checks, official validation, and evidence manifests.

### Validated

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

## [0.0.1] - 2026-07-19

### Added

- Secure Electron, React, and Vite application shell.
- Strict TypeScript workspace, runtime-validated domain seed, Vitest, ESLint, and Prettier.
- GitHub Actions quality and secret-scanning workflow.
- Product, architecture, platform, privacy, testing, support, and status documentation baseline.
