# Existing RDL Sidecar Editor v0.2 architecture

## Product boundary

The product vision is a broad conversational assistant that can work beside Power BI Report Builder. Version 0.2 is deliberately narrower: it will inspect an existing RDL and safely apply a small allowlist of deterministic property edits to a copy after the user reviews a typed plan.

The required flow is:

```text
sentence-form request
→ EditPlanner
→ runtime-validated EditPlan
→ deterministic target resolution
→ deterministic RDL mutation
→ XML/XSD, semantic, and structural-diff validation
→ atomic edited copy plus audit manifest
```

Raw request text, renderer messages, and future model output are never XML mutation instructions. The main process owns file selection and access. The renderer will receive a structured inventory and opaque report handle, not unrestricted filesystem access.

## Acceptance ladder status

- Gate 1 — inspection: implemented and locally validated.
- Gates 2–6: not started.

Gate 1 adds no mutation engine, planner, CLI edit flow, or Electron UI changes.

## Gate 1 inspection service

`packages/rdl-copilot/src/inspection.ts` provides:

- `inspectRdlFile`: canonicalizes the selected path with `realpath`, requires a regular `.rdl` file, enforces a 20 MiB limit, and reads it once.
- `inspectRdlBytes`: parses with bundled `libxml2-wasm`, network and external-entity loading disabled, then emits a runtime-validated inventory.
- `resolveReportTitle`: prefers a checksum-configured exact item name for the reviewed fixture, otherwise permits only one top-level body textbox containing one static value and no expression.
- `resolveFieldDisplays`: requires one declaring dataset and resolves only exact direct or `Sum` field expressions. Labels and unrelated expressions are excluded.
- `resolveInventoryTargets`: returns the Gate 1 title and Revenue evidence without accepting a renderer-supplied XPath or mutation target.

The inspection result intentionally excludes embedded row values. It reports structural metadata needed for review without unnecessarily copying report data into evidence or logs.

## Runtime inventory schema

The Zod schema `rdlInventorySchema` is strict and versioned as `1`. Its top-level shape is:

```ts
{
  version: 1;
  fileName: string;
  sourceSha256: string;
  namespace: string;
  namespaceVersion: string;
  reportSections: Array<{
    index: number;
    bodyWidth: string | null;
    pageWidth: string;
    pageHeight: string;
    orientation: "portrait" | "landscape" | "square";
    margins: { left: string; right: string; top: string; bottom: string };
  }>;
  datasets: Array<{ name: string; fields: string[] }>;
  reportParameters: string[];
  tablixes: Array<{ name: string; datasetName: string | null }>;
  groups: Array<{ name: string; expressions: string[] }>;
  textboxes: Array<{
    name: string;
    container: "reportBody" | "tablix" | "pageHeader" | "pageFooter" | "other";
    top: string | null;
    left: string | null;
    staticText: string[];
    expressions: string[];
    fieldBindings: Array<{
      expression: string;
      fieldName: string;
      bindingKind: "direct" | "sum";
      format: string | null;
    }>;
    fontSizes: string[];
    fontWeights: string[];
    textAlignments: string[];
  }>;
}
```

The committed actual result, including every textbox, is in `examples/existing-rdl-sidecar/inventory/gate-1-inventory.json`.

## Gate 1 target evidence

Title:

- resolved item: `ReportTitle`
- configured evidence: fixture SHA-256 maps to exact item name `ReportTitle`
- current static text: `Regional Sales Subtotal Compatibility Test`
- generic fallback also resolves it because it is the only top-level body textbox with one static value, no expression, and an implicit top position of zero

Revenue displays:

- `Revenue`: `=Fields!Revenue.Value`, existing format `C2`
- `Textbox10`: `=Sum(Fields!Revenue.Value)`, existing format `C2`
- `Textbox19`: `=Sum(Fields!Revenue.Value)`, existing format `C2`

`HeaderRevenue` is correctly excluded because it contains static label text rather than a field expression.

Page:

- one ReportSection
- body width `7in`
- page `8.5in × 11in`, portrait
- all four margins `0.5in`

## Risks discovered

- The title textbox has no serialized `Top`, so the generic resolver treats the RDL default as an implicit `0in`. The checksum-configured exact name remains stronger evidence for this fixture.
- Total textbox names (`Textbox10`, `Textbox19`) are generic. Resolution therefore depends on exact expressions, not generated names.
- The same `=Sum(Fields!Revenue.Value)` expression appears at Region-subtotal and report-total levels. Gate 1 can identify both displays but does not yet encode their group scope; Gate 2's mutation guard must verify only their `Format` properties change.
- The Report Builder-authored hierarchy contains `Region → Region1 → Details`; inspection preserves and reports it without interpreting the duplicate visible Region levels.
- Embedded Enter Data XML includes a namespace reset. Inspection deliberately inventories declared fields and report structure but does not expose embedded row values.
