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
const fixtureRoot = resolve(discoveryRoot, "imported/invoice");
const sourcePath = resolve(fixtureRoot, "source/Invoice.rdl");
const sourceHash =
  "6251f6b9f76618dd5c2f9accc614b9e198fc221d2310a39508f6ac4897d53fdc";
const namespace =
  "http://schemas.microsoft.com/sqlserver/reporting/2016/01/reportdefinition";
const hash = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex");

async function json(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
}

describe("Gate 2E pinned Microsoft Invoice fixture", () => {
  it("preserves the exact source identity and validates safely", async () => {
    const before = await readFile(sourcePath);
    expect(before).toHaveLength(222_297);
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

  it("keeps the imported inventory deterministic and structurally complete", async () => {
    const imported = await readFile(
      resolve(fixtureRoot, "inventory/source-inventory.json"),
    );
    const discovered = await readFile(
      resolve(discoveryRoot, "inventories/Invoice.inventory.json"),
    );
    expect(imported).toEqual(discovered);
    const inventory = JSON.parse(imported.toString("utf8")) as {
      source: { sha256: string };
      xml: { namespace: string; designer: Record<string, unknown> };
      datasets: Array<{
        name: string;
        fields: Array<{ name: string }>;
        filters: unknown[];
      }>;
      parameters: Array<Record<string, unknown>>;
      tablixes: unknown[];
      expressions: { aggregateExpressions: unknown[] };
      reportItems: {
        textboxes: Array<{ container: string }>;
        rectangles: unknown[];
        images: Array<Record<string, unknown>>;
        subreports: unknown[];
      };
      layout: { repeatOnNewPageCount: number };
    };
    expect(inventory.source.sha256).toBe(sourceHash);
    expect(inventory.xml.namespace).toBe(namespace);
    expect(inventory.xml.designer).toEqual({
      name: null,
      version: null,
      reportId: "8932495c-f74a-4485-b7c1-b808da812081",
    });
    expect(inventory.datasets).toHaveLength(5);
    expect(inventory.parameters).toEqual([
      expect.objectContaining({
        name: "Company",
        availableValues: {
          datasetName: "CompanyList",
          valueField: "Company",
          labelField: "Company",
          staticValueCount: 0,
        },
      }),
    ]);
    expect(
      inventory.datasets.find(({ name }) => name === "Company")?.filters,
    ).toEqual([
      {
        expression: "=Fields!Name.Value",
        operator: "Equal",
        values: ["=Parameters!Company.Value"],
      },
    ]);
    expect(inventory.tablixes).toHaveLength(3);
    expect(inventory.reportItems.rectangles).toHaveLength(9);
    expect(inventory.expressions.aggregateExpressions).toHaveLength(15);
    expect(inventory.reportItems.images).toEqual([
      { name: "Image1", source: "Embedded", value: "Contoso_LogoSmall" },
    ]);
    expect(inventory.reportItems.subreports).toEqual([]);
    expect(
      inventory.reportItems.textboxes.some(
        ({ container }) => container === "pageHeader",
      ),
    ).toBe(true);
    expect(
      inventory.reportItems.textboxes.some(
        ({ container }) => container === "pageFooter",
      ),
    ).toBe(true);
    expect(inventory.layout.repeatOnNewPageCount).toBe(1);
  });

  it("records overlapping fields and the lookup relationship", async () => {
    const inventory = await json(
      resolve(fixtureRoot, "inventory/source-inventory.json"),
    );
    const datasets = inventory.datasets as Array<{
      name: string;
      fields: Array<{ name: string }>;
    }>;
    const owners = new Map<string, string[]>();
    for (const dataset of datasets)
      for (const field of dataset.fields)
        owners.set(field.name, [
          ...(owners.get(field.name) ?? []),
          dataset.name,
        ]);
    expect(
      Object.fromEntries([...owners].filter(([, names]) => names.length > 1)),
    ).toEqual({
      Company: ["SalesInvoiceDS", "SalesInvoiceHeaderFooterDS", "CompanyList"],
      Name: ["Company", "Users"],
      Address: ["Company", "Users"],
      City: ["Company", "Users"],
      State: ["Company", "Users"],
      Country: ["Company", "Users"],
    });
  });

  it("pins attribution, upstream identity, and the static security baseline", async () => {
    const validation = await json(
      resolve(fixtureRoot, "validation/gate-2e-validation.json"),
    );
    expect(validation).toMatchObject({
      gate: "2E",
      status: "STATIC_VALIDATION_PASS",
      upstream: {
        commit: "acc2ee0d1884765e4b5213149430fb063d166719",
        sourcePath: "PaginatedReportSamples/Invoice.rdl",
      },
      importedSource: {
        byteSize: 222_297,
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
