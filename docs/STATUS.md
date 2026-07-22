# Status

Current milestone: **packaged Windows RDL copilot MVP in progress**.

The deterministic CLI and minimal Electron UI accept a constrained title-plus-JSON request, validate a versioned nine-field `ReportSpecification`, select one checksum-pinned Report Builder-authored template, safely replace the title and embedded rows, preserve protected report structures, calculate expected totals, validate the RDL, and write it atomically to a controlled location.

Independent acceptance:

- Windows Report Builder: canonical generated RDL passed checksum, open, Design, Preview, requested content, six details, three Region subtotals, Grand Total, Region pagination, repeated headings, Page N of M, no blank pages or clipping, PDF, and Excel.
- macOS Electron UI: application launch, canonical request generation, visible summary, controlled output creation, expected SHA-256, and byte identity with the accepted CLI artifact passed.

The accepted `rdl-copilot-mvp-v0.1` tag is frozen. The active branch packages that exact narrow workflow for a clean Windows customer path. The generator performs deterministic XSD validation with an application-bundled WebAssembly libxml2 runtime instead of invoking an end-user `xmllint` installation. An unsigned x64 portable EXE was built, transferred, and independently matched by size and SHA-256, but managed-device SmartScreen policy blocked launch without an approved execution option. Application execution and all downstream checks remain untested; packaged acceptance is pending a signed build and approved clean-Windows environment.

See `KNOWN_LIMITATIONS.md`, `ARCHITECTURE.md`, `RDL_COPILOT_MVP.md`, `MAC_ELECTRON_MVP_TEST.md`, `WINDOWS_PACKAGED_MVP_TEST.md`, and `WINDOWS_CODE_SIGNING_PLAN.md` for scope and operation.
