# Gate 2H inspector normalization

This evidence records the deterministic transition from Gate 2G’s
`INVALID_REPORT` stop to successful read-only inspection when an RDL omits
`PageWidth` or `PageHeight`.

An omitted scalar is represented as `{ "presence": "omitted" }`. An explicit
valid scalar retains its source spelling and normalized inch value. A malformed
serialized scalar remains `INVALID_REPORT`. No page size, margin, or
orientation default is inferred or written.

The Microsoft RDL schema defines the physical page scalars as optional
`ReportSize` elements. The accepted corpus confirms that Report Builder can
serialize reports without those elements. Body `Width` remains reported as its
serialized string. Margins use the same explicit/omitted representation;
absence is not treated as zero. Column spacing is outside the current product
inventory and is intentionally unchanged.

Regenerate from the repository root:

```sh
pnpm exec tsx scripts/generate-inspector-normalization-baseline.mts
```

Invoice and Transcript were parsed only as static local XML input with
`NONET`/no external entities. They were not opened, queried, rendered,
published, previewed, or exported.
