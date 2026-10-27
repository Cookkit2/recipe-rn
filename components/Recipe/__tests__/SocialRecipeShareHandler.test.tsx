import React from "react";
import { act, render, waitFor } from "@testing-library/react-native";
import { AppState, Linking, type AppStateStatus } from "react-native";
import type { PendingRecipeShare, SharedRecipeInput } from "~/types/SharedRecipe";

let mockPayloads: { shareType: string; value: string }[] = [];
let mockPending: PendingRecipeShare | null = null;
let mockOnboarded = true;
let mockSegments: string[] = [];
let mockReady = true;
let nextId = 0;
const mockRouter = { push: jest.fn(), replace: jest.fn() };
const mockClear = jest.fn();
const mockGetPayloads = jest.fn(() => mockPayloads);
const mockInitialURL = jest.fn(async (): Promise<string | null> => null);
const mockNative = jest.fn((): object | null => ({}));
const mockToast = jest.fn();
const mockLoading = jest.fn();
const mockSave = jest.fn((input: SharedRecipeInput): PendingRecipeShare => {
  mockPending = { ...input, id: `share-${++nextId}` };
  return mockPending;
});
let mockNavigationChanged: (() => void) | undefined;
const mockNavigation = {
  isReady: () => mockReady,
  addListener: (_event: string, callback: () => void) => {
    mockNavigationChanged = callback;
    return jest.fn();
  },
};
jest.mock("react-native/Libraries/AppState/AppState", () => ({
  __esModule: true,
  default: { addEventListener: jest.fn() },
}));
jest.mock("react-native/Libraries/Linking/Linking", () => ({
  __esModule: true,
  default: { addEventListener: jest.fn(), getInitialURL: () => mockInitialURL() },
}));
jest.mock("expo", () => ({ requireOptionalNativeModule: () => mockNative() }));
jest.mock("~/utils/logger", () => ({ log: { debug: jest.fn(), warn: jest.fn() } }));
jest.mock("expo-sharing", () => ({
  getSharedPayloads: () => mockGetPayloads(),
  clearSharedPayloads: () => {
    mockClear();
    mockPayloads = [];
  },
}));
jest.mock("expo-router", () => ({
  useNavigationContainerRef: () => mockNavigation,
  useRootNavigationState: () => ({ key: "root" }),
  useRouter: () => mockRouter,
  useSegments: () => mockSegments,
}));
jest.mock("sonner-native", () => ({
  toast: {
    error: (...args: unknown[]) => mockToast(...args),
    loading: (...args: unknown[]) => mockLoading(...args),
  },
}));
jest.mock("~/data", () => ({ storage: { get: () => mockOnboarded } }));
jest.mock("~/lib/recipe-share-inbox", () => ({
  readPendingRecipeShare: () => mockPending,
  savePendingRecipeShare: (input: SharedRecipeInput) => mockSave(input),
}));
const mockClipboard = jest.fn();
jest.mock("../ClipboardRecipePrompt", () => ({
  __esModule: true,
  default: (props: unknown) => {
    mockClipboard(props);
    return null;
  },
}));
import SocialRecipeShareHandler from "../SocialRecipeShareHandler.native";
let active: ((value: AppStateStatus) => void) | undefined;
let link: ((event: { url: string }) => void) | undefined;
const caption = [{ shareType: "text", value: "Whisk 2 eggs and fry in 1 tsp oil." }];
const shareOnLaunch = (payloads = caption) => {
  mockInitialURL.mockResolvedValue("cookkit://expo-sharing");
  mockPayloads = payloads;
};
beforeEach(() => {
  jest.clearAllMocks();
  nextId = 0;
  mockPending = null;
  mockPayloads = [];
  mockOnboarded = true;
  mockReady = true;
  mockSegments = [];
  mockNative.mockReturnValue({
    getSharedPayloads: mockGetPayloads,
    clearSharedPayloads: mockClear,
  });
  mockGetPayloads.mockReset().mockImplementation(() => mockPayloads);
  mockClear.mockReset();
  mockInitialURL.mockResolvedValue(null);
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
const target = (id: string) => ({ pathname: "/recipes/import", params: { shareId: id } });
it("persists a cold-start share then immediately opens the recipe skeleton route without a loading toast", async () => {
  shareOnLaunch();
  await render(<SocialRecipeShareHandler />);
  await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith(target("share-1")));
  await act(async () => {
    active?.("active");
    link?.({ url: "cookkit://expo-sharing" });
  });
  expect(mockSave).toHaveBeenCalledTimes(1);
  expect(mockClear).toHaveBeenCalledTimes(1);
  expect(mockPending?.text).toBe(caption[0]?.value);
  expect(mockRouter.push).toHaveBeenCalledTimes(1);
  expect(mockLoading).not.toHaveBeenCalled();
});
it("keeps both the Instagram URL and shared caption", async () => {
  shareOnLaunch([
    { shareType: "url", value: "https://www.instagram.com/reel/Db18zFIR5k-/" },
    ...caption,
  ]);
  await render(<SocialRecipeShareHandler />);
  await waitFor(() =>
    expect(mockSave).toHaveBeenCalledWith({
      url: "https://www.instagram.com/reel/Db18zFIR5k-/",
      text: caption[0]?.value,
    })
  );
});
it("waits for navigator readiness", async () => {
  mockReady = false;
  shareOnLaunch();
  await render(<SocialRecipeShareHandler />);
  await waitFor(() => expect(mockClear).toHaveBeenCalled());
  expect(mockRouter.push).not.toHaveBeenCalled();
  mockReady = true;
  await act(async () => mockNavigationChanged?.());
  await waitFor(() => expect(mockRouter.push).toHaveBeenCalledTimes(1));
});
it("preserves a share through onboarding", async () => {
  mockOnboarded = false;
  shareOnLaunch();
  const screen = await render(<SocialRecipeShareHandler />);
  await waitFor(() => expect(mockClear).toHaveBeenCalled());
  expect(mockRouter.push).not.toHaveBeenCalled();
  mockOnboarded = true;
  mockSegments = ["home"];
  await screen.rerender(<SocialRecipeShareHandler />);
  await waitFor(() => expect(mockRouter.push).toHaveBeenCalledTimes(1));
});
it("replaces an obsolete import when another share arrives on the loading screen", async () => {
  shareOnLaunch();
  const screen = await render(<SocialRecipeShareHandler />);
  await waitFor(() => expect(mockRouter.push).toHaveBeenCalledTimes(1));
  mockSegments = ["recipes", "import"];
  await screen.rerender(<SocialRecipeShareHandler />);
  mockPayloads = caption;
  await act(async () => {
    active?.("active");
    link?.({ url: "cookkit://expo-sharing" });
  });
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith(target("share-2")));
});
it("routes a new native share once across Strict Mode replay", async () => {
  shareOnLaunch();
  await render(
    <React.StrictMode>
      <SocialRecipeShareHandler />
    </React.StrictMode>
  );
  await waitFor(() => expect(mockRouter.push).toHaveBeenCalledTimes(1));
});
it("keeps a retained failed share from reopening the importer on every ordinary launch", async () => {
  mockPending = { id: "old-failed-share", text: caption[0]?.value };
  const screen = await render(<SocialRecipeShareHandler />);
  await waitFor(() => expect(mockInitialURL).toHaveBeenCalled());
  await act(async () => active?.("active"));
  await screen.unmount();
  await render(<SocialRecipeShareHandler />);
  await waitFor(() => expect(mockInitialURL).toHaveBeenCalledTimes(2));
  expect(mockRouter.push).not.toHaveBeenCalled();
  expect(mockRouter.replace).not.toHaveBeenCalled();
  expect(mockPending?.id).toBe("old-failed-share");
});
it.each([null, "cookkit://preferences"])(
  "ignores leftover native data when the launch URL is not a share: %s",
  async (url) => {
    mockInitialURL.mockResolvedValue(url);
    mockPayloads = caption;
    await render(<SocialRecipeShareHandler />);
    await waitFor(() => expect(mockInitialURL).toHaveBeenCalled());
    await act(async () => active?.("active"));
    expect(mockSave).not.toHaveBeenCalled();
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(mockClear).not.toHaveBeenCalled();
  }
);
it("waits for a real share event when foreground arrives before the share link", async () => {
  await render(<SocialRecipeShareHandler />);
  mockPayloads = caption;
  await act(async () => active?.("active"));
  expect(mockRouter.push).not.toHaveBeenCalled();
  await act(async () => link?.({ url: "cookkit://expo-sharing" }));
  await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith(target("share-1")));
});
it("opens a fresh share after a normal launch with an older failed import retained", async () => {
  mockPending = { id: "old-failed-share", text: "Old failed recipe" };
  await render(<SocialRecipeShareHandler />);
  expect(mockRouter.push).not.toHaveBeenCalled();
  mockPayloads = caption;
  await act(async () => link?.({ url: "cookkit://expo-sharing" }));
  await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith(target("share-1")));
  expect(mockPending?.text).toBe(caption[0]?.value);
});
it("does not revive an old pending import from a share URL with an empty native inbox", async () => {
  mockPending = { id: "old-failed-share", text: "Old failed recipe" };
  mockInitialURL.mockResolvedValue("cookkit://expo-sharing");
  await render(<SocialRecipeShareHandler />);
  await waitFor(() => expect(mockGetPayloads).toHaveBeenCalled());
  expect(mockRouter.push).not.toHaveBeenCalled();
  expect(mockSave).not.toHaveBeenCalled();
});
it("does not resume a saved share after remounting when native cleanup failed", async () => {
  shareOnLaunch();
  mockClear.mockImplementation(() => {
    throw new Error("Native clear failed");
  });
  const screen = await render(<SocialRecipeShareHandler />);
  await waitFor(() => expect(mockRouter.push).toHaveBeenCalledTimes(1));
  await screen.unmount();
  mockRouter.push.mockClear();
  mockInitialURL.mockResolvedValue(null);
  await render(<SocialRecipeShareHandler />);
  await act(async () => active?.("active"));
  expect(mockRouter.push).not.toHaveBeenCalled();
  expect(mockSave).toHaveBeenCalledTimes(1);
});
it("does not import a different native payload during cleanup until its share event arrives", async () => {
  shareOnLaunch();
  mockClear.mockImplementation(() => {
    throw new Error("Native clear failed");
  });
  await render(<SocialRecipeShareHandler />);
  await waitFor(() => expect(mockRouter.push).toHaveBeenCalledTimes(1));
  mockPayloads = [{ shareType: "text", value: "Whisk 3 eggs and fry." }];
  await act(async () => active?.("active"));
  expect(mockSave).toHaveBeenCalledTimes(1);
  await act(async () => link?.({ url: "cookkit://expo-sharing" }));
  await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith(target("share-2")));
});
it("does not clear the OS payload when persistence fails", async () => {
  mockSave.mockImplementationOnce(() => {
    throw new Error("storage unavailable");
  });
  shareOnLaunch();
  await render(<SocialRecipeShareHandler />);
  await waitFor(() => expect(mockToast).toHaveBeenCalled());
  expect(mockClear).not.toHaveBeenCalled();
  await act(async () => active?.("active"));
  await waitFor(() => expect(mockRouter.push).toHaveBeenCalledTimes(1));
});
it("rejects unsupported attachments without opening a recipe", async () => {
  shareOnLaunch([{ shareType: "video", value: "file:///private/video.mp4" }]);
  await render(<SocialRecipeShareHandler />);
  await waitFor(() => expect(mockClear).toHaveBeenCalled());
  expect(mockRouter.push).not.toHaveBeenCalled();
});
it("allows older binaries to start without the native share module", async () => {
  mockNative.mockReturnValue(null);
  await render(<SocialRecipeShareHandler />);
  expect(AppState.addEventListener).toHaveBeenCalled();
});

it("does not show share errors for failed background probes with no incoming share", async () => {
  mockGetPayloads.mockImplementation(() => {
    throw new Error("Native inbox unavailable");
  });
  await render(<SocialRecipeShareHandler />);
  await act(async () => {
    active?.("active");
  });
  await act(async () => {
    active?.("active");
  });
  expect(mockToast).not.toHaveBeenCalled();
  expect(mockSave).not.toHaveBeenCalled();

  await act(async () => link?.({ url: "cookkit://expo-sharing" }));
  expect(mockToast).toHaveBeenCalledTimes(1);
  await act(async () => active?.("active"));
  expect(mockToast).toHaveBeenCalledTimes(1);
});

it("does not poll older native modules that only support outgoing sharing", async () => {
  mockNative.mockReturnValue({ shareAsync: jest.fn() });
  await render(<SocialRecipeShareHandler />);
  expect(mockGetPayloads).not.toHaveBeenCalled();
  expect(AppState.addEventListener).toHaveBeenCalled();
  expect(mockToast).not.toHaveBeenCalled();
});

it("reports a failed explicit cold-start share without repeating it on foreground", async () => {
  mockInitialURL.mockResolvedValue("cookkit://expo-sharing");
  mockGetPayloads.mockImplementation(() => {
    throw new Error("Native inbox unavailable");
  });
  await render(<SocialRecipeShareHandler />);
  await waitFor(() => expect(mockToast).toHaveBeenCalledTimes(1));
  await act(async () => active?.("active"));
  expect(mockToast).toHaveBeenCalledTimes(1);
});

it("keeps a saved share queued without a failure toast or duplicate import when native clearing fails", async () => {
  shareOnLaunch();
  mockClear.mockImplementation(() => {
    throw new Error("Native clear failed");
  });
  await render(<SocialRecipeShareHandler />);
  await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith(target("share-1")));
  // Native records can return equivalent fields in a different property order.
  mockPayloads = caption.map(({ shareType, value }) => ({ value, shareType }));
  await act(async () => active?.("active"));
  expect(mockSave).toHaveBeenCalledTimes(1);
  expect(mockRouter.push).toHaveBeenCalledTimes(1);
  expect(mockToast).not.toHaveBeenCalled();

  mockClear.mockImplementation(() => {});
  await act(async () => active?.("active"));
  expect(mockPayloads).toEqual([]);
  expect(mockSave).toHaveBeenCalledTimes(1);
});

it("reports a retained failed share once while allowing a later successful retry", async () => {
  shareOnLaunch();
  mockSave
    .mockImplementationOnce(() => {
      throw new Error("Storage unavailable");
    })
    .mockImplementationOnce(() => {
      throw new Error("Storage still unavailable");
    });
  await render(<SocialRecipeShareHandler />);
  await waitFor(() => expect(mockToast).toHaveBeenCalledTimes(1));
  await act(async () => active?.("active"));
  expect(mockToast).toHaveBeenCalledTimes(1);
  expect(mockClear).not.toHaveBeenCalled();
  await act(async () => active?.("active"));
  await waitFor(() => expect(mockRouter.push).toHaveBeenCalledTimes(1));
});

it("accepts an intentional repeat share after import finishes even when native cleanup failed", async () => {
  shareOnLaunch();
  mockClear.mockImplementation(() => {
    throw new Error("Native clear failed");
  });
  await render(<SocialRecipeShareHandler />);
  await waitFor(() => expect(mockRouter.push).toHaveBeenCalledTimes(1));
  mockPending = null;
  await act(async () => active?.("active"));
  expect(mockSave).toHaveBeenCalledTimes(1);
  await act(async () => link?.({ url: "cookkit://expo-sharing" }));
  await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith(target("share-2")));
  expect(mockToast).not.toHaveBeenCalled();
});

it("defers clipboard checks until startup and onboarding complete", async () => {
  mockOnboarded = false;
  const screen = await render(<SocialRecipeShareHandler />);
  await waitFor(() => expect(mockClipboard.mock.lastCall?.[0].revision).toBeGreaterThan(0));
  expect(mockClipboard.mock.lastCall?.[0].enabled).toBe(false);
  mockOnboarded = true;
  await screen.rerender(<SocialRecipeShareHandler />);
  expect(mockClipboard.mock.lastCall?.[0].enabled).toBe(true);
});
it("invalidates clipboard reads synchronously across rapid background/resume", async () => {
  await render(<SocialRecipeShareHandler />);
  await waitFor(() => expect(mockClipboard.mock.lastCall?.[0].enabled).toBe(true));
  const initial = mockClipboard.mock.lastCall?.[0];
  const version = initial.version();
  await act(async () => {
    active?.("background");
    active?.("active");
  });
  expect(initial.version()).toBeGreaterThan(version);
});
it("does not offer clipboard import over the manual YouTube screen", async () => {
  mockSegments = ["(misc)", "import-youtube"];
  await render(<SocialRecipeShareHandler />);
  await waitFor(() => expect(mockClipboard.mock.lastCall?.[0].revision).toBeGreaterThan(0));
  expect(mockClipboard.mock.lastCall?.[0].enabled).toBe(false);
});
it("does not restart a clipboard import when a permission dialog resumes the app", async () => {
  const screen = await render(<SocialRecipeShareHandler />);
  await waitFor(() => expect(mockClipboard.mock.lastCall?.[0].enabled).toBe(true));
  mockPending = { id: "clipboard-1", url: "https://youtu.be/abcdefghijk" };
  mockClipboard.mock.lastCall?.[0].onImportStarted?.("clipboard-1");
  mockSegments = ["recipes", "import"];
  await screen.rerender(<SocialRecipeShareHandler />);
  await act(async () => {
    active?.("inactive");
    active?.("active");
  });
  expect(mockRouter.replace).not.toHaveBeenCalled();
  expect(mockRouter.push).not.toHaveBeenCalled();
});

it("allows clipboard suggestions when a retained retry is not a new native share", async () => {
  mockPending = { id: "old-retry", url: "https://youtu.be/abcdefghijk" };
  await render(<SocialRecipeShareHandler />);
  await waitFor(() => expect(mockClipboard.mock.lastCall?.[0].enabled).toBe(true));
  expect(mockClipboard.mock.lastCall?.[0].hasPendingShare()).toBe(false);
  expect(mockRouter.push).not.toHaveBeenCalled();
});
