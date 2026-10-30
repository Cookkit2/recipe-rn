/**
 * In-process PostgREST and Auth HTTP fixture for the cooking-agent tools.
 *
 * supabase-js talks to this server with its normal `/rest/v1` query strings.
 * `auth.getSession()` reads a pre-seeded session from the in-memory storage
 * adapter and does not need a network round-trip when the token is unexpired.
 * Auth routes are still served so a refresh does not fail the turn.
 *
 * This fixture records requests and returns the seeded rows. It does not apply
 * Postgres RLS. A passing test shows the client sent the filters in
 * `supabase-cooking-data.ts`, not that a live policy would allow them.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/lib/supabase/supabase-types";
import { E2E_ACCESS_TOKEN, E2E_ANON_KEY, E2E_HOUSEHOLD_ID, E2E_USER_ID } from "./e2e-contract";

export const TEST_USER_ID = E2E_USER_ID;
export const TEST_HOUSEHOLD_ID = E2E_HOUSEHOLD_ID;
/** Dummy public key. Not a credential. */
export const TEST_ANON_KEY = E2E_ANON_KEY;
/** Dummy bearer token stored in the session. Not a credential. */
export const TEST_ACCESS_TOKEN = E2E_ACCESS_TOKEN;
export const AUTH_STORAGE_KEY = "sb-cookkit-agent-test-auth-token";

export interface StockRow {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  expiry_date: string | null;
  household_id: string | null;
  added_by_user_id: string | null;
  base_ingredient_id?: string | null;
}

export interface RecipeRow {
  id: string;
  title: string;
  tags: string[];
  allergens: string[];
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  servings: number | null;
  cook_minutes: number | null;
}

export interface PivotRow {
  id?: string;
  recipe_id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
}

export interface PostgrestFixtureState {
  stock: StockRow[];
  baseIngredients: { id: string; name: string }[];
  users: { id: string; preferences: Record<string, unknown> | null }[];
  householdMembers: { user_id: string; household_id: string }[];
  pivots: PivotRow[];
  recipes: RecipeRow[];
  ingredientSynonyms: Record<string, unknown>[];
  ingredientCategoryPivots: Record<string, unknown>[];
}

export interface RecordedHttpRequest {
  method: string;
  path: string;
  search: string;
  body: unknown;
}

export interface MemoryAuthStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface PostgrestFixture {
  url: string;
  anonKey: string;
  userId: string;
  state: PostgrestFixtureState;
  requests: RecordedHttpRequest[];
  storage: MemoryAuthStorage;
  close(): Promise<void>;
}

export interface PostgrestFixtureSeed {
  stock?: StockRow[];
  baseIngredients?: { id: string; name: string }[];
  preferences?: Record<string, unknown> | null;
  pivots?: PivotRow[];
  recipes?: RecipeRow[];
  /** When false, the user has no household membership. Defaults to true. */
  household?: boolean;
}

const TABLES = {
  stock: "stock",
  base_ingredient: "baseIngredients",
  users: "users",
  household_members: "householdMembers",
  pivot_recipe_ingredient: "pivots",
  recipe: "recipes",
  ingredient_synonym: "ingredientSynonyms",
  pivot_ingredient_category: "ingredientCategoryPivots",
} as const;

type TableName = keyof typeof TABLES;

function memoryStorage(): MemoryAuthStorage {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
    removeItem: (key) => {
      items.delete(key);
    },
  };
}

function seedSession(storage: MemoryAuthStorage): void {
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;
  storage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      access_token: TEST_ACCESS_TOKEN,
      refresh_token: "test-refresh-token",
      expires_at: expiresAt,
      expires_in: 60 * 60,
      token_type: "bearer",
      user: {
        id: TEST_USER_ID,
        aud: "authenticated",
        role: "authenticated",
        email: "agent-test@example.com",
        app_metadata: {},
        user_metadata: {},
        created_at: "2026-01-01T00:00:00.000Z",
      },
    })
  );
}

function rowsFor(state: PostgrestFixtureState, table: TableName): Record<string, unknown>[] {
  const key = TABLES[table];
  return state[key] as unknown as Record<string, unknown>[];
}

function matchesFilter(row: Record<string, unknown>, column: string, filter: string): boolean {
  const value = row[column];
  if (filter.startsWith("eq.")) return String(value ?? "") === filter.slice(3);
  if (filter.startsWith("imatch."))
    return new RegExp(filter.slice(7).replace(/\\A/, "^").replace(/\\Z/, "$"), "i").test(String(value ?? ""));
  if (filter.startsWith("ilike.")) {
    // The cooking tools send a bare name (no SQL wildcards), which PostgREST
    // treats as a case-insensitive exact match.
    return String(value ?? "").toLowerCase() === filter.slice(6).toLowerCase();
  }
  if (filter.startsWith("in.(") && filter.endsWith(")")) {
    const values = filter
      .slice(4, -1)
      .split(",")
      .filter((item) => item.length > 0)
      .map((item) => item.replace(/^"|"$/g, ""));
    return values.includes(String(value ?? ""));
  }
  return false;
}

function applyFilters(rows: Record<string, unknown>[], url: URL): Record<string, unknown>[] {
  let filtered = rows;
  for (const [column, filter] of url.searchParams.entries()) {
    if (["select", "limit", "offset", "columns", "order"].includes(column)) {
      continue;
    }
    filtered = filtered.filter((row) => matchesFilter(row, column, filter));
  }
  const order = url.searchParams.get("order");
  if (order) {
    const [column, direction] = order.split(".");
    if (column) {
      filtered = [...filtered].sort((a, b) => {
        const comparison = String(a[column] ?? "").localeCompare(String(b[column] ?? ""));
        return direction === "desc" ? -comparison : comparison;
      });
    }
  }
  const offset = Number(url.searchParams.get("offset") ?? 0);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 1000), 1000);
  return filtered.slice(offset, offset + limit);
}

async function readBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return null;
  return JSON.parse(raw) as unknown;
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

function nextStockId(state: PostgrestFixtureState): string {
  return `stock-${state.stock.length + 1}`;
}

export async function startPostgrestFixture(
  seed: PostgrestFixtureSeed = {},
  options: { port?: number } = {}
): Promise<PostgrestFixture> {
  const state: PostgrestFixtureState = {
    stock: [...(seed.stock ?? [])],
    baseIngredients: [...(seed.baseIngredients ?? [])],
    users:
      seed.preferences === undefined ? [] : [{ id: TEST_USER_ID, preferences: seed.preferences }],
    householdMembers:
      seed.household === false ? [] : [{ user_id: TEST_USER_ID, household_id: TEST_HOUSEHOLD_ID }],
    pivots: (seed.pivots ?? []).map((row, index) => ({
      id: String(index).padStart(6, "0"),
      ...row,
    })),
    recipes: [...(seed.recipes ?? [])],
    ingredientSynonyms: [],
    ingredientCategoryPivots: [],
  };
  const requests: RecordedHttpRequest[] = [];
  const storage = memoryStorage();
  seedSession(storage);

  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    let body: unknown = null;
    try {
      body = await readBody(request);
    } catch {
      sendJson(response, 400, { message: "Invalid JSON", code: "fixture" });
      return;
    }
    requests.push({
      method: request.method ?? "GET",
      path: url.pathname,
      search: url.search,
      body,
    });

    if (url.pathname === "/auth/v1/user") {
      sendJson(response, 200, {
        id: TEST_USER_ID,
        aud: "authenticated",
        role: "authenticated",
        email: "agent-test@example.com",
      });
      return;
    }
    if (url.pathname === "/auth/v1/token") {
      sendJson(response, 200, {
        access_token: TEST_ACCESS_TOKEN,
        refresh_token: "test-refresh-token",
        expires_in: 60 * 60,
        token_type: "bearer",
        user: { id: TEST_USER_ID, email: "agent-test@example.com" },
      });
      return;
    }

    const restMatch = url.pathname.match(/^\/rest\/v1\/([^/]+)$/);
    const table = restMatch?.[1] as TableName | undefined;
    if (!table || !(table in TABLES)) {
      sendJson(response, 404, {
        message: `No fixture route for ${request.method} ${url.pathname}`,
        code: "fixture",
      });
      return;
    }

    const method = request.method ?? "GET";
    if (method === "POST") {
      const incoming = (Array.isArray(body) ? body[0] : body) as Record<string, unknown> | null;
      const row = { ...(incoming ?? {}) };
      if (table === "stock" && typeof row.id !== "string") row.id = nextStockId(state);
      rowsFor(state, table).push(row);
      const accept = request.headers.accept ?? "";
      if (accept.includes("application/vnd.pgrst.object+json")) {
        sendJson(response, 201, row);
        return;
      }
      sendJson(response, 201, [row]);
      return;
    }

    const matched = applyFilters(rowsFor(state, table), url);
    if (method === "DELETE") {
      const ids = new Set(matched.map((row) => row.id));
      const key = TABLES[table];
      const current = state[key] as unknown as Record<string, unknown>[];
      const remaining = current.filter((row) => !ids.has(row.id));
      (state[key] as unknown as Record<string, unknown>[]) = remaining;
      sendJson(response, 200, matched);
      return;
    }

    if (method === "GET" || method === "HEAD") {
      if (method === "HEAD") {
        response.writeHead(200);
        response.end();
        return;
      }
      if (request.headers.accept?.includes("application/vnd.pgrst.object+json")) {
        if (matched.length !== 1) {
          sendJson(response, 406, { message: "Expected one fixture row", code: "PGRST116" });
          return;
        }
        sendJson(response, 200, matched[0]);
        return;
      }
      sendJson(response, 200, matched);
      return;
    }

    sendJson(response, 405, { message: `Unsupported method ${method}`, code: "fixture" });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port ?? 0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("PostgREST fixture did not bind.");
  }

  return {
    url: `http://127.0.0.1:${address.port}`,
    anonKey: TEST_ANON_KEY,
    userId: TEST_USER_ID,
    state,
    requests,
    storage,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

/**
 * Real supabase-js client pointed at the fixture, with the seeded session
 * already in its storage adapter.
 */
export function createFixtureSupabaseClient(fixture: PostgrestFixture): SupabaseClient<Database> {
  return createClient<Database>(fixture.url, fixture.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: fixture.storage,
      storageKey: AUTH_STORAGE_KEY,
    },
  });
}
