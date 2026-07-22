# Candidate 06 production-pagination forensics

Command:

```sh
pnpm spike:rdl-pagination-forensics artifacts/rdl-compatibility-ladder/06-FORENSICS.json
```

The three-way comparison covers accepted Candidate 05, the first production-pagination seed, and corrected `KnownGoodProductionPaginationPrintSafe.rdl`. Report Builder adds the expected structural features to Candidate 05: `RepeatOnNewPage=true` on the existing static header member, `BreakLocation=Between` in the outer Region group, and a second footer textbox with `Page N of M`. It retains all six rows, four tablix rows/leaves, Region subtotals, and Grand Total. It does not add `FixedData`.

The seed also adds explicit `PageWidth=2in`, changes all margins to `0.5in`, and leaves PageHeight unspecified. With a `7in` body, printable width is `2 - 0.5 - 0.5 = 1in`; the required width is at least `8in` including margins. Therefore static print-safe validation fails.

The supplied PDF and Excel outcomes are recorded as passes, but Preview/PDF/Excel counts, unexpected blank pages, and horizontal clipping were unresolved placeholders. They do not provide evidence that the 2-inch dimension is intentional or safe.

The corrected seed removes only the erroneous explicit `PageWidth=2in` in addition to Report Builder's modification timestamp. Report Builder serializes the verified Letter `8.5in × 11in` configuration by omitting optional page dimensions and using RDL defaults. With `0.5in` margins, effective printable width is `7.5in`, so the `7in` body passes. Pagination structures are otherwise preserved.

Preview/PDF/Excel counts remain not provided because the submitted values were placeholders. Explicit no-blank-page, no-clipping, reopen, PDF, and Excel results are recorded as passes.
