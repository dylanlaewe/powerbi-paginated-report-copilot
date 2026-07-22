# Natural-language RDL copilot MVP

The first MVP is deliberately constrained to the independently accepted `production-pagination-letter` Report Builder template.

```text
natural-language request
→ runtime-validated report specification
→ allowlisted accepted template
→ safe title, label, field, and embedded-dataset substitution
→ deterministic XML, XSD, collection, scope, pagination, and checksum validation
→ generated RDL for independent Windows verification
```

The implemented flow parses a natural-language request containing a quoted title, the explicit production-pagination template name, and a JSON array of synthetic rows. It produces a versioned specification with the accepted nine-field schema and fixed safe labels, instantiates only the accepted template, validates the result, and writes the RDL and manifest atomically.

## Supported request and command

```text
Create a report titled "Report title" using the production pagination template with data:
[{"SaleDate":"2026-07-02", ... all nine fields ...}]
```

```bash
pnpm copilot:generate \
  --request examples/regional-sales-request.txt \
  --output artifacts/copilot-mvp/regional-sales-generated.rdl
```

The canonical request is in `examples/regional-sales-request.txt`. The command emits the RDL path, checksum, selected template, parsed specification, independently calculated Region subtotals and Grand Total, validation result, and manifest path.

## Security and structural boundaries

- Only `production-pagination-letter` is allowlisted, pinned to SHA-256 `c2d27f7595d9330eb9815f86483aa068129265a00980ca3b0b956f6f3f1de17a`.
- Input is runtime-validated with exact keys; duplicate keys, unknown/missing fields, malformed JSON, invalid dates, non-finite numerics, empty strings, and path traversal are rejected.
- User strings are XML-escaped. Arbitrary XML fragments are never accepted.
- Only the report title, embedded XML rows, and their Report Builder DesignerState grid are mutable.
- A normalized protected projection proves the tablix hierarchy, grouping, detail/subtotal/Grand Total members, page breaks, repeated headings, footer, dimensions, margins, and body remain unchanged.
- XML well-formedness and the existing XSD must pass before atomic output replacement.

## Current constraints

The field set, labels, Region grouping, totals, pagination, Letter layout, and template are fixed. Charts, additional templates, parameters, arbitrary fields/grouping, live databases, tenant integration, LLM calls, Electron UI, report editing, and layout redesign are unsupported.
