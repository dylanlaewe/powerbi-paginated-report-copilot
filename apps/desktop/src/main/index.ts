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
  actionResultSchema,
  applyEditRequestSchema,
  outputHandleRequestSchema,
  planEditRequestSchema,
  planSessionIdRequestSchema,
  sessionIdRequestSchema,
  type ProjectSelectionResult,
} from "../shared/desktop-api";
import {
  controlledOutputDirectory,
  generateFromUiRequest,
  resolveElectronApprovedResources,
} from "./report-generation";
import { ExistingRdlSidecarService } from "./existing-rdl-sidecar";

let generatedReportPath: string | undefined;
let sidecarService: ExistingRdlSidecarService | undefined;

const getSidecarService = (): ExistingRdlSidecarService => {
  if (sidecarService) return sidecarService;
  const resolution = resolveElectronApprovedResources(
    {
      isPackaged: app.isPackaged,
      appPath: app.getAppPath(),
      mainModulePath: __dirname,
      resourcesPath: process.resourcesPath,
    },
    (message, error) => console.error(message, error),
  );
  if (resolution.status === "error")
    throw new Error("The RDL validation resources could not be loaded.");
  sidecarService = new ExistingRdlSidecarService({
    userDataPath: app.getPath("userData"),
    schemaPath: resolution.resources.schemaPath,
    platform:
      process.platform === "darwin"
        ? "darwin"
        : process.platform === "win32"
          ? "win32"
          : "linux",
    revealPath: (path) => shell.showItemInFolder(path),
    copyText: (value) => clipboard.writeText(value),
  });
  return sidecarService;
};

const invalidIpc = () =>
  actionResultSchema.parse({
    status: "error",
    code: "IPC_REJECTED",
    message: "The desktop request was invalid.",
    noOutputWritten: true,
    sourceUnchanged: true,
  });

ipcMain.handle(ipcChannels.selectExistingRdl, async () => {
  const choice = await dialog.showOpenDialog({
    properties: ["openFile"],
    title: "Select an existing Power BI Paginated Report",
    filters: [{ name: "Power BI Paginated Reports", extensions: ["rdl"] }],
  });
  return getSidecarService().selectPath(
    choice.canceled ? null : (choice.filePaths[0] ?? null),
  );
});
ipcMain.handle(
  ipcChannels.planExistingRdlEdit,
  async (_event, input: unknown) => {
    const parsed = planEditRequestSchema.safeParse(input);
    return parsed.success
      ? getSidecarService().planEdit(parsed.data)
      : invalidIpc();
  },
);
ipcMain.handle(
  ipcChannels.applyExistingRdlEdit,
  async (_event, input: unknown) => {
    const parsed = applyEditRequestSchema.safeParse(input);
    return parsed.success
      ? getSidecarService().applyEdit(parsed.data)
      : invalidIpc();
  },
);
ipcMain.handle(ipcChannels.cancelExistingRdlPlan, (_event, input: unknown) => {
  const parsed = planSessionIdRequestSchema.safeParse(input);
  return parsed.success
    ? getSidecarService().cancelPlan(parsed.data.planSessionId)
    : invalidIpc();
});
ipcMain.handle(ipcChannels.revealEditedRdl, (_event, input: unknown) => {
  const parsed = outputHandleRequestSchema.safeParse(input);
  return parsed.success
    ? getSidecarService().reveal(parsed.data.outputHandle)
    : invalidIpc();
});
ipcMain.handle(ipcChannels.copyEditedRdlPath, (_event, input: unknown) => {
  const parsed = outputHandleRequestSchema.safeParse(input);
  return parsed.success
    ? getSidecarService().copy(parsed.data.outputHandle, "rdl")
    : invalidIpc();
});
ipcMain.handle(ipcChannels.copyManifestPath, (_event, input: unknown) => {
  const parsed = outputHandleRequestSchema.safeParse(input);
  return parsed.success
    ? getSidecarService().copy(parsed.data.outputHandle, "manifest")
    : invalidIpc();
});
ipcMain.handle(
  ipcChannels.clearExistingRdlSession,
  (_event, input: unknown) => {
    const parsed = sessionIdRequestSchema.safeParse(input);
    return parsed.success
      ? getSidecarService().clearSession(parsed.data.reportSessionId)
      : invalidIpc();
  },
);

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
    width: 460,
    height: 780,
    minWidth: 420,
    minHeight: 680,
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
  window.on("closed", () => {
    sidecarService?.clearAllSessions();
    sidecarService = undefined;
  });
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
