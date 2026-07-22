import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { validateCollectionConsistency } from "./compatibility";

let failedSeed = "";
let letterSeed = "";
beforeAll(async () => {
  [failedSeed, letterSeed] = await Promise.all([
    readFile(
      resolve(
        "samples/report-builder-seeds/KnownGoodProductionPaginationPrintSafe.rdl",
      ),
      "utf8",
    ),
    readFile(
      resolve(
        "samples/report-builder-seeds/KnownGoodProductionPaginationLetter.rdl",
      ),
      "utf8",
    ),
  ]);
});
const withExplicitLetter = (xml: string): string =>
  xml.replace(
    "        <LeftMargin>0.5in</LeftMargin>",
    "        <PageWidth>8.5in</PageWidth>\r\n        <PageHeight>11in</PageHeight>\r\n        <LeftMargin>0.5in</LeftMargin>",
  );

describe("explicit production page dimensions", () => {
  it("rejects the failed Candidate 06 seed with omitted dimensions", () => {
    expect(() =>
      validateCollectionConsistency(failedSeed, {
        requireExplicitLetterPage: true,
      }),
    ).toThrow("Explicit PageWidth is required");
  });
  it("rejects the new Letter seed because its dimensions are also omitted", () => {
    expect(() =>
      validateCollectionConsistency(letterSeed, {
        requireExplicitLetterPage: true,
      }),
    ).toThrow("Explicit PageWidth is required");
  });
  it("accepts explicit 8.5in by 11in Letter with all half-inch margins", () => {
    expect(
      validateCollectionConsistency(withExplicitLetter(letterSeed), {
        requireExplicitLetterPage: true,
      }),
    ).toMatchObject({
      bodyWidthInches: 7,
      availablePageWidthInches: 7.5,
    });
  });
  it("rejects zero and malformed RdlSize values", () => {
    const valid = withExplicitLetter(letterSeed);
    expect(() =>
      validateCollectionConsistency(
        valid.replace(
          "<PageHeight>11in</PageHeight>",
          "<PageHeight>0in</PageHeight>",
        ),
        { requireExplicitLetterPage: true },
      ),
    ).toThrow("not a positive valid RdlSize");
    expect(() =>
      validateCollectionConsistency(
        valid.replace(
          "<PageHeight>11in</PageHeight>",
          "<PageHeight>eleven</PageHeight>",
        ),
        { requireExplicitLetterPage: true },
      ),
    ).toThrow("not a positive valid RdlSize");
  });
  it("rejects every incorrect dimension or margin", () => {
    const valid = withExplicitLetter(letterSeed);
    for (const [expected, replacement] of [
      ["<PageWidth>8.5in</PageWidth>", "<PageWidth>13in</PageWidth>"],
      ["<PageHeight>11in</PageHeight>", "<PageHeight>10in</PageHeight>"],
      ["<LeftMargin>0.5in</LeftMargin>", "<LeftMargin>1in</LeftMargin>"],
      ["<RightMargin>0.5in</RightMargin>", "<RightMargin>1in</RightMargin>"],
      ["<TopMargin>0.5in</TopMargin>", "<TopMargin>1in</TopMargin>"],
      [
        "<BottomMargin>0.5in</BottomMargin>",
        "<BottomMargin>1in</BottomMargin>",
      ],
    ] as const)
      expect(() =>
        validateCollectionConsistency(valid.replace(expected, replacement), {
          requireExplicitLetterPage: true,
        }),
      ).toThrow("must be exactly");
  });
});
