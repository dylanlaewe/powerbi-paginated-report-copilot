import react from "@vitejs/plugin-react";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin({
        exclude: [
          "@powerbi-copilot/domain",
          "@powerbi-copilot/project-discovery",
          "@powerbi-copilot/rdl-copilot",
          "@powerbi-copilot/rdl-spike",
        ],
      }),
    ],
  },
  preload: {
    plugins: [externalizeDepsPlugin({ exclude: ["@powerbi-copilot/domain"] })],
  },
  renderer: { plugins: [react()] },
});
