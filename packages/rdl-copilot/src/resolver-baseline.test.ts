import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const baselineRoot = resolve(
  repositoryRoot,
  "examples/rdl-structure-corpus/resolver-baseline-v0.3",
);
const expectedClassifications = [
  "PASS_CORRECT",
  "PASS_AMBIGUOUSLY_SAFE",
  "BLOCKED_INSPECTOR",
  "BLOCKED_UNSUPPORTED_STRUCTURE",
  "BLOCKED_NO_CANDIDATE",
  "BLOCKED_AMBIGUOUS",
  "FAIL_WRONG_TARGET",
  "FAIL_INCONSISTENT_TARGETS",
  "NOT_APPLICABLE",
];
const sources = [
  [
    "examples/rdl-structure-corpus/simple-table/source/synthetic-inventory-detail.rdl",
    21_402,
    "e3a34afe7c29c9f773098d9f5bfd65ad2cf60219f78999d46a447250bb2448e3",
  ],
  [
    "examples/rdl-structure-corpus/grouped-report/source/synthetic-department-sales.rdl",
    52_651,
    "03c7a6eacd6b003aeaace0264a361267ce208de6388420f0d465608f3540174b",
  ],
  [
    "examples/rdl-structure-corpus/external-sources/microsoft-reporting-services/imported/invoice/source/Invoice.rdl",
    222_297,
    "6251f6b9f76618dd5c2f9accc614b9e198fc221d2310a39508f6ac4897d53fdc",
  ],
  [
    "examples/rdl-structure-corpus/external-sources/microsoft-reporting-services/imported/transcript/source/Transcript.rdl",
    116_709,
    "9693231c79853b0881d0414f1c98242c76216efc00784b3bc81acc69430b2e81",
  ],
] as const;
const hash = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex");

async function fixture(id: string) {
  return JSON.parse(
    await readFile(resolve(baselineRoot, "fixtures", `${id}.json`), "utf8"),
  ) as Record<string, unknown>;
}

describe("Gate 2G corpus resolver baseline", () => {
  it("pins all four immutable source identities", async () => {
    for (const [path, size, sha256] of sources) {
      const bytes = await readFile(resolve(repositoryRoot, path));
      expect(bytes).toHaveLength(size);
      expect(hash(bytes)).toBe(sha256);
    }
  });

  it("records the stable classification enum and production stop", async () => {
    const matrix = JSON.parse(
      await readFile(resolve(baselineRoot, "baseline-matrix.json"), "utf8"),
    ) as {
      classificationEnum: string[];
      fixtures: Array<Record<string, unknown>>;
      globalFindings: Record<string, unknown>;
      unchangedProductionSourceIdentities: Array<{
        relativePath: string;
        sha256: string;
      }>;
    };
    expect(matrix.classificationEnum).toEqual(expectedClassifications);
    expect(matrix.fixtures.map(({ fixtureId }) => fixtureId)).toEqual([
      "simple-table",
      "grouped-report",
      "microsoft-invoice",
      "microsoft-transcript",
    ]);
    for (const item of matrix.fixtures)
      expect(item).toMatchObject({
        productionInspector: "BLOCKED_INSPECTOR",
        stoppingStage: "pageSettingsNormalization",
        errorCode: "INVALID_REPORT",
        error: "ReportSection 0 lacks PageWidth",
        rendererReceivesUsableSummary: false,
      });
    expect(matrix.globalFindings).toMatchObject({
      productionPartialModelsAvailable: false,
      productionRendererSummariesAvailable: false,
      productionTitleScoringExists: false,
      productionFieldScoringExists: false,
      generatedEditedRdlCount: 0,
    });
    expect(matrix.unchangedProductionSourceIdentities).toHaveLength(8);
    for (const identity of matrix.unchangedProductionSourceIdentities)
      expect(identity.sha256).toMatch(/^[a-f0-9]{64}$/u);
  });

  it("keeps candidate ordering and key outcomes deterministic", async () => {
    const simple = await fixture("simple-table");
    const grouped = await fixture("grouped-report");
    const invoice = await fixture("microsoft-invoice");
    const transcript = await fixture("microsoft-transcript");
    const title = (item: Record<string, unknown>) =>
      (
        item.corpusAssistedDiagnosticOnly as {
          title: {
            classification: string;
            candidates: Array<{ reportItemName: string; score: number }>;
          };
        }
      ).title;
    expect(title(simple).classification).toBe("FAIL_WRONG_TARGET");
    expect(title(simple).candidates.slice(0, 2)).toMatchObject([
      { reportItemName: "ReportTitle", score: 100 },
      { reportItemName: "Textbox9", score: 25 },
    ]);
    expect(title(grouped).classification).toBe("PASS_CORRECT");
    expect(title(grouped).candidates[0]).toMatchObject({
      reportItemName: "ReportTitle",
      score: 100,
    });
    expect(title(invoice).classification).toBe("BLOCKED_NO_CANDIDATE");
    expect(title(transcript).classification).toBe(
      "BLOCKED_UNSUPPORTED_STRUCTURE",
    );
    expect(title(transcript).candidates[0]).toMatchObject({
      reportItemName: "Textbox1",
      score: 55,
    });
  });

  it("records planner parsing without executing a plan", async () => {
    const simple = await fixture("simple-table");
    const grouped = await fixture("grouped-report");
    const transcript = await fixture("microsoft-transcript");
    expect(simple.plannerBaseline).toMatchObject({
      result: { status: "planned" },
      planCouldReachReviewSafely: false,
      mutationBlockedBeforeWrite: true,
    });
    expect(grouped.plannerBaseline).toMatchObject({
      result: { status: "planned" },
      planCouldReachReviewSafely: false,
      mutationBlockedBeforeWrite: true,
    });
    expect(transcript.plannerBaseline).toMatchObject({
      result: {
        status: "rejected",
        code: "UNSUPPORTED_REQUEST",
        unsupportedFragments: ["left aligned"],
      },
      mutationBlockedBeforeWrite: true,
    });
  });

  it("contains deterministic JSON only and no generated RDL", async () => {
    const entries = await readdir(baselineRoot, {
      recursive: true,
      withFileTypes: true,
    });
    expect(
      entries.filter(
        (entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".rdl"),
      ),
    ).toEqual([]);
    for (const entry of entries.filter(
      (item) => item.isFile() && item.name.endsWith(".json"),
    )) {
      const parsed = JSON.parse(
        await readFile(resolve(entry.parentPath, entry.name), "utf8"),
      ) as unknown;
      expect(parsed).toBeDefined();
    }
  });
});
