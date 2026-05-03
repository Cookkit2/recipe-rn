import React, { useState } from "react";
import { View, Pressable, Alert, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Link, router } from "expo-router";
import { Text } from "~/components/ui/text";
import { Button } from "~/components/ui/button";
import { AuthContainer, AuthCard, AuthInput, SocialAuthButton } from "~/components/auth";
import { useAuth } from "~/auth";
import { TEST_IDS } from "~/constants/test-ids";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  const auth = useAuth();

  const validateForm = () => {
    let isValid = true;

    // Reset errors
    setEmailError("");
    setPasswordError("");

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError("Email is required");
      isValid = false;
    } else if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address");
      isValid = false;
    }

    // Password validation - strong password requirements
    if (!password) {
      setPasswordError("Password is required");
      isValid = false;
    } else if (password.length < 12) {
      setPasswordError("Password must be at least 12 characters");
      isValid = false;
    } else if (!/[A-Z]/.test(password)) {
      setPasswordError("Password must contain at least one uppercase letter");
      isValid = false;
    } else if (!/[a-z]/.test(password)) {
      setPasswordError("Password must contain at least one lowercase letter");
      isValid = false;
    } else if (!/\d/.test(password)) {
      setPasswordError("Password must contain at least one number");
      isValid = false;
    } else if (!/[^A-Za-z0-9]/.test(password)) {
      setPasswordError("Password must contain at least one special character");
      isValid = false;
    }

    return isValid;
  };

  const handleSignIn = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const result = await auth.signInWithEmail({
        email: email.trim().toLowerCase(),
        password,
      });

      if (result.success) {
        router.replace("/");
      } else {
        Alert.alert("Sign In Failed", result.error?.message || "Please try again");
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialAuth = async (provider: "google" | "apple") => {
    setSocialLoading(provider);
    try {
      const result = await auth.signInWithProvider({
        provider,
        scopes: provider === "google" ? ["email", "profile"] : undefined,
      });

      if (result.success) {
        router.replace("/");
      } else {
        Alert.alert("Sign In Failed", result.error?.message || `${provider} sign in failed`);
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setSocialLoading(null);
    }
  };

  const handleGuestSignIn = async () => {
    setIsLoading(true);
    try {
      const result = await auth.signInAnonymously();

      if (result.success) {
        router.replace("/");
      } else {
        Alert.alert("Error", result.error?.message || "Guest sign in failed");
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AuthContainer testID={TEST_IDS.auth.signInScreen}>
          <AuthCard title="Welcome Back" subtitle="Sign in to your account to continue">
            <View className="space-y-4">
              {/* Email Input */}
              <AuthInput
                testID={TEST_IDS.auth.emailInput}
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoComplete="email"
                error={emailError}
              />

              {/* Password Input */}
              <AuthInput
                testID={TEST_IDS.auth.passwordInput}
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry
                autoComplete="password"
                error={passwordError}
              />

              {/* Forgot Password Link */}
              <View className="items-end">
                <Link href="/(auth)/forgot-password" asChild>
                  <Pressable testID={TEST_IDS.auth.forgotPasswordLink} accessibilityRole="link">
                    <Text className="text-sm text-primary font-medium">Forgot password?</Text>
                  </Pressable>
                </Link>
              </View>

              {/* Sign In Button */}
              <Button
                testID={TEST_IDS.auth.signInButton}
                onPress={handleSignIn}
                disabled={isLoading || !!socialLoading}
                className="w-full"
              >
                <Text>{isLoading ? "Signing In..." : "Sign In"}</Text>
              </Button>

              {/* Divider */}
              <View className="flex-row items-center space-x-4 my-2">
                <View className="flex-1 h-px bg-border" />
                <Text className="text-sm text-muted-foreground">or</Text>
                <View className="flex-1 h-px bg-border" />
              </View>

              {/* Social Auth Buttons */}
              <View className="space-y-3">
                <SocialAuthButton
                  provider="google"
                  onPress={() => handleSocialAuth("google")}
                  loading={socialLoading === "google"}
                  disabled={isLoading || !!socialLoading}
                />

                {Platform.OS === "ios" && (
                  <SocialAuthButton
                    provider="apple"
                    onPress={() => handleSocialAuth("apple")}
                    loading={socialLoading === "apple"}
                    disabled={isLoading || !!socialLoading}
                  />
                )}
              </View>

              {/* Guest Sign In */}
              <Button
                testID={TEST_IDS.auth.guestButton}
                variant="ghost"
                onPress={handleGuestSignIn}
                disabled={isLoading || !!socialLoading}
                className="w-full"
              >
                <Text>Continue as Guest</Text>
              </Button>

              {/* Sign Up Link */}
              <View className="flex-row justify-center items-center space-x-2 pt-4">
                <Text className="text-sm text-muted-foreground">Don't have an account?</Text>
                <Link href="/(auth)/sign-up" asChild>
                  <Pressable accessibilityRole="link">
                    <Text className="text-sm text-primary font-medium">Sign Up</Text>
                  </Pressable>
                </Link>
              </View>
            </View>
          </AuthCard>
        </AuthContainer>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
