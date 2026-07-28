import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const corpusRoot = resolve(repositoryRoot, "examples/rdl-structure-corpus");
const discoveryRoot = resolve(
  corpusRoot,
  "external-sources/microsoft-reporting-services",
);
const expectedSources = [
  [
    "PaginatedReportSamples/CountrySalesPerformance.rdl",
    558_507,
    "2af53ac0aaad8d7078e7e05d2f2e3679fbf3010c308526368ad1a67eb13dc6a4",
  ],
  [
    "PaginatedReportSamples/Invoice.rdl",
    222_297,
    "6251f6b9f76618dd5c2f9accc614b9e198fc221d2310a39508f6ac4897d53fdc",
  ],
  [
    "PaginatedReportSamples/Labels.rdl",
    121_433,
    "d6f2f0580357efe676dd3b490ed982d5fbddd0a99e059e24fb8df10e014cbd6c",
  ],
  [
    "PaginatedReportSamples/Letter.rdl",
    402_292,
    "65c0a4c835954f1756e435a217388276a8cf52ed2ee96763de3ddaa6a0a24815",
  ],
  [
    "PaginatedReportSamples/OrganizationExpenditures.rdl",
    111_790,
    "22a41b7a8f504795ac68c4dad094d6f9bb7aa2d95cd0a3167c457e5d2cbe43f5",
  ],
  [
    "PaginatedReportSamples/RegionalSales.rdl",
    492_869,
    "f5698ddeb06df3267322a34db6749f4e52b1e56aa0b6ad7d06a7713af768ce69",
  ],
  [
    "PaginatedReportSamples/Transcript.rdl",
    116_709,
    "9693231c79853b0881d0414f1c98242c76216efc00784b3bc81acc69430b2e81",
  ],
] as const;

async function loadJson(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
}

describe("RDL Structure Corpus Gate 2D external discovery", () => {
  it("pins the official source and all seven byte identities", async () => {
    const upstream = await loadJson(resolve(discoveryRoot, "upstream.json"));
    const manifest = await loadJson(
      resolve(discoveryRoot, "source-manifest.json"),
    );
    expect(upstream).toMatchObject({
      repositoryUrl: "https://github.com/microsoft/Reporting-Services.git",
      branch: "master",
      commit: "acc2ee0d1884765e4b5213149430fb063d166719",
      licenseSha256:
        "e1406b32500b4622444e91ec3b50a473b97c5c4470b7b1f137c36abcfb248b59",
    });
    expect(manifest.sourceCount).toBe(7);
    expect(
      (manifest.sources as Array<Record<string, unknown>>).map((source) => [
        source.relativePath,
        source.byteSize,
        source.sha256,
      ]),
    ).toEqual(expectedSources);
  });

  it("records one linked, valid inventory for every source", async () => {
    const manifest = await loadJson(
      resolve(discoveryRoot, "source-manifest.json"),
    );
    for (const source of manifest.sources as Array<Record<string, unknown>>) {
      expect(source).toMatchObject({
        namespace:
          "http://schemas.microsoft.com/sqlserver/reporting/2016/01/reportdefinition",
        likelySchemaVersion: "2016/01",
        xmlWellFormedness: "PASS",
        xsdValidation: { status: "PASS", schema: "ReportDefinition-2016.xsd" },
      });
      const inventory = await loadJson(
        resolve(discoveryRoot, String(source.inventoryRelativePath)),
      );
      expect(inventory.source).toMatchObject({
        relativePath: source.relativePath,
        sha256: source.sha256,
        byteSize: source.byteSize,
      });
    }
  });

  it("keeps custom-code samples under manual review and records no external resolution", async () => {
    const scan = await loadJson(resolve(discoveryRoot, "security-scan.json"));
    const sources = scan.sources as Array<Record<string, unknown>>;
    expect(
      sources
        .filter((source) => source.disposition === "requires manual review")
        .map((source) => source.relativePath),
    ).toEqual([
      "PaginatedReportSamples/CountrySalesPerformance.rdl",
      "PaginatedReportSamples/RegionalSales.rdl",
    ]);
    for (const source of sources) {
      const findings = source.findings as Record<string, string>;
      for (const key of [
        "externalImages",
        "subreports",
        "sharedDataSourceReferences",
        "sharedDatasetReferences",
        "connectionStrings",
        "urlOrHttpSources",
        "filePaths",
      ])
        expect(findings[key]).toBe("absent");
    }
  });

  it("permits only reviewed Invoice and Transcript imports and leaves paused sources empty", async () => {
    const discoveryFiles = await readdir(discoveryRoot, {
      recursive: true,
      withFileTypes: true,
    });
    expect(
      discoveryFiles
        .filter((entry) => entry.isFile() && entry.name.endsWith(".rdl"))
        .map((entry) => resolve(entry.parentPath, entry.name))
        .sort(),
    ).toEqual([
      resolve(discoveryRoot, "imported/invoice/source/Invoice.rdl"),
      resolve(discoveryRoot, "imported/transcript/source/Transcript.rdl"),
    ]);
    for (const fixture of ["parameterized-report", "alternate-layout"]) {
      const sourcePath = resolve(corpusRoot, fixture, "source");
      const entries = await readdir(sourcePath).catch((error: unknown) => {
        if (
          error instanceof Error &&
          "code" in error &&
          error.code === "ENOENT"
        )
          return [];
        throw error;
      });
      expect(entries).toEqual([]);
    }
  });
});
