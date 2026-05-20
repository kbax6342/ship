import fs from "node:fs";
import path from "node:path";
import autocannon from "autocannon";

const root = process.cwd();
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";
const AUDIT_COOKIE = process.env.AUDIT_COOKIE || "";
const AUDIT_AUTH_HEADER = process.env.AUDIT_AUTH_HEADER || "";

const endpointsPath = path.join(root, "scripts", "api-endpoints.json");
const outDir = path.join(root, "audit-output", `api-response-time-${timestamp}`);

const concurrencies = [10, 25, 50];
const durationSeconds = Number(process.env.AUDIT_DURATION_SECONDS || 20);

fs.mkdirSync(outDir, { recursive: true });

if (!fs.existsSync(endpointsPath)) {
  console.error(`Missing endpoint config: ${endpointsPath}`);
  process.exit(1);
}

const endpoints = JSON.parse(fs.readFileSync(endpointsPath, "utf8"));

function buildHeaders() {
  const headers = {
    Accept: "application/json",
  };

  if (AUDIT_COOKIE) {
    headers.Cookie = AUDIT_COOKIE;
  }

  if (AUDIT_AUTH_HEADER) {
    headers.Authorization = AUDIT_AUTH_HEADER;
  }

  return headers;
}

function getLatency(result, key) {
  return result?.latency?.[key] ?? result?.latency?.[key.toUpperCase()] ?? "N/A";
}

function makeUrl(pathOrUrl) {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }

  return `${API_BASE_URL}${pathOrUrl}`;
}

async function runBenchmark(endpoint, connections) {
  const url = makeUrl(endpoint.path);

  console.log(`\nBenchmarking ${endpoint.name}`);
  console.log(`URL: ${url}`);
  console.log(`Connections: ${connections}`);
  console.log(`Duration: ${durationSeconds}s`);

  return await autocannon({
    title: `${endpoint.name} - ${connections} connections`,
    url,
    method: endpoint.method || "GET",
    headers: buildHeaders(),
    connections,
    duration: durationSeconds,
    pipelining: 1,
    timeout: 20,
  });
}

const rows = [];
const rawResults = [];

for (const endpoint of endpoints) {
  for (const connections of concurrencies) {
    const result = await runBenchmark(endpoint, connections);

    const row = {
      endpoint: endpoint.name,
      method: endpoint.method || "GET",
      path: endpoint.path,
      connections,
      p50: getLatency(result, "p50"),
      p95: getLatency(result, "p95"),
      p99: getLatency(result, "p99"),
      average: result.latency?.average ?? "N/A",
      requestsPerSecond: result.requests?.average ?? "N/A",
      errors: result.errors ?? 0,
      timeouts: result.timeouts ?? 0,
      non2xx: result.non2xx ?? 0,
    };

    rows.push(row);

    rawResults.push({
      endpoint,
      connections,
      result,
    });
  }
}

fs.writeFileSync(
  path.join(outDir, "api-response-raw-results.json"),
  JSON.stringify(rawResults, null, 2)
);

const markdown = `# Category 3: API Response Time Results

Generated: ${new Date().toLocaleString()}

Project Path:

\`\`\`text
${root}
\`\`\`

API Base URL:

\`\`\`text
${API_BASE_URL}
\`\`\`

Output Folder:

\`\`\`text
${outDir}
\`\`\`

## Test Conditions

| Condition | Value |
|---|---:|
| Benchmark tool | autocannon |
| Duration per test | ${durationSeconds} seconds |
| Concurrency levels | ${concurrencies.join(", ")} |
| Endpoint count | ${endpoints.length} |
| Authentication header/cookie used | ${AUDIT_COOKIE || AUDIT_AUTH_HEADER ? "Yes" : "No"} |

## Baseline Results

| Endpoint | Method | Concurrency | P50 | P95 | P99 | Avg | Req/Sec | Errors | Timeouts | Non-2xx |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
${rows
  .map(
    (r) =>
      `| ${r.endpoint} | ${r.method} | ${r.connections} | ${r.p50} ms | ${r.p95} ms | ${r.p99} ms | ${r.average} ms | ${r.requestsPerSecond} | ${r.errors} | ${r.timeouts} | ${r.non2xx} |`
  )
  .join("\n")}

## Slowest Endpoints by P95

| Rank | Endpoint | Method | Concurrency | P95 | P99 | Hypothesis |
|---:|---|---|---:|---:|---:|---|
${rows
  .slice()
  .filter((r) => typeof r.p95 === "number")
  .sort((a, b) => b.p95 - a.p95)
  .slice(0, 5)
  .map(
    (r, index) =>
      `| ${index + 1} | ${r.endpoint} | ${r.method} | ${r.connections} | ${r.p95} ms | ${r.p99} ms | Likely causes may include large database reads, missing indexes, N+1 queries, expensive joins, large JSON payloads, or insufficient pagination. |`
  )
  .join("\n")}

## Notes
.............................................................................
This benchmark should be run against a seeded database with realistic volume:
- 500+ documents
- 100+ issues
- 20+ users
- 10+ sprints/weeks

Before/after comparisons must use the same data volume, same concurrency, same hardware, and same endpoint list.
`;

fs.writeFileSync(path.join(outDir, "api-response-time-results.md"), markdown);

console.log("\nAPI response time audit complete.");
console.log(`Results saved to: ${path.join(outDir, "api-response-time-results.md")}`);