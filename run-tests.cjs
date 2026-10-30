const { spawnSync } = require("node:child_process");
const { mkdtempSync, rmSync } = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const projectRoot = process.cwd();
const outputDirectory = mkdtempSync(path.join(os.tmpdir(), "uykuva-tests-"));
const tscPath = require.resolve("typescript/bin/tsc");
const compiledTests = [
  "domain/sleep.test.js",
  "domain/export.test.js",
  "domain/feeding.test.js",
  "domain/milk.test.js",
  "domain/notificationRouting.test.js",
  "domain/reports.test.js",
  "domain/time.test.js",
  "domain/vaccineSchedule.test.js",
  "domain/wakeReminders.test.js",
  "data/storage.test.js"
].map((file) => path.join(outputDirectory, file));
const testFiles = [
  ...compiledTests,
  path.join(projectRoot, "src", "services", "notifications.test.cjs")
];

try {
  const compile = spawnSync(process.execPath, [tscPath, "-p", "tsconfig.test.json", "--outDir", outputDirectory], {
    cwd: projectRoot,
    stdio: "inherit"
  });
  if (compile.error) throw compile.error;
  if (compile.status !== 0) {
    process.exitCode = compile.status ?? 1;
  } else {
    const tests = spawnSync(process.execPath, ["--test", ...testFiles], {
      cwd: projectRoot,
      stdio: "inherit"
    });
    if (tests.error) throw tests.error;
    process.exitCode = tests.status ?? 1;
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  rmSync(outputDirectory, { recursive: true, force: true });
}

