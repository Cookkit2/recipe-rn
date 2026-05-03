# Lean PR CI Design

## Background

PR #389 currently fails multiple GitHub checks after the Bun migration and CI workflow edits. The failures are a mix of real test regressions, duplicate audit gates, and policy checks that are too broad for this repository.

The goal is to keep pull request CI fast and high signal while still preserving security coverage through scheduled, manual, and protected-branch scans.

## Current Findings

The PR check rollup has five red checks, but two are summary jobs that only reflect upstream failures. The root failures are:

- `Dependency Audit` and `Bun Audit` both fail on the same three moderate advisories: `file-type`, `postcss`, and `uuid`.
- `Security Policy Compliance` flags `ios/.xcode.env` as a sensitive file because it matches a broad `*.env` pattern. This file is a normal React Native/Xcode helper and should not fail CI by name alone.
- `Test Suite` fails in nine suites. The failures include legacy `src/` Jest transform/mocking issues, a changed Gemini cost expectation, pantry aggregation behavior differing from the test expectation, and repository tests still expecting spread `database.batch` arguments after the WatermelonDB array-form migration.
- Local `npm audit --audit-level=moderate` cannot run in this Bun-only repository because there is no npm lockfile.

## CI Policy

Pull requests should run only checks that are fast, deterministic, and directly actionable by the author:

- Install dependencies with `bun install --frozen-lockfile`.
- Run TypeScript checks with `bun run typecheck`.
- Run formatting checks with the repository's Prettier command.
- Run Jest with `bun test` on pull requests. Coverage reporting can remain a protected-branch or scheduled check until the baseline is stable enough to be a useful PR gate.
- Run one dependency audit with Bun, not both Bun and npm. Pull requests should block on high or critical advisories; moderate transitive advisories should be reported and handled through scheduled security work unless a compatible fix is available.

Heavy security scans should still exist, but they should not all block every pull request:

- CodeQL, Semgrep, and OSSF Scorecard should run on a schedule, manual dispatch, and pushes to protected branches such as `master` or `main`.
- Dependency audit should remain visible on PRs, but only once.
- Security policy checks should allow known safe generated/native files while still blocking committed private keys, certificates, and real local environment files.

## Workflow Changes

`ci.yml` should become the PR gate. It should contain one install path and one clear sequence of app-quality checks. Summary jobs are optional, but they should not obscure the actual failing job names.

`security-scan.yml` should move from every pull request to scheduled/manual/protected-branch triggers. If security checks later need to block PRs, they should be reintroduced one at a time with low false-positive rates.

`deploy.yml` should stay push/manual only. Placeholder deployment steps are outside this change unless they fail protected-branch builds.

## Failure Fixes

The workflow simplification does not replace real code fixes. After the CI policy is adjusted, the remaining work is:

- Fix or intentionally quarantine legacy `src/` tests that cannot run under the current Jest transform setup.
- Update tests affected by the WatermelonDB `database.batch([ops])` migration.
- Review the pantry aggregation test expectation and either fix the implementation or update the expected quantity.
- Update the Gemini cost test to match the selected default model pricing behavior.
- Track the current moderate transitive advisories outside the PR gate unless a compatible dependency update is available.

## Success Criteria

- A PR has a small, understandable set of required checks.
- Each failing check maps to one actionable cause.
- CI no longer runs duplicate Bun/npm audit gates in a Bun-only repository.
- `ios/.xcode.env` no longer causes a false security-policy failure.
- Scheduled/protected-branch security scanning remains in place for deeper security coverage.

## Out of Scope

- Adding Detox or device E2E CI.
- Building iOS or Android binaries on every pull request.
- Reworking deployment automation.
- Solving every transitive dependency advisory in the CI policy change itself.
