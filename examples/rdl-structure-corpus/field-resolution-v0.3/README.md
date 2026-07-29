# Gate 2K read-only field-display resolution

This directory contains deterministic dataset- and scope-aware resolution
evidence for every displayed field discovered in the four accepted corpus
fixtures.

Matching trims surrounding whitespace and performs case-insensitive exact
comparison. It does not use fuzzy, substring, plural, alias, or spelling
matching. One certain, structurally preserved display may resolve read-only.
Multiple datasets, scope roles, tablixes, or material visual locations remain
ambiguous.

Every outcome has `mutationAuthorized: false`. Diagnostic IDs are evidence
identifiers only; live Electron results use inspection-session UUIDs. The
checksum-reviewed numeric target system remains the sole writable field path.

Key review cases:

| Fixture              | Field      | Outcome                 | Reason                        |
| -------------------- | ---------- | ----------------------- | ----------------------------- |
| Simple table         | UnitCost   | resolved, high          | `FIELD_DISPLAY_RESOLVED`      |
| Grouped report       | Revenue    | ambiguous, 3 candidates | `MULTIPLE_SCOPE_ROLES`        |
| Microsoft Invoice    | Amount     | ambiguous, 2 locations  | `DUPLICATE_VISUAL_LOCATIONS`  |
| Microsoft Invoice    | Discount   | ambiguous, 2 locations  | `DUPLICATE_VISUAL_LOCATIONS`  |
| Microsoft Invoice    | Quantity   | resolved, high          | `FIELD_DISPLAY_RESOLVED`      |
| Microsoft Invoice    | SalesPrice | resolved, high          | `FIELD_DISPLAY_RESOLVED`      |
| Microsoft Transcript | Name       | ambiguous               | `MULTIPLE_DATASET_CANDIDATES` |
| Microsoft Transcript | Date       | resolved, high          | `FIELD_DISPLAY_RESOLVED`      |

`resolution-matrix.json` records the outcome for every distinct displayed field.
The `fixtures/` files contain the complete ranked candidates and evidence.
Serialized field type is `null` with `compatibilityUnknown: true` because the
unchanged Gate 2I display catalog does not retain a safely attributable
serialized type. No type is inferred from formatting or values.

Regenerate from the repository root:

```sh
pnpm exec tsx scripts/generate-field-resolution-evidence.mts
```

Invoice and Transcript were processed only as static local XML with network and
external-entity access disabled. They were not opened, rendered, queried,
previewed, published, or exported.
