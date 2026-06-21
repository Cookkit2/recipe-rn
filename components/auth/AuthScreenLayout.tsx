import React, { useState, type ReactNode } from "react";
import { View, Pressable, Alert, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { type Href, Link, router } from "expo-router";
import { Text } from "~/components/ui/text";
import { AuthContainer, AuthCard } from "~/components/auth/AuthCard";
import { SocialAuthButton } from "~/components/auth/SocialAuthButton";
import { useAuth } from "~/auth";

// ---------------------------------------------------------------------------
// Validation helpers (shared between sign-in and sign-up)
// ---------------------------------------------------------------------------

export function validateEmail(email: string): string {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) return "Email is required";
  if (!emailRegex.test(email)) return "Please enter a valid email address";
  return "";
}

export function validatePassword(password: string): string {
  if (!password) return "Password is required";
  if (password.length < 12) return "Password must be at least 12 characters";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
  if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter";
  if (!/\d/.test(password)) return "Password must contain at least one number";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must contain at least one special character";
  return "";
}

// ---------------------------------------------------------------------------
// Context passed to children render-prop so they can read socialLoading
// ---------------------------------------------------------------------------

export interface AuthScreenContext {
  socialLoading: string | null;
  handleSocialAuth: (provider: "google" | "apple") => Promise<void>;
}

// ---------------------------------------------------------------------------
// Layout component
// ---------------------------------------------------------------------------

export interface AuthScreenLayoutProps {
  /** testID for the outer AuthContainer */
  testID: string;
  /** AuthCard heading */
  title: string;
  /** AuthCard subtitle */
  subtitle: string;
  /** Parent form-loading flag — disables social buttons while the main form is submitting */
  isLoading: boolean;
  /** Title used in the Alert when social auth fails */
  socialAuthErrorTitle: string;
  /** Text shown before the footer link, e.g. "Don't have an account?" */
  footerPrompt: string;
  /** Text of the footer link, e.g. "Sign Up" */
  footerLinkText: string;
  /** expo-router href for the footer link */
  footerLinkHref: Href;
  /** Main form content rendered *before* the divider / social section */
  children: (ctx: AuthScreenContext) => ReactNode;
  /** Optional extra content rendered *after* the social buttons but before the footer link */
  renderAfterSocial?: (ctx: AuthScreenContext) => ReactNode;
}

export default function AuthScreenLayout({
  testID,
  title,
  subtitle,
  isLoading,
  socialAuthErrorTitle,
  footerPrompt,
  footerLinkText,
  footerLinkHref,
  children,
  renderAfterSocial,
}: AuthScreenLayoutProps) {
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const auth = useAuth();

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
        Alert.alert(socialAuthErrorTitle, result.error?.message || `${provider} sign in failed`);
      }
    } catch {
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setSocialLoading(null);
    }
  };

  const ctx: AuthScreenContext = { socialLoading, handleSocialAuth };
  const anyLoading = isLoading || !!socialLoading;

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
        <AuthContainer testID={testID}>
          <AuthCard title={title} subtitle={subtitle}>
            <View className="space-y-4">
              {/* Main form content */}
              {children(ctx)}

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
                  disabled={anyLoading}
                />

                {Platform.OS === "ios" && (
                  <SocialAuthButton
                    provider="apple"
                    onPress={() => handleSocialAuth("apple")}
                    loading={socialLoading === "apple"}
                    disabled={anyLoading}
                  />
                )}
              </View>

              {/* Optional extra after social */}
              {renderAfterSocial?.(ctx)}

              {/* Footer Link */}
              <View className="flex-row justify-center items-center space-x-2 pt-4">
                <Text className="text-sm text-muted-foreground">{footerPrompt}</Text>
                <Link href={footerLinkHref} asChild>
                  <Pressable accessibilityRole="link">
                    <Text className="text-sm text-primary font-medium">{footerLinkText}</Text>
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
