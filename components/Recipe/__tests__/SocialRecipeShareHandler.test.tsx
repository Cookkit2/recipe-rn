import React from "react";
import { act, render, waitFor } from "@testing-library/react-native";
import { AppState, Linking, type AppStateStatus } from "react-native";
import type { PendingRecipeShare, SharedRecipeInput } from "~/types/SharedRecipe";

let mockPayloads: { shareType: string; value: string }[] = [];
let mockPending: PendingRecipeShare | null = null;
let mockOnboarded = true;
let mockSegments: string[] = [];
let nextId = 0;
const mockRouter = { push: jest.fn(), setParams: jest.fn() };
const mockClear = jest.fn();
const mockNative = jest.fn((): object | null => ({}));
const mockToast = jest.fn();
let mockReady = true;
let mockNavigationChanged: (() => void) | undefined;
const mockNavigation = {
  isReady: () => mockReady,
  addListener: (_event: "state", callback: () => void) => {
    mockNavigationChanged = callback;
    return jest.fn();
  },
};
const save = (input: SharedRecipeInput): PendingRecipeShare => {
  mockPending = { ...input, id: `share-${++nextId}` };
  return mockPending;
};
const mockSave = jest.fn(save);

jest.mock("react-native/Libraries/AppState/AppState", () => ({
  __esModule: true,
  default: { addEventListener: jest.fn() },
}));
jest.mock("react-native/Libraries/Linking/Linking", () => ({
  __esModule: true,
  default: { addEventListener: jest.fn() },
}));

jest.mock("expo", () => ({ requireOptionalNativeModule: () => mockNative() }));
jest.mock("~/utils/logger", () => ({ log: { debug: jest.fn() } }));
jest.mock("expo-sharing", () => ({
  getSharedPayloads: () => mockPayloads,
  clearSharedPayloads: () => {
    mockPayloads = [];
    mockClear();
  },
}));
jest.mock("expo-router", () => ({
  useNavigationContainerRef: () => mockNavigation,
  useRootNavigationState: () => ({ key: "root" }),
  useRouter: () => mockRouter,
  useSegments: () => mockSegments,
}));
jest.mock("sonner-native", () => ({ toast: { error: (message: string) => mockToast(message) } }));
jest.mock("~/data", () => ({ storage: { get: () => mockOnboarded } }));
jest.mock("~/lib/recipe-share-inbox", () => ({
  readPendingRecipeShare: () => mockPending,
  savePendingRecipeShare: (input: SharedRecipeInput) => mockSave(input),
}));

import SocialRecipeShareHandler from "../SocialRecipeShareHandler.native";

let active: ((value: AppStateStatus) => void) | undefined;
let link: ((event: { url: string }) => void) | undefined;
const caption = [{ shareType: "text", value: "Whisk 2 eggs and fry in 1 tsp oil." }];

beforeEach(() => {
  jest.clearAllMocks();
  nextId = 0;
  mockPayloads = [];
  mockPending = null;
  mockOnboarded = true;
  mockSegments = [];
  mockReady = true;
  mockNavigationChanged = undefined;
  mockNative.mockReturnValue({});
  mockSave.mockImplementation(save);
  active = undefined;
  link = undefined;
  jest.spyOn(AppState, "addEventListener").mockImplementation((_event, callback) => {
    active = callback as typeof active;
    return { remove: jest.fn() };
  });
  jest.spyOn(Linking, "addEventListener").mockImplementation((_event, callback) => {
    link = callback;
    return { remove: jest.fn() };
  });
});
afterEach(() => jest.restoreAllMocks());

it("receives a cold-start share once even when both native wake-up events fire", async () => {
  mockPayloads = caption;
  await render(<SocialRecipeShareHandler />);
  await waitFor(() =>
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: "/import-recipe",
      params: { shareId: "share-1" },
    })
  );
  await act(async () => {
    active?.("active");
    link?.({ url: "cookkit://expo-sharing" });
  });
  expect(mockSave).toHaveBeenCalledTimes(1);
  expect(mockClear).toHaveBeenCalledTimes(1);
});

it("accepts the same caption again after a previous import was cancelled", async () => {
  mockPayloads = caption;
  await render(<SocialRecipeShareHandler />);
  await waitFor(() => expect(mockRouter.push).toHaveBeenCalledTimes(1));
  mockPending = null;
  mockPayloads = caption;
  await act(async () => active?.("active"));
  await waitFor(() => expect(mockRouter.push).toHaveBeenCalledTimes(2));
  expect(mockSave).toHaveBeenCalledTimes(2);
});

it("waits for the navigator to mount even when a cold-start root key already exists", async () => {
  mockReady = false;
  mockPayloads = caption;
  mockSegments = ["import-recipe"];
  await render(<SocialRecipeShareHandler />);
  await waitFor(() => expect(mockClear).toHaveBeenCalledTimes(1));
  expect(mockRouter.setParams).not.toHaveBeenCalled();
  mockReady = true;
  await act(async () => mockNavigationChanged?.());
  await waitFor(() => expect(mockRouter.setParams).toHaveBeenCalledWith({ shareId: "share-1" }));
});

it("persists a share through onboarding before opening the import screen", async () => {
  mockOnboarded = false;
  mockPayloads = caption;
  const screen = await render(<SocialRecipeShareHandler />);
  await waitFor(() => expect(mockClear).toHaveBeenCalledTimes(1));
  expect(mockRouter.push).not.toHaveBeenCalled();
  mockOnboarded = true;
  mockSegments = ["home"];
  await screen.rerender(<SocialRecipeShareHandler />);
  await waitFor(() => expect(mockRouter.push).toHaveBeenCalledTimes(1));
});

it("updates the current import screen for a new warm share without stacking another screen", async () => {
  mockSegments = ["import-recipe"];
  mockPayloads = caption;
  await render(<SocialRecipeShareHandler />);
  await waitFor(() => expect(mockRouter.setParams).toHaveBeenCalledWith({ shareId: "share-1" }));
  mockPayloads = [{ shareType: "text", value: "Boil 200g pasta and stir in pesto." }];
  await act(async () => link?.({ url: "cookkit://expo-sharing" }));
  await waitFor(() => expect(mockRouter.setParams).toHaveBeenCalledWith({ shareId: "share-2" }));
  expect(mockRouter.push).not.toHaveBeenCalled();
});

it("keeps native data available if persisting the share fails", async () => {
  mockPayloads = caption;
  mockSave.mockImplementationOnce(() => {
    throw new Error("storage unavailable");
  });
  await render(<SocialRecipeShareHandler />);
  await waitFor(() => expect(mockToast).toHaveBeenCalledTimes(1));
  expect(mockClear).not.toHaveBeenCalled();
  await act(async () => active?.("active"));
  await waitFor(() => expect(mockRouter.push).toHaveBeenCalledTimes(1));
});

it("rejects unsupported attachments without attempting extraction", async () => {
  mockPayloads = [{ shareType: "video", value: "file:///private/video.mp4" }];
  await render(<SocialRecipeShareHandler />);
  await waitFor(() => expect(mockClear).toHaveBeenCalledTimes(1));
  expect(mockSave).not.toHaveBeenCalled();
  expect(mockToast).toHaveBeenCalled();
});

it("allows older binaries to keep using manual paste without loading a missing module", async () => {
  mockNative.mockReturnValue(null);
  await render(<SocialRecipeShareHandler />);
  expect(mockSave).not.toHaveBeenCalled();
  expect(AppState.addEventListener).not.toHaveBeenCalled();
});
