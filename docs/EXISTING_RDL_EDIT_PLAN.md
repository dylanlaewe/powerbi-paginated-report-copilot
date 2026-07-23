# Existing RDL EditPlan v1

The v0.2 mutation contract is a versioned, strict Zod discriminated union. It is serializable, deterministic, and contains semantic targets rather than report-item names, XPath, XML, or output paths.

Supported operations are:

- `setText` for the resolved report title
- `setTextStyle` for title font size, font weight, and clearly requested alignment
- `setPageOrientation` by swapping existing width and height while preserving page family and margins
- `setNumberFormat` for exact displays of one existing field using `C0`, `C2`, `N0`, `N2`, `P0`, or `P2`

Every operation references a semantic target. The target-resolution layer—not the request, renderer, or future LLM—attaches concrete report-item evidence before application. Ambiguous or missing targets fail closed. A plan may contain at most one operation of each type; duplicate or conflicting operations are rejected.

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

Gate 2 executes only this hand-authored plan through the service layer. Sentence-form planning remains unimplemented until Gate 3 review.
