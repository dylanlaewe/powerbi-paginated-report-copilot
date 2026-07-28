# Gate 2J read-only title resolution

This directory records deterministic evidence-based title ranking and typed
read-only outcomes for the four accepted corpus fixtures.

The generic resolver can return `resolved`, `ambiguous`, `notFound`, or
`unsupported`. Every outcome has `mutationAuthorized: false`. A resolved
diagnostic candidate is not an approved mutation target.

Scoring combines safely understood text, generic title-oriented naming,
relative font prominence, bold style, structural separation, body or
page-header placement, width, concise phrase shape, and generic title terms.
Negative evidence covers tablix headers and labels, footer placement,
visibility, small or narrow labels, prompt punctuation, metadata/disclaimers,
and paragraph-length text. Deterministic path ordering never converts a
semantic tie into resolution.

Regenerate from the repository root:

```sh
pnpm exec tsx scripts/generate-title-resolution-evidence.mts
```

Invoice and Transcript were processed only as static local XML with network and
external-entity access disabled. They were not opened, rendered, queried,
previewed, published, or exported.
