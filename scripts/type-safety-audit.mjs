import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = path.join(root, "audit-output", `type-safety-${timestamp}`);

fs.mkdirSync(outDir, { recursive: true });

const ignored = [
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".turbo",
  ".next",
  "playwright-report",
  "test-results",
  "dev-dist",
];

const sourceExtensions = new Set([".ts", ".tsx"]);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!ignored.includes(entry.name)) {
        walk(full, files);
      }
      continue;
    }

    if (sourceExtensions.has(path.extname(entry.name)) && !entry.name.endsWith(".d.ts")) {
      files.push(full);
    }
  }

  return files;
}

function rel(file) {
  return path.relative(root, file).replaceAll("\\", "/");
}

function getPackageName(file) {
  const r = rel(file);

  if (r.startsWith("web/")) return "frontend / web";
  if (r.startsWith("api/")) return "api";
  if (r.startsWith("shared/")) return "shared";
  return "other";
}

const files = walk(root);

const packageTotals = {
  "frontend / web": { any: 0, as: 0, nonNull: 0, suppressions: 0, total: 0 },
  api: { any: 0, as: 0, nonNull: 0, suppressions: 0, total: 0 },
  shared: { any: 0, as: 0, nonNull: 0, suppressions: 0, total: 0 },
  other: { any: 0, as: 0, nonNull: 0, suppressions: 0, total: 0 },
};

const fileTotals = [];

let totalAny = 0;
let totalAs = 0;
let totalNonNull = 0;
let totalSuppressions = 0;

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");

  const anyCount = (text.match(/\bany\b/g) || []).length;

  // Approximate type assertion count.
  // This catches common "as Type" cases.
  const asCount = (text.match(/\sas\s+[A-Za-z_$][\w$<>{}\[\].|,\s]*/g) || []).length;

  // Approximate non-null assertion count.
  // Catches user!.id, value!, ref.current!, etc.
  const nonNullCount = (text.match(/[A-Za-z0-9_$\]\)]!\.?/g) || []).length;

  const suppressionCount = (text.match(/@ts-ignore|@ts-expect-error|@ts-nocheck/g) || []).length;

  const total = anyCount + asCount + nonNullCount + suppressionCount;

  if (total === 0) continue;

  const pkg = getPackageName(file);

  packageTotals[pkg].any += anyCount;
  packageTotals[pkg].as += asCount;
  packageTotals[pkg].nonNull += nonNullCount;
  packageTotals[pkg].suppressions += suppressionCount;
  packageTotals[pkg].total += total;

  totalAny += anyCount;
  totalAs += asCount;
  totalNonNull += nonNullCount;
  totalSuppressions += suppressionCount;

  const mainType = [
    ["any", anyCount],
    ["as", asCount],
    ["!", nonNullCount],
    ["TS suppression", suppressionCount],
  ].sort((a, b) => b[1] - a[1])[0][0];

  fileTotals.push({
    file: rel(file),
    any: anyCount,
    as: asCount,
    nonNull: nonNullCount,
    suppressions: suppressionCount,
    total,
    mainType,
  });
}

fileTotals.sort((a, b) => b.total - a.total);

let eslintSummary = "Not run";
let eslintProblems = "TBD";
let eslintErrors = "TBD";
let eslintWarnings = "TBD";

try {
  const eslintJsonPath = path.join(outDir, "eslint-results.json");
  const eslintOutput = execSync("pnpm exec eslint . --format json", {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  fs.writeFileSync(eslintJsonPath, eslintOutput);

  const eslintResults = JSON.parse(eslintOutput);
  let errors = 0;
  let warnings = 0;

  for (const result of eslintResults) {
    errors += result.errorCount || 0;
    warnings += result.warningCount || 0;
  }

  eslintErrors = errors;
  eslintWarnings = warnings;
  eslintProblems = errors + warnings;
  eslintSummary = `ESLint completed. ${eslintProblems} problems: ${eslintErrors} errors, ${eslintWarnings} warnings.`;
} catch (error) {
  eslintSummary = "ESLint completed with non-zero exit code. See terminal output or rerun pnpm exec eslint . --format json manually.";
}

let strictMode = "TBD";
try {
  const tsconfigPath = path.join(root, "tsconfig.json");
  if (fs.existsSync(tsconfigPath)) {
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf8"));
    strictMode = tsconfig.compilerOptions?.strict === true ? "Yes" : "No / not enabled at root";
  }
} catch {
  strictMode = "Could not parse tsconfig.json";
}

let tscErrorCount = "TBD";
try {
  execSync("pnpm exec tsc --noEmit --pretty false", {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  tscErrorCount = 0;
} catch (error) {
  const output = `${error.stdout || ""}\n${error.stderr || ""}`;
  fs.writeFileSync(path.join(outDir, "tsc-results.txt"), output);
  tscErrorCount = (output.match(/error TS\d+:/g) || []).length;
}

const totalMeasured = totalAny + totalAs + totalNonNull + totalSuppressions;

const topFive = fileTotals.slice(0, 5);

const markdown = `# Category 1: Type Safety Results

Generated: ${new Date().toLocaleString()}

Project Path:

\`\`\`text
${root}
\`\`\`

Output Folder:

\`\`\`text
${outDir}
\`\`\`

## Baseline Measurement

| Metric | Baseline |
|---|---:|
| Total \`any\` types | ${totalAny} |
| Total type assertions using \`as\` | ${totalAs} |
| Total non-null assertions using \`!\` | ${totalNonNull} |
| Total \`@ts-ignore\` / \`@ts-expect-error\` / \`@ts-nocheck\` directives | ${totalSuppressions} |
| Strict mode enabled? | ${strictMode} |
| Strict mode / TypeScript error count | ${tscErrorCount} |
| ESLint total problems | ${eslintProblems} |
| ESLint errors | ${eslintErrors} |
| ESLint warnings | ${eslintWarnings} |
| Total measured type-safety violations | ${totalMeasured} |

## Violation Breakdown by Package

| Package | \`any\` | \`as\` | \`!\` | TS Suppressions | Total |
|---|---:|---:|---:|---:|---:|
${Object.entries(packageTotals)
  .map(([pkg, v]) => `| ${pkg} | ${v.any} | ${v.as} | ${v.nonNull} | ${v.suppressions} | ${v.total} |`)
  .join("\n")}
| Total | ${totalAny} | ${totalAs} | ${totalNonNull} | ${totalSuppressions} | ${totalMeasured} |

## Top 5 Violation-Dense Files

| Rank | File | Violation Count | Main Violation Type | Why It Is Problematic |
|---:|---|---:|---|---|
${topFive
  .map(
    (f, index) =>
      `| ${index + 1} | \`${f.file}\` | ${f.total} | ${f.mainType} | This file contains repeated weak typing patterns that may hide runtime failures in document, editor, API, or realtime workflows. |`
  )
  .join("\n")}

## ESLint Summary

${eslintSummary}

## Notes

This audit excludes generated/build folders such as node_modules, dist, build, coverage, .next, .turbo, test-results, playwright-report, and dev-dist.
`;

fs.writeFileSync(path.join(outDir, "type-safety-results.md"), markdown);

console.log(`Type safety audit complete.`);
console.log(`Results saved to: ${path.join(outDir, "type-safety-results.md")}`);