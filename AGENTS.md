# Project operating rules

This repository builds a cross-platform companion that creates and modifies real Power BI PBIP/PBIR/TMDL projects and, later, RDL paginated reports.

## Safety and scope

- Use only synthetic, sanitized, public, or personally owned data and credentials.
- Never use employer devices, tenants, reports, credentials, data, or intellectual property.
- Back up and hash every target before report-authoring writes. Writes must be atomic and validated before replacement.
- Preserve unknown PBIR/TMDL properties and unrelated formatting. Never invent model references.
- Never claim Power BI Desktop or Report Builder rendering without actual Windows verification.
- Keep renderer code unprivileged: context isolation on, Node integration off, typed allowlisted IPC only.
- Keep API keys in main-process environment configuration; never log or send them to the renderer.

## Architecture

- Keep domain and authoring engines independent from Electron.
- Runtime-validate every external or file-derived value.
- Planning proposes typed operations; deterministic services validate and apply them.
- Mode A is offline cross-platform authoring. Mode B contains isolated Windows adapters.

## Quality and Git

- Work on short-lived conventional branches and use Conventional Commits.
- Each coherent completed feature or fix must include tests and documentation, then be committed and pushed immediately.
- Update `CHANGELOG.md`, `docs/STATUS.md`, and `docs/BUILD_LOG.md` with meaningful implementation units.
- Never force-push main, rewrite published history, commit secrets, or bypass failed checks without documenting the limitation.
- Merge only accepted, buildable milestones to `main`; push annotated milestone tags only after their acceptance criteria pass.
