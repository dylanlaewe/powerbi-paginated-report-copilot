import { join, resolve } from "node:path";
import {
  type ApprovedReportResources,
  generateReport,
  parseNaturalLanguageReportRequest,
  resolveApprovedReportResources,
} from "@powerbi-copilot/rdl-copilot";
import type { GenerationResult } from "../shared/desktop-api";

export const controlledReportFileName = "regional-sales-generated.rdl";
export const approvedTemplateLoadMessage =
  "The approved report template could not be loaded.";

export const resolveElectronApprovedResources = (
  options: Parameters<typeof resolveApprovedReportResources>[0],
  logInternalError: (message: string, error: unknown) => void,
):
  | { status: "resolved"; resources: ApprovedReportResources }
  | { status: "error"; message: string } => {
  try {
    return {
      status: "resolved",
      resources: resolveApprovedReportResources(options),
    };
  } catch (error) {
    if (!options.isPackaged)
      logInternalError("Approved report resource resolution failed", error);
    return { status: "error", message: approvedTemplateLoadMessage };
  }
};

export const generateFromUiRequest = async (
  request: string,
  controlledOutputDirectory: string,
  resources: ApprovedReportResources,
): Promise<GenerationResult> => {
  try {
    const specification = parseNaturalLanguageReportRequest(request);
    const outputPath = resolve(
      controlledOutputDirectory,
      controlledReportFileName,
    );
    const result = await generateReport(specification, outputPath, resources);
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
