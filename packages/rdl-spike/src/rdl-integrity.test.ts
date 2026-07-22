import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const candidatePath =
  "artifacts/rdl-compatibility-ladder/03b-region-group-from-seed.rdl";
const repositorySha256 =
  "f85dfd067e037336cb9a7fe7f5245b19a2030b01e2a997f0430a34b1f5090b88";
const observedWindowsSha256 =
  "34777160b926c8d8d1c26dd85bc42a272a39b71923f54780d7d1d81d3fb6047d";
const sha256 = (value: Buffer): string =>
  createHash("sha256").update(value).digest("hex");

describe("cross-platform RDL byte integrity", () => {
  it("marks every RDL as non-text to disable Git EOL conversion", () => {
    const result = execFileSync(
      "git",
      ["check-attr", "text", "--", candidatePath],
      { encoding: "utf8" },
    );
    expect(result.trim()).toBe(`${candidatePath}: text: unset`);
  });

  it("keeps the checked-out Candidate 03b bytes identical to the Git blob", async () => {
    const workingTree = await readFile(resolve(candidatePath));
    const blob = execFileSync("git", ["show", `HEAD:${candidatePath}`]);
    expect(workingTree.equals(blob)).toBe(true);
    expect(sha256(workingTree)).toBe(repositorySha256);
  });

  it("reproduces the reported Windows checksum through LF-to-CRLF conversion", async () => {
    const repositoryBytes = await readFile(resolve(candidatePath));
    expect(repositoryBytes.includes(Buffer.from("\r\n"))).toBe(false);
    const crlfBytes = Buffer.from(
      repositoryBytes.toString("utf8").replaceAll("\n", "\r\n"),
      "utf8",
    );
    expect(sha256(crlfBytes)).toBe(observedWindowsSha256);
  });

  it("canonicalizes the observed CRLF form back to the repository checksum", async () => {
    const repositoryBytes = await readFile(resolve(candidatePath));
    const crlfText = repositoryBytes.toString("utf8").replaceAll("\n", "\r\n");
    const canonicalLfBytes = Buffer.from(
      crlfText.replaceAll("\r\n", "\n"),
      "utf8",
    );
    expect(sha256(canonicalLfBytes)).toBe(repositorySha256);
  });
});
