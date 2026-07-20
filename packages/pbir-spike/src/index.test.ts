import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
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

  it("generates a KPI card bound to the discovered measure", () => {
    const [card] = buildVisuals("schema", selectBindings(model), "seed");
    expect(JSON.stringify(card)).toContain('"visualType":"cardVisual"');
    expect(JSON.stringify(card)).toContain('"Property":"Revenue"');
  });

  it("generates a column chart with category and value roles", () => {
    const chart = buildVisuals("schema", selectBindings(model), "seed")[1];
    expect(JSON.stringify(chart)).toContain(
      '"visualType":"clusteredColumnChart"',
    );
    expect(JSON.stringify(chart)).toContain('"Category"');
    expect(JSON.stringify(chart)).toContain('"Y"');
  });

  it("generates a Between slicer for a discovered date", () => {
    const slicer = buildVisuals("schema", selectBindings(model), "seed")[2];
    expect(JSON.stringify(slicer)).toContain('"visualType":"slicer"');
    expect(JSON.stringify(slicer)).toContain("'Between'");
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

  it("rejects duplicate visual identifiers", () => {
    const bindings = selectBindings(model);
    const visuals = buildVisuals("schema", bindings, "seed");
    visuals[1] = { ...visuals[1]!, id: visuals[0]!.id };
    expect(() => validateReferences(model, bindings, visuals)).toThrow(
      "Duplicate visual identifiers",
    );
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

  it("discovers fixture semantic tables", async () => {
    const inventory = await inspectTmdl(
      resolve("samples/known-valid-project/Roastery.SemanticModel"),
    );
    expect(inventory.tables).toContain("Beans");
  });

  it("discovers fixture semantic columns and data types", async () => {
    const inventory = await inspectTmdl(
      resolve("samples/known-valid-project/Roastery.SemanticModel"),
    );
    expect(inventory.columns).toContainEqual(
      expect.objectContaining({ name: "Date", dataType: "dateTime" }),
    );
  });

  it("discovers fixture measures and expressions", async () => {
    const inventory = await inspectTmdl(
      resolve("samples/known-valid-project/Roastery.SemanticModel"),
    );
    expect(
      inventory.measures.find(({ name }) => name === "Revenue")?.expression,
    ).toContain("SUMX");
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

describe("generated PBIP evidence", () => {
  let root: string;
  let output: string;
  let result: Record<string, unknown>;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), "pbir-evidence-"));
    output = join(root, "generated");
    result = await runSpike({
      projectFile: resolve("samples/known-valid-project/Roastery.pbip"),
      outputDirectory: output,
      runId: "evidence-run",
      validate: false,
    });
  });
  afterAll(async () => rm(root, { recursive: true, force: true }));

  it("copies the PBIP project into the disposable output", async () => {
    expect((await stat(join(output, "Roastery.pbip"))).isFile()).toBe(true);
  });

  it("creates and verifies a backup manifest", async () => {
    const backup = result["backup"] as { directory: string; verified: boolean };
    expect(backup.verified).toBe(true);
    const manifest = JSON.parse(
      await readFile(join(backup.directory, "manifest.json"), "utf8"),
    ) as { files: unknown[] };
    expect(manifest.files).toHaveLength(1);
  });

  it("creates the expected PBIR page and visual files", async () => {
    const changed = result["changedFiles"] as string[];
    expect(changed).toHaveLength(5);
    await Promise.all(changed.map((path) => stat(join(output, path))));
  });

  it("creates a machine-readable result manifest", async () => {
    const manifest = JSON.parse(
      await readFile(
        join(output, ".spike-results/evidence-run/result.json"),
        "utf8",
      ),
    ) as unknown;
    expect(spikeResultSchema.parse(manifest).status).toBe(
      "STRUCTURALLY_VALIDATED",
    );
  });

  it("creates a human-readable semantic diff", async () => {
    const diff = await readFile(
      join(output, ".spike-results/evidence-run/diff.txt"),
      "utf8",
    );
    expect(diff).toContain("+ Page: AI Generation Spike");
    expect(diff).toContain("+ KPI: Sales Measures[Revenue]");
  });
});
