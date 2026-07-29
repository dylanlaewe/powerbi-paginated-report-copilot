# Smallest safe implementation sequence after Gate 2G

Gate 2G authorizes no implementation. The following order minimizes the chance that broader candidate discovery turns existing ambiguity into silent mutation.

## 1. Generic inspector normalization

- **Evidence:** all four valid 2016/01 sources stop at `ReportSection 0 lacks PageWidth`; Report Builder omitted literal dimensions.
- **Proposed behavior:** retain serialized page values as nullable, record whether each value is explicit or omitted, and keep inspection usable without inferring or materializing defaults.
- **Likely services:** `packages/rdl-copilot/src/inspection.ts`, its inventory schema, sidecar summary schemas.
- **Risk:** treating an assumed default as authored content or changing mutation output.
- **Tests:** all four corpus sources inspect; explicit-dimension fixtures remain unchanged; invalid serialized sizes still fail; omission provenance survives sanitization.
- **Report Builder validation:** not required for read-only normalization; required before any mutation materializes dimensions.

## 2. Structural candidate discovery

- **Evidence:** production inventory loses rectangle paths, parent tablixes, row-member depth, dataset scope, and aggregate hierarchy. Transcript has nested tablixes and depth-two rectangles; grouped Revenue has three distinct roles.
- **Proposed behavior:** expose immutable opaque handles with container path, nearest tablix, tablix dataset, row/column member path, expression kind, and group scope.
- **Likely services:** inspection model and dedicated candidate-discovery module; no mutation changes yet.
- **Risk:** larger sanitized summaries or unstable handles if XML order is used as identity.
- **Tests:** exact corpus container paths, stable ordering, no embedded row values, no XPath exposure.
- **Report Builder validation:** not required for read-only evidence.

## 3. Title resolver scoring

- **Evidence:** simple-table current logic selects styled placeholder `ReportTitle` over visible `Textbox9`; Transcript's correct `Textbox1` is a page-header constant expression; Invoice has no confident canonical title.
- **Proposed behavior:** rank visible constant text with name, location, prominence, geometry, and negative label/repetition evidence. Return evidence and confidence; never force Invoice.
- **Likely services:** a new resolver module replacing the filter embedded in `inspection.ts`.
- **Risk:** decorative captions becoming titles; changing accepted sidecar target selection.
- **Tests:** simple-table must report linked/conflicting title evidence rather than silently choose; grouped selects `ReportTitle`; Transcript selects `Textbox1`; Invoice returns no-confident-target or ambiguity.
- **Report Builder validation:** required once a resolved title is mutated.

## 4. Existing-field resolver scope and dataset identity

- **Evidence:** grouped Revenue returns detail, Department subtotal, and Grand Total without preserving those roles. Invoice and Transcript contain overlapping field declarations. Production target handles contain field and report-item names only.
- **Proposed behavior:** require dataset identity and structural role on every field candidate; represent detail, group subtotal, grand total, and unknown separately.
- **Likely services:** inspection candidate schema, `resolveFieldDisplays`, plan-resolution/audit schemas.
- **Risk:** regressions for the accepted three-target Revenue behavior and false ambiguity for valid scoped aggregates.
- **Tests:** simple UnitCost detail only; grouped three Revenue roles in deterministic order; static headers excluded; Invoice/Transcript overlaps rejected unless dataset and tablix scope uniquely bind them.
- **Report Builder validation:** required after format mutations are enabled on generalized targets.

## 5. Ambiguity and review representation

- **Evidence:** current APIs throw one error or return one flattened target; no candidate set reaches review. Invoice legitimately has no obvious title.
- **Proposed behavior:** typed outcomes `resolved`, `ambiguous`, `unsupported`, and `notFound`, each with sanitized candidates and evidence; opaque handles must retain container context.
- **Likely services:** resolver result schemas, sidecar sessions, audit manifest, later IPC review payload.
- **Risk:** accidental exposure of expressions or source data and stale-handle use.
- **Tests:** fail-closed ties, deterministic candidate ordering, session invalidation, sanitized evidence only.
- **Report Builder validation:** not required until apply is allowed.

## 6. Page-orientation behavior

- **Evidence:** every corpus source omits width/height. The current planner requires normalized orientation and mutation swaps literal dimensions.
- **Proposed behavior:** separate `serializedOrientation` from `effectiveOrientation`; keep orientation edits blocked when dimensions are omitted until a reviewed policy explicitly permits materializing Letter dimensions.
- **Likely services:** inspection page model, planner context, plan resolution, later mutation.
- **Risk:** changing pagination by inventing dimensions.
- **Tests:** omission remains omission during inspection; planning reports a typed blocker; explicit dimensions continue to resolve.
- **Report Builder validation:** mandatory for any policy that writes explicit dimensions.

## 7. Mutation support

- **Evidence:** no generalized corpus target has yet been written; Gate 2G generates no RDL.
- **Proposed behavior:** change mutation only after read-only targets and ambiguity outcomes are accepted. Preserve source-hash checks, atomic writes, semantic guards, and opaque handles.
- **Likely services:** `mutation.ts`, structural guard, audit manifest.
- **Risk:** highest—incorrect target or structural damage.
- **Tests:** one operation at a time, exact before/after evidence, source preservation, deterministic bytes, rollback.
- **Report Builder validation:** mandatory for each new structural category.

## 8. UI review changes

- **Evidence:** current renderer cannot receive any corpus summary, and later ambiguity needs more than a single proposal string.
- **Proposed behavior:** only after typed resolver outcomes exist, display candidate location, current value, scope, and confidence without raw XML or filesystem authority.
- **Likely services:** narrow main-process IPC and renderer review components.
- **Risk:** encouraging unsafe user override or exposing sensitive expressions.
- **Tests:** unavailable/ambiguous states, no apply without explicit resolved handle, busy-state recovery, sandbox controls unchanged.
- **Report Builder validation:** customer-path validation after apply exists.

## 9. Additional controlled-fixture needs

- **Evidence:** Invoice has realistic overlap but not deliberate deterministic ambiguity; Transcript has realistic alternate layout but omits literal landscape dimensions and controlled Cost displays.
- **Proposed behavior:** retain the narrowed parameterized ambiguity and alternate-layout fixtures. Do not author them until inspector/candidate schemas are reviewed.
- **Likely services:** corpus metadata and later manual authoring kit only.
- **Risk:** unnecessary fixture breadth or conflating external realism with isolated resolver behavior.
- **Tests:** exact ambiguity and controlled header/landscape/Cost expectations.
- **Report Builder validation:** mandatory when those sources are eventually authored.
