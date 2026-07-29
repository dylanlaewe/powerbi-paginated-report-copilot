# Power BI RDL Copilot v0.3.0 Windows release-candidate validation

This package is an **unsigned release candidate** intended only for validation
in Dylan's personally controlled Windows 11 Parallels VM. Do not bypass
SmartScreen, Defender, managed-device application control, or organizational
security policy. If policy blocks execution without an approved option, record
the block and stop.

No repository, Node.js, pnpm, Git, development server, internet connection, or
external XML tool is required. Microsoft Power BI Report Builder is required
for the independent rendering and export checks.

## 1. Prepare and verify

1. Extract `windows-v0.3-validation.zip` into a Windows-local folder such as
   `C:\Users\<user>\Downloads\windows-v0.3-validation`. Do not run the EXE
   directly from the Mac shared folder.
2. Open Windows PowerShell in that extracted folder.
3. Verify every packaged file:

   ```powershell
   Get-Content .\SHA256SUMS.txt | ForEach-Object {
     $expected, $relative = $_ -split '  ', 2
     $relative = $relative -replace '/', '\'
     $actual = (Get-FileHash -Algorithm SHA256 ".\$relative").Hash.ToLower()
     [pscustomobject]@{
       File = $relative
       Expected = $expected
       Actual = $actual
       Match = ($actual -eq $expected)
     }
   } | Format-List
   ```

4. Confirm every `Match` value is `True`. If any hash differs, stop.
5. Launch
   `Power-BI-RDL-Copilot-0.3.0-windows-x64-portable.exe`.
6. Record any normal Windows unsigned-publisher warning. Continue only if the
   personally controlled VM's normal security controls permit it. Do not use a
   managed work device or bypass a security policy.
7. Confirm the app opens and shows the existing-report workflow.

For every scenario, select the RDL from `inputs`, enter the exact request,
review only the specified candidates, and click **Create reviewed copy**. Do
not edit the original input. Record the generated RDL and manifest filenames
and preserve both for review.

## 2. Scenario 1 — controlled simple table

Input:

```text
inputs\synthetic-inventory-detail.rdl
```

Request:

```text
Change the report title to "Quarterly Inventory Detail", make the title 20-point bold, and format UnitCost as currency with no decimal places.
```

Review decisions:

1. For title text, choose the candidate displaying
   `Synthetic Inventory Detail`.
2. For title size/weight, choose that same visible candidate.
3. Confirm the unique `UnitCost` detail candidate.
4. Confirm that no operation is blocked or unreviewed.
5. Click **Create reviewed copy**.

App checks:

- Original input hash remains
  `e3a34afe7c29c9f773098d9f5bfd65ad2cf60219f78999d46a447250bb2448e3`.
- A new RDL and manifest are created.
- App validation reports PASS.
- The title is `Quarterly Inventory Detail`, 20pt Bold.
- The selected UnitCost detail format is `C0`.
- No unrelated report item changes.

Report Builder checks:

1. Open the generated RDL. Record any repair or conversion warning.
2. Run Preview.
3. Confirm all five inventory detail rows remain.
4. Confirm the title and UnitCost formatting.
5. Confirm no `#Error`, clipping, or unexpected blank page.
6. Record the actual Preview page count.
7. Export PDF and record the actual PDF page count.
8. Export Excel and record the actual worksheet count.

## 3. Scenario 2 — controlled grouped report

Input:

```text
inputs\synthetic-department-sales.rdl
```

Request:

```text
Change the report title to "Quarterly Department Sales" and format Revenue as currency with no decimal places.
```

Review decisions:

1. Confirm the resolved title candidate.
2. Select all three exact Revenue candidates: detail, Department subtotal, and
   Grand Total.
3. Click **Create reviewed copy**.

App checks:

- Original input hash remains
  `03c7a6eacd6b003aeaace0264a361267ce208de6388420f0d465608f3540174b`.
- A new RDL and manifest are created.
- App validation reports PASS.
- The title is updated.
- Exactly three Revenue formats are changed to `C0`.
- Grouping and pagination structure remain preserved.

Report Builder checks:

1. Open without repair or conversion warning and run Preview.
2. Confirm four Department groups, eight detail rows, four subtotals, and one
   Grand Total.
3. Confirm repeating headings and existing group page breaks.
4. Confirm Revenue detail, subtotal, and Grand Total show no decimals.
5. Confirm no `#Error`, clipping, or unexpected blank page.
6. Confirm and record Preview page count: expected `4`.
7. Export PDF; confirm and record page count: expected `4`.
8. Export Excel; confirm and record worksheet count: expected `4`.

## 4. Scenario 3 — Microsoft Invoice

Input:

```text
inputs\Invoice.rdl
```

Request:

```text
Format Quantity as a number with no decimal places.
```

Review decisions:

1. Confirm the unique Quantity candidate.
2. Click **Create reviewed copy**.

App checks:

- Original input hash remains
  `6251f6b9f76618dd5c2f9accc614b9e198fc221d2310a39508f6ac4897d53fdc`.
- A new RDL and manifest are created.
- Only the reviewed Quantity display changes to `N0`.
- Structural-preservation and XML/XSD validation report PASS.

Report Builder checks:

1. Open without repair or conversion warning.
2. Do not connect to an external data source or provide credentials.
3. Run Preview using only the embedded synthetic sample data.
4. Confirm invoice content remains visible and Quantity is a whole number.
5. Confirm the embedded logo, header, and footer remain.
6. Confirm no `#Error` or unexpected blank page.
7. Record actual Preview page count.
8. Export PDF and record actual page count.
9. Export Excel and record actual worksheet count.

## 5. Scenario 4 — Microsoft Transcript

Input:

```text
inputs\Transcript.rdl
```

Request:

```text
Change the report title to "Professional Certification Transcript" and make the title 20-point bold.
```

Review decisions:

1. Confirm the resolved page-header candidate for title text.
2. Confirm the same page-header candidate for title size/weight.
3. Click **Create reviewed copy**.

App checks:

- Original input hash remains
  `9693231c79853b0881d0414f1c98242c76216efc00784b3bc81acc69430b2e81`.
- A new RDL and manifest are created.
- The page-header constant title becomes
  `Professional Certification Transcript`, 20pt Bold.
- Embedded images and nested containers remain structurally unchanged.
- XML/XSD validation reports PASS.

Report Builder checks:

1. Open without repair or conversion warning.
2. Do not connect to an external data source or provide credentials.
3. Run Preview using only embedded synthetic sample data.
4. Confirm the page-header title, body transcript content, and embedded images.
5. Confirm no `#Error`, clipping, or unexpected blank page.
6. Record actual Preview page count.
7. Export PDF and record actual page count.
8. Export Excel and record actual worksheet count.

## 6. Final integrity checks

1. Re-run SHA-256 for all four original files in `inputs` and confirm they
   still match `SHA256SUMS.txt`.
2. Confirm every generated copy has an adjacent manifest.
3. Retain screenshots of app review decisions, app completion, Report Builder
   Design/Preview, PDF, and Excel results.
4. Copy the completed template below into the validation response.

## Validation result template

```text
Windows launch: PASS/FAIL

Simple table:
- App copy: PASS/FAIL
- Report Builder open: PASS/FAIL
- Preview pages:
- PDF pages:
- Excel worksheets:
- Notes:

Grouped report:
- App copy: PASS/FAIL
- Report Builder open: PASS/FAIL
- Preview pages:
- PDF pages:
- Excel worksheets:
- Notes:

Invoice:
- App copy: PASS/FAIL
- Report Builder open: PASS/FAIL
- Preview pages:
- PDF pages:
- Excel worksheets:
- Notes:

Transcript:
- App copy: PASS/FAIL
- Report Builder open: PASS/FAIL
- Preview pages:
- PDF pages:
- Excel worksheets:
- Notes:

Original inputs unchanged: PASS/FAIL
Manifests created: PASS/FAIL
Unexpected warnings or errors: NONE / details
```
