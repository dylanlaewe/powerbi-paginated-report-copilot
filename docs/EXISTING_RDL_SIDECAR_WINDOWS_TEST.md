# Existing RDL Sidecar Gate 6 Windows Test

Gate 6 is pending independent validation in Dylan's personally controlled Windows 11 Parallels VM. Do not use a managed work device or bypass organizational security policy.

## Files and expected hashes

Transfer these two files through the Parallels shared Mac folder:

- `dist/windows/Power-BI-RDL-Copilot-0.0.1-windows-x64-portable.exe`
  - size: `89,625,624` bytes
  - SHA-256: `b21b726bc92ed4c1f994591851cda5318decbe43fdb09afb46a8ed6eaeb395f8`
- `examples/existing-rdl-sidecar/source/regional-sales-existing.rdl`
  - SHA-256: `c2d27f7595d9330eb9815f86483aa068129265a00980ca3b0b956f6f3f1de17a`

Copy both from the shared folder into a Windows-local folder such as:

```text
C:\Users\<user>\Downloads\RdlSidecarGate6\
```

Do not run either file directly from the shared/network path.

Verify locally in PowerShell:

```powershell
Set-Location "$env:USERPROFILE\Downloads\RdlSidecarGate6"
Get-Item .\Power-BI-RDL-Copilot-0.0.1-windows-x64-portable.exe |
  Select-Object Name, Length
Get-FileHash .\Power-BI-RDL-Copilot-0.0.1-windows-x64-portable.exe -Algorithm SHA256
Get-FileHash .\regional-sales-existing.rdl -Algorithm SHA256
```

## Packaged sidecar validation

1. Launch the portable EXE. No repository, Node.js, pnpm, Git, `xmllint`, or development server should be present or required.
2. Confirm the initial action is **Select Existing RDL**.
3. Confirm output actions use the label **Reveal in Explorer**, never “Reveal in Finder.”
4. Select the Windows-local `regional-sales-existing.rdl`. The native picker should filter to `.rdl`.
5. Confirm the summary:
   - namespace `2016/01`
   - dataset `SeedData`
   - 9 fields
   - tablix `Tablix1`
   - groups `Region → Region1 → Details`
   - 42 textboxes
   - portrait
   - title `Regional Sales Subtotal Compatibility Test`
6. Enter exactly:

   ```text
   Change the report title to "Weekly Sales Pipeline", make the title 18-point bold, switch the page to landscape, and format Revenue as currency with no decimal places.
   ```

7. Select **Review Changes**. Before Apply, confirm no new RDL or manifest exists under the path shown later by Copy Path.
8. Confirm:
   - `ReportTitle`: old title → `Weekly Sales Pipeline`
   - `ReportTitle` size: `28pt` → `18pt`
   - `ReportTitle` weight: default → `Bold`
   - page: portrait → landscape
   - `Revenue`, `Textbox10`, and `Textbox19`: `C2` → `C0`
   - `HeaderRevenue` is absent
   - “The original report will not be modified.”
9. Select **Apply Changes**.
10. Confirm output SHA-256 `d84670ccd232ea9c077e7b438e9bf3ef5a8283a8f8b95968ca91f32fe0cbd5bb`.
11. Use **Copy RDL Path**, **Copy Manifest Path**, and **Reveal in Explorer**.
12. Verify the output and original:

    ```powershell
    Get-FileHash "<copied RDL path>" -Algorithm SHA256
    Get-FileHash "$env:USERPROFILE\Downloads\RdlSidecarGate6\regional-sales-existing.rdl" -Algorithm SHA256
    $manifest = Get-Content "<copied manifest path>" -Raw -Encoding UTF8 | ConvertFrom-Json
    $manifest.manifestVersion
    $manifest.invocationSurface
    $manifest.source.sha256AfterCompletion
    $manifest.plan.sha256
    $manifest.output.sha256
    $manifest.validation
    ```

    Expected `invocationSurface` is `electron-sidecar`; source, plan, and output hashes must match those above.

13. Edit the same source again and confirm a duplicate-safe suffix is used without overwriting the first output.

## Power BI Report Builder

Open the Electron-produced RDL, not the original.

Record:

- repair warning: expected none
- conversion warning: expected none
- Design view: expected PASS
- Preview: expected PASS
- actual Preview page count: `________`

Confirm:

- title is `Weekly Sales Pipeline`, 18pt, bold
- page is landscape
- Revenue detail, Region subtotal, and Grand Total displays use currency with zero decimals
- GrossProfit and Quantity formats are unchanged
- all six detail rows appear exactly once
- Region groups, three Region subtotals, and Grand Total remain correct
- page breaks, column headings, footer, and Page N of M remain intact
- no `#Error`, unexpected blank page, or horizontal clipping appears

## PDF and Excel exports

Export from Report Builder and record:

- actual PDF page count: `________`
- actual Excel worksheet count: `________`

PDF must open without error and preserve the title, formatting, totals, rows, pagination, and absence of clipping/blank pages.

Excel must open without repair, preserve six rows, Region subtotals and Grand Total, show the intended Revenue format, and retain numeric values as numeric cells.

After all testing, re-hash the Windows-local original. It must remain:

```text
c2d27f7595d9330eb9815f86483aa068129265a00980ca3b0b956f6f3f1de17a
```
