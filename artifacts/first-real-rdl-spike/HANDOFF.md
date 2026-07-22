# Regional Sales Detail — independent Report Builder handoff

Status: generated and structurally validated; Report Builder opening, Preview, PDF export, and Excel export are `PENDING WINDOWS`.

## Files

- `Regional Sales Detail.rdl` — actual RDL 2016/01 report with 24 synthetic rows embedded through Microsoft Report Builder's `ENTERDATA` provider.
- `regional-sales.csv` — reviewable copy of the same synthetic dataset; the RDL does not read this file at runtime.
- `.backups/Regional Sales Detail.rdl` — hash-verified pre-replacement backup produced by the second deterministic generation.
- `manifest.json` and `MANIFEST.md` — machine- and human-readable structure, validation, and SHA-256 evidence.
- `VALIDATOR_OUTPUT.txt` — exact XSD validation command and output.
- `SHA256SUMS` — complete handoff-file inventory.

The report uses no credentials, server, tenant, gateway, database, network query, employer data, custom code, or executable content.

## Reproduce

From a clean clone with Node.js 22, pnpm 11, and `xmllint` installed:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm spike:rdl-generate --output ./artifacts/first-real-rdl-spike
```

The command prints the final RDL path. Run it a second time to exercise backup creation and hash verification.

## Expected Preview

The report title is `Regional Sales Detail`, followed by a January–March 2026 reporting-period subtitle. The tablix has columns Date, Salesperson, Customer, Product, Category, Qty, Revenue, and Gross Profit. It should show three regions in order—Central, East, West—with eight detail rows per region, alternating detail shading, a subtotal row after each region, and an intentional page break between regions. A Grand Total row follows the last region. Revenue and Gross Profit use currency formatting; Quantity uses integer formatting. The footer shows `Page N of M`.

Expected totals computed from the embedded rows:

| Region      |    Revenue | Gross Profit |
| ----------- | ---------: | -----------: |
| Central     | $16,410.00 |    $6,560.00 |
| East        | $18,900.00 |    $7,210.00 |
| West        | $21,895.00 |    $8,050.00 |
| Grand Total | $57,205.00 |   $21,820.00 |

## Open and validate in Power BI Report Builder

1. Use a personally controlled Windows 10/11 environment and install the current Power BI Report Builder from Microsoft.
2. Copy this entire `first-real-rdl-spike` directory to Windows. Work from a disposable copy so the tracked RDL and backup remain unchanged.
3. Start Power BI Report Builder and choose **Open** > **Browse**, then open `Regional Sales Detail.rdl`.
4. Record the exact Windows and Report Builder versions. Capture every upgrade, repair, security, provider, data-source, or invalid-definition dialog before dismissing it.
5. Confirm Design view shows the `RegionalSales` dataset and `EnterDataDS` data source without a credential prompt.
6. Select **Run** on the Home ribbon. Preview must display all 24 actual rows, the three region groups, regional subtotals, grand totals, repeated headers on later pages, and page numbers.
7. Inspect Print Layout and confirm content is not clipped horizontally and region page breaks are intentional.
8. Return screenshots of Design view, the first Preview page, each region subtotal, the grand total/footer, and any warning or error.

If opening or Preview fails, do not save. Close Report Builder and choose **Don't Save** when prompted. Preserve the failing copy and return the full dialog text, screenshots, Report Builder version, and the unchanged RDL.

## PDF export

1. With Preview successfully displaying real rows, select **Export** on the ribbon.
2. Select **PDF**, save as `Regional Sales Detail.pdf`, and open it.
3. Confirm all regions, subtotals, grand totals, repeated headers, page breaks, margins, and `Page N of M` are present and unclipped.
4. Return the PDF and a screenshot of its first and final pages.

## Excel export

1. Return to Preview and select **Export**.
2. Select **Excel**, save as `Regional Sales Detail.xlsx`, and open it.
3. Confirm the workbook contains all 24 detail rows and visible regional subtotal and grand-total values, with no truncated headings or error cells.
4. Return the workbook and a screenshot showing the first rows and totals.

Microsoft's current instructions confirm the Report Builder workflow is **Run or Preview** > **Export** > choose the format: <https://learn.microsoft.com/power-bi/paginated-reports/report-builder/export-reports-report-builder>.
