import { createHash } from "node:crypto";
import { readdir, readFile, realpath, stat } from "node:fs/promises";
import { basename, isAbsolute, relative, resolve, sep } from "node:path";
import {
  powerBiProjectSchema,
  type PowerBiProject,
} from "@powerbi-copilot/domain";
import { z } from "zod";

const pbipSchema = z
  .object({
    artifacts: z
      .array(z.record(z.string(), z.object({ path: z.string().min(1) })))
      .optional(),
  })
  .passthrough();
type ArtifactKind = "report" | "semanticModel";

export class ProjectDiscoveryError extends Error {
  constructor(
    public readonly code:
      | "INVALID_ROOT"
      | "MISSING_PBIP"
      | "MULTIPLE_PBIP"
      | "MALFORMED_PBIP"
      | "MISSING_ARTIFACT"
      | "UNSAFE_PATH",
    message: string,
  ) {
    super(message);
    this.name = "ProjectDiscoveryError";
  }
}

const contained = (root: string, candidate: string): boolean => {
  const path = relative(root, candidate);
  return (
    path === "" ||
    (!path.startsWith(`..${sep}`) && path !== ".." && !isAbsolute(path))
  );
};
const artifactPath = (
  artifacts: z.infer<typeof pbipSchema>["artifacts"],
  kind: ArtifactKind,
): string | undefined => artifacts?.find((item) => item[kind])?.[kind]?.path;
const resolveArtifact = async (
  root: string,
  configured: string | undefined,
  suffix: string,
): Promise<string> => {
  const entries = configured
    ? []
    : await readdir(root, { withFileTypes: true });
  const fallback = entries.find(
    (entry) => entry.isDirectory() && entry.name.endsWith(suffix),
  );
  const candidate = configured
    ? resolve(root, configured)
    : fallback
      ? resolve(root, fallback.name)
      : undefined;
  if (!candidate || !contained(root, candidate))
    throw new ProjectDiscoveryError(
      "UNSAFE_PATH",
      `${suffix} path escapes the selected project`,
    );
  try {
    const canonical = await realpath(candidate);
    if (!contained(root, canonical) || !(await stat(canonical)).isDirectory())
      throw new Error("unsafe");
    return canonical;
  } catch {
    throw new ProjectDiscoveryError(
      "MISSING_ARTIFACT",
      `Required ${suffix} directory is missing or unsafe`,
    );
  }
};
const hasDirectory = async (path: string): Promise<boolean> => {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
};

export const discoverPowerBiProject = async (
  selectedRoot: string,
): Promise<PowerBiProject> => {
  let root: string;
  try {
    root = await realpath(selectedRoot);
    if (!(await stat(root)).isDirectory()) throw new Error();
  } catch {
    throw new ProjectDiscoveryError(
      "INVALID_ROOT",
      "Select an existing project directory",
    );
  }
  const files = (await readdir(root, { withFileTypes: true })).filter(
    (entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".pbip"),
  );
  if (files.length === 0)
    throw new ProjectDiscoveryError(
      "MISSING_PBIP",
      "No .pbip project file was found",
    );
  if (files.length > 1)
    throw new ProjectDiscoveryError(
      "MULTIPLE_PBIP",
      "Select a folder containing exactly one .pbip file",
    );
  const pbipFile = resolve(root, files[0]!.name);
  let definition: z.infer<typeof pbipSchema>;
  try {
    definition = pbipSchema.parse(JSON.parse(await readFile(pbipFile, "utf8")));
  } catch {
    throw new ProjectDiscoveryError(
      "MALFORMED_PBIP",
      "The .pbip file is not valid supported JSON",
    );
  }
  const reportDirectory = await resolveArtifact(
    root,
    artifactPath(definition.artifacts, "report"),
    ".Report",
  );
  const semanticModelDirectory = await resolveArtifact(
    root,
    artifactPath(definition.artifacts, "semanticModel"),
    ".SemanticModel",
  );
  return powerBiProjectSchema.parse({
    id: createHash("sha256").update(root).digest("hex").slice(0, 16),
    name: basename(pbipFile, ".pbip"),
    paths: { root, pbipFile, reportDirectory, semanticModelDirectory },
    format: {
      pbip: true,
      pbir: await hasDirectory(resolve(reportDirectory, "definition")),
      tmdl: await hasDirectory(resolve(semanticModelDirectory, "definition")),
    },
  });
};
