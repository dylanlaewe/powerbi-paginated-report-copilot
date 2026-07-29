# Transcript source validation

## Identity and provenance

- Source repository: `https://github.com/microsoft/Reporting-Services.git`
- Upstream branch: `master`
- Pinned commit: `acc2ee0d1884765e4b5213149430fb063d166719`
- Upstream path: `PaginatedReportSamples/Transcript.rdl`
- Imported path: `source/Transcript.rdl`
- Source size: 116,709 bytes
- Source SHA-256: `9693231c79853b0881d0414f1c98242c76216efc00784b3bc81acc69430b2e81`
- Upstream/imported byte comparison: PASS
- Imported source immutability verification: PASS

## License

- License: MIT
- Copyright: `Copyright (c) 2016 Microsoft`
- License SHA-256: `e1406b32500b4622444e91ec3b50a473b97c5c4470b7b1f137c36abcfb248b59`
- Unmodified notice: `../LICENSE.microsoft.txt`
- Attribution verification: PASS

## Static validation

- Safe NONET/no-external-entity parsing: PASS
- XML well-formedness: PASS
- Namespace: `http://schemas.microsoft.com/sqlserver/reporting/2016/01/reportdefinition`
- Microsoft ReportDefinition 2016 XSD: PASS
- Static security scan: PASS with two embedded images, integrated-security marker, and Enter Data query definitions present and expected
- Deterministic inventory and enrichment regeneration: PASS
- Structural/security differences from Gate 2D discovery: NONE
- Additional Gate 2F evidence: explicit title alignment, tablix containers, nested row members, rectangle parents/children, and deepest rectangle path

## Execution status

- Report Builder open: NOT PERFORMED
- Preview/render: NOT PERFORMED
- Dataset query execution: NOT PERFORMED
- External reference resolution: NOT PERFORMED
- PDF/Excel export: NOT PERFORMED

Gate 2F does not claim Report Builder compatibility.
