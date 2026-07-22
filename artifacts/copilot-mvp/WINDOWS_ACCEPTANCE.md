# First copilot-generated RDL Windows acceptance

Status: **PASS**

The exact CLI-generated artifact `regional-sales-generated.rdl` was independently tested in Power BI Report Builder. SHA-256 matched `ae2ed7f3ef0df988b550ea2f46ed7490d4c6de3d2e67c58646c2a2c61d9669c1`.

- Request parsing: PASS
- Runtime specification validation: PASS
- Approved template selection: PASS
- Template instantiation: PASS
- Generated artifact checksum: PASS
- Report Builder open: PASS
- Repair, conversion, or upgrade request: NONE
- Design view: PASS
- Requested title: PASS
- Preview: PASS
- New six-row dataset, exactly once: PASS
- Compatibility-test values absent: PASS
- Region → Region1 → Details hierarchy: PASS
- Three Region subtotals: PASS
- Exactly one Grand Total: PASS
- `#Error` or blank aggregates: NONE
- Pagination preservation: PASS
- Regions on separate pages: PASS
- Repeated headings: PASS
- Page N of M: PASS
- Blank Preview/PDF pages: NONE
- Horizontal Preview/PDF clipping: NONE
- PDF export and generated content: PASS
- Excel export and numeric measures: PASS
- Excel repair warning: NONE
- First end-to-end copilot-generated RDL acceptance: **PASS**

Verified totals: Central `19 / $5,370.00 / $2,170.00`; East `10 / $7,590.00 / $2,830.00`; West `30 / $7,500.00 / $2,970.00`; Grand Total `59 / $20,460.00 / $7,970.00`.

Preview page count, PDF page count, and Excel worksheet count were submitted as literal `[INSERT NUMBER]` placeholders. They are recorded as **NOT PROVIDED** and are not inferred.
