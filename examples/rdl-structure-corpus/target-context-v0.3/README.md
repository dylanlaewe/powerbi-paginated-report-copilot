# Gate 2I structural target context

This directory contains deterministic, read-only structural candidate catalogs
for the four accepted v0.3 corpus sources.

The catalog preserves region, containment, tablix/dataset identity, member
paths, expression classification, structural scope evidence, visibility, and
style. Diagnostic IDs are stable hashes for reproducible evidence only. They
are not live session handles and never authorize mutation.

Production mutation remains limited to the existing checksum-reviewed target
path. No generic title or field candidate is selected.

Regenerate from the repository root:

```sh
pnpm exec tsx scripts/generate-target-context-catalog.mts
```

Invoice and Transcript were processed only as static local XML with network and
external-entity access disabled. They were not opened, rendered, queried,
previewed, published, or exported.
