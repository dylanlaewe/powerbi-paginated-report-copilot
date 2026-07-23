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
  selectExistingRdl: "sidecar:select-rdl",
  planExistingRdlEdit: "sidecar:plan-edit",
  applyExistingRdlEdit: "sidecar:apply-edit",
  cancelExistingRdlPlan: "sidecar:cancel-plan",
  revealEditedRdl: "sidecar:reveal-output",
  copyEditedRdlPath: "sidecar:copy-rdl-path",
  copyManifestPath: "sidecar:copy-manifest-path",
  clearExistingRdlSession: "sidecar:clear-session",
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
  selectExistingRdl: () => ipcRenderer.invoke(channels.selectExistingRdl),
  planExistingRdlEdit: (
    input: Parameters<DesktopApi["planExistingRdlEdit"]>[0],
  ) => ipcRenderer.invoke(channels.planExistingRdlEdit, input),
  applyExistingRdlEdit: (
    input: Parameters<DesktopApi["applyExistingRdlEdit"]>[0],
  ) => ipcRenderer.invoke(channels.applyExistingRdlEdit, input),
  cancelExistingRdlPlan: (
    input: Parameters<DesktopApi["cancelExistingRdlPlan"]>[0],
  ) => ipcRenderer.invoke(channels.cancelExistingRdlPlan, input),
  revealEditedRdl: (input: Parameters<DesktopApi["revealEditedRdl"]>[0]) =>
    ipcRenderer.invoke(channels.revealEditedRdl, input),
  copyEditedRdlPath: (input: Parameters<DesktopApi["copyEditedRdlPath"]>[0]) =>
    ipcRenderer.invoke(channels.copyEditedRdlPath, input),
  copyManifestPath: (input: Parameters<DesktopApi["copyManifestPath"]>[0]) =>
    ipcRenderer.invoke(channels.copyManifestPath, input),
  clearExistingRdlSession: (
    input: Parameters<DesktopApi["clearExistingRdlSession"]>[0],
  ) => ipcRenderer.invoke(channels.clearExistingRdlSession, input),
});

contextBridge.exposeInMainWorld("powerBiCopilot", desktopApi);
