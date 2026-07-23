#!/usr/bin/env node
import { runSidecarCli } from "./sidecar-cli";

process.exitCode = await runSidecarCli(process.argv.slice(2), {
  stdout: (value) => console.log(value),
  stderr: (value) => console.error(value),
});
