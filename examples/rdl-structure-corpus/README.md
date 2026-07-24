# RDL Structure Corpus v0.3

Gate 1 is design-only. No source RDL, expected output, inventory, or Report Builder validation claim exists yet.

Each fixture will use this structure beginning at the authorized gate:

```text
<fixture>/
  source/
  requests/
  expected/
  inventory/
  validation/
```

`index.json` is the runtime-validated design contract. Null source identity and namespace fields and `pending Gate 2` validation statuses are intentional until Dylan authors and validates the four sources in Microsoft Power BI Report Builder.

All fixtures will be personally authored by Dylan from blank Report Builder reports using synthetic Enter Data content and contributed under the repository MIT license. No company reports, customer data, credentials, external queries, or copied report assets are permitted.
