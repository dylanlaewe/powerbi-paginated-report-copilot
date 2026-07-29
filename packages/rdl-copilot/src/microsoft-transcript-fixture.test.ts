import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ParseOption, XmlDocument, type XmlElement } from "libxml2-wasm";
import { describe, expect, it } from "vitest";
import { validateXmlAgainstXsd } from "./xsd-validator";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const discoveryRoot = resolve(
  repositoryRoot,
  "examples/rdl-structure-corpus/external-sources/microsoft-reporting-services",
);
const fixtureRoot = resolve(discoveryRoot, "imported/transcript");
const sourcePath = resolve(fixtureRoot, "source/Transcript.rdl");
const sourceHash =
  "9693231c79853b0881d0414f1c98242c76216efc00784b3bc81acc69430b2e81";
const namespace =
  "http://schemas.microsoft.com/sqlserver/reporting/2016/01/reportdefinition";
const hash = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex");

async function loadInventory() {
  return JSON.parse(
    await readFile(
      resolve(fixtureRoot, "inventory/source-inventory.json"),
      "utf8",
    ),
  ) as {
    source: { byteSize: number; sha256: string };
    xml: { namespace: string; designer: Record<string, unknown> };
    datasets: Array<{ name: string; fields: Array<{ name: string }> }>;
    parameters: unknown[];
    tablixes: Array<Record<string, unknown>>;
    expressions: {
      aggregateExpressions: unknown[];
      sortExpressions: unknown[];
    };
    reportItems: {
      rectangles: unknown[];
      images: Array<Record<string, unknown>>;
      subreports: unknown[];
      pageHeaders: number;
      pageFooters: number;
    };
    layout: Record<string, unknown>;
    corpusEvidence: {
      overlappingFields: unknown[];
      title: Record<string, unknown>;
      tablixLocationsAndRowHierarchy: Array<Record<string, unknown>>;
      rectangleHierarchy: Array<Record<string, unknown>>;
      maximumRectangleDepth: number;
      deepestRectanglePaths: string[][];
    };
  };
}

describe("Gate 2F pinned Microsoft Transcript fixture", () => {
  it("preserves exact source identity and validates safely", async () => {
    const before = await readFile(sourcePath);
    expect(before).toHaveLength(116_709);
    expect(hash(before)).toBe(sourceHash);
    const document = XmlDocument.fromBuffer(before, {
      option: ParseOption.XML_PARSE_NONET | ParseOption.XML_PARSE_NO_XXE,
    });
    try {
      const root = document.get("/*") as XmlElement | null;
      expect(root?.name).toBe("Report");
      expect(root?.namespaceUri).toBe(namespace);
    } finally {
      document.dispose();
    }
    await expect(
      validateXmlAgainstXsd(
        before,
        await readFile(
          resolve(
            repositoryRoot,
            "packages/rdl-spike/schema/ReportDefinition-2016.xsd",
          ),
        ),
      ),
    ).resolves.toMatchObject({ status: "PASS" });
    expect(await readFile(sourcePath)).toEqual(before);
  });

  it("records datasets, overlap, and the complete three-tablix hierarchy", async () => {
    const inventory = await loadInventory();
    expect(inventory.source).toEqual({
      relativePath: "PaginatedReportSamples/Transcript.rdl",
      fileName: "Transcript.rdl",
      byteSize: 116_709,
      sha256: sourceHash,
    });
    expect(inventory.xml).toMatchObject({
      namespace,
      designer: {
        name: null,
        version: null,
        reportId: "52ba059c-e281-4f23-8d15-029d835c9eea",
      },
    });
    expect(inventory.datasets.map(({ name }) => name)).toEqual([
      "Users",
      "Certification",
    ]);
    expect(inventory.parameters).toEqual([]);
    expect(inventory.corpusEvidence.overlappingFields).toEqual([
      { name: "Name", datasets: ["Users", "Certification"] },
    ]);
    expect(inventory.tablixes).toHaveLength(3);
    expect(
      inventory.tablixes.map(({ name, datasetName, body }) => ({
        name,
        datasetName,
        body,
      })),
    ).toEqual([
      {
        name: "Tablix1",
        datasetName: "Certification",
        body: { columns: 1, rows: 6 },
      },
      {
        name: "Tablix2",
        datasetName: "Certification",
        body: { columns: 4, rows: 3 },
      },
      {
        name: "Tablix6",
        datasetName: "Certification",
        body: { columns: 3, rows: 2 },
      },
    ]);
    const locations = inventory.corpusEvidence
      .tablixLocationsAndRowHierarchy as Array<{
      name: string;
      rectanglePath: string[];
      parentTablix: string | null;
      rowMembers: Array<Record<string, unknown>>;
    }>;
    expect(
      locations.map(({ name, rectanglePath, parentTablix }) => ({
        name,
        rectanglePath,
        parentTablix,
      })),
    ).toEqual([
      { name: "Tablix1", rectanglePath: [], parentTablix: null },
      {
        name: "Tablix2",
        rectanglePath: ["Rectangle9"],
        parentTablix: "Tablix1",
      },
      {
        name: "Tablix6",
        rectanglePath: ["Rectangle19"],
        parentTablix: "Tablix1",
      },
    ]);
    expect(
      locations.find(({ name }) => name === "Tablix2")?.rowMembers,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ depth: 0, groupName: "Name" }),
        expect.objectContaining({
          depth: 1,
          parentGroup: "Name",
          groupName: "Details",
        }),
        expect.objectContaining({ depth: 2, parentGroup: "Details" }),
      ]),
    );
  });

  it("pins the page-header title and depth-two rectangle structure", async () => {
    const inventory = await loadInventory();
    expect(inventory.corpusEvidence.title).toEqual({
      reportItemName: "Textbox1",
      location: "pageHeader",
      value: '="Contoso Professional Certified Transcript"',
      fontSize: "22pt",
      fontWeight: "Bold",
      textAlign: "Left",
      width: "8.48in",
      ambiguity: [
        "Textbox233 and Textbox234 are prominent 14pt Bold section captions in body tablixes",
        "Textbox34 and Textbox36 are 4mm Bold page-header labels",
      ],
    });
    expect(inventory.reportItems.pageHeaders).toBe(1);
    expect(inventory.reportItems.pageFooters).toBe(1);
    expect(inventory.corpusEvidence.maximumRectangleDepth).toBe(2);
    expect(inventory.corpusEvidence.deepestRectanglePaths).toEqual([
      ["Rectangle2", "Rectangle5", "Rectangle6"],
    ]);
    expect(inventory.corpusEvidence.rectangleHierarchy).toContainEqual(
      expect.objectContaining({
        name: "Rectangle6",
        parentRectangle: "Rectangle5",
        depth: 2,
      }),
    );
    expect(inventory.reportItems.rectangles).toHaveLength(8);
    expect(inventory.reportItems.images).toEqual([
      { name: "Image5", source: "Embedded", value: "Line" },
      {
        name: "Image6",
        source: "Embedded",
        value: "Contoso_LogoSmall",
      },
    ]);
    expect(inventory.reportItems.subreports).toEqual([]);
  });

  it("pins attribution, security, and deterministic validation evidence", async () => {
    const validation = JSON.parse(
      await readFile(
        resolve(fixtureRoot, "validation/gate-2f-validation.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;
    expect(validation).toMatchObject({
      gate: "2F",
      status: "STATIC_VALIDATION_PASS",
      upstream: {
        commit: "acc2ee0d1884765e4b5213149430fb063d166719",
        sourcePath: "PaginatedReportSamples/Transcript.rdl",
      },
      importedSource: {
        byteSize: 116_709,
        sha256: sourceHash,
        byteIdenticalToUpstream: true,
        immutable: true,
      },
      license: {
        name: "MIT",
        copyright: "Copyright (c) 2016 Microsoft",
        sha256:
          "e1406b32500b4622444e91ec3b50a473b97c5c4470b7b1f137c36abcfb248b59",
      },
      gate2dDifferences: [],
      reportBuilder: {
        open: "NOT_PERFORMED",
        preview: "NOT_PERFORMED",
        queryExecution: "NOT_PERFORMED",
      },
    });
    const security = validation.security as {
      findings: Record<string, string>;
    };
    expect(security.findings).toMatchObject({
      embeddedCode: "absent",
      customAssemblyReferences: "absent",
      externalImages: "absent",
      embeddedImages: "present and expected",
      subreports: "absent",
      sharedDataSourceReferences: "absent",
      sharedDatasetReferences: "absent",
      connectionStrings: "absent",
      credentialProperties: "absent",
      datasetQueryText: "present and expected",
      urlOrHttpSources: "absent",
      filePaths: "absent",
      unusualNamespaces: "absent",
    });
    expect(
      hash(await readFile(resolve(fixtureRoot, "LICENSE.microsoft.txt"))),
    ).toBe("e1406b32500b4622444e91ec3b50a473b97c5c4470b7b1f137c36abcfb248b59");
    expect(await readFile(resolve(fixtureRoot, "README.md"), "utf8")).toContain(
      "Copyright (c) 2016 Microsoft",
    );
  });
});
