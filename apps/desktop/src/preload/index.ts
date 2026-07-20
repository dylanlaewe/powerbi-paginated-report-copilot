import { contextBridge, ipcRenderer } from "electron";
import {
  ipcChannels,
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
});
contextBridge.exposeInMainWorld("powerBiCopilot", desktopApi);
