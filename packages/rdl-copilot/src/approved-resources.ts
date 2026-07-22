import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

export const approvedTemplateFileName = "06b-production-pagination-letter.rdl";
export const approvedSchemaFileName = "ReportDefinition-2016.xsd";
export const approvedTemplateSha256 =
  "c2d27f7595d9330eb9815f86483aa068129265a00980ca3b0b956f6f3f1de17a";
export const packagedResourceDirectoryName = "approved-report-resources";

export interface ApprovedReportResources {
  templatePath: string;
  schemaPath: string;
  source: "development" | "packaged";
  repositoryRoot?: string;
}

export class ApprovedResourceError extends Error {
  constructor(
    public readonly code:
      | "MONOREPO_ROOT_NOT_FOUND"
      | "RESOURCE_OUTSIDE_ROOT"
      | "TEMPLATE_MISSING"
      | "SCHEMA_MISSING"
      | "TEMPLATE_CHECKSUM_MISMATCH",
    message: string,
  ) {
    super(message);
    this.name = "ApprovedResourceError";
  }
}

const isInside = (root: string, path: string): boolean => {
  const child = relative(root, path);
  return child !== "" && !child.startsWith("..") && !isAbsolute(child);
};

export const findMonorepoRoot = (startPaths: readonly string[]): string => {
  for (const startPath of startPaths) {
    let current = resolve(startPath);
    if (existsSync(current) && statSync(current).isFile())
      current = dirname(current);
    while (true) {
      if (existsSync(join(current, "pnpm-workspace.yaml"))) return current;
      const parent = dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }
  throw new ApprovedResourceError(
    "MONOREPO_ROOT_NOT_FOUND",
    `Could not find pnpm-workspace.yaml from: ${startPaths.join(", ")}`,
  );
};

const verifyResources = (
  templatePath: string,
  schemaPath: string,
  allowedRoot: string,
  source: "development" | "packaged",
  repositoryRoot?: string,
): ApprovedReportResources => {
  if (!existsSync(templatePath))
    throw new ApprovedResourceError(
      "TEMPLATE_MISSING",
      `Approved template does not exist: ${templatePath}`,
    );
  if (!existsSync(schemaPath))
    throw new ApprovedResourceError(
      "SCHEMA_MISSING",
      `Approved schema does not exist: ${schemaPath}`,
    );
  const canonicalRoot = realpathSync(allowedRoot);
  const canonicalTemplate = realpathSync(templatePath);
  const canonicalSchema = realpathSync(schemaPath);
  if (
    !isInside(canonicalRoot, canonicalTemplate) ||
    !isInside(canonicalRoot, canonicalSchema)
  )
    throw new ApprovedResourceError(
      "RESOURCE_OUTSIDE_ROOT",
      `Approved resource escaped its root: ${canonicalTemplate}`,
    );
  const checksum = createHash("sha256")
    .update(readFileSync(canonicalTemplate))
    .digest("hex");
  if (checksum !== approvedTemplateSha256)
    throw new ApprovedResourceError(
      "TEMPLATE_CHECKSUM_MISMATCH",
      `Approved template checksum mismatch at ${canonicalTemplate}: ${checksum}`,
    );
  return {
    templatePath: canonicalTemplate,
    schemaPath: canonicalSchema,
    source,
    ...(repositoryRoot ? { repositoryRoot } : {}),
  };
};

export const resolveDevelopmentApprovedResources = (
  startPaths: readonly string[],
): ApprovedReportResources => {
  const root = findMonorepoRoot(startPaths);
  return verifyResources(
    join(root, "artifacts/rdl-compatibility-ladder", approvedTemplateFileName),
    join(root, "packages/rdl-spike/schema", approvedSchemaFileName),
    root,
    "development",
    root,
  );
};

export const resolvePackagedApprovedResources = (
  resourcesPath: string,
): ApprovedReportResources => {
  const root = resolve(resourcesPath);
  const approvedDirectory = join(root, packagedResourceDirectoryName);
  return verifyResources(
    join(approvedDirectory, approvedTemplateFileName),
    join(approvedDirectory, approvedSchemaFileName),
    root,
    "packaged",
  );
};

export const resolveApprovedReportResources = (options: {
  isPackaged: boolean;
  appPath: string;
  mainModulePath: string;
  resourcesPath: string;
}): ApprovedReportResources =>
  options.isPackaged
    ? resolvePackagedApprovedResources(options.resourcesPath)
    : resolveDevelopmentApprovedResources([
        options.appPath,
        options.mainModulePath,
      ]);
