import { createHash } from "node:crypto";
import {
  cp,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { discoverPowerBiProject } from "@powerbi-copilot/project-discovery";
import { z } from "zod";

export interface SemanticColumn {
  table: string;
  name: string;
  dataType: string;
  hidden: boolean;
}
export interface SemanticMeasure {
  table: string;
  name: string;
  expression: string;
  formatString?: string;
}
export interface SemanticInventory {
  tables: string[];
  columns: SemanticColumn[];
  measures: SemanticMeasure[];
  relationshipCount: number;
}
export interface Bindings {
  kpi: SemanticMeasure;
  category: SemanticColumn;
  slicer?: SemanticColumn;
}

const cleanName = (value: string): string =>
  value.trim().replace(/^'|'$/g, "").replaceAll("''", "'");
const sha256 = (value: string | Buffer): string =>
  createHash("sha256").update(value).digest("hex");
export const idFor = (seed: string): string => sha256(seed).slice(0, 20);
const json = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;
export const atomicWrite = async (
  path: string,
  content: string,
): Promise<void> => {
  const temporary = `${path}.spike-${process.pid}.tmp`;
  await writeFile(temporary, content, { flag: "wx" });
  JSON.parse(await readFile(temporary, "utf8"));
  await rename(temporary, path);
};

export const hashTree = async (
  root: string,
): Promise<Record<string, string>> => {
  const result: Record<string, string> = {};
  const visit = async (directory: string): Promise<void> => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile())
        result[relative(root, path)] = sha256(await readFile(path));
    }
  };
  await visit(root);
  return Object.fromEntries(
    Object.entries(result).sort(([a], [b]) => a.localeCompare(b)),
  );
};

export const inspectTmdl = async (
  semanticModelDirectory: string,
): Promise<SemanticInventory> => {
  const tableDirectory = join(semanticModelDirectory, "definition", "tables");
  const tables: string[] = [],
    columns: SemanticColumn[] = [],
    measures: SemanticMeasure[] = [];
  for (const file of (await readdir(tableDirectory))
    .filter((name) => name.endsWith(".tmdl"))
    .sort()) {
    const lines = (await readFile(join(tableDirectory, file), "utf8")).split(
      /\r?\n/,
    );
    const tableMatch = lines
      .find((line) => line.startsWith("table "))
      ?.match(/^table (.+)$/);
    if (!tableMatch) continue;
    const table = cleanName(tableMatch[1]!);
    tables.push(table);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index]!;
      const column = line.match(/^\tcolumn (.+)$/);
      if (column) {
        const name = cleanName(column[1]!);
        let dataType = "unknown",
          hidden = false;
        for (
          let cursor = index + 1;
          cursor < lines.length && lines[cursor]!.startsWith("\t\t");
          cursor += 1
        ) {
          const property = lines[cursor]!;
          if (property.includes("dataType:"))
            dataType = property.split(":")[1]!.trim();
          if (property.trim() === "isHidden") hidden = true;
        }
        columns.push({ table, name, dataType, hidden });
      }
      const measure = line.match(/^\tmeasure (.+?) = (.+)$/);
      if (measure) {
        const item: SemanticMeasure = {
          table,
          name: cleanName(measure[1]!),
          expression: measure[2]!.trim(),
        };
        const format = lines
          .slice(index + 1, index + 5)
          .find((value) => value.startsWith("\t\tformatString:"));
        if (format)
          item.formatString = format.slice(format.indexOf(":") + 1).trim();
        measures.push(item);
      }
    }
  }
  const relationshipsPath = join(
    semanticModelDirectory,
    "definition",
    "relationships.tmdl",
  );
  const relationships = await readFile(relationshipsPath, "utf8").catch(
    () => "",
  );
  return {
    tables,
    columns,
    measures,
    relationshipCount: relationships
      .split(/\r?\n/)
      .filter((line) => /^relationship\s/.test(line.trim())).length,
  };
};

export const selectBindings = (model: SemanticInventory): Bindings => {
  const kpi = [...model.measures].sort(
    (a, b) =>
      Number(/revenue|sales|total/i.test(b.name)) -
      Number(/revenue|sales|total/i.test(a.name)),
  )[0];
  if (!kpi) throw new Error("No existing measure is available for the KPI");
  const visibleText = model.columns.filter(
    (column) => !column.hidden && column.dataType === "string",
  );
  const category = [...visibleText].sort(
    (a, b) =>
      Number(/category|origin|region|segment/i.test(b.name)) -
      Number(/category|origin|region|segment/i.test(a.name)),
  )[0];
  if (!category)
    throw new Error("No categorical column is available for the chart");
  const slicer =
    model.columns.find(
      (column) => !column.hidden && /date/i.test(column.dataType),
    ) ??
    visibleText.find((column) => /region|category|origin/i.test(column.name));
  return slicer ? { kpi, category, slicer } : { kpi, category };
};

const measureProjection = (measure: SemanticMeasure) => ({
  field: {
    Measure: {
      Expression: { SourceRef: { Entity: measure.table } },
      Property: measure.name,
    },
  },
  queryRef: `${measure.table}.${measure.name}`,
  nativeQueryRef: measure.name,
});
const columnProjection = (column: SemanticColumn, active = false) => ({
  field: {
    Column: {
      Expression: { SourceRef: { Entity: column.table } },
      Property: column.name,
    },
  },
  queryRef: `${column.table}.${column.name}`,
  nativeQueryRef: column.name,
  ...(active ? { active: true } : {}),
});

export const buildVisuals = (
  schema: string,
  bindings: Bindings,
  seed: string,
): Array<{ id: string; value: unknown }> => {
  const ids = ["card", "chart", "slicer"].map((kind) =>
    idFor(`${seed}:${kind}`),
  );
  const title = (text: string) => ({
    title: [
      {
        properties: {
          show: { expr: { Literal: { Value: "true" } } },
          text: { expr: { Literal: { Value: `'${text}'` } } },
        },
      },
    ],
  });
  const visuals: Array<{ id: string; value: unknown }> = [
    {
      id: ids[0]!,
      value: {
        $schema: schema,
        name: ids[0],
        position: {
          x: 24,
          y: 24,
          z: 1000,
          height: 160,
          width: 360,
          tabOrder: 1000,
        },
        visual: {
          visualType: "cardVisual",
          query: {
            queryState: {
              Data: { projections: [measureProjection(bindings.kpi)] },
            },
          },
          objects: {
            outline: [
              {
                properties: { show: { expr: { Literal: { Value: "false" } } } },
                selector: { id: "default" },
              },
            ],
          },
          visualContainerObjects: title(bindings.kpi.name),
        },
      },
    },
    {
      id: ids[1]!,
      value: {
        $schema: schema,
        name: ids[1],
        position: {
          x: 24,
          y: 208,
          z: 2000,
          height: 488,
          width: 824,
          tabOrder: 2000,
        },
        visual: {
          visualType: "clusteredColumnChart",
          query: {
            queryState: {
              Category: {
                projections: [columnProjection(bindings.category, true)],
              },
              Y: { projections: [measureProjection(bindings.kpi)] },
            },
          },
          objects: {
            dataPoint: [
              {
                properties: {
                  defaultColor: {
                    solid: {
                      color: { expr: { Literal: { Value: "'#2E6F9E'" } } },
                    },
                  },
                },
              },
            ],
          },
          visualContainerObjects: title(
            `${bindings.kpi.name} by ${bindings.category.name}`,
          ),
        },
      },
    },
  ];
  if (bindings.slicer) {
    visuals.push({
      id: ids[2]!,
      value: {
        $schema: schema,
        name: ids[2],
        position: {
          x: 872,
          y: 24,
          z: 3000,
          height: 160,
          width: 384,
          tabOrder: 3000,
        },
        visual: {
          visualType: "slicer",
          query: {
            queryState: {
              Values: { projections: [columnProjection(bindings.slicer)] },
            },
          },
          objects: {
            data: [
              {
                properties: {
                  mode: {
                    expr: {
                      Literal: {
                        Value: /date/i.test(bindings.slicer.dataType)
                          ? "'Between'"
                          : "'Dropdown'",
                      },
                    },
                  },
                },
              },
            ],
            header: [
              {
                properties: {
                  show: { expr: { Literal: { Value: "true" } } },
                  text: {
                    expr: { Literal: { Value: `'${bindings.slicer.name}'` } },
                  },
                },
              },
            ],
          },
          visualContainerObjects: {
            padding: [
              {
                properties: Object.fromEntries(
                  ["top", "bottom", "left", "right"].map((key) => [
                    key,
                    { expr: { Literal: { Value: "8D" } } },
                  ]),
                ),
              },
            ],
          },
        },
      },
    });
  }
  return visuals;
};

export const validateReferences = (
  model: SemanticInventory,
  bindings: Bindings,
  visuals: Array<{ id: string; value: unknown }>,
): void => {
  if (new Set(visuals.map(({ id }) => id)).size !== visuals.length)
    throw new Error("Duplicate visual identifiers");
  const measures = new Set(
    model.measures.map(({ table, name }) => `${table}\u0000${name}`),
  );
  const columns = new Set(
    model.columns.map(({ table, name }) => `${table}\u0000${name}`),
  );
  if (!measures.has(`${bindings.kpi.table}\u0000${bindings.kpi.name}`))
    throw new Error(
      `Unknown measure binding: ${bindings.kpi.table}[${bindings.kpi.name}]`,
    );
  for (const column of [bindings.category, bindings.slicer].filter(
    (item): item is SemanticColumn => item !== undefined,
  )) {
    if (!columns.has(`${column.table}\u0000${column.name}`))
      throw new Error(
        `Unknown column binding: ${column.table}[${column.name}]`,
      );
  }
  const text = JSON.stringify(visuals.map(({ value }) => value));
  for (const reference of [
    bindings.kpi.table,
    bindings.kpi.name,
    bindings.category.table,
    bindings.category.name,
    ...(bindings.slicer ? [bindings.slicer.table, bindings.slicer.name] : []),
  ])
    if (!text.includes(JSON.stringify(reference)))
      throw new Error(`Missing semantic reference: ${reference}`);
};

export interface SpikeOptions {
  projectFile: string;
  outputDirectory: string;
  runId?: string;
  validate?: boolean;
}
interface ValidatorEnvelope {
  data?: {
    result?: string;
    errorCount?: number;
    warningCount?: number;
    diagnostics?: Record<string, unknown>;
  };
}
export const runSpike = async (
  options: SpikeOptions,
): Promise<Record<string, unknown>> => {
  const sourceFile = resolve(options.projectFile),
    sourceRoot = dirname(sourceFile),
    output = resolve(options.outputDirectory);
  if (!(await stat(sourceFile)).isFile() || !sourceFile.endsWith(".pbip"))
    throw new Error("--project must point to an existing .pbip file");
  const sourceHashes = await hashTree(sourceRoot);
  await rm(output, { recursive: true, force: true });
  await mkdir(dirname(output), { recursive: true });
  await cp(sourceRoot, output, { recursive: true });
  const project = await discoverPowerBiProject(output);
  const model = await inspectTmdl(project.paths.semanticModelDirectory);
  const bindings = selectBindings(model);
  const runId =
    options.runId ?? new Date().toISOString().replaceAll(/[-:.]/g, "");
  const backupDirectory = join(output, ".spike-backups", runId);
  await mkdir(backupDirectory, { recursive: true });
  const pagesPath = join(
    project.paths.reportDirectory,
    "definition",
    "pages",
    "pages.json",
  );
  const beforePages = await readFile(pagesPath, "utf8");
  const backupManifest = {
    runId,
    files: [{ path: relative(output, pagesPath), sha256: sha256(beforePages) }],
  };
  await writeFile(join(backupDirectory, "pages.json"), beforePages);
  await writeFile(join(backupDirectory, "manifest.json"), json(backupManifest));
  if (
    sha256(await readFile(join(backupDirectory, "pages.json"))) !==
    backupManifest.files[0]!.sha256
  )
    throw new Error("Backup verification failed");
  const pageMetadata = JSON.parse(beforePages) as {
    pageOrder: string[];
    $schema: string;
    activePageName?: string;
  };
  const existingPage = pageMetadata.pageOrder[0]!;
  const pageTemplate = JSON.parse(
    await readFile(
      join(
        project.paths.reportDirectory,
        "definition",
        "pages",
        existingPage,
        "page.json",
      ),
      "utf8",
    ),
  ) as { $schema: string };
  const visualTemplatePath = join(
    project.paths.reportDirectory,
    "definition",
    "pages",
    existingPage,
    "visuals",
  );
  const firstVisual = (await readdir(visualTemplatePath))[0]!;
  const visualSchema = (
    JSON.parse(
      await readFile(
        join(visualTemplatePath, firstVisual, "visual.json"),
        "utf8",
      ),
    ) as { $schema: string }
  ).$schema;
  const pageId = idFor(`${sourceFile}:AI Generation Spike`);
  if (pageMetadata.pageOrder.includes(pageId))
    throw new Error("Duplicate page identifier");
  const visuals = buildVisuals(visualSchema, bindings, pageId);
  validateReferences(model, bindings, visuals);
  const pageDirectory = join(
    project.paths.reportDirectory,
    "definition",
    "pages",
    pageId,
  );
  await mkdir(join(pageDirectory, "visuals"), { recursive: true });
  await atomicWrite(
    join(pageDirectory, "page.json"),
    json({
      $schema: pageTemplate.$schema,
      name: pageId,
      displayName: "AI Generation Spike",
      displayOption: "FitToPage",
      height: 720,
      width: 1280,
    }),
  );
  for (const visual of visuals) {
    const directory = join(pageDirectory, "visuals", visual.id);
    await mkdir(directory);
    await atomicWrite(join(directory, "visual.json"), json(visual.value));
  }
  pageMetadata.pageOrder.push(pageId);
  await atomicWrite(pagesPath, json(pageMetadata));
  const validator =
    options.validate === false
      ? {
          status: 0,
          stdout: JSON.stringify({ data: { result: "notExecuted" } }),
          stderr: "",
        }
      : spawnSync(
          "powerbi-report-author",
          ["validate", project.paths.reportDirectory, "--pretty"],
          { encoding: "utf8" },
        );
  if (validator.status !== 0)
    throw new Error(
      `Official PBIR validation failed: ${validator.stdout || validator.stderr}`,
    );
  const validation = JSON.parse(validator.stdout) as ValidatorEnvelope;
  const validatorResult = validation.data?.result ?? "unknown";
  const schemaStatus = validation.data?.diagnostics?.["PBIR_SCHEMA_UNREACHABLE"]
    ? "UNREACHABLE"
    : "EXECUTED";
  const resultDirectory = join(output, ".spike-results", runId);
  await mkdir(resultDirectory, { recursive: true });
  const changedFiles = [
    relative(output, pagesPath),
    relative(output, join(pageDirectory, "page.json")),
    ...visuals.map(({ id }) =>
      relative(output, join(pageDirectory, "visuals", id, "visual.json")),
    ),
  ];
  const result = {
    runId,
    status: "STRUCTURALLY_VALIDATED",
    desktopRendering: "PENDING_WINDOWS",
    sourceProject: sourceFile,
    workingCopy: join(output, basename(sourceFile)),
    detected: project.format,
    semanticModel: {
      tables: model.tables.length,
      columns: model.columns.length,
      measures: model.measures.length,
      relationships: model.relationshipCount,
    },
    bindings,
    authored: {
      page: "AI Generation Spike",
      pageId,
      visualIds: visuals.map(({ id }) => id),
    },
    backup: { directory: backupDirectory, verified: true },
    validation: { validatorResult, schemaStatus, payload: validation },
    changedFiles,
  };
  await writeFile(join(resultDirectory, "result.json"), json(result));
  await writeFile(
    join(resultDirectory, "diff.txt"),
    [
      `+ Page: AI Generation Spike (${pageId})`,
      `+ KPI: ${bindings.kpi.table}[${bindings.kpi.name}]`,
      `+ Chart: ${bindings.kpi.name} by ${bindings.category.table}[${bindings.category.name}]`,
      ...(bindings.slicer
        ? [`+ Slicer: ${bindings.slicer.table}[${bindings.slicer.name}]`]
        : []),
      ...changedFiles.map((path) => `M ${path}`),
      "",
      "Desktop rendering: PENDING WINDOWS",
    ].join("\n"),
  );
  if (
    JSON.stringify(await hashTree(sourceRoot)) !== JSON.stringify(sourceHashes)
  )
    throw new Error("Source fixture was modified");
  return result;
};

export const spikeResultSchema = z.object({
  status: z.literal("STRUCTURALLY_VALIDATED"),
  desktopRendering: z.literal("PENDING_WINDOWS"),
  changedFiles: z.array(z.string()).min(4),
});
