# Microsoft Invoice compatibility fixture

This is a byte-identical import of Microsoft's official `Invoice.rdl` sample for static compatibility testing.

- Repository: `https://github.com/microsoft/Reporting-Services.git`
- Branch: `master`
- Pinned commit: `acc2ee0d1884765e4b5213149430fb063d166719`
- Upstream path: `PaginatedReportSamples/Invoice.rdl`
- Canonical imported path: `source/Invoice.rdl`
- Size: 222,297 bytes
- SHA-256: `6251f6b9f76618dd5c2f9accc614b9e198fc221d2310a39508f6ac4897d53fdc`
- License: MIT
- Copyright: `Copyright (c) 2016 Microsoft`
- Upstream license SHA-256: `e1406b32500b4622444e91ec3b50a473b97c5c4470b7b1f137c36abcfb248b59`

`LICENSE.microsoft.txt` is the unmodified license from the pinned upstream commit. Import used an exact filesystem copy after hash and size verification; the RDL was not parsed and reserialized.

## Reproduce

Acquire the pinned repository outside this product repository, regenerate Gate 2D discovery metadata, then run:

```sh
pnpm exec tsx scripts/import-microsoft-invoice.mts \
  --upstream /absolute/path/to/pinned/Reporting-Services \
  --discovery examples/rdl-structure-corpus/external-sources/microsoft-reporting-services \
  --output examples/rdl-structure-corpus/external-sources/microsoft-reporting-services/imported/invoice
```

The command fails if the upstream source, license, discovery inventory, security record, namespace, XML, or XSD identity differs.

## Validation status

Gate 2E performs static validation only. The report has not been opened, previewed, rendered, queried, published, or exported in this product corpus. Embedded Enter Data query definitions and the embedded image were not executed or resolved. See `validation/`.
