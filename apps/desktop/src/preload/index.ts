import { contextBridge, ipcRenderer } from "electron";
import {
  ipcChannels,
  generationResultSchema,
  projectSelectionResultSchema,
  type DesktopApi,
} from "../shared/desktop-api";
const desktopApi: DesktopApi = Object.freeze({
  platform: process.platform,
  appMode: "offline-authoring",
  windowsValidation: "pending",
  selectProject: async () =>
    projectSelectionResultSchema.parse(
      await ipcRenderer.invoke(ipcChannels.selectProject),
    ),
  generateReport: async (request: string) =>
    generationResultSchema.parse(
      await ipcRenderer.invoke(ipcChannels.generateReport, { request }),
    ),
  revealGeneratedReport: async () =>
    void (await ipcRenderer.invoke(ipcChannels.revealGeneratedReport)),
  copyGeneratedPath: async () =>
    void (await ipcRenderer.invoke(ipcChannels.copyGeneratedPath)),
});
contextBridge.exposeInMainWorld("powerBiCopilot", desktopApi);
