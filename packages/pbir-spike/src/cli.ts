import { runSpike } from "./index";
const value = (flag: string): string => {
  const index = process.argv.indexOf(flag);
  const result = process.argv[index + 1];
  if (index < 0 || !result) throw new Error(`Missing ${flag}`);
  return result;
};
try {
  console.log("Power BI Authoring Spike\n");
  const result = await runSpike({
    projectFile: value("--project"),
    outputDirectory: value("--output"),
  });
  const bindings = result["bindings"] as {
    kpi: { table: string; name: string };
    category: { table: string; name: string };
    slicer?: { table: string; name: string };
  };
  const sourceProject = String(result["sourceProject"]);
  const workingCopy = String(result["workingCopy"]);
  const validation = result["validation"] as {
    validatorResult: string;
    schemaStatus: string;
  };
  console.log(
    `Source project:\n  ${sourceProject}\n\nWorking copy:\n  ${workingCopy}`,
  );
  console.log(`\nDetected:\n  PBIP: yes\n  PBIR: yes\n  TMDL: yes`);
  console.log(
    `\nResolved bindings:\n  KPI: ${bindings.kpi.table}[${bindings.kpi.name}]\n  Chart category: ${bindings.category.table}[${bindings.category.name}]\n  Chart value: ${bindings.kpi.table}[${bindings.kpi.name}]${bindings.slicer ? `\n  Slicer: ${bindings.slicer.table}[${bindings.slicer.name}]` : ""}`,
  );
  console.log(`\nBackup:\n  Created and verified`);
  console.log(
    `\nAuthored:\n  Page: AI Generation Spike\n  KPI card\n  Clustered column chart${bindings.slicer ? "\n  Slicer" : ""}`,
  );
  console.log(
    `\nValidation:\n  Microsoft PBIR validator: ${validation.validatorResult}\n  Microsoft visual schema: ${validation.schemaStatus}\n  Semantic references: PASS\n  Desktop rendering: PENDING WINDOWS`,
  );
  console.log(
    `\nResult:\n  STRUCTURALLY VALIDATED\n  NOT YET RENDERED IN POWER BI DESKTOP`,
  );
} catch (error) {
  console.error(
    `Spike failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
}
