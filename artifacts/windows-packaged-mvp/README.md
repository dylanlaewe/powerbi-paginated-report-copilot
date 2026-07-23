# Windows packaged MVP handoff

The Windows customer-path artifact is an unsigned x64 portable Electron executable built from `codex/windows-packaged-mvp`.

The generated binary is not stored in Git. Its local handoff location is:

`/Users/dylanlaewe/powerbi-paginated-report-copilot/dist/windows/Power-BI-RDL-Copilot-0.0.1-windows-x64-portable.exe`

Its byte size is recorded in `SHA256SUMS`; verify that file and checksum after any transfer. See `docs/WINDOWS_PACKAGED_MVP_TEST.md` for the exact clean-Windows procedure.

Runtime resources are copied into the application's `resources/approved-report-resources` directory by electron-builder. The application resolves only the fixed template and XSD names beneath `process.resourcesPath`, verifies real-path containment and the pinned template checksum, and performs XML/XSD validation in-process with bundled `libxml2-wasm`. It never invokes `xmllint`.

Independent Windows 11 validation subsequently passed portable launch, deterministic generation, Report Builder Preview, three-page pagination, PDF export, and three-worksheet Excel export. See `WINDOWS_ACCEPTANCE.md`.
