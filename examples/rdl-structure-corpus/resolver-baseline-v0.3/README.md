# Corpus inspector and target-resolver baseline v0.3

Gate 2G evaluates the unchanged production inspector, resolver architecture, and deterministic grammar against four accepted sources. It creates no edited RDL and makes no Report Builder claim.

## Two-pass method

1. **Production inspector pass:** invokes `inspectRdlFile`, the same generic inspection entry point used by the Electron sidecar.
2. **CORPUS-ASSISTED DIAGNOSTIC ONLY:** after production stops, safely parses the immutable source with NONET and external-entity resolution disabled. This diagnostic records candidates and structural evidence needed for future generalization. It is not current product behavior and is never routed into production services.

All four production attempts parse XML and recognize the namespace, then stop during page-settings normalization with:

- Code: `INVALID_REPORT`
- Message: `ReportSection 0 lacks PageWidth`
- Partial production inventory: none
- Usable renderer summary: no

## Summary

| Fixture              | Production inspection | Title diagnostic                                                                                    | Numeric diagnostic                                                     | Orientation         | Planner grammar                                                  |
| -------------------- | --------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------- | ---------------------------------------------------------------- |
| Simple table         | `BLOCKED_INSPECTOR`   | `FAIL_WRONG_TARGET`: current filter selects styled `ReportTitle`, not visible `Textbox9`            | `PASS_CORRECT`: one `UnitCost` detail binding                          | `BLOCKED_INSPECTOR` | Typed four-operation plan, blocked before review                 |
| Grouped report       | `BLOCKED_INSPECTOR`   | `PASS_CORRECT`: `ReportTitle`                                                                       | `PASS_AMBIGUOUSLY_SAFE`: detail plus two aggregates, but scope is lost | `BLOCKED_INSPECTOR` | Typed three-operation plan, blocked before review                |
| Microsoft Invoice    | `BLOCKED_INSPECTOR`   | `BLOCKED_NO_CANDIDATE`: no confident canonical title                                                | No requested field; field-name-only targeting lacks structural scope   | `BLOCKED_INSPECTOR` | Not constructed                                                  |
| Microsoft Transcript | `BLOCKED_INSPECTOR`   | `BLOCKED_UNSUPPORTED_STRUCTURE`: page-header constant-expression title is outside current discovery | `NOT_APPLICABLE`                                                       | `BLOCKED_INSPECTOR` | Atomically rejected because `left aligned` is unsupported syntax |

The diagnostic title scores are an evaluation rubric only. Production currently has no title or field candidate scoring. The sidecar and mutation paths call `resolveConfiguredReportTitle`; none of the four corpus hashes is configured, so after inspection is generalized they would still return `TITLE_NOT_FOUND`. The generic `resolveReportTitle` conservative filter evaluated here exists in production code but is not the sidecar's current title entry point. Field resolution uses exact matching and cardinality checks, including a mutation-specific requirement for exactly three Revenue targets.

## Reproduce

```sh
task_baseline_output=$(mktemp -d /tmp/rdl-resolver-baseline.XXXXXX)
pnpm exec tsx scripts/generate-corpus-resolver-baseline.mts \
  --output "$task_baseline_output"
diff -u \
  examples/rdl-structure-corpus/resolver-baseline-v0.3/baseline-matrix.json \
  "$task_baseline_output/baseline-matrix.json"
diff -ru \
  examples/rdl-structure-corpus/resolver-baseline-v0.3/fixtures \
  "$task_baseline_output/fixtures"
```

See `baseline-matrix.json`, `fixtures/`, and `implementation-recommendation.md`.
