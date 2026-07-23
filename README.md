# Power BI and Paginated Report Copilot

A local-first desktop companion for deterministic generation of real RDL paginated reports, with separate PBIP/PBIR/TMDL research retained in the repository.

## Current status

The `rdl-copilot-mvp-v0.1` checkpoint is independently accepted. A constrained natural-language request containing a title and fixed-schema synthetic JSON rows generates a checksum-addressed RDL through the CLI or secure Electron UI. The canonical output passed Power BI Report Builder Preview, PDF, and Excel validation on Windows, and the Mac UI output matched it byte-for-byte.

This checkpoint supports one fixed production template and embedded data only. See [known limitations](docs/KNOWN_LIMITATIONS.md) before use.

## Development

Requirements: Node.js 22+, pnpm 11+, and macOS, Linux, or Windows.

```bash
pnpm install --frozen-lockfile
pnpm setup:electron
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm dev
```

Canonical demo request: `examples/regional-sales-request.txt`. Detailed steps: [Mac Electron MVP test](docs/MAC_ELECTRON_MVP_TEST.md).

Electron 43 separates its application-binary download into the explicit `setup:electron` command. CI production builds do not need that binary; local launch does.

Only synthetic, sanitized, public, or personally owned inputs are permitted. See [privacy and data handling](docs/PRIVACY_AND_DATA_HANDLING.md).

## Architecture

The monorepo separates the Electron application from reusable TypeScript packages. Mode A will support cross-platform offline file authoring. Mode B will isolate Power BI Desktop and Report Builder integrations behind Windows-only adapters.

This is an independent working project and is not endorsed by Microsoft.

## Existing RDL sidecar Gate 4 CLI

Plan an accepted constrained edit without writing files:

```sh
pnpm sidecar:cli -- plan --source examples/existing-rdl-sidecar/source/regional-sales-existing.rdl --request-file examples/existing-rdl-sidecar/requests/title-style-landscape-format.txt
```

Apply it to a controlled duplicate-safe copy and create an adjacent audit manifest:

```sh
pnpm sidecar:cli -- apply --source examples/existing-rdl-sidecar/source/regional-sales-existing.rdl --request-file examples/existing-rdl-sidecar/requests/title-style-landscape-format.txt
```

The CLI accepts no output path, XML, XPath, or raw operation arguments. Gate 4 is a development validation surface, not the final customer interface.
