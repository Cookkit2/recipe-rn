# Assistant intent routing and pantry reads implementation plan

**Goal:** Implement the approved handoff at `/Users/kyang/.codex/visualizations/2026/10/25/01a171e6-7270-7292-9cec-24ebf6b756e1/assistant-intent-and-pantry-read-handoff.md`.

**Architecture:** A separate semantic routing call produces a runtime-validated ordered request plan before any tool execution. Each execution step exposes only its planned capability, and every tool handler independently checks the intended tool/action. A per-chat pending request carries original input, remaining steps, candidate rows and completed steps across clarification turns. A small `get_pantry` tool reads the existing local Result API, preserves actual stock rows, validates/paginates the DTO and reports failures distinctly from an empty inventory.

**Tech stack:** Existing AI SDK/OpenAI-compatible provider, Zod, TypeScript, WatermelonDB adapter boundary, React chat hook, Jest.

## Tasks

- [x] Add test-first routing contracts, semantic routing instructions and a validated interpretation boundary. Cover clear, ambiguous, unsupported, negated, descriptive, combined and contextual requests. Fail closed on malformed plans; preserve exact remaining-step identity when resuming.
- [x] Add pantry read schema/action tests for paging, deterministic sort, nullable values, separate batches, empty inventory and read errors. Switch local listPantry to the error-preserving Result API; prove signed-out reads never invalidate mutation queries.
- [x] Extend tool definitions with get_pantry and per-step capability/action guards, retaining serialized mutations and the clarification latch. Reject unauthorized calls before any data access; prevent replay of an already confirmed mutation step.
- [x] Run semantic routing before the provider execution loop. Execute planned steps in order, stop dependent steps after clarification/failure, and emit validated route/context events. Remove provider recipe forcing based on the old word heuristic.
- [x] Extend chat event handling with per-chat pending context, read progress/results/errors and deterministic grounded fallback output. Derive recipe card state from routed/tool events rather than a conflicting request heuristic.
- [x] Extend real provider fixtures/integration tests for routing plus execution, malicious/unplanned actions, ordered mixed requests and continuation without replay.
- [x] Update Assistant documentation with a colored Mermaid overview distinct from the existing mutation flow. Do not publish or modify the PR in this implementation-only request.
- [x] Run focused Jest, typecheck, lint and the full Jest suite with declared Bun 1.4.3; perform independent spec/correctness review and resolve findings.

## Execution notes

- Reusing the attached clean pantry worktree on a new local branch based on PR #1234's implementation.
- Preserve existing ingredient identity/atomic mutation logic. No inventory schema changes or unrelated recipe-match refactoring.
- Pantry read failures must not become empty stock. Tool output must be validated before display.
- Routing model classification is fallible; runtime capability/action checks enforce the selected plan rather than claiming perfect semantic intent recognition.

## Verification results

- Declared Bun 1.4.3 used through `npm exec --yes --package=bun@1.4.3 -- bun ...`.
- Focused agent/chat/renderer suite: 18 suites, 244 tests passed.
- Full Jest suite: 180 suites, 1,615 tests passed.
- `bun run typecheck` passed; `bun run lint` passed (format check plus typecheck).
- `bun run agent:smoke` passed through the real SDK tool round trip.
- Independent review findings resolved with regressions: mixed allowed/rejected
  mutation calls cannot leave committed writes pending; page offsets are chosen
  inside a serialized read queue; each ordered step retains its own displayed
  content; later failures remain visible beside earlier pantry/recipe results; interrupted-write
  uncertainty remains in follow-up history even beside completed results.
- Existing `utils/ingredient-matching.ts` deletion remains intact. The overlapping
  recipe keyword router is removed.
- No simulator run or live Nebius semantic evaluation was performed. HTTP model
  scripts validate provider integration and execution guards, not model accuracy.
- The initial implementation was kept local; PR #1234 was not modified. Subsequent
  user authorization requests publication as a new PR.

## Publication verification (2026-10-26)

- Rebased the routing/read commit onto current `origin/master`, after PR #1234 merged.
- Preserved the newer Assistant UI refactor by applying combined result rendering
  in `AssistantMessages.tsx`.
- Re-ran the full suite after rebasing: 197 suites, 1,747 tests passed.
- `bun run lint` passed (Prettier plus TypeScript strict checks).
