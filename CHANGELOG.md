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

## [0.0.1] - 2026-07-19

### Added

- Secure Electron, React, and Vite application shell.
- Strict TypeScript workspace, runtime-validated domain seed, Vitest, ESLint, and Prettier.
- GitHub Actions quality and secret-scanning workflow.
- Product, architecture, platform, privacy, testing, support, and status documentation baseline.
