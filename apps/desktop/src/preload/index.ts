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
  resolveExistingRdlField: "sidecar:resolve-field",
  createExistingRdlReview: "sidecar:review-create",
  getExistingRdlReview: "sidecar:review-get",
  selectExistingRdlReviewCandidates: "sidecar:review-select",
  confirmExistingRdlReviewOperation: "sidecar:review-confirm",
  declineExistingRdlReviewOperation: "sidecar:review-decline",
  resetExistingRdlReviewOperation: "sidecar:review-reset",
  createExistingRdlReviewedCopy: "sidecar:review-create-copy",
  getLlmSettings: "llm:settings-get",
  updateLlmSettings: "llm:settings-update",
  setAnthropicApiKey: "llm:key-set",
  clearAnthropicApiKey: "llm:key-clear",
  testAnthropicConnection: "llm:connection-test",
  cancelLlmPlanning: "llm:planning-cancel",
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
  resolveExistingRdlField: (
    input: Parameters<DesktopApi["resolveExistingRdlField"]>[0],
  ) => ipcRenderer.invoke(channels.resolveExistingRdlField, input),
  createExistingRdlReview: (
    input: Parameters<DesktopApi["createExistingRdlReview"]>[0],
  ) => ipcRenderer.invoke(channels.createExistingRdlReview, input),
  getExistingRdlReview: (
    input: Parameters<DesktopApi["getExistingRdlReview"]>[0],
  ) => ipcRenderer.invoke(channels.getExistingRdlReview, input),
  selectExistingRdlReviewCandidates: (
    input: Parameters<DesktopApi["selectExistingRdlReviewCandidates"]>[0],
  ) => ipcRenderer.invoke(channels.selectExistingRdlReviewCandidates, input),
  confirmExistingRdlReviewOperation: (
    input: Parameters<DesktopApi["confirmExistingRdlReviewOperation"]>[0],
  ) => ipcRenderer.invoke(channels.confirmExistingRdlReviewOperation, input),
  declineExistingRdlReviewOperation: (
    input: Parameters<DesktopApi["declineExistingRdlReviewOperation"]>[0],
  ) => ipcRenderer.invoke(channels.declineExistingRdlReviewOperation, input),
  resetExistingRdlReviewOperation: (
    input: Parameters<DesktopApi["resetExistingRdlReviewOperation"]>[0],
  ) => ipcRenderer.invoke(channels.resetExistingRdlReviewOperation, input),
  createExistingRdlReviewedCopy: (
    input: Parameters<DesktopApi["createExistingRdlReviewedCopy"]>[0],
  ) => ipcRenderer.invoke(channels.createExistingRdlReviewedCopy, input),
  getLlmSettings: () => ipcRenderer.invoke(channels.getLlmSettings),
  updateLlmSettings: (input: Parameters<DesktopApi["updateLlmSettings"]>[0]) =>
    ipcRenderer.invoke(channels.updateLlmSettings, input),
  setAnthropicApiKey: (
    input: Parameters<DesktopApi["setAnthropicApiKey"]>[0],
  ) => ipcRenderer.invoke(channels.setAnthropicApiKey, input),
  clearAnthropicApiKey: () => ipcRenderer.invoke(channels.clearAnthropicApiKey),
  testAnthropicConnection: () =>
    ipcRenderer.invoke(channels.testAnthropicConnection),
  cancelLlmPlanning: () => ipcRenderer.invoke(channels.cancelLlmPlanning),
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
