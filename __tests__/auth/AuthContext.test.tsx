import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import { Text, View } from "react-native";
import {
  AuthProvider,
  useAuth,
  useAuthState,
  useAuthActions,
  ProtectedRoute,
  GuestOnlyRoute,
} from "~/auth/AuthContext";
import { MockAuthStrategy } from "~/auth/MockAuthStrategy";

// Simple test components
const TestComponent = () => {
  const auth = useAuth();
  return (
    <View>
      <Text testID="user-email">{auth.user?.email || "no-user"}</Text>
      <Text testID="auth-state">{auth.authState}</Text>
      <Text testID="is-authenticated">{auth.isAuthenticated.toString()}</Text>
      <Text testID="is-anonymous">{auth.isAnonymous.toString()}</Text>
      <Text testID="error">{auth.error || "no-error"}</Text>
    </View>
  );
};

const AuthStateComponent = () => {
  const authState = useAuthState();
  return (
    <View>
      <Text testID="state-user">{authState.user?.email || "no-user"}</Text>
      <Text testID="state-authenticated">
        {authState.isAuthenticated.toString()}
      </Text>
    </View>
  );
};

describe("AuthContext", () => {
  let mockStrategy: MockAuthStrategy;

  beforeEach(() => {
    mockStrategy = new MockAuthStrategy({ delay: 0 });
  });

  afterEach(() => {
    mockStrategy.clearStoredUsers();
  });

  describe("AuthProvider", () => {
    it("should provide auth context to children", async () => {
      const { getByTestId } = render(
        <AuthProvider strategy={mockStrategy} autoInitialize={false}>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(getByTestId("auth-state")).toBeTruthy();
        expect(getByTestId("is-authenticated")).toBeTruthy();
      });
    });

    it("should not auto-initialize when autoInitialize is false", async () => {
      const getCurrentUserSpy = jest.spyOn(mockStrategy, "getCurrentUser");

      render(
        <AuthProvider strategy={mockStrategy} autoInitialize={false}>
          <TestComponent />
        </AuthProvider>
      );

      // Give it some time to potentially initialize
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(getCurrentUserSpy).not.toHaveBeenCalled();
    });
  });

  describe("useAuth hook", () => {
    it("should throw error when used outside AuthProvider", () => {
      const TestComponentWithoutProvider = () => {
        useAuth();
        return null;
      };

      // Suppress console error for this test
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => {
        render(<TestComponentWithoutProvider />);
      }).toThrow("useAuth must be used within an AuthProvider");

      consoleSpy.mockRestore();
    });

    it("should provide auth state and actions", async () => {
      const { getByTestId } = render(
        <AuthProvider strategy={mockStrategy} autoInitialize={false}>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(getByTestId("user-email").props.children).toBe("no-user");
        expect(getByTestId("is-authenticated").props.children).toBe("false");
        expect(getByTestId("is-anonymous").props.children).toBe("false");
      });
    });
  });

  describe("useAuthState hook", () => {
    it("should provide only auth state (no actions)", async () => {
      const { getByTestId } = render(
        <AuthProvider strategy={mockStrategy} autoInitialize={false}>
          <AuthStateComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(getByTestId("state-user")).toBeTruthy();
        expect(getByTestId("state-authenticated")).toBeTruthy();
      });
    });
  });

  describe("ProtectedRoute", () => {
    const ProtectedContent = () => (
      <Text testID="protected-content">Protected Content</Text>
    );
    const Fallback = () => <Text testID="fallback">Please Sign In</Text>;

    it("should render fallback when not authenticated", async () => {
      const { getByTestId, queryByTestId } = render(
        <AuthProvider strategy={mockStrategy} autoInitialize={false}>
          <ProtectedRoute fallback={<Fallback />}>
            <ProtectedContent />
          </ProtectedRoute>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(queryByTestId("protected-content")).toBeNull();
        expect(getByTestId("fallback")).toBeTruthy();
      });
    });
  });

  describe("GuestOnlyRoute", () => {
    const GuestContent = () => (
      <Text testID="guest-content">Welcome Guest</Text>
    );
    const AuthenticatedFallback = () => (
      <Text testID="auth-fallback">Already Signed In</Text>
    );

    it("should render children when not authenticated", async () => {
      const { getByTestId, queryByTestId } = render(
        <AuthProvider strategy={mockStrategy} autoInitialize={true}>
          <GuestOnlyRoute fallback={<AuthenticatedFallback />}>
            <GuestContent />
          </GuestOnlyRoute>
        </AuthProvider>
      );

      // Wait for initialization to complete
      await waitFor(
        () => {
          expect(getByTestId("guest-content")).toBeTruthy();
          expect(queryByTestId("auth-fallback")).toBeNull();
        },
        { timeout: 1000 }
      );
    });
  });

  describe("basic functionality", () => {
    it("should handle provider info correctly", () => {
      const info = mockStrategy.getProviderInfo();
      expect(info.name).toBe("MockAuthStrategy");
      expect(info.features).toContain("email");
    });
  });
});
