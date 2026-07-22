# Candidate 05 prerequisite: Report Builder grand-total seed

## Resolution

**RESOLVED.** `samples/report-builder-seeds/KnownGoodGrandTotal.rdl` was created, previewed, saved, closed, reopened, previewed again, and committed. SHA-256 is `2056e175e99364301dcfd07c0e54e7f417e3851ffe5617589f4f707e47b4eba7`. The instructions below remain as provenance for how the seed was produced.

## Repository finding

At the time of this prerequisite record, no accepted Report Builder-authored grand-total seed existed. The canonical seeds then were:

- `KnownGoodEnterDataTable.rdl`
- `KnownGoodRegionGroup.rdl`
- `KnownGoodRegionSubtotal.rdl`

The old rejected `Regional Sales Detail.rdl` contains grand-total text, but it failed to open in Report Builder and is not a compatibility seed. It was not used. Candidate 05 now derives from the accepted seed without constructing a hierarchy member.

## Create the required canonical seed on Windows

1. Use a clean checkout of `spike/first-real-rdl-generation` containing accepted Candidate 04c. Verify:

   ```powershell
   Get-FileHash ".\artifacts\rdl-compatibility-ladder\04c-template-instantiated-subtotal.rdl" -Algorithm SHA256
   ```

   Expected SHA-256: `f3844e47c16670a21715c2a476d87f5f01d8018c2f5cb45a37aa3afa6211aa90`.

2. Open `04c-template-instantiated-subtotal.rdl` in Power BI Report Builder. Confirm it opens and previews the already accepted six rows and three Region subtotals before editing.
3. Immediately use **File → Save As** to create a separate working file. Do not overwrite Candidate 04c.
4. In the **Row Groups** pane, select the **outer `Region` group**—not `Region1`, `Details`, or the existing static subtotal member.
5. Right-click the outer `Region` group and choose **Add Total → After**. Use Report Builder's command; do not edit XML or manually reconstruct hierarchy members.
6. Confirm the new total row is outside and after the complete outer Region group, so it renders once for the report rather than once per Region.
7. Set its visible label to **Grand Total** using Design view.
8. Retain the expressions Report Builder creates for Quantity, Revenue, and GrossProfit. They must evaluate in dataset/report context, outside `Region` scope. Do not hand-edit their XML serialization.
9. Preserve the Candidate 04c title, six embedded rows, three existing Region subtotal rows, group hierarchy, formatting, page settings, and all other content. Add no page break or parameter.
10. Preview and verify:
    - all six detail rows appear exactly once;
    - the existing Central, East, and West subtotals remain unchanged;
    - exactly one **Grand Total** row appears after all Region groups;
    - Quantity is `61`;
    - Revenue is `$15,990.00`;
    - Gross Profit is `$6,250.00`;
    - no `#Error`, blank aggregate, duplicate row, or report repair occurs.

11. Save as:

    `samples/report-builder-seeds/KnownGoodGrandTotal.rdl`

12. Close Report Builder, reopen that exact saved file, and repeat Design and Preview verification. This reopen is required before treating it as canonical.
13. Return the Report Builder version, SHA-256, actual pagination, Design screenshot with Row Groups visible, expanded Preview screenshot, and any dialogs.
14. Commit and push only the verified seed to `spike/first-real-rdl-generation`. The `.rdl -text` policy should resolve as `text: unset` and preserve its raw bytes.

Once this accepted seed exists, Candidate 05 can use the same forensic and template-derived method proven by Candidate 04c.
