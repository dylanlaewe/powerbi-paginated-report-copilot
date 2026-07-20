# Power BI and Paginated Report Copilot

An early-stage, local-first desktop companion for natural-language creation and modification of real Power BI Project (PBIP/PBIR/TMDL) files and, later, RDL paginated reports.

## Current status

Milestone `v0.0.1` is the repository and CI bootstrap. The secure Electron shell builds, but project inspection, authoring, backup/restore, and generation are not implemented yet. Power BI Desktop and Report Builder rendering remain pending personal Windows validation.

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

Electron 43 separates its application-binary download into the explicit `setup:electron` command. CI production builds do not need that binary; local launch does.

Only synthetic, sanitized, public, or personally owned inputs are permitted. See [privacy and data handling](docs/PRIVACY_AND_DATA_HANDLING.md).

## Architecture

The monorepo separates the Electron application from reusable TypeScript packages. Mode A will support cross-platform offline file authoring. Mode B will isolate Power BI Desktop and Report Builder integrations behind Windows-only adapters.

This is an independent working project and is not endorsed by Microsoft.
