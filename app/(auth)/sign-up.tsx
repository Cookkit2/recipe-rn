import React, { useState } from "react";
import { View, Alert } from "react-native";
import { router } from "expo-router";
import { Text } from "~/components/ui/text";
import { Button } from "~/components/ui/button";
import { AuthInput } from "~/components/auth";
import { useAuth } from "~/auth";
import { TEST_IDS } from "~/constants/test-ids";
import AuthScreenLayout, {
  validateEmail,
  validatePassword,
} from "~/components/auth/AuthScreenLayout";

export default function SignUpScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const auth = useAuth();

  const getPasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 12) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;
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
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    setEmailError(eErr);
    setPasswordError(pErr);

    let cpErr = "";
    if (!confirmPassword) {
      cpErr = "Please confirm your password";
    } else if (password !== confirmPassword) {
      cpErr = "Passwords do not match";
    }
    setConfirmPasswordError(cpErr);

    return !eErr && !pErr && !cpErr;
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
    } catch {
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(password);

  return (
    <AuthScreenLayout
      testID={TEST_IDS.auth.signUpScreen}
      title="Create Account"
      subtitle="Join us to start your cooking journey"
      isLoading={isLoading}
      socialAuthErrorTitle="Sign Up Failed"
      footerPrompt="Already have an account?"
      footerLinkText="Sign In"
      footerLinkHref="/(auth)/sign-in"
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

          {/* Password Input + Strength Indicator */}
          <View>
            <AuthInput
              testID={TEST_IDS.auth.passwordInput}
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
                    className={`text-xs font-medium ${getPasswordStrengthColor(passwordStrength)}`}
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
            testID={TEST_IDS.auth.confirmPasswordInput}
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
            testID={TEST_IDS.auth.signUpButton}
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
        </>
      )}
    </AuthScreenLayout>
  );
}
