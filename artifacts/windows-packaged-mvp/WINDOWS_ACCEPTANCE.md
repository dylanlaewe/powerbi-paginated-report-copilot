# Independent Windows packaged MVP acceptance

The packaged MVP was independently validated from branch `codex/windows-packaged-mvp` at commit `0aeb9468c0ece681b4ed930ce24e4a184e4ed385` in a personally controlled Windows 11 virtual machine in Parallels Desktop. The managed work laptop and its security policy were not bypassed.

The portable executable was copied from the Parallels shared Mac folder into the Windows-local Downloads folder before execution.

## Artifact integrity

- File: `Power-BI-RDL-Copilot-0.0.1-windows-x64-portable.exe`
- Size: 89,624,083 bytes — PASS
- SHA-256: `5e47a34583a09d2669d5220ed58c70ca9ff7e7ac59403066534fcd0fa051c50b` — PASS
- Windows-local copy: PASS

## Packaged application

- Portable EXE launch: PASS
- Repository runtime required: NO
- Node.js development server required: NO
- pnpm, Git, `xmllint`, or global Node.js required: NO
- Bundled template and XSD discovery: PASS
- Canonical request validation: PASS
- Generate Report: PASS
- Structured result summary: PASS
- Copy Path: PASS
- Generated file exists: PASS

Canonical result:

- Title: `Northwind Field Sales — July 2026`
- Rows: 6
- Regions: Central, East, West
- Template: `production-pagination-letter`
- Generated RDL SHA-256: `ae2ed7f3ef0df988b550ea2f46ed7490d4c6de3d2e67c58646c2a2c61d9669c1`
- Deterministic accepted-artifact parity: PASS

Verified totals:

| Scope       | Quantity |    Revenue | Gross Profit |
| ----------- | -------: | ---------: | -----------: |
| Central     |       19 |  $5,370.00 |    $2,170.00 |
| East        |       10 |  $7,590.00 |    $2,830.00 |
| West        |       30 |  $7,500.00 |    $2,970.00 |
| Grand Total |       59 | $20,460.00 |    $7,970.00 |

## Power BI Report Builder

- Open without repair or conversion: PASS
- Preview: PASS
- Preview pages: 3
- Six detail rows exactly once: PASS
- Region subtotals: PASS
- Grand Total: PASS
- Regions on separate pages: PASS
- Repeated column headings: PASS
- Page N of M: PASS
- Blank pages: NONE
- Horizontal clipping: NONE
- `#Error` values: NONE

## Exports

PDF:

- Export: PASS
- Pages: 3
- Blank pages: NONE
- Horizontal clipping: NONE
- Rows and totals preserved: PASS

Excel:

- Export: PASS
- Worksheets: 3
- Repair warning: NONE
- Six detail rows, Region subtotals, and Grand Total preserved: PASS
- Numeric values remained numeric: PASS

## Observations

The first request copy used Windows PowerShell's default text decoding and corrupted the UTF-8 em dash in the title. Reading the canonical request explicitly as UTF-8 produced the accepted deterministic SHA-256. This was a test-environment encoding issue, not an RDL generation defect.

The Windows UI displays `Reveal in Finder`. The appropriate Windows label is `Reveal in Explorer`. This is a non-blocking cosmetic issue and did not delay acceptance.

## Decision

- Packaged Windows MVP acceptance: PASS
- Code-signing work: DEFERRED
- Cosmetic platform-label correction: DEFERRED
