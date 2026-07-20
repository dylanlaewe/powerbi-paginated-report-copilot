# Decisions

## ADR-001: TypeScript pnpm monorepo

Use pnpm workspaces so Electron remains a client of reusable engine packages.

## ADR-002: Secure renderer boundary

Use context isolation, disabled Node integration, sandboxing, CSP, external-navigation denial, and a minimal frozen preload API.

## ADR-003: Deterministic authoring boundary

AI providers propose typed actions. Core services validate references, back up targets, and apply file changes; models receive no unrestricted shell or file access.
