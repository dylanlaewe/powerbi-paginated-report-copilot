# Fixture origin

- Source: `C-Kapsalis/pbi-plot-styler`, `examples/coffee-roastery`
- URL: https://github.com/C-Kapsalis/pbi-plot-styler/tree/b360e9ade029d7a939efa90697cc2021361ed33a/examples/coffee-roastery
- Commit: `b360e9ade029d7a939efa90697cc2021361ed33a`
- License: MIT; preserved in `UPSTREAM_LICENSE`
- Imported: 2026-07-19

The upstream README describes this as a complete, openable PBIP project for Power BI Desktop. It contains fictional inline data, TMDL, enhanced PBIR, and no external credentials or gateway dependency. The baseline copy must remain unchanged; tests and spike generation operate only on disposable copies.

Baseline validation with `@microsoft/powerbi-report-authoring-cli` 0.1.4 returned `succeededWithWarnings`, zero errors, and one `PBIR_SCHEMA_UNREACHABLE` warning because Microsoft schema URL `visualContainer/2.10.0` was unavailable to the validator. This is recorded as an external schema-availability limitation, not silently treated as schema validation success.
