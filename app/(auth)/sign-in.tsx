import React, { useState } from "react";
import { View, Pressable, Alert } from "react-native";
import { Link, router } from "expo-router";
import { Text } from "~/components/ui/text";
import { Button } from "~/components/ui/button";
import { AuthInput } from "~/components/auth";
import { useAuth } from "~/auth";
import { TEST_IDS } from "~/constants/test-ids";
import AuthScreenLayout, {
  validateEmail,
  validatePassword,
} from "~/components/auth/AuthScreenLayout";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const auth = useAuth();

  const validateForm = () => {
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    setEmailError(eErr);
    setPasswordError(pErr);
    return !eErr && !pErr;
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
    } catch {
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setIsLoading(false);
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
    } catch {
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthScreenLayout
      testID={TEST_IDS.auth.signInScreen}
      title="Welcome Back"
      subtitle="Sign in to your account to continue"
      isLoading={isLoading}
      socialAuthErrorTitle="Sign In Failed"
      footerPrompt="Don't have an account?"
      footerLinkText="Sign Up"
      footerLinkHref="/(auth)/sign-up"
      renderAfterSocial={({ socialLoading }) => (
        <Button
          testID={TEST_IDS.auth.guestButton}
          variant="ghost"
          onPress={handleGuestSignIn}
          disabled={isLoading || !!socialLoading}
          className="w-full"
        >
          <Text>Continue as Guest</Text>
        </Button>
      )}
    >
      {({ socialLoading }) => (
        <>
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
        </>
      )}
    </AuthScreenLayout>
  );
}
