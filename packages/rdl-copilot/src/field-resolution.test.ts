import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  fieldDisplayResolutionOutcomeSchema,
  fieldDisplayResolutionRequestSchema,
  rankFieldDisplayCandidates,
  resolveReadOnlyFieldDisplay,
} from "./field-resolution";
import { catalogRdlBytes } from "./target-context";

const root = resolve(import.meta.dirname, "../../..");
const fixtures = {
  simple:
    "examples/rdl-structure-corpus/simple-table/source/synthetic-inventory-detail.rdl",
  grouped:
    "examples/rdl-structure-corpus/grouped-report/source/synthetic-department-sales.rdl",
  invoice:
    "examples/rdl-structure-corpus/external-sources/microsoft-reporting-services/imported/invoice/source/Invoice.rdl",
  transcript:
    "examples/rdl-structure-corpus/external-sources/microsoft-reporting-services/imported/transcript/source/Transcript.rdl",
} as const;
const catalog = async (key: keyof typeof fixtures) =>
  catalogRdlBytes(await readFile(resolve(root, fixtures[key])));

describe("dataset- and scope-aware read-only field resolution", () => {
  it("runtime-validates every outcome and permanently denies mutation", () => {
    const candidate = {
      candidateId: "opaque",
      reportItemName: "Item",
      structuralPath: "section[0]/body/Textbox(Item)",
      region: "body" as const,
      fieldName: "Amount",
      expressionKind: "directFieldReference" as const,
      aggregateFunction: null,
      explicitAggregateScope: null,
      datasetCertainty: "certain" as const,
      datasetName: "Data",
      possibleDatasets: ["Data"],
      tablixName: "Tablix1",
      scopeRole: "detail" as const,
      groupNames: [],
      currentFormat: "N2",
      serializedType: null,
      likelyNumericDisplay: true,
      compatibilityUnknown: true,
      hiddenStatus: "visible" as const,
      evidence: [{ code: "EXACT", message: "exact" }],
      ambiguityEvidence: [],
    };
    const outcomes = [
      {
        status: "resolved",
        reason: "FIELD_DISPLAY_RESOLVED",
        fieldName: "Amount",
        candidateId: "opaque",
        confidence: "high",
        evidence: candidate.evidence,
        alternatives: [],
        mutationAuthorized: false,
      },
      {
        status: "ambiguous",
        reason: "DUPLICATE_VISUAL_LOCATIONS",
        fieldName: "Amount",
        candidates: [candidate],
        evidence: ["explicit ambiguity"],
        mutationAuthorized: false,
      },
      {
        status: "notFound",
        reason: "NO_FIELD_DISPLAY_CANDIDATE",
        fieldName: "Missing",
        consideredCandidateCount: 0,
        mutationAuthorized: false,
      },
      {
        status: "unsupported",
        reason: "FIELD_CONTEXT_INSUFFICIENT",
        fieldName: "Amount",
        evidence: ["missing context"],
        mutationAuthorized: false,
      },
    ];
    for (const outcome of outcomes)
      expect(fieldDisplayResolutionOutcomeSchema.parse(outcome)).toEqual(
        outcome,
      );
    expect(() =>
      fieldDisplayResolutionOutcomeSchema.parse({
        ...outcomes[0],
        candidateId: undefined,
      }),
    ).toThrow();
    expect(() =>
      fieldDisplayResolutionOutcomeSchema.parse({
        ...outcomes[2],
        candidateId: "forbidden",
      }),
    ).toThrow();
    for (const outcome of outcomes)
      expect(() =>
        fieldDisplayResolutionOutcomeSchema.parse({
          ...outcome,
          mutationAuthorized: true,
        }),
      ).toThrow();
  });

  it("uses trimmed case-insensitive exact matching without fuzzy or substring matching", async () => {
    const sourceCatalog = await catalog("simple");
    expect(
      fieldDisplayResolutionRequestSchema.parse({ fieldName: "  unitcost " }),
    ).toEqual({ fieldName: "unitcost" });
    expect(
      resolveReadOnlyFieldDisplay(sourceCatalog, {
        fieldName: "  unitcost ",
      }).status,
    ).toBe("resolved");
    for (const fieldName of ["Unit", "UnitCosts", "Cost"])
      expect(
        resolveReadOnlyFieldDisplay(sourceCatalog, { fieldName }),
      ).toMatchObject({
        status: "notFound",
        reason: "NO_FIELD_DISPLAY_CANDIDATE",
      });
  });

  it("resolves simple UnitCost independently of the misspelled item name", async () => {
    const sourceCatalog = await catalog("simple");
    const result = resolveReadOnlyFieldDisplay(sourceCatalog, {
      fieldName: "UnitCost",
    });
    const candidate = rankFieldDisplayCandidates(sourceCatalog, {
      fieldName: "UnitCost",
    })[0];
    expect(result).toMatchObject({
      status: "resolved",
      reason: "FIELD_DISPLAY_RESOLVED",
      fieldName: "UnitCost",
      candidateId: candidate?.candidateId,
      confidence: "high",
      mutationAuthorized: false,
    });
    expect(candidate).toMatchObject({
      reportItemName: "DetailUnitCose",
      expressionKind: "directFieldReference",
      datasetName: "InventoryData",
      tablixName: "InventoryTable",
      scopeRole: "detail",
      currentFormat: "'$'0.00;('$'0.00)",
      serializedType: null,
      likelyNumericDisplay: true,
      compatibilityUnknown: true,
    });
    expect(
      sourceCatalog.fieldDisplayCandidates.some(
        ({ reportItemName }) => reportItemName === "Textbox4",
      ),
    ).toBe(false);
  });

  it("keeps grouped Revenue detail, subtotal, and Grand Total ambiguous", async () => {
    const sourceCatalog = await catalog("grouped");
    const result = resolveReadOnlyFieldDisplay(sourceCatalog, {
      fieldName: "Revenue",
    });
    expect(result).toMatchObject({
      status: "ambiguous",
      reason: "MULTIPLE_SCOPE_ROLES",
      mutationAuthorized: false,
    });
    if (result.status !== "ambiguous") throw new Error("Expected ambiguity");
    expect(
      result.candidates.map(({ expressionKind, scopeRole, currentFormat }) => ({
        expressionKind,
        scopeRole,
        currentFormat,
      })),
    ).toEqual([
      {
        expressionKind: "directFieldReference",
        scopeRole: "detail",
        currentFormat: "C2",
      },
      {
        expressionKind: "aggregateExpression",
        scopeRole: "groupSubtotal",
        currentFormat: "C2",
      },
      {
        expressionKind: "aggregateExpression",
        scopeRole: "grandTotal",
        currentFormat: "C2",
      },
    ]);
    expect(result.evidence).toContain(
      "field-name-only input does not define detail or total scope",
    );
  });

  it.each(["Amount", "Discount"])(
    "keeps Invoice %s locations ambiguous",
    async (fieldName) => {
      const result = resolveReadOnlyFieldDisplay(await catalog("invoice"), {
        fieldName,
      });
      expect(result).toMatchObject({
        status: "ambiguous",
        reason: "DUPLICATE_VISUAL_LOCATIONS",
      });
      if (result.status !== "ambiguous") throw new Error("Expected ambiguity");
      expect(result.candidates).toHaveLength(2);
      expect(
        new Set(result.candidates.map(({ tablixName }) => tablixName)).size,
      ).toBe(2);
      expect(
        result.candidates.every(({ ambiguityEvidence }) =>
          ambiguityEvidence.some(
            ({ code }) => code === "DUPLICATE_VISUAL_LOCATION",
          ),
        ),
      ).toBe(true);
    },
  );

  it.each([
    ["Quantity", "#,###,##0.##"],
    ["SalesPrice", "N2"],
  ])("resolves one certain Invoice %s display", async (fieldName, format) => {
    const result = resolveReadOnlyFieldDisplay(await catalog("invoice"), {
      fieldName,
    });
    expect(result).toMatchObject({
      status: "resolved",
      fieldName,
      confidence: "high",
      mutationAuthorized: false,
    });
    const candidate = rankFieldDisplayCandidates(await catalog("invoice"), {
      fieldName,
    })[0];
    expect(candidate).toMatchObject({
      datasetName: "SalesInvoiceDS",
      tablixName: "Tablix2",
      scopeRole: "detail",
      currentFormat: format,
    });
  });

  it("preserves Transcript Name dataset ambiguity and resolves Date read-only", async () => {
    const sourceCatalog = await catalog("transcript");
    const name = resolveReadOnlyFieldDisplay(sourceCatalog, {
      fieldName: "Name",
    });
    expect(name).toMatchObject({
      status: "ambiguous",
      reason: "MULTIPLE_DATASET_CANDIDATES",
      mutationAuthorized: false,
    });
    if (name.status !== "ambiguous") throw new Error("Expected ambiguity");
    expect(name.candidates[0]).toMatchObject({
      datasetName: "Certification",
      possibleDatasets: ["Certification", "Users"],
      expressionKind: "directFieldReference",
      scopeRole: "detail",
    });
    const date = resolveReadOnlyFieldDisplay(sourceCatalog, {
      fieldName: "Date",
    });
    expect(date).toMatchObject({
      status: "resolved",
      fieldName: "Date",
      confidence: "high",
      mutationAuthorized: false,
    });
    expect(
      rankFieldDisplayCandidates(sourceCatalog, { fieldName: "Date" })[0],
    ).toMatchObject({
      datasetName: "Certification",
      tablixName: "Tablix2",
      scopeRole: "detail",
      currentFormat: null,
      compatibilityUnknown: true,
    });
  });

  it("preserves Invoice declaration overlaps without forcing unrelated displays", async () => {
    const sourceCatalog = await catalog("invoice");
    expect(sourceCatalog.datasetOverlaps).toEqual(
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
    expect(
      resolveReadOnlyFieldDisplay(sourceCatalog, { fieldName: "Company" }),
    ).toMatchObject({ status: "notFound" });
  });

  it("orders structurally without using order to force resolution", async () => {
    const sourceCatalog = await catalog("invoice");
    const first = rankFieldDisplayCandidates(sourceCatalog, {
      fieldName: "Amount",
    });
    const second = rankFieldDisplayCandidates(sourceCatalog, {
      fieldName: "amount",
    });
    expect(second).toEqual(first);
    expect(first.map(({ structuralPath }) => structuralPath)).toEqual(
      [...first.map(({ structuralPath }) => structuralPath)].sort(),
    );
    expect(
      resolveReadOnlyFieldDisplay(sourceCatalog, { fieldName: "Amount" }),
    ).toMatchObject({ status: "ambiguous" });
  });

  it("contains no fixture-specific resolver rules or hashes", async () => {
    const source = await readFile(
      resolve(root, "packages/rdl-copilot/src/field-resolution.ts"),
      "utf8",
    );
    for (const forbidden of [
      '"DetailUnitCose"',
      '"InventoryData"',
      '"InventoryTable"',
      '"DetailRevenue"',
      '"DepartmentRevenueSubtotal"',
      '"ReportRevenueTotal"',
      "e3a34afe7c29",
      "03c7a6eacd6b",
      "6251f6b9f766",
      "9693231c7985",
    ])
      expect(source).not.toContain(forbidden);
  });
});
