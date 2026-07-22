# Candidate 04c Windows validation

## Result

**PASS — independently accepted on Windows.** Report Builder opened the artifact without exception, repair, conversion, or upgrade; Design and one-page Preview passed; the replacement title and all six replacement rows rendered exactly once; no prior data remained; and all three Region subtotals matched. No grand total, `#Error`, or blank aggregate appeared.

The title, several headers/details, and some currency values wrap in the preserved narrow layout. Region and Region1 are both visible. These are deferred presentation issues, not structural or calculation failures.

## Acceptance criterion

Met. Power BI Report Builder opened and previewed `04c-template-instantiated-subtotal.rdl` with its replacement six-row dataset and three mathematically correct Region subtotals.

## Identity and reproduction

- Candidate: `artifacts/rdl-compatibility-ladder/04c-template-instantiated-subtotal.rdl`
- SHA-256: `f3844e47c16670a21715c2a476d87f5f01d8018c2f5cb45a37aa3afa6211aa90`
- Template: `samples/report-builder-seeds/KnownGoodRegionSubtotal.rdl`
- Template SHA-256: `5b670cdd46a820ada82386b1d5dff6d1910e5eb54088d36cecb9e5df3a34555a`
- Title: `Regional Sales Subtotal Compatibility Test`

From a clean clone after `corepack enable && pnpm install --frozen-lockfile`:

```sh
pnpm spike:rdl-compatibility-04c artifacts/rdl-compatibility-ladder
```

The command prints the final absolute report path and does not use `tmp/`.

## Windows procedure

1. Check out the latest `spike/first-real-rdl-generation` in a fresh clone.
2. In PowerShell, record integrity evidence:

   ```powershell
   git check-attr text -- ".\artifacts\rdl-compatibility-ladder\04c-template-instantiated-subtotal.rdl"
   git config --show-origin --get-all core.autocrlf
   Get-FileHash ".\artifacts\rdl-compatibility-ladder\04c-template-instantiated-subtotal.rdl" -Algorithm SHA256
   ```

   The attribute must end in `text: unset`; the hash must equal `f3844e47…aa90`.

3. Open Power BI Report Builder and select **File → Open → This PC → Browse**, then open `04c-template-instantiated-subtotal.rdl`.
4. Record and capture any exception, repair, conversion, or upgrade request.
5. In Design view, verify the title is **Regional Sales Subtotal Compatibility Test**; `SeedData` has all nine fields and six replacement rows; and Row Groups retains `Region → Region1 → Details` plus the static subtotal member.
6. Capture a full-window Design screenshot showing the title, tablix, dataset fields, and Row Groups pane.
7. Select **Run**, expand all Regions if necessary, and verify these six rows exactly once:

   | Date       | Region  | Salesperson | Customer       | Product         | Category        | Qty |   Revenue | Gross Profit |
   | ---------- | ------- | ----------- | -------------- | --------------- | --------------- | --: | --------: | -----------: |
   | 2026-03-02 | Central | Dana Ortiz  | Cedar Clinic   | Standing Desk   | Furniture       |   5 | $2,400.00 |      $900.00 |
   | 2026-04-11 | Central | Eli Turner  | Summit Foods   | Cloud Seats     | Software        |  12 | $1,650.00 |      $710.00 |
   | 2026-03-08 | East    | Fran Okafor | Harbor Schools | Tablet Kit      | Technology      |   8 | $3,200.00 |    $1,280.00 |
   | 2026-04-19 | East    | Gale Singh  | Elm Logistics  | Storage Rack    | Furniture       |   6 | $2,750.00 |      $990.00 |
   | 2026-03-15 | West    | Harper Wu   | Mesa Transit   | Docking Station | Technology      |   9 | $4,100.00 |    $1,530.00 |
   | 2026-04-27 | West    | Indigo Ross | Juniper Arts   | Archive Box     | Office Supplies |  21 | $1,890.00 |      $840.00 |

8. Verify exactly one subtotal after each Region:

   | Region  | Quantity |   Revenue | Gross Profit |
   | ------- | -------: | --------: | -----------: |
   | Central |       17 | $4,050.00 |    $1,610.00 |
   | East    |       14 | $5,950.00 |    $2,270.00 |
   | West    |       30 | $5,990.00 |    $2,370.00 |

9. Confirm no detail is duplicated or omitted; no grand total appears; and no `#Error`, blank aggregate, field-reference, or scope error appears.
10. Record actual pagination and horizontal overflow. Capture full-window collapsed and expanded Preview screenshots showing all details and subtotals.
11. Close Report Builder and choose **No** if prompted to save, especially after any error, to preserve candidate bytes.

Return the hash, Report Builder version, open/repair results, Design screenshot, collapsed and expanded Preview screenshots, exact row/subtotal verification, pagination, and all error screenshots. Do not test exports or advance the ladder.
