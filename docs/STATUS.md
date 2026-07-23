# Status

Current milestone: **Existing RDL Sidecar Editor v0.2 — Gate 2 mutation complete**.

The frozen `rdl-copilot-mvp-v0.1` and `rdl-copilot-windows-v0.1` checkpoints remain unchanged. Work continues only on `codex/existing-rdl-sidecar-v0.2`.

Gate 1 inspection remains accepted. Gate 2 now applies one hand-authored strict EditPlan to an in-memory parsed copy, resolves the checksum-reviewed title and exactly three Revenue displays before mutation, validates only seven approved semantic property changes, proves all remaining report semantics and embedded data unchanged, passes XSD validation, and atomically emits a deterministic edited fixture without overwriting its source.

The sentence-form planner, product CLI workflow, Electron sidecar integration, and Windows edited-report validation remain unstarted pending review.

The deterministic CLI and minimal Electron UI accept a constrained title-plus-JSON request, validate a versioned nine-field `ReportSpecification`, select one checksum-pinned Report Builder-authored template, safely replace the title and embedded rows, preserve protected report structures, calculate expected totals, validate the RDL, and write it atomically to a controlled location.

Independent acceptance:

- Windows Report Builder: canonical generated RDL passed checksum, open, Design, Preview, requested content, six details, three Region subtotals, Grand Total, Region pagination, repeated headings, Page N of M, no blank pages or clipping, PDF, and Excel.
- macOS Electron UI: application launch, canonical request generation, visible summary, controlled output creation, expected SHA-256, and byte identity with the accepted CLI artifact passed.

The accepted `rdl-copilot-mvp-v0.1` tag remains frozen. The Windows portable packages that exact narrow workflow with application-bundled WebAssembly XSD validation and fixed approved resources. Independent testing in a personally controlled Windows 11 VM passed artifact integrity, portable launch without development dependencies, canonical deterministic generation, three-page Report Builder Preview, correct details and totals, pagination, PDF export, and three-worksheet Excel export.

The earlier managed-device SmartScreen block remains valid environment evidence; it was not bypassed. Code signing is deferred. The Windows `Reveal in Finder` label is a non-blocking cosmetic issue, and PowerShell request-file transfer requires explicit UTF-8 decoding to preserve the canonical em dash.

See `KNOWN_LIMITATIONS.md`, `ARCHITECTURE.md`, `RDL_COPILOT_MVP.md`, `MAC_ELECTRON_MVP_TEST.md`, `WINDOWS_PACKAGED_MVP_TEST.md`, and `WINDOWS_CODE_SIGNING_PLAN.md` for scope and operation.
