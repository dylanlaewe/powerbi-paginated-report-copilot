import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertWellFormed } from "./index";
import { validateCollectionConsistency } from "./compatibility";

export const canonicalSeedPath = resolve(
  "samples/report-builder-seeds/KnownGoodEnterDataTable.rdl",
);
export const canonicalSeedSha256 =
  "dc3e3f939d0d5f0eb8242681b17c43aa49dd0455a65f4e8cad10fbe24408ab7f";
export const candidateFileName = "01-minimal-enter-data-table.rdl";
export const candidateRows = [
  { Region: "East", Revenue: "100" },
  { Region: "West", Revenue: "200" },
  { Region: "Central", Revenue: "300" },
] as const;

export const sha256 = (value: string | Buffer): string =>
  createHash("sha256").update(value).digest("hex");

const replaceExactlyOnce = (
  input: string,
  before: string,
  after: string,
  label: string,
): string => {
  const first = input.indexOf(before);
  if (first < 0 || input.indexOf(before, first + before.length) >= 0)
    throw new Error(`Canonical seed does not contain exactly one ${label}`);
  return `${input.slice(0, first)}${after}${input.slice(first + before.length)}`;
};

export const deriveCandidate01 = (seed: string): string => {
  if (sha256(seed) !== canonicalSeedSha256)
    throw new Error(
      "Canonical seed SHA-256 differs from the reviewed baseline",
    );
  let candidate = replaceExactlyOnce(
    seed,
    "<RowNumber>2</RowNumber>",
    "<RowNumber>3</RowNumber>",
    "DesignerState row count",
  );
  candidate = replaceExactlyOnce(
    candidate,
    '  <Data ColumnIndex="0" RowIndex="1">West</Data>\n  <Data ColumnIndex="1" RowIndex="1">200</Data>',
    '  <Data ColumnIndex="0" RowIndex="1">West</Data>\n  <Data ColumnIndex="1" RowIndex="1">200</Data>\n  <Data ColumnIndex="0" RowIndex="2">Central</Data>\n  <Data ColumnIndex="1" RowIndex="2">300</Data>',
    "DesignerState rows",
  );
  candidate = replaceExactlyOnce(
    candidate,
    "      &lt;Row&gt;\n        &lt;Region&gt;West&lt;/Region&gt;\n        &lt;Revenue&gt;200&lt;/Revenue&gt;\n      &lt;/Row&gt;",
    "      &lt;Row&gt;\n        &lt;Region&gt;West&lt;/Region&gt;\n        &lt;Revenue&gt;200&lt;/Revenue&gt;\n      &lt;/Row&gt;\n      &lt;Row&gt;\n        &lt;Region&gt;Central&lt;/Region&gt;\n        &lt;Revenue&gt;300&lt;/Revenue&gt;\n      &lt;/Row&gt;",
    "embedded query rows",
  );
  candidate = replaceExactlyOnce(
    candidate,
    '<Textbox Name="ReportTitle">\n            <rd:WatermarkTextbox>Title</rd:WatermarkTextbox>\n            <rd:DefaultName>ReportTitle</rd:DefaultName>\n            <CanGrow>true</CanGrow>\n            <KeepTogether>true</KeepTogether>\n            <Paragraphs>\n              <Paragraph>\n                <TextRuns>\n                  <TextRun>\n                    <Value />',
    '<Textbox Name="ReportTitle">\n            <rd:WatermarkTextbox>Title</rd:WatermarkTextbox>\n            <rd:DefaultName>ReportTitle</rd:DefaultName>\n            <CanGrow>true</CanGrow>\n            <KeepTogether>true</KeepTogether>\n            <Paragraphs>\n              <Paragraph>\n                <TextRuns>\n                  <TextRun>\n                    <Value>RDL Compatibility Test</Value>',
    "report title",
  );
  return candidate;
};

const atomicWrite = async (path: string, content: string): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, content, { flag: "wx" });
  await rename(temporary, path);
};

export const runCandidate01 = async (outputDirectory: string) => {
  const seed = await readFile(canonicalSeedPath, "utf8");
  const candidate = deriveCandidate01(seed);
  assertWellFormed(candidate);
  const consistency = validateCollectionConsistency(candidate);
  const output = resolve(outputDirectory);
  const reportPath = join(output, candidateFileName);
  await atomicWrite(reportPath, candidate);
  const schemaPath = fileURLToPath(
    new URL("../schema/ReportDefinition-2016.xsd", import.meta.url),
  );
  const xsdOutput = execFileSync(
    "xmllint",
    ["--noout", "--schema", schemaPath, reportPath],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  const manifest = {
    candidate: candidateFileName,
    candidateSha256: sha256(candidate),
    canonicalSeed: "samples/report-builder-seeds/KnownGoodEnterDataTable.rdl",
    canonicalSeedSha256,
    derivation: [
      "DesignerState RowNumber changed from 2 to 3",
      "one DesignerState Region/Revenue row appended",
      "one matching embedded query Row appended",
      "ReportTitle value set to RDL Compatibility Test",
    ],
    fields: ["Region", "Revenue"],
    rows: candidateRows,
    validation: {
      xmlWellFormedness: "PASS",
      existingXsd: "PASS",
      xsdOutput: xsdOutput || `${candidateFileName} validates`,
      collectionConsistency: "PASS",
      consistency,
      reportBuilderOpen: "PENDING_INDEPENDENT_WINDOWS",
      reportBuilderPreview: "PENDING_INDEPENDENT_WINDOWS",
    },
  };
  await atomicWrite(
    join(output, "01-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  return { reportPath, manifest, consistency };
};
