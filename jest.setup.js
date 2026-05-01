// Jest setup file for React Native

// Mock native modules that might not be available in test environment
global.__ADEXPERIMENTAL__ = true;

// Mock ActivityIndicator for testing
jest.mock('react-native/Libraries/Components/ActivityIndicator/ActivityIndicator', () => 'ActivityIndicator');
