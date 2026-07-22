# Known limitations

## Accepted RDL copilot MVP

- The request language is constrained: one quoted title plus an inline JSON array using exactly nine fixed fields.
- Only the checksum-pinned `production-pagination-letter` template is supported. Region grouping, subtotal and Grand Total labels, pagination, dimensions, and layout are fixed.
- Data is embedded and must be synthetic, sanitized, public, or personally owned. Live databases, Power BI tenants, parameters, and arbitrary data sources are unsupported.
- There is no LLM integration, report editing, chart generation, arbitrary grouping, additional template selection, or layout designer.
- The Electron UI writes one fixed filename in its controlled application-data folder. History, version management, output naming, backup/restore, and multi-report management are not implemented.
- The development flow requires `xmllint`. A packaged installer and its external validation runtime have not been independently validated; packaged resource resolution is covered by deterministic tests only.
- macOS cannot render RDL. The canonical CLI artifact passed independent Windows Report Builder Preview/PDF/Excel validation; the Mac UI was accepted by byte identity with that artifact.
- Submitted Windows Preview/PDF page counts and Excel worksheet count remained placeholders and are not claimed.

## PBIR/PBIP work

- PBIR support remains a separate spike. Its generated objects opened without corruption, but fixture-wide data retrieval failed on both generated and baseline pages, so populated rendering and interaction remain unverified.
- No generalized PBIR authoring product workflow is exposed through the accepted RDL MVP UI.

## Preserved compatibility evidence

- Rejected scratch-generated Candidates 03, 04, and 06 remain forensic evidence. They do not represent supported generation paths.
- Template instantiation is proven; generalized programmatic construction of fragile Report Builder tablix hierarchies is not.
