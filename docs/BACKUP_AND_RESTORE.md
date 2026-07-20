# Backup and restore

Status: not implemented. The required design snapshots every planned target with SHA-256 hashes and a build-run manifest, verifies readable copies, validates temporary output, uses atomic replacement, records final hashes, and creates a safety snapshot before restore. A failed backup must prevent all authoring writes.
