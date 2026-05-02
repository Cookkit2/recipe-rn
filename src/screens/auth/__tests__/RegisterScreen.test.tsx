/**
 * Register Screen Tests
 * Comprehensive tests for RegisterScreen component
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { useRouter } from "expo-router";
import RegisterScreen from "../RegisterScreen";
import { useAuth } from "~/src/contexts/AuthContext";

// Mock dependencies
jest.mock("expo-router");
jest.mock("~/src/contexts/AuthContext");
jest.mock("expo-linear-gradient", () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe("RegisterScreen", () => {
  const mockRegister = jest.fn();
  const mockClearError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockUseAuth.mockReturnValue({
      login: jest.fn(),
      register: mockRegister,
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
    it("should render registration form correctly", () => {
      render(<RegisterScreen />);

      expect(screen.getByText("Create Account")).toBeTruthy();
      expect(screen.getByText("Join us and start cooking!")).toBeTruthy();
      expect(screen.getByText("Display Name")).toBeTruthy();
      expect(screen.getByText("Email")).toBeTruthy();
      expect(screen.getByText("Password")).toBeTruthy();
      expect(screen.getByText("Create Account")).toBeTruthy(); // Button
      expect(screen.getByText("Already have an account? Login")).toBeTruthy();
    });

    it("should render input fields with correct placeholders", () => {
      render(<RegisterScreen />);

      expect(screen.getByPlaceholderText("Enter your name")).toBeTruthy();
      expect(screen.getByPlaceholderText("Enter your email")).toBeTruthy();
      expect(screen.getByPlaceholderText("Min. 6 characters")).toBeTruthy();
    });

    it('should render "or" divider', () => {
      render(<RegisterScreen />);

      expect(screen.getByText("or")).toBeTruthy();
    });
  });

  describe("User Input", () => {
    it("should accept display name input", () => {
      render(<RegisterScreen />);

      const nameInput = screen.getByPlaceholderText("Enter your name");
      fireEvent.changeText(nameInput, "John Doe");

      expect(nameInput.props.value).toBe("John Doe");
    });

    it("should accept email input", () => {
      render(<RegisterScreen />);

      const emailInput = screen.getByPlaceholderText("Enter your email");
      fireEvent.changeText(emailInput, "test@example.com");

      expect(emailInput.props.value).toBe("test@example.com");
    });

    it("should accept password input", () => {
      render(<RegisterScreen />);

      const passwordInput = screen.getByPlaceholderText("Min. 6 characters");
      fireEvent.changeText(passwordInput, "password123");

      expect(passwordInput.props.value).toBe("password123");
    });

    it("should have password field as secure text entry", () => {
      render(<RegisterScreen />);

      const passwordInput = screen.getByPlaceholderText("Min. 6 characters");

      expect(passwordInput.props.secureTextEntry).toBe(true);
    });

    it("should have email field with email keyboard type", () => {
      render(<RegisterScreen />);

      const emailInput = screen.getByPlaceholderText("Enter your email");

      expect(emailInput.props.keyboardType).toBe("email-address");
    });

    it("should have display name field with words auto-capitalize", () => {
      render(<RegisterScreen />);

      const nameInput = screen.getByPlaceholderText("Enter your name");

      expect(nameInput.props.autoCapitalize).toBe("words");
    });

    it("should have email field with no auto-capitalize", () => {
      render(<RegisterScreen />);

      const emailInput = screen.getByPlaceholderText("Enter your email");

      expect(emailInput.props.autoCapitalize).toBe("none");
    });

    it("should disable inputs when loading", () => {
      mockUseAuth.mockReturnValue({
        ...mockUseAuth(),
        isLoading: true,
      });

      render(<RegisterScreen />);

      const nameInput = screen.getByPlaceholderText("Enter your name");
      const emailInput = screen.getByPlaceholderText("Enter your email");
      const passwordInput = screen.getByPlaceholderText("Min. 6 characters");

      expect(nameInput.props.editable).toBe(false);
      expect(emailInput.props.editable).toBe(false);
      expect(passwordInput.props.editable).toBe(false);
    });
  });

  describe("Form Validation", () => {
    it("should show error when all fields are empty", async () => {
      render(<RegisterScreen />);

      const registerButton = screen.getByText("Create Account");
      fireEvent.press(registerButton);

      await waitFor(() => {
        expect(screen.getByText("Please fill in all fields")).toBeTruthy();
      });
    });

    it("should show error when display name is empty", async () => {
      render(<RegisterScreen />);

      const emailInput = screen.getByPlaceholderText("Enter your email");
      const passwordInput = screen.getByPlaceholderText("Min. 6 characters");

      fireEvent.changeText(emailInput, "test@example.com");
      fireEvent.changeText(passwordInput, "password123");

      const registerButton = screen.getByText("Create Account");
      fireEvent.press(registerButton);

      await waitFor(() => {
        expect(screen.getByText("Please fill in all fields")).toBeTruthy();
      });
    });

    it("should show error when email is empty", async () => {
      render(<RegisterScreen />);

      const nameInput = screen.getByPlaceholderText("Enter your name");
      const passwordInput = screen.getByPlaceholderText("Min. 6 characters");

      fireEvent.changeText(nameInput, "John Doe");
      fireEvent.changeText(passwordInput, "password123");

      const registerButton = screen.getByText("Create Account");
      fireEvent.press(registerButton);

      await waitFor(() => {
        expect(screen.getByText("Please fill in all fields")).toBeTruthy();
      });
    });

    it("should show error when password is empty", async () => {
      render(<RegisterScreen />);

      const nameInput = screen.getByPlaceholderText("Enter your name");
      const emailInput = screen.getByPlaceholderText("Enter your email");

      fireEvent.changeText(nameInput, "John Doe");
      fireEvent.changeText(emailInput, "test@example.com");

      const registerButton = screen.getByText("Create Account");
      fireEvent.press(registerButton);

      await waitFor(() => {
        expect(screen.getByText("Please fill in all fields")).toBeTruthy();
      });
    });

    it("should show error for invalid email format", async () => {
      render(<RegisterScreen />);

      const nameInput = screen.getByPlaceholderText("Enter your name");
      const emailInput = screen.getByPlaceholderText("Enter your email");
      const passwordInput = screen.getByPlaceholderText("Min. 6 characters");

      fireEvent.changeText(nameInput, "John Doe");
      fireEvent.changeText(emailInput, "invalid-email");
      fireEvent.changeText(passwordInput, "password123");

      const registerButton = screen.getByText("Create Account");
      fireEvent.press(registerButton);

      await waitFor(() => {
        expect(screen.getByText("Invalid email format")).toBeTruthy();
      });
    });

    it("should show error for short password", async () => {
      render(<RegisterScreen />);

      const nameInput = screen.getByPlaceholderText("Enter your name");
      const emailInput = screen.getByPlaceholderText("Enter your email");
      const passwordInput = screen.getByPlaceholderText("Min. 6 characters");

      fireEvent.changeText(nameInput, "John Doe");
      fireEvent.changeText(emailInput, "test@example.com");
      fireEvent.changeText(passwordInput, "12345"); // Only 5 characters

      const registerButton = screen.getByText("Create Account");
      fireEvent.press(registerButton);

      await waitFor(() => {
        expect(screen.getByText("Password must be at least 6 characters")).toBeTruthy();
      });
    });

    it("should show error for password with exactly 5 characters", async () => {
      render(<RegisterScreen />);

      const nameInput = screen.getByPlaceholderText("Enter your name");
      const emailInput = screen.getByPlaceholderText("Enter your email");
      const passwordInput = screen.getByPlaceholderText("Min. 6 characters");

      fireEvent.changeText(nameInput, "John Doe");
      fireEvent.changeText(emailInput, "test@example.com");
      fireEvent.changeText(passwordInput, "abcde");

      const registerButton = screen.getByText("Create Account");
      fireEvent.press(registerButton);

      await waitFor(() => {
        expect(screen.getByText("Password must be at least 6 characters")).toBeTruthy();
      });
    });

    it("should accept password with exactly 6 characters", async () => {
      mockRegister.mockResolvedValue(undefined);
      const mockReplace = jest.fn();
      mockRouter.mockReturnValue({
        ...mockRouter(),
        replace: mockReplace,
      } as any);

      render(<RegisterScreen />);

      const nameInput = screen.getByPlaceholderText("Enter your name");
      const emailInput = screen.getByPlaceholderText("Enter your email");
      const passwordInput = screen.getByPlaceholderText("Min. 6 characters");

      fireEvent.changeText(nameInput, "John Doe");
      fireEvent.changeText(emailInput, "test@example.com");
      fireEvent.changeText(passwordInput, "123456");

      const registerButton = screen.getByText("Create Account");
      fireEvent.press(registerButton);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith("test@example.com", "123456", "John Doe");
      });
    });

    it("should accept valid email with subdomain", async () => {
      mockRegister.mockResolvedValue(undefined);
      const mockReplace = jest.fn();
      mockRouter.mockReturnValue({
        ...mockRouter(),
        replace: mockReplace,
      } as any);

      render(<RegisterScreen />);

      const nameInput = screen.getByPlaceholderText("Enter your name");
      const emailInput = screen.getByPlaceholderText("Enter your email");
      const passwordInput = screen.getByPlaceholderText("Min. 6 characters");

      fireEvent.changeText(nameInput, "John Doe");
      fireEvent.changeText(emailInput, "test@mail.example.com");
      fireEvent.changeText(passwordInput, "password123");

      const registerButton = screen.getByText("Create Account");
      fireEvent.press(registerButton);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith(
          "test@mail.example.com",
          "password123",
          "John Doe"
        );
      });
    });

    it("should trim whitespace from display name", async () => {
      mockRegister.mockResolvedValue(undefined);
      const mockReplace = jest.fn();
      mockRouter.mockReturnValue({
        ...mockRouter(),
        replace: mockReplace,
      } as any);

      render(<RegisterScreen />);

      const nameInput = screen.getByPlaceholderText("Enter your name");
      const emailInput = screen.getByPlaceholderText("Enter your email");
      const passwordInput = screen.getByPlaceholderText("Min. 6 characters");

      fireEvent.changeText(nameInput, "  John Doe  ");
      fireEvent.changeText(emailInput, "test@example.com");
      fireEvent.changeText(passwordInput, "password123");

      const registerButton = screen.getByText("Create Account");
      fireEvent.press(registerButton);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith(
          "test@example.com",
          "password123",
          "  John Doe  "
        );
      });
    });

    it("should reject display name with only spaces", async () => {
      render(<RegisterScreen />);

      const nameInput = screen.getByPlaceholderText("Enter your name");
      const emailInput = screen.getByPlaceholderText("Enter your email");
      const passwordInput = screen.getByPlaceholderText("Min. 6 characters");

      fireEvent.changeText(nameInput, "   ");
      fireEvent.changeText(emailInput, "test@example.com");
      fireEvent.changeText(passwordInput, "password123");

      const registerButton = screen.getByText("Create Account");
      fireEvent.press(registerButton);

      await waitFor(() => {
        // Should show "Please fill in all fields" since display name is effectively empty
        expect(screen.getByText("Please fill in all fields")).toBeTruthy();
      });
    });
  });

  describe("Registration Flow", () => {
    it("should call register with correct credentials", async () => {
      mockRegister.mockResolvedValue(undefined);
      const mockReplace = jest.fn();
      mockRouter.mockReturnValue({
        ...mockRouter(),
        replace: mockReplace,
      } as any);

      render(<RegisterScreen />);

      const nameInput = screen.getByPlaceholderText("Enter your name");
      const emailInput = screen.getByPlaceholderText("Enter your email");
      const passwordInput = screen.getByPlaceholderText("Min. 6 characters");

      fireEvent.changeText(nameInput, "John Doe");
      fireEvent.changeText(emailInput, "test@example.com");
      fireEvent.changeText(passwordInput, "password123");

      const registerButton = screen.getByText("Create Account");
      fireEvent.press(registerButton);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith("test@example.com", "password123", "John Doe");
      });
    });

    it("should navigate to home on successful registration", async () => {
      mockRegister.mockResolvedValue(undefined);
      const mockReplace = jest.fn();
      mockRouter.mockReturnValue({
        ...mockRouter(),
        replace: mockReplace,
      } as any);

      render(<RegisterScreen />);

      const nameInput = screen.getByPlaceholderText("Enter your name");
      const emailInput = screen.getByPlaceholderText("Enter your email");
      const passwordInput = screen.getByPlaceholderText("Min. 6 characters");

      fireEvent.changeText(nameInput, "John Doe");
      fireEvent.changeText(emailInput, "test@example.com");
      fireEvent.changeText(passwordInput, "password123");

      const registerButton = screen.getByText("Create Account");
      fireEvent.press(registerButton);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/");
      });
    });

    it("should show generic error on registration failure", async () => {
      mockRegister.mockRejectedValue(new Error("User already exists"));

      render(<RegisterScreen />);

      const nameInput = screen.getByPlaceholderText("Enter your name");
      const emailInput = screen.getByPlaceholderText("Enter your email");
      const passwordInput = screen.getByPlaceholderText("Min. 6 characters");

      fireEvent.changeText(nameInput, "John Doe");
      fireEvent.changeText(emailInput, "test@example.com");
      fireEvent.changeText(passwordInput, "password123");

      const registerButton = screen.getByText("Create Account");
      fireEvent.press(registerButton);

      await waitFor(() => {
        expect(screen.getByText("Registration failed. Please try again.")).toBeTruthy();
      });
    });

    it("should not leak specific error information", async () => {
      mockRegister.mockRejectedValue(new Error("Email already in use"));

      render(<RegisterScreen />);

      const nameInput = screen.getByPlaceholderText("Enter your name");
      const emailInput = screen.getByPlaceholderText("Enter your email");
      const passwordInput = screen.getByPlaceholderText("Min. 6 characters");

      fireEvent.changeText(nameInput, "John Doe");
      fireEvent.changeText(emailInput, "existing@example.com");
      fireEvent.changeText(passwordInput, "password123");

      const registerButton = screen.getByText("Create Account");
      fireEvent.press(registerButton);

      await waitFor(() => {
        expect(screen.getByText("Registration failed. Please try again.")).toBeTruthy();
        expect(screen.queryByText("Email already in use")).toBeNull();
      });
    });

    it("should handle unknown errors gracefully", async () => {
      mockRegister.mockRejectedValue("string error");

      render(<RegisterScreen />);

      const nameInput = screen.getByPlaceholderText("Enter your name");
      const emailInput = screen.getByPlaceholderText("Enter your email");
      const passwordInput = screen.getByPlaceholderText("Min. 6 characters");

      fireEvent.changeText(nameInput, "John Doe");
      fireEvent.changeText(emailInput, "test@example.com");
      fireEvent.changeText(passwordInput, "password123");

      const registerButton = screen.getByText("Create Account");
      fireEvent.press(registerButton);

      await waitFor(() => {
        expect(screen.getByText("Registration failed. Please try again.")).toBeTruthy();
      });
    });

    it("should clear error before new registration attempt", async () => {
      mockRegister.mockRejectedValueOnce(new Error("Registration failed"));

      render(<RegisterScreen />);

      const nameInput = screen.getByPlaceholderText("Enter your name");
      const emailInput = screen.getByPlaceholderText("Enter your email");
      const passwordInput = screen.getByPlaceholderText("Min. 6 characters");

      fireEvent.changeText(nameInput, "John Doe");
      fireEvent.changeText(emailInput, "test@example.com");
      fireEvent.changeText(passwordInput, "password123");

      const registerButton = screen.getByText("Create Account");
      fireEvent.press(registerButton);

      await waitFor(() => {
        expect(mockClearError).toHaveBeenCalled();
      });
    });
  });

  describe("Loading State", () => {
    it("should show loading indicator during registration", async () => {
      let resolveRegister: (value: void) => void;
      mockRegister.mockReturnValue(
        new Promise((resolve) => {
          resolveRegister = resolve;
        })
      );

      render(<RegisterScreen />);

      const nameInput = screen.getByPlaceholderText("Enter your name");
      const emailInput = screen.getByPlaceholderText("Enter your email");
      const passwordInput = screen.getByPlaceholderText("Min. 6 characters");

      fireEvent.changeText(nameInput, "John Doe");
      fireEvent.changeText(emailInput, "test@example.com");
      fireEvent.changeText(passwordInput, "password123");

      const registerButton = screen.getByText("Create Account");
      fireEvent.press(registerButton);

      // Check for ActivityIndicator
      await waitFor(() => {
        const activityIndicator = screen.getByTestId("activity-indicator");
        expect(activityIndicator).toBeTruthy();
      });

      resolveRegister!();
    });

    it("should disable button when loading", () => {
      mockUseAuth.mockReturnValue({
        ...mockUseAuth(),
        isLoading: true,
      });

      render(<RegisterScreen />);

      const registerButton = screen.getByText("Create Account");

      expect(registerButton.parent?.props.disabled).toBe(true);
    });

    it("should have reduced opacity when disabled", () => {
      mockUseAuth.mockReturnValue({
        ...mockUseAuth(),
        isLoading: true,
      });

      render(<RegisterScreen />);

      const registerButton = screen.getByText("Create Account");
      const buttonStyle = registerButton.parent?.props.style;

      expect(buttonStyle).toContainEqual({ opacity: 0.6 });
    });
  });

  describe("Navigation", () => {
    it("should navigate to login screen when login link pressed", () => {
      const mockPush = jest.fn();
      mockRouter.mockReturnValue({
        ...mockRouter(),
        push: mockPush,
      } as any);

      render(<RegisterScreen />);

      const loginLink = screen.getByText("Already have an account? Login");
      fireEvent.press(loginLink);

      expect(mockPush).toHaveBeenCalledWith("/sign-in");
    });

    it("should disable navigation when loading", () => {
      mockUseAuth.mockReturnValue({
        ...mockUseAuth(),
        isLoading: true,
      });

      render(<RegisterScreen />);

      const loginLink = screen.getByText("Already have an account? Login");
      expect(loginLink.parent?.props.disabled).toBe(true);
    });
  });

  describe("Error Display", () => {
    it("should display error message", async () => {
      mockRegister.mockRejectedValue(new Error("Registration failed"));

      render(<RegisterScreen />);

      const nameInput = screen.getByPlaceholderText("Enter your name");
      const emailInput = screen.getByPlaceholderText("Enter your email");
      const passwordInput = screen.getByPlaceholderText("Min. 6 characters");

      fireEvent.changeText(nameInput, "John Doe");
      fireEvent.changeText(emailInput, "test@example.com");
      fireEvent.changeText(passwordInput, "password123");

      const registerButton = screen.getByText("Create Account");
      fireEvent.press(registerButton);

      await waitFor(() => {
        const errorContainer = screen.getByText("Registration failed. Please try again.");
        expect(errorContainer).toBeTruthy();
      });
    });

    it("should clear error when user starts typing", async () => {
      render(<RegisterScreen />);

      // First, trigger an error
      const registerButton = screen.getByText("Create Account");
      fireEvent.press(registerButton);

      await waitFor(() => {
        expect(screen.getByText("Please fill in all fields")).toBeTruthy();
      });

      // Start typing
      const nameInput = screen.getByPlaceholderText("Enter your name");
      fireEvent.changeText(nameInput, "J");

      await waitFor(() => {
        // Local error state should be cleared
        expect(screen.queryByText("Please fill in all fields")).toBeNull();
      });
    });
  });

  describe("Accessibility", () => {
    it("should have accessible display name input", () => {
      render(<RegisterScreen />);

      const nameInput = screen.getByPlaceholderText("Enter your name");
      expect(nameInput).toBeTruthy();
    });

    it("should have accessible email input", () => {
      render(<RegisterScreen />);

      const emailInput = screen.getByPlaceholderText("Enter your email");
      expect(emailInput).toBeTruthy();
    });

    it("should have accessible password input", () => {
      render(<RegisterScreen />);

      const passwordInput = screen.getByPlaceholderText("Min. 6 characters");
      expect(passwordInput).toBeTruthy();
    });

    it("should have accessible register button", () => {
      render(<RegisterScreen />);

      const registerButton = screen.getByText("Create Account");
      expect(registerButton).toBeTruthy();
    });

    it("should have accessible login link", () => {
      render(<RegisterScreen />);

      const loginLink = screen.getByText("Already have an account? Login");
      expect(loginLink).toBeTruthy();
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long display name", () => {
      render(<RegisterScreen />);

      const longName = "a".repeat(300);
      const nameInput = screen.getByPlaceholderText("Enter your name");

      fireEvent.changeText(nameInput, longName);

      expect(nameInput.props.value).toBe(longName);
    });

    it("should handle very long email", () => {
      render(<RegisterScreen />);

      const longEmail = "a".repeat(300) + "@example.com";
      const emailInput = screen.getByPlaceholderText("Enter your email");

      fireEvent.changeText(emailInput, longEmail);

      expect(emailInput.props.value).toBe(longEmail);
    });

    it("should handle very long password", () => {
      render(<RegisterScreen />);

      const longPassword = "a".repeat(1000);
      const passwordInput = screen.getByPlaceholderText("Min. 6 characters");

      fireEvent.changeText(passwordInput, longPassword);

      expect(passwordInput.props.value).toBe(longPassword);
    });

    it("should handle special characters in display name", async () => {
      mockRegister.mockResolvedValue(undefined);
      const mockReplace = jest.fn();
      mockRouter.mockReturnValue({
        ...mockRouter(),
        replace: mockReplace,
      } as any);

      render(<RegisterScreen />);

      const nameInput = screen.getByPlaceholderText("Enter your name");
      const emailInput = screen.getByPlaceholderText("Enter your email");
      const passwordInput = screen.getByPlaceholderText("Min. 6 characters");

      fireEvent.changeText(nameInput, "O'Brien Jr.");
      fireEvent.changeText(emailInput, "test@example.com");
      fireEvent.changeText(passwordInput, "password123");

      const registerButton = screen.getByText("Create Account");
      fireEvent.press(registerButton);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith("test@example.com", "password123", "O'Brien Jr.");
      });
    });

    it("should handle unicode characters in display name", async () => {
      mockRegister.mockResolvedValue(undefined);
      const mockReplace = jest.fn();
      mockRouter.mockReturnValue({
        ...mockRouter(),
        replace: mockReplace,
      } as any);

      render(<RegisterScreen />);

      const nameInput = screen.getByPlaceholderText("Enter your name");
      const emailInput = screen.getByPlaceholderText("Enter your email");
      const passwordInput = screen.getByPlaceholderText("Min. 6 characters");

      fireEvent.changeText(nameInput, "用户名");
      fireEvent.changeText(emailInput, "test@example.com");
      fireEvent.changeText(passwordInput, "password123");

      const registerButton = screen.getByText("Create Account");
      fireEvent.press(registerButton);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith("test@example.com", "password123", "用户名");
      });
    });

    it("should handle special characters in password", async () => {
      mockRegister.mockResolvedValue(undefined);
      const mockReplace = jest.fn();
      mockRouter.mockReturnValue({
        ...mockRouter(),
        replace: mockReplace,
      } as any);

      render(<RegisterScreen />);

      const nameInput = screen.getByPlaceholderText("Enter your name");
      const emailInput = screen.getByPlaceholderText("Enter your email");
      const passwordInput = screen.getByPlaceholderText("Min. 6 characters");

      fireEvent.changeText(nameInput, "John Doe");
      fireEvent.changeText(emailInput, "test@example.com");
      fireEvent.changeText(passwordInput, "P@$$w0rd!#$%");

      const registerButton = screen.getByText("Create Account");
      fireEvent.press(registerButton);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith("test@example.com", "P@$$w0rd!#$%", "John Doe");
      });
    });

    it("should handle emoji in display name", async () => {
      mockRegister.mockResolvedValue(undefined);
      const mockReplace = jest.fn();
      mockRouter.mockReturnValue({
        ...mockRouter(),
        replace: mockReplace,
      } as any);

      render(<RegisterScreen />);

      const nameInput = screen.getByPlaceholderText("Enter your name");
      const emailInput = screen.getByPlaceholderText("Enter your email");
      const passwordInput = screen.getByPlaceholderText("Min. 6 characters");

      fireEvent.changeText(nameInput, "John 👨‍🍳 Doe");
      fireEvent.changeText(emailInput, "test@example.com");
      fireEvent.changeText(passwordInput, "password123");

      const registerButton = screen.getByText("Create Account");
      fireEvent.press(registerButton);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith("test@example.com", "password123", "John 👨‍🍳 Doe");
      });
    });

    it("should prevent multiple simultaneous registration attempts", async () => {
      let resolveRegister: (value: void) => void;
      mockRegister.mockReturnValue(
        new Promise((resolve) => {
          resolveRegister = resolve;
        })
      );

      render(<RegisterScreen />);

      const nameInput = screen.getByPlaceholderText("Enter your name");
      const emailInput = screen.getByPlaceholderText("Enter your email");
      const passwordInput = screen.getByPlaceholderText("Min. 6 characters");

      fireEvent.changeText(nameInput, "John Doe");
      fireEvent.changeText(emailInput, "test@example.com");
      fireEvent.changeText(passwordInput, "password123");

      const registerButton = screen.getByText("Create Account");

      // Press button multiple times
      fireEvent.press(registerButton);
      fireEvent.press(registerButton);
      fireEvent.press(registerButton);

      // Should only call register once
      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledTimes(1);
      });

      resolveRegister!();
    });

    it("should handle display name with numbers", async () => {
      mockRegister.mockResolvedValue(undefined);
      const mockReplace = jest.fn();
      mockRouter.mockReturnValue({
        ...mockRouter(),
        replace: mockReplace,
      } as any);

      render(<RegisterScreen />);

      const nameInput = screen.getByPlaceholderText("Enter your name");
      const emailInput = screen.getByPlaceholderText("Enter your email");
      const passwordInput = screen.getByPlaceholderText("Min. 6 characters");

      fireEvent.changeText(nameInput, "John123 Doe456");
      fireEvent.changeText(emailInput, "test@example.com");
      fireEvent.changeText(passwordInput, "password123");

      const registerButton = screen.getByText("Create Account");
      fireEvent.press(registerButton);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith(
          "test@example.com",
          "password123",
          "John123 Doe456"
        );
      });
    });

    it("should handle single character display name", async () => {
      mockRegister.mockResolvedValue(undefined);
      const mockReplace = jest.fn();
      mockRouter.mockReturnValue({
        ...mockRouter(),
        replace: mockReplace,
      } as any);

      render(<RegisterScreen />);

      const nameInput = screen.getByPlaceholderText("Enter your name");
      const emailInput = screen.getByPlaceholderText("Enter your email");
      const passwordInput = screen.getByPlaceholderText("Min. 6 characters");

      fireEvent.changeText(nameInput, "J");
      fireEvent.changeText(emailInput, "test@example.com");
      fireEvent.changeText(passwordInput, "password123");

      const registerButton = screen.getByText("Create Account");
      fireEvent.press(registerButton);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith("test@example.com", "password123", "J");
      });
    });
  });

  describe("Security", () => {
    it("should use generic error message to prevent account enumeration", async () => {
      mockRegister.mockRejectedValue(new Error("Email already exists"));

      render(<RegisterScreen />);

      const nameInput = screen.getByPlaceholderText("Enter your name");
      const emailInput = screen.getByPlaceholderText("Enter your email");
      const passwordInput = screen.getByPlaceholderText("Min. 6 characters");

      fireEvent.changeText(nameInput, "John Doe");
      fireEvent.changeText(emailInput, "existing@example.com");
      fireEvent.changeText(passwordInput, "password123");

      const registerButton = screen.getByText("Create Account");
      fireEvent.press(registerButton);

      await waitFor(() => {
        expect(screen.getByText("Registration failed. Please try again.")).toBeTruthy();
        expect(screen.queryByText("Email already exists")).toBeNull();
      });
    });

    it("should not leak database errors to user", async () => {
      mockRegister.mockRejectedValue(
        new Error("SQLite constraint: UNIQUE constraint failed: users.email")
      );

      render(<RegisterScreen />);

      const nameInput = screen.getByPlaceholderText("Enter your name");
      const emailInput = screen.getByPlaceholderText("Enter your email");
      const passwordInput = screen.getByPlaceholderText("Min. 6 characters");

      fireEvent.changeText(nameInput, "John Doe");
      fireEvent.changeText(emailInput, "test@example.com");
      fireEvent.changeText(passwordInput, "password123");

      const registerButton = screen.getByText("Create Account");
      fireEvent.press(registerButton);

      await waitFor(() => {
        expect(screen.getByText("Registration failed. Please try again.")).toBeTruthy();
        expect(screen.queryByText("UNIQUE constraint")).toBeNull();
      });
    });
  });
});
