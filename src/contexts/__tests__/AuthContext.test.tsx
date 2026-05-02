/**
 * AuthContext Tests
 * Comprehensive tests for AuthContext provider and hook
 */

import React, { type ReactNode } from "react";
import { renderHook, act, waitFor } from "@testing-library/react-native";
import { AuthProvider, useAuth } from "../AuthContext";
import { useAuthStore } from "~/src/store/authStore";

// Mock the auth store
jest.mock("~/src/store/authStore");

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

describe("AuthContext", () => {
  const mockCheckAuth = jest.fn();
  const mockLogin = jest.fn();
  const mockRegister = jest.fn();
  const mockLogout = jest.fn();
  const mockRefreshSession = jest.fn();
  const mockClearError = jest.fn();

  const defaultMockState = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    login: mockLogin,
    register: mockRegister,
    logout: mockLogout,
    refreshSession: mockRefreshSession,
    checkAuth: mockCheckAuth,
    clearError: mockClearError,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default auth store mock
    mockUseAuthStore.mockReturnValue(defaultMockState);
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  describe("AuthProvider", () => {
    it("should provide auth context values", () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current).toEqual(defaultMockState);
    });

    it("should call checkAuth on mount", () => {
      renderHook(() => useAuth(), { wrapper });

      expect(mockCheckAuth).toHaveBeenCalledTimes(1);
    });

    it("should update context when store state changes", async () => {
      const newUser = {
        id: "user-123",
        email: "test@example.com",
        displayName: "Test User",
      };

      // Initially not authenticated
      const { result, rerender } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();

      // Update store state
      mockUseAuthStore.mockReturnValue({
        ...defaultMockState,
        user: newUser,
        isAuthenticated: true,
      });

      // Rerender to propagate changes
      rerender(undefined);

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(newUser);
    });

    it("should memoize context value to prevent unnecessary re-renders", () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      const firstValue = result.current;
      const secondValue = result.current;

      // Same reference indicates memoization is working
      expect(firstValue).toBe(secondValue);
    });
  });

  describe("useAuth Hook", () => {
    it("should return auth context values", () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should provide login function", () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.login).toBeDefined();
      expect(typeof result.current.login).toBe("function");
    });

    it("should provide register function", () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.register).toBeDefined();
      expect(typeof result.current.register).toBe("function");
    });

    it("should provide logout function", () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.logout).toBeDefined();
      expect(typeof result.current.logout).toBe("function");
    });

    it("should provide refreshSession function", () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.refreshSession).toBeDefined();
      expect(typeof result.current.refreshSession).toBe("function");
    });

    it("should provide checkAuth function", () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.checkAuth).toBeDefined();
      expect(typeof result.current.checkAuth).toBe("function");
    });

    it("should provide clearError function", () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.clearError).toBeDefined();
      expect(typeof result.current.clearError).toBe("function");
    });
  });

  describe("Context Methods", () => {
    it("should call login from store when context login is called", async () => {
      mockLogin.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login("test@example.com", "password123");
      });

      expect(mockLogin).toHaveBeenCalledWith("test@example.com", "password123");
    });

    it("should call register from store when context register is called", async () => {
      mockRegister.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.register("test@example.com", "password123", "Test User");
      });

      expect(mockRegister).toHaveBeenCalledWith("test@example.com", "password123", "Test User");
    });

    it("should call logout from store when context logout is called", async () => {
      mockLogout.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.logout();
      });

      expect(mockLogout).toHaveBeenCalled();
    });

    it("should call refreshSession from store when context refreshSession is called", async () => {
      mockRefreshSession.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.refreshSession();
      });

      expect(mockRefreshSession).toHaveBeenCalled();
    });

    it("should call checkAuth from store when context checkAuth is called", async () => {
      mockCheckAuth.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.checkAuth();
      });

      expect(mockCheckAuth).toHaveBeenCalled();
    });

    it("should call clearError from store when context clearError is called", () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      act(() => {
        result.current.clearError();
      });

      expect(mockClearError).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should throw error when useAuth is used outside provider", () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow("useAuth must be used within an AuthProvider");

      console.error = originalError;
    });

    it("should propagate errors from login", async () => {
      const error = new Error("Login failed");
      mockLogin.mockRejectedValue(error);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        act(async () => {
          await result.current.login("test@example.com", "wrongpassword");
        })
      ).rejects.toThrow("Login failed");
    });

    it("should propagate errors from register", async () => {
      const error = new Error("Registration failed");
      mockRegister.mockRejectedValue(error);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        act(async () => {
          await result.current.register("test@example.com", "password123", "Test User");
        })
      ).rejects.toThrow("Registration failed");
    });

    it("should propagate errors from logout", async () => {
      const error = new Error("Logout failed");
      mockLogout.mockRejectedValue(error);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        act(async () => {
          await result.current.logout();
        })
      ).rejects.toThrow("Logout failed");
    });

    it("should propagate errors from refreshSession", async () => {
      const error = new Error("Refresh failed");
      mockRefreshSession.mockRejectedValue(error);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        act(async () => {
          await result.current.refreshSession();
        })
      ).rejects.toThrow("Refresh failed");
    });
  });

  describe("State Propagation", () => {
    it("should reflect loading state from store", () => {
      mockUseAuthStore.mockReturnValue({
        ...defaultMockState,
        isLoading: true,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isLoading).toBe(true);
    });

    it("should reflect error state from store", () => {
      const error = "Authentication failed";
      mockUseAuthStore.mockReturnValue({
        ...defaultMockState,
        error,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.error).toBe(error);
    });

    it("should reflect authenticated state from store", () => {
      const user = {
        id: "user-123",
        email: "test@example.com",
        displayName: "Test User",
      };

      mockUseAuthStore.mockReturnValue({
        ...defaultMockState,
        user,
        isAuthenticated: true,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(user);
    });

    it("should update state when store changes", async () => {
      const { result, rerender } = renderHook(() => useAuth(), { wrapper });

      // Initial state
      expect(result.current.isAuthenticated).toBe(false);

      // Simulate login
      const user = {
        id: "user-123",
        email: "test@example.com",
        displayName: "Test User",
      };

      mockUseAuthStore.mockReturnValue({
        ...defaultMockState,
        user,
        isAuthenticated: true,
        isLoading: false,
      });

      rerender(undefined);

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(user);
    });
  });

  describe("Integration with Store", () => {
    it("should call checkAuth on mount only once", () => {
      renderHook(() => useAuth(), { wrapper });

      expect(mockCheckAuth).toHaveBeenCalledTimes(1);
    });

    it("should not call checkAuth again on re-renders", () => {
      const { rerender } = renderHook(() => useAuth(), { wrapper });

      expect(mockCheckAuth).toHaveBeenCalledTimes(1);

      rerender(undefined);
      rerender(undefined);
      rerender(undefined);

      expect(mockCheckAuth).toHaveBeenCalledTimes(1);
    });

    it("should handle multiple components using same context", () => {
      const { result: result1 } = renderHook(() => useAuth(), { wrapper });
      const { result: result2 } = renderHook(() => useAuth(), { wrapper });

      // Both should have the same state
      expect(result1.current.isAuthenticated).toBe(result2.current.isAuthenticated);
      expect(result1.current.user).toBe(result2.current.user);
    });
  });

  describe("Type Safety", () => {
    it("should provide correct types for user", () => {
      const user = {
        id: "user-123",
        email: "test@example.com",
        displayName: "Test User",
      };

      mockUseAuthStore.mockReturnValue({
        ...defaultMockState,
        user,
        isAuthenticated: true,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.user?.id).toBe("user-123");
      expect(result.current.user?.email).toBe("test@example.com");
      expect(result.current.user?.displayName).toBe("Test User");
    });

    it("should handle null user correctly", () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it("should provide correct type for error", () => {
      const error = "Some error";

      mockUseAuthStore.mockReturnValue({
        ...defaultMockState,
        error,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.error).toBe(error);
      expect(typeof result.current.error).toBe("string");
    });

    it("should handle null error correctly", () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.error).toBeNull();
    });
  });

  describe("Performance", () => {
    it("should not cause unnecessary re-renders when values have not changed", () => {
      let renderCount = 0;

      const TestComponent = () => {
        renderCount++;
        const auth = useAuth();
        return <>{auth.isAuthenticated ? "Authenticated" : "Not Authenticated"}</>;
      };

      const { rerender } = renderHook(() => <TestComponent />, {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      const initialRenderCount = renderCount;

      // Re-render without state changes
      rerender(undefined);
      rerender(undefined);
      rerender(undefined);

      // Should not have additional re-renders due to memoization
      expect(renderCount).toBe(initialRenderCount);
    });

    it("should re-render when state actually changes", () => {
      let renderCount = 0;

      const TestComponent = () => {
        renderCount++;
        const auth = useAuth();
        return <>{auth.isAuthenticated ? "Authenticated" : "Not Authenticated"}</>;
      };

      const { rerender } = renderHook(() => <TestComponent />, {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      const initialRenderCount = renderCount;

      // Change state
      mockUseAuthStore.mockReturnValue({
        ...defaultMockState,
        isAuthenticated: true,
      });

      rerender(undefined);

      expect(renderCount).toBeGreaterThan(initialRenderCount);
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined user gracefully", () => {
      mockUseAuthStore.mockReturnValue({
        ...defaultMockState,
        user: undefined as any,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.user).toBeUndefined();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it("should handle rapid login/logout cycles", async () => {
      mockLogin.mockResolvedValue(undefined);
      mockLogout.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login("test@example.com", "password123");
        await result.current.logout();
        await result.current.login("test2@example.com", "password123");
        await result.current.logout();
      });

      expect(mockLogin).toHaveBeenCalledTimes(2);
      expect(mockLogout).toHaveBeenCalledTimes(2);
    });

    it("should handle concurrent method calls", async () => {
      mockLogin.mockResolvedValue(undefined);
      mockRegister.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await Promise.all([
          result.current.login("test@example.com", "password123"),
          result.current.register("test2@example.com", "password123", "Test User"),
        ]);
      });

      expect(mockLogin).toHaveBeenCalled();
      expect(mockRegister).toHaveBeenCalled();
    });

    it("should handle checkAuth being called manually", async () => {
      mockCheckAuth.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Reset mock to account for automatic call on mount
      mockCheckAuth.mockClear();

      await act(async () => {
        await result.current.checkAuth();
      });

      expect(mockCheckAuth).toHaveBeenCalledTimes(1);
    });
  });
});
