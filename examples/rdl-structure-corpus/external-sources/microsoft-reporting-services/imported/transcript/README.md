# Microsoft Transcript compatibility fixture

This is a byte-identical import of Microsoft's official `Transcript.rdl` sample for static compatibility testing.

- Repository: `https://github.com/microsoft/Reporting-Services.git`
- Branch: `master`
- Pinned commit: `acc2ee0d1884765e4b5213149430fb063d166719`
- Upstream path: `PaginatedReportSamples/Transcript.rdl`
- Canonical imported path: `source/Transcript.rdl`
- Size: 116,709 bytes
- SHA-256: `9693231c79853b0881d0414f1c98242c76216efc00784b3bc81acc69430b2e81`
- License: MIT
- Copyright: `Copyright (c) 2016 Microsoft`
- Upstream license SHA-256: `e1406b32500b4622444e91ec3b50a473b97c5c4470b7b1f137c36abcfb248b59`

`LICENSE.microsoft.txt` is the unmodified license from the pinned upstream commit. Import used an exact filesystem copy after hash and size verification; the RDL was not normalized, parsed-and-reserialized, or modified.

## Reproduce

Acquire the pinned repository outside this product repository, regenerate Gate 2D discovery metadata into a temporary directory, then run:

```sh
pnpm exec tsx scripts/import-microsoft-transcript.mts \
  --upstream /absolute/path/to/pinned/Reporting-Services \
  --discovery /absolute/path/to/regenerated/discovery \
  --output examples/rdl-structure-corpus/external-sources/microsoft-reporting-services/imported/transcript
```

The command fails if the upstream source, license, discovery identity, security record, namespace, XML, or XSD differs. It deterministically adds corpus-specific title, tablix-location, nested-group, and rectangle-hierarchy evidence to the Gate 2D inventory.

## Validation status

Gate 2F performs static validation only. Transcript and Invoice have not been opened, previewed, rendered, queried, published, or exported during this gate. Embedded Enter Data query definitions and embedded images were not executed or resolved.
