import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  catalogRdlBytes,
  targetCandidateCatalogSchema,
} from "./target-context";
import {
  rankTitleCandidates,
  resolveReadOnlyReportTitle,
  titleResolutionOutcomeSchema,
} from "./title-resolution";

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

describe("typed read-only title resolution", () => {
  it("runtime-validates all outcome variants and forbids mutation authority", () => {
    const candidate = {
      candidateId: "opaque",
      visibleText: "Title",
      structuralPath: "section[0]/body/Textbox(Title)",
      region: "body" as const,
      score: 100,
      evidence: [{ code: "SAFE", weight: 10, message: "safe" }],
      negativeEvidence: [],
    };
    const outcomes = [
      {
        status: "resolved",
        reason: "TITLE_RESOLVED",
        candidateId: "opaque",
        confidence: "high",
        evidence: candidate.evidence,
        alternatives: [],
        mutationAuthorized: false,
      },
      {
        status: "ambiguous",
        reason: "MULTIPLE_PLAUSIBLE_TITLE_CANDIDATES",
        candidates: [candidate, { ...candidate, candidateId: "opaque-2" }],
        evidence: ["tie"],
        mutationAuthorized: false,
      },
      {
        status: "notFound",
        reason: "NO_TITLE_CANDIDATE",
        consideredCandidateCount: 0,
        mutationAuthorized: false,
      },
      {
        status: "unsupported",
        reason: "TITLE_CONTEXT_INSUFFICIENT",
        evidence: ["missing context"],
        mutationAuthorized: false,
      },
    ];
    for (const outcome of outcomes)
      expect(titleResolutionOutcomeSchema.parse(outcome)).toEqual(outcome);
    expect(() =>
      titleResolutionOutcomeSchema.parse({
        ...outcomes[0],
        candidateId: undefined,
      }),
    ).toThrow();
    expect(() =>
      titleResolutionOutcomeSchema.parse({
        ...outcomes[1],
        candidates: [candidate],
      }),
    ).toThrow();
    expect(() =>
      titleResolutionOutcomeSchema.parse({
        ...outcomes[2],
        candidateId: "forbidden",
      }),
    ).toThrow();
    for (const outcome of outcomes)
      expect(() =>
        titleResolutionOutcomeSchema.parse({
          ...outcome,
          mutationAuthorized: true,
        }),
      ).toThrow();
  });

  it("keeps simple-table title evidence ambiguous without selecting either item", async () => {
    const result = resolveReadOnlyReportTitle(await catalog("simple"));
    expect(result).toMatchObject({
      status: "ambiguous",
      reason: "CONFLICTING_TITLE_EVIDENCE",
      mutationAuthorized: false,
    });
    if (result.status !== "ambiguous") throw new Error("Expected ambiguity");
    expect(result.candidates.map(({ visibleText }) => visibleText)).toEqual([
      "InventoryReportTitle",
      "Synthetic Inventory Detail",
    ]);
    expect(result.evidence).toEqual([
      "title-oriented name and style evidence favors one candidate",
      "standalone visible semantic-title evidence favors another candidate",
      "automatically selecting either candidate would be unsafe",
    ]);
    expect("candidateId" in result).toBe(false);
  });

  it("resolves the grouped standalone title with inspectable high-confidence evidence", async () => {
    const sourceCatalog = await catalog("grouped");
    const result = resolveReadOnlyReportTitle(sourceCatalog);
    expect(result).toMatchObject({
      status: "resolved",
      reason: "TITLE_RESOLVED",
      confidence: "high",
      candidateId: sourceCatalog.titleCandidates.find(
        ({ reportItemName }) => reportItemName === "ReportTitle",
      )?.diagnosticId,
      mutationAuthorized: false,
    });
    if (result.status !== "resolved") throw new Error("Expected resolution");
    expect(result.evidence.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        "TITLE_ORIENTED_NAME",
        "LARGE_FONT",
        "BOLD",
        "STANDALONE_BODY",
      ]),
    );
  });

  it("does not force a title for Invoice", async () => {
    const sourceCatalog = await catalog("invoice");
    const first = resolveReadOnlyReportTitle(sourceCatalog);
    const second = resolveReadOnlyReportTitle(sourceCatalog);
    expect(first).toEqual(second);
    expect(first).toEqual({
      status: "notFound",
      reason: "NO_CONFIDENT_TITLE_CANDIDATE",
      consideredCandidateCount: 11,
      mutationAuthorized: false,
    });
    const strongest = rankTitleCandidates(sourceCatalog)[0];
    expect(strongest?.visibleText).toBe("Invoice CIV-000676");
    expect(strongest?.negativeEvidence.map(({ code }) => code)).toContain(
      "TABLIX_STATIC_HEADER",
    );
  });

  it("resolves Transcript from generic page-header and style evidence", async () => {
    const sourceCatalog = await catalog("transcript");
    const result = resolveReadOnlyReportTitle(sourceCatalog);
    const title = sourceCatalog.titleCandidates.find(
      ({ reportItemName }) => reportItemName === "Textbox1",
    );
    expect(result).toMatchObject({
      status: "resolved",
      confidence: "high",
      candidateId: title?.diagnosticId,
      mutationAuthorized: false,
    });
    if (result.status !== "resolved") throw new Error("Expected resolution");
    expect(result.evidence.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        "SAFE_CONSTANT_STRING",
        "PAGE_HEADER",
        "LARGE_FONT",
        "BOLD",
        "WIDE_TEXTBOX",
      ]),
    );
    expect(
      result.alternatives
        .find(({ visibleText }) => visibleText === "Student ID : ")
        ?.negativeEvidence.map(({ code }) => code),
    ).toEqual(
      expect.arrayContaining(["LABEL_PUNCTUATION", "METADATA_OR_DISCLAIMER"]),
    );
    expect(result.alternatives.some(({ region }) => region === "body")).toBe(
      true,
    );
  });

  it("keeps semantic ties ambiguous despite deterministic path ordering", async () => {
    const sourceCatalog = await catalog("grouped");
    const base = sourceCatalog.titleCandidates[0]!;
    const tied = targetCandidateCatalogSchema.parse({
      ...sourceCatalog,
      titleCandidates: [
        {
          ...base,
          diagnosticId: "a",
          location: { ...base.location, structuralPath: "a" },
        },
        {
          ...base,
          diagnosticId: "b",
          location: { ...base.location, structuralPath: "b" },
        },
      ],
    });
    expect(
      rankTitleCandidates(tied).map(({ candidateId }) => candidateId),
    ).toEqual(["a", "b"]);
    expect(resolveReadOnlyReportTitle(tied)).toMatchObject({
      status: "ambiguous",
      reason: "MULTIPLE_PLAUSIBLE_TITLE_CANDIDATES",
    });
  });

  it("records generic positive and negative evidence without fixture rules", async () => {
    const grouped = rankTitleCandidates(await catalog("grouped"));
    expect(grouped[0]?.evidence.map(({ code }) => code)).toEqual(
      expect.arrayContaining(["LARGE_FONT", "BOLD", "TITLE_ORIENTED_NAME"]),
    );
    expect(
      grouped.find(({ visibleText }) => visibleText === "Revenue")
        ?.negativeEvidence,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "TABLIX_STATIC_HEADER" }),
      ]),
    );
    const invoice = rankTitleCandidates(await catalog("invoice"));
    expect(
      invoice.find(({ region }) => region === "pageFooter")?.negativeEvidence,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "PAGE_FOOTER" }),
      ]),
    );
    const production = await readFile(
      resolve(root, "packages/rdl-copilot/src/title-resolution.ts"),
      "utf8",
    );
    for (const forbidden of [
      '"ReportTitle"',
      '"Textbox1"',
      '"Textbox9"',
      "e3a34afe7c29",
      "03c7a6eacd6b",
      "6251f6b9f766",
      "9693231c7985",
    ])
      expect(production).not.toContain(forbidden);
  });

  it("classifies unsupported, field, aggregate, and hidden evidence without execution", async () => {
    const sourceCatalog = await catalog("grouped");
    const base = sourceCatalog.titleCandidates[0]!;
    const variants = [
      [
        "directFieldReference",
        { expression: "=Fields!Name.Value", fieldName: "Name" },
        "DIRECT_FIELD_EXPRESSION",
      ],
      [
        "aggregateExpression",
        {
          expression: "=Sum(Fields!Revenue.Value)",
          functionName: "Sum",
          fieldName: "Revenue",
          explicitScope: null,
        },
        "AGGREGATE_EXPRESSION",
      ],
      [
        "codeExpression",
        { expression: "=Code.Danger()" },
        "UNSUPPORTED_TITLE_EXPRESSION",
      ],
    ] as const;
    for (const [kind, properties, evidenceCode] of variants) {
      const synthetic = targetCandidateCatalogSchema.parse({
        ...sourceCatalog,
        titleCandidates: [
          {
            ...base,
            diagnosticId: kind,
            expression: { kind, ...properties },
            location: {
              ...base.location,
              hidden:
                kind === "directFieldReference"
                  ? { status: "hidden", expression: null }
                  : base.location.hidden,
            },
          },
        ],
      });
      const ranked = rankTitleCandidates(synthetic)[0]!;
      expect(ranked.negativeEvidence.map(({ code }) => code)).toContain(
        evidenceCode,
      );
      if (kind === "directFieldReference")
        expect(ranked.negativeEvidence.map(({ code }) => code)).toContain(
          "HIDDEN_OR_CONDITIONAL",
        );
      if (kind === "codeExpression")
        expect(resolveReadOnlyReportTitle(synthetic)).toMatchObject({
          status: "unsupported",
          reason: "UNSUPPORTED_TITLE_EXPRESSION",
        });
    }
  });
});
