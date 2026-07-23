# Windows packaged MVP validation

This handoff validates the unsigned x64 portable build on a clean Windows machine. The machine must not have the repository, Git, Node.js, pnpm, `xmllint`, or other development tools. Power BI Report Builder is required only for the generated-report validation steps.

## Portable application

- File: `Power-BI-RDL-Copilot-0.0.1-windows-x64-portable.exe`
- Build command: `pnpm package:win`
- SHA-256: `5e47a34583a09d2669d5220ed58c70ca9ff7e7ac59403066534fcd0fa051c50b`
- Local build location: `/Users/dylanlaewe/powerbi-paginated-report-copilot/dist/windows/Power-BI-RDL-Copilot-0.0.1-windows-x64-portable.exe`
- Signing: unsigned development portable; no installer, publisher signature, or automatic updates

The executable is intentionally outside Git because it is a generated 85 MB binary. Transfer that exact file to the Windows test machine without rebuilding it.

## Clean-Windows procedure

1. Copy the portable EXE to a normal local folder, such as `C:\Users\<user>\Downloads\RdlCopilotTest`. Do not copy the repository or install development tools.
2. Open PowerShell in that folder and verify the transferred binary:

   ```powershell
   (Get-FileHash -Algorithm SHA256 .\Power-BI-RDL-Copilot-0.0.1-windows-x64-portable.exe).Hash.ToLower()
   ```

   The result must be `5e47a34583a09d2669d5220ed58c70ca9ff7e7ac59403066534fcd0fa051c50b`. Stop if it differs.

3. Launch the EXE. Because this development portable is unsigned, Windows may display a reputation warning. Proceed only when the device's normal security policy permits execution after the hash check. Do not bypass SmartScreen, Defender, or managed-device application-control policy. Record the exact warning or block shown.
4. Paste this complete canonical request into the multiline request field:

   ```text
   Create a report titled "Northwind Field Sales — July 2026" using the production pagination template with data:
   [
     {"SaleDate":"2026-07-02","Region":"Central","Salesperson":"Maya Chen","Customer":"Prairie Health","Product":"Mobile Workstation","Category":"Furniture","Quantity":4,"Revenue":3120,"GrossProfit":1180},
     {"SaleDate":"2026-07-14","Region":"Central","Salesperson":"Noah Bennett","Customer":"Riverbend Foods","Product":"Workflow Licenses","Category":"Software","Quantity":15,"Revenue":2250,"GrossProfit":990},
     {"SaleDate":"2026-07-05","Region":"East","Salesperson":"Olivia Mensah","Customer":"Beacon Academy","Product":"Conference Display","Category":"Technology","Quantity":3,"Revenue":4650,"GrossProfit":1710},
     {"SaleDate":"2026-07-19","Region":"East","Salesperson":"Pavel Novak","Customer":"Granite Freight","Product":"Ergonomic Chair","Category":"Furniture","Quantity":7,"Revenue":2940,"GrossProfit":1120},
     {"SaleDate":"2026-07-09","Region":"West","Salesperson":"Quinn Alvarez","Customer":"Canyon Transit","Product":"Rugged Tablet","Category":"Technology","Quantity":6,"Revenue":5340,"GrossProfit":2040},
     {"SaleDate":"2026-07-25","Region":"West","Salesperson":"Rina Shah","Customer":"Sequoia Studio","Product":"Document Cases","Category":"Office Supplies","Quantity":24,"Revenue":2160,"GrossProfit":930}
   ]
   ```

5. Click **Generate Report**. Confirm the UI returns to an enabled state and displays:
   - title `Northwind Field Sales — July 2026`
   - row count `6`
   - Regions `Central`, `East`, `West`
   - template `production-pagination-letter`
   - output SHA-256 `ae2ed7f3ef0df988b550ea2f46ed7490d4c6de3d2e67c58646c2a2c61d9669c1`
6. Click **Copy path**. The path must be under the current user's application-data folder and end with `generated-reports\regional-sales-generated.rdl`. The UI must not offer a template path or output-folder chooser.
7. Verify the generated file in PowerShell:

   ```powershell
   $rdl = Get-Clipboard
   Test-Path -LiteralPath $rdl
   (Get-FileHash -Algorithm SHA256 -LiteralPath $rdl).Hash.ToLower()
   ```

   `Test-Path` must return `True`; the RDL hash must be `ae2ed7f3ef0df988b550ea2f46ed7490d4c6de3d2e67c58646c2a2c61d9669c1`.

8. Open that RDL in Power BI Report Builder. Record whether any exception, repair, conversion, or upgrade prompt appears. Expected: none.
9. Confirm Design view loads, then run **Preview**. Verify all six rows appear once and only once.
10. Verify Region subtotals:
    - Central: Quantity 19; Revenue $5,370.00; Gross Profit $2,170.00
    - East: Quantity 10; Revenue $7,590.00; Gross Profit $2,830.00
    - West: Quantity 30; Revenue $7,500.00; Gross Profit $2,970.00
11. Verify Grand Total: Quantity 59; Revenue $20,460.00; Gross Profit $7,970.00.
12. Verify Regions begin on separate pages, column headings repeat on later pages, `Page N of M` renders, no unexpected blank page appears, and nothing is horizontally clipped. Record the actual Preview page count.
13. Export to PDF. Reopen the PDF; verify rows, totals, repeated headings, page numbers, no blank pages, and no horizontal clipping. Record the actual PDF page count.
14. Export to Excel. Open the workbook; confirm no repair warning, all six rows and totals, and numeric measures remain numeric. Record the actual worksheet count.
15. Close Report Builder using **Don't Save**. Re-hash the RDL and confirm the hash remains unchanged.

Return the EXE hash, RDL hash, launch result, Report Builder open/Preview results, Preview/PDF page counts, Excel worksheet count, screenshots of the generated UI summary and report Preview, and any warning or error text verbatim.

## Expected limitations

- This is an unsigned x64 Windows portable build, not a production-signed installer.
- Windows reputation warnings are possible.
- Power BI Report Builder is not bundled.
- Only the accepted fixed template and nine-field synthetic-data request shape are supported.
- No LLM, live source, chart, authentication, telemetry, update, or existing-report editing capability is included.
- macOS cannot execute the Windows binary; final customer-path acceptance requires the clean-Windows procedure above.

The first independent managed-Windows attempt verified transfer, size, and checksum but was blocked by SmartScreen with no policy-permitted execution option. Application execution and downstream checks were not reached in that environment. See `WINDOWS_CODE_SIGNING_PLAN.md`.

## Independent acceptance result

A later test in a personally controlled Windows 11 Parallels VM completed the customer path without bypassing managed-device policy:

- portable launch and packaged resources: PASS
- canonical generated RDL hash: `ae2ed7f3ef0df988b550ea2f46ed7490d4c6de3d2e67c58646c2a2c61d9669c1`
- Report Builder open and Preview: PASS — 3 pages
- PDF export: PASS — 3 pages
- Excel export: PASS — 3 worksheets
- blank pages, clipping, repair warnings, and `#Error`: NONE

PowerShell's default text decoding initially corrupted the UTF-8 em dash in the copied request. Explicit UTF-8 decoding produced the canonical hash; this is recorded as a test-environment issue. The Windows `Reveal in Finder` label is a deferred cosmetic issue.
