import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { resolveDevelopmentApprovedResources } from "./approved-resources";
import { validateXmlAgainstXsd } from "./xsd-validator";

const resources = resolveDevelopmentApprovedResources([import.meta.dirname]);

describe("bundled XML/XSD validation", () => {
  it("validates the accepted RDL without an external executable", async () => {
    await expect(
      validateXmlAgainstXsd(
        await readFile(resources.templatePath),
        await readFile(resources.schemaPath),
      ),
    ).resolves.toEqual({ engine: "libxml2-wasm", status: "PASS" });
  });

  it("rejects schema-invalid XML", async () => {
    const xml = await readFile(resources.templatePath, "utf8");
    await expect(
      validateXmlAgainstXsd(
        Buffer.from(
          xml.replace(
            "<PageHeight>11in</PageHeight>",
            "<Unknown>bad</Unknown>",
          ),
        ),
        await readFile(resources.schemaPath),
      ),
    ).rejects.toThrow();
  });
});
