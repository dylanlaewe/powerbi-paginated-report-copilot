# Status

Current milestone: **packaged Windows RDL copilot MVP in progress**.

The deterministic CLI and minimal Electron UI accept a constrained title-plus-JSON request, validate a versioned nine-field `ReportSpecification`, select one checksum-pinned Report Builder-authored template, safely replace the title and embedded rows, preserve protected report structures, calculate expected totals, validate the RDL, and write it atomically to a controlled location.

Independent acceptance:

- Windows Report Builder: canonical generated RDL passed checksum, open, Design, Preview, requested content, six details, three Region subtotals, Grand Total, Region pagination, repeated headings, Page N of M, no blank pages or clipping, PDF, and Excel.
- macOS Electron UI: application launch, canonical request generation, visible summary, controlled output creation, expected SHA-256, and byte identity with the accepted CLI artifact passed.

The accepted `rdl-copilot-mvp-v0.1` tag is frozen. The active branch packages that exact narrow workflow for a clean Windows customer path. The generator now performs deterministic XSD validation with an application-bundled WebAssembly libxml2 runtime instead of invoking an end-user `xmllint` installation. Portable-build and clean-Windows acceptance remain pending.

See `KNOWN_LIMITATIONS.md`, `ARCHITECTURE.md`, `RDL_COPILOT_MVP.md`, and `MAC_ELECTRON_MVP_TEST.md` for scope and operation.
