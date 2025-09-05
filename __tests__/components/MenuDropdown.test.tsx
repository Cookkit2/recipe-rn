import React from "react";
import { render } from "@testing-library/react-native";
import MenuDropdown from "~/components/Pantry/MenuDropdown";
import { AuthProvider } from "~/auth";
import { MockAuthStrategy } from "~/auth";

// Simple mock for the auth hook
const mockSignOut = jest.fn();
jest.mock("~/auth", () => {
  const actual = jest.requireActual("~/auth");
  return {
    ...actual,
    useAuth: () => ({
      signOut: mockSignOut,
      isAuthenticated: true,
      user: { id: "test-user", email: "test@example.com" },
      authState: "authenticated",
      error: null,
      isLoading: false,
      isInitialized: true,
      isAnonymous: false,
      hasValidSession: true,
      canLinkAccount: false,
      session: null,
      signInWithEmail: jest.fn(),
      signInWithProvider: jest.fn(),
      signInAnonymously: jest.fn(),
      signUpWithEmail: jest.fn(),
      refreshSession: jest.fn(),
      linkAnonymousAccount: jest.fn(),
      resetPassword: jest.fn(),
      clearError: jest.fn(),
      validateSession: jest.fn(),
    }),
  };
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider strategy={new MockAuthStrategy()}>
    {children}
  </AuthProvider>
);

describe("MenuDropdown", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignOut.mockResolvedValue({ success: true });
  });

  it("renders the menu dropdown", () => {
    const { getByTestId } = render(
      <TestWrapper>
        <MenuDropdown />
      </TestWrapper>
    );
    
    // The component should render without crashing
    expect(true).toBe(true);
  });

  it("shows sign out option when authenticated", () => {
    const { getByText } = render(
      <TestWrapper>
        <MenuDropdown />
      </TestWrapper>
    );
    
    // Should show Sign Out text
    expect(getByText("Sign Out")).toBeTruthy();
  });
});
