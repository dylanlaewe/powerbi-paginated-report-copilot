# Minimal Electron natural-language RDL MVP — Mac acceptance

Status: **PASS**

The Electron application on `codex/natural-language-rdl-mvp` was independently tested on macOS using the canonical request from `examples/regional-sales-request.txt`.

- Electron launch: PASS
- Canonical request paste: PASS
- Generate Report completion: PASS
- Generated report summary displayed: PASS
- Controlled output file exists: PASS
- UI SHA-256: `ae2ed7f3ef0df988b550ea2f46ed7490d4c6de3d2e67c58646c2a2c61d9669c1`
- Byte-for-byte match with accepted CLI artifact: PASS
- Minimal Electron natural-language RDL MVP acceptance: **PASS**

Validated output path:

`/Users/dylanlaewe/Library/Application Support/@powerbi-copilot/desktop/generated-reports/regional-sales-generated.rdl`

The absolute path records the independent test environment only. Product code derives the controlled directory from Electron's `app.getPath("userData")`; it does not hardcode this user-specific path.
