# Gate 2M review-bound generic mutation

This evidence records the first complete generic workflow:

```text
inspect → plan → resolve → review → confirm exact candidates
→ main-process authorization → mutate a duplicate → validate → manifest
```

The five scenarios cover controlled simple-table title/style/UnitCost changes,
controlled grouped title plus all-three Revenue formatting, grouped detail-only
formatting, static Microsoft Invoice Amount/Quantity formatting, and static
Microsoft Transcript page-header title/style changes.

Generated RDL bytes are validated and hashed but not committed. The JSON
results contain source/output hashes, exact diagnostic selections, validation,
preservation evidence, and deterministic manifests. Product output uses fresh
duplicate-safe names in the controlled user-data folder.

External samples were processed as static local XML only. No query, expression,
custom code, external reference, Report Builder rendering, Preview, publishing,
or export occurred. Their generated copies are not described as Report
Builder-validated.

Regenerate from the repository root:

```sh
pnpm exec tsx scripts/generate-generic-mutation-evidence.mts
```
