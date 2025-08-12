import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import {
  AuthProvider,
  useAuth,
  ProtectedRoute,
  GuestOnlyRoute,
  SupabaseAuthStrategy,
} from "~/auth";

// Example usage of the Supabase authentication system
const SupabaseAuthDemo = () => {
  return (
    <AuthProvider strategy={new SupabaseAuthStrategy()} autoInitialize={true}>
      <SupabaseAuthScreen />
    </AuthProvider>
  );
};

const SupabaseAuthScreen = () => {
  const auth = useAuth();

  const handleEmailSignIn = async () => {
    try {
      const result = await auth.signInWithEmail({
        email: "test@example.com",
        password: "password123",
      });

      if (result.success) {
        Alert.alert("Success", "Signed in successfully!");
      } else {
        Alert.alert("Error", result.error?.message || "Sign in failed");
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred");
    }
  };

  const handleEmailSignUp = async () => {
    try {
      const result = await auth.signUpWithEmail({
        email: "newuser@example.com",
        password: "password123",
      });

      if (result.success) {
        if (result.session) {
          Alert.alert("Success", "Account created and signed in!");
        } else {
          Alert.alert(
            "Success",
            "Account created! Please check your email for confirmation."
          );
        }
      } else {
        Alert.alert("Error", result.error?.message || "Sign up failed");
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred");
    }
  };

  const handleAnonymousSignIn = async () => {
    try {
      const result = await auth.signInAnonymously();

      if (result.success) {
        Alert.alert("Success", "Signed in anonymously!");
      } else {
        Alert.alert(
          "Error",
          result.error?.message || "Anonymous sign in failed"
        );
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred");
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await auth.signInWithProvider({
        provider: "google",
        scopes: ["email", "profile"],
      });

      if (result.success) {
        Alert.alert(
          "Success",
          "OAuth flow initiated! Complete sign in in the browser."
        );
      } else {
        Alert.alert("Error", result.error?.message || "Google sign in failed");
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred");
    }
  };

  const handleLinkAccount = async () => {
    try {
      const result = await auth.linkAnonymousAccount({
        email: "linked@example.com",
        password: "linkpassword",
      });

      if (result.success) {
        Alert.alert("Success", "Account linked successfully!");
      } else {
        Alert.alert("Error", result.error?.message || "Account linking failed");
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred");
    }
  };

  const handleResetPassword = async () => {
    try {
      const result = await auth.resetPassword("test@example.com");

      if (result.success) {
        Alert.alert("Success", "Password reset email sent!");
      } else {
        Alert.alert("Error", result.error?.message || "Password reset failed");
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred");
    }
  };

  const handleSignOut = async () => {
    try {
      const result = await auth.signOut();

      if (result.success) {
        Alert.alert("Success", "Signed out successfully!");
      } else {
        Alert.alert(
          "Warning",
          "Signed out locally, but server sign out may have failed"
        );
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred");
    }
  };

  const handleRefreshSession = async () => {
    try {
      const result = await auth.refreshSession();

      if (result.success) {
        Alert.alert("Success", "Session refreshed successfully!");
      } else {
        Alert.alert("Error", result.error?.message || "Session refresh failed");
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred");
    }
  };

  if (!auth.isInitialized) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Initializing Supabase Auth...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Supabase Auth Demo</Text>

      {/* Auth State Display */}
      <View style={styles.stateContainer}>
        <Text style={styles.stateText}>State: {auth.authState}</Text>
        <Text style={styles.stateText}>User: {auth.user?.email || "None"}</Text>
        <Text style={styles.stateText}>
          Provider: {auth.user?.provider || "None"}
        </Text>
        <Text style={styles.stateText}>
          Anonymous: {auth.isAnonymous.toString()}
        </Text>
        <Text style={styles.stateText}>
          Can Link: {auth.canLinkAccount.toString()}
        </Text>
        <Text style={styles.stateText}>
          User ID: {auth.user?.id?.substring(0, 8) || "None"}...
        </Text>
        {auth.error && (
          <Text style={styles.errorText}>Error: {auth.error}</Text>
        )}
      </View>

      {/* Loading Indicator */}
      {auth.isLoading && <Text style={styles.loadingText}>Loading...</Text>}

      {/* Protected Content */}
      <ProtectedRoute fallback={<GuestContent />}>
        <AuthenticatedContent />
      </ProtectedRoute>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <GuestOnlyRoute>
          <TouchableOpacity style={styles.button} onPress={handleEmailSignIn}>
            <Text style={styles.buttonText}>Sign In with Email</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signUpButton}
            onPress={handleEmailSignUp}
          >
            <Text style={styles.buttonText}>Sign Up with Email</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={handleAnonymousSignIn}
          >
            <Text style={styles.buttonText}>Sign In Anonymously</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.socialButton}
            onPress={handleGoogleSignIn}
          >
            <Text style={styles.buttonText}>Sign In with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.utilityButton}
            onPress={handleResetPassword}
          >
            <Text style={styles.buttonText}>Reset Password</Text>
          </TouchableOpacity>
        </GuestOnlyRoute>

        <ProtectedRoute>
          {auth.canLinkAccount && (
            <TouchableOpacity
              style={styles.linkButton}
              onPress={handleLinkAccount}
            >
              <Text style={styles.buttonText}>Link Anonymous Account</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.utilityButton}
            onPress={handleRefreshSession}
          >
            <Text style={styles.buttonText}>Refresh Session</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <Text style={styles.buttonText}>Sign Out</Text>
          </TouchableOpacity>
        </ProtectedRoute>

        {auth.error && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={auth.clearError}
          >
            <Text style={styles.buttonText}>Clear Error</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const GuestContent = () => (
  <View style={styles.contentContainer}>
    <Text style={styles.contentTitle}>Welcome to Supabase Auth!</Text>
    <Text style={styles.contentText}>
      This demo shows real Supabase authentication integration. Sign up or sign
      in to test all features.
    </Text>
    <Text style={styles.noteText}>
      Note: Email confirmation may be required for new accounts depending on
      your Supabase configuration.
    </Text>
  </View>
);

const AuthenticatedContent = () => {
  const auth = useAuth();

  return (
    <View style={styles.contentContainer}>
      <Text style={styles.contentTitle}>
        🎉 Welcome, {auth.user?.name || auth.user?.email || "User"}!
      </Text>
      <Text style={styles.contentText}>
        You are successfully authenticated with Supabase! Your session is
        securely stored and automatically managed.
      </Text>

      {auth.isAnonymous && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>
            ⚠️ You're signed in anonymously. Consider linking your account with
            an email for better security and data persistence.
          </Text>
        </View>
      )}

      <View style={styles.userInfoContainer}>
        <Text style={styles.userInfoTitle}>User Information:</Text>
        <Text style={styles.userInfoText}>• ID: {auth.user?.id}</Text>
        <Text style={styles.userInfoText}>
          • Email: {auth.user?.email || "Not provided"}
        </Text>
        <Text style={styles.userInfoText}>
          • Name: {auth.user?.name || "Not provided"}
        </Text>
        <Text style={styles.userInfoText}>
          • Provider: {auth.user?.provider}
        </Text>
        <Text style={styles.userInfoText}>
          • Created: {auth.user?.createdAt.toLocaleDateString()}
        </Text>
        <Text style={styles.userInfoText}>
          • Last Sign In: {auth.user?.lastSignIn.toLocaleDateString()}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f8f9fa",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#2d3748",
  },
  stateContainer: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: "#4f46e5",
  },
  stateText: {
    fontSize: 14,
    marginBottom: 6,
    color: "#4a5568",
    fontFamily: "monospace",
  },
  errorText: {
    fontSize: 14,
    color: "#e53e3e",
    fontWeight: "600",
    marginTop: 8,
  },
  loadingText: {
    textAlign: "center",
    fontSize: 16,
    color: "#4f46e5",
    marginVertical: 12,
    fontWeight: "500",
  },
  contentContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  contentTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#2d3748",
  },
  contentText: {
    fontSize: 16,
    color: "#4a5568",
    lineHeight: 24,
    marginBottom: 12,
  },
  noteText: {
    fontSize: 14,
    color: "#718096",
    fontStyle: "italic",
    lineHeight: 20,
  },
  warningContainer: {
    backgroundColor: "#fef5e7",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#f6ad55",
  },
  warningText: {
    fontSize: 14,
    color: "#c05621",
    lineHeight: 20,
  },
  userInfoContainer: {
    backgroundColor: "#f7fafc",
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  userInfoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2d3748",
    marginBottom: 8,
  },
  userInfoText: {
    fontSize: 14,
    color: "#4a5568",
    marginBottom: 4,
    fontFamily: "monospace",
  },
  actionsContainer: {
    gap: 12,
  },
  button: {
    backgroundColor: "#4f46e5",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  signUpButton: {
    backgroundColor: "#059669",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  socialButton: {
    backgroundColor: "#dc2626",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  linkButton: {
    backgroundColor: "#7c3aed",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  utilityButton: {
    backgroundColor: "#0891b2",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  signOutButton: {
    backgroundColor: "#dc2626",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  clearButton: {
    backgroundColor: "#6b7280",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default SupabaseAuthDemo;
