import { contextBridge } from "electron";
import { desktopApi } from "../shared/desktop-api";

contextBridge.exposeInMainWorld("powerBiCopilot", desktopApi);
