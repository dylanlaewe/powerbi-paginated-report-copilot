# Candidate 01 Windows validation

## Acceptance criterion

Power BI Report Builder must open and preview `01-minimal-enter-data-table.rdl` without an exception. No later ladder stage is in scope.

## File identity

- File: `artifacts/rdl-compatibility-ladder/01-minimal-enter-data-table.rdl`
- SHA-256: `151274f425f20e1bd88a7a8f892fca799f9efe9184b1df42e9cec53ab2e016a7`
- Canonical seed SHA-256: `dc3e3f939d0d5f0eb8242681b17c43aa49dd0455a65f4e8cad10fbe24408ab7f`

## Exact test steps

1. Clone or update `spike/first-real-rdl-generation` on Windows.
2. Verify the candidate SHA-256 in PowerShell:

   ```powershell
   Get-FileHash ".\artifacts\rdl-compatibility-ladder\01-minimal-enter-data-table.rdl" -Algorithm SHA256
   ```

3. Launch Power BI Report Builder.
4. Use **File → Open → This PC → Browse** and select the candidate file. Do not open the rejected `Regional Sales Detail.rdl`.
5. Record whether Design view opens without an error. Capture a full-window screenshot showing the title `RDL Compatibility Test`, the table, and Report Builder's title bar.
6. Select **Run** to enter Preview.
7. Record whether Preview completes without an error. Capture a full-window screenshot showing the title and rendered table. The embedded dataset contains exactly:

   | Region  | Revenue |
   | ------- | ------: |
   | East    |     100 |
   | West    |     200 |
   | Central |     300 |

   The canonical seed's Report Builder-authored tablix includes collapsed Region details and a total row. Its exact hierarchy was deliberately retained, so the initial display may aggregate or collapse rows. Do not edit or expand the report solely to change its presentation; the gate is open plus Preview without exception.

8. If any dialog appears, capture the entire dialog, expand and capture all available details, and copy the exact message and stack information if offered. Also capture the Report Builder version from **Help → About**.
9. Close Report Builder. If prompted to save, select **No** so Windows validation does not overwrite the candidate.

## Return evidence

- Candidate SHA-256 from Windows.
- Report Builder version.
- Open result: PASS or FAIL.
- Preview result: PASS or FAIL.
- Design screenshot.
- Preview screenshot.
- Every error dialog and its complete text.

Do not test PDF or Excel export yet. Do not test or advance candidates 02–08 until candidate 01 passes this gate.
