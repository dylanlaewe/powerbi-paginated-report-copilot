import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  catalogRdlBytes,
  classifyTextboxValue,
  targetCandidateCatalogSchema,
} from "./target-context";

const root = resolve(import.meta.dirname, "../../..");
const paths = {
  simple: resolve(
    root,
    "examples/rdl-structure-corpus/simple-table/source/synthetic-inventory-detail.rdl",
  ),
  grouped: resolve(
    root,
    "examples/rdl-structure-corpus/grouped-report/source/synthetic-department-sales.rdl",
  ),
  invoice: resolve(
    root,
    "examples/rdl-structure-corpus/external-sources/microsoft-reporting-services/imported/invoice/source/Invoice.rdl",
  ),
  transcript: resolve(
    root,
    "examples/rdl-structure-corpus/external-sources/microsoft-reporting-services/imported/transcript/source/Transcript.rdl",
  ),
} as const;
const hashes = {
  simple: "e3a34afe7c29c9f773098d9f5bfd65ad2cf60219f78999d46a447250bb2448e3",
  grouped: "03c7a6eacd6b003aeaace0264a361267ce208de6388420f0d465608f3540174b",
  invoice: "6251f6b9f76618dd5c2f9accc614b9e198fc221d2310a39508f6ac4897d53fdc",
  transcript:
    "9693231c79853b0881d0414f1c98242c76216efc00784b3bc81acc69430b2e81",
} as const;
const catalog = async (key: keyof typeof paths) =>
  catalogRdlBytes(await readFile(paths[key]));

describe("read-only structural target context", () => {
  it("classifies expressions without executing Visual Basic", () => {
    expect(classifyTextboxValue("Heading")).toEqual({
      kind: "staticText",
      text: "Heading",
    });
    expect(classifyTextboxValue('="Safe ""Title"""')).toEqual({
      kind: "constantStringExpression",
      expression: '="Safe ""Title"""',
      text: 'Safe "Title"',
    });
    expect(classifyTextboxValue("=Fields!Revenue.Value")).toMatchObject({
      kind: "directFieldReference",
      fieldName: "Revenue",
    });
    expect(
      classifyTextboxValue('=Sum(Fields!Revenue.Value, "Department")'),
    ).toMatchObject({
      kind: "aggregateExpression",
      functionName: "Sum",
      fieldName: "Revenue",
      explicitScope: "Department",
    });
    expect(classifyTextboxValue("=Parameters!Region.Value")).toMatchObject({
      kind: "parameterExpression",
    });
    expect(classifyTextboxValue("=Globals!PageNumber")).toMatchObject({
      kind: "reportGlobalExpression",
    });
    expect(classifyTextboxValue("=Code.DangerousSideEffect()")).toMatchObject({
      kind: "codeExpression",
    });
    expect(classifyTextboxValue('=Fields!Name.Value & " text"')).toMatchObject({
      kind: "compoundExpression",
    });
  });

  it("preserves the simple-table title conflict and UnitCost detail context", async () => {
    const result = await catalog("simple");
    expect(
      result.titleCandidates
        .filter(({ reportItemName }) =>
          ["ReportTitle", "Textbox9"].includes(reportItemName),
        )
        .map(({ reportItemName, visibleText, location }) => ({
          reportItemName,
          visibleText,
          region: location.region,
        })),
    ).toEqual([
      {
        reportItemName: "ReportTitle",
        visibleText: "InventoryReportTitle",
        region: "body",
      },
      {
        reportItemName: "Textbox9",
        visibleText: "Synthetic Inventory Detail",
        region: "body",
      },
    ]);
    const cost = result.fieldDisplayCandidates.find(
      ({ reportItemName }) => reportItemName === "DetailUnitCose",
    );
    expect(cost).toMatchObject({
      expression: {
        kind: "directFieldReference",
        fieldName: "UnitCost",
      },
      fieldIdentity: {
        certainty: "certain",
        datasetName: "InventoryData",
      },
      scope: { role: "detail" },
      currentFormat: "'$'0.00;('$'0.00)",
      location: {
        tablixName: "InventoryTable",
        rowMemberPath: ["rowMember[1]"],
        columnMemberPath: ["columnMember[3]"],
      },
    });
    expect(
      result.fieldDisplayCandidates.some(
        ({ reportItemName }) => reportItemName === "Textbox4",
      ),
    ).toBe(false);
    expect(
      result.titleCandidates.find(
        ({ reportItemName }) => reportItemName === "Textbox4",
      )?.scope.role,
    ).toBe("staticHeader");
  });

  it("keeps grouped Revenue detail, subtotal, and Grand Total distinct", async () => {
    const result = await catalog("grouped");
    expect(
      result.titleCandidates.find(
        ({ reportItemName }) => reportItemName === "ReportTitle",
      ),
    ).toMatchObject({
      visibleText: "Synthetic Department Sales Summary",
      fontSizes: ["18pt"],
      fontWeights: ["Bold"],
    });
    const revenue = result.fieldDisplayCandidates
      .filter(
        ({ expression }) =>
          "fieldName" in expression && expression.fieldName === "Revenue",
      )
      .map(({ reportItemName, expression, scope, location }) => ({
        reportItemName,
        kind: expression.kind,
        role: scope.role,
        groups: location.groupNames,
      }));
    expect(revenue).toEqual([
      {
        reportItemName: "DetailRevenue",
        kind: "directFieldReference",
        role: "detail",
        groups: ["Department", "Details"],
      },
      {
        reportItemName: "DepartmentRevenueSubtotal",
        kind: "aggregateExpression",
        role: "groupSubtotal",
        groups: ["Department"],
      },
      {
        reportItemName: "ReportRevenueTotal",
        kind: "aggregateExpression",
        role: "grandTotal",
        groups: [],
      },
    ]);
    expect(
      result.fieldDisplayCandidates.find(
        ({ reportItemName }) => reportItemName === "DetailRevenue",
      )?.location.memberKinds,
    ).toEqual(["dynamic", "static", "dynamic"]);
    expect(
      result.titleCandidates.find(
        ({ visibleText }) => visibleText === "Revenue",
      )?.scope.role,
    ).toBe("staticHeader");
    expect(
      result.fieldDisplayCandidates.find(
        ({ reportItemName }) => reportItemName === "Department",
      )?.scope.role,
    ).toBe("groupHeader");
  });

  it("preserves Invoice overlaps, visibility, and same-field locations", async () => {
    const result = await catalog("invoice");
    expect(result.datasetOverlaps).toEqual(
      expect.arrayContaining([
        {
          fieldName: "Company",
          datasetNames: [
            "CompanyList",
            "SalesInvoiceDS",
            "SalesInvoiceHeaderFooterDS",
          ],
        },
        { fieldName: "Name", datasetNames: ["Company", "Users"] },
      ]),
    );
    for (const fieldName of ["Amount", "Discount"]) {
      const candidates = result.fieldDisplayCandidates.filter(
        ({ expression }) =>
          "fieldName" in expression && expression.fieldName === fieldName,
      );
      expect(candidates).toHaveLength(2);
      expect(
        new Set(candidates.map(({ location }) => location.structuralPath)).size,
      ).toBe(2);
      expect(
        candidates.every(({ sameFieldLocations }) => sameFieldLocations === 2),
      ).toBe(true);
    }
    expect(
      result.titleCandidates.some(
        ({ location }) =>
          location.hidden.status !== "unspecified" ||
          location.rectangleAncestry.length > 0,
      ),
    ).toBe(true);
    expect(
      result.titleCandidates.some(
        ({ location }) => location.region === "pageFooter",
      ),
    ).toBe(true);
  });

  it("finds the Transcript page-header title and nested structures", async () => {
    const result = await catalog("transcript");
    expect(
      result.titleCandidates.find(
        ({ reportItemName }) => reportItemName === "Textbox1",
      ),
    ).toMatchObject({
      visibleText: "Contoso Professional Certified Transcript",
      expression: { kind: "constantStringExpression" },
      fontSizes: ["22pt"],
      fontWeights: ["Bold"],
      textAlignments: ["Left"],
      location: { region: "pageHeader" },
    });
    expect(result.titleCandidates.length).toBeGreaterThan(1);
    expect(
      result.fieldDisplayCandidates.some(({ location }) =>
        location.containerChain
          .join("/")
          .includes("Tablix(Tablix1)/Rectangle(Rectangle9)/Tablix(Tablix2)"),
      ),
    ).toBe(true);
    expect(
      result.fieldDisplayCandidates.some(({ location }) =>
        location.containerChain
          .join("/")
          .includes("Tablix(Tablix1)/Rectangle(Rectangle19)/Tablix(Tablix6)"),
      ),
    ).toBe(true);
    expect(
      result.titleCandidates.some(
        ({ location }) =>
          location.rectangleAncestry.join("/") ===
          "Rectangle2/Rectangle5/Rectangle6",
      ),
    ).toBe(true);
    expect(result.datasetOverlaps).toContainEqual({
      fieldName: "Name",
      datasetNames: ["Certification", "Users"],
    });
    const names = result.fieldDisplayCandidates.filter(
      ({ expression }) =>
        "fieldName" in expression && expression.fieldName === "Name",
    );
    expect(names.map(({ fieldIdentity }) => fieldIdentity.certainty)).toEqual(
      expect.arrayContaining(["certain"]),
    );
  });

  it("represents an unbound same-named field as dataset-ambiguous", async () => {
    const source = Buffer.from(
      `<?xml version="1.0"?><Report xmlns="http://schemas.microsoft.com/sqlserver/reporting/2016/01/reportdefinition"><DataSets><DataSet Name="One"><Fields><Field Name="Name"><DataField>Name</DataField></Field></Fields></DataSet><DataSet Name="Two"><Fields><Field Name="Name"><DataField>Name</DataField></Field></Fields></DataSet></DataSets><ReportSections><ReportSection><Body><ReportItems><Textbox Name="UnboundName"><Paragraphs><Paragraph><TextRuns><TextRun><Value>=Fields!Name.Value</Value><Style /></TextRun></TextRuns><Style /></Paragraph></Paragraphs><Style /></Textbox></ReportItems></Body><Width>7in</Width><Page /></ReportSection></ReportSections></Report>`,
    );
    const result = await catalogRdlBytes(source);
    expect(result.fieldDisplayCandidates[0]?.fieldIdentity).toEqual({
      certainty: "ambiguous",
      fieldName: "Name",
      possibleDatasets: ["One", "Two"],
      uniqueAcrossReport: false,
    });
  });

  it("is deterministic, runtime strict, and never authorizes mutation", async () => {
    const source = await readFile(paths.grouped);
    const first = await catalogRdlBytes(source);
    const second = await catalogRdlBytes(source);
    expect(second).toEqual(first);
    expect(first.selectedTarget).toBeNull();
    expect(first.mutationAuthorized).toBe(false);
    expect(
      first.titleCandidates.map(({ diagnosticId }) => diagnosticId),
    ).toEqual(
      (await catalogRdlBytes(source)).titleCandidates.map(
        ({ diagnosticId }) => diagnosticId,
      ),
    );
    const invalid = structuredClone(first);
    Object.assign(invalid.fieldDisplayCandidates[0]!.expression, {
      kind: "staticText",
      text: "invalid",
    });
    expect(() => targetCandidateCatalogSchema.parse(invalid)).toThrow();
  });

  it.each(Object.keys(paths) as (keyof typeof paths)[])(
    "keeps %s byte-identical during discovery",
    async (key) => {
      const before = await readFile(paths[key]);
      await catalogRdlBytes(before);
      expect(await readFile(paths[key])).toEqual(before);
      expect(createHash("sha256").update(before).digest("hex")).toBe(
        hashes[key],
      );
    },
  );

  it("contains no corpus checksum mutation mapping", async () => {
    const mutationSources = await Promise.all(
      ["inspection.ts", "mutation.ts", "target-context.ts"].map((name) =>
        readFile(resolve(root, "packages/rdl-copilot/src", name), "utf8"),
      ),
    );
    for (const hash of Object.values(hashes))
      expect(mutationSources.join("\n")).not.toContain(hash);
  });
});
