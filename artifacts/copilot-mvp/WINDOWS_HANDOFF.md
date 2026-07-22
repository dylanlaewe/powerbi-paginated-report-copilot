# Natural-language RDL MVP Windows handoff

Test the exact file `artifacts/copilot-mvp/regional-sales-generated.rdl`.

Expected SHA-256: `ae2ed7f3ef0df988b550ea2f46ed7490d4c6de3d2e67c58646c2a2c61d9669c1`

## Procedure

1. Verify the SHA-256 in PowerShell with `Get-FileHash .\artifacts\copilot-mvp\regional-sales-generated.rdl -Algorithm SHA256`.
2. Open the file in Power BI Report Builder. Capture any repair, conversion, upgrade, or error dialog verbatim.
3. Confirm Design view loads and the title is `Northwind Field Sales — July 2026`.
4. Confirm the embedded dataset contains the six new people: Maya Chen, Noah Bennett, Olivia Mensah, Pavel Novak, Quinn Alvarez, and Rina Shah.
5. Preview. Capture every page and record the page count.
6. Confirm Central, East, and West begin on separate pages; headings repeat; `Page N of M` renders; no blank pages or horizontal clipping appear.
7. Confirm every detail row appears exactly once and verify:

| Scope       | Quantity |    Revenue | Gross Profit |
| ----------- | -------: | ---------: | -----------: |
| Central     |       19 |  $5,370.00 |    $2,170.00 |
| East        |       10 |  $7,590.00 |    $2,830.00 |
| West        |       30 |  $7,500.00 |    $2,970.00 |
| Grand Total |       59 | $20,460.00 |    $7,970.00 |

8. Confirm Letter portrait `8.5in × 11in`, four `0.5in` margins, and no `#Error` or blank aggregates.
9. Close using **Don't Save** and recompute SHA-256 to prove Report Builder did not alter the artifact.

Return the before/after hash, Report Builder version, Design screenshot, every Preview page, exact page count, all observations above, and every dialog. The acceptance criterion is successful open and Preview with the new title/data, correct totals and pagination, repeated headings, and Page N of M.
