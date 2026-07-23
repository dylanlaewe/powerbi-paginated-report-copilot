# Existing RDL EditPlan v1

The v0.2 mutation contract is a versioned, strict Zod discriminated union. It is serializable, deterministic, and contains semantic targets rather than report-item names, XPath, XML, or output paths.

Supported operations are:

- `setText` for the resolved report title
- `setTextStyle` for title font size, font weight, and clearly requested alignment
- `setPageOrientation` by swapping existing width and height while preserving page family and margins
- `setNumberFormat` for exact displays of one existing field using `C0`, `C2`, `N0`, `N2`, `P0`, or `P2`

Every operation references a semantic target. The target-resolution layer—not the request, renderer, or future LLM—attaches concrete report-item evidence before application. Ambiguous or missing targets fail closed. A plan may contain at most one title, title-style, and orientation operation. It may contain one number-format operation per distinct field. Duplicate or conflicting operations for the same target are rejected.

Text sizes must be `1pt` through `100pt`. Font weight is `Normal` or `Bold`; alignment is `Left`, `Center`, `Right`, or `General`. Number formats are limited to `C0`, `C2`, `N0`, `N2`, `P0`, and `P2`.

The exact canonical plan is committed at `examples/existing-rdl-sidecar/requests/canonical-gate-2-edit-plan.json`:

```json
{
  "version": 1,
  "operations": [
    {
      "type": "setText",
      "target": { "kind": "reportItem", "semanticRole": "reportTitle" },
      "value": "Weekly Sales Pipeline"
    },
    {
      "type": "setTextStyle",
      "target": { "kind": "reportItem", "semanticRole": "reportTitle" },
      "fontSize": "18pt",
      "fontWeight": "Bold"
    },
    { "type": "setPageOrientation", "orientation": "landscape" },
    {
      "type": "setNumberFormat",
      "target": { "kind": "fieldDisplay", "fieldName": "Revenue" },
      "format": "C0"
    }
  ]
}
```

## Gate 3 deterministic sentence planner

`LocalSentenceEditPlanner` implements `EditPlanner.plan(request, context)` and returns a runtime-validated discriminated `planned` or `rejected` result. It is a bounded local recognizer, not an LLM, and never reads or writes an RDL.

The context contains only field names, formatting-target field names, the supported `reportTitle` semantic role, page orientation, and current title. It excludes XML, XPath, filesystem paths, embedded rows, and credentials.

Supported sentence categories are quoted title replacement, title point size/weight/alignment, portrait/landscape orientation, and existing-field `C0/C2/N0/N2/P0/P2` display formats. Field phrases are matched case-insensitively after removing spaces, hyphens, and underscores; the match must be unique (`Gross Profit` can map to `GrossProfit`).

The planner uses full span coverage. Connectors and punctuation may be ignored, but any meaningful unmatched fragment rejects the complete request. Compatible style clauses merge. Identical duplicate instructions deduplicate; conflicting values reject. Operations are serialized in title, style, orientation, then normalized-field format order.

Normalization is NFC, whitespace collapse outside quoted titles, Unicode-hyphen normalization, platform-independent newline handling, and case-insensitive command recognition. Quoted title content is preserved after NFC normalization. The canonical plan SHA-256 is `879e154376816bc9aef823689bc4d9e5a22daf96911965396fddb6a9cb99f5dc`.

Gate 4 exposes the planner through a noninteractive CLI. Plan-only and apply use the same validated plan and resolution path. The CLI cannot inject an EditPlan or operation directly.
