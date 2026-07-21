# Cross-platform RDL byte-integrity policy

## Verified Candidate 03b discrepancy

| Representation                                  | SHA-256                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------ |
| Repository blob                                 | `f85dfd067e037336cb9a7fe7f5245b19a2030b01e2a997f0430a34b1f5090b88` |
| macOS working tree                              | `f85dfd067e037336cb9a7fe7f5245b19a2030b01e2a997f0430a34b1f5090b88` |
| Windows working tree observed during validation | `34777160b926c8d8d1c26dd85bc42a272a39b71923f54780d7d1d81d3fb6047d` |
| Repository bytes transformed from LF to CRLF    | `34777160b926c8d8d1c26dd85bc42a272a39b71923f54780d7d1d81d3fb6047d` |

The exact Windows checksum is reproduced by replacing every LF line ending in the repository blob with CRLF. This verifies line-ending conversion as the byte-level cause of the discrepancy. The Windows machine's actual `core.autocrlf` value was not supplied and cannot be inspected from the macOS clone, so its configuration is recorded as **NOT PROVIDED** rather than assumed.

Before this follow-up, the repository had no `.gitattributes`; `git check-attr` returned no policy for `.rdl`. The repository blob and macOS checkout had the same Git object and SHA-256.

## Policy

`.gitattributes` now contains:

```gitattributes
*.rdl -text
```

RDL files are checksum-addressed binary evidence for Git attribute purposes. Git must not normalize or convert their line endings during check-in or checkout. The authoritative checksum is SHA-256 over the exact repository/working-tree bytes. This retains ordinary XML contents while making raw hashes portable across fresh clones regardless of `core.autocrlf`.

Do not run `git add --renormalize` on an already CRLF-converted RDL checkout; that could stage the converted bytes. After pulling this policy, use a fresh clone for validation, or restore each unmodified RDL from `HEAD` before hashing.

## Verification

On Windows, from a fresh clone or restored checkout:

```powershell
git check-attr text -- "artifacts/rdl-compatibility-ladder/03b-region-group-from-seed.rdl"
git config --show-origin --get-all core.autocrlf
git hash-object "artifacts/rdl-compatibility-ladder/03b-region-group-from-seed.rdl"
Get-FileHash ".\artifacts\rdl-compatibility-ladder\03b-region-group-from-seed.rdl" -Algorithm SHA256
```

Expected attribute output ends in `text: unset`. The expected raw SHA-256 is `f85dfd067e037336cb9a7fe7f5245b19a2030b01e2a997f0430a34b1f5090b88`.

For an existing clone with no local RDL edits, restore the target after pulling `.gitattributes`:

```powershell
git restore --source=HEAD --worktree -- ".\artifacts\rdl-compatibility-ladder\03b-region-group-from-seed.rdl"
```

## Diagnostic canonical checksum

Raw-byte preservation is the repository policy. For diagnosing historical or externally copied files only, normalize CRLF to LF in memory and compute SHA-256 without writing the file. The observed Windows Candidate 03b canonicalizes to the repository checksum:

```powershell
$path = ".\artifacts\rdl-compatibility-ladder\03b-region-group-from-seed.rdl"
$bytes = [IO.File]::ReadAllBytes($path)
$text = [Text.Encoding]::UTF8.GetString($bytes).Replace("`r`n", "`n")
$canonical = [Text.Encoding]::UTF8.GetBytes($text)
$hash = [Security.Cryptography.SHA256]::HashData($canonical)
[Convert]::ToHexString($hash).ToLowerInvariant()
```

Canonicalization is diagnostic and does not replace the raw-byte handoff checksum.
