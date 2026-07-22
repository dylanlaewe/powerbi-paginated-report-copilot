import { join, resolve } from "node:path";
import {
  generateReport,
  parseNaturalLanguageReportRequest,
} from "@powerbi-copilot/rdl-copilot";
import type { GenerationResult } from "../shared/desktop-api";

export const controlledReportFileName = "regional-sales-generated.rdl";

export const generateFromUiRequest = async (
  request: string,
  controlledOutputDirectory: string,
): Promise<GenerationResult> => {
  try {
    const specification = parseNaturalLanguageReportRequest(request);
    const outputPath = resolve(
      controlledOutputDirectory,
      controlledReportFileName,
    );
    const result = await generateReport(specification, outputPath);
    return {
      status: "generated",
      title: specification.title,
      rowCount: specification.rows.length,
      regions: [...new Set(specification.rows.map((row) => row.Region))].sort(),
      regionSubtotals: result.manifest.expectedRegionSubtotals,
      grandTotal: result.manifest.expectedGrandTotal,
      template: result.manifest.template,
      sha256: result.manifest.reportSha256,
      outputPath: result.reportPath,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Report generation failed",
    };
  }
};

export const controlledOutputDirectory = (userDataPath: string): string =>
  join(userDataPath, "generated-reports");
