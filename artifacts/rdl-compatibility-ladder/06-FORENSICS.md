# Candidate 06 production-pagination forensics

Command:

```sh
pnpm spike:rdl-pagination-forensics artifacts/rdl-compatibility-ladder/06-FORENSICS.json
```

The three-way comparison covers accepted Candidate 05, the first production-pagination seed, and corrected `KnownGoodProductionPaginationPrintSafe.rdl`. Report Builder adds the expected structural features to Candidate 05: `RepeatOnNewPage=true` on the existing static header member, `BreakLocation=Between` in the outer Region group, and a second footer textbox with `Page N of M`. It retains all six rows, four tablix rows/leaves, Region subtotals, and Grand Total. It does not add `FixedData`.

The seed also adds explicit `PageWidth=2in`, changes all margins to `0.5in`, and leaves PageHeight unspecified. With a `7in` body, printable width is `2 - 0.5 - 0.5 = 1in`; the required width is at least `8in` including margins. Therefore static print-safe validation fails.

The supplied PDF and Excel outcomes are recorded as passes, but Preview/PDF/Excel counts, unexpected blank pages, and horizontal clipping were unresolved placeholders. They do not provide evidence that the 2-inch dimension is intentional or safe.

The first corrected seed removed only explicit `PageWidth=2in` in addition to changing Report Builder's modification timestamp. Local validation incorrectly treated omitted dimensions as safe Letter defaults. Independent Windows validation instead resolved Candidate 06 to `13in × 0`; Preview failed because zero is invalid.

An earlier `KnownGoodProductionPaginationLetter.rdl` revision also omitted both dimensions and was rejected. Seed commit `81861fb434547f101f0f455b7ca0ad2bd68cc86e` corrects the repository blob: it explicitly serializes `PageWidth=8.5in`, `PageHeight=11in`, and all four `0.5in` margins while preserving the proven report structures. Its SHA-256 is `c2d27f7595d9330eb9815f86483aa068129265a00980ca3b0b956f6f3f1de17a`.

Production validation rejects omitted, zero, malformed, non-Letter, or non-half-inch physical page sizes. Candidate 06b is generated as a byte-identical copy of this corrected seed; independent Windows validation of the candidate remains pending.
