# Official tooling baseline

Verified 2026-07-19 using primary Microsoft documentation.

| Technology  | Status and constraints                                                                                                                                                            | Source                                                                                                            |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| PBIP        | Power BI Desktop project format separating report and semantic model into source-control-friendly folders. Desktop is required to create/convert canonical projects.              | [Power BI Desktop projects](https://learn.microsoft.com/power-bi/developer/projects/projects-overview)            |
| PBIR        | Public, schema-described enhanced report format; still preview. Individual pages, visuals, and bookmarks are stored separately and Desktop validates changed definitions on open. | [Enhanced report format](https://learn.microsoft.com/power-bi/developer/embedded/projects-enhanced-report-format) |
| TMDL        | Textual semantic-model metadata supporting external PBIP edits. Power BI Desktop must be restarted to reload disk changes.                                                        | [TMDL view](https://learn.microsoft.com/power-bi/transform-model/desktop-tmdl-view)                               |
| TMDL schema | Official JSON schema repository is available under `microsoft/json-schemas`. Pinning is deferred until the inspection implementation selects the exact consumed schema revision.  | [Microsoft JSON schemas](https://github.com/microsoft/json-schemas)                                               |
| RDL         | XML report definition governed by versioned XSD specifications. Power BI Report Builder is Microsoft's preferred authoring application.                                           | [Report Definition Language](https://learn.microsoft.com/power-bi/paginated-reports/report-definition-language)   |

## Agentic tooling

The directive names Power BI Report Planner, Design, Authoring, Semantic Model Authoring, Modeling MCP, and Desktop Bridge capabilities. No application runtime dependency has been installed during bootstrap. Before using any such preview repository, record its official repository, license, exact commit, installation method, supported clients, and platform limitations here. Skills are build-time guidance and must not become an undocumented customer runtime dependency.

## Platform boundary

PBIP/PBIR/TMDL parsing and file generation are planned for macOS Mode A. Claims about Power BI Desktop loading, rendering, live-model validation, Desktop Bridge, External Tools, screenshots, or Report Builder require personal Windows execution and remain pending.
