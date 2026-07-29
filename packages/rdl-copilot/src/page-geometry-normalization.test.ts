import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { editPlanSchema } from "./edit-plan";
import { inspectRdlBytes, inspectRdlFile } from "./inspection";
import { mutateExistingRdl } from "./mutation";
import { prepareSidecarEditFromText } from "./sidecar-cli";

const root = resolve(import.meta.dirname, "../../..");
const schemaPath = resolve(
  root,
  "packages/rdl-spike/schema/ReportDefinition-2016.xsd",
);
const corpus = [
  [
    "examples/rdl-structure-corpus/simple-table/source/synthetic-inventory-detail.rdl",
    "e3a34afe7c29c9f773098d9f5bfd65ad2cf60219f78999d46a447250bb2448e3",
  ],
  [
    "examples/rdl-structure-corpus/grouped-report/source/synthetic-department-sales.rdl",
    "03c7a6eacd6b003aeaace0264a361267ce208de6388420f0d465608f3540174b",
  ],
  [
    "examples/rdl-structure-corpus/external-sources/microsoft-reporting-services/imported/invoice/source/Invoice.rdl",
    "6251f6b9f76618dd5c2f9accc614b9e198fc221d2310a39508f6ac4897d53fdc",
  ],
  [
    "examples/rdl-structure-corpus/external-sources/microsoft-reporting-services/imported/transcript/source/Transcript.rdl",
    "9693231c79853b0881d0414f1c98242c76216efc00784b3bc81acc69430b2e81",
  ],
] as const;
const sha256 = (value: Uint8Array) =>
  createHash("sha256").update(value).digest("hex");
const synthetic = (width?: string, height?: string) =>
  Buffer.from(
    `<?xml version="1.0" encoding="utf-8"?><Report xmlns="http://schemas.microsoft.com/sqlserver/reporting/2016/01/reportdefinition"><ReportSections><ReportSection><Body><ReportItems /></Body><Width>7in</Width><Page>${width === undefined ? "" : `<PageWidth>${width}</PageWidth>`}${height === undefined ? "" : `<PageHeight>${height}</PageHeight>`}</Page></ReportSection></ReportSections></Report>`,
  );

describe("optional page geometry normalization", () => {
  it.each([
    ["8.5in", undefined, "explicit", "omitted"],
    [undefined, "11in", "omitted", "explicit"],
    [undefined, undefined, "omitted", "omitted"],
  ])(
    "represents width %s and height %s without defaults",
    async (width, height, widthPresence, heightPresence) => {
      const section = (
        await inspectRdlBytes(synthetic(width, height), "synthetic.rdl")
      ).reportSections[0]!;
      expect(section.pageWidth.presence).toBe(widthPresence);
      expect(section.pageHeight.presence).toBe(heightPresence);
      expect(section.orientation).toEqual({
        status: "unknown",
        reason: "PAGE_DIMENSIONS_UNSPECIFIED",
      });
      expect(JSON.stringify(section)).not.toContain('"normalizedInches":0');
      if (width === undefined && height === undefined)
        expect(JSON.stringify(section)).not.toContain("8.5in");
    },
  );

  it.each([
    ["8.5in", "11in", "portrait"],
    ["11in", "8.5in", "landscape"],
    ["8.5in", "8.5in", "square"],
  ])("normalizes explicit %s x %s as %s", async (width, height, value) => {
    const section = (
      await inspectRdlBytes(synthetic(width, height), "synthetic.rdl")
    ).reportSections[0]!;
    expect(section.pageWidth).toEqual({
      presence: "explicit",
      raw: width,
      normalizedInches: Number.parseFloat(width),
    });
    expect(section.pageHeight.presence).toBe("explicit");
    expect(section.orientation).toEqual({ status: "known", value });
  });

  it.each([
    ["wide", "11in"],
    ["8.5in", "tall"],
    ["", "11in"],
    ["8.5in", ""],
  ])("rejects malformed serialized dimensions", async (width, height) => {
    await expect(
      inspectRdlBytes(synthetic(width, height), "synthetic.rdl"),
    ).rejects.toMatchObject({ code: "INVALID_REPORT" });
  });

  it.each(corpus)(
    "completes read-only production inspection for %s",
    async (relativePath, expectedHash) => {
      const path = resolve(root, relativePath);
      const before = await readFile(path);
      const inventory = await inspectRdlFile(path);
      expect(inventory.sourceSha256).toBe(expectedHash);
      expect(inventory.reportSections[0]?.orientation).toEqual({
        status: "unknown",
        reason: "PAGE_DIMENSIONS_UNSPECIFIED",
      });
      expect(inventory.warnings).toHaveLength(1);
      expect(await readFile(path)).toEqual(before);
    },
  );

  it("blocks an atomic multi-operation orientation request before mutation", async () => {
    const path = resolve(root, corpus[0][0]);
    const source = await readFile(path);
    const plan = editPlanSchema.parse({
      version: 1,
      operations: [
        {
          type: "setText",
          target: { kind: "reportItem", semanticRole: "reportTitle" },
          value: "Must not be written",
        },
        { type: "setPageOrientation", orientation: "landscape" },
      ],
    });
    await expect(
      mutateExistingRdl({
        source,
        sourceFileName: basename(path),
        expectedSourceSha256: sha256(source),
        plan,
        schema: await readFile(schemaPath),
      }),
    ).rejects.toMatchObject({
      code: "PAGE_DIMENSIONS_UNSPECIFIED",
      message:
        "The source omits explicit PageWidth or PageHeight, so deterministic orientation mutation cannot proceed.",
    });
    expect(await readFile(path)).toEqual(source);
  });

  it("returns the stable capability code before sidecar target resolution", async () => {
    await expect(
      prepareSidecarEditFromText({
        sourcePath: resolve(root, corpus[0][0]),
        request:
          'Change the report title to "Must not be written" and switch the page to landscape.',
      }),
    ).rejects.toMatchObject({
      code: "PAGE_DIMENSIONS_UNSPECIFIED",
    });
  });

  it("does not add corpus fixture hashes to production title configuration", async () => {
    const source = await readFile(
      resolve(root, "packages/rdl-copilot/src/inspection.ts"),
      "utf8",
    );
    for (const [, fixtureHash] of corpus)
      expect(source).not.toContain(fixtureHash);
  });
});
