# Category 2: Bundle Size Results

Generated: 5/19/2026, 11:39:34 AM

Project Path:

```text
C:\Users\USER\Documents\GitHub\ship
```

Frontend Dist Path:

```text
C:\Users\USER\Documents\GitHub\ship\web\dist
```

Output Folder:

```text
C:\Users\USER\Documents\GitHub\ship\audit-output\bundle-size-2026-05-19T16-39-34-326Z
```

## Baseline Measurement

| Metric | Baseline |
|---|---:|
| Total production bundle size | 3349.61 KB |
| Largest chunk | web/dist/assets/index-C2vAyoQ1.js (2025.1 KB) |
| Number of JS/CSS chunks | 262 |
| Top 3 largest dependencies | TBD from bundle treemap |
| Unused dependencies identified | 2 |

## Largest JS/CSS Chunks

| Rank | File | Size |
|---:|---|---:|
| 1 | `web/dist/assets/index-C2vAyoQ1.js` | 2025.1 KB |
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

## Notes

This script measures production files in `web/dist`.
The dependency scan is a static import check and should be manually reviewed before removing dependencies.
The Top 3 largest dependencies should be confirmed using the bundle visualizer treemap.
