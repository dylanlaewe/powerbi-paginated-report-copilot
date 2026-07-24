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
  it("runtime-validates exactly one fixture per required category", async () => {
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

  it("records the accepted simple-table identity while later fixtures remain pending", async () => {
    const index = rdlStructureCorpusIndexSchema.parse(
      JSON.parse(await readFile(indexPath, "utf8")),
    );
    const [simpleTable, ...pending] = index.fixtures;
    expect(simpleTable).toMatchObject({
      id: "simple-table",
      status: "authoredValidated",
      sourceSha256:
        "e3a34afe7c29c9f773098d9f5bfd65ad2cf60219f78999d46a447250bb2448e3",
      namespace:
        "http://schemas.microsoft.com/sqlserver/reporting/2016/01/reportdefinition",
      reportBuilderBaseline: {
        open: "PASS",
        preview: "PASS — 1 page",
        pdf: "PASS — 1 page",
        excel: "PASS — 1 worksheet",
      },
    });
    for (const fixture of pending) {
      expect(fixture).toMatchObject({
        status: "proposed",
        sourceSha256: null,
        namespace: null,
        reportBuilderBaseline: {
          open: "pending Gate 2",
          preview: "pending Gate 2",
          pdf: "pending Gate 2",
          excel: "pending Gate 2",
        },
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
