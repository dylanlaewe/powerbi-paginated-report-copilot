# Privacy and data handling

The application is local-first and telemetry is off by default. Only metadata needed for a request—object names, types, descriptions, relationships, report structure, and formatting—may be offered to an AI provider after explicit provider configuration. Raw rows, credentials, tokens, connection-string passwords, and full proprietary queries must not leave the computer by default.

Secrets come from main-process environment or a future OS credential store. They must never enter renderer state or logs. Logs use project-relative paths where practical and redact secret-shaped values. This project must use only synthetic, sanitized, public, or personally owned data and accounts; no employer resources are allowed.
