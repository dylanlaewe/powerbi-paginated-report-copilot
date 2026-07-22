# Candidate 06b seed rejected by explicit-dimension regression

## Finding

`KnownGoodProductionPaginationLetter.rdl` cannot be used for byte-identical Candidate 06b generation.

- Current SHA-256: `5df87783bd060d812058a57310e5d5c274373ee068bdcd26e0229c12cf665076`
- `<PageWidth>`: absent
- `<PageHeight>`: absent
- margins: four explicit `0.5in` values
- pagination, grouping, totals, footer, and data: preserved

The in-place correction commit `e1d8252` changed only `am:LastModifiedTimestamp`; `git show`, text search, and raw-byte inspection confirm no page-dimension element was added. Compared with failed Candidate 06's seed, the file still differs only by timestamp. Candidate 06 independently proved that omitted dimensions can resolve as runtime width `13in` and PageHeight `0`. A timestamp-only change cannot satisfy explicit physical-dimension requirements.

Candidate 06b was not generated. Candidate 06 remains unchanged and failed.

## Required replacement seed

Create and return:

`samples/report-builder-seeds/KnownGoodProductionPaginationLetterExplicit.rdl`

It must preserve all currently proven report structures and serialize these exact elements inside the report section's `<Page>` element:

```xml
<PageWidth>8.5in</PageWidth>
<PageHeight>11in</PageHeight>
<LeftMargin>0.5in</LeftMargin>
<RightMargin>0.5in</RightMargin>
<TopMargin>0.5in</TopMargin>
<BottomMargin>0.5in</BottomMargin>
```

Use Power BI Report Builder's Page Setup/Properties UI. Before committing, verify the saved bytes in PowerShell:

```powershell
Select-String -Path ".\samples\report-builder-seeds\KnownGoodProductionPaginationLetterExplicit.rdl" -Pattern '<PageWidth>8.5in</PageWidth>'
Select-String -Path ".\samples\report-builder-seeds\KnownGoodProductionPaginationLetterExplicit.rdl" -Pattern '<PageHeight>11in</PageHeight>'
```

Both commands must return a match. A Design-view value alone is insufficient.

Then save, close, reopen, Preview, export PDF, and export Excel. Return concrete counts, no blank pages, no clipping, repeated headings, Page N of M, Region breaks, six rows, three Region subtotals, one Grand Total, Report Builder version, SHA-256, screenshots, and any dialogs.

If Report Builder removes the explicit dimensions again, do not resubmit another timestamp-only seed. Direction is then required on whether deterministic insertion of these two scalar page-size elements is permitted. No tablix, group, break, repeating-header, or footer XML would be reconstructed.
