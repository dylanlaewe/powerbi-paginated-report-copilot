# Windows validation

PBIR and RDL compatibility checks are performed independently in a personally controlled Windows environment. Exact candidate-specific procedures and evidence requirements are stored under `artifacts/rdl-compatibility-ladder/`.

Future acceptance requires save-state protection, backup, disk authoring, Desktop reopen/reload, screenshot capture, structural and visual review, bounded correction iterations, and Report Builder RDL opening. Skipped or unavailable Windows checks must never be reported as passing.

Before hashing an RDL, verify `git check-attr text -- <path>` ends in `text: unset` and record `git config --show-origin --get-all core.autocrlf`. Use a fresh clone after the byte-integrity policy, or restore unmodified RDL files from `HEAD`. Raw repository bytes are authoritative; canonical LF checksums are diagnostic only.
