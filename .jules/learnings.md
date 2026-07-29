## 2026-07-29 - Pre-existing environment failures

**Learning:** This project has pre-existing Jest failures (`TypeError: Cannot read properties of undefined (reading 'fileExists')`) and dependency audit failures. Modifying `package.json` or lock files to fix the audit failures often falls out of scope for small PRs and gets rejected in review. Also, modifying the CI workflow to bypass security checks is considered a regression and is highly discouraged.
**Action:** When working on isolated tasks, ignore these pre-existing failures unless explicitly asked to fix them. Ensure the PR contains only the files relevant to the assigned task. If CI fails due to these existing issues, state that clearly in the PR description.
