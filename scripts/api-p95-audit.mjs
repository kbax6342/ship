// scripts/api-p95-audit.mjs
import { performance } from "node:perf_hooks";
import fs from "node:fs";
import path from "node:path";

const API_BASE_URL = "http://localhost:3000";
const DURATION_SECONDS = 20;
const CONCURRENCY_LEVELS = [10, 25, 50];

const endpoints = [
  { name: "My Week", method: "GET", path: "/api/weeks/my-week" },
  { name: "Issues list", method: "GET", path: "/api/issues" },
  { name: "Projects list", method: "GET", path: "/api/projects" },
  { name: "Wiki documents list", method: "GET", path: "/api/documents?type=wiki" },
  { name: "Action items", method: "GET", path: "/api/weeks/action-items" },
];

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

async function requestOnce(endpoint) {
  const start = performance.now();
  let status = 0;
  let error = null;

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint.path}`, {
      method: endpoint.method,
      headers: {
        "Accept": "application/json",
      },
    });

    status = response.status;
    await response.arrayBuffer();
  } catch (err) {
    error = err?.message || String(err);
  }

  const durationMs = performance.now() - start;

  return {
    durationMs,
    status,
    error,
  };
}

async function runBenchmark(endpoint, concurrency) {
  const endAt = Date.now() + DURATION_SECONDS * 1000;
  const durations = [];
  let requests = 0;
  let errors = 0;
  let non2xx = 0;
  let timeouts = 0;

  async function worker() {
    while (Date.now() < endAt) {
      const result = await requestOnce(endpoint);
      requests += 1;
      durations.push(result.durationMs);

      if (result.error) {
        errors += 1;
        if (result.error.toLowerCase().includes("timeout")) {
          timeouts += 1;
        }
      }

      if (result.status < 200 || result.status >= 300) {
        non2xx += 1;
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  const totalDurationSeconds = DURATION_SECONDS;
  const avg =
    durations.length > 0
      ? durations.reduce((sum, value) => sum + value, 0) / durations.length
      : 0;

  return {
    endpoint: endpoint.name,
    method: endpoint.method,
    path: endpoint.path,
    concurrency,
    p50: percentile(durations, 50),
    p95: percentile(durations, 95),
    p99: percentile(durations, 99),
    avg,
    reqSec: requests / totalDurationSeconds,
    requests,
    errors,
    timeouts,
    non2xx,
  };
}

function formatMs(value) {
  if (value === null || Number.isNaN(value)) return "N/A";
  return `${value.toFixed(2)} ms`;
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputDir = path.join(
  process.cwd(),
  "audit-output",
  `api-response-time-p95-${timestamp}`
);

fs.mkdirSync(outputDir, { recursive: true });

const results = [];

for (const endpoint of endpoints) {
  for (const concurrency of CONCURRENCY_LEVELS) {
    console.log(`Running ${endpoint.name} at concurrency ${concurrency}...`);
    const result = await runBenchmark(endpoint, concurrency);
    results.push(result);
  }
}

const markdown = `# API Response Time P95 Results

Generated: ${new Date().toLocaleString()}

API Base URL:

\`\`\`text
${API_BASE_URL}
\`\`\`

## Test Conditions

| Condition | Value |
|---|---:|
| Benchmark tool | custom Node fetch latency sampler |
| Duration per test | ${DURATION_SECONDS} seconds |
| Concurrency levels | ${CONCURRENCY_LEVELS.join(", ")} |
| Endpoint count | ${endpoints.length} |

## Baseline Results

| Endpoint | Method | Concurrency | P50 | P95 | P99 | Avg | Req/Sec | Errors | Timeouts | Non-2xx |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
${results
  .map(
    (r) =>
      `| ${r.endpoint} | ${r.method} | ${r.concurrency} | ${formatMs(r.p50)} | ${formatMs(r.p95)} | ${formatMs(r.p99)} | ${formatMs(r.avg)} | ${r.reqSec.toFixed(2)} | ${r.errors} | ${r.timeouts} | ${r.non2xx} |`
  )
  .join("\n")}

## Slowest Endpoints by P95

| Rank | Endpoint | Method | Concurrency | P95 | P99 |
|---:|---|---|---:|---:|---:|
${[...results]
  .sort((a, b) => (b.p95 ?? 0) - (a.p95 ?? 0))
  .slice(0, 10)
  .map(
    (r, index) =>
      `| ${index + 1} | ${r.endpoint} | ${r.method} | ${r.concurrency} | ${formatMs(r.p95)} | ${formatMs(r.p99)} |`
  )
  .join("\n")}
`;

fs.writeFileSync(path.join(outputDir, "api-p95-results.md"), markdown);
fs.writeFileSync(path.join(outputDir, "api-p95-results.json"), JSON.stringify(results, null, 2));

console.log("");
console.log(markdown);
console.log("");
console.log(`Saved results to: ${outputDir}`);