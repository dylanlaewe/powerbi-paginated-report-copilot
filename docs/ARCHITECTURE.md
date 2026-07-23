# Architecture

The repository is a pnpm TypeScript monorepo with deterministic authoring services separated from Electron.

## Accepted RDL generation path

```text
renderer request text
→ narrow context-isolated preload IPC
→ main-process runtime validation
→ constrained parser and ReportSpecification
→ centralized checksum-pinned resource resolver
→ protected template instantiation
→ XML/XSD/structure/content/page validation
→ atomic write in the controlled application-data folder
→ validated summary returned to renderer
```

- `packages/domain` owns the versioned report specification and exact row schema.
- `packages/rdl-copilot` owns constrained parsing, approved-resource resolution, safe template instantiation, independent totals, deterministic validation, and atomic generation.
- `packages/rdl-spike` retains the proven XSD and compatibility evidence used by the accepted service.
- `apps/desktop` owns the secure Electron boundary and React UI.

The renderer has no Node or filesystem access. The sandboxed preload imports only Electron and exposes generate, reveal-current-report, and copy-current-path wrappers. Zod validation, template resolution, XML generation, filesystem access, and detailed internal errors remain in main or deterministic services. `contextIsolation`, sandboxing, and disabled Node integration are enforced and regression-tested.

Development resource resolution ascends from stable Electron paths to `pnpm-workspace.yaml`; packaged resolution uses fixed files under `process.resourcesPath/approved-report-resources`. Real-path containment and the pinned RDL checksum are verified before generation. IPC cannot supply template or output paths.

The accepted canonical UI output is byte-identical to the independently Windows-validated CLI artifact.

## Packaged Windows runtime

The portable Windows build bundles only Zod and `libxml2-wasm` as production Node modules. Electron, build tooling, React, and workspace packages are compiled or bundled at build time and are not customer prerequisites. The accepted RDL template and Report Definition XSD are fixed electron-builder resources under `process.resourcesPath/approved-report-resources`.

Generation parses XML and validates the instantiated report against the bundled XSD in-process through WebAssembly libxml2. No external `xmllint`, shell command, repository path, current working directory, global Node.js installation, package manager, Git checkout, source file, or development environment variable participates in packaged generation.
