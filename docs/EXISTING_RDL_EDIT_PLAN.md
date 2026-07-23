# Existing RDL EditPlan boundary

The v0.2 mutation contract will be a versioned, strict, runtime-validated plan. Gate 1 does not implement or execute it.

The first acceptance plan is expected to represent only:

- `setText` for the resolved report title
- `setTextStyle` for title font size, font weight, and clearly requested alignment
- `setPageOrientation` by swapping existing width and height while preserving page family and margins
- `setNumberFormat` for exact displays of one existing field using `C0`, `C2`, `N0`, `N2`, `P0`, or `P2`

Every operation will reference a semantic target. The target-resolution layer—not the request, renderer, or future LLM—will attach concrete report-item evidence before application. Ambiguous or missing targets fail closed.

Gate 2 will define the exact schema and mutation allowlist. No XML mutation, XPath, arbitrary target, output path, or unsupported operation is accepted through Gate 1.
