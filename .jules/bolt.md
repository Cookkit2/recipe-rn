## 2025-02-12 - Date group aggregation performance

**Learning:** When looping over large arrays locally (which cannot be done cleanly in DB via SQL due to the client-side ORM design limitations/missing `unsafeSqlQuery` support in WatermelonDB), avoid parsing/creating JS `Date` objects repeatedly to floor dates to day bounds. Calling `Math.setHours(0,0,0,0)` on the timestamp is orders of magnitudes faster than creating multiple objects per iteration (`new Date(year, month, day)`).

**Action:** When grouping time series metrics by dates on the frontend or backend in Node.js/JS, rely on Date operations directly via the number epoch and avoid new allocations.
