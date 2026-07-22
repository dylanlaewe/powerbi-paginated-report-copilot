import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveDevelopmentApprovedResources } from "@powerbi-copilot/rdl-copilot";
import {
  approvedTemplateLoadMessage,
  controlledOutputDirectory,
  controlledReportFileName,
  generateFromUiRequest,
  resolveElectronApprovedResources,
} from "./report-generation";

const directories: string[] = [];
const canonicalRequest = resolve("examples/regional-sales-request.txt");
const canonicalReport = resolve(
  "artifacts/copilot-mvp/regional-sales-generated.rdl",
);
const resources = resolveDevelopmentApprovedResources([import.meta.dirname]);

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((path) => rm(path, { recursive: true })),
  );
});

describe("Electron report generation service", () => {
  it("generates byte-identical CLI/UI output in the controlled folder", async () => {
    const directory = await mkdtemp(join(tmpdir(), "rdl-ui-"));
    directories.push(directory);
    const outputRoot = controlledOutputDirectory(directory);
    const result = await generateFromUiRequest(
      await readFile(canonicalRequest, "utf8"),
      outputRoot,
      resources,
    );
    expect(result.status).toBe("generated");
    if (result.status !== "generated") return;
    expect(result.outputPath).toBe(join(outputRoot, controlledReportFileName));
    expect(await readFile(result.outputPath)).toEqual(
      await readFile(canonicalReport),
    );
    expect(result.sha256).toBe(
      createHash("sha256")
        .update(await readFile(canonicalReport))
        .digest("hex"),
    );
  });

  it("returns displayable errors for invalid and rejected-template requests", async () => {
    const invalid = await generateFromUiRequest(
      "not a report",
      tmpdir(),
      resources,
    );
    expect(invalid.status).toBe("error");
    const rejected = await generateFromUiRequest(
      'Create a report titled "No" using the custom template with data: []',
      tmpdir(),
      resources,
    );
    expect(rejected).toEqual({
      status: "error",
      message: "Only the accepted production-pagination template is allowed",
    });
  });

  it("never derives an output path from renderer input", () => {
    const root = controlledOutputDirectory("/safe/application-data");
    expect(join(root, controlledReportFileName)).toBe(
      "/safe/application-data/generated-reports/regional-sales-generated.rdl",
    );
    expect(controlledReportFileName).not.toContain("..");
  });

  it("returns a controlled missing-template error and logs detail only internally", () => {
    const log = vi.fn();
    const resolution = resolveElectronApprovedResources(
      {
        isPackaged: false,
        appPath: "/definitely/not/a/repository",
        mainModulePath: "/also/missing",
        resourcesPath: "/unused",
      },
      log,
    );
    expect(resolution).toEqual({
      status: "error",
      message: approvedTemplateLoadMessage,
    });
    expect(log).toHaveBeenCalledOnce();
    expect(JSON.stringify(resolution)).not.toContain("/definitely");
  });
});
