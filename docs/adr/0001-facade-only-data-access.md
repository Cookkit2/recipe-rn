# ADR 0001: Facade-Only Data Access

## Status

Accepted

## Context

The DoneDish app uses WatermelonDB for its local database, which is accessed using the Repository Pattern. Over time, components and hooks began accessing the repositories directly, leading to tightly coupled code, inconsistent error handling, and N+1 query problems. The architecture needed a cleaner boundary between application code and data access.

## Decision

We will implement a `DatabaseFacade` as the sole entry point for all database operations.
1. **Application code** (React components, hooks, and API layer files) must interact exclusively through the `DatabaseFacade`.
2. **Repositories** become private implementation details of the `DatabaseFacade`.
3. **Internal database access** (`database.get()`) is strictly prohibited in application code.

## Consequences

### Positive
- **Simpler API Surface**: Application code only interacts with the methods exposed by the Facade, hiding complex repository logic and relationships.
- **Performance Optimization**: The Facade can implement bulk reads and batch operations internally (e.g., using `database.get()` for aggregate reads) to solve N+1 query problems without exposing these implementation details.
- **Maintainability**: Changing the database schema or swapping out storage mechanisms requires changes only to the repositories and facade, leaving the application code untouched.

### Negative
- **Boilerplate**: Adding a new database operation requires adding a method to the corresponding repository *and* a wrapper method in the Facade.
- **Learning Curve**: New developers might be tempted to use WatermelonDB's standard `database.get()` pattern and must learn the Facade pattern instead.
