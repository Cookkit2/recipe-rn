import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { AuthProvider, useAuth, ProtectedRoute, GuestOnlyRoute } from "~/auth";
import { MockAuthStrategy } from "~/auth/MockAuthStrategy";

// Example usage of the authentication system
const AuthDemo = () => {
  return (
    <AuthProvider
      strategy={new MockAuthStrategy({ delay: 500 })}
      autoInitialize={true}
    >
      <AuthScreen />
    </AuthProvider>
  );
};

const AuthScreen = () => {
  const auth = useAuth();

  const handleEmailSignIn = async () => {
    const result = await auth.signInWithEmail({
      email: "test@example.com",
      password: "password123",
    });
    console.log("Email sign in result:", result);
  };

  const handleAnonymousSignIn = async () => {
    const result = await auth.signInAnonymously();
    console.log("Anonymous sign in result:", result);
  };

  const handleSocialSignIn = async () => {
    const result = await auth.signInWithProvider({ provider: "google" });
    console.log("Social sign in result:", result);
  };

  const handleLinkAccount = async () => {
    const result = await auth.linkAnonymousAccount({
      email: "linked@example.com",
      password: "linkpassword",
    });
    console.log("Link account result:", result);
  };

  const handleSignOut = async () => {
    const result = await auth.signOut();
    console.log("Sign out result:", result);
  };

  if (!auth.isInitialized) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Initializing...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Auth Demo</Text>

      {/* Auth State Display */}
      <View style={styles.stateContainer}>
        <Text style={styles.stateText}>State: {auth.authState}</Text>
        <Text style={styles.stateText}>User: {auth.user?.email || "None"}</Text>
        <Text style={styles.stateText}>
          Anonymous: {auth.isAnonymous.toString()}
        </Text>
        <Text style={styles.stateText}>
          Can Link: {auth.canLinkAccount.toString()}
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
            style={styles.button}
            onPress={handleAnonymousSignIn}
          >
            <Text style={styles.buttonText}>Sign In Anonymously</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={handleSocialSignIn}>
            <Text style={styles.buttonText}>Sign In with Google</Text>
          </TouchableOpacity>
        </GuestOnlyRoute>

        <ProtectedRoute>
          {auth.canLinkAccount && (
            <TouchableOpacity style={styles.button} onPress={handleLinkAccount}>
              <Text style={styles.buttonText}>Link Account</Text>
            </TouchableOpacity>
          )}

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
    <Text style={styles.contentTitle}>Welcome, Guest!</Text>
    <Text style={styles.contentText}>
      Please sign in to access all features.
    </Text>
  </View>
);

const AuthenticatedContent = () => {
  const auth = useAuth();

  return (
    <View style={styles.contentContainer}>
      <Text style={styles.contentTitle}>
        Welcome, {auth.user?.name || auth.user?.email || "User"}!
      </Text>
      <Text style={styles.contentText}>
        You are now signed in and can access protected content.
      </Text>

      {auth.isAnonymous && (
        <Text style={styles.warningText}>
          You're signed in anonymously. Consider linking your account for better
          security.
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#333",
  },
  stateContainer: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  stateText: {
    fontSize: 14,
    marginBottom: 5,
    color: "#666",
  },
  errorText: {
    fontSize: 14,
    color: "#e74c3c",
    fontWeight: "500",
  },
  loadingText: {
    textAlign: "center",
    fontSize: 16,
    color: "#3498db",
    marginVertical: 10,
  },
  contentContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  contentTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  contentText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  warningText: {
    fontSize: 14,
    color: "#f39c12",
    marginTop: 10,
    fontStyle: "italic",
  },
  actionsContainer: {
    gap: 10,
  },
  button: {
    backgroundColor: "#3498db",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  signOutButton: {
    backgroundColor: "#e74c3c",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  clearButton: {
    backgroundColor: "#95a5a6",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
});

export default AuthDemo;
