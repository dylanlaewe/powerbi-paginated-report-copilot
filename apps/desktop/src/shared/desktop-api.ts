export interface DesktopApi {
  readonly platform: string;
  readonly appMode: "offline-authoring";
  readonly windowsValidation: "pending";
}

export const desktopApi: DesktopApi = Object.freeze({
  platform: process.platform,
  appMode: "offline-authoring",
  windowsValidation: "pending",
});
