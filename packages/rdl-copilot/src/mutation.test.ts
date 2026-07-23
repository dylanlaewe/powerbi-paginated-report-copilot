import { createHash } from "node:crypto";
import {
  copyFile,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  canonicalGate2EditPlan,
  editPlanSchema,
  type EditPlan,
} from "./edit-plan";
import {
  inspectRdlBytes,
  resolveFieldDisplays,
  resolveReportTitle,
} from "./inspection";
import { applyEditPlanToFile, mutateExistingRdl } from "./mutation";
import {
  assertStructuralPreservation,
  StructuralDiffError,
} from "./structural-guard";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const fixturePath = resolve(
  repositoryRoot,
  "examples/existing-rdl-sidecar/source/regional-sales-existing.rdl",
);
const expectedPath = resolve(
  repositoryRoot,
  "examples/existing-rdl-sidecar/expected/regional-sales-existing-copilot-edited.rdl",
);
const validationEvidencePath = resolve(
  repositoryRoot,
  "examples/existing-rdl-sidecar/expected/gate-2-validation.json",
);
const schemaPath = resolve(
  repositoryRoot,
  "packages/rdl-spike/schema/ReportDefinition-2016.xsd",
);
const sourceSha256 =
  "c2d27f7595d9330eb9815f86483aa068129265a00980ca3b0b956f6f3f1de17a";
const hash = (value: Uint8Array): string =>
  createHash("sha256").update(value).digest("hex");
const directories: string[] = [];
let source: Buffer;
let schema: Buffer;

beforeAll(async () => {
  [source, schema] = await Promise.all([
    readFile(fixturePath),
    readFile(schemaPath),
  ]);
});

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true })),
  );
});

const mutate = (plan: EditPlan = canonicalGate2EditPlan, report = source) =>
  mutateExistingRdl({
    source: report,
    sourceFileName: basename(fixturePath),
    expectedSourceSha256: hash(report),
    plan,
    schema,
  });

describe("typed deterministic RDL mutation", () => {
  it("applies the canonical plan to only the resolved targets", async () => {
    const result = await mutate();
    const title = result.outputInventory.textboxes.find(
      ({ name }) => name === "ReportTitle",
    );
    expect(result.resolvedTargets.reportTitle?.reportItemName).toBe(
      "ReportTitle",
    );
    expect(title).toMatchObject({
      staticText: ["Weekly Sales Pipeline"],
      fontSizes: ["18pt"],
      fontWeights: ["Bold"],
    });
    expect(
      result.resolvedTargets.fieldDisplays.Revenue?.reportItemNames,
    ).toEqual(["Revenue", "Textbox10", "Textbox19"]);
    expect(
      resolveFieldDisplays(result.outputInventory, "Revenue").reportItemNames,
    ).toEqual(["Revenue", "Textbox10", "Textbox19"]);
    for (const name of ["Revenue", "Textbox10", "Textbox19"])
      expect(
        result.outputInventory.textboxes
          .find((textbox) => textbox.name === name)
          ?.fieldBindings.map(({ format }) => format),
      ).toEqual(["C0"]);
    expect(
      result.outputInventory.textboxes.find(
        ({ name }) => name === "HeaderRevenue",
      )?.staticText,
    ).toEqual(["Revenue"]);
  });

  it("swaps portrait to landscape while preserving margins and body width", async () => {
    const result = await mutate();
    expect(result.outputInventory.reportSections).toEqual([
      {
        index: 0,
        bodyWidth: "7in",
        pageWidth: "11in",
        pageHeight: "8.5in",
        orientation: "landscape",
        margins: {
          left: "0.5in",
          right: "0.5in",
          top: "0.5in",
          bottom: "0.5in",
        },
      },
    ]);
  });

  it("swaps the generated landscape page back to portrait", async () => {
    const landscape = await mutate();
    const portraitPlan = editPlanSchema.parse({
      version: 1,
      operations: [{ type: "setPageOrientation", orientation: "portrait" }],
    });
    const portrait = await mutateExistingRdl({
      source: landscape.output,
      sourceFileName: "landscape.rdl",
      expectedSourceSha256: landscape.outputSha256,
      plan: portraitPlan,
      schema,
    });
    expect(portrait.outputInventory.reportSections[0]).toMatchObject({
      pageWidth: "8.5in",
      pageHeight: "11in",
      orientation: "portrait",
      bodyWidth: "7in",
      margins: landscape.outputInventory.reportSections[0]?.margins,
    });
  });

  it("preserves datasets, fields, groups, tablix, footer, page behavior, and embedded data", async () => {
    const result = await mutate();
    expect(result.outputInventory.datasets).toEqual(
      result.sourceInventory.datasets,
    );
    expect(result.outputInventory.groups).toEqual(
      result.sourceInventory.groups,
    );
    expect(result.outputInventory.tablixes).toEqual(
      result.sourceInventory.tablixes,
    );
    expect(result.outputInventory.reportParameters).toEqual(
      result.sourceInventory.reportParameters,
    );
    expect(result.outputInventory.textboxes).toHaveLength(
      result.sourceInventory.textboxes.length,
    );
    expect(result.preservation.checks).toEqual({
      fullSemanticAllowlist: "PASS",
      embeddedData: "PASS",
      datasetsAndFields: "PASS",
      tablixAndGroupHierarchy: "PASS",
      pageBreaksAndRepeatingHeaders: "PASS",
      footer: "PASS",
    });
    expect(result.validation).toMatchObject({
      xmlParse: "PASS",
      xsd: "PASS",
      xsdEngine: "libxml2-wasm",
      structuralDiff: "PASS",
      reparse: "PASS",
    });
  });

  it("does not change GrossProfit, Quantity, unrelated text, or field expressions", async () => {
    const result = await mutate();
    const sourceByName = new Map(
      result.sourceInventory.textboxes.map((textbox) => [
        textbox.name,
        textbox,
      ]),
    );
    for (const outputTextbox of result.outputInventory.textboxes) {
      if (
        ["ReportTitle", "Revenue", "Textbox10", "Textbox19"].includes(
          outputTextbox.name,
        )
      )
        continue;
      expect(outputTextbox).toEqual(sourceByName.get(outputTextbox.name));
    }
    expect(
      resolveFieldDisplays(result.outputInventory, "GrossProfit").evidence,
    ).toEqual(
      resolveFieldDisplays(result.sourceInventory, "GrossProfit").evidence,
    );
    expect(
      resolveFieldDisplays(result.outputInventory, "Quantity").evidence,
    ).toEqual(
      resolveFieldDisplays(result.sourceInventory, "Quantity").evidence,
    );
  });

  it("is byte deterministic and matches the committed expected fixture", async () => {
    const first = await mutate();
    const second = await mutate();
    expect(first.output).toEqual(second.output);
    expect(first.outputSha256).toBe(second.outputSha256);
    expect(first.output).toEqual(await readFile(expectedPath));
    const evidence = JSON.parse(
      await readFile(validationEvidencePath, "utf8"),
    ) as {
      source: { sha256: string };
      output: { sha256: string };
      preservation: typeof first.preservation;
    };
    expect(evidence.source.sha256).toBe(first.sourceSha256);
    expect(evidence.output.sha256).toBe(first.outputSha256);
    expect(evidence.preservation).toEqual(first.preservation);
  });

  it("rejects a stale source checksum before mutation", async () => {
    await expect(
      mutateExistingRdl({
        source,
        sourceFileName: basename(fixturePath),
        expectedSourceSha256: "0".repeat(64),
        plan: canonicalGate2EditPlan,
        schema,
      }),
    ).rejects.toMatchObject({ code: "SOURCE_CHECKSUM_MISMATCH" });
  });

  it("fails closed when the Revenue display count differs from three", async () => {
    const sourceText = source.toString("utf8");
    const expression = "=Sum(Fields!Revenue.Value)";
    const finalExpression = sourceText.lastIndexOf(expression);
    expect(finalExpression).toBeGreaterThan(0);
    const altered = Buffer.from(
      `${sourceText.slice(0, finalExpression)}${expression}+0${sourceText.slice(finalExpression + expression.length)}`,
    );
    const formatOnly = editPlanSchema.parse({
      version: 1,
      operations: [canonicalGate2EditPlan.operations[3]],
    });
    await expect(mutate(formatOnly, altered)).rejects.toMatchObject({
      code: "TARGET_COUNT_MISMATCH",
    });
  });

  it("rejects a source with a missing Revenue field declaration", async () => {
    const altered = Buffer.from(
      source
        .toString("utf8")
        .replace('<Field Name="Revenue">', '<Field Name="RevenueRemoved">'),
    );
    const formatOnly = editPlanSchema.parse({
      version: 1,
      operations: [canonicalGate2EditPlan.operations[3]],
    });
    await expect(mutate(formatOnly, altered)).rejects.toMatchObject({
      code: "FIELD_NOT_FOUND",
    });
  });

  it("rejects title mutation when the checksum-reviewed exact target is unavailable", async () => {
    const altered = Buffer.from(
      source
        .toString("utf8")
        .replace('Textbox Name="ReportTitle"', 'Textbox Name="RemovedTitle"'),
    );
    const titleOnly = editPlanSchema.parse({
      version: 1,
      operations: [canonicalGate2EditPlan.operations[0]],
    });
    await expect(mutate(titleOnly, altered)).rejects.toMatchObject({
      code: "TITLE_NOT_FOUND",
    });
  });

  it("retains generic missing and ambiguous title rejection", async () => {
    const inventory = await inspectRdlBytes(source, basename(fixturePath));
    const title = inventory.textboxes.find(
      ({ name }) => name === "ReportTitle",
    )!;
    expect(() =>
      resolveReportTitle({
        ...inventory,
        textboxes: inventory.textboxes.filter(
          ({ name }) => name !== "ReportTitle",
        ),
      }),
    ).toThrowError(expect.objectContaining({ code: "TITLE_NOT_FOUND" }));
    expect(() =>
      resolveReportTitle({
        ...inventory,
        textboxes: [...inventory.textboxes, { ...title, name: "SecondTitle" }],
      }),
    ).toThrowError(expect.objectContaining({ code: "TITLE_AMBIGUOUS" }));
  });

  it("rejects one injected unauthorized semantic mutation", async () => {
    const result = await mutate();
    const unexpected = Buffer.from(
      result.output
        .toString("utf8")
        .replace("<Format>C2</Format>", "<Format>C9</Format>"),
    );
    await expect(
      assertStructuralPreservation(source, unexpected, result.allowlist),
    ).rejects.toBeInstanceOf(StructuralDiffError);
  });

  it("writes atomically to a separate output and never overwrites the source", async () => {
    const directory = await mkdtemp(join(tmpdir(), "sidecar-gate2-output-"));
    directories.push(directory);
    const sourceCopy = join(directory, "source.rdl");
    await copyFile(fixturePath, sourceCopy);
    const before = await readFile(sourceCopy);
    const result = await applyEditPlanToFile({
      sourcePath: sourceCopy,
      expectedSourceSha256: sourceSha256,
      plan: canonicalGate2EditPlan,
      schemaPath,
      outputDirectory: join(directory, "edited"),
      outputFileName: "source-copilot-edited.rdl",
    });
    expect(await readFile(sourceCopy)).toEqual(before);
    expect(await readFile(result.outputPath)).toEqual(result.output);
    expect(
      (await readdir(join(directory, "edited"))).some((name) =>
        name.endsWith(".tmp"),
      ),
    ).toBe(false);
    await expect(
      applyEditPlanToFile({
        sourcePath: sourceCopy,
        expectedSourceSha256: sourceSha256,
        plan: canonicalGate2EditPlan,
        schemaPath,
        outputDirectory: directory,
        outputFileName: "source.rdl",
      }),
    ).rejects.toMatchObject({ code: "INVALID_OUTPUT" });
  });

  it("detects a source change before atomic write and leaves no output", async () => {
    const directory = await mkdtemp(join(tmpdir(), "sidecar-gate2-stale-"));
    directories.push(directory);
    const sourceCopy = join(directory, "source.rdl");
    const outputDirectory = join(directory, "edited");
    await copyFile(fixturePath, sourceCopy);
    await expect(
      applyEditPlanToFile(
        {
          sourcePath: sourceCopy,
          expectedSourceSha256: sourceSha256,
          plan: canonicalGate2EditPlan,
          schemaPath,
          outputDirectory,
          outputFileName: "source-copilot-edited.rdl",
        },
        {
          beforeSourceRecheck: async () =>
            writeFile(sourceCopy, Buffer.concat([source, Buffer.from(" ")])),
        },
      ),
    ).rejects.toMatchObject({ code: "SOURCE_CHANGED" });
    await expect(readdir(outputDirectory)).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("leaves the canonical source fixture unchanged", async () => {
    expect(hash(await readFile(fixturePath))).toBe(sourceSha256);
  });
});
