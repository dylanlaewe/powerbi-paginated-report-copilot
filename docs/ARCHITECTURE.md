# Architecture

The repository is a pnpm TypeScript monorepo. `apps/desktop` owns the secure Electron boundary and React interface. Reusable packages own domain types and will own discovery, TMDL/PBIR/RDL mechanics, planning, authoring, validation, backup, diff, and adapters.

The renderer receives only frozen, typed capabilities from preload. It cannot access Node.js, arbitrary files, the shell, secrets, or unrestricted IPC. File operations will remain in the main process and core services, restricted to an explicitly selected and canonicalized project directory.

The intended transaction is inspect → resolve → plan → lock → back up and verify → generate temporary files → validate → atomically replace → revalidate → diff and record. AI providers may propose typed plans; deterministic code validates and applies them.
