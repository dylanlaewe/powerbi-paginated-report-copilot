# Candidate 05 Windows validation

## Acceptance criterion

Power BI Report Builder opens and previews Candidate 05 with all six detail rows, all three Region subtotals, and one mathematically correct report grand total. Do not generate or test Candidate 06.

## Identity and reproduction

- Candidate: `artifacts/rdl-compatibility-ladder/05-grand-total.rdl`
- SHA-256: `13a62fcb5858fc53c45cf465de70d53d481c82722e1855c59d6aa2e72378c6dc`
- Report Builder template: `samples/report-builder-seeds/KnownGoodGrandTotal.rdl`
- Template SHA-256: `2056e175e99364301dcfd07c0e54e7f417e3851ffe5617589f4f707e47b4eba7`
- Only template change: report-level `Textbox2` label from `Total` to `Grand Total`

From a clean clone after `corepack enable && pnpm install --frozen-lockfile`:

```sh
pnpm spike:rdl-compatibility-05 artifacts/rdl-compatibility-ladder
```

The command prints the final absolute report path and does not use `tmp/`.

## Windows procedure

1. Use a fresh checkout of the latest `spike/first-real-rdl-generation`.
2. In PowerShell, record integrity evidence:

   ```powershell
   git check-attr text -- ".\artifacts\rdl-compatibility-ladder\05-grand-total.rdl"
   git config --show-origin --get-all core.autocrlf
   Get-FileHash ".\artifacts\rdl-compatibility-ladder\05-grand-total.rdl" -Algorithm SHA256
   ```

   The attribute must end in `text: unset`; SHA-256 must equal `13a62fcb…c6dc`.

3. Open Power BI Report Builder and select **File → Open → This PC → Browse**, then open `05-grand-total.rdl`.
4. Record and capture any exception, repair, conversion, or upgrade request.
5. In Design view, confirm:
   - title: **Regional Sales Subtotal Compatibility Test**;
   - all nine fields and six Candidate 04c rows remain in `SeedData`;
   - Row Groups retains `Region → Region1 → Details` and the existing Region subtotal member;
   - exactly one additional static report-total member follows the complete dynamic Region member;
   - exactly one fourth body row follows the Region subtotal row;
   - its visible outer label is **Grand Total**; and
   - its Quantity, Revenue, and GrossProfit expressions are Report Builder-authored unscoped sums in dataset/report context.

6. Capture a full-window Design screenshot showing the table and Row Groups pane.
7. Select **Run**, expand every Region if necessary, and verify all six Candidate 04c details appear exactly once with no prior or changed data.
8. Verify the existing Region subtotals remain:

   | Region  | Quantity |   Revenue | Gross Profit |
   | ------- | -------: | --------: | -----------: |
   | Central |       17 | $4,050.00 |    $1,610.00 |
   | East    |       14 | $5,950.00 |    $2,270.00 |
   | West    |       30 | $5,990.00 |    $2,370.00 |

9. Verify exactly one final row after all Regions:

   | Label       | Quantity |    Revenue | Gross Profit |
   | ----------- | -------: | ---------: | -----------: |
   | Grand Total |       61 | $15,990.00 |    $6,250.00 |

10. Confirm no duplicate/omitted detail or subtotal, no second grand total, no `#Error`, blank aggregate, reference/scope error, page break, or parameter.
11. Record actual pagination and any wrapping/overflow. Capture collapsed and expanded full-window Preview screenshots showing the final Grand Total.
12. Close Report Builder and choose **No** if prompted to save, particularly after an error, to preserve candidate bytes.

Return the hash, Report Builder version, open/repair results, Design screenshot, collapsed and expanded Preview screenshots, six-row/three-subtotal/grand-total verification, pagination, and every error screenshot. Do not test exports or advance the ladder.
