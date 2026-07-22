import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  ipcMain,
  shell,
} from "electron";
import { join } from "node:path";
import {
  discoverPowerBiProject,
  ProjectDiscoveryError,
} from "@powerbi-copilot/project-discovery";
import {
  ipcChannels,
  generationRequestSchema,
  generationResultSchema,
  type ProjectSelectionResult,
} from "../shared/desktop-api";
import {
  controlledOutputDirectory,
  generateFromUiRequest,
  resolveElectronApprovedResources,
} from "./report-generation";

let generatedReportPath: string | undefined;

ipcMain.handle(ipcChannels.generateReport, async (_event, input: unknown) => {
  const parsed = generationRequestSchema.safeParse(input);
  if (!parsed.success)
    return { status: "error", message: "Invalid generation request" };
  const resolution = resolveElectronApprovedResources(
    {
      isPackaged: app.isPackaged,
      appPath: app.getAppPath(),
      mainModulePath: __dirname,
      resourcesPath: process.resourcesPath,
    },
    (message, error) => console.error(message, error),
  );
  if (resolution.status === "error") return resolution;
  const result = await generateFromUiRequest(
    parsed.data.request,
    controlledOutputDirectory(app.getPath("userData")),
    resolution.resources,
  );
  if (result.status === "generated") generatedReportPath = result.outputPath;
  return generationResultSchema.parse(result);
});
ipcMain.handle(ipcChannels.revealGeneratedReport, () => {
  if (!generatedReportPath) throw new Error("No generated report is available");
  shell.showItemInFolder(generatedReportPath);
});
ipcMain.handle(ipcChannels.copyGeneratedPath, () => {
  if (!generatedReportPath) throw new Error("No generated report is available");
  clipboard.writeText(generatedReportPath);
});

ipcMain.handle(
  ipcChannels.selectProject,
  async (): Promise<ProjectSelectionResult> => {
    const choice = await dialog.showOpenDialog({
      properties: ["openDirectory"],
      title: "Select a Power BI Project folder",
    });
    if (choice.canceled || !choice.filePaths[0]) return { status: "cancelled" };
    try {
      return {
        status: "selected",
        project: await discoverPowerBiProject(choice.filePaths[0]),
      };
    } catch (error) {
      return {
        status: "error",
        code: error instanceof ProjectDiscoveryError ? error.code : "UNKNOWN",
        message:
          error instanceof Error ? error.message : "Project inspection failed",
      };
    }
  },
);

const createWindow = (): void => {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#f4f7fb",
    show: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.once("ready-to-show", () => window.show());
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) void shell.openExternal(url);
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event) => event.preventDefault());

  if (process.env["ELECTRON_RENDERER_URL"]) {
    void window.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    void window.loadFile(join(__dirname, "../renderer/index.html"));
  }
};

void app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
