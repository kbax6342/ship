#!/bin/bash
#
# Check for empty Playwright tests (tests with only TODO comments)
#
# Empty tests pass silently, which is a footgun. This script fails if any
# test body contains only a // TODO: comment without actual test logic.
#
# SOLUTION: Use test.fixme() for stub tests instead of empty test bodies:
#   test.fixme('my test', async ({ page }) => {
#     // TODO: implement this test
#   });
#

set -e

E2E_DIR="${1:-e2e}"

if [ ! -d "$E2E_DIR" ]; then
  echo "E2E directory not found: $E2E_DIR"
  exit 0
fi

# Find tests that are empty (no expect() or page. calls).
# Uses stateful awk parsing to track test bodies.
# Excludes test.fixme/test.skip/test.todo which are proper stub markers.

found_empty=0
declare -a files_with_empty

for f in "$E2E_DIR"/*.spec.ts; do
  if [ ! -f "$f" ]; then
    continue
  fi

  # Parse test bodies with brace matching so nested callbacks/fetch options do not
  # make real tests look empty. Only TODO/comment-only bodies are considered empty.
  empty_count=$(node - "$f" <<'NODE'
const fs = require('fs');

const file = process.argv[2];
const source = fs.readFileSync(file, 'utf8');

function findMatchingBrace(text, openIndex) {
  let depth = 0;
  let quote = null;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = openIndex; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inLineComment) {
      if (char === '\n') inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      if (char === '*' && next === '/') {
        inBlockComment = false;
        i++;
      }
      continue;
    }

    if (quote) {
      if (char === '\\') {
        i++;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '/' && next === '/') {
      inLineComment = true;
      i++;
      continue;
    }

    if (char === '/' && next === '*') {
      inBlockComment = true;
      i++;
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }

    if (char === '{') depth++;
    if (char === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }

  return -1;
}

function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

let emptyCount = 0;
const testCall = /\btest\s*\(/g;
let match;

while ((match = testCall.exec(source)) !== null) {
  const arrowIndex = source.indexOf('=>', match.index);
  if (arrowIndex === -1) continue;

  const bodyStart = source.indexOf('{', arrowIndex);
  if (bodyStart === -1) continue;

  const bodyEnd = findMatchingBrace(source, bodyStart);
  if (bodyEnd === -1) continue;

  const body = source.slice(bodyStart + 1, bodyEnd);
  const codeWithoutComments = stripComments(body).trim();

  if (/TODO/i.test(body) && codeWithoutComments === '') {
    emptyCount++;
  }
}

console.log(emptyCount);
NODE
  )

  if [ "$empty_count" -gt 0 ]; then
    found_empty=1
    files_with_empty+=("$empty_count empty tests in $(basename "$f")")
  fi
done

if [ "$found_empty" -eq 1 ]; then
  echo ""
  echo "ERROR: Empty tests detected!"
  echo "========================================"
  echo ""
  echo "The following tests have only TODO comments and will SILENTLY PASS:"
  echo ""

  for msg in "${files_with_empty[@]}"; do
    echo "  $msg"
  done

  echo ""
  echo "FIX: Convert empty tests to test.fixme():"
  echo ""
  echo "  // WRONG - silently passes"
  echo "  test('my test', async ({ page }) => {"
  echo "    // TODO: implement"
  echo "  });"
  echo ""
  echo "  // RIGHT - shows as 'fixme' in report"
  echo "  test.fixme('my test', async ({ page }) => {"
  echo "    // TODO: implement"
  echo "  });"
  echo ""
  exit 1
fi

echo "No empty tests found."
