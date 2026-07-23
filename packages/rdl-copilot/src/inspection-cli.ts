import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { inspectRdlFile, resolveInventoryTargets } from "./inspection";

const valueAfter = (flag: string): string => {
  const index = process.argv.indexOf(flag);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value) throw new Error(`Missing required ${flag}`);
  return value;
};

const inputPath = resolve(valueAfter("--input"));
const outputPath = resolve(valueAfter("--output"));
const inventory = await inspectRdlFile(inputPath);
const result = {
  gate: 1,
  status: "PASS",
  inventory,
  resolvedTargets: resolveInventoryTargets(inventory),
};
const content = `${JSON.stringify(result, null, 2)}\n`;
await mkdir(dirname(outputPath), { recursive: true });
const temporary = `${outputPath}.${process.pid}.tmp`;
await writeFile(temporary, content, { flag: "wx" });
await rename(temporary, outputPath);
console.log(`Inspected RDL: ${inputPath}`);
console.log(`Inventory: ${outputPath}`);
console.log(`Source SHA-256: ${inventory.sourceSha256}`);
console.log(
  `Title target: ${result.resolvedTargets.reportTitle.reportItemName}`,
);
console.log(
  `Revenue targets: ${result.resolvedTargets.revenueDisplays.reportItemNames.join(", ")}`,
);
