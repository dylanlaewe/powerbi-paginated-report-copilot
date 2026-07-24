# Power BI and Paginated Report Copilot

A local-first desktop companion for deterministic generation of real RDL paginated reports, with separate PBIP/PBIR/TMDL research retained in the repository.

## Current status

Existing RDL Sidecar Editor v0.2 is independently accepted on macOS and packaged Windows. It safely inspects an existing RDL, converts constrained sentence-form edits into a reviewed typed plan, writes a deterministic edited copy plus audit manifest, and preserves the original.

The canonical Windows output passed Power BI Report Builder Design and three-page Preview plus three-page PDF and three-worksheet Excel exports. The earlier `rdl-copilot-mvp-v0.1` and `rdl-copilot-windows-v0.1` generation checkpoints remain frozen. See [known limitations](docs/KNOWN_LIMITATIONS.md).

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

## Existing RDL sidecar

Plan an accepted constrained edit without writing files:

```sh
pnpm sidecar:cli -- plan --source examples/existing-rdl-sidecar/source/regional-sales-existing.rdl --request-file examples/existing-rdl-sidecar/requests/title-style-landscape-format.txt
```

Apply it to a controlled duplicate-safe copy and create an adjacent audit manifest:

```sh
pnpm sidecar:cli -- apply --source examples/existing-rdl-sidecar/source/regional-sales-existing.rdl --request-file examples/existing-rdl-sidecar/requests/title-style-landscape-format.txt
```

The CLI accepts no output path, XML, XPath, or raw operation arguments. It remains a development validation surface.

Launch the existing-RDL sidecar in development:

```sh
pnpm dev
```

Select an `.rdl`, enter a supported sentence, review the exact before/after targets, and explicitly apply to a controlled copy under the application user-data directory. The original source is never overwritten.
