import React, { useState } from "react";
import { View, Pressable, Alert, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Link, router } from "expo-router";
import { Text } from "~/components/ui/text";
import { Button } from "~/components/ui/button";
import { AuthContainer, AuthCard, AuthInput, SocialAuthButton } from "~/components/auth";
import { useAuth } from "~/auth";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SignUpScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  const auth = useAuth();
  const { bottom: pb } = useSafeAreaInsets();

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const getPasswordStrengthText = (strength: number) => {
    switch (strength) {
      case 0:
      case 1:
        return "Very Weak";
      case 2:
        return "Weak";
      case 3:
        return "Fair";
      case 4:
        return "Good";
      case 5:
        return "Strong";
      default:
        return "";
    }
  };

  const getPasswordStrengthColor = (strength: number) => {
    switch (strength) {
      case 0:
      case 1:
        return "text-red-500";
      case 2:
        return "text-orange-500";
      case 3:
        return "text-yellow-500";
      case 4:
        return "text-blue-500";
      case 5:
        return "text-green-500";
      default:
        return "text-gray-500";
    }
  };

  const validateForm = () => {
    let isValid = true;

    // Reset errors
    setEmailError("");
    setPasswordError("");
    setConfirmPasswordError("");

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError("Email is required");
      isValid = false;
    } else if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address");
      isValid = false;
    }

    // Password validation
    if (!password) {
      setPasswordError("Password is required");
      isValid = false;
    } else if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      isValid = false;
    } else if (getPasswordStrength(password) < 3) {
      setPasswordError("Password is too weak. Include uppercase, lowercase, numbers, and symbols");
      isValid = false;
    }

    // Confirm password validation
    if (!confirmPassword) {
      setConfirmPasswordError("Please confirm your password");
      isValid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
      isValid = false;
    }

    return isValid;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const result = await auth.signUpWithEmail({
        email: email.trim().toLowerCase(),
        password,
      });

      if (result.success) {
        if (result.session) {
          // User is immediately signed in
          router.replace("/");
        } else {
          // Email confirmation required
          Alert.alert(
            "Check Your Email",
            "We've sent you a confirmation link. Please check your email and click the link to activate your account.",
            [
              {
                text: "OK",
                onPress: () => router.replace("/(auth)/sign-in"),
              },
            ]
          );
        }
      } else {
        Alert.alert("Sign Up Failed", result.error?.message || "Please try again");
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
        Alert.alert("Sign Up Failed", result.error?.message || `${provider} sign up failed`);
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setSocialLoading(null);
    }
  };

  const passwordStrength = getPasswordStrength(password);

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
        <AuthContainer>
          <AuthCard title="Create Account" subtitle="Join us to start your cooking journey">
            <View className="space-y-4">
              {/* Email Input */}
              <AuthInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoComplete="email"
                error={emailError}
              />

              {/* Password Input */}
              <View>
                <AuthInput
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Create a password"
                  secureTextEntry
                  autoComplete="password-new"
                  error={passwordError}
                />
                {password.length > 0 && (
                  <View className="mt-2">
                    <View className="flex-row justify-between items-center">
                      <Text className="text-xs text-muted-foreground">Password strength:</Text>
                      <Text
                        className={`text-xs font-medium ${getPasswordStrengthColor(
                          passwordStrength
                        )}`}
                      >
                        {getPasswordStrengthText(passwordStrength)}
                      </Text>
                    </View>
                    <View className="flex-row space-x-1 mt-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <View
                          key={level}
                          className={`flex-1 h-1 rounded-full ${
                            level <= passwordStrength
                              ? level <= 2
                                ? "bg-red-500"
                                : level <= 3
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                              : "bg-gray-200"
                          }`}
                        />
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {/* Confirm Password Input */}
              <AuthInput
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm your password"
                secureTextEntry
                autoComplete="password-new"
                error={confirmPasswordError}
              />

              {/* Sign Up Button */}
              <Button
                onPress={handleSignUp}
                disabled={isLoading || !!socialLoading}
                className="w-full"
              >
                <Text>{isLoading ? "Creating Account..." : "Create Account"}</Text>
              </Button>

              {/* Terms Text */}
              <Text className="text-xs text-muted-foreground text-center leading-4">
                By creating an account, you agree to our{" "}
                <Text className="text-primary">Terms of Service</Text> and{" "}
                <Text className="text-primary">Privacy Policy</Text>
              </Text>

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

              {/* Sign In Link */}
              <View className="flex-row justify-center items-center space-x-2 pt-4">
                <Text className="text-sm text-muted-foreground">Already have an account?</Text>
                <Link href="/(auth)/sign-in" asChild>
                  <Pressable accessibilityRole="link">
                    <Text className="text-sm text-primary font-medium">Sign In</Text>
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
