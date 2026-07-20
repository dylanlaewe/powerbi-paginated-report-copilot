# First real PBIR generation spike

## Result

`PBIR AUTHORING MECHANISM PROVEN FOR THIS STAGE`; populated output remains unverified because the fixture could not retrieve its data.

Executed on branch `spike/first-real-pbir-generation`. The CLI copied a known-valid PBIP, inspected its TMDL, created a PBIR page named `AI Generation Spike`, created a model-bound KPI card, clustered-column chart, and date slicer, verified semantic references and unique IDs, and preserved the source fixture. Independent Windows testing confirmed that Power BI Desktop opened the project and recognized the generated page, visuals, and semantic model without corruption or repair.

## Official authoring tooling

- Microsoft repository: <https://github.com/microsoft/skills-for-fabric>
- Release and commit: `v0.3.8`, `16903b068f9a7e0180d701f158465f53cd2110ba`
- License: MIT
- Installed skill: `/Users/dylanlaewe/.codex/skills/powerbi-report-authoring`, metadata version `0.1.0`
- Installed and loaded by Codex: 2026-07-19
- Validator: `@microsoft/powerbi-report-authoring-cli` `0.1.4`, repository-pinned and invoked with `pnpm exec powerbi-report-author`

The skill exposed PBIR authoring guidance, visual/formatting catalogs, schema-based validation, and version-control precautions. Catalog inspection supplied the binding roles used here: card `Data`, chart `Category` and `Y`, and slicer `Values`. Catalog lookup and validation executed on macOS. Local PBIR editing needs neither tenant authentication nor Desktop. Power BI Desktop reload and rendering require Windows. No tenant or cloud operation was used.

## Fixture

- Source: `C-Kapsalis/pbi-plot-styler`, `examples/coffee-roastery`
- URL: <https://github.com/C-Kapsalis/pbi-plot-styler/tree/b360e9ade029d7a939efa90697cc2021361ed33a/examples/coffee-roastery>
- Commit: `b360e9ade029d7a939efa90697cc2021361ed33a`
- License: MIT, preserved in `samples/known-valid-project/UPSTREAM_LICENSE`
- Evidence: the upstream README identifies it as a complete PBIP project openable in Power BI Desktop; it contains `.pbip`, enhanced PBIR, and TMDL artifacts with fictional inline data and no credentials.
- Versions: PBIR report `2.0.0`, page `2.1.0`, visual container `2.10.0`.

The immutable baseline is `samples/known-valid-project/Roastery.pbip`. Byte hashes matched upstream after import and remained unchanged across generation/tests.

## Executed command and evidence

```bash
pnpm spike:generate \
  --project ./samples/known-valid-project/Roastery.pbip \
  --output ./tmp/run-a
```

Sanitized output:

```text
Power BI Authoring Spike
Source project: .../samples/known-valid-project/Roastery.pbip
Working copy: .../tmp/run-a/Roastery.pbip
Detected: PBIP yes; PBIR yes; TMDL yes
Resolved bindings:
  KPI: Sales Measures[Revenue]
  Chart category: Beans[Origin Country]
  Chart value: Sales Measures[Revenue]
  Slicer: Calendar[Date]
Backup: Created and verified
Authored: AI Generation Spike; KPI card; clustered column chart; slicer
Validation:
  Microsoft PBIR validator: succeededWithWarnings
  Microsoft visual schema: UNREACHABLE
  Semantic references: PASS
  Desktop rendering: PENDING WINDOWS
Result: STRUCTURALLY VALIDATED; NOT YET RENDERED IN POWER BI DESKTOP
```

Detected semantic model: 9 tables, 35 columns, 10 measures, and 4 relationships. Selected objects were the existing measure `Sales Measures[Revenue]` (`SUMX ( Orders, Orders[Bags] * Orders[Unit Price] )`, format `#,##0 EUR`), text column `Beans[Origin Country]`, and date-time column `Calendar[Date]`.

Generated IDs:

- Page: `35c79e9d64a94f429d40`
- Card: `516cc9ba914e784d6a34`
- Chart: `59412079ef8a0bac9754`
- Slicer: `842764478d170e7e76b3`

Modified/created in the disposable copy:

```text
M Roastery.Report/definition/pages/pages.json
+ Roastery.Report/definition/pages/35c79e9d64a94f429d40/page.json
+ Roastery.Report/definition/pages/35c79e9d64a94f429d40/visuals/516cc9ba914e784d6a34/visual.json
+ Roastery.Report/definition/pages/35c79e9d64a94f429d40/visuals/59412079ef8a0bac9754/visual.json
+ Roastery.Report/definition/pages/35c79e9d64a94f429d40/visuals/842764478d170e7e76b3/visual.json
```

Machine and human evidence are under `tmp/run-a/.spike-results/<run-id>/result.json` and `diff.txt`. The verified backup is under `tmp/run-a/.spike-backups/<run-id>/`. Two independent runs (`tmp/run-a`, `tmp/run-b`) had no diff after excluding timestamped backup/result evidence.

## Validation and tests

Official command executed by the CLI:

```bash
pnpm exec powerbi-report-author validate tmp/run-a/Roastery.Report --pretty
```

Result: `succeededWithWarnings`, 0 errors, 1 warning. The warning was `PBIR_SCHEMA_UNREACHABLE`: Microsoft’s exact `visualContainer/2.10.0` schema URL returned HTTP 404 on 2026-07-19, so the official validator skipped that schema. This is not recorded as a JSON-schema pass. JSON parsing, official metadata validation, identifier uniqueness, and model-reference checks passed.

```bash
pnpm format
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Results: formatting passed; lint passed; typecheck passed; 25 tests passed in 3 files; build passed. The 21 spike tests cover the directive’s discovery, copying, immutability, TMDL inventory, binding, IDs, three visuals, reference rejection, backup, atomic writes, output files, manifests, diff, and end-to-end cases.

Relevant package tree:

```text
packages/pbir-spike/
├── package.json
├── src/cli.ts
├── src/index.test.ts
├── src/index.ts
└── tsconfig.json
```

Commits pushed:

- `2cc41fc` — validated Desktop-produced PBIP fixture
- `40eee1f` — first model-bound PBIR generator
- `68426ce` — focused PBIR authoring failure-mode tests

## Independent Windows result

Reported on 2026-07-20 after independent testing in Power BI Desktop on Windows:

- PBIP opening: **PASS**
- Generated page recognition: **PASS**
- Generated visual recognition: **PASS**
- Semantic model recognition: **PASS**
- Corruption/repair check: **PASS**
- Data retrieval: **BLOCKED BY FIXTURE DATA**
- Populated visual rendering: **NOT VERIFIED**
- Interactive filtering: **NOT VERIFIED**
- Visual design quality: **NOT VERIFIED**

The generated `Roastery.pbip` opened without a corruption warning or report-definition repair request. The `AI Generation Spike` page and its visual objects existed, and semantic-model tables appeared in the Data pane. Desktop displayed a global warning that some tables contained incomplete or no data. The original Page 1 visuals also displayed `Error fetching data for this visual`, so unavailable values were project-wide and attributable to the fixture's source-data/refresh state rather than isolated to generated PBIR content. Actual values, slicer interaction, and design quality were not established. Desktop performance in the macOS-hosted Windows VM was extremely slow.

This evidence is sufficient for the stage's technical PBIR authoring mechanism gate, while explicitly not proving populated rendering or interaction. The complete structural handoff remains under `artifacts/first-real-pbir-spike/`.
