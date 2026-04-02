// @ts-nocheck
// Database initialization and helper functions
import * as SQLite from "expo-sqlite";
import * as Crypto from "expo-crypto";
import jwtEncode from "jwt-encode";

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Get or create the database connection
 */
export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!db) {
    db = await SQLite.openDatabaseAsync("recipe-rn.db");
  }
  return db;
};

/**
 * Create tables in the database
 */
export const initializeDatabase = async (): Promise<void> => {
  const database = await getDatabase();

  // Users table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      display_name TEXT,
      avatar_url TEXT,
      preferences JSON,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Sessions table (JWT + refresh tokens)
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_used TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Refresh tokens table (for token rotation)
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      is_revoked BOOLEAN DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
};

/**
 * Insert a new user
 */
export const createUser = async (
  userId: string,
  email: string,
  displayName?: string
): Promise<void> => {
  const database = await getDatabase();

  await database.runAsync(
    `INSERT INTO users (id, email, display_name, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, email, displayName ?? null, new Date().toISOString(), new Date().toISOString()]
  );
};

/**
 * Get user by email
 */
export const getUserByEmail = async (email: string): Promise<User | null> => {
  const database = await getDatabase();

  const result = await database.getFirstAsync<User | undefined>(
    `SELECT * FROM users WHERE email = ?`,
    [email]
  );

  return result || null;
};

/**
 * Get user by ID
 */
export const getUserById = async (userId: string): Promise<User | null> => {
  const database = await getDatabase();

  const result = await database.getFirstAsync<User | undefined>(
    `SELECT * FROM users WHERE id = ?`,
    [userId]
  );

  return result || null;
};

/**
 * Insert or update a session
 */
export const upsertSession = async (
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number
): Promise<void> => {
  const database = await getDatabase();
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  await database.runAsync(
    `INSERT OR REPLACE INTO sessions (id, user_id, access_token, refresh_token, expires_at, created_at, last_used)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      `${userId}_${Crypto.randomUUID()}`,
      userId,
      accessToken,
      refreshToken,
      expiresAt,
      new Date().toISOString(),
      new Date().toISOString(),
    ]
  );
};

/**
 * Get session by access token
 */
export const getSessionByToken = async (accessToken: string): Promise<Session | null> => {
  const database = await getDatabase();

  const result = await database.getFirstAsync<Session | undefined>(
    `SELECT * FROM sessions WHERE access_token = ? AND expires_at > ?`,
    [accessToken, new Date().toISOString()]
  );

  return result || null;
};

/**
 * Refresh the access token
 */
export const refreshToken = async (
  userId: string,
  oldRefreshToken: string
): Promise<{ accessToken: string; refreshToken: string } | null> => {
  const database = await getDatabase();

  // Verify refresh token
  const session = await database.getFirstAsync<Session | undefined>(
    `SELECT * FROM sessions WHERE user_id = ? AND refresh_token = ? AND expires_at > ?`,
    [userId, oldRefreshToken, new Date().toISOString()]
  );

  if (!session) {
    return null;
  }

  // Generate new tokens
  const { accessToken, refreshToken } = generateTokens(userId);

  // Update session
  await database.runAsync(
    `UPDATE sessions SET access_token = ?, refresh_token = ?, expires_at = ?, last_used = ?
     WHERE id = ?`,
    [
      accessToken,
      refreshToken,
      new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      new Date().toISOString(),
      session.id,
    ]
  );

  return { accessToken, refreshToken };
};

/**
 * Revoke session
 */
export const revokeSession = async (accessToken: string): Promise<void> => {
  const database = await getDatabase();

  await database.runAsync(`UPDATE sessions SET is_revoked = 1 WHERE access_token = ?`, [
    accessToken,
  ]);
};

/**
 * Create a refresh token
 */
export const createRefreshToken = async (
  userId: string,
  refreshToken: string,
  expiresIn: number
): Promise<void> => {
  const database = await getDatabase();
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  const tokenHash = await hashToken(refreshToken);

  await database.runAsync(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [`${userId}_${Crypto.randomUUID()}`, userId, tokenHash, expiresAt, new Date().toISOString()]
  );
};

/**
 * Revoke refresh token
 */
export const revokeRefreshToken = async (refreshToken: string): Promise<void> => {
  const database = await getDatabase();
  const tokenHash = await hashToken(refreshToken);

  await database.runAsync(`UPDATE refresh_tokens SET is_revoked = 1 WHERE token_hash = ?`, [
    tokenHash,
  ]);
};

/**
 * Check if refresh token is valid
 */
export const isValidRefreshToken = async (refreshToken: string): Promise<boolean> => {
  const database = await getDatabase();
  const tokenHash = await hashToken(refreshToken);

  const result = await database.getFirstAsync<{ count: number } | undefined>(
    `SELECT COUNT(*) as count FROM refresh_tokens
     WHERE token_hash = ? AND is_revoked = 0 AND expires_at > ?`,
    [tokenHash, new Date().toISOString()]
  );

  return result?.count ? result.count > 0 : false;
};

// Generate a stable secure pseudo-secret for the mock database session
const MOCK_JWT_SECRET = Array.from(Crypto.getRandomBytes(32))
  .map((b) => b.toString(16).padStart(2, "0"))
  .join("");

/**
 * Generate JWT tokens (simplified - use actual JWT library in production)
 */
const generateTokens = (userId: string): { accessToken: string; refreshToken: string } => {
  const payload = { userId, exp: Date.now() + 15 * 60 * 1000 };
  const accessToken = jwtEncode(payload, MOCK_JWT_SECRET);
  const refreshToken = `refresh_${userId}_${Crypto.randomUUID()}`;
  return { accessToken, refreshToken };
};

/**
 * Hash token for storage
 */
const hashToken = async (token: string): Promise<string> => {
  return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, token, {
    encoding: Crypto.CryptoEncoding.HEX,
  });
};

/**
 * Refresh expired sessions
 */
export const refreshExpiredSessions = async (): Promise<void> => {
  const database = await getDatabase();

  await database.runAsync(`UPDATE sessions SET is_revoked = 1 WHERE expires_at <= ?`, [
    new Date().toISOString(),
  ]);
};

/**
 * Clear expired refresh tokens
 */
export const clearExpiredRefreshTokens = async (): Promise<void> => {
  const database = await getDatabase();

  await database.runAsync(`DELETE FROM refresh_tokens WHERE expires_at <= ?`, [
    new Date().toISOString(),
  ]);
};

// Type definitions
export interface User {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  preferences?: any;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  created_at: string;
  last_used: string;
}
