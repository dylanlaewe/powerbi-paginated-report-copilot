# Candidate 06 production-pagination forensics

Command:

```sh
pnpm spike:rdl-pagination-forensics artifacts/rdl-compatibility-ladder/06-FORENSICS.json
```

The Report Builder seed adds the expected structural features to accepted Candidate 05: `RepeatOnNewPage=true` on the existing static header member, `BreakLocation=Between` in the outer Region group, and a second footer textbox with `Page N of M`. It retains all six rows, four tablix rows/leaves, Region subtotals, and Grand Total. It does not add `FixedData`.

The seed also adds explicit `PageWidth=2in`, changes all margins to `0.5in`, and leaves PageHeight unspecified. With a `7in` body, printable width is `2 - 0.5 - 0.5 = 1in`; the required width is at least `8in` including margins. Therefore static print-safe validation fails.

The supplied PDF and Excel outcomes are recorded as passes, but Preview/PDF/Excel counts, unexpected blank pages, and horizontal clipping were unresolved placeholders. They do not provide evidence that the 2-inch dimension is intentional or safe.

Candidate 06 cannot both preserve this page dimension and satisfy the required print-safe-width condition. No Candidate 06 artifact is generated from this seed. Correct the page width through Report Builder, repeat save/close/reopen/Preview/PDF/Excel checks, and provide concrete counts plus `Unexpected blank pages: NO` and `Horizontal clipping: NO`.
