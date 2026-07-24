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
- Gate 2 — typed deterministic mutation: implemented and locally validated.
- Gates 3–6: not started.

No sentence-form planner, product CLI edit flow, Electron sidecar integration, or Windows edited-report validation has started.

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

## Gate 2 mutation service

`packages/rdl-copilot/src/mutation.ts` accepts source bytes, their expected SHA-256, a strict EditPlan, and XSD bytes. It performs all target resolution before modifying a parsed in-memory document. The service never accepts raw XML fragments or XPath from the plan.

The canonical path resolves the title only through the reviewed source checksum and exact `ReportTitle` item name. It resolves Revenue through exact direct and `Sum` expressions and requires exactly three displays before mutation.

After operation-specific verification, `packages/rdl-copilot/src/structural-guard.ts` parses source and output independently. It normalizes only properties named by the validated plan to typed sentinel values, converts the parsed XML trees into namespace-aware semantic projections, and requires the complete projections to hash identically. Namespace-prefix presentation, attribute order, empty-element spelling, and whitespace-only nodes are deliberately not semantic properties.

The structural allowlist is plan-derived and contains only:

- title Value, FontSize, and FontWeight on `ReportTitle`
- PageWidth and PageHeight
- Format on `Revenue`, `Textbox10`, and `Textbox19`

Separate stable hashes prove preservation of embedded query/DesignerState data, datasets and fields, tablix row/column hierarchy, page breaks/repeating-header properties, and the footer. An unauthorized GrossProfit format mutation is rejected by regression coverage.

File application rechecks source bytes after validation, rejects source/output identity, restricts output to one `.rdl` filename under the supplied controlled directory, writes through a unique temporary file, and renames only after every validation passes.

## Gate 3 planning boundary

The `EditPlanner` boundary accepts sentence text and a minimized `EditPlannerContext`, then returns either a validated canonical EditPlan plus proposal and clause spans or a structured rejection. `LocalSentenceEditPlanner` is deterministic code, not an LLM. It cannot access XML, XPath, paths, embedded data, or mutation APIs.

Every meaningful input span must be recognized. Unsupported content before, between, or after supported clauses rejects the whole request, preventing best-effort partial edits. Proposal text is generated from the validated plan and describes intended semantic changes without claiming report-item resolution or file mutation. Target resolution remains a later Gate 4 responsibility.

## Gate 4 CLI transaction

`sidecar:cli` connects inspection, minimized planner context, `LocalSentenceEditPlanner`, validated EditPlan, exact target resolution, mutation, XSD validation, structural preservation, controlled output, and audit evidence. Plan and apply share `prepareSidecarEdit`; plan stops before source revalidation and mutation.

The CLI accepts only `--source` and `--request-file`. Output paths, XML, XPath, operations, and mutation targets cannot be supplied. Development output is rooted through `pnpm-workspace.yaml`, never `process.cwd()`, at `artifacts/existing-rdl-sidecar/edited-reports`.

Apply rereads the source immediately before mutation. Both RDL and manifest are written exclusively to synchronized temporary files. A duplicate-safe lock reserves the paired names; the RDL is renamed first and the manifest second. Failure removes temporary files and rolls back either final file, including the RDL when manifest rename fails. Rename durability and directory-entry atomicity retain the host filesystem's normal platform guarantees.

The adjacent strict manifest records source/request/plan hashes, sanitized inspection summary, concrete resolution evidence, expected before/after values, output identity, validation stages, and preservation hashes. It excludes XML, XPath, embedded rows, secrets, commands, and environment data. Its random UUID v4 transaction ID and UTC timestamp are audit correlation values and never affect RDL bytes.

## Gate 5 Electron sidecar

The Electron sidecar calls the shared Gate 4 preparation and apply services directly; it never shells out to the CLI. The main process owns native `.rdl` selection, realpath inspection, XSD validation, sessions, planning, target resolution, mutation, output, clipboard, and reveal actions.

The renderer receives a sanitized report summary and opaque random UUID v4 handles. Planning accepts only `{ reportSessionId, request }`. Apply accepts only `{ reportSessionId, planSessionId }`. Strict main-process schemas reject extra EditPlan, target, path, XML, XPath, and bypass properties.

Report and plan sessions live only in main-process memory and expire after 30 minutes. Selecting another report, detecting source change, clearing the session, closing the window, or exiting invalidates report authority. A new request invalidates the prior plan. Successfully applied plans are single-use.

Electron output is contained beneath `app.getPath("userData")/edited-reports`. Opaque output handles authorize copying the trusted RDL/manifest paths or revealing the trusted RDL; renderer-supplied paths are impossible. The manifest reuses Gate 4 schema version 1 and records `invocationSurface: electron-sidecar`.

The preload imports only Electron and exposes named wrappers. `contextIsolation`, sandboxing, and disabled Node integration remain enforced.
