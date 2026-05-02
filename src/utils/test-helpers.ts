/**
 * Test Helpers and Utilities
 * Common utilities for authentication tests
 */

import { render } from "@testing-library/react-native";
import { AuthProvider } from "~/src/contexts/AuthContext";
import { createElement, type ReactElement, type ReactNode } from "react";

/**
 * Custom render function that includes AuthProvider
 */
export function renderWithAuthProvider(ui: ReactElement, { ...renderOptions } = {}) {
  function Wrapper({ children }: { children: ReactNode }) {
    return createElement(AuthProvider, null, children);
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

/**
 * Mock user data for testing
 */
export const mockUser = {
  id: "test-user-123",
  email: "test@example.com",
  displayName: "Test User",
  avatarUrl: "https://example.com/avatar.jpg",
};

/**
 * Mock session data for testing
 */
export const mockSession = {
  userId: "test-user-123",
  accessToken: "mock-access-token-123",
  refreshToken: "mock-refresh-token-123",
};

/**
 * Mock credentials for testing
 */
export const mockCredentials = {
  validEmail: "test@example.com",
  validPassword: "password123",
  invalidEmail: "invalid-email",
  shortPassword: "12345",
  longEmail: "a".repeat(300) + "@example.com",
  unicodeEmail: "test+用户@example.com",
};

/**
 * Wait for async operations to complete
 */
export const waitForAsync = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Create a mock auth store state
 */
export const createMockAuthState = (overrides = {}) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  refreshSession: jest.fn(),
  checkAuth: jest.fn(),
  clearError: jest.fn(),
  ...overrides,
});

/**
 * Common test scenarios
 */
export const testScenarios = {
  validCredentials: {
    email: "test@example.com",
    password: "password123",
    displayName: "Test User",
  },

  invalidCredentials: {
    email: "invalid-email",
    password: "12345",
    displayName: "",
  },

  edgeCases: {
    emptyEmail: "",
    emptyPassword: "",
    emptyDisplayName: "",
    longEmail: "a".repeat(300) + "@example.com",
    longPassword: "a".repeat(1000),
    longDisplayName: "a".repeat(300),
    unicodeEmail: "test+用户@example.com",
    unicodePassword: "密码🔒",
    unicodeDisplayName: "用户名 👨‍🍳",
    specialCharsEmail: "test+user@example.com",
    specialCharsPassword: "P@$$w0rd!#$%^&*()",
    specialCharsDisplayName: "O'Brien Jr.",
  },

  security: {
    sqlInjection: "'; DROP TABLE users; --",
    xss: '<script>alert("xss")</script>',
    pathTraversal: "../../../etc/passwd",
  },
};

/**
 * Mock database responses
 */
export const mockDbResponses = {
  user: {
    id: "test-user-123",
    email: "test@example.com",
    password_hash: "mock-hash",
    display_name: "Test User",
    avatar_url: null,
    preferences: null,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
  },

  session: {
    id: "test-session-123",
    user_id: "test-user-123",
    access_token: "mock-access-token",
    refresh_token: "mock-refresh-token",
    expires_at: "2099-01-01T00:00:00.000Z",
    created_at: "2024-01-01T00:00:00.000Z",
    last_used: "2024-01-01T00:00:00.000Z",
    is_revoked: 0,
  },

  expiredSession: {
    id: "expired-session-123",
    user_id: "test-user-123",
    access_token: "expired-access-token",
    refresh_token: "expired-refresh-token",
    expires_at: "2020-01-01T00:00:00.000Z",
    created_at: "2020-01-01T00:00:00.000Z",
    last_used: "2020-01-01T00:00:00.000Z",
    is_revoked: 0,
  },

  revokedSession: {
    id: "revoked-session-123",
    user_id: "test-user-123",
    access_token: "revoked-access-token",
    refresh_token: "revoked-refresh-token",
    expires_at: "2099-01-01T00:00:00.000Z",
    created_at: "2024-01-01T00:00:00.000Z",
    last_used: "2024-01-01T00:00:00.000Z",
    is_revoked: 1,
  },
};

/**
 * Performance test utilities
 */
export const performanceTestUtils = {
  /**
   * Measure execution time of a function
   */
  async measureTime(fn: () => Promise<void> | void): Promise<number> {
    const start = Date.now();
    await fn();
    return Date.now() - start;
  },

  /**
   * Run a function multiple times and return average time
   */
  async averageTime(fn: () => Promise<void> | void, iterations = 100): Promise<number> {
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const time = await this.measureTime(fn);
      times.push(time);
    }

    return times.reduce((sum, time) => sum + time, 0) / times.length;
  },
};

/**
 * Security test utilities
 */
export const securityTestUtils = {
  /**
   * Check if string contains SQL injection patterns
   */
  hasSqlInjection(str: string): boolean {
    const sqlPatterns = [
      /('|(\-\-)|(;)|(\s+or\s+)|(\s+and\s+))/i,
      /(\bunion\b)|(\bselect\b)|(\binsert\b)|(\bupdate\b)|(\bdelete\b)|(\bdrop\b)/i,
      /(\bexec\b)|(\bexecute\b)|(\bsp_\w+)/i,
    ];

    return sqlPatterns.some((pattern) => pattern.test(str));
  },

  /**
   * Check if string contains XSS patterns
   */
  hasXss(str: string): boolean {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi, // Event handlers like onclick=
    ];

    return xssPatterns.some((pattern) => pattern.test(str));
  },

  /**
   * Generate malicious test inputs
   */
  maliciousInputs: {
    sqlInjection: [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "admin'--",
      "' UNION SELECT * FROM users--",
    ],

    xss: [
      '<script>alert("xss")</script>',
      '<img src=x onerror=alert("xss")>',
      'javascript:alert("xss")',
      "<iframe src=\"javascript:alert('xss')\"></iframe>",
    ],

    pathTraversal: [
      "../../../etc/passwd",
      "..\\..\\..\\windows\\system32",
      "....//....//....//etc/passwd",
    ],
  },
};

/**
 * Type guards for testing
 */
export const typeGuards = {
  isUser(obj: unknown): obj is typeof mockUser {
    return typeof obj === "object" && obj !== null && "id" in obj && "email" in obj;
  },

  isSession(obj: unknown): obj is typeof mockSession {
    return (
      typeof obj === "object" &&
      obj !== null &&
      "userId" in obj &&
      "accessToken" in obj &&
      "refreshToken" in obj
    );
  },

  isError(obj: unknown): obj is Error {
    return obj instanceof Error || (typeof obj === "object" && obj !== null && "message" in obj);
  },
};

/**
 * Mock data generators
 */
export const mockDataGenerators = {
  /**
   * Generate a random email
   */
  email(): string {
    return `user${Math.random().toString(36).substring(7)}@example.com`;
  },

  /**
   * Generate a random password
   */
  password(length = 12): string {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  },

  /**
   * Generate a random user ID
   */
  userId(): string {
    return `user_${Math.random().toString(36).substring(2, 15)}`;
  },

  /**
   * Generate a random token
   */
  token(): string {
    return `token_${Math.random().toString(36).substring(2, 15)}`;
  },

  /**
   * Generate a timestamp in ISO format
   */
  isoTimestamp(future = false): string {
    const date = new Date();
    if (future) {
      date.setDate(date.getDate() + 30);
    }
    return date.toISOString();
  },
};
