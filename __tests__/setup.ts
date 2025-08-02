// Test setup file for storage tests

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Mock __DEV__ global
global.__DEV__ = true;

// Mock require for asset imports
jest.mock(
  "~/assets/images/banana.png",
  () => ({
    default: "mocked-banana-image",
  }),
  { virtual: true }
);

// Mock AsyncStorage
jest.mock(
  "@react-native-async-storage/async-storage",
  () => ({
    default: {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
      getAllKeys: jest.fn(),
      multiGet: jest.fn(),
      multiSet: jest.fn(),
      multiRemove: jest.fn(),
    },
  }),
  { virtual: true }
);

// Global test utilities
export const createMockPantryItem = (overrides = {}) => ({
  id: 1,
  name: "Test Item",
  quantity: "1",
  category: "test",
  type: "fridge" as const,
  image_url: "test",
  x: 0,
  y: 0,
  scale: 1,
  created_at: new Date("2024-01-01"),
  updated_at: new Date("2024-01-01"),
  steps_to_store: [],
  ...overrides,
});

export const createMockRecipeItem = (overrides = {}) => ({
  id: "recipe-1",
  title: "Test Recipe",
  imageUrl: "test.jpg",
  recipeId: "recipe-123",
  x: 0,
  y: 0,
  scale: 1,
  created_at: new Date("2024-01-01"),
  updated_at: new Date("2024-01-01"),
  ...overrides,
});

// Helper for clearing all mocks
export const clearAllMocks = () => {
  jest.clearAllMocks();
};
