/**
 * Shared Result type and helpers built on neverthrow.
 * Low-level primitive layer; no domain-specific types.
 */

import { Result, ok, err, Ok, Err } from "neverthrow";

export type { Result, Ok, Err };
export { ok, err };

/** App-level Result alias: success T or error E (default Error). */
export type AppResult<T, E = Error> = Result<T, E>;
