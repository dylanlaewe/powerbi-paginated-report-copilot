import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  ApprovedResourceError,
  approvedSchemaFileName,
  approvedTemplateFileName,
  findMonorepoRoot,
  packagedResourceDirectoryName,
  resolveDevelopmentApprovedResources,
  resolveApprovedReportResources,
  resolvePackagedApprovedResources,
} from "./approved-resources";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((path) => rm(path, { recursive: true })),
  );
});

const stagePackagedResources = async (root: string) => {
  const destination = join(root, packagedResourceDirectoryName);
  await mkdir(destination, { recursive: true });
  await copyFile(
    join(
      repositoryRoot,
      "artifacts/rdl-compatibility-ladder",
      approvedTemplateFileName,
    ),
    join(destination, approvedTemplateFileName),
  );
  await copyFile(
    join(repositoryRoot, "packages/rdl-spike/schema", approvedSchemaFileName),
    join(destination, approvedSchemaFileName),
  );
  return destination;
};

const expectResourceCode = (operation: () => unknown, code: string) => {
  try {
    operation();
    throw new Error("Expected resource resolution to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(ApprovedResourceError);
    expect((error as ApprovedResourceError).code).toBe(code);
  }
};

describe("approved report resource resolution", () => {
  it("finds the monorepo from root, apps/desktop, and compiled main", () => {
    expect(findMonorepoRoot([repositoryRoot])).toBe(repositoryRoot);
    expect(findMonorepoRoot([join(repositoryRoot, "apps/desktop")])).toBe(
      repositoryRoot,
    );
    const resources = resolveDevelopmentApprovedResources([
      join(repositoryRoot, "apps/desktop/out/main"),
    ]);
    expect(resources.repositoryRoot).toBe(repositoryRoot);
    expect(resources.templatePath).toBe(
      join(
        repositoryRoot,
        "artifacts/rdl-compatibility-ladder",
        approvedTemplateFileName,
      ),
    );
  });

  it("generates from apps/desktop without depending on process.cwd", async () => {
    const directory = await mkdtemp(join(tmpdir(), "rdl-cwd-"));
    directories.push(directory);
    const output = join(directory, "from-desktop.rdl");
    execFileSync(
      "pnpm",
      [
        "--dir",
        repositoryRoot,
        "copilot:generate",
        "--request",
        join(repositoryRoot, "examples/regional-sales-request.txt"),
        "--output",
        output,
      ],
      { cwd: join(repositoryRoot, "apps/desktop"), stdio: "pipe" },
    );
    expect(await readFile(output)).toEqual(
      await readFile(
        join(
          repositoryRoot,
          "artifacts/copilot-mvp/regional-sales-generated.rdl",
        ),
      ),
    );
  });

  it("uses process.resourcesPath's explicit packaged directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "rdl-packaged-"));
    directories.push(root);
    await stagePackagedResources(root);
    const resources = resolveApprovedReportResources({
      isPackaged: true,
      resourcesPath: root,
      appPath: "/ignored/in/packaged/mode",
      mainModulePath: "/ignored/in/packaged/mode",
    });
    expect(resources.source).toBe("packaged");
    expect(resources.templatePath).toBe(
      realpathSync(
        join(root, packagedResourceDirectoryName, approvedTemplateFileName),
      ),
    );
  });

  it("rejects missing and checksum-mismatched templates", async () => {
    const missing = await mkdtemp(join(tmpdir(), "rdl-missing-"));
    directories.push(missing);
    expectResourceCode(
      () => resolvePackagedApprovedResources(missing),
      "TEMPLATE_MISSING",
    );

    const wrong = await mkdtemp(join(tmpdir(), "rdl-wrong-"));
    directories.push(wrong);
    const destination = await stagePackagedResources(wrong);
    await writeFile(join(destination, approvedTemplateFileName), "wrong");
    expectResourceCode(
      () => resolvePackagedApprovedResources(wrong),
      "TEMPLATE_CHECKSUM_MISMATCH",
    );
  });

  it("rejects a fixed-name resource that escapes through a symlink", async () => {
    const root = await mkdtemp(join(tmpdir(), "rdl-escape-"));
    directories.push(root);
    const destination = await stagePackagedResources(root);
    const template = join(destination, approvedTemplateFileName);
    await unlink(template);
    await symlink(
      join(
        repositoryRoot,
        "artifacts/rdl-compatibility-ladder",
        approvedTemplateFileName,
      ),
      template,
    );
    expectResourceCode(
      () => resolvePackagedApprovedResources(root),
      "RESOURCE_OUTSIDE_ROOT",
    );
  });
});
