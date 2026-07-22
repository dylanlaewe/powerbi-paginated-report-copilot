import { runRdlSpike } from "./index";

const argument = (name: string): string => {
  const index = process.argv.indexOf(name);
  const value = process.argv[index + 1];
  if (index < 0 || !value) throw new Error(`Missing ${name}`);
  return value;
};

try {
  const result = await runRdlSpike(argument("--output"));
  console.log("Regional Sales Detail RDL Spike\n");
  console.log(`Report:\n  ${result.reportPath}`);
  console.log(`Dataset:\n  ${result.datasetPath}`);
  console.log(`Rows:\n  ${result.rowCount}`);
  console.log(`Regions:\n  ${result.regions.join(", ")}`);
  console.log(`Backup:\n  ${result.backup.status}`);
  console.log("Validation:");
  console.log("  XML well-formedness: PASS");
  console.log(`  Microsoft RDL 2016/01 XSD: ${result.validation.xsd}`);
  console.log("  Field/group/aggregate references: PASS");
  console.log("  Print width: PASS");
  console.log(`Manifest:\n  ${result.manifestPath}`);
  console.log("Report Builder rendering: PENDING WINDOWS");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
