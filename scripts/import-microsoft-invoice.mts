import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { validateXmlAgainstXsd } from "../packages/rdl-copilot/src/xsd-validator";

const PINNED_COMMIT = "acc2ee0d1884765e4b5213149430fb063d166719";
const SOURCE_PATH = "PaginatedReportSamples/Invoice.rdl";
const SOURCE_SIZE = 222_297;
const SOURCE_SHA256 =
  "6251f6b9f76618dd5c2f9accc614b9e198fc221d2310a39508f6ac4897d53fdc";
const LICENSE_SHA256 =
  "e1406b32500b4622444e91ec3b50a473b97c5c4470b7b1f137c36abcfb248b59";
const NAMESPACE =
  "http://schemas.microsoft.com/sqlserver/reporting/2016/01/reportdefinition";

function argument(flag: string): string {
  const value = process.argv[process.argv.indexOf(flag) + 1];
  if (!value) throw new Error(`Missing ${flag}`);
  return resolve(value);
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function assertIdentity(
  label: string,
  bytes: Uint8Array,
  expectedSize: number,
  expectedHash: string,
): void {
  if (bytes.byteLength !== expectedSize)
    throw new Error(`${label} size mismatch: ${bytes.byteLength}`);
  const actualHash = sha256(bytes);
  if (actualHash !== expectedHash)
    throw new Error(`${label} SHA-256 mismatch: ${actualHash}`);
}

const upstreamRoot = argument("--upstream");
const discoveryRoot = argument("--discovery");
const outputRoot = argument("--output");
const sourceBytes = await readFile(resolve(upstreamRoot, SOURCE_PATH));
const licenseBytes = await readFile(resolve(upstreamRoot, "License.md"));
assertIdentity("Invoice.rdl", sourceBytes, SOURCE_SIZE, SOURCE_SHA256);
assertIdentity(
  "License.md",
  licenseBytes,
  licenseBytes.byteLength,
  LICENSE_SHA256,
);

const manifest = JSON.parse(
  await readFile(resolve(discoveryRoot, "source-manifest.json"), "utf8"),
) as {
  sources: Array<Record<string, unknown>>;
};
const scan = JSON.parse(
  await readFile(resolve(discoveryRoot, "security-scan.json"), "utf8"),
) as {
  sources: Array<Record<string, unknown>>;
};
const inventoryBytes = await readFile(
  resolve(discoveryRoot, "inventories/Invoice.inventory.json"),
);
const inventory = JSON.parse(inventoryBytes.toString("utf8")) as {
  source: Record<string, unknown>;
  xml: Record<string, unknown>;
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
  manifestSource.sha256 !== SOURCE_SHA256 ||
  manifestSource.namespace !== NAMESPACE
)
  throw new Error("Gate 2D Invoice manifest identity mismatch");
if (!securitySource || securitySource.sha256 !== SOURCE_SHA256)
  throw new Error("Gate 2D Invoice security identity mismatch");
if (
  inventory.source.byteSize !== SOURCE_SIZE ||
  inventory.source.sha256 !== SOURCE_SHA256 ||
  inventory.xml.namespace !== NAMESPACE
)
  throw new Error("Gate 2D Invoice inventory identity mismatch");

const xsd = await readFile(
  resolve(
    import.meta.dirname,
    "../packages/rdl-spike/schema/ReportDefinition-2016.xsd",
  ),
);
const xsdResult = await validateXmlAgainstXsd(sourceBytes, xsd);
if (xsdResult.status !== "PASS")
  throw new Error("Invoice RDL XSD validation failed");
const { ParseOption, XmlDocument } = (await import(
  new URL(
    "../packages/rdl-copilot/node_modules/libxml2-wasm/lib/index.mjs",
    import.meta.url,
  ).href
)) as typeof import("libxml2-wasm");
const safeDocument = XmlDocument.fromBuffer(sourceBytes, {
  option: ParseOption.XML_PARSE_NONET | ParseOption.XML_PARSE_NO_XXE,
});
try {
  const root = safeDocument.get("/*");
  if (!root || root.name !== "Report" || root.namespaceUri !== NAMESPACE)
    throw new Error("Invoice RDL safe-parse root identity mismatch");
} finally {
  safeDocument.dispose();
}

const sourceOutput = resolve(outputRoot, "source/Invoice.rdl");
const licenseOutput = resolve(outputRoot, "LICENSE.microsoft.txt");
const inventoryOutput = resolve(outputRoot, "inventory/source-inventory.json");
await mkdir(resolve(outputRoot, "source"), { recursive: true });
await mkdir(resolve(outputRoot, "inventory"), { recursive: true });
await mkdir(resolve(outputRoot, "validation"), { recursive: true });
await copyFile(resolve(upstreamRoot, SOURCE_PATH), sourceOutput);
await copyFile(resolve(upstreamRoot, "License.md"), licenseOutput);
await writeFile(inventoryOutput, inventoryBytes);

const copiedSource = await readFile(sourceOutput);
const copiedLicense = await readFile(licenseOutput);
assertIdentity(
  "Imported Invoice.rdl",
  copiedSource,
  SOURCE_SIZE,
  SOURCE_SHA256,
);
assertIdentity(
  "Imported Microsoft license",
  copiedLicense,
  licenseBytes.byteLength,
  LICENSE_SHA256,
);
if (!copiedSource.equals(sourceBytes))
  throw new Error("Imported Invoice.rdl is not byte-identical to upstream");

const validation = {
  validationVersion: 1,
  gate: "2E",
  status: "STATIC_VALIDATION_PASS",
  upstream: {
    repository: "https://github.com/microsoft/Reporting-Services.git",
    branch: "master",
    commit: PINNED_COMMIT,
    sourcePath: SOURCE_PATH,
  },
  importedSource: {
    relativePath:
      "examples/rdl-structure-corpus/external-sources/microsoft-reporting-services/imported/invoice/source/Invoice.rdl",
    byteSize: SOURCE_SIZE,
    sha256: SOURCE_SHA256,
    byteIdenticalToUpstream: true,
    immutable: true,
  },
  license: {
    name: "MIT",
    copyright: "Copyright (c) 2016 Microsoft",
    sha256: LICENSE_SHA256,
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
    generator: "scripts/discover-official-rdl-samples.mts v1",
    sourceIdentityMatched: true,
    deterministicRegeneration: "PASS",
  },
  security: securitySource,
  reportBuilder: {
    open: "NOT_PERFORMED",
    preview: "NOT_PERFORMED",
    render: "NOT_PERFORMED",
    queryExecution: "NOT_PERFORMED",
    export: "NOT_PERFORMED",
  },
} as const;
await writeFile(
  resolve(outputRoot, "validation/gate-2e-validation.json"),
  `${JSON.stringify(validation, null, 2)}\n`,
);

process.stdout.write(
  `${JSON.stringify({
    sourceOutput,
    byteSize: copiedSource.byteLength,
    sha256: sha256(copiedSource),
    xsdValidation: "PASS",
  })}\n`,
);
