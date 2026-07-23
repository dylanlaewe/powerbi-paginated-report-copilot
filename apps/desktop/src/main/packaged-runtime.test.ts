import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "../../../..");
const desktopPackagePath = resolve(repositoryRoot, "apps/desktop/package.json");
interface DesktopPackage {
  build: {
    win: { target: { target: string; arch: string[] }[] };
    extraResources: { from: string; to: string }[];
  };
  dependencies: Record<string, string>;
}

describe("packaged Windows runtime", () => {
  it("declares a portable build with fixed approved resources", () => {
    const desktopPackage = JSON.parse(
      readFileSync(desktopPackagePath, "utf8"),
    ) as DesktopPackage;
    expect(desktopPackage.build.win.target).toEqual([
      { target: "portable", arch: ["x64"] },
    ]);
    expect(desktopPackage.build.extraResources).toEqual([
      {
        from: "../../artifacts/rdl-compatibility-ladder/06b-production-pagination-letter.rdl",
        to: "approved-report-resources/06b-production-pagination-letter.rdl",
      },
      {
        from: "../../packages/rdl-spike/schema/ReportDefinition-2016.xsd",
        to: "approved-report-resources/ReportDefinition-2016.xsd",
      },
    ]);
    expect(desktopPackage.dependencies["libxml2-wasm"]).toBe("0.7.1");
  });

  it("builds a main bundle with a packaged validator and no xmllint invocation", () => {
    execFileSync("pnpm", ["--filter", "@powerbi-copilot/desktop", "build"], {
      cwd: repositoryRoot,
      stdio: "pipe",
    });
    const main = readFileSync(
      resolve(repositoryRoot, "apps/desktop/out/main/index.js"),
      "utf8",
    );
    expect(main).toContain('import("libxml2-wasm")');
    expect(main).not.toContain("xmllint");
  });
});
