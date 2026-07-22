# Candidate 04b Windows validation

## Result

**PASS — independently accepted on Windows.** SHA-256 matched. Report Builder opened the artifact without exception, repair, conversion, or upgrade; Design and Preview passed; all six detail rows appeared once; and Central, East, and West each displayed the expected Quantity, Revenue, and GrossProfit subtotal without `#Error` or blank aggregates. No grand total appeared.

Actual pagination was not supplied: the submitted result retained the literal `[INSERT PAGE COUNT]` placeholder. Generalized programmatic subtotal construction remains **NOT YET PROVEN** because this candidate is a byte-identical Report Builder-authored control.

## Acceptance criterion

Met. Power BI Report Builder opened and previewed `04b-region-subtotal-from-seed.rdl` with all six detail rows and three correct Region subtotal rows.

## Identity and reproduction

- Candidate: `artifacts/rdl-compatibility-ladder/04b-region-subtotal-from-seed.rdl`
- SHA-256: `5b670cdd46a820ada82386b1d5dff6d1910e5eb54088d36cecb9e5df3a34555a`
- Canonical seed: `samples/report-builder-seeds/KnownGoodRegionSubtotal.rdl`
- Derivation: byte-for-byte control copy

From a clean clone after `corepack enable && pnpm install --frozen-lockfile`, run:

```sh
pnpm spike:rdl-compatibility-04b artifacts/rdl-compatibility-ladder
```

The command prints the final absolute report path. It does not use `tmp/`.

## Windows steps

1. Check out the latest `spike/first-real-rdl-generation` in a fresh clone. Do not copy the earlier CRLF-converted working-tree file.
2. In PowerShell, record byte-integrity evidence:

   ```powershell
   git check-attr text -- ".\samples\report-builder-seeds\KnownGoodRegionSubtotal.rdl"
   git check-attr text -- ".\artifacts\rdl-compatibility-ladder\04b-region-subtotal-from-seed.rdl"
   git config --show-origin --get-all core.autocrlf
   Get-FileHash ".\samples\report-builder-seeds\KnownGoodRegionSubtotal.rdl" -Algorithm SHA256
   Get-FileHash ".\artifacts\rdl-compatibility-ladder\04b-region-subtotal-from-seed.rdl" -Algorithm SHA256
   ```

   Both attributes must end in `text: unset`; both hashes must equal `5b670cdd…555a`.

3. Open Power BI Report Builder. Use **File → Open → This PC → Browse** and select `04b-region-subtotal-from-seed.rdl`.
4. Record whether any exception, repair, conversion, or upgrade request appears. Capture the full dialog and expanded details if one appears.
5. In Design view, confirm the embedded `SeedData` dataset exposes all nine fields and the Row Groups pane shows `Region → Region1 → Details` plus the Report Builder-authored static subtotal member.
6. Confirm the table has a header row, detail row, and subtotal row. The subtotal has eight unmerged body cells; the hierarchy header displays `Total`; Quantity, Revenue, and GrossProfit contain their Report Builder-authored sum expressions.
7. Capture a full-window Design screenshot showing the tablix and Row Groups pane.
8. Select **Run**. Expand Region controls if needed and verify all six details remain under Central, East, and West with no duplicate, omitted, `#Error`, or reference-failure row.
9. Verify exactly one subtotal after each Region:

   | Region  | Quantity |   Revenue | GrossProfit |
   | ------- | -------: | --------: | ----------: |
   | Central |       17 | $3,850.00 |   $1,940.00 |
   | East    |       11 | $8,230.00 |   $2,340.00 |
   | West    |       43 | $6,180.00 |   $1,820.00 |

10. Confirm Quantity is a whole number, Revenue and GrossProfit are currency, no grand total appears, and record actual pagination/overflow.
11. Capture full-window collapsed and expanded Preview screenshots showing all three subtotal rows and all six details.
12. Close Report Builder and choose **No** if prompted to save, particularly after any error, so the control bytes are not overwritten.

Return the two hashes, Report Builder version, open/repair results, Design screenshot, collapsed and expanded Preview screenshots, row/subtotal verification, pagination, and every error screenshot. Do not test exports or advance the ladder.
