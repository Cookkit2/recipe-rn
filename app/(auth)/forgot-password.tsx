import React, { useState } from "react";
import { View, Pressable, Alert, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Link, router } from "expo-router";
import { Text } from "~/components/ui/text";
import { Button } from "~/components/ui/button";
import { AuthContainer, AuthCard, AuthInput } from "~/components/auth";
import { useAuth } from "~/auth";
import { ArrowLeftIcon } from "lucide-uniwind";
import { TEST_IDS } from "~/constants/test-ids";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const auth = useAuth();

  const validateEmail = () => {
    setEmailError("");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError("Email is required");
      return false;
    } else if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address");
      return false;
    }
    return true;
  };

  const handleResetPassword = async () => {
    if (!validateEmail()) return;

    setIsLoading(true);
    try {
      const result = await auth.resetPassword(email.trim().toLowerCase());

      if (result.success) {
        setEmailSent(true);
      } else {
        Alert.alert(
          "Reset Failed",
          result.error?.message || "Failed to send reset email. Please try again."
        );
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToSignIn = () => {
    router.back();
  };

  if (emailSent) {
    return (
      <AuthContainer testID={TEST_IDS.auth.forgotPasswordScreen}>
        <AuthCard title="Check Your Email" subtitle="We've sent you a password reset link">
          <View className="space-y-6">
            {/* Success Icon */}
            <View className="items-center">
              <View className="w-16 h-16 bg-green-100 rounded-full items-center justify-center mb-4">
                <Text className="text-2xl">✓</Text>
              </View>
            </View>

            {/* Success Message */}
            <View className="space-y-3">
              <Text className="text-center text-muted-foreground">
                We've sent a password reset link to:
              </Text>
              <Text className="text-center font-medium text-foreground">{email}</Text>
              <Text className="text-center text-sm text-muted-foreground">
                Click the link in your email to reset your password. If you don't see it, check your
                spam folder.
              </Text>
            </View>

            {/* Actions */}
            <View className="space-y-3">
              <Button
                onPress={() => handleResetPassword()}
                variant="outline"
                disabled={isLoading}
                className="w-full"
              >
                <Text>Resend Email</Text>
              </Button>

              <Button onPress={handleBackToSignIn} variant="ghost" className="w-full">
                <Text>Back to Sign In</Text>
              </Button>
            </View>
          </View>
        </AuthCard>
      </AuthContainer>
    );
  }

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
        <AuthContainer testID={TEST_IDS.auth.forgotPasswordScreen}>
          <AuthCard title="Reset Password" subtitle="Enter your email to receive a reset link">
            <View className="space-y-6">
              {/* Back Button */}
              <Pressable
                onPress={handleBackToSignIn}
                className="flex-row items-center space-x-2 -mt-2"
                accessibilityRole="button"
                accessibilityLabel="Back to Sign In"
              >
                <ArrowLeftIcon size={16} className="text-muted-foreground" />
                <Text className="text-sm text-muted-foreground">Back to Sign In</Text>
              </Pressable>

              {/* Email Input */}
              <AuthInput
                testID={TEST_IDS.auth.emailInput}
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoComplete="email"
                error={emailError}
              />

              {/* Instructions */}
              <View className="bg-muted/50 p-4 rounded-lg">
                <Text className="text-sm text-muted-foreground leading-5">
                  We'll send you a secure link to reset your password. The link will expire in 24
                  hours for your security.
                </Text>
              </View>

              {/* Reset Button */}
              <Button
                testID={TEST_IDS.auth.resetPasswordButton}
                onPress={handleResetPassword}
                disabled={isLoading}
                className="w-full"
              >
                <Text>{isLoading ? "Sending..." : "Send Reset Link"}</Text>
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
