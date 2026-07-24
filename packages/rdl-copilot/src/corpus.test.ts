import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { rdlStructureCorpusIndexSchema } from "./corpus";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const indexPath = resolve(
  repositoryRoot,
  "examples/rdl-structure-corpus/index.json",
);

describe("RDL structure corpus Gate 1 design", () => {
  it("runtime-validates exactly one proposed fixture per required category", async () => {
    const index = rdlStructureCorpusIndexSchema.parse(
      JSON.parse(await readFile(indexPath, "utf8")),
    );
    expect(index.fixtures).toHaveLength(4);
    expect(
      index.fixtures.map(({ structuralCategory }) => structuralCategory),
    ).toEqual([
      "simpleTable",
      "groupedReport",
      "multiDatasetOrParameterized",
      "alternateLayout",
    ]);
  });

  it("keeps source identity and Report Builder claims pending until Gate 2", async () => {
    const index = rdlStructureCorpusIndexSchema.parse(
      JSON.parse(await readFile(indexPath, "utf8")),
    );
    for (const fixture of index.fixtures) {
      expect(fixture.sourceSha256).toBeNull();
      expect(fixture.namespace).toBeNull();
      expect(fixture.provenance.reportBuilderValidation).toBe("pending Gate 2");
      expect(fixture.reportBuilderBaseline).toEqual({
        open: "pending Gate 2",
        preview: "pending Gate 2",
        pdf: "pending Gate 2",
        excel: "pending Gate 2",
      });
    }
  });

  it("freezes EditPlan v1 operations and excludes forbidden expansion", async () => {
    const raw = await readFile(indexPath, "utf8");
    const index = rdlStructureCorpusIndexSchema.parse(JSON.parse(raw));
    expect(index.frozenOperations).toEqual([
      "setText",
      "setTextStyle",
      "setPageOrientation",
      "setNumberFormat",
    ]);
    expect(raw).not.toMatch(
      /"type":\s*"(?:addChart|addField|addDataset|changeSql|addParameter|changeGroup)"/u,
    );
  });

  it("requires synthetic, credential-free, MIT-licensed provenance plans", async () => {
    const index = rdlStructureCorpusIndexSchema.parse(
      JSON.parse(await readFile(indexPath, "utf8")),
    );
    for (const fixture of index.fixtures) {
      expect(fixture.provenance).toMatchObject({
        authoringApplication: "Microsoft Power BI Report Builder",
        author: "Dylan Laewe",
        ownership: "personally authored synthetic fixture",
        license: "MIT",
      });
      expect(fixture.syntheticDataDesign).toMatchObject({
        containsCredentials: false,
        containsProprietaryContent: false,
      });
    }
  });
});
