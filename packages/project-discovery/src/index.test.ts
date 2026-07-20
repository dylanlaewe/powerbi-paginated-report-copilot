import { mkdtemp, mkdir, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { discoverPowerBiProject } from "./index";

const fixture = async (): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), "pbip-discovery-"));
  await mkdir(join(root, "Sales.Report", "definition"), { recursive: true });
  await mkdir(join(root, "Sales.SemanticModel", "definition"), {
    recursive: true,
  });
  await writeFile(
    join(root, "Sales.pbip"),
    JSON.stringify({
      artifacts: [
        { report: { path: "Sales.Report" } },
        { semanticModel: { path: "Sales.SemanticModel" } },
      ],
    }),
  );
  return root;
};
describe("discoverPowerBiProject", () => {
  it("discovers configured PBIR and TMDL artifacts", async () => {
    const project = await discoverPowerBiProject(await fixture());
    expect(project.format).toEqual({ pbip: true, pbir: true, tmdl: true });
  });
  it("rejects a missing PBIP", async () => {
    const root = await mkdtemp(join(tmpdir(), "pbip-empty-"));
    await expect(discoverPowerBiProject(root)).rejects.toMatchObject({
      code: "MISSING_PBIP",
    });
  });
  it("rejects a symlink escaping the project", async () => {
    const root = await mkdtemp(join(tmpdir(), "pbip-unsafe-"));
    const outside = await mkdtemp(join(tmpdir(), "pbip-outside-"));
    await mkdir(join(root, "Sales.SemanticModel"));
    await symlink(outside, join(root, "Sales.Report"));
    await writeFile(
      join(root, "Sales.pbip"),
      JSON.stringify({
        artifacts: [
          { report: { path: "Sales.Report" } },
          { semanticModel: { path: "Sales.SemanticModel" } },
        ],
      }),
    );
    await expect(discoverPowerBiProject(root)).rejects.toMatchObject({
      code: "MISSING_ARTIFACT",
    });
  });
});
