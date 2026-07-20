# First real RDL generation spike

## Status

`STRUCTURALLY VALIDATED`; `REPORT BUILDER RENDERING PENDING WINDOWS`.

The CLI generates an actual `Regional Sales Detail.rdl`, not a mockup or intermediate model. It embeds 24 fictional regional-sales rows in the RDL through the officially supported `ENTERDATA` provider and uses no external data source, credentials, tenant, gateway, or network request.

## Official basis

- Microsoft Enter Data documentation: <https://learn.microsoft.com/power-bi/paginated-reports/paginated-reports-enter-data>
- Microsoft RDL documentation: <https://learn.microsoft.com/power-bi/paginated-reports/report-definition-language>
- Microsoft XML ElementPath type grammar: <https://learn.microsoft.com/sql/reporting-services/report-data/element-path-syntax-for-xml-report-data-ssrs>
- Microsoft Open Specification and RDL 2016/01 XSD: <https://learn.microsoft.com/openspecs/sql_server_protocols/ms-rdl/52ce3983-2bfc-4e72-9359-42aaf5fe4509>
- Namespace: `http://schemas.microsoft.com/sqlserver/reporting/2016/01/reportdefinition`

The verbatim Microsoft XSD is preserved as `packages/rdl-spike/schema/ReportDefinition-2016.official.xsd`. It contains one standalone-compilation defect: optional `AuthoringMetadata` references an unimported namespace type. The validation copy changes only that unused declaration to `xsd:string`; the report does not contain `AuthoringMetadata`. This deviation is explicit in `VALIDATOR_OUTPUT.txt` and no other schema rule is altered.

## Execute

```bash
pnpm spike:rdl-generate --output ./artifacts/first-real-rdl-spike
```

Executed result:

```text
Regional Sales Detail RDL Spike
Report: .../artifacts/first-real-rdl-spike/Regional Sales Detail.rdl
Dataset: .../artifacts/first-real-rdl-spike/regional-sales.csv
Rows: 24
Regions: Central, East, West
Backup: CREATED_AND_HASH_VERIFIED
XML well-formedness: PASS
Microsoft RDL 2016/01 XSD: PASS
Field/group/aggregate references: PASS
Print width: PASS
Report Builder rendering: PENDING WINDOWS
```

The deterministic report includes its title/subtitle, an eight-column tablix, Region group, 24 detail rows, alternating detail formatting, repeated headers, region page breaks, three subtotal rows, report grand totals, numeric/currency formatting, print-safe 8.5-inch page settings, and `Page N of M` footer.

## Validation

```bash
xmllint --noout \
  --schema packages/rdl-spike/schema/ReportDefinition-2016.xsd \
  "artifacts/first-real-rdl-spike/Regional Sales Detail.rdl"
```

Output: `artifacts/first-real-rdl-spike/Regional Sales Detail.rdl validates`; exit code 0.

Repository validation separately checks well-formed XML, embedded row distribution, absence of external connections, all dataset and expression references, group expressions, subtotal/grand-total expressions, merged tablix widths, repeating headers, pagination expressions, and body width plus margins. The exact generated RDL is protected by a golden test.

The complete independent Windows procedure, Preview expectations, totals, and PDF/Excel export steps are in `artifacts/first-real-rdl-spike/HANDOFF.md`.
