import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import { Text, View } from "react-native";
import { AuthProvider, useAuth } from "~/auth/AuthContext";
import { MockAuthStrategy } from "~/auth/MockAuthStrategy";

// Simple test component that displays auth state
const SimpleAuthDisplay = () => {
  const auth = useAuth();
  return (
    <View>
      <Text testID="auth-state">{auth.authState}</Text>
      <Text testID="user-email">{auth.user?.email || "no-user"}</Text>
      <Text testID="is-authenticated">{auth.isAuthenticated.toString()}</Text>
      <Text testID="is-anonymous">{auth.isAnonymous.toString()}</Text>
      <Text testID="error">{auth.error || "no-error"}</Text>
    </View>
  );
};

describe("Auth Integration", () => {
  let mockStrategy: MockAuthStrategy;

  beforeEach(() => {
    mockStrategy = new MockAuthStrategy({ delay: 0 });
  });

  afterEach(() => {
    mockStrategy.clearStoredUsers();
  });

  describe("AuthProvider integration", () => {
    it("should provide auth context without crashing", async () => {
      const { getByTestId } = render(
        <AuthProvider strategy={mockStrategy} autoInitialize={false}>
          <SimpleAuthDisplay />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(getByTestId("auth-state")).toBeTruthy();
        expect(getByTestId("is-authenticated")).toBeTruthy();
      });
    });

    it("should have correct initial state", async () => {
      const { getByTestId } = render(
        <AuthProvider strategy={mockStrategy} autoInitialize={false}>
          <SimpleAuthDisplay />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(getByTestId("user-email").props.children).toBe("no-user");
        expect(getByTestId("is-authenticated").props.children).toBe("false");
        expect(getByTestId("is-anonymous").props.children).toBe("false");
        expect(getByTestId("error").props.children).toBe("no-error");
      });
    });

    it("should initialize when autoInitialize is true", async () => {
      const { getByTestId } = render(
        <AuthProvider strategy={mockStrategy} autoInitialize={true}>
          <SimpleAuthDisplay />
        </AuthProvider>
      );

      await waitFor(() => {
        // Should be initialized to unauthenticated state
        expect(getByTestId("auth-state").props.children).toBe(
          "unauthenticated"
        );
      });
    });
  });

  describe("MockAuthStrategy integration", () => {
    it("should work with strategy independently", async () => {
      const strategy = new MockAuthStrategy({ delay: 0 });

      // Test sign in
      const result = await strategy.signInWithEmail({
        email: "test@example.com",
        password: "password123",
      });

      expect(result.success).toBe(true);
      expect(result.user?.email).toBe("test@example.com");

      // Test getting current user
      const currentUser = await strategy.getCurrentUser();
      expect(currentUser?.email).toBe("test@example.com");

      // Test sign out
      const signOutResult = await strategy.signOut();
      expect(signOutResult.success).toBe(true);

      const afterSignOut = await strategy.getCurrentUser();
      expect(afterSignOut).toBeNull();
    });

    it("should handle anonymous sign in", async () => {
      const strategy = new MockAuthStrategy({ delay: 0 });

      const result = await strategy.signInAnonymously();

      expect(result.success).toBe(true);
      expect(result.user?.isAnonymous).toBe(true);
      expect(result.user?.email).toBeUndefined();
    });

    it("should handle account linking", async () => {
      const strategy = new MockAuthStrategy({ delay: 0 });

      // First sign in anonymously
      await strategy.signInAnonymously();
      const anonymousUser = await strategy.getCurrentUser();
      expect(anonymousUser?.isAnonymous).toBe(true);

      // Link to permanent account
      const linkResult = await strategy.linkAnonymousAccount({
        email: "linked@example.com",
        password: "password123",
      });

      expect(linkResult.success).toBe(true);
      expect(linkResult.user?.email).toBe("linked@example.com");
      expect(linkResult.user?.isAnonymous).toBe(false);
      expect(linkResult.user?.id).toBe(anonymousUser?.id); // Same user ID
    });

    it("should handle social sign in", async () => {
      const strategy = new MockAuthStrategy({ delay: 0 });

      const result = await strategy.signInWithProvider({ provider: "google" });

      expect(result.success).toBe(true);
      expect(result.user?.provider).toBe("google");
      expect(result.user?.email).toBe("user@google.com");
    });
  });

  describe("strategy provider info", () => {
    it("should provide correct provider information", () => {
      const strategy = new MockAuthStrategy({ delay: 0 });
      const info = strategy.getProviderInfo();

      expect(info.name).toBe("MockAuthStrategy");
      expect(info.version).toBe("1.0.0");
      expect(info.features).toContain("email");
      expect(info.features).toContain("social");
      expect(info.features).toContain("anonymous");
      expect(info.features).toContain("linking");
    });
  });

  describe("error scenarios", () => {
    it("should handle invalid credentials", async () => {
      const strategy = new MockAuthStrategy({ delay: 0 });
      strategy.clearStoredUsers(); // Remove default test users

      const result = await strategy.signInWithEmail({
        email: "invalid@example.com",
        password: "wrongpassword",
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_CREDENTIALS");
    });

    it("should handle account linking errors", async () => {
      const strategy = new MockAuthStrategy({ delay: 0 });

      // Try to link when not anonymous
      await strategy.signInWithEmail({
        email: "test@example.com",
        password: "password123",
      });

      const linkResult = await strategy.linkAnonymousAccount({
        email: "link@example.com",
        password: "password123",
      });

      expect(linkResult.success).toBe(false);
      expect(linkResult.error?.code).toBe("NOT_ANONYMOUS");
    });
  });
});
