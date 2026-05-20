# API Response Time P95 Results

Generated: 5/20/2026, 4:40:46 PM

API Base URL:

```text
http://localhost:3000
```

## Test Conditions

| Condition | Value |
|---|---:|
| Benchmark tool | custom Node fetch latency sampler |
| Duration per test | 20 seconds |
| Concurrency levels | 10, 25, 50 |
| Endpoint count | 5 |

## Baseline Results

| Endpoint | Method | Concurrency | P50 | P95 | P99 | Avg | Req/Sec | Errors | Timeouts | Non-2xx |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| My Week | GET | 10 | 2.88 ms | 9.18 ms | 19.51 ms | 3.91 ms | 2544.30 | 0 | 0 | 50886 |
| My Week | GET | 25 | 5.30 ms | 13.19 ms | 22.16 ms | 6.56 ms | 3812.15 | 0 | 0 | 76243 |
| My Week | GET | 50 | 12.17 ms | 29.48 ms | 44.78 ms | 14.55 ms | 3437.15 | 0 | 0 | 68743 |
| Issues list | GET | 10 | 2.14 ms | 6.04 ms | 13.53 ms | 2.91 ms | 3437.40 | 0 | 0 | 68748 |
| Issues list | GET | 25 | 7.63 ms | 20.79 ms | 33.67 ms | 9.58 ms | 2609.65 | 0 | 0 | 52193 |
| Issues list | GET | 50 | 13.39 ms | 43.23 ms | 70.34 ms | 18.41 ms | 2719.70 | 0 | 0 | 54394 |
| Projects list | GET | 10 | 2.60 ms | 8.84 ms | 16.33 ms | 3.72 ms | 2686.85 | 0 | 0 | 53737 |
| Projects list | GET | 25 | 5.63 ms | 15.85 ms | 24.30 ms | 7.07 ms | 3536.90 | 0 | 0 | 70738 |
| Projects list | GET | 50 | 11.47 ms | 25.94 ms | 33.66 ms | 13.14 ms | 3805.35 | 0 | 0 | 76107 |
| Wiki documents list | GET | 10 | 1.98 ms | 4.78 ms | 11.81 ms | 2.62 ms | 3817.55 | 0 | 0 | 76351 |
| Wiki documents list | GET | 25 | 6.34 ms | 15.40 ms | 24.88 ms | 7.69 ms | 3251.05 | 0 | 0 | 65021 |
| Wiki documents list | GET | 50 | 13.14 ms | 34.82 ms | 56.54 ms | 16.69 ms | 2994.10 | 0 | 0 | 59882 |
| Action items | GET | 10 | 2.78 ms | 6.65 ms | 14.69 ms | 3.19 ms | 3135.35 | 0 | 0 | 62707 |
| Action items | GET | 25 | 5.28 ms | 14.94 ms | 22.68 ms | 6.80 ms | 3678.05 | 0 | 0 | 73561 |
| Action items | GET | 50 | 12.63 ms | 33.18 ms | 57.28 ms | 16.05 ms | 3114.80 | 0 | 0 | 62296 |

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
