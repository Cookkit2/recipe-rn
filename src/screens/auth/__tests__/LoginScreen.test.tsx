/**
 * Login Screen Tests
 * Comprehensive tests for LoginScreen component
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react-native";
import { useRouter } from "expo-router";
import LoginScreen from "../LoginScreen";
import { useAuth } from "~/src/contexts/AuthContext";

// Mock dependencies
jest.mock("expo-router");
jest.mock("~/src/contexts/AuthContext");
jest.mock("expo-linear-gradient", () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe("LoginScreen", () => {
  const mockLogin = jest.fn();
  const mockClearError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      register: jest.fn(),
      logout: jest.fn(),
      refreshSession: jest.fn(),
      checkAuth: jest.fn(),
      clearError: mockClearError,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });

    mockRouter.mockReturnValue({
      replace: jest.fn(),
      push: jest.fn(),
      back: jest.fn(),
      canGoBack: jest.fn(),
      dismiss: jest.fn(),
      dismissAll: jest.fn(),
      setParams: jest.fn(),
    } as any);
  });

  describe("Rendering", () => {
    it("should render login form correctly", () => {
      render(<LoginScreen />);

      expect(screen.getByText("Welcome Back!")).toBeTruthy();
      expect(screen.getByText("Login to continue cooking")).toBeTruthy();
      expect(screen.getByText("Email")).toBeTruthy();
      expect(screen.getByText("Password")).toBeTruthy();
      expect(screen.getByText("Login")).toBeTruthy();
      expect(screen.getByText("Don't have an account? Register")).toBeTruthy();
    });

    it("should render input fields with correct placeholders", () => {
      render(<LoginScreen />);

      expect(screen.getByPlaceholderText("Enter your email")).toBeTruthy();
      expect(screen.getByPlaceholderText("Enter your password")).toBeTruthy();
    });

    it('should render "or" divider', () => {
      render(<LoginScreen />);

      expect(screen.getByText("or")).toBeTruthy();
    });
  });

  describe("User Input", () => {
    it("should accept email input", () => {
      render(<LoginScreen />);

      const emailInput = screen.getByPlaceholderText("Enter your email");
      fireEvent.changeText(emailInput, "test@example.com");

      expect(emailInput.props.value).toBe("test@example.com");
    });

    it("should accept password input", () => {
      render(<LoginScreen />);

      const passwordInput = screen.getByPlaceholderText("Enter your password");
      fireEvent.changeText(passwordInput, "password123");

      expect(passwordInput.props.value).toBe("password123");
    });

    it("should have password field as secure text entry", () => {
      render(<LoginScreen />);

      const passwordInput = screen.getByPlaceholderText("Enter your password");

      expect(passwordInput.props.secureTextEntry).toBe(true);
    });

    it("should have email field with email keyboard type", () => {
      render(<LoginScreen />);

      const emailInput = screen.getByPlaceholderText("Enter your email");

      expect(emailInput.props.keyboardType).toBe("email-address");
    });

    it("should disable inputs when loading", () => {
      mockUseAuth.mockReturnValue({
        ...mockUseAuth(),
        isLoading: true,
      });

      render(<LoginScreen />);

      const emailInput = screen.getByPlaceholderText("Enter your email");
      const passwordInput = screen.getByPlaceholderText("Enter your password");

      expect(emailInput.props.editable).toBe(false);
      expect(passwordInput.props.editable).toBe(false);
    });
  });

  describe("Form Validation", () => {
    it("should show error when email is empty", async () => {
      render(<LoginScreen />);

      const loginButton = screen.getByText("Login");
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(screen.getByText("Please fill in all fields")).toBeTruthy();
      });
    });

    it("should show error when password is empty", async () => {
      render(<LoginScreen />);

      const emailInput = screen.getByPlaceholderText("Enter your email");
      fireEvent.changeText(emailInput, "test@example.com");

      const loginButton = screen.getByText("Login");
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(screen.getByText("Please fill in all fields")).toBeTruthy();
      });
    });

    it("should show error for invalid email format", async () => {
      render(<LoginScreen />);

      const emailInput = screen.getByPlaceholderText("Enter your email");
      const passwordInput = screen.getByPlaceholderText("Enter your password");

      fireEvent.changeText(emailInput, "invalid-email");
      fireEvent.changeText(passwordInput, "password123");

      const loginButton = screen.getByText("Login");
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(screen.getByText("Invalid email format")).toBeTruthy();
      });
    });

    it("should show error for email without @", async () => {
      render(<LoginScreen />);

      const emailInput = screen.getByPlaceholderText("Enter your email");
      const passwordInput = screen.getByPlaceholderText("Enter your password");

      fireEvent.changeText(emailInput, "testexample.com");
      fireEvent.changeText(passwordInput, "password123");

      const loginButton = screen.getByText("Login");
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(screen.getByText("Invalid email format")).toBeTruthy();
      });
    });

    it("should show error for email without domain", async () => {
      render(<LoginScreen />);

      const emailInput = screen.getByPlaceholderText("Enter your email");
      const passwordInput = screen.getByPlaceholderText("Enter your password");

      fireEvent.changeText(emailInput, "test@");
      fireEvent.changeText(passwordInput, "password123");

      const loginButton = screen.getByText("Login");
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(screen.getByText("Invalid email format")).toBeTruthy();
      });
    });

    it("should accept valid email with subdomain", async () => {
      mockLogin.mockResolvedValue(undefined);
      const mockReplace = jest.fn();
      mockRouter.mockReturnValue({
        ...mockRouter(),
        replace: mockReplace,
      } as any);

      render(<LoginScreen />);

      const emailInput = screen.getByPlaceholderText("Enter your email");
      const passwordInput = screen.getByPlaceholderText("Enter your password");

      fireEvent.changeText(emailInput, "test@mail.example.com");
      fireEvent.changeText(passwordInput, "password123");

      const loginButton = screen.getByText("Login");
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith("test@mail.example.com", "password123");
      });
    });
  });

  describe("Login Flow", () => {
    it("should call login with correct credentials", async () => {
      mockLogin.mockResolvedValue(undefined);
      const mockReplace = jest.fn();
      mockRouter.mockReturnValue({
        ...mockRouter(),
        replace: mockReplace,
      } as any);

      render(<LoginScreen />);

      const emailInput = screen.getByPlaceholderText("Enter your email");
      const passwordInput = screen.getByPlaceholderText("Enter your password");

      fireEvent.changeText(emailInput, "test@example.com");
      fireEvent.changeText(passwordInput, "password123");

      const loginButton = screen.getByText("Login");
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith("test@example.com", "password123");
      });
    });

    it("should navigate to home on successful login", async () => {
      mockLogin.mockResolvedValue(undefined);
      const mockReplace = jest.fn();
      mockRouter.mockReturnValue({
        ...mockRouter(),
        replace: mockReplace,
      } as any);

      render(<LoginScreen />);

      const emailInput = screen.getByPlaceholderText("Enter your email");
      const passwordInput = screen.getByPlaceholderText("Enter your password");

      fireEvent.changeText(emailInput, "test@example.com");
      fireEvent.changeText(passwordInput, "password123");

      const loginButton = screen.getByText("Login");
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/");
      });
    });

    it("should show generic error on login failure", async () => {
      mockLogin.mockRejectedValue(new Error("Invalid credentials"));

      render(<LoginScreen />);

      const emailInput = screen.getByPlaceholderText("Enter your email");
      const passwordInput = screen.getByPlaceholderText("Enter your password");

      fireEvent.changeText(emailInput, "test@example.com");
      fireEvent.changeText(passwordInput, "wrongpassword");

      const loginButton = screen.getByText("Login");
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(screen.getByText("Invalid email or password")).toBeTruthy();
      });
    });

    it("should clear error before new login attempt", async () => {
      mockLogin.mockRejectedValueOnce(new Error("Invalid credentials"));

      render(<LoginScreen />);

      const emailInput = screen.getByPlaceholderText("Enter your email");
      const passwordInput = screen.getByPlaceholderText("Enter your password");

      fireEvent.changeText(emailInput, "test@example.com");
      fireEvent.changeText(passwordInput, "wrongpassword");

      const loginButton = screen.getByText("Login");
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(mockClearError).toHaveBeenCalled();
      });
    });

    it("should handle unknown errors gracefully", async () => {
      mockLogin.mockRejectedValue("string error");

      render(<LoginScreen />);

      const emailInput = screen.getByPlaceholderText("Enter your email");
      const passwordInput = screen.getByPlaceholderText("Enter your password");

      fireEvent.changeText(emailInput, "test@example.com");
      fireEvent.changeText(passwordInput, "password123");

      const loginButton = screen.getByText("Login");
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(screen.getByText("Invalid email or password")).toBeTruthy();
      });
    });
  });

  describe("Loading State", () => {
    it("should show loading indicator during login", async () => {
      let resolveLogin: (value: void) => void;
      mockLogin.mockReturnValue(
        new Promise((resolve) => {
          resolveLogin = resolve;
        })
      );

      render(<LoginScreen />);

      const emailInput = screen.getByPlaceholderText("Enter your email");
      const passwordInput = screen.getByPlaceholderText("Enter your password");

      fireEvent.changeText(emailInput, "test@example.com");
      fireEvent.changeText(passwordInput, "password123");

      const loginButton = screen.getByText("Login");
      fireEvent.press(loginButton);

      // Check for ActivityIndicator
      await waitFor(() => {
        const activityIndicator = screen.getByTestId("activity-indicator");
        expect(activityIndicator).toBeTruthy();
      });

      resolveLogin!();
    });

    it("should disable button when loading", () => {
      mockUseAuth.mockReturnValue({
        ...mockUseAuth(),
        isLoading: true,
      });

      render(<LoginScreen />);

      const loginButton = screen.getByText("Login");

      expect(loginButton.parent?.props.disabled).toBe(true);
    });

    it("should have reduced opacity when disabled", () => {
      mockUseAuth.mockReturnValue({
        ...mockUseAuth(),
        isLoading: true,
      });

      render(<LoginScreen />);

      const loginButton = screen.getByText("Login");
      const buttonStyle = loginButton.parent?.props.style;

      expect(buttonStyle).toContainEqual({ opacity: 0.6 });
    });
  });

  describe("Navigation", () => {
    it("should navigate to register screen when register link pressed", () => {
      const mockPush = jest.fn();
      mockRouter.mockReturnValue({
        ...mockRouter(),
        push: mockPush,
      } as any);

      render(<LoginScreen />);

      const registerLink = screen.getByText("Don't have an account? Register");
      fireEvent.press(registerLink);

      expect(mockPush).toHaveBeenCalledWith("/sign-up");
    });

    it("should disable navigation when loading", () => {
      mockUseAuth.mockReturnValue({
        ...mockUseAuth(),
        isLoading: true,
      });

      render(<LoginScreen />);

      const registerLink = screen.getByText("Don't have an account? Register");
      expect(registerLink.parent?.props.disabled).toBe(true);
    });
  });

  describe("Error Display", () => {
    it("should display error message", async () => {
      mockLogin.mockRejectedValue(new Error("Invalid credentials"));

      render(<LoginScreen />);

      const emailInput = screen.getByPlaceholderText("Enter your email");
      const passwordInput = screen.getByPlaceholderText("Enter your password");

      fireEvent.changeText(emailInput, "test@example.com");
      fireEvent.changeText(passwordInput, "wrongpassword");

      const loginButton = screen.getByText("Login");
      fireEvent.press(loginButton);

      await waitFor(() => {
        const errorContainer = screen.getByText("Invalid email or password");
        expect(errorContainer).toBeTruthy();
      });
    });

    it("should clear error when user starts typing", async () => {
      render(<LoginScreen />);

      // First, trigger an error
      const loginButton = screen.getByText("Login");
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(screen.getByText("Please fill in all fields")).toBeTruthy();
      });

      // Start typing
      const emailInput = screen.getByPlaceholderText("Enter your email");
      fireEvent.changeText(emailInput, "t");

      await waitFor(() => {
        // Local error state should be cleared
        expect(screen.queryByText("Please fill in all fields")).toBeNull();
      });
    });
  });

  describe("Accessibility", () => {
    it("should have accessible email input", () => {
      render(<LoginScreen />);

      const emailInput = screen.getByPlaceholderText("Enter your email");
      expect(emailInput).toBeTruthy();
    });

    it("should have accessible password input", () => {
      render(<LoginScreen />);

      const passwordInput = screen.getByPlaceholderText("Enter your password");
      expect(passwordInput).toBeTruthy();
    });

    it("should have accessible login button", () => {
      render(<LoginScreen />);

      const loginButton = screen.getByText("Login");
      expect(loginButton).toBeTruthy();
    });

    it("should have accessible register link", () => {
      render(<LoginScreen />);

      const registerLink = screen.getByText("Don't have an account? Register");
      expect(registerLink).toBeTruthy();
    });
  });

  describe("Edge Cases", () => {
    it("should handle email with leading/trailing spaces", async () => {
      mockLogin.mockResolvedValue(undefined);
      const mockReplace = jest.fn();
      mockRouter.mockReturnValue({
        ...mockRouter(),
        replace: mockReplace,
      } as any);

      render(<LoginScreen />);

      const emailInput = screen.getByPlaceholderText("Enter your email");
      const passwordInput = screen.getByPlaceholderText("Enter your password");

      fireEvent.changeText(emailInput, "  test@example.com  ");
      fireEvent.changeText(passwordInput, "password123");

      const loginButton = screen.getByText("Login");
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith("  test@example.com  ", "password123");
      });
    });

    it("should handle very long email", () => {
      render(<LoginScreen />);

      const longEmail = "a".repeat(300) + "@example.com";
      const emailInput = screen.getByPlaceholderText("Enter your email");

      fireEvent.changeText(emailInput, longEmail);

      expect(emailInput.props.value).toBe(longEmail);
    });

    it("should handle very long password", () => {
      render(<LoginScreen />);

      const longPassword = "a".repeat(1000);
      const passwordInput = screen.getByPlaceholderText("Enter your password");

      fireEvent.changeText(passwordInput, longPassword);

      expect(passwordInput.props.value).toBe(longPassword);
    });

    it("should handle special characters in email", async () => {
      mockLogin.mockResolvedValue(undefined);
      const mockReplace = jest.fn();
      mockRouter.mockReturnValue({
        ...mockRouter(),
        replace: mockReplace,
      } as any);

      render(<LoginScreen />);

      const emailInput = screen.getByPlaceholderText("Enter your email");
      const passwordInput = screen.getByPlaceholderText("Enter your password");

      fireEvent.changeText(emailInput, "test+user@example.com");
      fireEvent.changeText(passwordInput, "password123");

      const loginButton = screen.getByText("Login");
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith("test+user@example.com", "password123");
      });
    });

    it("should handle unicode characters in password", async () => {
      mockLogin.mockResolvedValue(undefined);
      const mockReplace = jest.fn();
      mockRouter.mockReturnValue({
        ...mockRouter(),
        replace: mockReplace,
      } as any);

      render(<LoginScreen />);

      const emailInput = screen.getByPlaceholderText("Enter your email");
      const passwordInput = screen.getByPlaceholderText("Enter your password");

      fireEvent.changeText(emailInput, "test@example.com");
      fireEvent.changeText(passwordInput, "密码🔒");

      const loginButton = screen.getByText("Login");
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith("test@example.com", "密码🔒");
      });
    });

    it("should prevent multiple simultaneous login attempts", async () => {
      let resolveLogin: (value: void) => void;
      mockLogin.mockReturnValue(
        new Promise((resolve) => {
          resolveLogin = resolve;
        })
      );

      render(<LoginScreen />);

      const emailInput = screen.getByPlaceholderText("Enter your email");
      const passwordInput = screen.getByPlaceholderText("Enter your password");

      fireEvent.changeText(emailInput, "test@example.com");
      fireEvent.changeText(passwordInput, "password123");

      const loginButton = screen.getByText("Login");

      // Press button multiple times
      fireEvent.press(loginButton);
      fireEvent.press(loginButton);
      fireEvent.press(loginButton);

      // Should only call login once
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledTimes(1);
      });

      resolveLogin!();
    });
  });

  describe("Security", () => {
    it("should use generic error message to prevent account enumeration", async () => {
      mockLogin.mockRejectedValue(new Error("User not found"));

      render(<LoginScreen />);

      const emailInput = screen.getByPlaceholderText("Enter your email");
      const passwordInput = screen.getByPlaceholderText("Enter your password");

      fireEvent.changeText(emailInput, "nonexistent@example.com");
      fireEvent.changeText(passwordInput, "password123");

      const loginButton = screen.getByText("Login");
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(screen.getByText("Invalid email or password")).toBeTruthy();
        expect(screen.queryByText("User not found")).toBeNull();
      });
    });

    it("should not reveal if email exists vs wrong password", async () => {
      mockLogin.mockRejectedValue(new Error("Wrong password"));

      render(<LoginScreen />);

      const emailInput = screen.getByPlaceholderText("Enter your email");
      const passwordInput = screen.getByPlaceholderText("Enter your password");

      fireEvent.changeText(emailInput, "test@example.com");
      fireEvent.changeText(passwordInput, "wrongpassword");

      const loginButton = screen.getByText("Login");
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(screen.getByText("Invalid email or password")).toBeTruthy();
      });
    });
  });
});
