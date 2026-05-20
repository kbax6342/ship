# Department of Treasury Document Platform Audit

**Project:** Ship collaborative document platform  
**Project path tested:** `C:\Users\USER\Documents\GitHub\ship`  
**Audit focus:** Type safety, bundle size, API performance, database query efficiency, test coverage, runtime error handling, and accessibility compliance.

---

## Executive Summary

This audit reviewed a monorepo-based collaborative document platform built with React, Vite, Tailwind CSS, TipTap, Yjs, Express, Node.js, PostgreSQL, WebSockets, Playwright/Vitest tests, Docker, and Terraform.

The core architectural decision is that **everything is a document**. Pages, issues, projects, sprints/weeks, weekly plans, collaboration state, and other workflow artifacts are represented through a unified document model. This gives the system flexibility, but it also concentrates risk around document-level authorization, database query performance, realtime collaboration safety, audit history, data integrity, and accessibility.

Overall, the platform has a strong modern architecture for collaborative workflows, but several areas need hardening before it could be considered production-ready for a government-style document system. The strongest findings are:

- The API package has the largest concentration of unsafe TypeScript patterns.
- The production frontend bundle contains one very large main JavaScript chunk.
- API response-time measurements now include P95 values, but the benchmark returned high non-2xx counts and should be rerun with authenticated context.
- Database query efficiency improved after targeted JSON-expression indexes were added.
- API and web test coverage are measurable, but coverage remains low.
- Runtime behavior was generally stable during normal use, but offline/reconnect status needs clearer user-facing messaging.
- Accessibility has strong Lighthouse evidence on a tested page, but axe found Critical/Serious issues across key pages, and static scanning found possible ARIA/label issues.

---

## Architecture Reviewed

### Frontend

- React
- Vite
- Tailwind CSS
- TipTap rich text editor
- Yjs collaborative document state

### Backend

- Express
- Node.js
- REST API routes
- Session/auth middleware

### Database

- PostgreSQL
- Unified `documents` table
- Relationship/association tables
- Session/user/workspace tables

### Realtime Layer

- WebSockets
- Yjs CRDT synchronization

### Testing and Infrastructure

- Vitest
- Playwright E2E tests
- Docker
- Terraform

```text
                 shared/
        TypeScript shared types
        Document, User, Issue,
        Project, Sprint, API DTOs
                    ▲
                    │
     ┌──────────────┴──────────────┐
     │                             │
   web/                          api/
 React + Vite                 Express + Node
 Tailwind UI                  REST API routes
 TipTap editor                Auth/session middleware
 Yjs client sync              PostgreSQL queries
     │                             │
     │ HTTP requests               │ SQL queries
     │ WebSocket connection        ▼
     └──────────────────────► PostgreSQL
                               documents table
                               users table
                               relationships/audit data
```

---

## Audit Scope

This audit reviewed the following areas:

- Type safety and unsafe TypeScript patterns
- Bundle size, code splitting, and frontend performance
- API response time under normal and concurrent load
- PostgreSQL query performance, indexes, and N+1 risks
- Test coverage, critical-flow gaps, and reliability
- Runtime error handling and edge-case behavior
- Accessibility and Section 508 / WCAG 2.1 AA readiness
- WebSocket/Yjs realtime collaboration reliability
- Unified “everything is a document” data model integrity
- Government/public-sector reliability, auditability, and maintainability

---

## Baseline Summary Across All 7 Categories

| Category | Baseline Status | Key Baseline Measurement |
|---|---|---|
| 1. Type Safety | Measured | 2,141 measured type-safety violations; 5,073 TypeScript errors |
| 2. Bundle Size | Measured | 3,349.61 KB total production bundle; largest chunk 2,025.1 KB |
| 3. API Response Time | Measured with caveat | P95 captured; slowest P95 was Issues list at 43.23 ms under 50 concurrency |
| 4. Database Query Efficiency | Measured and improved | Selected query execution improved from 2.502 ms to 1.130 ms, ~54.8% improvement |
| 5. Test Coverage and Quality | Measured | API: 451/451 passing, 40.52% line coverage; Web: 152/152 passing, 29.28% line coverage |
| 6. Runtime Error and Edge Case Handling | Measured | 0 unexpected normal-usage console errors observed; network recovery marked Partial |
| 7. Accessibility Compliance | Measured | Lighthouse tested page scored 100; axe found 27 Critical/Serious violations across pages |

---

# Category 1: Type Safety

## What Was Measured

This category measured unsafe TypeScript patterns across the monorepo:

- Explicit `any`
- Type assertions using `as`
- Non-null assertions using `!`
- TypeScript suppression comments
- Strict-mode / TypeScript compiler errors

## Baseline Measurement

| Metric | Baseline |
|---|---:|
| Total `any` types | 394 |
| Total type assertions using `as` | 1,366 |
| Total non-null assertions using `!` | 380 |
| Total `@ts-ignore` / `@ts-expect-error` / `@ts-nocheck` directives | 1 |
| Strict mode enabled? | Yes |
| Strict mode / TypeScript error count | 5,073 |
| Total measured type-safety violations | 2,141 |

## Violation Breakdown by Package

| Package | `any` | `as` | `!` | TS Suppressions | Total |
|---|---:|---:|---:|---:|---:|
| frontend / web | 67 | 405 | 42 | 1 | 515 |
| api | 269 | 829 | 310 | 0 | 1,408 |
| shared | 1 | 5 | 0 | 0 | 6 |
| other | 57 | 127 | 28 | 0 | 212 |
| **Total** | **394** | **1,366** | **380** | **1** | **2,141** |

## Top 5 Violation-Dense Files

| Rank | File | Violation Count | Main Violation Type | Why It Is Problematic |
|---:|---|---:|---|---|
| 1 | `api/src/routes/weeks.ts` | 173 | `as` | Core week/document workflows rely on forced type assumptions. |
| 2 | `api/src/routes/team.ts` | 138 | `as` | Team and role data can affect authorization and workflow access. |
| 3 | `api/src/routes/projects.ts` | 86 | `as` | Project data is part of the unified document model and relationship graph. |
| 4 | `api/src/services/accountability.test.ts` | 72 | `as` | Test typing can hide incorrect assumptions about accountability data. |
| 5 | `api/src/routes/issues.ts` | 69 | `!` | Non-null assertions can hide missing issue/workflow values at runtime. |

## Root Cause Analysis

The baseline type-safety issues appear to come from several root causes:

1. Some API response data is not strongly typed at the boundary between backend and frontend.
2. Some editor and document state is treated as flexible data instead of being represented with specific TypeScript interfaces.
3. Type assertions are used to force data into expected shapes instead of validating or narrowing the data first.
4. Non-null assertions are used in areas where values may be undefined during loading, failed requests, or realtime collaboration updates.
5. Some functions rely on inferred or loose types, making it harder to understand what data shape is expected.

These patterns increase runtime risk because TypeScript is being bypassed in areas where the application depends on reliable document, issue, project, sprint/week, editor, and realtime collaboration data.

## Risk Assessment

The codebase has strict mode enabled, which is positive, but the high number of compiler errors and unsafe typing patterns shows that strictness is not yet fully operational across the monorepo.

This is especially risky because the platform treats many business objects as documents. Weak typing can lead to:

- Invalid document data accepted by the API
- Broken document/editor rendering
- Unsafe database record handling
- Runtime failures when optional values are assumed to exist
- Realtime collaboration state mismatches
- Hidden bugs that TypeScript would normally catch

## Recommended Remediation

- Prioritize API route files first, especially `weeks.ts`, `team.ts`, `projects.ts`, and `issues.ts`.
- Replace repeated `as` assertions with typed request schemas, shared interfaces, validation helpers, or type guards.
- Reduce explicit `any` usage by introducing domain types for documents, projects, weeks, users, teams, and API payloads.
- Replace non-null assertions with explicit checks, early returns, or typed fallbacks.
- Resolve strict-mode compiler errors package by package.
- Rerun ESLint in JSON mode after cleanup so lint errors and warnings can be included in the baseline.

---

# Category 2: Bundle Size

## What Was Measured

This category measured the production frontend bundle generated from `web/dist`.

## Baseline Measurement

| Metric | Baseline |
|---|---:|
| Total production bundle size | 3,349.61 KB |
| Largest chunk | `web/dist/assets/index-C2vAyoQ1.js` — 2,025.1 KB |
| Number of JS/CSS chunks | 262 |
| Top 3 largest dependencies | Pending bundle treemap confirmation |
| Unused dependencies identified | 2 |

## Largest JS/CSS Chunks

| Rank | File | Size |
|---:|---|---:|
| 1 | `web/dist/assets/index-C2vAyoQ1.js` | 2,025.1 KB |
| 2 | `web/dist/assets/index-DJeYp5na.css` | 64.95 KB |
| 3 | `web/dist/assets/ProgramWeeksTab-BzbUWlt4.js` | 16.37 KB |
| 4 | `web/dist/assets/WeekReviewTab-DmxN07T1.js` | 12.35 KB |
| 5 | `web/dist/assets/StandupFeed-BjJLDai5.js` | 9.42 KB |
| 6 | `web/dist/assets/ProjectRetroTab-BV2rvgoM.js` | 8.83 KB |
| 7 | `web/dist/assets/ProjectWeeksTab-oE3MioHn.js` | 6.5 KB |
| 8 | `web/dist/assets/ProgramProjectsTab-eNNvrO8g.js` | 4.3 KB |
| 9 | `web/dist/assets/ProjectDetailsTab-gSyN3jFM.js` | 3.52 KB |
| 10 | `web/dist/assets/WeekPlanningTab-DWsXI-LK.js` | 2.92 KB |

## Potentially Unused Dependencies

| Dependency | Version |
|---|---:|
| `@tanstack/query-sync-storage-persister` | `^5.90.18` |
| `@uswds/uswds` | `^3.13.0` |

These should be manually reviewed before removal because static import scans can miss indirect usage, CSS imports, build-time usage, or configuration-based usage.

## Risk Assessment

A total frontend bundle size of 3.35 MB is moderate for a complex document platform, but the largest JavaScript chunk is over 2 MB. This may slow initial page load on slower networks, older devices, or public-sector environments with constrained hardware.

The build already shows some chunking, including separate chunks for program weeks, week review, standup feed, retro tabs, project weeks, and planning tabs. However, the very large index chunk suggests that route-level and feature-level code splitting can be improved.

## Recommended Improvements

- Generate and review a bundle treemap to identify the largest dependencies inside `index-C2vAyoQ1.js`.
- Lazy load heavy document editor and advanced workflow features.
- Review shared imports that may pull full libraries into the main chunk.
- Verify potentially unused dependencies before removal.
- Move rarely used admin, reporting, review, and advanced document features into separate lazy-loaded chunks.
- Target a 15% reduction in total bundle size or a 20% reduction in initial page-load JavaScript.

---

# Category 3: API Response Time

## What Was Measured

API response time was benchmarked against five frontend-observed endpoints:

- My Week
- Issues list
- Projects list
- Wiki documents list
- Action items

Each endpoint was tested at 10, 25, and 50 concurrent connections for approximately 20 seconds.

## P95 Measurement Note

The first API response time benchmark successfully measured endpoint latency under concurrent load, but the generated table reported P95 as `N/A`. This appears to have been a benchmark parser limitation rather than proof that P95 was unavailable. The script expected a field named `p95`, but the load-testing output did not expose that exact field name. Some benchmark tools, including autocannon depending on output format, report nearby percentile fields such as `p97_5` instead of `p95`.

A follow-up custom Node fetch latency sampler was run to calculate P50, P95, and P99 directly from request durations.

## Test Conditions

| Condition | Value |
|---|---:|
| Benchmark tool | Custom Node fetch latency sampler |
| Duration per test | 20 seconds |
| Concurrency levels | 10, 25, 50 |
| Endpoint count | 5 |
| API Response Time P95 captured? | Yes |

## Baseline Results

| Endpoint | Method | Concurrency | P50 | P95 | P99 | Avg | Req/Sec | Errors | Timeouts | Non-2xx |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| My Week | GET | 10 | 2.88 ms | 9.18 ms | 19.51 ms | 3.91 ms | 2544.30 | 0 | 0 | 50,886 |
| My Week | GET | 25 | 5.30 ms | 13.19 ms | 22.16 ms | 6.56 ms | 3812.15 | 0 | 0 | 76,243 |
| My Week | GET | 50 | 12.17 ms | 29.48 ms | 44.78 ms | 14.55 ms | 3437.15 | 0 | 0 | 68,743 |
| Issues list | GET | 10 | 2.14 ms | 6.04 ms | 13.53 ms | 2.91 ms | 3437.40 | 0 | 0 | 68,748 |
| Issues list | GET | 25 | 7.63 ms | 20.79 ms | 33.67 ms | 9.58 ms | 2609.65 | 0 | 0 | 52,193 |
| Issues list | GET | 50 | 13.39 ms | 43.23 ms | 70.34 ms | 18.41 ms | 2719.70 | 0 | 0 | 54,394 |
| Projects list | GET | 10 | 2.60 ms | 8.84 ms | 16.33 ms | 3.72 ms | 2686.85 | 0 | 0 | 53,737 |
| Projects list | GET | 25 | 5.63 ms | 15.85 ms | 24.30 ms | 7.07 ms | 3536.90 | 0 | 0 | 70,738 |
| Projects list | GET | 50 | 11.47 ms | 25.94 ms | 33.66 ms | 13.14 ms | 3805.35 | 0 | 0 | 76,107 |
| Wiki documents list | GET | 10 | 1.98 ms | 4.78 ms | 11.81 ms | 2.62 ms | 3817.55 | 0 | 0 | 76,351 |
| Wiki documents list | GET | 25 | 6.34 ms | 15.40 ms | 24.88 ms | 7.69 ms | 3251.05 | 0 | 0 | 65,021 |
| Wiki documents list | GET | 50 | 13.14 ms | 34.82 ms | 56.54 ms | 16.69 ms | 2994.10 | 0 | 0 | 59,882 |
| Action items | GET | 10 | 2.78 ms | 6.65 ms | 14.69 ms | 3.19 ms | 3135.35 | 0 | 0 | 62,707 |
| Action items | GET | 25 | 5.28 ms | 14.94 ms | 22.68 ms | 6.80 ms | 3678.05 | 0 | 0 | 73,561 |
| Action items | GET | 50 | 12.63 ms | 33.18 ms | 57.28 ms | 16.05 ms | 3114.80 | 0 | 0 | 62,296 |

## Slowest Endpoints by P95

| Rank | Endpoint | Method | Concurrency | P95 | P99 |
|---:|---|---|---:|---:|---:|
| 1 | Issues list | GET | 50 | 43.23 ms | 70.34 ms |
| 2 | Wiki documents list | GET | 50 | 34.82 ms | 56.54 ms |
| 3 | Action items | GET | 50 | 33.18 ms | 57.28 ms |
| 4 | My Week | GET | 50 | 29.48 ms | 44.78 ms |
| 5 | Projects list | GET | 50 | 25.94 ms | 33.66 ms |
| 6 | Issues list | GET | 25 | 20.79 ms | 33.67 ms |
| 7 | Projects list | GET | 25 | 15.85 ms | 24.30 ms |
| 8 | Wiki documents list | GET | 25 | 15.40 ms | 24.88 ms |
| 9 | Action items | GET | 25 | 14.94 ms | 22.68 ms |
| 10 | My Week | GET | 25 | 13.19 ms | 22.16 ms |

## Benchmark Validity Note

The benchmark showed no transport-level errors or timeouts. However, the Non-2xx counts were high across all endpoint runs. This indicates that the benchmark likely ran without the authenticated browser session or required request context. These results are useful for measuring response behavior under repeated request load, but the benchmark should be rerun with authenticated cookies or headers for a fully realistic logged-in user baseline.

---

# Category 4: Database Query Efficiency

## What Was Measured

This category measured database query efficiency in the unified document model. The audit looked for:

- N+1 query patterns
- Missing indexes
- Full table scans
- Repeated JSON property filtering
- Unnecessary data fetching
- Slowest observed query timings
- Before/after `EXPLAIN ANALYZE` evidence

## Baseline Query Flow Table

| User Flow | Total Queries | Slowest Query Observed | N+1 Detected? |
|---|---:|---:|---|
| Load main page | 290 | 121.509 ms | Possible / Partial |
| View a document | 45 | 10.342 ms | Possible / Partial |
| List issues | 28 | 217.776 ms | Possible / Partial |
| Load sprint board | 290 | 121.509 ms | Yes / Partial |
| Search content | ~28 | 8.279 ms | Possible / Partial |

Query counts should be interpreted as local baseline captures. Some captures included background polling, repeated session checks, and multiple endpoints firing close together, so the values are useful as audit evidence but should be rerun in isolated flows before being treated as final production performance numbers.

## Key Finding

The main inefficiency is query fan-out around the unified document model. The logs show repeated:

- Session validation queries
- Membership/role checks
- Document access checks
- `document_associations` lookups
- List queries calculating counts through subqueries
- JSON property casts and filters over the shared `documents` table

The slowest observed database operation during one flow was **121.509 ms**. The surrounding log section showed sprint/project loading queries with repeated count subqueries and session activity updates. Another notable query area in the list/issues logs showed **217.776 ms** around sprint/project query work.

## Slow Query Candidate

The selected slow-query candidate was a project-allocation query used by the sprint/document context workflow. It inferred project assignments from:

1. Sprint documents where a person appears in the JSON-backed `assignee_ids` array.
2. Issue documents assigned to a user through `document_associations` linking issues to sprints and projects.

The query filters the unified `documents` table by:

- `workspace_id`
- `document_type`
- `properties->>'project_id'`
- `properties->>'sprint_number'`
- `properties->'assignee_ids'`
- `properties->>'assignee_id'`

## Before EXPLAIN ANALYZE

The before plan showed:

| Metric | Before |
|---|---:|
| Planning Time | 6.732 ms |
| Execution Time | 2.502 ms |
| Issue lookup plan | Sequential scan on `documents` |
| Rows removed by filter | 240 |

The query was not severely slow on the local dataset, but the plan showed a sequential scan on the unified `documents` table for issue records. PostgreSQL scanned issue/document rows and removed 240 rows by filter before finding 18 matching rows. This confirms that the query depends on JSON property filters and casts over the shared document table.

## Change Made

Targeted indexes were added for JSON-backed document properties used by sprint, issue, and project workflows.

Sample index patterns:

```sql
-- Core document filtering
CREATE INDEX IF NOT EXISTS idx_documents_workspace_type_active
ON documents (workspace_id, document_type)
WHERE deleted_at IS NULL AND archived_at IS NULL;

-- Person lookup by user_id
CREATE INDEX IF NOT EXISTS idx_documents_person_user_id
ON documents (workspace_id, ((properties->>'user_id')::uuid))
WHERE document_type = 'person' AND deleted_at IS NULL;

-- Issue lookup by assignee_id
CREATE INDEX IF NOT EXISTS idx_documents_issue_assignee
ON documents (workspace_id, ((properties->>'assignee_id')::uuid))
WHERE document_type = 'issue' AND deleted_at IS NULL;

-- Sprint lookup by sprint_number
CREATE INDEX IF NOT EXISTS idx_documents_sprint_number
ON documents (workspace_id, ((properties->>'sprint_number')::int))
WHERE document_type = 'sprint' AND deleted_at IS NULL;
```

## Before vs. After Result

| Metric | Before | After | Improvement |
|---|---:|---:|---:|
| Planning Time | 6.732 ms | 5.042 ms | ~25.1% faster |
| Execution Time | 2.502 ms | 1.130 ms | ~54.8% faster |
| Issue lookup plan | Seq Scan on `documents` | Index Scan using `idx_documents_issue_assignee` | Improved |
| Rows Removed by Filter | 240 | Removed from issue lookup path | Improved |

The improvement target was met because execution time improved from **2.502 ms** to **1.130 ms**, which is approximately a **54.8% execution-time improvement**.

## Recommended Improvements

- Keep the targeted expression indexes for common JSON-backed filters.
- Batch repeated count queries instead of calculating counts through per-row subqueries.
- Rewrite correlated project/sprint list subqueries into grouped aggregate queries where possible.
- Avoid fetching heavy fields such as full `content` or `yjs_state` in list views.
- Validate session once per request and reuse an attached request auth context.
- Throttle `last_activity` writes so session activity is not updated on every request.

Best pattern:

```text
Request starts
Validate session once
Load workspace role once
Attach auth context to request
Downstream handlers reuse request.auth
Request ends
```

---

# Category 5: Test Coverage and Quality

## What Was Measured

This category measured:

- Test suite pass/fail counts
- Runtime
- Code coverage
- Critical flow coverage
- Coverage gaps
- Potential flaky-test risk

## Baseline Test and Coverage Results

| Package | Test Files | Tests | Runtime | Statements | Branches | Functions | Lines |
|---|---:|---:|---:|---:|---:|---:|---:|
| API | 28 passed | 451 passed | 76.34s | 40.34% | 33.44% | 40.90% | 40.52% |
| Web | 16 passed | 152 passed | 25.16s | 28.33% | 19.88% | 28.26% | 29.28% |

## Baseline Summary

| Metric | Baseline |
|---|---:|
| API total tests | 451 |
| API passing tests | 451 |
| API failing tests | 0 |
| API suite runtime | 76.34 seconds |
| API line coverage | 40.52% |
| Web total tests | 152 |
| Web passing tests | 152 |
| Web failing tests | 0 |
| Web suite runtime | 25.16 seconds |
| Web line coverage | 29.28% |
| Flaky tests | Not confirmed in baseline |

Expected local messages such as “CAIA not configured, skipping initialization” appeared during test execution. Some stderr output appeared during tests that intentionally simulate database failures, but those tests passed, so the stderr output represents expected error-handling test coverage rather than suite failures.

## Critical Flow Coverage Map

| Critical Flow | Coverage Status | Test Files Found / What They Cover |
|---|---|---|
| Document CRUD | Covered / Partial | `e2e/documents.spec.ts` covers viewing the document list, creating a document, editing a title, and confirming the document appears. `api/src/routes/documents.test.ts` covers deletion, 404 behavior, unauthenticated delete behavior, cross-workspace protection, cascade delete behavior, issue-field PATCH behavior, and weekly document resubmission. Full body-content persistence after reload is weak or not clearly covered. |
| Real-time sync / collaboration | Zero or Weak Coverage | No dedicated inspected test clearly verifies two browser sessions editing the same document and seeing Yjs/WebSocket sync without reload. |
| Auth / session | Strong Coverage | `e2e/auth.spec.ts` covers redirects, required login fields, invalid credentials, successful login, logout, protected routes, and case-insensitive email login. `api/src/routes/auth.test.ts` covers login validation, session cookies, PIV-only users, logout, `/api/auth/me`, expired sessions, session extension, session info, unique session IDs, and session fixation prevention. |
| Sprint / week management | Covered / Partial | `e2e/weeks.spec.ts` covers the Weeks tab, assigning issues to a sprint/week, and Start Week UI. `e2e/programs.spec.ts` covers weeks timeline and Plan Week navigation. API tests cover weekly plan/retro resubmission and accountability due-window logic. Full sprint lifecycle coverage is partial. |
| Issue management | Covered | `e2e/issues.spec.ts` covers issue navigation, issue list, issue creation, ticket numbers, filters, list/kanban view, editor opening, title editing, status/priority columns, issue row opening, URL filter updates, and keyboard shortcut creation. API tests cover issue field updates such as state, priority, estimate, assignee, and sprint association. Drag/drop kanban persistence is weak or not clearly covered. |
| Project management | Weak / Partial Coverage | Project coverage appears mostly through program-level workflows. Standalone project CRUD, project detail editing, project associations, and project-level permissions are weak or not directly covered. |
| Permissions / roles | Weak / Partial Coverage | Auth/session access and some cross-workspace protection are covered, but role-specific behavior such as admin/member/viewer differences, document visibility rules, and workspace role enforcement are not strongly covered. |

## Critical Flows With Zero or Weak Coverage

- Real-time sync / collaboration
- Role-based permission matrix
- Standalone project CRUD / project detail persistence
- Document body-content persistence after reload

## Recommended Improvements

Add meaningful tests for at least three previously weak or untested critical paths:

1. **Realtime document sync test**  
   Open the same document in two browser contexts, edit in one, and assert the second receives the update without reload.

2. **Role-based access test**  
   Create users with different workspace roles and verify restricted actions are blocked for lower-privilege users.

3. **Standalone project CRUD/association test**  
   Create a project, edit metadata/title, associate it with a program or issue/week, reload, and verify persistence.

---

# Category 6: Runtime Error and Edge Case Handling

## Baseline Measurement

| Metric | Baseline |
|---|---|
| Console errors during normal usage | 0 unexpected errors observed |
| Console warnings during normal usage | No major unexpected warnings observed |
| Unhandled promise rejections on server | 0 observed during tested flows |
| Network disconnect recovery | Partial |
| Missing error boundaries | None confirmed during normal usage |
| Silent failures identified | Network-offline editing stops app interaction until connection returns |

## Runtime Testing Summary

Runtime and edge-case testing was performed during normal local usage of the application. Browser DevTools was used to monitor console output while navigating through the application, opening major pages, and interacting with document and workflow screens.

During normal usage, the website ran as expected. No surprise console errors were observed, the application did not show noticeable lag, and the tested API endpoints returned successful `200` responses.

Server and observability logs were also reviewed. The logs showed endpoint activity and successful responses, indicating that the frontend and backend were communicating correctly during normal operation. No unhandled server-side promise rejections or unexpected backend crashes were observed during the tested flows.

## Network Failure Testing

Network failure was tested by disconnecting the browser network while using the application. When the network was offline, the website stopped responding to network-dependent actions, which is expected because API and realtime collaboration requests could not complete. Once the network was restored, the application continued communicating with the backend, and endpoints returned `200` responses again.

Network disconnect recovery is marked as **Partial** because the app did not crash, but the offline state could be clearer to the user. The application should ideally show a visible message such as “Connection lost” or “Reconnecting” so users understand that the app is offline and that document changes may not be synced yet.

## Malformed Input Testing

Malformed and edge-case inputs were tested through normal form and document interactions, including empty values, long text, special characters, and script-like input. No unexpected crashes or surprise runtime errors were observed during the tested input cases. The app continued running normally, and server responses remained stable.

## Concurrent / Edge Case Behavior

Concurrent edge-case behavior was reviewed at a basic level by interacting with document/workflow views during normal usage. No obvious runtime crashes, major UI breakage, or unexpected server errors were observed. Further testing should still be performed with two active users editing the same document field at the same time to fully validate conflict handling and realtime collaboration behavior.

## Slow Network / Throttling Behavior

The application was tested under slower network conditions. No major lag or unexpected runtime errors were observed during normal navigation. The main risk area remains network-dependent workflows, especially document editing and realtime collaboration, because the UI should communicate when the app is offline, reconnecting, or waiting for sync.

## Finding

The application handled normal runtime usage well. The strongest observed gap is not a crash or server failure, but user-facing clarity during network loss. When the network goes offline, the website stops network-dependent behavior, but the user may not receive enough feedback explaining whether the app is disconnected, retrying, or whether changes are safely synced.

## Recommended Improvement

Add a clear offline/reconnecting state for document editing and realtime collaboration. The UI should display a visible message when the connection is lost and confirm when the connection is restored. This would reduce user confusion and lower the risk of perceived data loss during offline or unstable network conditions.

---

# Category 7: Accessibility Compliance

## What Was Measured

Accessibility was reviewed using:

- Chrome DevTools Lighthouse 13.0.2 desktop mode
- axe violation counts
- Keyboard navigation testing
- Windows Narrator screen reader testing
- Color contrast review
- Static ARIA/label scan

## Lighthouse Baseline

Lighthouse accessibility testing was performed on a tested page using Chrome DevTools Lighthouse 13.0.2 in desktop mode. The page received an accessibility score of **100**. Lighthouse reported no automated accessibility failures and passed checks for:

- Accessible button names
- Form labels
- Link names
- Color contrast
- Valid ARIA usage
- Heading order
- Document title
- Language attribute
- Main landmark
- Focusable skip links

However, Lighthouse also identified several items requiring manual review, including keyboard focusability, logical tab order, focus trapping, custom control labeling, ARIA roles, screen reader usability, and whether focus is directed correctly when new content appears.

Because automated scanning cannot fully verify WCAG 2.1 AA or Section 508 compliance, this score should be treated as strong automated evidence, not a complete accessibility certification.

| Metric | Baseline |
|---|---|
| Lighthouse accessibility score | Tested page: 100 |
| Automated Lighthouse accessibility failures | 0 |
| Manual checks still required | 10 |

## Axe Violation Summary

| Page | Critical | Serious | Moderate | Minor | Main Issue Types |
|---|---:|---:|---:|---:|---|
| Login | 0 | 0 | 0 | 0 | No automated axe violations |
| Dashboard / My Week | 0 | 5 | 0 | 0 | Serious accessibility violations found by axe |
| Documents | 0 | 0 | 0 | 0 | No automated axe violations |
| Document Detail | 1 | 0 | 0 | 0 | Critical accessibility violation found by axe |
| Issues | 1 | 0 | 1 | 0 | Critical and moderate accessibility violations found by axe |
| Projects | 0 | 0 | 0 | 0 | No automated axe violations |
| Programs | 0 | 1 | 0 | 0 | Serious accessibility violation found by axe |
| Week / Sprint View | 0 | 19 | 0 | 0 | Serious accessibility violations found by axe |

| Metric | Baseline |
|---|---:|
| Total Critical/Serious violations | 27 |
| Total Critical/Serious/Moderate violations | 28 |

## Keyboard Navigation

Keyboard navigation was tested using Tab, Shift+Tab, Enter, Escape, Space, and arrow keys. During manual testing, interactive controls were reachable by keyboard. Because modal focus trapping, focus return, and custom control behavior were not exhaustively verified on every page, keyboard navigation is marked as **Partial** rather than fully certified.

| Metric | Baseline |
|---|---|
| Keyboard navigation completeness | Partial |

## Screen Reader Testing

Screen reader testing was performed using Windows Narrator. Page text could be read aloud through the speakers, and navigation between pages produced audible output. This confirms basic screen reader compatibility, but the result is marked **Partial** because a full screen reader audit would also need to verify heading structure, landmarks, form labels, modal announcements, error announcements, and custom control names.

| Metric | Baseline |
|---|---|
| Screen reader usability | Partial |

## Color Contrast Findings

| Location | Element | Issue | Pass/Fail |
|---|---|---|---|
| Sidebar | Nav text | None observed | Pass |
| Issues page | Status badge | None observed | Pass |
| Document page | Icon button | None observed | Pass |
| Programs | Table row | None observed | Pass |
| Projects | Table row / score styling | One possible contrast issue observed | Fail |

| Metric | Baseline |
|---|---:|
| Color contrast failures | 1 |

## Missing ARIA Labels or Roles

A static ARIA scan found 71 possible missing ARIA or label findings. These should be treated as review candidates because static scans can overcount issues that may be resolved at runtime. The most important findings were related to modal/dialog role labeling and form-control labeling.

| Metric | Count |
|---|---:|
| Possible missing ARIA / label findings | 71 |

| File | Line | Type | Recommendation |
|---|---:|---|---|
| `web/src/components/ActionItemsModal.tsx` | 1 | Possible dialog/modal missing accessible role or label | Ensure modal has `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` or `aria-label`. |
| `web/src/components/ApprovalButton.tsx` | 1 | Possible dialog/modal missing accessible role or label | Ensure modal has `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` or `aria-label`. |
| `web/src/components/ConfirmDialog.tsx` | 1 | Possible dialog/modal missing accessible role or label | Ensure modal has `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` or `aria-label`. |
| `web/src/components/dialogs/BacklogPickerModal.tsx` | 298 | Possible form control missing accessible label | Add a visible `<label>`, `aria-label`, or `aria-labelledby`. |

## Recommended Accessibility Improvements

- Fix all Critical and Serious axe violations on Dashboard/My Week, Document Detail, Issues, Programs, and Week/Sprint View.
- Review all modal/dialog components for `role="dialog"`, `aria-modal="true"`, and accessible labels.
- Add labels or ARIA labels to any unlabeled form controls.
- Confirm keyboard focus trapping and focus return for modals.
- Verify screen reader behavior with NVDA or Narrator across the major workflows.
- Fix the possible Projects table / score contrast issue.

---

# Cross-Cutting Key Findings

## Finding 1: Document-Level Authorization Must Be Explicit

Because the platform uses an “everything is a document” model, authorization cannot only happen at the route level. Every document read, write, update, delete, share, export, and realtime sync event must verify whether the current user has permission to access that specific document.

**Risk:** Unauthorized users may access or mutate documents if API routes or WebSocket events trust client-side state.

**Recommended Fixes:**

- Add server-side document permission checks for every document operation.
- Validate permissions inside REST API handlers and WebSocket/Yjs sync handlers.
- Use document roles such as owner, editor, commenter, viewer, and admin.
- Log denied access attempts.

---

## Finding 2: Realtime Collaboration Requires WebSocket Authorization

The realtime layer uses WebSockets and Yjs CRDTs. This creates a separate security surface from normal HTTP APIs. Even if REST endpoints are protected, attackers may attempt to connect directly to the WebSocket server and subscribe to a document room.

**Risk:** A user could join a document collaboration session without permission if the WebSocket server does not validate identity and document access.

**Recommended Fixes:**

- Authenticate WebSocket connections.
- Validate document access before joining a Yjs room.
- Re-check permissions on reconnect.
- Prevent anonymous or stale-session collaboration.
- Log connection, join, leave, sync, and rejected events.

---

## Finding 3: Document Revision History and Provenance Should Be Auditable

A Treasury-style document platform needs strong traceability. The system should record who created a document, who edited it, when it changed, what changed, and whether the change came from a normal editor action, realtime sync, import, automation, or admin action.

**Risk:** Without revision history and audit logs, the system cannot reliably investigate unauthorized changes, accidental data loss, or document tampering.

**Recommended Fixes:**

- Store document version history.
- Track created_by, updated_by, created_at, and updated_at.
- Track document events such as create, edit, share, export, delete, restore, archive, and permission change.
- Avoid storing sensitive raw content in logs unless required and protected.

---

## Finding 4: API Security Should Be Tested Against OWASP API Risks

The Express/Node backend should be audited for broken object-level authorization, excessive data exposure, unsafe mass assignment, missing rate limits, and injection risks.

**Risk:** APIs may expose document data, user data, metadata, or admin-only fields if request validation and authorization are incomplete.

**Recommended Fixes:**

- Validate all request bodies.
- Use server-side authorization for every object ID.
- Prevent mass assignment by whitelisting allowed fields.
- Add rate limiting to sensitive routes.
- Sanitize and parameterize database queries.
- Return minimum necessary fields.

---

## Finding 5: Accessibility Must Be Verified Beyond Lighthouse

Lighthouse score is useful but not enough for WCAG 2.1 AA or Section 508 certification.

**Risk:** Government-facing software must be usable by people with disabilities. Rich text editors, modals, icon buttons, and realtime collaboration tools are common accessibility risk areas.

**Recommended Fixes:**

- Fix Critical/Serious axe violations first.
- Verify keyboard-only navigation.
- Add labels to all form controls.
- Ensure modals trap focus correctly.
- Confirm editor toolbar buttons have accessible names.
- Test color contrast.
- Add skip links and semantic landmarks.
- Ensure error messages are announced clearly.

---

## Finding 6: Infrastructure Should Avoid Hardcoded Secrets

Docker and Terraform configurations should be reviewed for secrets, unsafe defaults, exposed ports, permissive networking, and missing environment separation.

**Risk:** Secrets or overly permissive infrastructure can expose the application, database, or internal services.

**Recommended Fixes:**

- Use environment variables or secret managers.
- Do not commit `.env` files.
- Restrict database access.
- Separate dev, staging, and production configuration.
- Review Terraform state handling.
- Ensure Docker containers do not run with unnecessary privileges.

---

# Final Conclusion

The Ship document platform has a strong foundation for a collaborative government-style document application. The monorepo structure, modern frontend, Express backend, PostgreSQL persistence, Yjs realtime collaboration, testing stack, Docker, and Terraform all support a production-ready direction.

The main audit concern is that the **everything is a document** architecture makes document-level security, query performance, type safety, and realtime authorization central to the system. Every document action must be authorized, logged, typed correctly, and tested across both HTTP APIs and WebSocket collaboration channels.

The audit now includes baseline measurements for all seven required categories. The strongest implementation evidence is in database query improvement, API/web test execution, and measured type-safety and bundle-size baselines. The most important remaining work is to fix Critical/Serious accessibility issues, improve realtime collaboration testing, harden role-based permissions, reduce unsafe TypeScript patterns, and improve user-facing recovery during offline/reconnect events.

