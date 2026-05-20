# Category 1: Type Safety Results

Generated: 5/18/2026, 6:36:49 PM

Project Path:

```text
C:\Users\USER\Documents\GitHub\ship
```

Output Folder:

```text
C:\Users\USER\Documents\GitHub\ship\audit-output\type-safety-2026-05-18T23-35-34-356Z
```

## Baseline Measurement

| Metric | Baseline |
|---|---:|
| Total `any` types | 394 |
| Total type assertions using `as` | 1366 |
| Total non-null assertions using `!` | 380 |
| Total `@ts-ignore` / `@ts-expect-error` / `@ts-nocheck` directives | 1 |
| Strict mode enabled? | Yes |
| Strict mode / TypeScript error count | 5073 |
| ESLint total problems | TBD |
| ESLint errors | TBD |
| ESLint warnings | TBD |
| Total measured type-safety violations | 2141 |

## Violation Breakdown by Package

| Package | `any` | `as` | `!` | TS Suppressions | Total |
|---|---:|---:|---:|---:|---:|
| frontend / web | 67 | 405 | 42 | 1 | 515 |
| api | 269 | 829 | 310 | 0 | 1408 |
| shared | 1 | 5 | 0 | 0 | 6 |
| other | 57 | 127 | 28 | 0 | 212 |
| Total | 394 | 1366 | 380 | 1 | 2141 |

## Top 5 Violation-Dense Files

| Rank | File | Violation Count | Main Violation Type | Why It Is Problematic |
|---:|---|---:|---|---|
| 1 | `api/src/routes/weeks.ts` | 173 | as | This file contains repeated weak typing patterns that may hide runtime failures in document, editor, API, or realtime workflows. |
| 2 | `api/src/routes/team.ts` | 138 | as | This file contains repeated weak typing patterns that may hide runtime failures in document, editor, API, or realtime workflows. |
| 3 | `api/src/routes/projects.ts` | 86 | as | This file contains repeated weak typing patterns that may hide runtime failures in document, editor, API, or realtime workflows. |
| 4 | `api/src/services/accountability.test.ts` | 72 | as | This file contains repeated weak typing patterns that may hide runtime failures in document, editor, API, or realtime workflows. |
| 5 | `api/src/routes/issues.ts` | 69 | ! | This file contains repeated weak typing patterns that may hide runtime failures in document, editor, API, or realtime workflows. |

## ESLint Summary

ESLint completed with non-zero exit code. See terminal output or rerun pnpm exec eslint . --format json manually.

## Notes

This audit excludes generated/build folders such as node_modules, dist, build, coverage, .next, .turbo, test-results, playwright-report, and dev-dist.
