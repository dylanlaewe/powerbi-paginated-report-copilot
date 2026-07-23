# Windows code-signing and approved validation plan

## Objective

Produce signed Windows artifacts whose publisher identity and integrity can be verified before running the unchanged deterministic RDL workflow. Do not weaken SmartScreen, Defender, application control, or managed-device policy.

## 1. Trusted production identity

Obtain a publicly trusted Authenticode code-signing identity owned by the product's legal publisher. Preferred options, subject to publisher eligibility and operational review, are:

1. Azure Trusted Signing for centrally controlled cloud signing on a Windows CI runner.
2. An EV code-signing certificate held in a compliant hardware-backed device or signing service.
3. An organization-validated code-signing certificate from a CA in the Microsoft Trusted Root Program, acknowledging that SmartScreen reputation may still need to accumulate.

A locally generated or self-signed certificate is not a production-distribution solution. Certificate private keys and service credentials must never enter Git, application resources, build logs, renderer code, or developer shell history. Keep them in an approved hardware token, signing service, or CI secret store with least-privilege access and auditable rotation/revocation procedures.

Certificate acceptance checks:

- Legal publisher name is final and matches the desired Windows Publisher display.
- Certificate chains to a trusted root and is valid for code signing.
- SHA-256 file digest and RFC 3161 SHA-256 timestamping are enabled.
- Revocation checking succeeds from the validation environment.
- Signing access is separated from ordinary development access.

## 2. Signed artifacts and controlled build

Perform the release build on a clean, pinned Windows x64 CI runner from the reviewed commit. Keep the current portable target and add an NSIS installer as a separate target; both are customer-path artifacts.

The signing implementation unit should:

- Remove the development-only `win.signExecutable: false` setting.
- Set electron-builder `forceCodeSigning: true` so a release cannot silently become unsigned.
- Configure either `win.azureSignOptions` for Azure Trusted Signing or `win.signtoolOptions`/the supported certificate environment variables for the approved certificate—not both.
- Build and sign the application executable before packaging.
- Sign the final portable executable and NSIS installer.
- Apply an RFC 3161 SHA-256 timestamp.
- Publish SHA-256 hashes, sizes, certificate subject, issuer, thumbprint, serial number, timestamp, source commit, dependency lockfile hash, and CI run identifier in a release manifest.
- Retain the unsigned artifact only as historical evidence; never relabel it as signed or accepted.

Planned release outputs:

```text
Power-BI-RDL-Copilot-<version>-windows-x64-portable.exe
Power-BI-RDL-Copilot-Setup-<version>-windows-x64.exe
SHA256SUMS
SIGNATURES.json
```

Do not publish signing credentials or an exportable PFX alongside these files.

## 3. Signature verification gate

Before launch, run the following on the exact transferred artifacts in Windows PowerShell:

```powershell
$artifacts = @(
  '.\Power-BI-RDL-Copilot-<version>-windows-x64-portable.exe',
  '.\Power-BI-RDL-Copilot-Setup-<version>-windows-x64.exe'
)

$artifacts | ForEach-Object {
  $hash = Get-FileHash -Algorithm SHA256 -LiteralPath $_
  $signature = Get-AuthenticodeSignature -LiteralPath $_
  [pscustomobject]@{
    Path = $hash.Path
    SHA256 = $hash.Hash.ToLower()
    Status = $signature.Status
    StatusMessage = $signature.StatusMessage
    Subject = $signature.SignerCertificate.Subject
    Issuer = $signature.SignerCertificate.Issuer
    Thumbprint = $signature.SignerCertificate.Thumbprint
    NotBefore = $signature.SignerCertificate.NotBefore
    NotAfter = $signature.SignerCertificate.NotAfter
    TimestampSubject = $signature.TimeStamperCertificate.Subject
  }
} | Format-List
```

Required result for both files:

- `Status` is `Valid`.
- Subject, issuer, and thumbprint exactly match the approved release manifest.
- SHA-256 exactly matches `SHA256SUMS`.
- A valid timestamp certificate is present.
- Windows displays the expected publisher, never `Unknown publisher`.

The signing CI should also run Windows SDK verification with SHA-256 policy and fail on any verification error:

```powershell
signtool verify /pa /all /v .\Power-BI-RDL-Copilot-<version>-windows-x64-portable.exe
signtool verify /pa /all /v .\Power-BI-RDL-Copilot-Setup-<version>-windows-x64.exe
```

## 4. Deterministic RDL preservation

Authenticode changes executable bytes, so the signed EXE hash will intentionally differ from the unsigned development build. It must not change bundled template/XSD bytes or generated RDL bytes.

For every signed candidate:

1. Extract or inspect packaged resources and verify:
   - template SHA-256 `c2d27f7595d9330eb9815f86483aa068129265a00980ca3b0b956f6f3f1de17a`
   - XSD SHA-256 `7714fc8dd1c803d9eb661518fccfbc01cdd0cc19963fa3f3b45084eadf541b29`
2. Run the existing formatting, lint, typecheck, test, production-build, resource, checksum, no-`xmllint`, and CLI/UI parity gates before signing.
3. Launch each signed distribution form and generate from the canonical request.
4. Require generated RDL SHA-256 `ae2ed7f3ef0df988b550ea2f46ed7490d4c6de3d2e67c58646c2a2c61d9669c1`.
5. Compare portable and installed outputs byte-for-byte.
6. Re-run the accepted Report Builder Preview, subtotal, Grand Total, pagination, PDF, and Excel checks.

Signing failure, resource-hash drift, or RDL-hash drift blocks the release.

## 5. Approved clean-Windows environment

Use either:

- a personally controlled, fully patched Windows 11 x64 machine or VM whose owner is authorized to run the test; or
- a formally approved organizational test device where IT has approved the named signed publisher/artifacts through normal application-control processes.

The environment must begin without the repository, Git, Node.js, pnpm, `xmllint`, or development tools. Record Windows edition/build, SmartScreen/application-control result, certificate verification output, artifact hashes, app launch, controlled output path, generated RDL hash, Report Builder version, Preview/PDF page counts, Excel worksheet count, screenshots, and exact errors.

Do not ask an operator to disable SmartScreen, Defender, reputation-based protection, or application-control policy. If a validly signed artifact remains blocked, submit its signature metadata and hashes through the environment owner's formal software-approval process and leave acceptance pending until approved execution occurs.

## Deferred distribution-hardening gate

The packaged MVP was later accepted through the unsigned portable customer path in a personally controlled clean-Windows environment and may merge as an explicitly unsigned development milestone. This signing plan is deferred distribution hardening, not a condition for that accepted checkpoint. Before production distribution, at least one signed portable or installer customer path should pass independent execution in an approved clean-Windows environment and produce the accepted byte-identical RDL. Ideally, validate both signed distribution forms.
