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

The first implementation unit parses a natural-language request containing a quoted title, the explicit production-pagination template name, and a JSON array of synthetic rows. It produces a versioned specification with the accepted nine-field schema and fixed safe labels. Unknown templates, missing titles, malformed JSON, extra/missing fields, invalid dates, and invalid numeric values are rejected before file access.

Template instantiation and artifact generation are the next implementation unit. They must preserve Report Builder-authored hierarchy and pagination subtrees, use atomic writes and pre-write hashes, and run the established deterministic validators. This phase excludes charts, additional templates, parameters, live or enterprise data sources, and broad layout work.
