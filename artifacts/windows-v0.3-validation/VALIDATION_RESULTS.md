# Power BI RDL Copilot v0.3.0 independent Windows acceptance

Final status: **ACCEPTED**

## Environment and artifact identity

- User-confirmed date: 2026-07-28
- Environment: personally controlled Windows 11 virtual machine
- Rendering application: Microsoft Power BI Report Builder
- Application version: 0.3.0
- Executable:
  `Power-BI-RDL-Copilot-0.3.0-windows-x64-portable.exe`
- Executable size: 89,642,264 bytes
- Executable SHA-256:
  `c10974891ed23308d7bae13118adb7803592a174cda7f95952909aa3a886d50a`
- Windows executable launch: PASS
- Executable signing: unsigned

Accepted inputs:

| Scenario                  | SHA-256                                                            |
| ------------------------- | ------------------------------------------------------------------ |
| Controlled simple table   | `e3a34afe7c29c9f773098d9f5bfd65ad2cf60219f78999d46a447250bb2448e3` |
| Controlled grouped report | `03c7a6eacd6b003aeaace0264a361267ce208de6388420f0d465608f3540174b` |
| Microsoft Invoice         | `6251f6b9f76618dd5c2f9accc614b9e198fc221d2310a39508f6ac4897d53fdc` |
| Microsoft Transcript      | `9693231c79853b0881d0414f1c98242c76216efc00784b3bc81acc69430b2e81` |

## Controlled simple table

- Application reviewed-copy workflow: PASS
- Original input preserved: PASS
- Manifest created: PASS
- Report Builder open: PASS
- Preview: PASS
- Visible title changed to `Quarterly Inventory Detail`: PASS
- Title style changed to 20pt Bold: PASS
- UnitCost changed to currency with no decimal places: PASS
- PDF export: PASS
- Excel export: PASS
- Unexpected warning, repair prompt, clipping, blank page, or `#Error`: NONE
- Exact Preview page count: not captured during final user confirmation
- Exact PDF page count: not captured during final user confirmation
- Exact Excel worksheet count: not captured during final user confirmation

## Controlled grouped report

- Application reviewed-copy workflow: PASS
- Original input preserved: PASS
- Manifest created: PASS
- Report Builder open: PASS
- Preview: PASS
- Title changed to `Quarterly Department Sales`: PASS
- Revenue detail, Department subtotals, and Grand Total changed to `C0`: PASS
- Four Department groups, eight details, four subtotals, and one Grand Total
  preserved: PASS
- Repeated headings and Department page breaks preserved: PASS
- PDF export: PASS
- Excel export: PASS
- Unexpected warning, repair prompt, clipping, blank page, or `#Error`: NONE
- Exact Preview page count: not captured during final user confirmation
- Exact PDF page count: not captured during final user confirmation
- Exact Excel worksheet count: not captured during final user confirmation

## Microsoft Invoice

- Application reviewed-copy workflow: PASS
- Original input preserved: PASS
- Manifest created: PASS
- Report Builder open: PASS
- Preview using embedded sample data: PASS
- Selected Quantity display changed to `N0`: PASS
- Unselected content, embedded logo, header, and footer preserved: PASS
- PDF export: PASS
- Excel export: PASS
- External connection or credential use: NONE
- Unexpected warning, repair prompt, blank page, or `#Error`: NONE
- Exact Preview page count: not captured during final user confirmation
- Exact PDF page count: not captured during final user confirmation
- Exact Excel worksheet count: not captured during final user confirmation

## Microsoft Transcript

- Application reviewed-copy workflow: PASS
- Original input preserved: PASS
- Manifest created: PASS
- Report Builder open: PASS
- Preview using embedded sample data: PASS
- Page-header title changed to `Professional Certification Transcript`: PASS
- Page-header title changed to 20pt Bold: PASS
- Body content, embedded images, and nested report structure preserved: PASS
- PDF export: PASS
- Excel export: PASS
- External connection or credential use: NONE
- Unexpected warning, repair prompt, clipping, blank page, or `#Error`: NONE
- Exact Preview page count: not captured during final user confirmation
- Exact PDF page count: not captured during final user confirmation
- Exact Excel worksheet count: not captured during final user confirmation

## Final determination

All four reviewed-copy scenarios passed independent Windows Report Builder
open, Preview, PDF export, and Excel export. Original-source preservation and
manifest creation were independently confirmed. Missing exact page and
worksheet counts are unreported observations, not validation failures.
