// scripts/aria-scan.mjs
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const scanDir = path.join(root, "web", "src");

const results = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (
      fullPath.includes("node_modules") ||
      fullPath.includes("dist") ||
      fullPath.includes("coverage") ||
      fullPath.includes(".next")
    ) {
      continue;
    }

    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (/\.(tsx|jsx)$/.test(entry.name)) {
      scanFile(fullPath);
    }
  }
}

function lineNumberForIndex(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function addFinding(file, line, type, snippet, recommendation) {
  results.push({
    file: path.relative(root, file),
    line,
    type,
    snippet: snippet.trim().replace(/\s+/g, " ").slice(0, 220),
    recommendation,
  });
}

function scanFile(file) {
  const text = fs.readFileSync(file, "utf8");

  // Finds <button> blocks that appear to have no visible text and no accessible name.
  const buttonRegex = /<button\b[\s\S]*?<\/button>/g;
  for (const match of text.matchAll(buttonRegex)) {
    const block = match[0];
    const start = match.index ?? 0;
    const line = lineNumberForIndex(text, start);

    const hasAccessibleName =
      /aria-label=|aria-labelledby=|title=/.test(block);

    const hasVisibleText =
      />\s*[^<>{}\s][^<]*\s*</.test(block);

    const hasIcon =
      /<svg|Icon|HeroIcon|Chevron|Plus|Trash|Edit|XMark|MagnifyingGlass|Ellipsis|More|Menu|Bell|Cog|Pencil|Archive|Check|Copy|ExternalLink/.test(block);

    if (!hasAccessibleName && hasIcon && !hasVisibleText) {
      addFinding(
        file,
        line,
        "Possible icon-only button missing accessible label",
        block,
        'Add aria-label, for example: aria-label="Delete document"'
      );
    }
  }

  // Finds input/select/textarea controls without obvious labels or aria labels.
  const controlRegex = /<(input|select|textarea)\b[^>]*>/g;
  for (const match of text.matchAll(controlRegex)) {
    const tag = match[0];
    const start = match.index ?? 0;
    const line = lineNumberForIndex(text, start);

    const hasAccessibleName =
      /aria-label=|aria-labelledby=|id=|name=|placeholder=/.test(tag);

    if (!hasAccessibleName) {
      addFinding(
        file,
        line,
        "Possible form control missing accessible label",
        tag,
        "Add a visible <label>, aria-label, or aria-labelledby."
      );
    }
  }

  // Finds dialogs/modals that may be missing roles.
  const modalHints = /(Modal|Dialog|dialog|modal|fixed inset|role="dialog"|aria-modal)/g;
  if (modalHints.test(text)) {
    const hasDialogRole = /role=["']dialog["']|<dialog\b/.test(text);
    const hasAriaModal = /aria-modal=/.test(text);
    const hasLabel = /aria-labelledby=|aria-label=/.test(text);

    if (!hasDialogRole || !hasAriaModal || !hasLabel) {
      addFinding(
        file,
        1,
        "Possible dialog/modal missing accessible role or label",
        "File contains modal/dialog patterns",
        'Ensure modal has role="dialog", aria-modal="true", and aria-labelledby or aria-label.'
      );
    }
  }
}

if (!fs.existsSync(scanDir)) {
  console.error(`Missing scan directory: ${scanDir}`);
  process.exit(1);
}

walk(scanDir);

const outputDir = path.join(root, "audit-output", "accessibility");
fs.mkdirSync(outputDir, { recursive: true });

const markdown = `# Static ARIA Scan Results

Generated: ${new Date().toLocaleString()}

Scanned path:

\`\`\`text
${scanDir}
\`\`\`

## Summary

| Metric | Count |
|---|---:|
| Possible missing ARIA / label findings | ${results.length} |

## Findings

| File | Line | Type | Recommendation |
|---|---:|---|---|
${results
  .map(
    (r) =>
      `| \`${r.file}\` | ${r.line} | ${r.type} | ${r.recommendation} |`
  )
  .join("\n")}

## Raw Snippets

${results
  .map(
    (r, i) => `### ${i + 1}. ${r.file}:${r.line}

**Type:** ${r.type}

**Recommendation:** ${r.recommendation}

\`\`\`tsx
${r.snippet}
\`\`\`
`
  )
  .join("\n")}
`;

fs.writeFileSync(path.join(outputDir, "aria-scan-results.md"), markdown);
fs.writeFileSync(path.join(outputDir, "aria-scan-results.json"), JSON.stringify(results, null, 2));

console.log(markdown);
console.log(`\nSaved to: ${path.join(outputDir, "aria-scan-results.md")}`);