import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  deriveCandidate06,
  printSafePaginationSeedSha256,
} from "./candidate06";
import { sha256 } from "./ladder";

let seed = "";
beforeAll(async () => {
  seed = await readFile(
    resolve(
      "samples/report-builder-seeds/KnownGoodProductionPaginationPrintSafe.rdl",
    ),
    "utf8",
  );
});
describe("Candidate 06 rejected dimension regression", () => {
  it("pins the unchanged failed artifact input", () => {
    expect(sha256(seed)).toBe(printSafePaginationSeedSha256);
  });
  it("rejects the dimensionless seed instead of assuming Letter defaults", () => {
    expect(() => deriveCandidate06(seed)).toThrow(
      "Explicit PageWidth is required for production pagination",
    );
  });
  it("rejects any seed mutation", () => {
    expect(() =>
      deriveCandidate06(seed.replace("Textbox21", "Changed21")),
    ).toThrow("SHA-256 differs");
  });
});
