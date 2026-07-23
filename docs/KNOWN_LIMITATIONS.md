# Known limitations

## Existing RDL Sidecar Editor v0.2

- Only Gate 1 inspection and conservative title/Revenue target resolution are implemented.
- No EditPlan, mutation, edited copy, manifest, CLI edit flow, Electron sidecar workflow, or Windows edited-report validation exists yet.
- Inspection recognizes only exact direct field expressions and exact `Sum(Fields!...Value)` displays; more complex expressions intentionally remain unresolved.
- The fixture-specific title name is trusted only for the checksum-reviewed fixture. Generic reports with multiple plausible top-level static textboxes fail as ambiguous.
- Embedded row values are deliberately excluded from inventory evidence.

## Accepted RDL copilot MVP

- The request language is constrained: one quoted title plus an inline JSON array using exactly nine fixed fields.
- Only the checksum-pinned `production-pagination-letter` template is supported. Region grouping, subtotal and Grand Total labels, pagination, dimensions, and layout are fixed.
- Data is embedded and must be synthetic, sanitized, public, or personally owned. Live databases, Power BI tenants, parameters, and arbitrary data sources are unsupported.
- There is no LLM integration, report editing, chart generation, arbitrary grouping, additional template selection, or layout designer.
- The Electron UI writes one fixed filename in its controlled application-data folder. History, version management, output naming, backup/restore, and multi-report management are not implemented.
- The supported generator uses bundled in-process `libxml2-wasm`; no end-user `xmllint` is required. The accepted distribution is an unsigned portable executable, not a signed installer.
- macOS cannot render RDL. The canonical CLI artifact and packaged Windows customer path passed independent Report Builder Preview/PDF/Excel validation; the Mac UI was accepted by byte identity with that artifact.
- The accepted packaged Windows result produced three Preview pages, three PDF pages, and three Excel worksheets.

## PBIR/PBIP work

- PBIR support remains a separate spike. Its generated objects opened without corruption, but fixture-wide data retrieval failed on both generated and baseline pages, so populated rendering and interaction remain unverified.
- No generalized PBIR authoring product workflow is exposed through the accepted RDL MVP UI.

## Preserved compatibility evidence

- Rejected scratch-generated Candidates 03, 04, and 06 remain forensic evidence. They do not represent supported generation paths.
- Template instantiation is proven; generalized programmatic construction of fragile Report Builder tablix hierarchies is not.
