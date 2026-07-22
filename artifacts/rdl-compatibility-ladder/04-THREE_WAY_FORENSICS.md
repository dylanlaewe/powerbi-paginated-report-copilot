# Candidate 04 subtotal forensics

Command:

```sh
pnpm spike:rdl-subtotal-forensics artifacts/rdl-compatibility-ladder/04-THREE_WAY_FORENSICS.json
```

The machine-readable output is `04-THREE_WAY_FORENSICS.json`. It compares accepted Candidate 03b, rejected Candidate 04, and accepted Report Builder-authored `KnownGoodRegionSubtotal.rdl`.

All three preserve `Region → Region1 → Details`. Both subtotal files contain three body rows and three row-hierarchy leaves, so collection-count equality did not predict compatibility.

The rejected subtotal row has four physical cells, with its first cell spanning five columns. Its Region-specific label is in that merged body cell, and its aggregates explicitly name `Region` scope. The Report Builder seed has eight unmerged physical cells. Its `Total` label is a `TablixHeader` on the static subtotal hierarchy member before `KeepWithGroup=Before`; its aggregates are unscoped in their nested member context.

These are structural discriminators, not a proven root cause. No individual XML difference is asserted to cause the exception. The regression accepts the Report Builder fingerprint and rejects both failed Candidate 04 and the grouped baseline without a subtotal.
