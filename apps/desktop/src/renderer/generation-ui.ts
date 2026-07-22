import type { DesktopApi, GenerationResult } from "../shared/desktop-api";

export const bridgeUnavailableMessage =
  "The desktop generation service failed to initialize.";
export const generationFailedMessage =
  "Report generation failed unexpectedly. Please try again.";

export const runGeneration = async (
  api: Pick<DesktopApi, "generateReport"> | undefined,
  request: string,
  setBusy: (busy: boolean) => void,
  setResult: (result: GenerationResult) => void,
): Promise<void> => {
  if (!api) {
    setBusy(false);
    setResult({ status: "error", message: bridgeUnavailableMessage });
    return;
  }
  setBusy(true);
  try {
    setResult(await api.generateReport(request));
  } catch {
    setResult({ status: "error", message: generationFailedMessage });
  } finally {
    setBusy(false);
  }
};
