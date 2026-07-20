# Independent Windows rendering handoff

Status: structurally validated; Power BI Desktop rendering pending Windows. Do not merge this spike based on structural evidence alone.

## Generated project

Open `generated-roastery/Roastery.pbip`. This tracked 172 KB directory contains the complete generated Power BI project copied byte-for-byte from `tmp/run-a`, excluding only `.spike-backups` and `.spike-results`. Those are generator evidence directories, not PBIP content, and contained machine-specific absolute paths. `SHA256SUMS` inventories every preserved project file.

## Reproduce from a clean clone

Install Node.js 22 and Corepack/pnpm, then run:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm spike:generate --project ./samples/known-valid-project/Roastery.pbip --output ./artifacts/first-real-pbir-spike/generated-roastery
```

The last command recreates the complete project solely from tracked inputs and prints the absolute final `.pbip` path as `Working copy`. It does not depend on `tmp/`. Generated PBIR content is deterministic; timestamped `.spike-backups` and `.spike-results` evidence is intentionally run-specific.

## Validator identity and exact execution

- Package: `@microsoft/powerbi-report-authoring-cli`
- Version: `0.1.4` (pinned in `package.json` and `pnpm-lock.yaml`)
- Executable invoked: `/Users/dylanlaewe/powerbi-paginated-report-copilot/node_modules/.bin/powerbi-report-author`
- Resolved package entry point: `/Users/dylanlaewe/powerbi-paginated-report-copilot/node_modules/.pnpm/@microsoft+powerbi-report-authoring-cli@0.1.4/node_modules/@microsoft/powerbi-report-authoring-cli/dist/cli.js`
- Package source: `https://github.com/microsoft/skills-for-fabric`, MIT license; installed from the npm registry through the lockfile
- Identity: official Microsoft Power BI Report Authoring CLI (`@microsoft` scope), not repository-written validation
- Flags: subcommand `validate`, positional report directory, and `--pretty`; no other flags

Exact command:

```bash
pnpm exec powerbi-report-author validate artifacts/first-real-pbir-spike/generated-roastery/Roastery.Report --pretty
```

The complete stdout JSON, without warning elision or rewriting, is in `VALIDATOR_OUTPUT.json`. Exit code was 0. Stderr was empty.

The Microsoft result was `succeededWithWarnings`, with 0 errors and 1 warning. The sole warning is:

- Code: `PBIR_SCHEMA_UNREACHABLE`
- Severity: warning
- Message: reproduced in full in `VALIDATOR_OUTPUT.json`; the Microsoft-hosted `visualContainer/2.10.0` schema could not be fetched, and validation was skipped for all seven visual files listed there.
- Diagnostic `file`: existing baseline visual `pages/a1f935c9ad3918c55c49/visuals/17b0cc8e254693190c00/visual.json`.
- JSON path: not emitted by this validator diagnostic (absent, not omitted from this handoff).
- Assessment: expected in the current environment because the exact Microsoft schema URL returns HTTP 404; not fixable in project content without Microsoft restoring/publishing the referenced schema. It is potentially relevant to Desktop rendering because those visual JSON files did not receive official JSON-schema validation. It is not itself evidence that any visual is invalid.

Every file named by that warning (paths below are relative to `generated-roastery/Roastery.Report/definition/`):

- `pages/a1f935c9ad3918c55c49/visuals/17b0cc8e254693190c00/visual.json` (also emitted as the diagnostic `file`)
- `pages/a1f935c9ad3918c55c49/visuals/5dd25eb672a72da45096/visual.json`
- `pages/a1f935c9ad3918c55c49/visuals/d6b2b1a59f82b221f25b/visual.json`
- `pages/a1f935c9ad3918c55c49/visuals/e267ae74efe4463bdde6/visual.json`
- `pages/35c79e9d64a94f429d40/visuals/516cc9ba914e784d6a34/visual.json`
- `pages/35c79e9d64a94f429d40/visuals/59412079ef8a0bac9754/visual.json`
- `pages/35c79e9d64a94f429d40/visuals/842764478d170e7e76b3/visual.json`

Repository validation is separate: the spike parses JSON before atomic replacement; rejects duplicate identifiers; verifies the selected measure/columns exist in inspected TMDL; verifies backups and fixture hashes; and runs focused Vitest cases. These checks are custom and are not represented as Microsoft schema validation.

## Fixture provenance and redistribution

- Project: `examples/coffee-roastery` from `C-Kapsalis/pbi-plot-styler`
- Source: `https://github.com/C-Kapsalis/pbi-plot-styler/tree/b360e9ade029d7a939efa90697cc2021361ed33a/examples/coffee-roastery`
- Exact source commit: `b360e9ade029d7a939efa90697cc2021361ed33a`
- License: MIT; the upstream license is preserved as `generated-roastery/UPSTREAM_LICENSE` and in the baseline fixture.
- Desktop evidence: the upstream README describes this directory as a complete, openable PBIP project for Power BI Desktop. Its files include `.pbip`, enhanced PBIR, TMDL, platform metadata, and a Power BI base theme. The fixture uses fictional inline data and has no external credentials.
- Redistribution: the MIT license permits copying, modification, distribution, and derivative works provided its copyright/license notice is preserved. Both the baseline and generated derivative preserve that notice. No proprietary PBIX, credentials, or tenant data are included.

## Exact bindings and source paths

| Visual                          | Binding role | Semantic object                     | TMDL source                                                                       | Generated PBIR binding                                                                                              |
| ------------------------------- | ------------ | ----------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Revenue KPI card                | `Data`       | Measure `'Sales Measures'[Revenue]` | `generated-roastery/Roastery.SemanticModel/definition/tables/Sales Measures.tmdl` | `generated-roastery/Roastery.Report/definition/pages/35c79e9d64a94f429d40/visuals/516cc9ba914e784d6a34/visual.json` |
| Revenue by Origin Country chart | `Category`   | Column `Beans[Origin Country]`      | `generated-roastery/Roastery.SemanticModel/definition/tables/Beans.tmdl`          | `generated-roastery/Roastery.Report/definition/pages/35c79e9d64a94f429d40/visuals/59412079ef8a0bac9754/visual.json` |
| Revenue by Origin Country chart | `Y`          | Measure `'Sales Measures'[Revenue]` | `generated-roastery/Roastery.SemanticModel/definition/tables/Sales Measures.tmdl` | same chart `visual.json`                                                                                            |
| Date slicer                     | `Values`     | Column `Calendar[Date]`             | `generated-roastery/Roastery.SemanticModel/definition/tables/Calendar.tmdl`       | `generated-roastery/Roastery.Report/definition/pages/35c79e9d64a94f429d40/visuals/842764478d170e7e76b3/visual.json` |

The Revenue expression is `SUMX ( Orders, Orders[Bags] * Orders[Unit Price] )`; its format is `#,##0 EUR`. `Origin Country` is a visible string column. `Calendar[Date]` is a visible `dateTime` column.

## Generated-file inventory

Compared with the immutable baseline, exactly five PBIR files were created or modified:

| Change   | SHA-256                                                            | File / identifier                                                                |
| -------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Modified | `cbdc79ba96dc31b1cdd53ec7a4db9772d643d8e1727c617227196dfb05ff7c22` | `Roastery.Report/definition/pages/pages.json`                                    |
| Created  | `71f720f5363e2717f4d5b36284be8972c64c9bc74e1833b3469e694ace93b207` | `.../pages/35c79e9d64a94f429d40/page.json`; page ID `35c79e9d64a94f429d40`       |
| Created  | `23648389ce6b75ba0523d2ec442c5f43761a7a614ecfac807117b18ed4aa4a96` | `.../visuals/516cc9ba914e784d6a34/visual.json`; card ID `516cc9ba914e784d6a34`   |
| Created  | `8eb51925523fd5c764b57ac50fae263fe0de3b2f717e87b8534e5bb3f08387c4` | `.../visuals/59412079ef8a0bac9754/visual.json`; chart ID `59412079ef8a0bac9754`  |
| Created  | `b5ba8d763f105cbc25e75c622aab52ed6ac3d4d398af0284f01fab31068216b9` | `.../visuals/842764478d170e7e76b3/visual.json`; slicer ID `842764478d170e7e76b3` |

All four generated identifiers are 20-character hexadecimal values and are mutually unique. The generator and tests also reject duplicate page/visual IDs. `SHA256SUMS` covers every file in the complete generated project, including unchanged inherited files.

## Windows validation procedure

1. Use Windows 10 or 11 with a current Power BI Desktop release that supports PBIP and enhanced PBIR developer mode. Record the exact Desktop version.
2. Clone branch `spike/first-real-pbir-generation`, or copy the entire `generated-roastery` directory to Windows without flattening or renaming its internal paths.
3. Make a second disposable copy of `generated-roastery` for Desktop testing. Keep the checked-out/tracked artifact untouched.
4. Open the disposable copy’s `Roastery.pbip` in Power BI Desktop. Capture every warning, error, recovery, upgrade, unsupported-version, or credential dialog before dismissing it.
5. Navigate to the page named exactly `AI Generation Spike` if it is not selected automatically.
6. Confirm the page shows a Revenue KPI card bound to `'Sales Measures'[Revenue]`, a clustered-column chart titled Revenue by Origin Country using `Beans[Origin Country]` and the Revenue measure, and a Between Date slicer using `Calendar[Date]`.
7. Capture one full-window screenshot showing the Desktop version/context, page tab, all three visuals, and any broken-field or visual-error indicators. Also capture close-ups of any incorrect visual and the full text/details of every dialog.
8. If any open/render error occurs, do not save. Close Power BI Desktop, choose **Don't save** when prompted, and preserve the failing disposable copy unchanged. Return its generated page/visual JSON files along with screenshots and exact dialog text.
9. If rendering succeeds, save only the disposable copy, close Desktop, reopen the same `.pbip`, and capture a second full-page screenshot confirming the three visuals still render. Do not commit Desktop rewrites until their diff has been reviewed.

Return: Windows version, exact Power BI Desktop version, first-open screenshot, reopen screenshot if successful, and every dialog/error screenshot plus copied text. Rendering remains `PENDING WINDOWS` until this evidence is reviewed.
