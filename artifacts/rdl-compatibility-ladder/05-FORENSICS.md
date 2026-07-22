# Candidate 05 grand-total forensics

Run:

```sh
pnpm spike:rdl-grand-total-forensics artifacts/rdl-compatibility-ladder/05-FORENSICS.json
```

Compared accepted Candidate 04c with the reopened and previewed Report Builder-authored `KnownGoodGrandTotal.rdl`.

Report Builder retained the complete `Region → Region1 → Details` hierarchy and existing Region subtotal member. It added a fourth eight-cell body row with no spans and a fourth top-level row-hierarchy leaf after the dynamic Region member. That static leaf contains the authored `Textbox2` header (`Total`), a nested blank `Textbox12` header, and `KeepWithGroup=Before`. The fourth row contains unscoped Quantity, Revenue, and GrossProfit sums, placing them in dataset/report context outside Region. Tablix height increased from `0.8in` to `1.05in`.

The machine-readable JSON records row, leaf, cell, expression, scope, header, marker, height, page-break, and parameter evidence. Candidate 05 will derive from this exact structure. Only the report-level visible label will be instantiated from the seed's `Total` to the required `Grand Total`; no hierarchy XML will be constructed.
