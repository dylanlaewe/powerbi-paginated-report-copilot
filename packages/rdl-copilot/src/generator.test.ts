import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseNaturalLanguageReportRequest } from "./index";
import {
  approvedTemplateSha256,
  calculateTotals,
  generateReport,
  instantiateApprovedTemplate,
  protectedProjection,
  validateOutputPath,
} from "./generator";
import { resolveDevelopmentApprovedResources } from "./approved-resources";
import { createHash } from "node:crypto";

const directories: string[] = [];
const resources = resolveDevelopmentApprovedResources([import.meta.dirname]);
const request = `Create a report titled "Safe & <Visible>" using the production pagination template with data: [
{"SaleDate":"2026-08-01","Region":"Central","Salesperson":"A & B","Customer":"Clinic <One>","Product":"Desk","Category":"Furniture","Quantity":2,"Revenue":100,"GrossProfit":40},
{"SaleDate":"2026-08-02","Region":"West","Salesperson":"Casey","Customer":"Studio","Product":"Tablet","Category":"Technology","Quantity":3,"Revenue":250,"GrossProfit":90}
]`;

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((path) => rm(path, { recursive: true })),
  );
});

describe("approved RDL template instantiation", () => {
  it("preserves protected structure, escapes data, and computes totals", async () => {
    const template = await readFile(resources.templatePath, "utf8");
    const specification = parseNaturalLanguageReportRequest(request);
    const report = instantiateApprovedTemplate(template, specification);
    expect(report).not.toBe(template);
    expect(protectedProjection(report)).toBe(protectedProjection(template));
    expect(report).toContain("Safe &amp; &lt;Visible&gt;");
    expect(report).not.toContain("Clinic <One>");
    expect(calculateTotals(specification.rows)).toEqual({
      regions: {
        Central: { Quantity: 2, Revenue: 100, GrossProfit: 40 },
        West: { Quantity: 3, Revenue: 250, GrossProfit: 90 },
      },
      grandTotal: { Quantity: 5, Revenue: 350, GrossProfit: 130 },
    });
    expect(createHash("sha256").update(template).digest("hex")).toBe(
      approvedTemplateSha256,
    );
  });

  it("is deterministic and writes a validated manifest", async () => {
    const specification = parseNaturalLanguageReportRequest(request);
    const directory = await mkdtemp(join(tmpdir(), "rdl-copilot-"));
    directories.push(directory);
    const first = await generateReport(
      specification,
      join(directory, "first.rdl"),
      resources,
    );
    const second = await generateReport(
      specification,
      join(directory, "second.rdl"),
      resources,
    );
    expect(await readFile(first.reportPath)).toEqual(
      await readFile(second.reportPath),
    );
    expect(first.manifest.reportSha256).toBe(second.manifest.reportSha256);
    expect(first.manifest.validation).toEqual({
      xmlWellFormed: "PASS",
      xsd: "PASS",
      xsdEngine: "libxml2-wasm",
      protectedStructure: "PASS",
      titleMatchesSpecification: "PASS",
      embeddedRowsMatchSpecification: "PASS",
      aggregateScopesPreserved: "PASS",
      explicitLetterPage: "PASS",
    });
  });

  it("rejects duplicate keys, non-finite numbers, and path traversal", () => {
    expect(() =>
      parseNaturalLanguageReportRequest(
        'Create a report titled "Bad" using the production pagination template with data: [{"SaleDate":"2026-01-01","SaleDate":"2026-02-01"}]',
      ),
    ).toThrow("Duplicate JSON key");
    expect(() =>
      parseNaturalLanguageReportRequest(
        request.replace('"Revenue":100', '"Revenue":1e999'),
      ),
    ).toThrow();
    expect(() => validateOutputPath("/tmp/safe/../escape.rdl")).toThrow(
      "without traversal",
    );
  });
});
