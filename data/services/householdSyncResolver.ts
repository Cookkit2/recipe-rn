/**
 * Shared last-writer-wins (LWW) resolver for household shared stock rows.
 *
 * Background: the batch sync path (`HouseholdSyncService.pullRemoteChanges`) and
 * the realtime path (`HouseholdRealtimeService.handleUpdate`) historically used
 * divergent conflict rules — the batch path overwrote every local field with the
 * remote payload without comparing `updated_at`, silently clobbering fresher
 * local edits (docs/SYNC_STRATEGY_AUDIT.md defect #1, HIGH severity). This
 * helper unifies both paths on a single timestamp-comparing resolver, mirroring
 * the strategy locked in `docs/adr/004-sync-conflict-resolution.md`
 * (server-authoritative hybrid, LWW by `updated_at`).
 *
 * The comparison is intentionally simple: the row with the greater server-clock
 * `updated_at` wins. Equality / unknown timestamps fall back to server authority
 * (apply the remote), matching the existing realtime guard's behavior.
 */

/**
 * Decide whether a remote stock row should overwrite the local row.
 *
 * @param remoteUpdatedAtMs remote `updated_at` as epoch ms (from the Supabase ISO string)
 * @param localUpdatedAtMs  local `updated_at` as epoch ms (from the Stock model's `@date`)
 * @returns `true` if the remote row is strictly newer and should be applied;
 *          `false` if the local row is at least as fresh and must be preserved.
 */
export function shouldApplyRemoteUpdate(
  remoteUpdatedAtMs: number,
  localUpdatedAtMs: number
): boolean {
  // Treat non-finite (missing/unknown) local timestamps as 0 — fall back to
  // server authority, matching the realtime guard's `localUpdatedAt ?? 0`.
  const localMs = Number.isFinite(localUpdatedAtMs) ? localUpdatedAtMs : 0;
  return remoteUpdatedAtMs > localMs;
}
