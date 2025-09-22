import { BaseAuthStrategy } from "./AuthStrategy";
import type {
  User,
  AuthResult,
  SignInCredentials,
  SocialAuthConfig,
  LinkAccountCredentials,
  AuthSession,
} from "~/types/AuthTypes";

/**
 * Mock authentication strategy for testing and development
 * Simulates authentication flows without external dependencies
 */
export class MockAuthStrategy extends BaseAuthStrategy {
  private currentUser: User | null = null;
  private currentSession: AuthSession | null = null;
  private users: Map<string, { user: User; password: string }> = new Map();
  private delay: number = 500; // Simulate network delay

  constructor(
    options: {
      delay?: number;
      preloadUsers?: Array<{ email: string; password: string }>;
    } = {}
  ) {
    super();
    this.delay = options.delay ?? 500;

    // Preload some test users
    const defaultUsers = [
      { email: "test@example.com", password: "password123" },
      { email: "user@example.com", password: "password456" },
      ...(options.preloadUsers || []),
    ];

    defaultUsers.forEach((userData) => {
      const user: User = {
        id: `mock-${userData.email}`,
        email: userData.email,
        name: userData.email.split("@")[0],
        isAnonymous: false,
        provider: "email",
        createdAt: new Date(),
        lastSignIn: new Date(),
      };
      this.users.set(userData.email, { user, password: userData.password });
    });
  }

  private async simulateDelay(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, this.delay));
  }

  private createSession(user: User): AuthSession {
    return {
      accessToken: `mock-token-${user.id}-${Date.now()}`,
      refreshToken: `mock-refresh-${user.id}-${Date.now()}`,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      tokenType: "Bearer",
    };
  }

  async getCurrentUser(): Promise<User | null> {
    await this.simulateDelay();
    return this.currentUser;
  }

  async getCurrentSession(): Promise<AuthSession | null> {
    await this.simulateDelay();
    return this.currentSession;
  }

  async signInWithEmail(credentials: SignInCredentials): Promise<AuthResult> {
    await this.simulateDelay();

    const userData = this.users.get(credentials.email);
    if (!userData) {
      return this.createErrorResult(
        "INVALID_CREDENTIALS",
        "No user found with this email address",
        false
      );
    }

    if (userData.password !== credentials.password) {
      return this.createErrorResult(
        "INVALID_CREDENTIALS",
        "Invalid password",
        true
      );
    }

    // Update last sign in
    userData.user.lastSignIn = new Date();
    this.currentUser = userData.user;
    this.currentSession = this.createSession(userData.user);

    // Notify listeners
    this.notifyListeners(this.currentUser);

    return this.createSuccessResult(this.currentUser, this.currentSession);
  }

  async signInWithProvider(config: SocialAuthConfig): Promise<AuthResult> {
    await this.simulateDelay();

    // Simulate successful social login
    const user: User = {
      id: `mock-${config.provider}-${Date.now()}`,
      email: `user@${config.provider}.com`,
      name: `${config.provider} User`,
      avatar: `https://via.placeholder.com/100?text=${config.provider.toUpperCase()}`,
      isAnonymous: false,
      provider: config.provider,
      metadata: {
        provider: config.provider,
        mockData: true,
      },
      createdAt: new Date(),
      lastSignIn: new Date(),
    };

    this.currentUser = user;
    this.currentSession = this.createSession(user);

    // Notify listeners
    this.notifyListeners(this.currentUser);

    return this.createSuccessResult(this.currentUser, this.currentSession);
  }

  async signInAnonymously(): Promise<AuthResult> {
    await this.simulateDelay();

    const user: User = {
      id: `mock-anonymous-${Date.now()}`,
      isAnonymous: true,
      provider: "anonymous",
      createdAt: new Date(),
      lastSignIn: new Date(),
    };

    this.currentUser = user;
    this.currentSession = this.createSession(user);

    // Notify listeners
    this.notifyListeners(this.currentUser);

    return this.createSuccessResult(this.currentUser, this.currentSession);
  }

  async signUpWithEmail(credentials: SignInCredentials): Promise<AuthResult> {
    await this.simulateDelay();

    if (this.users.has(credentials.email)) {
      return this.createErrorResult(
        "EMAIL_ALREADY_EXISTS",
        "An account with this email already exists",
        false
      );
    }

    // Create new user
    const user: User = {
      id: `mock-${credentials.email}-${Date.now()}`,
      email: credentials.email,
      name: credentials.email.split("@")[0],
      isAnonymous: false,
      provider: "email",
      createdAt: new Date(),
      lastSignIn: new Date(),
    };

    // Store user
    this.users.set(credentials.email, { user, password: credentials.password });
    this.currentUser = user;
    this.currentSession = this.createSession(user);

    // Notify listeners
    this.notifyListeners(this.currentUser);

    return this.createSuccessResult(this.currentUser, this.currentSession);
  }

  async signOut(): Promise<AuthResult> {
    await this.simulateDelay();

    this.currentUser = null;
    this.currentSession = null;

    // Notify listeners
    this.notifyListeners(null);

    return { success: true };
  }

  async refreshSession(): Promise<AuthResult> {
    await this.simulateDelay();

    if (!this.currentUser || !this.currentSession) {
      return this.createErrorResult(
        "NO_SESSION",
        "No active session to refresh",
        false
      );
    }

    // Create new session
    this.currentSession = this.createSession(this.currentUser);

    return this.createSuccessResult(this.currentUser, this.currentSession);
  }

  async linkAnonymousAccount(
    credentials: LinkAccountCredentials
  ): Promise<AuthResult> {
    await this.simulateDelay();

    if (!this.currentUser || !this.currentUser.isAnonymous) {
      return this.createErrorResult(
        "NOT_ANONYMOUS",
        "Current user is not anonymous",
        false
      );
    }

    if (this.users.has(credentials.email)) {
      return this.createErrorResult(
        "EMAIL_ALREADY_EXISTS",
        "An account with this email already exists",
        false
      );
    }

    // Convert anonymous user to permanent user
    const linkedUser: User = {
      ...this.currentUser,
      email: credentials.email,
      name: credentials.email.split("@")[0],
      isAnonymous: false,
      provider: "email",
      lastSignIn: new Date(),
    };

    // Store the linked user
    this.users.set(credentials.email, {
      user: linkedUser,
      password: credentials.password,
    });
    this.currentUser = linkedUser;
    this.currentSession = this.createSession(linkedUser);

    // Notify listeners
    this.notifyListeners(this.currentUser);

    return this.createSuccessResult(this.currentUser, this.currentSession);
  }

  async resetPassword(email: string): Promise<AuthResult> {
    await this.simulateDelay();

    if (!this.users.has(email)) {
      // Don't reveal if email exists or not for security
      return { success: true };
    }

    // In a real implementation, this would send a reset email
    console.log(`Mock: Password reset email sent to ${email}`);

    return { success: true };
  }

  async validateSession(): Promise<boolean> {
    await this.simulateDelay();

    if (!this.currentSession) {
      return false;
    }

    // Check if session is expired
    return this.currentSession.expiresAt > new Date();
  }

  getProviderInfo() {
    return {
      name: "MockAuthStrategy",
      version: "1.0.0",
      features: ["email", "social", "anonymous", "linking", "refresh"],
    };
  }

  // Test utility methods
  public getStoredUsers() {
    return Array.from(this.users.entries()).map(([email, data]) => ({
      email,
      user: data.user,
    }));
  }

  public clearStoredUsers() {
    this.users.clear();
  }

  public addTestUser(
    email: string,
    password: string,
    userData?: Partial<User>
  ) {
    const user: User = {
      id: `mock-${email}`,
      email,
      name: email.split("@")[0],
      isAnonymous: false,
      provider: "email",
      createdAt: new Date(),
      lastSignIn: new Date(),
      ...userData,
    };
    this.users.set(email, { user, password });
  }
}
