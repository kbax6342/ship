import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

const webDir = path.join(root, "web");
const distDir = path.join(webDir, "dist");
const packageJsonPath = path.join(webDir, "package.json");

const outDir = path.join(root, "audit-output", `bundle-size-${timestamp}`);
fs.mkdirSync(outDir, { recursive: true });

const ignoredDirs = new Set(["node_modules", ".git", "dist", "build", ".next", ".turbo", "coverage"]);

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) walk(full, files);
      continue;
    }

    files.push(full);
  }

  return files;
}

function bytesToKb(bytes) {
  return Math.round((bytes / 1024) * 100) / 100;
}

function rel(file) {
  return path.relative(root, file).replaceAll("\\", "/");
}

function getFileSize(file) {
  return fs.statSync(file).size;
}

if (!fs.existsSync(distDir)) {
  console.error(`Missing production build folder: ${distDir}`);
  console.error("Run this first: pnpm --filter web build");
  process.exit(1);
}

const distFiles = walk(distDir);
const assetFiles = distFiles.filter((file) => /\.(js|css|html|svg|png|jpg|jpeg|webp|woff2?|ttf|ico)$/i.test(file));
const jsCssChunks = distFiles.filter((file) => /\.(js|css)$/i.test(file));

const totalBytes = assetFiles.reduce((sum, file) => sum + getFileSize(file), 0);

const chunks = jsCssChunks
  .map((file) => ({
    file: rel(file),
    sizeBytes: getFileSize(file),
    sizeKb: bytesToKb(getFileSize(file)),
  }))
  .sort((a, b) => b.sizeBytes - a.sizeBytes);

const largestChunk = chunks[0];

let packageJson = {};
if (fs.existsSync(packageJsonPath)) {
  packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
}

const dependencies = {
  ...(packageJson.dependencies || {}),
};

const srcDir = path.join(webDir, "src");
const sourceFiles = walk(srcDir).filter((file) => /\.(ts|tsx|js|jsx)$/i.test(file));
const sourceText = sourceFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");

function dependencyAppearsUsed(depName) {
  if (sourceText.includes(`from "${depName}"`)) return true;
  if (sourceText.includes(`from '${depName}'`)) return true;
  if (sourceText.includes(`import("${depName}")`)) return true;
  if (sourceText.includes(`import('${depName}')`)) return true;
  if (sourceText.includes(`require("${depName}")`)) return true;
  if (sourceText.includes(`require('${depName}')`)) return true;

  // Handles scoped subpath imports like @scope/pkg/foo
  if (depName.startsWith("@")) {
    const [scope, pkg] = depName.split("/");
    const scopedBase = `${scope}/${pkg}`;
    return sourceText.includes(`from "${scopedBase}/`) || sourceText.includes(`from '${scopedBase}/`);
  }

  return sourceText.includes(`from "${depName}/`) || sourceText.includes(`from '${depName}/`);
}

const unusedDependencies = Object.keys(dependencies)
  .filter((dep) => !dependencyAppearsUsed(dep))
  .sort();

const markdown = `# Category 2: Bundle Size Results

Generated: ${new Date().toLocaleString()}

Project Path:

\`\`\`text
${root}
\`\`\`

Frontend Dist Path:

\`\`\`text
${distDir}
\`\`\`

Output Folder:

\`\`\`text
${outDir}
\`\`\`

## Baseline Measurement

| Metric | Baseline |
|---|---:|
| Total production bundle size | ${bytesToKb(totalBytes)} KB |
| Largest chunk | ${largestChunk ? `${largestChunk.file} (${largestChunk.sizeKb} KB)` : "TBD"} |
| Number of JS/CSS chunks | ${chunks.length} |
| Top 3 largest dependencies | TBD from bundle treemap |
| Unused dependencies identified | ${unusedDependencies.length} |

## Largest JS/CSS Chunks

| Rank | File | Size |
|---:|---|---:|
${chunks
  .slice(0, 10)
  .map((chunk, index) => `| ${index + 1} | \`${chunk.file}\` | ${chunk.sizeKb} KB |`)
  .join("\n")}

## Potentially Unused Dependencies

| Dependency | Version |
|---|---:|
${
  unusedDependencies.length
    ? unusedDependencies.map((dep) => `| \`${dep}\` | \`${dependencies[dep]}\` |`).join("\n")
    : "| None detected by static import scan | — |"
}

## Notes

This script measures production files in \`web/dist\`.
The dependency scan is a static import check and should be manually reviewed before removing dependencies.
The Top 3 largest dependencies should be confirmed using the bundle visualizer treemap.
`;

fs.writeFileSync(path.join(outDir, "bundle-size-results.md"), markdown);

console.log("Bundle size audit complete.");
console.log(`Results saved to: ${path.join(outDir, "bundle-size-results.md")}`);