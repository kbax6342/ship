# Category 3: API Response Time Results

Generated: 5/19/2026, 12:56:40 PM

Project Path:

```text
C:\Users\USER\Documents\GitHub\ship
```

API Base URL:

```text
http://localhost:3000
```

Output Folder:

```text
C:\Users\USER\Documents\GitHub\ship\audit-output\api-response-time-2026-05-19T17-51-32-377Z
```

## Test Conditions

| Condition | Value |
|---|---:|
| Benchmark tool | autocannon |
| Duration per test | 20 seconds |
| Concurrency levels | 10, 25, 50 |
| Endpoint count | 5 |
| Authentication header/cookie used | No |

## Baseline Results

| Endpoint | Method | Concurrency | P50 | P95 | P99 | Avg | Req/Sec | Errors | Timeouts | Non-2xx |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| My Week | GET | 10 | 2 ms | N/A ms | 11 ms | 2.19 ms | 3853.95 | 0 | 0 | 77074 |
| My Week | GET | 25 | 3 ms | N/A ms | 9 ms | 3.86 ms | 5735 | 0 | 0 | 114682 |
| My Week | GET | 50 | 9 ms | N/A ms | 30 ms | 10.04 ms | 4745.61 | 0 | 0 | 94901 |
| Issues list | GET | 10 | 1 ms | N/A ms | 5 ms | 1.48 ms | 4876.45 | 0 | 0 | 97519 |
| Issues list | GET | 25 | 5 ms | N/A ms | 12 ms | 5.13 ms | 4436.34 | 0 | 0 | 93156 |
| Issues list | GET | 50 | 11 ms | N/A ms | 26 ms | 11.88 ms | 4039.62 | 0 | 0 | 84816 |
| Projects list | GET | 10 | 2 ms | N/A ms | 4 ms | 2.15 ms | 4082.34 | 0 | 0 | 85717 |
| Projects list | GET | 25 | 5 ms | N/A ms | 10 ms | 5.63 ms | 4068 | 0 | 0 | 85415 |
| Projects list | GET | 50 | 10 ms | N/A ms | 25 ms | 10.76 ms | 4437.15 | 0 | 0 | 93166 |
| Wiki documents list | GET | 10 | 2 ms | N/A ms | 11 ms | 2.54 ms | 3220.91 | 0 | 0 | 67628 |
| Wiki documents list | GET | 25 | 7 ms | N/A ms | 32 ms | 9.38 ms | 2528.4 | 0 | 0 | 50562 |
| Wiki documents list | GET | 50 | 16 ms | N/A ms | 50 ms | 17.83 ms | 2727.25 | 0 | 0 | 54534 |
| Action items | GET | 10 | 2 ms | N/A ms | 7 ms | 2.61 ms | 3262.29 | 0 | 0 | 68503 |
| Action items | GET | 25 | 8 ms | N/A ms | 18 ms | 8.41 ms | 2803.5 | 0 | 0 | 56063 |
| Action items | GET | 50 | 12 ms | N/A ms | 31 ms | 13.04 ms | 3691.86 | 0 | 0 | 77519 |

## Slowest Endpoints by P95

| Rank | Endpoint | Method | Concurrency | P95 | P99 | Hypothesis |
|---:|---|---|---:|---:|---:|---|


## Notes

This benchmark should be run against a seeded database with realistic volume:
- 500+ documents
- 100+ issues
- 20+ users
- 10+ sprints/weeks

Before/after comparisons must use the same data volume, same concurrency, same hardware, and same endpoint list.
