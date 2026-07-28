# Gate 2L operation-level read-only review

These artifacts demonstrate the layer between typed read-only resolution and a
future target-authorization design:

```text
typed resolution outcome
→ operation-level user review decision
→ future target authorization (not implemented)
```

Each plan operation receives its own deterministic operation ID and review
state. Resolved candidates require explicit confirmation. Ambiguous title
operations require exactly one candidate; ambiguous field-format operations
accept one or more exact candidate IDs. Blocked operations offer no selection.

Every bundle and operation retains `mutationAuthorized: false` and
`executable: false`. No writable target or edited RDL is produced. Artifact
candidate IDs are deterministic diagnostics; live Electron review IDs are
fresh inspection-session UUIDs.

Regenerate from the repository root:

```sh
pnpm exec tsx scripts/generate-review-workflow-evidence.mts
```

Invoice and Transcript were read only as static local XML with network,
external entities, DTD loading, query execution, custom code, rendering,
Preview, publishing, and export disabled.
