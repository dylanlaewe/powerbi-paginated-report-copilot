import { contextBridge, ipcRenderer } from "electron";
import type {
  DesktopApi,
  GenerationResult,
  ProjectSelectionResult,
} from "../shared/desktop-api";

// The sandboxed preload has no non-Electron runtime dependency. Validation,
// template selection, generation, and filesystem work remain in main.
const channels = {
  selectProject: "project:select",
  generateReport: "report:generate",
  revealGeneratedReport: "report:reveal",
  copyGeneratedPath: "report:copy-path",
} as const;

const desktopApi: DesktopApi = Object.freeze({
  platform: process.platform,
  appMode: "offline-authoring",
  windowsValidation: "pending",
  selectProject: () =>
    ipcRenderer.invoke(
      channels.selectProject,
    ) as Promise<ProjectSelectionResult>,
  generateReport: (request: string) =>
    ipcRenderer.invoke(channels.generateReport, {
      request,
    }) as Promise<GenerationResult>,
  revealGeneratedReport: async () =>
    void (await ipcRenderer.invoke(channels.revealGeneratedReport)),
  copyGeneratedPath: async () =>
    void (await ipcRenderer.invoke(channels.copyGeneratedPath)),
});

contextBridge.exposeInMainWorld("powerBiCopilot", desktopApi);
