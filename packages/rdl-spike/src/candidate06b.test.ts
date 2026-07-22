import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { deriveCandidate06b, letterSeedSha256 } from "./candidate06b";
import { validateCollectionConsistency } from "./compatibility";
import { sha256 } from "./ladder";
import { fingerprintPagination } from "./pagination-forensics";

let seed = "";
beforeAll(async () => {
  seed = await readFile(
    resolve(
      "samples/report-builder-seeds/KnownGoodProductionPaginationLetter.rdl",
    ),
    "utf8",
  );
});
describe("Candidate 06b", () => {
  it("is byte-identical to the explicit-Letter seed", () => {
    const candidate = deriveCandidate06b(seed);
    expect(candidate).toBe(seed);
    expect(sha256(candidate)).toBe(letterSeedSha256);
  });
  it("requires literal positive Letter dimensions and exact margins", () => {
    const candidate = deriveCandidate06b(seed);
    expect(candidate).toContain("<PageWidth>8.5in</PageWidth>");
    expect(candidate).toContain("<PageHeight>11in</PageHeight>");
    expect(
      validateCollectionConsistency(candidate, {
        requireExplicitLetterPage: true,
      }),
    ).toMatchObject({ bodyWidthInches: 7, availablePageWidthInches: 7.5 });
    expect(fingerprintPagination(candidate)).toMatchObject({
      pageWidthSource: "EXPLICIT",
      pageHeightSource: "EXPLICIT",
      printSafe: true,
    });
  });
  it("rejects omitted or zero dimensions", () => {
    expect(() =>
      deriveCandidate06b(
        seed.replace("        <PageWidth>8.5in</PageWidth>\r\n", ""),
      ),
    ).toThrow("SHA-256 differs");
    expect(() =>
      deriveCandidate06b(
        seed.replace(
          "<PageHeight>11in</PageHeight>",
          "<PageHeight>0in</PageHeight>",
        ),
      ),
    ).toThrow("SHA-256 differs");
  });
});
