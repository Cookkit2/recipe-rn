## 2025-02-15 - [DatabaseFacade N+1 Query in Loops]
**Learning:** Found a common backend anti-pattern where an array of WatermelonDB objects is mapped into individual `Promise` query calls using `Promise.all()`, bypassing the powerful `Q.oneOf()` bulk lookup which SQLite optimizes well.
**Action:** Always replace `await Promise.all(items.map(item => this.repository.getById(item.id)))` with `await this.repository.getByIds(items.map(item => item.id))` inside loops that process more than ~10 records.
