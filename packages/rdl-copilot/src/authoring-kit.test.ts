import { readdir, readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { rdlAuthoringKitSchema } from "./authoring-kit";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const corpusRoot = resolve(repositoryRoot, "examples/rdl-structure-corpus");
const manifestPath = resolve(corpusRoot, "authoring-kit.json");

async function loadManifest() {
  return rdlAuthoringKitSchema.parse(
    JSON.parse(await readFile(manifestPath, "utf8")),
  );
}

describe("RDL structure corpus Gate 2A authoring kit", () => {
  it("runtime-validates the safety policy and approved authoring order", async () => {
    const kit = await loadManifest();
    expect(kit.fixtures.map(({ id }) => id)).toEqual([
      "simple-table",
      "grouped-report",
      "parameterized-report",
      "alternate-layout",
    ]);
    expect(kit.sourceCreationPolicy).toMatchObject({
      startFromBlankReport: true,
      enterDataOnly: true,
      personallyAuthored: true,
      syntheticOnly: true,
      credentialsAllowed: false,
      companyOrCustomerSourceAllowed: false,
      copiedLayoutAllowed: false,
      databaseConnectionRequired: false,
      sourceRdlIncludedInGate2A: false,
    });
  });

  it("matches every UTF-8 TSV header and row count to its declared schema", async () => {
    const kit = await loadManifest();
    for (const fixture of kit.fixtures)
      for (const dataset of fixture.datasets) {
        const contents = await readFile(
          resolve(corpusRoot, dataset.dataRelativePath),
          "utf8",
        );
        expect(contents).not.toContain("\uFFFD");
        const lines = contents.trimEnd().split(/\r?\n/u);
        expect(lines[0]?.split("\t")).toEqual(
          dataset.fields.map(({ name }) => name),
        );
        expect(lines).toHaveLength(dataset.rowCount + 1);
        for (const line of lines.slice(1)) {
          const cells = line.split("\t");
          expect(cells).toHaveLength(dataset.fields.length);
          cells.forEach((cell, index) => {
            const dataType = dataset.fields[index]?.dataType;
            if (dataType === "Int32") expect(cell).toMatch(/^-?\d+$/u);
            else if (dataType === "Decimal") {
              expect(cell).toMatch(/^-?\d+(?:\.\d+)?$/u);
              expect(Number.isFinite(Number(cell))).toBe(true);
            } else if (dataType === "DateTime") {
              expect(cell).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
              expect(Number.isNaN(Date.parse(`${cell}T00:00:00Z`))).toBe(false);
            } else expect(cell.length).toBeGreaterThan(0);
          });
        }
      }
  });

  it("includes construction guides and uncompleted validation worksheets", async () => {
    const kit = await loadManifest();
    for (const fixture of kit.fixtures) {
      const guide = await readFile(
        resolve(corpusRoot, fixture.instructionsRelativePath),
        "utf8",
      );
      const worksheet = await readFile(
        resolve(corpusRoot, fixture.validationWorksheetRelativePath),
        "utf8",
      );
      expect(guide).toContain("Blank Report");
      expect(guide).toContain("Enter Data");
      expect(guide).toContain(fixture.sourceRelativePath);
      expect(worksheet).toContain("Source SHA-256");
      expect(worksheet).toContain("Root RDL namespace");
      expect(worksheet).toContain("Preview page count");
      expect(worksheet).toContain("PDF");
      expect(worksheet).toContain("Excel");
      if (fixture.id === "simple-table")
        expect(worksheet).toContain("Gate 2B is complete");
      else expect(worksheet).toContain("[RECORD");
    }
  });

  it("permits only the hash-pinned simple-table source after Gate 2B", async () => {
    async function findRdlFiles(directory: string): Promise<string[]> {
      const entries = await readdir(directory, { withFileTypes: true });
      const matches = await Promise.all(
        entries.map(async (entry) => {
          const path = resolve(directory, entry.name);
          if (entry.isDirectory()) return findRdlFiles(path);
          return extname(entry.name).toLowerCase() === ".rdl" ? [path] : [];
        }),
      );
      return matches.flat();
    }

    expect(await findRdlFiles(corpusRoot)).toEqual([
      resolve(corpusRoot, "simple-table/source/synthetic-inventory-detail.rdl"),
    ]);
  });
});
