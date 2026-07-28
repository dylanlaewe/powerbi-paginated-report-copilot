import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, relative, resolve } from "node:path";
import type { XmlElement, XmlNode } from "libxml2-wasm";
import { inspectRdlBytes } from "../packages/rdl-copilot/src/inspection";
import { validateXmlAgainstXsd } from "../packages/rdl-copilot/src/xsd-validator";

const valueAfter = (flag: string): string => {
  const value = process.argv[process.argv.indexOf(flag) + 1];
  if (!value) throw new Error(`Missing ${flag}`);
  return resolve(value);
};

const upstreamRoot = valueAfter("--upstream");
const outputRoot = valueAfter("--output");
const sampleRoot = resolve(upstreamRoot, "PaginatedReportSamples");
const xsdPath = resolve(
  import.meta.dirname,
  "../packages/rdl-spike/schema/ReportDefinition-2016.xsd",
);
const local = (name: string): string => `*[local-name()='${name}']`;
const elements = (node: XmlNode, xpath: string): XmlElement[] =>
  node.find(xpath) as XmlElement[];
const first = (node: XmlNode, xpath: string): string | null =>
  node.get(xpath)?.content.trim() || null;
const attr = (node: XmlElement, key: string): string | null =>
  node.attr(key)?.value.trim() || null;
const hash = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex");
const unique = (values: string[]): string[] => [...new Set(values)].sort();
const count = (root: XmlNode, name: string): number =>
  elements(root, `.//${local(name)}`).length;
const expressionValues = (root: XmlNode): string[] =>
  elements(root, `.//${local("Value")}`)
    .map((node) => node.content.trim())
    .filter((value) => value.startsWith("="));
const textRunFormat = (textbox: XmlElement): string[] =>
  unique(
    elements(textbox, `.//${local("Format")}`)
      .map((item) => item.content.trim())
      .filter(Boolean),
  );
const textboxValues = (textbox: XmlElement): string[] =>
  elements(textbox, `.//${local("TextRun")}/${local("Value")}`)
    .map((item) => item.content.trim())
    .filter(Boolean);
const container = (item: XmlElement): string =>
  item.get(`ancestor::${local("PageHeader")}`)
    ? "pageHeader"
    : item.get(`ancestor::${local("PageFooter")}`)
      ? "pageFooter"
      : item.get(`ancestor::${local("Tablix")}`)
        ? "tablix"
        : item.get(`ancestor::${local("Rectangle")}`)
          ? "rectangle"
          : item.get(`ancestor::${local("Body")}`)
            ? "body"
            : "other";
const boolText = (node: XmlNode, xpath: string): boolean | null => {
  const value = first(node, xpath);
  return value === null ? null : value.toLowerCase() === "true";
};
const finding = (
  present: boolean,
  review: boolean,
): "absent" | "present and expected" | "requires manual review" =>
  present
    ? review
      ? "requires manual review"
      : "present and expected"
    : "absent";

const rdlPaths = (await readdir(sampleRoot, { withFileTypes: true }))
  .filter(
    (entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".rdl"),
  )
  .map((entry) => resolve(sampleRoot, entry.name))
  .sort((left, right) => left.localeCompare(right));
const xsd = await readFile(xsdPath);
await mkdir(resolve(outputRoot, "inventories"), { recursive: true });

const inventories: Array<Record<string, unknown>> = [];
const scans: Array<Record<string, unknown>> = [];

for (const path of rdlPaths) {
  const before = await readFile(path);
  const sourceHash = hash(before);
  const { ParseOption, XmlDocument } = (await import(
    new URL(
      "../packages/rdl-copilot/node_modules/libxml2-wasm/lib/index.mjs",
      import.meta.url,
    ).href
  )) as typeof import("libxml2-wasm");
  const document = XmlDocument.fromBuffer(before, {
    option: ParseOption.XML_PARSE_NONET | ParseOption.XML_PARSE_NO_XXE,
  });
  try {
    const root = document.get("/*") as XmlElement | null;
    if (!root || root.name !== "Report" || !root.namespaceUri)
      throw new Error(`${path} is not a namespaced Report`);
    const sourcePath = relative(upstreamRoot, path).replaceAll("\\", "/");
    const text = before.toString("utf8");
    const expressions = expressionValues(root);
    const dataSources = elements(
      root,
      `./${local("DataSources")}/${local("DataSource")}`,
    ).map((item) => ({
      name: attr(item, "Name"),
      provider: first(
        item,
        `./${local("ConnectionProperties")}/${local("DataProvider")}`,
      ),
      hasConnectionString:
        first(
          item,
          `./${local("ConnectionProperties")}/${local("ConnectString")}`,
        ) !== null,
      integratedSecurity: boolText(
        item,
        `./${local("ConnectionProperties")}/${local("IntegratedSecurity")}`,
      ),
      sharedDataSourceReference: first(
        item,
        `./${local("DataSourceReference")}`,
      ),
    }));
    const datasets = elements(
      root,
      `./${local("DataSets")}/${local("DataSet")}`,
    ).map((dataset) => ({
      name: attr(dataset, "Name"),
      fields: elements(dataset, `./${local("Fields")}/${local("Field")}`).map(
        (field) => ({
          name: attr(field, "Name"),
          typeName: first(field, `./*[local-name()='TypeName']`),
          dataField: first(field, `./${local("DataField")}`),
        }),
      ),
      query: {
        dataSourceName: first(
          dataset,
          `./${local("Query")}/${local("DataSourceName")}`,
        ),
        commandType: first(
          dataset,
          `./${local("Query")}/${local("CommandType")}`,
        ),
        hasCommandText:
          first(dataset, `./${local("Query")}/${local("CommandText")}`) !==
          null,
        sharedDatasetReference: first(
          dataset,
          `./${local("SharedDataSet")}/${local("SharedDataSetReference")}`,
        ),
      },
      filters: elements(dataset, `.//${local("Filter")}`).map((filter) => ({
        expression: first(filter, `./${local("FilterExpression")}`),
        operator: first(filter, `./${local("Operator")}`),
        values: elements(
          filter,
          `./${local("FilterValues")}/${local("FilterValue")}`,
        ).map((item) => item.content.trim()),
      })),
    }));
    const parameters = elements(
      root,
      `./${local("ReportParameters")}/${local("ReportParameter")}`,
    ).map((parameter) => ({
      name: attr(parameter, "Name"),
      dataType: first(parameter, `./${local("DataType")}`),
      prompt: first(parameter, `./${local("Prompt")}`),
      availableValues: {
        datasetName: first(
          parameter,
          `./${local("ValidValues")}/${local("DataSetReference")}/${local("DataSetName")}`,
        ),
        valueField: first(
          parameter,
          `./${local("ValidValues")}/${local("DataSetReference")}/${local("ValueField")}`,
        ),
        labelField: first(
          parameter,
          `./${local("ValidValues")}/${local("DataSetReference")}/${local("LabelField")}`,
        ),
        staticValueCount: count(parameter, "ParameterValue"),
      },
      defaultValues: {
        datasetName: first(
          parameter,
          `./${local("DefaultValue")}/${local("DataSetReference")}/${local("DataSetName")}`,
        ),
        valueField: first(
          parameter,
          `./${local("DefaultValue")}/${local("DataSetReference")}/${local("ValueField")}`,
        ),
        staticValueCount: elements(
          parameter,
          `./${local("DefaultValue")}/${local("Values")}/${local("Value")}`,
        ).length,
      },
    }));
    const tablixes = elements(root, `.//${local("Tablix")}`).map((tablix) => {
      const groups = elements(tablix, `.//${local("Group")}`).map((group) => ({
        name: attr(group, "Name"),
        hierarchy: group.get(`ancestor::${local("TablixRowHierarchy")}`)
          ? "row"
          : group.get(`ancestor::${local("TablixColumnHierarchy")}`)
            ? "column"
            : "unknown",
        expressions: elements(
          group,
          `./${local("GroupExpressions")}/${local("GroupExpression")}`,
        ).map((item) => item.content.trim()),
        pageBreak: first(
          group,
          `./${local("PageBreak")}/${local("BreakLocation")}`,
        ),
      }));
      return {
        name: attr(tablix, "Name"),
        datasetName: first(tablix, `./${local("DataSetName")}`),
        body: {
          columns: elements(
            tablix,
            `./${local("TablixBody")}/${local("TablixColumns")}/${local("TablixColumn")}`,
          ).length,
          rows: elements(
            tablix,
            `./${local("TablixBody")}/${local("TablixRows")}/${local("TablixRow")}`,
          ).length,
        },
        groups,
        repeatRowHeaders: boolText(tablix, `./${local("RepeatRowHeaders")}`),
        repeatColumnHeaders: boolText(
          tablix,
          `./${local("RepeatColumnHeaders")}`,
        ),
        fixedRowHeaders: boolText(tablix, `./${local("FixedRowHeaders")}`),
        fixedColumnHeaders: boolText(
          tablix,
          `./${local("FixedColumnHeaders")}`,
        ),
      };
    });
    const textboxes = elements(root, `.//${local("Textbox")}`).map(
      (textbox) => ({
        name: attr(textbox, "Name"),
        container: container(textbox),
        values: textboxValues(textbox),
        formats: textRunFormat(textbox),
        fontSizes: unique(
          elements(textbox, `.//${local("FontSize")}`).map((item) =>
            item.content.trim(),
          ),
        ),
        fontWeights: unique(
          elements(textbox, `.//${local("FontWeight")}`).map((item) =>
            item.content.trim(),
          ),
        ),
        hidden: first(textbox, `./${local("Visibility")}/${local("Hidden")}`),
      }),
    );
    const sections = elements(
      root,
      `./${local("ReportSections")}/${local("ReportSection")}`,
    ).map((section) => {
      const page = section.get(`./${local("Page")}`) as XmlElement | null;
      const width = page ? first(page, `./${local("PageWidth")}`) : null;
      const height = page ? first(page, `./${local("PageHeight")}`) : null;
      return {
        bodyWidth: first(section, `./${local("Width")}`),
        pageWidth: width,
        pageHeight: height,
        orientation:
          width && height
            ? Number.parseFloat(width) > Number.parseFloat(height)
              ? "landscape"
              : "portrait"
            : "not serialized",
        margins: {
          left: page ? first(page, `./${local("LeftMargin")}`) : null,
          right: page ? first(page, `./${local("RightMargin")}`) : null,
          top: page ? first(page, `./${local("TopMargin")}`) : null,
          bottom: page ? first(page, `./${local("BottomMargin")}`) : null,
        },
        columns: page ? first(page, `./${local("Columns")}`) : null,
        columnSpacing: page ? first(page, `./${local("ColumnSpacing")}`) : null,
      };
    });
    let genericInspector: Record<string, string>;
    try {
      await inspectRdlBytes(before, basename(path));
      genericInspector = {
        status: "inventory accepted; target resolution not evaluated",
        reason: "none",
      };
    } catch (error) {
      genericInspector = {
        status: "stopped before target resolution",
        reason: error instanceof Error ? error.message : String(error),
      };
    }
    let xsdResult: Record<string, string>;
    if (
      root.namespaceUri ===
      "http://schemas.microsoft.com/sqlserver/reporting/2016/01/reportdefinition"
    ) {
      try {
        await validateXmlAgainstXsd(before, xsd);
        xsdResult = { status: "PASS", schema: "ReportDefinition-2016.xsd" };
      } catch (error) {
        xsdResult = {
          status: "FAIL",
          schema: "ReportDefinition-2016.xsd",
          reason: error instanceof Error ? error.message : String(error),
        };
      }
    } else
      xsdResult = {
        status: "NOT_APPLICABLE",
        schema: "ReportDefinition-2016.xsd",
        reason: `namespace ${root.namespaceUri}`,
      };
    const namespaces = unique(
      [...text.matchAll(/xmlns(?::[A-Za-z0-9_-]+)?="([^"]+)"/gu)].map(
        (match) => match[1] ?? "",
      ),
    );
    const inventory = {
      inventoryVersion: 1,
      source: {
        relativePath: sourcePath,
        fileName: basename(path),
        byteSize: before.byteLength,
        sha256: sourceHash,
      },
      xml: {
        wellFormedness: "PASS",
        namespace: root.namespaceUri,
        likelySchemaVersion:
          /reporting\/(\d{4}\/\d{2})\/reportdefinition$/u.exec(
            root.namespaceUri,
          )?.[1] ?? "unknown",
        namespaces,
        designer: {
          name: first(
            root,
            `./*[local-name()='AuthoringMetadata']/*[local-name()='CreatedBy']/*[local-name()='Name']`,
          ),
          version: first(
            root,
            `./*[local-name()='AuthoringMetadata']/*[local-name()='CreatedBy']/*[local-name()='Version']`,
          ),
          reportId: first(root, `./*[local-name()='ReportID']`),
        },
        xsdValidation: xsdResult,
      },
      dataSources,
      datasets,
      parameters,
      tablixes,
      expressions: {
        groupExpressions: unique(
          elements(root, `.//${local("GroupExpression")}`).map((item) =>
            item.content.trim(),
          ),
        ),
        filterExpressions: unique(
          elements(root, `.//${local("FilterExpression")}`).map((item) =>
            item.content.trim(),
          ),
        ),
        sortExpressions: unique(
          elements(root, `.//${local("SortExpression")}/${local("Value")}`).map(
            (item) => item.content.trim(),
          ),
        ),
        aggregateExpressions: unique(
          expressions.filter((value) =>
            /(?:Sum|Avg|Count|CountDistinct|Min|Max|First|Last)\s*\(/iu.test(
              value,
            ),
          ),
        ),
        visibilityExpressions: unique(
          elements(root, `.//${local("Visibility")}/${local("Hidden")}`)
            .map((item) => item.content.trim())
            .filter((value) => value.startsWith("=")),
        ),
      },
      reportItems: {
        textboxes,
        rectangles: elements(root, `.//${local("Rectangle")}`).map((item) => ({
          name: attr(item, "Name"),
          container: container(item),
          nestingDepth: elements(item, `ancestor::${local("Rectangle")}`)
            .length,
        })),
        lists: elements(root, `.//${local("List")}`).map((item) =>
          attr(item, "Name"),
        ),
        charts: elements(root, `.//${local("Chart")}`).map((item) =>
          attr(item, "Name"),
        ),
        gauges: elements(root, `.//${local("GaugePanel")}`).map((item) =>
          attr(item, "Name"),
        ),
        maps: elements(root, `.//${local("Map")}`).map((item) =>
          attr(item, "Name"),
        ),
        images: elements(root, `.//${local("Image")}`).map((item) => ({
          name: attr(item, "Name"),
          source: first(item, `./${local("Source")}`),
          value: first(item, `./${local("Value")}`),
        })),
        subreports: elements(root, `.//${local("Subreport")}`).map((item) => ({
          name: attr(item, "Name"),
          reportName: first(item, `./${local("ReportName")}`),
        })),
        pageHeaders: count(root, "PageHeader"),
        pageFooters: count(root, "PageFooter"),
      },
      layout: {
        reportSections: sections,
        pageBreaks: elements(root, `.//${local("PageBreak")}`).map((item) =>
          first(item, `./${local("BreakLocation")}`),
        ),
        repeatOnNewPageCount: count(root, "RepeatOnNewPage"),
        hiddenItemCount: elements(root, `.//${local("Visibility")}`).length,
      },
      sidecarCompatibility: {
        titleCandidates: "not evaluated during discovery gate",
        existingFieldNumericFormatCandidates:
          "not evaluated during discovery gate",
        genericInspector,
      },
    };
    const security = {
      relativePath: sourcePath,
      sha256: sourceHash,
      findings: {
        embeddedCode: finding(count(root, "Code") > 0, true),
        codeModules: finding(count(root, "CodeModule") > 0, true),
        classes: finding(count(root, "Class") > 0, true),
        customAssemblyReferences: finding(
          count(root, "CodeModule") > 0 || count(root, "Class") > 0,
          true,
        ),
        customReportItems: finding(count(root, "CustomReportItem") > 0, true),
        externalImages: finding(
          elements(root, `.//${local("Image")}/${local("Source")}`).some(
            (item) => item.content.trim() === "External",
          ),
          true,
        ),
        embeddedImages: finding(count(root, "EmbeddedImage") > 0, false),
        hyperlinks: finding(count(root, "Hyperlink") > 0, true),
        drillthroughActions: finding(count(root, "Drillthrough") > 0, true),
        subreports: finding(count(root, "Subreport") > 0, true),
        sharedDataSourceReferences: finding(
          count(root, "DataSourceReference") > 0,
          true,
        ),
        sharedDatasetReferences: finding(
          count(root, "SharedDataSetReference") > 0,
          true,
        ),
        connectionStrings: finding(
          elements(root, `.//${local("ConnectString")}`).some(
            (item) => item.content.trim().length > 0,
          ),
          true,
        ),
        integratedSecurity: finding(
          elements(root, `.//${local("IntegratedSecurity")}`).some(
            (item) => item.content.trim().toLowerCase() === "true",
          ),
          false,
        ),
        credentialProperties: finding(
          /<(?:UserName|Password|CredentialRetrieval)>/iu.test(text),
          true,
        ),
        datasetQueryText: finding(
          count(root, "CommandText") > 0,
          dataSources.some(({ provider }) => provider !== "ENTERDATA"),
        ),
        storedProcedureCommands: finding(
          elements(root, `.//${local("CommandType")}`).some(
            (item) => item.content.trim() === "StoredProcedure",
          ),
          true,
        ),
        urlOrHttpSources: finding(
          [
            ...elements(root, `.//${local("ConnectString")}`),
            ...elements(root, `.//${local("Hyperlink")}`),
            ...elements(
              root,
              `.//${local("Image")}[${local("Source")}='External']/${local("Value")}`,
            ),
          ].some((item) => /https?:\/\//iu.test(item.content)),
          true,
        ),
        filePaths: finding(/[A-Za-z]:\\|file:\/\//iu.test(text), true),
        mapsOrExternalSpatialSources: finding(
          count(root, "Map") > 0 ||
            count(root, "MapSpatialData") > 0 ||
            count(root, "MapShapefile") > 0,
          true,
        ),
        codeExpressions: finding(
          expressions.some((value) => /\bCode\./u.test(value)),
          true,
        ),
        customAssemblyExpressions: finding(
          expressions.some((value) =>
            /\b[A-Za-z0-9_]+\.[A-Za-z0-9_]+\(/u.test(value),
          ) && count(root, "CodeModule") > 0,
          true,
        ),
        unusualNamespaces: finding(
          namespaces.some(
            (namespace) =>
              !namespace.includes("schemas.microsoft.com") &&
              !namespace.includes("w3.org"),
          ),
          true,
        ),
      },
      disposition:
        count(root, "Code") > 0 ||
        count(root, "CodeModule") > 0 ||
        count(root, "Subreport") > 0 ||
        count(root, "CustomReportItem") > 0
          ? "requires manual review"
          : "static discovery suitable",
    };
    inventories.push(inventory);
    scans.push(security);
    await writeFile(
      resolve(
        outputRoot,
        "inventories",
        `${basename(path, ".rdl")}.inventory.json`,
      ),
      `${JSON.stringify(inventory, null, 2)}\n`,
      "utf8",
    );
  } finally {
    document.dispose();
  }
  const after = await readFile(path);
  if (hash(after) !== sourceHash)
    throw new Error(`Upstream source changed during inspection: ${path}`);
}

const manifest = {
  manifestVersion: 1,
  deterministicOrdering:
    "relativePath ascending; nested names and expressions ascending where order is not structural",
  inventoryGenerator: "scripts/discover-official-rdl-samples.mts v1",
  sourceCount: inventories.length,
  sources: inventories.map((inventory) => {
    const source = inventory.source as Record<string, unknown>;
    const xml = inventory.xml as Record<string, unknown>;
    return {
      relativePath: source.relativePath,
      fileName: source.fileName,
      byteSize: source.byteSize,
      sha256: source.sha256,
      namespace: xml.namespace,
      likelySchemaVersion: xml.likelySchemaVersion,
      xmlWellFormedness: xml.wellFormedness,
      xsdValidation: xml.xsdValidation,
      inventoryRelativePath: `inventories/${String(source.fileName).replace(/\.rdl$/u, ".inventory.json")}`,
    };
  }),
};
await writeFile(
  resolve(outputRoot, "source-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);
await writeFile(
  resolve(outputRoot, "security-scan.json"),
  `${JSON.stringify(
    {
      scanVersion: 1,
      policy:
        "static XML only; NONET; NO_XXE; no rendering, query execution, credentials, or external resolution",
      sources: scans,
    },
    null,
    2,
  )}\n`,
  "utf8",
);
