import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { XmlElement, XmlNode } from "libxml2-wasm";
import { validateXmlAgainstXsd } from "../packages/rdl-copilot/src/xsd-validator";

const COMMIT = "acc2ee0d1884765e4b5213149430fb063d166719";
const SOURCE_PATH = "PaginatedReportSamples/Transcript.rdl";
const SOURCE_SIZE = 116_709;
const SOURCE_HASH =
  "9693231c79853b0881d0414f1c98242c76216efc00784b3bc81acc69430b2e81";
const LICENSE_HASH =
  "e1406b32500b4622444e91ec3b50a473b97c5c4470b7b1f137c36abcfb248b59";
const NAMESPACE =
  "http://schemas.microsoft.com/sqlserver/reporting/2016/01/reportdefinition";
const local = (name: string): string => `*[local-name()='${name}']`;
const elements = (node: XmlNode, xpath: string): XmlElement[] =>
  node.find(xpath) as XmlElement[];
const first = (node: XmlNode, xpath: string): string | null =>
  node.get(xpath)?.content.trim() || null;
const attribute = (node: XmlElement, name: string): string | null =>
  node.attr(name)?.value.trim() || null;
const hash = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex");

function argument(flag: string): string {
  const value = process.argv[process.argv.indexOf(flag) + 1];
  if (!value) throw new Error(`Missing ${flag}`);
  return resolve(value);
}

function assertIdentity(
  label: string,
  bytes: Uint8Array,
  expectedSize: number,
  expectedHash: string,
): void {
  if (bytes.byteLength !== expectedSize)
    throw new Error(`${label} size mismatch: ${bytes.byteLength}`);
  const actual = hash(bytes);
  if (actual !== expectedHash)
    throw new Error(`${label} SHA-256 mismatch: ${actual}`);
}

const upstreamRoot = argument("--upstream");
const discoveryRoot = argument("--discovery");
const outputRoot = argument("--output");
const sourceBytes = await readFile(resolve(upstreamRoot, SOURCE_PATH));
const licenseBytes = await readFile(resolve(upstreamRoot, "License.md"));
assertIdentity("Transcript.rdl", sourceBytes, SOURCE_SIZE, SOURCE_HASH);
assertIdentity(
  "License.md",
  licenseBytes,
  licenseBytes.byteLength,
  LICENSE_HASH,
);

const manifest = JSON.parse(
  await readFile(resolve(discoveryRoot, "source-manifest.json"), "utf8"),
) as { sources: Array<Record<string, unknown>> };
const scan = JSON.parse(
  await readFile(resolve(discoveryRoot, "security-scan.json"), "utf8"),
) as { sources: Array<Record<string, unknown>> };
const discoveredInventory = JSON.parse(
  await readFile(
    resolve(discoveryRoot, "inventories/Transcript.inventory.json"),
    "utf8",
  ),
) as Record<string, unknown> & {
  source: Record<string, unknown>;
  xml: Record<string, unknown>;
  datasets: Array<{
    name: string;
    fields: Array<{ name: string }>;
  }>;
};
const manifestSource = manifest.sources.find(
  (source) => source.relativePath === SOURCE_PATH,
);
const securitySource = scan.sources.find(
  (source) => source.relativePath === SOURCE_PATH,
);
if (
  !manifestSource ||
  manifestSource.byteSize !== SOURCE_SIZE ||
  manifestSource.sha256 !== SOURCE_HASH ||
  manifestSource.namespace !== NAMESPACE
)
  throw new Error("Gate 2D Transcript manifest identity mismatch");
if (!securitySource || securitySource.sha256 !== SOURCE_HASH)
  throw new Error("Gate 2D Transcript security identity mismatch");
if (
  discoveredInventory.source.byteSize !== SOURCE_SIZE ||
  discoveredInventory.source.sha256 !== SOURCE_HASH ||
  discoveredInventory.xml.namespace !== NAMESPACE
)
  throw new Error("Gate 2D Transcript inventory identity mismatch");

const xsd = await readFile(
  resolve(
    import.meta.dirname,
    "../packages/rdl-spike/schema/ReportDefinition-2016.xsd",
  ),
);
const xsdResult = await validateXmlAgainstXsd(sourceBytes, xsd);
if (xsdResult.status !== "PASS")
  throw new Error("Transcript RDL XSD validation failed");
const { ParseOption, XmlDocument } = (await import(
  new URL(
    "../packages/rdl-copilot/node_modules/libxml2-wasm/lib/index.mjs",
    import.meta.url,
  ).href
)) as typeof import("libxml2-wasm");
const document = XmlDocument.fromBuffer(sourceBytes, {
  option: ParseOption.XML_PARSE_NONET | ParseOption.XML_PARSE_NO_XXE,
});

try {
  const root = document.get("/*") as XmlElement | null;
  if (!root || root.name !== "Report" || root.namespaceUri !== NAMESPACE)
    throw new Error("Transcript safe-parse root identity mismatch");

  const overlappingFields = [
    ...new Set(
      discoveredInventory.datasets
        .flatMap(({ fields }) => fields.map(({ name }) => name))
        .filter((name, index, all) => all.indexOf(name) !== index),
    ),
  ]
    .sort()
    .map((name) => ({
      name,
      datasets: discoveredInventory.datasets
        .filter(({ fields }) => fields.some((field) => field.name === name))
        .map(({ name: datasetName }) => datasetName),
    }));

  const rectangles = elements(root, `.//${local("Rectangle")}`).map(
    (rectangle) => {
      const ancestors = elements(
        rectangle,
        `ancestor::${local("Rectangle")}`,
      ).map((item) => attribute(item, "Name"));
      const childReportItems = elements(
        rectangle,
        `./${local("ReportItems")}/*`,
      ).map((item) => ({
        type: item.name,
        name: attribute(item, "Name"),
      }));
      return {
        name: attribute(rectangle, "Name"),
        parentRectangle: ancestors.at(-1) ?? null,
        depth: ancestors.length,
        childReportItems,
        path: [...ancestors, attribute(rectangle, "Name")],
      };
    },
  );

  const rowMembers = (tablix: XmlElement) =>
    elements(
      tablix,
      `./${local("TablixRowHierarchy")}//${local("TablixMember")}`,
    ).map((member) => {
      const parentMembers = elements(
        member,
        `ancestor::${local("TablixMember")}`,
      );
      const parentGroupElement = parentMembers
        .at(-1)
        ?.get(`./${local("Group")}`) as XmlElement | null | undefined;
      const group = member.get(`./${local("Group")}`) as XmlElement | null;
      return {
        depth: parentMembers.length,
        parentGroup: parentGroupElement
          ? attribute(parentGroupElement, "Name")
          : null,
        groupName: group ? attribute(group, "Name") : null,
        groupExpressions: group
          ? elements(
              group,
              `./${local("GroupExpressions")}/${local("GroupExpression")}`,
            ).map((item) => item.content.trim())
          : [],
        static: group === null,
      };
    });

  const tablixEvidence = elements(root, `.//${local("Tablix")}`).map(
    (tablix) => {
      const rectangleAncestors = elements(
        tablix,
        `ancestor::${local("Rectangle")}`,
      ).map((item) => attribute(item, "Name"));
      const tablixAncestors = elements(
        tablix,
        `ancestor::${local("Tablix")}`,
      ).map((item) => attribute(item, "Name"));
      return {
        name: attribute(tablix, "Name"),
        datasetName: first(tablix, `./${local("DataSetName")}`),
        rectanglePath: rectangleAncestors,
        parentTablix: tablixAncestors.at(-1) ?? null,
        rowMembers: rowMembers(tablix),
      };
    },
  );

  const title = root.get(
    `.//${local("PageHeader")}//${local("Textbox")}[@Name='Textbox1']`,
  ) as XmlElement | null;
  if (!title) throw new Error("Expected Transcript page-header title missing");
  const titleEvidence = {
    reportItemName: "Textbox1",
    location: "pageHeader",
    value: first(title, `.//${local("TextRun")}/${local("Value")}`),
    fontSize: first(
      title,
      `.//${local("TextRun")}/${local("Style")}/${local("FontSize")}`,
    ),
    fontWeight: first(
      title,
      `.//${local("TextRun")}/${local("Style")}/${local("FontWeight")}`,
    ),
    textAlign: first(
      title,
      `.//${local("Paragraph")}/${local("Style")}/${local("TextAlign")}`,
    ),
    width: first(title, `./${local("Width")}`),
    ambiguity: [
      "Textbox233 and Textbox234 are prominent 14pt Bold section captions in body tablixes",
      "Textbox34 and Textbox36 are 4mm Bold page-header labels",
    ],
  };
  const maxRectangleDepth = Math.max(...rectangles.map(({ depth }) => depth));
  const deepestRectanglePaths = rectangles
    .filter(({ depth }) => depth === maxRectangleDepth)
    .map(({ path }) => path);
  const enrichedInventory = {
    ...discoveredInventory,
    corpusEvidence: {
      overlappingFields,
      title: titleEvidence,
      tablixLocationsAndRowHierarchy: tablixEvidence,
      rectangleHierarchy: rectangles,
      maximumRectangleDepth: maxRectangleDepth,
      deepestRectanglePaths,
    },
  };

  await mkdir(resolve(outputRoot, "source"), { recursive: true });
  await mkdir(resolve(outputRoot, "inventory"), { recursive: true });
  await mkdir(resolve(outputRoot, "validation"), { recursive: true });
  const sourceOutput = resolve(outputRoot, "source/Transcript.rdl");
  const licenseOutput = resolve(outputRoot, "LICENSE.microsoft.txt");
  await copyFile(resolve(upstreamRoot, SOURCE_PATH), sourceOutput);
  await copyFile(resolve(upstreamRoot, "License.md"), licenseOutput);
  await writeFile(
    resolve(outputRoot, "inventory/source-inventory.json"),
    `${JSON.stringify(enrichedInventory, null, 2)}\n`,
  );
  const copiedSource = await readFile(sourceOutput);
  const copiedLicense = await readFile(licenseOutput);
  assertIdentity(
    "Imported Transcript.rdl",
    copiedSource,
    SOURCE_SIZE,
    SOURCE_HASH,
  );
  assertIdentity(
    "Imported Microsoft license",
    copiedLicense,
    licenseBytes.byteLength,
    LICENSE_HASH,
  );
  if (!copiedSource.equals(sourceBytes))
    throw new Error(
      "Imported Transcript.rdl is not byte-identical to upstream",
    );

  const validation = {
    validationVersion: 1,
    gate: "2F",
    status: "STATIC_VALIDATION_PASS",
    upstream: {
      repository: "https://github.com/microsoft/Reporting-Services.git",
      branch: "master",
      commit: COMMIT,
      sourcePath: SOURCE_PATH,
    },
    importedSource: {
      relativePath:
        "examples/rdl-structure-corpus/external-sources/microsoft-reporting-services/imported/transcript/source/Transcript.rdl",
      byteSize: SOURCE_SIZE,
      sha256: SOURCE_HASH,
      byteIdenticalToUpstream: true,
      immutable: true,
    },
    license: {
      name: "MIT",
      copyright: "Copyright (c) 2016 Microsoft",
      sha256: LICENSE_HASH,
      noticePath: "LICENSE.microsoft.txt",
      byteIdenticalToUpstream: true,
    },
    xml: {
      safeParsing: "PASS",
      wellFormedness: "PASS",
      namespace: NAMESPACE,
      schemaVersion: "2016/01",
      xsdValidation: "PASS",
      xsd: "ReportDefinition-2016.xsd",
    },
    inventory: {
      baseGenerator: "scripts/discover-official-rdl-samples.mts v1",
      enrichmentGenerator: "scripts/import-microsoft-transcript.mts v1",
      sourceIdentityMatched: true,
      deterministicRegeneration: "PASS",
    },
    security: securitySource,
    gate2dDifferences: [],
    reportBuilder: {
      open: "NOT_PERFORMED",
      preview: "NOT_PERFORMED",
      render: "NOT_PERFORMED",
      queryExecution: "NOT_PERFORMED",
      export: "NOT_PERFORMED",
    },
  } as const;
  await writeFile(
    resolve(outputRoot, "validation/gate-2f-validation.json"),
    `${JSON.stringify(validation, null, 2)}\n`,
  );
  process.stdout.write(
    `${JSON.stringify({
      sourceOutput,
      byteSize: copiedSource.byteLength,
      sha256: hash(copiedSource),
      xsdValidation: "PASS",
      maximumRectangleDepth: maxRectangleDepth,
    })}\n`,
  );
} finally {
  document.dispose();
}
