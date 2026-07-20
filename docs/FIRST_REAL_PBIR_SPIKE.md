# First real PBIR generation spike

## Official authoring tooling

- Microsoft repository: https://github.com/microsoft/skills-for-fabric
- Plugin: `powerbi-authoring` release `v0.3.8`
- Commit: `16903b068f9a7e0180d701f158465f53cd2110ba`
- License: MIT
- Installed skill: `/Users/dylanlaewe/.codex/skills/powerbi-report-authoring`
- Skill metadata version: `0.1.0`
- Installed: 2026-07-19
- Loaded successfully by Codex: yes, directly from the installed pinned files during this session; automatic discovery begins next turn.
- Validator: `@microsoft/powerbi-report-authoring-cli` 0.1.4, pinned as a repository dev dependency.

The global CLI installation prescribed by the skill failed because `/usr/local/lib/node_modules` is not writable. The exact Microsoft package is invoked through `pnpm exec powerbi-report-author` instead. Catalog lookup and offline validation work on macOS. Desktop reload and screenshots require Windows and Power BI Desktop. Local PBIR editing requires neither tenant authentication nor Power BI Desktop.

## Fixture

The immutable baseline is `samples/known-valid-project/Roastery.pbip`. See its `ORIGIN.md`. The fixture is MIT-licensed, explicitly documented upstream as complete and openable in Power BI Desktop, uses fictional inline data, and has no credentials.

Initial official-validator result: zero errors, one warning because the Microsoft-hosted `visualContainer/2.10.0` JSON schema could not be fetched. The spike must preserve and report this limitation.

## Status

Fixture acquisition and baseline validation executed. Deterministic generation is next. Nothing has been rendered in Power BI Desktop; Windows verification remains pending.
