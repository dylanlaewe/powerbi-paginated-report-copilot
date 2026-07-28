# Microsoft Reporting Services sample discovery

Gate 2D statically inspected the seven official RDLs at pinned commit `acc2ee0d1884765e4b5213149430fb063d166719`. Microsoft describes these as self-contained paginated-report samples with data included in each RDL.

No report was opened, previewed, rendered, exported, published, or queried. No credential, custom code, external image, or referenced resource was executed or resolved.

## Reproduce

```sh
task_upstream_dir=$(mktemp -d /tmp/ms-reporting-services.XXXXXX)
git clone --depth 1 --branch master https://github.com/microsoft/Reporting-Services.git "$task_upstream_dir/repo"
git -C "$task_upstream_dir/repo" checkout --detach acc2ee0d1884765e4b5213149430fb063d166719
pnpm exec tsx scripts/discover-official-rdl-samples.mts \
  --upstream "$task_upstream_dir/repo" \
  --output examples/rdl-structure-corpus/external-sources/microsoft-reporting-services
```

Verify `git -C "$task_upstream_dir/repo" status --short` is empty and independently hash every upstream RDL before and after inspection.

## Discovered reports

| Report                   | Static security disposition                                                                       | Selection                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| CountrySalesPerformance  | Embedded Code and Code expressions require review; embedded image and Enter Data content expected | Reference-only                                                        |
| Invoice                  | No custom code or external references; embedded image and Enter Data content expected             | Import candidate                                                      |
| Labels                   | No custom code, images, or external references; Enter Data content expected                       | Import candidate                                                      |
| Letter                   | No custom code or external references; embedded images and Enter Data content expected            | Import candidate                                                      |
| OrganizationExpenditures | No custom code or external references; embedded image and Enter Data content expected             | Defer because chart-only layout is outside the current edit milestone |
| RegionalSales            | Embedded Code and Code expressions require review; embedded image and Enter Data content expected | Reference-only                                                        |
| Transcript               | No custom code or external references; embedded images and Enter Data content expected            | Import candidate                                                      |

All seven use the 2016/01 report-definition namespace, are XML-well-formed, and pass `ReportDefinition-2016.xsd`. Empty Enter Data connection strings are classified absent; integrated-security markers and embedded query payloads are present and expected.

See `source-manifest.json`, `security-scan.json`, `inventories/`, `license-review.md`, and `gap-analysis.md`.
