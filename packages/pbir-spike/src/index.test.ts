import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  atomicWrite,
  buildVisuals,
  hashTree,
  idFor,
  inspectTmdl,
  runSpike,
  selectBindings,
  spikeResultSchema,
  validateReferences,
  type SemanticInventory,
} from "./index";

const temporaryDirectories: string[] = [];
afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

const model: SemanticInventory = {
  tables: ["Sales Measures", "Beans", "Calendar"],
  columns: [
    {
      table: "Beans",
      name: "Origin Country",
      dataType: "string",
      hidden: false,
    },
    { table: "Calendar", name: "Date", dataType: "dateTime", hidden: false },
  ],
  measures: [
    { table: "Sales Measures", name: "Revenue", expression: "SUMX(...)" },
  ],
  relationshipCount: 2,
};

describe("PBIR spike primitives", () => {
  it("creates stable, distinct PBIR identifiers", () => {
    expect(idFor("page")).toBe(idFor("page"));
    expect(idFor("page")).not.toBe(idFor("visual"));
    expect(idFor("page")).toMatch(/^[a-f0-9]{20}$/);
  });

  it("selects real measure, category, and date bindings", () => {
    expect(selectBindings(model)).toEqual({
      kpi: model.measures[0],
      category: model.columns[0],
      slicer: model.columns[1],
    });
  });

  it("fails clearly without an existing measure", () => {
    expect(() => selectBindings({ ...model, measures: [] })).toThrow(
      "No existing measure",
    );
  });

  it("builds three uniquely identified bound visuals", () => {
    const bindings = selectBindings(model);
    const visuals = buildVisuals(
      "https://example/schema.json",
      bindings,
      "seed",
    );
    expect(visuals).toHaveLength(3);
    expect(new Set(visuals.map(({ id }) => id)).size).toBe(3);
    expect(JSON.stringify(visuals)).toContain("clusteredColumnChart");
    expect(() => validateReferences(model, bindings, visuals)).not.toThrow();
  });

  it("rejects a binding absent from the semantic inventory", () => {
    const bindings = {
      ...selectBindings(model),
      kpi: { ...model.measures[0]!, name: "Fabricated" },
    };
    expect(() =>
      validateReferences(
        model,
        bindings,
        buildVisuals("schema", bindings, "seed"),
      ),
    ).toThrow("Unknown measure binding");
  });

  it("writes valid JSON atomically and replaces existing content", async () => {
    const directory = await mkdtemp(join(tmpdir(), "pbir-atomic-"));
    temporaryDirectories.push(directory);
    const path = join(directory, "value.json");
    await writeFile(path, "{}\n");
    await atomicWrite(path, '{"safe":true}\n');
    expect(JSON.parse(await readFile(path, "utf8"))).toEqual({ safe: true });
  });

  it("does not replace the target with invalid JSON", async () => {
    const directory = await mkdtemp(join(tmpdir(), "pbir-invalid-"));
    temporaryDirectories.push(directory);
    const path = join(directory, "value.json");
    await writeFile(path, '{"original":true}\n');
    await expect(atomicWrite(path, "not-json")).rejects.toThrow();
    expect(JSON.parse(await readFile(path, "utf8"))).toEqual({
      original: true,
    });
  });

  it("inspects fixture TMDL without inventing model objects", async () => {
    const inventory = await inspectTmdl(
      resolve("samples/known-valid-project/Roastery.SemanticModel"),
    );
    expect(inventory.measures).toContainEqual(
      expect.objectContaining({ table: "Sales Measures", name: "Revenue" }),
    );
    expect(inventory.columns).toContainEqual(
      expect.objectContaining({ table: "Beans", name: "Origin Country" }),
    );
  });

  it("generates in a copied PBIP and preserves the source", async () => {
    const output = await mkdtemp(join(tmpdir(), "pbir-spike-"));
    temporaryDirectories.push(output);
    const source = resolve("samples/known-valid-project");
    const before = await hashTree(source);
    const result = await runSpike({
      projectFile: join(source, "Roastery.pbip"),
      outputDirectory: join(output, "generated"),
      runId: "test-run",
      validate: false,
    });
    expect(spikeResultSchema.parse(result).status).toBe(
      "STRUCTURALLY_VALIDATED",
    );
    expect(result["authored"]).toEqual(
      expect.objectContaining({
        page: "AI Generation Spike",
        pageId: idFor(`${join(source, "Roastery.pbip")}:AI Generation Spike`),
      }),
    );
    expect(await hashTree(source)).toEqual(before);
  });
});
