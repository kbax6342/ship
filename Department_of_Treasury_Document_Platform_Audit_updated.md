# Department of Treasury Document Platform Audit


## Executive Summary

This audit reviewed a monorepo-based collaborative document platform built with React, Vite, Tailwind, TipTap, Yjs, Express, Node.js, PostgreSQL, WebSockets, Playwright E2E tests, Docker, and Terraform.

The core architectural decision is that "everything is a document." This means the application treats pages, records, content, workflows, and collaboration artifacts as document-based objects. Because of that design, the highest-risk areas are document-level authorization, version history, realtime editing conflicts, audit logging, document ownership, data retention, and access to sensitive government or financial information.

The audit focused on security, authentication and authorization, document integrity, realtime collaboration, accessibility, performance, data model quality, infrastructure, testing coverage, and public-sector readiness.

Overall, the system has a strong modern architecture for collaborative workflows, but the audit should verify that the implementation enforces least privilege access, protects document data over REST and WebSocket channels, records meaningful audit events, prevents unauthorized document mutation, handles concurrent edits safely, and provides accessible user flows for all users.


## System Architecture Reviewed

 Frontend
- React
- Vite
- Tailwind CSS

Editor
- TipTap rich text editor
- Yjs collaborative document state

Backend
- Express
- Node.js

Database
- PostgreSQL

 Realtime Layer
- WebSocket
- Yjs CRDT synchronization

Testing
- Playwright E2E tests, 73+ tests

Infrastructure
- Docker
- Terraform

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


users
 ├── created documents
 ├── assigned issues
 └── session/auth ownership

documents
 ├── document_type: doc | issue | project | sprint
 ├── parent_id: points to another document
 ├── project_id: connects an issue/doc to a project document
 ├── sprint_id: connects work to a sprint document
 ├── created_by / updated_by: points to users
 └── content/title/status/metadata fields

document_relationships / links
 ├── source_document_id
 ├── target_document_id
 └── relationship_type

audit/activity tables
 ├── document_id
 ├── user_id
 └── operation/action metadata



## Architectural Model

Ship uses a unified document model for database objects. Instead of treating wiki pages, issues, projects, weeks, and weekly plans as completely separate data structures, Ship represents these user-created items as documents. Each document can be identified by its type and configured with properties that match the specific kind of object it represents. This allows the system to manage different parts of the application through one consistent document-based architecture. 


## Audit Scope

This audit reviewed the following areas:

- Type safety and unsafe TypeScript patterns
- Bundle size, code splitting, and frontend performance
- API response time under normal and concurrent load
- PostgreSQL query performance, indexes, and N+1 risks
- Playwright test coverage, gaps, and flakes
- Runtime error handling and data-loss prevention
- Accessibility and Section 508 readiness
- WebSocket/Yjs realtime collaboration reliability
- Unified “everything is a document” data model integrity
- Local setup, Docker, Terraform, and deployment readiness
- Government/public-sector reliability, auditability, and maintainability



## Audit

## Type Safety Audit Findings
The TypeScript safety audit found a high number of type-safety violations across the monorepo. The project has strict mode enabled, which is positive, but the compiler still reported 5,073 TypeScript errors, indicating that strict typing is not yet being enforced cleanly across the full codebase.
The audit identified 2,141 measured type-safety violations, including:
Violation Type
Count
Explicit any types
394
Type assertions using as
1,366
Non-null assertions using !
380
TypeScript suppression comments
1
Total measured violations
2,141

The largest concentration of violations appeared in the API package, which accounted for 1,408 of the 2,141 total findings. This is important because the API layer handles document operations, database records, authorization-sensitive workflows, and data passed between the frontend and backend.
The frontend/web package also contained a meaningful number of violations, with 515 findings, including explicit any, type assertions, non-null assertions, and one TypeScript suppression directive.


### Risk Assessment
The audit shows that the codebase currently relies heavily on TypeScript bypass patterns, especially type assertions using as. While some assertions may be valid, repeated use of as can weaken TypeScript’s ability to verify actual runtime data shapes.
This is especially risky for this project because the platform treats core entities as documents. Documents, issues, projects, weeks, weekly plans, editor content, API responses, and realtime collaboration state all depend on accurate and predictable data structures.
Weak typing in these areas can lead to:
Invalid document data being accepted by the API
Runtime failures when optional values are assumed to exist
Broken editor or document rendering behavior
Unsafe database record handling
Realtime collaboration state mismatches
Hidden bugs that TypeScript would normally catch
The most violation-dense files were concentrated in API route handlers:
File
Violation Count
Main Issue
api/src/routes/weeks.ts
173
Type assertions
api/src/routes/team.ts
138
Type assertions
api/src/routes/projects.ts
86
Type assertions
api/src/services/accountability.test.ts
72
Type assertions
api/src/routes/issues.ts
69
Non-null assertions

These files should be prioritized because they sit close to core business logic and document-related workflows.


### Report Summary
Overall, the TypeScript safety posture is partially mature but not yet strong. The project has strict mode enabled, but the high number of compiler errors and measured unsafe typing patterns show that strictness is not yet fully operational across the monorepo.
The most significant issue is the heavy use of type assertions in the API package. This suggests that important backend workflows may be forcing data into expected shapes instead of validating or narrowing those shapes safely. The presence of explicit any types and non-null assertions also indicates areas where runtime bugs may be hidden from the compiler.
For a government-style document system, this creates reliability and maintainability concerns. Stronger typing would improve confidence in document updates, API contracts, database access, realtime collaboration, and future feature development.


### Recommended Remediation
The project should address TypeScript safety in phases:
Prioritize API route files first, especially weeks.ts, team.ts, projects.ts, and issues.ts.
Replace repeated as assertions with typed request schemas, shared interfaces, validation helpers, or safer type guards.
Reduce explicit any usage by introducing proper domain types for documents, projects, weeks, users, teams, and API payloads.
Replace non-null assertions with explicit existence checks, early returns, or typed fallback handling.
Resolve strict-mode compiler errors package by package instead of trying to fix the entire monorepo at once.
Rerun ESLint in JSON mode after cleanup so ESLint errors and warnings can be added to the baseline table.

## Category 2: Bundle Size Findings
The production frontend bundle was successfully generated and measured from the web/dist output folder. The baseline production bundle size is 3,349.61 KB, with 262 JavaScript/CSS chunks generated during the build.
The largest output file is:
web/dist/assets/index-C2vAyoQ1.js — 2,025.1 KB
This single JavaScript file accounts for the majority of the measured frontend bundle size. Although the project does generate many smaller chunks, the presence of one very large main index chunk suggests that the initial page-load bundle may still be carrying too much application code, shared logic, editor functionality, or large third-party dependencies up front.
Baseline Measurement
Metric
Baseline
Total production bundle size
3,349.61 KB
Largest chunk
web/dist/assets/index-C2vAyoQ1.js — 2,025.1 KB
Number of JS/CSS chunks
262
Top 3 largest dependencies
Pending bundle treemap confirmation
Unused dependencies identified
2

Largest Bundle Chunks
Rank
File
Size
1
web/dist/assets/index-C2vAyoQ1.js
2,025.1 KB
2
web/dist/assets/index-DJeYp5na.css
64.95 KB
3
web/dist/assets/ProgramWeeksTab-BzbUWlt4.js
16.37 KB
4
web/dist/assets/WeekReviewTab-DmxN07T1.js
12.35 KB
5
web/dist/assets/StandupFeed-BjJLDai5.js
9.42 KB

Potentially Unused Dependencies
The static dependency scan identified two dependencies that did not appear to be imported directly from web/src:
Dependency
Version
@tanstack/query-sync-storage-persister
^5.90.18
@uswds/uswds
^3.13.0

These should be manually reviewed before removal because static import scans can miss indirect usage, CSS imports, build-time usage, or configuration-based usage.

### Risk Assessment
The main bundle size presents a moderate performance risk. A total production frontend size of 3.35 MB is not extreme for a complex document platform, but the largest JavaScript chunk is over 2 MB, which may slow initial page load on slower networks, older devices, or public-sector environments with constrained hardware.
This matters because the application is a document-centered system. Users may need to load dashboards, documents, issues, programs, weekly planning views, editor screens, collaboration features, and review workflows. If too much of that functionality is included in the first loaded JavaScript chunk, users pay the performance cost before they interact with those features.
The build already shows some evidence of chunking, including separate chunks for program weeks, week review, standup feed, retro tabs, project weeks, and planning tabs. However, the very large index chunk suggests there is still room to improve route-level and feature-level code splitting.
Recommended Improvements
The project should prioritize reducing the initial JavaScript payload without removing functionality. Recommended next steps:
Generate and review the bundle treemap to identify the largest dependencies inside index-C2vAyoQ1.js.
Lazy load heavy routes and document editor features so editor-related code does not load before the user needs it.
Review large shared imports that may be pulling full libraries into the main chunk.
Manually verify potentially unused dependencies, especially @tanstack/query-sync-storage-persister and @uswds/uswds.
Move rarely used admin, review, reporting, and advanced document features into separate lazy-loaded chunks.
Set a bundle improvement target of either a 15% reduction in total production bundle size or a 20% reduction in the initial page-load JavaScript chunk.

## Category 3: API Response Time Benchmark Summary
The API response time benchmark was executed with autocannon against five frontend-observed endpoints: My Week, Issues list, Projects list, Wiki documents list, and Action items. Each endpoint was tested at 10, 25, and 50 concurrent connections for approximately 20 seconds per test.
The initial benchmark produced latency measurements for P50, P99, average response time, request throughput, and error/response status behavior. However, the run should be treated as a diagnostic baseline rather than a final successful API performance baseline, because the raw benchmark output shows that the requests did not return successful 2xx responses. The raw JSON results show 2xx: 0 and high 4xx counts across the tested endpoints, with most responses returning 429 rate-limit responses and some 401 or 404 responses.
This means the benchmark successfully tested backend behavior under load, but it primarily measured the speed of rejected, rate-limited, unauthorized, or unresolved requests rather than the full successful endpoint execution path. Because of that, the reported latencies are very low and should not be interpreted as proof that the real application data-loading paths are equally fast under authenticated, successful conditions.
Initial Benchmark Results at 50 Connections
Endpoint
P50
P99
Avg
Req/Sec
Non-2xx
Main Status Behavior
My Week
9 ms
30 ms
10.04 ms
4,745.61
94,901
Mostly 429
Issues list
11 ms
26 ms
11.88 ms
4,039.62
84,816
Mostly 429
Projects list
10 ms
25 ms
10.76 ms
4,437.15
93,166
Mostly 429
Wiki documents list
16 ms
50 ms
17.83 ms
2,727.25
54,534
Mostly 429
Action items
12 ms
31 ms
13.04 ms
3,691.86
77,519
Mostly 429


### Benchmark Validity Note
The benchmark results indicate that the server responded quickly under high request volume, but the test did not yet produce valid success-path API timing. Since all benchmarked responses were non-2xx, the current results are most useful for identifying rate limiting, authentication behavior, and endpoint path validation issues. The next benchmark run should use the same endpoint list, data volume, concurrency levels, and hardware, but include a valid authenticated browser session cookie or authorization header so that the endpoints return 200 responses during the test.

### P95 Note
The generated table shows P95 as N/A because the current autocannon JSON output did not include a direct p95 field. The raw data did include nearby percentile values such as p97_5 and p99. For the final audit deliverable, the benchmark script should either be adjusted to compute or capture P95 explicitly, or the report should clearly state that p97.5 was used as a more conservative tail-latency proxy.

## Category 4: Database Query Efficiency
The application uses a unified document model where major business objects such as projects, issues, sprints, people, standups, weekly plans, and wiki documents are stored in the same documents table and separated by document_type plus JSON properties. The logs show repeated filters against fields such as workspace_id, document_type, properties->>'user_id', properties->>'assignee_id', properties->>'sprint_number', properties->>'project_id', and properties->'assignee_ids'. This model is flexible, but it creates query-efficiency risks when JSON properties are cast and filtered repeatedly without targeted indexes.

### Audit Deliverable Table
User Flow
Total Queries
Slowest Query Observed
N+1 Detected?
Load main page
31
~43.702 ms observed in shared logs
Possible / Partial
View a document
77
~56.017 ms / 44.141 ms observed around project/list hydration
Yes / Partial
List issues
28
~72.912 ms observed in shared logs
Possible / Partial
Load sprint board
290
~121.509 ms observed on sprint/project board query
Yes / Partial
Search content
~28 observed in earlier isolated capture
~8.279 ms
Possible / Partial

I would not claim the total query counts as final until you rerun each flow in isolation, because several pasted logs include background polling, repeated session checks, and multiple endpoints firing at the same time. The slowest-query evidence is still useful because the same patterns repeat across the captures.

The slowest visible duration appears right after the sprint/project loading section, where the app is querying sprint/project data and calculating issue counts/completed counts/started counts through repeated subqueries.
One note: PostgreSQL sometimes logs the duration: line separately from the SQL text, so for the report I would phrase it safely like this:
The slowest observed database operation during the load-main-page flow was 121.509 ms. The surrounding log section shows sprint/project loading queries with repeated count subqueries and session activity updates, which are likely contributors to the slowest observed database work.
The next notable slow duration I saw nearby was 72.912 ms, and the surrounding log also shows repeated UPDATE sessions SET last_activity = $1 WHERE id = $2 activity, which may indicate session-write overhead during page load.


### Key Finding
The main inefficiency is query fan-out around the unified document model. The logs show repeated session validation, repeated membership/role checks, repeated document access checks, repeated document_associations lookups, and list queries that calculate counts through subqueries. For example, the sprint/project query calculates issue_count, completed_count, and started_count using multiple nested COUNT(*) subqueries per sprint. The view-document flow also triggers linked-document lookups through document_links, access checks against documents.visibility, and repeated workspace_memberships role checks.
Something I would add to this project to help with queries are creating indexes for the query patterns that are viewable in the datalogs in the project. Right now, our database is incredibly flexible because we store a lot of different data types (like issues, sprints, and wiki pages) inside a single, giant table using flexible JSON data fields.
However, because that data isn't structured like a traditional table, every time a user loads a page, the database has to scan every single row from top to bottom and unpack that JSON data to find what it needs. As our data grows, this page-loading process will get slower and slower.
To fix this, we are creating targeted database indexes that match our exact user query patterns."
Here are some sample queries: 

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

Some other improvements that could be made the the codebase include batching repeated count queries, replace repeated queries with on big grouped query remove the N+1 style pattern. 

Also correlated project/sprint list subqueries could be rewritten.

Stop fetching heavy fields in list views, in list views only fetch fields needed to render cards or rows. 

Reduce repeated auth/sessions queries

Best patter
Request starts
Validate session once
Load workspace role once
Attach auth context to request
Downstream handlers reuse request.auth
Request Ends

*Also throttle last_activity writes. Do not update it every request if the last update was a few seconds ago. Update it once every 60 seconds per session. 

For the logs for list-issues The log shows this query area taking as high as:
217.776 ms
during the bind stage, with other related operations showing higher tail timings such as:
72.606 ms
55.552 ms
53.137 ms
48.531 ms
45.573 ms
38.517 ms
30.558 ms
30.170 ms
28.948 ms
27.767 ms
25.837 ms

| User Flow | Total Queries | Slowest Query (ms) | N+1 Detected? |
|---|---:|---:|---|
| List issues | TBD | 217.776 ms | Possible / Partial |
| Load sprint board | TBD | 19.799 ms | Possible / Partial |
| Search content | TBD | 8.279 ms | Possible / Partial |
PS C:\Users\USER\Documents\GitHub\ship> Select-String -Path .\audit-output\db-query-logs\view-document-before.log -Pattern "LOG:  execute <unnamed>" | Measure-Object


Count    : 45
Average  : 
Sum      : 
Maximum  : 
Minimum  : 
Property : 



Before | View a document | 45 | ___ ms | Yes / No |
PS C:\Users\USER\Documents\GitHub\ship> Select-String -Path .\audit-output\db-query-logs\view-document-before.log -Pattern "duration: [0-9.]+ ms" |
>>   ForEach-Object {
>>     if ($_.Line -match "duration: ([0-9.]+) ms") {
>>       [pscustomobject]@{
>>         DurationMs = [double]$matches[1]
>>         Line = $_.Line
>>       }
>>     }
>>   } |
>>   Sort-Object DurationMs -Descending |
>>   Select-Object -First 10

DurationMs Line                                                                                                                                                                       
---------- ----                                                                                                                                                                       
    10.342 2026-05-19T21:30:48.633071285Z 2026-05-19 21:30:48.632 UTC [668] LOG:  duration: 10.342 ms  bind <unnamed>: SELECT DISTINCT ON (project_id) project_id, project_name FROM (
     9.967 2026-05-19T21:30:48.622551335Z 2026-05-19 21:30:48.621 UTC [668] LOG:  duration: 9.967 ms  parse <unnamed>: SELECT DISTINCT ON (project_id) project_id, project_name FROM (
     9.699 2026-05-19T21:30:48.555175550Z 2026-05-19 21:30:48.554 UTC [668] LOG:  duration: 9.699 ms  parse <unnamed>: SELECT s.id, s.title, s.properties, COUNT(i.id) as issue_count 
     9.214 2026-05-19T21:30:48.657358832Z 2026-05-19 21:30:48.655 UTC [668] LOG:  duration: 9.214 ms  bind <unnamed>: SELECT DISTINCT ON (project_id) project_id, project_name FROM ( 
     7.324 2026-05-19T21:30:48.589267648Z 2026-05-19 21:30:48.588 UTC [668] LOG:  duration: 7.324 ms  parse <unnamed>: SELECT MAX(created_at::date) as last_standup_date              
     6.792 2026-05-19T21:30:48.672721349Z 2026-05-19 21:30:48.672 UTC [668] LOG:  duration: 6.792 ms  bind <unnamed>: SELECT                                                          
     5.279 2026-05-19T21:30:48.563025232Z 2026-05-19 21:30:48.562 UTC [668] LOG:  duration: 5.279 ms                                                                                  
     3.292 2026-05-19T21:30:48.575088594Z 2026-05-19 21:30:48.574 UTC [668] LOG:  duration: 3.292 ms                                                                                  
     2.553 2026-05-19T21:30:48.534272669Z 2026-05-19 21:30:48.533 UTC [668] LOG:  duration: 2.553 ms  parse <unnamed>: SELECT sprint_start_date FROM workspaces WHERE id = $1         
     2.407 2026-05-19T21:30:48.573063015Z 2026-05-19 21:30:48.570 UTC [668] LOG:  duration: 2.407 ms  bind <unnamed>: SELECT id FROM documents                                        

The slowest observed database log timing came from a project-allocation query used during the document/sprint context workflow. The query uses SELECT DISTINCT ON to infer project assignments from both sprint documents and issue documents. It filters the unified documents table by document_type and JSON-backed properties such as project_id, sprint_number, assignee_ids, and assignee_id, then joins through document_associations to connect issues, sprints, and projects.

The PostgreSQL log showed this query taking 9.967 ms during parse and 10.342 ms during bind, making it the strongest slow-query candidate from this capture. This does not necessarily mean execution alone took 10.342 ms, but it does show that this query shape is complex enough to require EXPLAIN ANALYZE validation.

This query is inefficient-risky because it depends on repeated JSON property casts and relationship joins against a unified document table. As the number of documents, issues, sprints, projects, and associations grows, this pattern may require expression indexes and grouped/batched relationship lookups to avoid full table scans or repeated filtering.

docker exec -it ship-postgres-1 psql -U ship -d ship_dev

What the EXPLAIN result means
Your query is not terrible in the local dataset, but it clearly shows the optimization opportunity.
Key numbers:
Planning Time: 6.732 ms
Execution Time: 2.502 ms
Buffers: shared hit=164
So the actual query execution was fast locally, but planning was higher than execution. The earlier log timing showed the same query taking 9.967 ms parse and 10.342 ms bind, which supports the idea that this is a complex query shape even if the current dataset is still small.
The important finding is this part:
Seq Scan on public.documents i
Rows Removed by Filter: 240
That means PostgreSQL scanned the documents table for issue records and filtered out 240 rows before finding 18 matching rows. That is the clearest evidence of an index opportunity. The plan also shows the sprint branch using only idx_documents_document_type, then filtering by workspace, assignee IDs, and sprint number afterward.

Before EXPLAIN ANALYZE:
The selected slow-query candidate was a project-allocation query used by the sprint/document context workflow. The query inferred project assignments from two sources: sprint documents where a person appears in the JSON-backed assignee_ids array, and issue documents assigned to a user through document_associations linking issues to sprints and projects.
The before EXPLAIN ANALYZE result showed Planning Time of 6.732 ms and Execution Time of 2.502 ms. The query was not severely slow on the local dataset, but the plan showed a Seq Scan on the unified documents table for issue records. PostgreSQL scanned issue/document rows and removed 240 rows by filter before finding 18 matching rows. This confirms that the query depends on JSON property filters and casts over the shared documents table.
The most important inefficiency is that the query filters document records using JSON-backed fields such as properties->>'assignee_id', properties->>'sprint_number', properties->>'project_id', and properties->'assignee_ids'. Without targeted expression or GIN indexes, these filters can force PostgreSQL to scan broader portions of the documents table as the dataset grows.
Change made:

Targeted indexes were added for the JSON-backed document properties used by the project-allocation query. The most important index targets were issue assignee lookup, sprint number lookup, sprint project lookup, sprint assignee_ids JSON array lookup, and document association relationship lookups. These indexes allow PostgreSQL to find the relevant issue and sprint documents directly instead of scanning broader portions of the unified documents table and filtering afterward.

Why this fixes the issue:

The original plan showed a sequential scan on the documents table for issue records, with 240 rows removed by filter. That indicates PostgreSQL was scanning candidate document rows and then applying workspace, document_type, deleted_at, and JSON assignee filters afterward. Adding expression indexes for the JSON filters gives the planner a more selective access path for the common document query patterns used by sprint, issue, and project workflows.
Before vs. After Result
Metric
Before
After
Improvement
Planning Time
6.732 ms
5.042 ms
~25.1% faster
Execution Time
2.502 ms
1.130 ms
~54.8% faster
Issue lookup plan
Seq Scan on documents
Index Scan using idx_documents_issue_assignee
Improved
Rows Removed by Filter
240
Removed from issue lookup path
Improved

You met the improvement target because the requirement says:
50% improvement on the slowest query
Your execution time improved from:
2.502 ms → 1.130 ms
That is about:
((2.502 - 1.130) / 2.502) * 100 = 54.8%
So yes — this is strong enough to highlight in the report.
What changed technically
Before the index changes, PostgreSQL used a sequential scan on the unified documents table for the issue side of the query. It scanned document rows and removed many rows by filter before finding the matching issue records.
After the index changes, PostgreSQL used:
Index Scan using idx_documents_issue_assignee on public.documents i
That means the new expression index helped PostgreSQL go directly to issue documents for the selected workspace and assignee instead of scanning the broader documents table. The after plan also shows the document_associations lookup using an index-only scan for the sprint relationship path.
Before the optimization, the selected slow-query candidate used the unified documents table to infer project allocations from sprint documents and issue documents. The query filtered JSON-backed document properties such as properties->>'project_id', properties->>'sprint_number', properties->'assignee_ids', and properties->>'assignee_id', then joined through document_associations to connect issues, sprints, and projects.

The before EXPLAIN ANALYZE output showed Planning Time of 6.732 ms and Execution Time of 2.502 ms. The plan also showed a sequential scan on the documents table for issue records, with rows removed by filter. This indicated that PostgreSQL was scanning broader document rows and then applying JSON property filters afterward.

To improve the query, targeted indexes were added for the common document filters used by this workflow. The most important index was an expression index on issue assignee lookup: workspace_id plus (properties->>'assignee_id')::uuid for active issue documents. Additional indexes were added for sprint number, sprint project lookup, sprint assignee_ids, and document association relationship lookups.

After the optimization, the EXPLAIN ANALYZE output showed PostgreSQL using idx_documents_issue_assignee instead of a sequential scan for the issue lookup. Planning Time improved from 6.732 ms to 5.042 ms, and Execution Time improved from 2.502 ms to 1.130 ms. This is approximately a 54.8% execution-time improvement, meeting the audit target of a 50% improvement on the slowest query.

This change fixes the inefficiency by giving PostgreSQL a direct indexed path for JSON-backed issue assignment filters in the unified documents table. Instead of scanning many document rows and filtering afterward, the database can now find the relevant issue documents by workspace and assignee more directly.

## Coverage 5: Test Coverage and Quality

### Critical Flows with Zero Coverage

The strongest zero-coverage gap is real-time sync/collaboration. I did not find a test that opens the same document in two browser contexts or users and verifies that edits made in one session appear in the other session without a reload. Because this application includes realtime collaboration behavior, this is a critical missing test path.

Role-based permission coverage is also weak. The suite covers login, logout, invalid credentials, session handling, expired sessions, and some cross-workspace protection, but it does not appear to meaningfully test role-specific behavior such as admin versus member versus viewer permissions, document visibility enforcement, or restricted workspace actions.

Standalone project management is weakly covered. Project behavior appears mostly through program-level tests, including creating a project from a Program Projects tab. However, I did not find a dedicated project CRUD workflow that verifies project creation, editing, reload persistence, and association behavior.

Document CRUD is partially covered, but body-content persistence after reload appears weak. Existing E2E tests cover document list viewing, document creation, title editing, and sidebar/list update behavior, but a stronger test should edit document body content, reload the document, and verify the content persists.



### Test Suite and Coverage Baseline

The API test suite was run with Vitest coverage enabled. The completed run passed all 28 test files and all 451 tests in 76.34 seconds. API line coverage was 40.52%, with 40.34% statement coverage, 33.44% branch coverage, and 40.9% function coverage. Web coverage was not measured in this baseline.

The run also showed expected local messages such as “CAIA not configured, skipping initialization.” Some stderr output appeared during tests that intentionally simulate database failures, but those tests passed, so the stderr output represents expected error-handling test coverage rather than suite failures.

| Metric | Baseline |
|---|---:|
| API test files | 28 passed |
| API tests | 451 passed |
| Suite runtime | 76.34 seconds |
| API statement coverage | 40.34% |
| API branch coverage | 33.44% |
| API function coverage | 40.9% |
| API line coverage | 40.52% |
| Web coverage | Not measured |

## Category 6: Runtime Error and Edge Case Handling

### Environment / Backend Availability Finding

During runtime error testing, the browser console showed repeated connection-related errors. A `401` response from `/api/auth/me` appeared during session detection, which is expected when no valid user session exists. However, the console also showed Vite dev-server connection loss, repeated WebSocket reconnect failures, and setup submission failures caused by `ERR_CONNECTION_REFUSED`.

The most important runtime finding was the setup flow. When the setup form attempted to `POST` to `/api/setup/initialize` while the backend/frontend proxy was unavailable, the request failed with `net::ERR_CONNECTION_REFUSED` and the UI logged `Setup error: TypeError: Failed to fetch`. This indicates the application does not fully recover from backend unavailability during setup and should provide clearer user-facing error messaging.

This run should be treated as an environment/backend availability failure rather than a clean normal-usage baseline. For the audit, it is evidence that backend disconnect handling is partial and that setup/network failure states need better user-facing recovery behavior.

| Metric | Baseline |
|---|---|
| Console errors during normal usage | Not clean baseline; connection errors observed during unstable dev-server run |
| Unhandled promise rejections / server crashes | None confirmed from this console capture |
| Network disconnect recovery | Partial |
| Missing error boundaries | Setup/network failure path needs clearer fallback UI |
| Silent failures identified | Setup submit fails when backend/proxy is unavailable; console logs error but user-facing recovery should be improved |

### Baseline Measurement

| Metric | Baseline |
|---|---|
| Console errors during normal usage | 0 unexpected errors observed during clean normal usage |
| Console warnings during normal usage | No major unexpected warnings observed |
| Unhandled promise rejections on server | 0 observed during tested flows |
| Network disconnect recovery | Partial |
| Missing error boundaries | None confirmed during normal usage |
| Silent failures identified | Network-offline editing stops app interaction until connection returns |

### Runtime Testing Summary

Runtime and edge-case testing was performed during normal local usage of the application. Browser DevTools was used to monitor console output while navigating through the application, opening major pages, and interacting with document and workflow screens. During normal usage, the website ran as expected. No surprise console errors were observed, the application did not show noticeable lag, and the tested API endpoints returned successful `200` responses.

Server and observability logs were also reviewed during the tested workflows. The logs showed endpoint activity and successful responses, which indicates that the frontend and backend were communicating correctly during normal operation. No unhandled server-side promise rejections or unexpected backend crashes were observed during the tested flows.

### Network Failure Testing

Network failure was tested by disconnecting the browser network while using the application. When the network was offline, the website stopped responding to network-dependent actions, which is expected because API and realtime collaboration requests could not complete. Once the network was restored, the application was able to continue communicating with the backend, and endpoints returned `200` responses again.

Network disconnect recovery is marked as **Partial** because the app did not crash, but the offline state could be clearer to the user. The application should ideally show a visible message such as “Connection lost” or “Reconnecting” so users understand that the app is offline and that document changes may not be synced yet.

### Malformed Input Testing

Malformed and edge-case inputs were tested through normal form and document interactions, including empty values, long text, special characters, and script-like input. No unexpected crashes or surprise runtime errors were observed during the tested input cases. The app continued running normally, and server responses remained stable.

### Concurrent / Edge Case Behavior

Concurrent edge-case behavior was reviewed at a basic level by interacting with document/workflow views during normal usage. No obvious runtime crashes, major UI breakage, or unexpected server errors were observed. Further testing should still be performed with two active users editing the same document field at the same time to fully validate conflict handling and realtime collaboration behavior.

### Slow Network / Throttling Behavior

The application was tested under slower network conditions. No major lag or unexpected runtime errors were observed during normal navigation. The main risk area remains network-dependent workflows, especially document editing and realtime collaboration, because the UI should communicate when the app is offline, reconnecting, or waiting for sync.

### Finding

The application handled normal runtime usage well. The strongest observed gap is not a crash or server failure, but user-facing clarity during network loss. When the network goes offline, the website stops network-dependent behavior, but the user may not receive enough feedback explaining whether the app is disconnected, retrying, or whether changes are safely synced.

### Recommended Improvement

Add a clear offline/reconnecting state for document editing and realtime collaboration. The UI should display a visible message when the connection is lost and confirm when the connection is restored. This would reduce user confusion and lower the risk of perceived data loss during offline or unstable network conditions.

## Category 7: Accessibility Compliance

### Lighthouse Accessibility Result

The tested page scored:

| Metric | Baseline |
|---|---:|
| Lighthouse accessibility score | 100 |
| Automated Lighthouse accessibility failures | 0 |
| Manual checks still required | 10 |

A Lighthouse accessibility score of `100` means Lighthouse did not detect any automated accessibility failures on the tested page. The page passed checks for accessible button names, labeled form fields, discernible link names, sufficient color contrast, document title, `html` language attribute, main landmark, valid heading order, no positive `tabindex`, and valid ARIA attributes.

The warning about IndexedDB stored data is mostly related to performance scoring, not accessibility. For cleaner audit evidence, Lighthouse should be rerun in an Incognito window so stored browser data does not affect loading behavior.

### Manual Review Still Required

A score of `100` does not prove full WCAG or Section 508 compliance by itself. Lighthouse notes that automated tooling only detects a subset of accessibility issues. The following areas still require manual review:

- Keyboard navigation
- Logical tab order
- Screen reader usability
- Focus traps
- Custom controls
- ARIA roles and labels
- Offscreen content behavior
- Whether focus is directed correctly when new content appears

### Accessibility Report Row

| Page | URL Tested | Lighthouse Accessibility Score | Notes |
|---|---|---:|---|
| Tested page | Local application page tested in Chrome DevTools | 100 | Passed all automated Lighthouse accessibility audits. Manual checks still required for keyboard navigation, screen reader behavior, custom controls, and focus management. |

### Accessibility Summary

Lighthouse accessibility testing was performed on this page using Chrome DevTools Lighthouse 13.0.2 in desktop mode. The page received an accessibility score of `100`. Lighthouse reported no automated accessibility failures and passed checks for accessible button names, form labels, link names, color contrast, valid ARIA usage, heading order, document title, language attribute, main landmark, and focusable skip links.

However, Lighthouse also identified several items requiring manual review, including keyboard focusability, logical tab order, focus trapping, custom control labeling, ARIA roles, screen reader usability, and whether focus is directed correctly when new content appears. Because automated scanning cannot fully verify WCAG 2.1 AA or Section 508 compliance, this score should be treated as strong automated evidence, not a complete accessibility certification.


### Root Cause Analysis

The baseline type-safety issues appear to come from several root causes:

1. Some API response data is not strongly typed at the boundary between backend and frontend.
2. Some editor and document state is treated as flexible data instead of being represented with specific TypeScript interfaces.
3. Type assertions are used to force data into expected shapes instead of validating or narrowing the data first.
4. Non-null assertions are used in areas where values may be undefined during loading, failed requests, or realtime collaboration updates.
5. Some functions rely on inferred or loose types, making it harder to understand what data shape is expected.

These patterns increase the risk of runtime errors because TypeScript is being bypassed in the exact areas where the application depends on reliable document data.

### Improvement Target

The improvement target for Category 1 is to eliminate at least 25% of measured type-safety violations.

A fix only counts if it preserves existing functionality and improves actual type correctness. Superficial changes do not count. Replacing `any` with `unknown` only counts if the code also includes proper narrowing, validation, or safe handling before using the value.

To pass, the project must reduce the baseline violation count by at least 25% while keeping existing functionality and tests passing.

### Reproducibility

The baseline measurements were collected from the local repository using PowerShell commands and saved under:

`audit/raw-data/type-safety/`

Commands used:

```bash
pnpm typecheck
pnpm exec tsc --strict --noEmit
```

## 4. Key Findings

### Finding 1: Document-Level Authorization Must Be Explicit

Because the platform uses an "everything is a document" model, authorization cannot only happen at the route level. Every document read, write, update, delete, share, export, and realtime sync event must verify whether the current user has permission to access that specific document.

Risk:
Unauthorized users may access or mutate documents if API routes or WebSocket events trust client-side state.

Recommended Fix:
- Add server-side document permission checks for every document operation.
- Validate permissions inside REST API handlers and WebSocket/Yjs sync handlers.
- Use document roles such as owner, editor, commenter, viewer, and admin.
- Log denied access attempts.

Evidence to Capture:
- Screenshot of user roles
- API code showing permission checks
- Test showing unauthorized user cannot access another user's document
- WebSocket test showing unauthorized sync is rejected

Status:
Needs verification.

---

### Finding 2: Realtime Collaboration Requires WebSocket Authorization

The realtime layer uses WebSockets and Yjs CRDTs. This creates a separate security surface from normal HTTP APIs. Even if REST endpoints are protected, attackers may attempt to connect directly to the WebSocket server and subscribe to a document room.

Risk:
A user could join a document collaboration session without permission if the WebSocket server does not validate identity and document access.

Recommended Fix:
- Authenticate WebSocket connections.
- Validate document access before joining a Yjs room.
- Re-check permissions on reconnect.
- Prevent anonymous or stale-session collaboration.
- Log connection, join, leave, sync, and rejected events.

Evidence to Capture:
- WebSocket auth middleware
- Failed unauthorized connection test
- Server logs showing rejected unauthorized document room access

Status:
Needs verification.

---

### Finding 3: Document Revision History and Provenance Should Be Auditable

A Treasury-style document platform needs strong traceability. The system should record who created a document, who edited it, when it changed, what changed, and whether the change came from a normal editor action, realtime sync, import, automation, or admin action.

Risk:
Without revision history and audit logs, the system cannot reliably investigate unauthorized changes, accidental data loss, or document tampering.

Recommended Fix:
- Store document version history.
- Track created_by, updated_by, created_at, updated_at.
- Track document events such as create, edit, share, export, delete, restore, archive, and permission change.
- Avoid storing sensitive raw content in logs unless required and protected.

Evidence to Capture:
- Database schema for document versions or audit events
- Example audit log entry
- UI screenshot showing document history or activity

Status:
Needs verification.

---

### Finding 4: API Security Should Be Tested Against OWASP API Risks

The Express/Node backend should be audited for broken object-level authorization, excessive data exposure, unsafe mass assignment, missing rate limits, and injection risks.

Risk:
APIs may expose document data, user data, metadata, or admin-only fields if request validation and authorization are incomplete.

Recommended Fix:
- Validate all request bodies.
- Use server-side authorization for every object ID.
- Prevent mass assignment by whitelisting allowed fields.
- Add rate limiting to sensitive routes.
- Sanitize and parameterize database queries.
- Return minimum necessary fields.

Evidence to Capture:
- API route examples
- Request validation code
- Playwright/API tests for unauthorized access
- Error response screenshots

Status:
Needs verification.

---

### Finding 5: Accessibility Should Be Audited Against WCAG 2.2

The frontend should support keyboard navigation, visible focus states, semantic structure, accessible forms, contrast, headings, labels, and screen reader-friendly editor controls.

Risk:
Government-facing software must be usable by people with disabilities. Rich text editors and realtime collaboration tools are especially easy to make inaccessible.

Recommended Fix:
- Verify keyboard-only navigation.
- Add labels to all form controls.
- Ensure modals trap focus correctly.
- Confirm editor toolbar buttons have accessible names.
- Test color contrast.
- Add skip links and semantic landmarks.
- Ensure error messages are announced clearly.

Evidence to Capture:
- Accessibility scan results
- Keyboard navigation screenshots
- Manual notes for editor accessibility
- Playwright accessibility test results if available

Status:
Needs verification.

---

### Finding 6: Infrastructure Should Avoid Hardcoded Secrets

Docker and Terraform configurations should be reviewed for secrets, unsafe defaults, exposed ports, permissive networking, and missing environment separation.

Risk:
Secrets or overly permissive infrastructure can expose the application, database, or internal services.

Recommended Fix:
- Use environment variables or secret managers.
- Do not commit `.env` files.
- Restrict database access.
- Separate dev/staging/prod configuration.
- Review Terraform state handling.
- Ensure Docker containers do not run with unnecessary privileges.

Evidence to Capture:
- `.gitignore` showing env protection
- Docker Compose review
- Terraform variable usage
- Deployment environment screenshots

Status:
Needs verification.

---

## 5. Audit Checklist

### Security

- [ ] Authentication is required for protected pages.
- [ ] Sessions expire correctly.
- [ ] API routes verify the current user.
- [ ] Document IDs cannot be guessed to access other users' documents.
- [ ] Users cannot edit documents they only have view access to.
- [ ] Admin-only routes are protected.
- [ ] Server validates request bodies.
- [ ] SQL queries are parameterized.
- [ ] Sensitive errors are not exposed to users.
- [ ] Rate limiting exists for login, document creation, sharing, and API-heavy actions.
- [ ] Secrets are not committed to the repo.

### Authorization

- [ ] Document-level permissions exist.
- [ ] Permission checks happen server-side.
- [ ] WebSocket document rooms require authorization.
- [ ] Sharing permissions are enforced.
- [ ] Deleted or archived documents cannot be accessed normally.
- [ ] Role changes are logged.
- [ ] Unauthorized access attempts are logged.

### Realtime Collaboration

- [ ] WebSocket connections require authentication.
- [ ] Users cannot join unauthorized document rooms.
- [ ] Reconnects re-check permissions.
- [ ] Concurrent edits do not corrupt document state.
- [ ] Yjs updates are persisted safely.
- [ ] Document conflicts are handled gracefully.
- [ ] Collaboration presence does not leak private user data.

### Document Model

- [ ] Documents have clear ownership.
- [ ] Documents have timestamps.
- [ ] Document versions are tracked.
- [ ] Deletions are reversible or intentionally permanent.
- [ ] Exports are logged.
- [ ] Sharing changes are logged.
- [ ] Document metadata does not expose sensitive information unnecessarily.

### Database

- [ ] PostgreSQL schema uses constraints where appropriate.
- [ ] Foreign keys protect relational integrity.
- [ ] Sensitive data is encrypted where needed.
- [ ] Backups are planned.
- [ ] Migrations are repeatable.
- [ ] Dev/test/prod databases are separated.
- [ ] Database credentials are not hardcoded.

### Frontend

- [ ] Protected routes cannot be accessed without login.
- [ ] UI hides actions users cannot perform.
- [ ] UI does not rely on client-side checks only.
- [ ] Forms show useful validation errors.
- [ ] Loading and error states are clear.
- [ ] Editor toolbar is accessible.
- [ ] Tailwind styling maintains contrast and readability.

### Accessibility

- [ ] App is keyboard navigable.
- [ ] Focus states are visible.
- [ ] Buttons have accessible names.
- [ ] Inputs have labels.
- [ ] Modals trap and restore focus.
- [ ] Color contrast meets accessibility expectations.
- [ ] Headings are structured correctly.
- [ ] Rich text editor controls are screen-reader friendly.

### Testing

- [ ] Playwright E2E tests cover login.
- [ ] Tests cover document creation.
- [ ] Tests cover document editing.
- [ ] Tests cover collaboration/realtime behavior.
- [ ] Tests cover unauthorized document access.
- [ ] Tests cover role-based permissions.
- [ ] Tests cover error states.
- [ ] Tests cover accessibility-critical flows.

### Infrastructure

- [ ] Docker builds reproducibly.
- [ ] Terraform config separates environments.
- [ ] Secrets are not stored in source.
- [ ] Services expose only required ports.
- [ ] Logs are available for debugging.
- [ ] Deployment rollback path exists.
- [ ] Health checks exist.

## 6. Recommended Priority Fixes

### Priority 1 — High Risk

1. Enforce server-side document-level authorization.
2. Secure WebSocket/Yjs document room access.
3. Add audit logs for document access and changes.
4. Validate all API request bodies.
5. Prevent object ID guessing and unauthorized document reads.

### Priority 2 — Medium Risk

1. Expand Playwright tests for permission failures.
2. Add accessibility testing for editor workflows.
3. Improve error handling.
4. Add rate limits.
5. Confirm database constraints and migration safety.

### Priority 3 — Lower Risk

1. Improve UI empty states.
2. Add better admin visibility into audit events.
3. Document deployment assumptions.
4. Add performance monitoring.
5. Improve developer onboarding documentation.

## 7. Evidence Collected

| Area | Evidence Needed | Status |
|---|---|---|
| Authentication | Login/logout screenshots, session behavior | Pending |
| Authorization | Role/document permission tests | Pending |
| Realtime | WebSocket access control test | Pending |
| API | Request validation and unauthorized API tests | Pending |
| Accessibility | Keyboard and contrast review | Pending |
| Testing | Playwright result screenshot | Pending |
| Infrastructure | Docker/Terraform config review | Pending |
| Database | Schema/migration review | Pending |

## 8. Conclusion

The platform has a strong foundation for a collaborative government-style document application. The monorepo structure, modern frontend, Express backend, PostgreSQL persistence, Yjs realtime collaboration, Playwright testing, Docker, and Terraform all support a production-ready direction.

The main audit concern is that the "everything is a document" architecture makes document-level security the center of the system. Every document action must be authorized, logged, and tested across both HTTP APIs and WebSocket collaboration channels. The system should also demonstrate accessibility, infrastructure safety, test coverage, and audit readiness appropriate for a Department of Treasury-style application.

The most important next step is to prove enforcement through evidence: screenshots, test results, logs, code references, and examples of blocked unauthorized access.
