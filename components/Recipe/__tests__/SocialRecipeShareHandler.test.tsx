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
const mockLoading = jest.fn();
const mockDismiss = jest.fn();
const mockRecovery = jest.fn(
  (_props: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialInput: SharedRecipeInput;
  }) => null
);
type ImportResult = {
  success: boolean;
  recipe?: { id: string };
  error?: string;
  kind?: string;
  draft?: unknown;
};
const mockImport = jest.fn(async (_input: SharedRecipeInput): Promise<ImportResult> => ({
  success: true,
  recipe: { id: "recipe-1" },
}));
const mockConsume = jest.fn((id: string) => {
  if (mockPending?.id === id) mockPending = null;
});
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
jest.mock("sonner-native", () => ({
  toast: {
    error: (...args: unknown[]) => mockToast(...args),
    loading: (...args: unknown[]) => mockLoading(...args),
    dismiss: (...args: unknown[]) => mockDismiss(...args),
  },
}));
const mockReview = jest.fn((_props: any) => null);
const mockSaveDraft = jest.fn(async (_draft: unknown) => ({
  success: true,
  recipe: { id: "reviewed" },
}));
jest.mock("../RecipeImportReview", () => ({
  __esModule: true,
  default: (props: any) => mockReview(props),
}));
const mockPrepare = async (input: SharedRecipeInput) => {
  const result = await mockImport(input);
  return result.kind ? result : { kind: "saved", result };
};
jest.mock("~/hooks/queries/useRecipeImportPreview", () => ({
  useRecipeImportPreview: () => ({ prepare: mockPrepare, save: mockSaveDraft, isPending: false }),
}));
jest.mock("~/components/Pantry/ImportRecipeDialog", () => ({
  __esModule: true,
  default: (props: Parameters<typeof mockRecovery>[0]) => mockRecovery(props),
}));
jest.mock("~/data", () => ({ storage: { get: () => mockOnboarded } }));
jest.mock("~/lib/recipe-share-inbox", () => ({
  readPendingRecipeShare: () => mockPending,
  savePendingRecipeShare: (input: SharedRecipeInput) => mockSave(input),
  clearPendingRecipeShare: (id: string) => mockConsume(id),
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
  mockImport.mockResolvedValue({ success: true, recipe: { id: "recipe-1" } });
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

it("automatically imports a cold-start share and opens the recipe once", async () => {
  mockPayloads = caption;
  await render(<SocialRecipeShareHandler />);
  await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith("/recipes/recipe-1"));
  await act(async () => {
    active?.("active");
    link?.({ url: "cookkit://expo-sharing" });
  });
  expect(mockSave).toHaveBeenCalledTimes(1);
  expect(mockClear).toHaveBeenCalledTimes(1);
  expect(mockImport).toHaveBeenCalledWith({ url: undefined, text: caption[0]?.value });
  expect(mockImport).toHaveBeenCalledTimes(1);
  expect(mockConsume).toHaveBeenCalledWith("share-1");
  expect(mockRecovery).not.toHaveBeenCalled();
  expect(mockLoading).toHaveBeenCalledWith("Importing shared recipe…", {
    id: "recipe-share-share-1",
    duration: Infinity,
  });
  expect(mockDismiss).toHaveBeenCalledWith("recipe-share-share-1");
});

it("keeps both the URL and caption when importing a native share", async () => {
  mockPayloads = [{ shareType: "url", value: "https://example.com/eggs" }, ...caption];
  await render(<SocialRecipeShareHandler />);
  await waitFor(() =>
    expect(mockImport).toHaveBeenCalledWith({
      url: "https://example.com/eggs",
      text: caption[0]?.value,
    })
  );
});

it("accepts the same caption again when the user shares it a second time", async () => {
  mockPayloads = caption;
  await render(<SocialRecipeShareHandler />);
  await waitFor(() => expect(mockRouter.push).toHaveBeenCalledTimes(1));
  mockPayloads = caption;
  await act(async () => active?.("active"));
  await waitFor(() => expect(mockRouter.push).toHaveBeenCalledTimes(2));
  expect(mockSave).toHaveBeenCalledTimes(2);
  expect(mockImport).toHaveBeenCalledTimes(2);
});

it("waits for the navigator to mount even when a cold-start root key already exists", async () => {
  mockReady = false;
  mockPayloads = caption;
  await render(<SocialRecipeShareHandler />);
  await waitFor(() => expect(mockClear).toHaveBeenCalledTimes(1));
  expect(mockImport).not.toHaveBeenCalled();
  mockReady = true;
  await act(async () => mockNavigationChanged?.());
  await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith("/recipes/recipe-1"));
});

it("persists a share through onboarding before starting extraction", async () => {
  mockOnboarded = false;
  mockPayloads = caption;
  const screen = await render(<SocialRecipeShareHandler />);
  await waitFor(() => expect(mockClear).toHaveBeenCalledTimes(1));
  expect(mockRouter.push).not.toHaveBeenCalled();
  expect(mockImport).not.toHaveBeenCalled();
  mockOnboarded = true;
  mockSegments = ["home"];
  await screen.rerender(<SocialRecipeShareHandler />);
  await waitFor(() => expect(mockRouter.push).toHaveBeenCalledTimes(1));
});

it("opens only the latest recipe when a second share arrives during extraction", async () => {
  let finishFirst!: (result: ImportResult) => void;
  let finishSecond!: (result: ImportResult) => void;
  mockImport
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishFirst = resolve;
        })
    )
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishSecond = resolve;
        })
    );
  mockPayloads = caption;
  await render(<SocialRecipeShareHandler />);
  await waitFor(() => expect(mockImport).toHaveBeenCalledTimes(1));
  mockPayloads = [{ shareType: "text", value: "Boil 200g pasta and stir in pesto." }];
  await act(async () => link?.({ url: "cookkit://expo-sharing" }));
  await waitFor(() => expect(mockImport).toHaveBeenCalledTimes(2));
  await act(async () => finishFirst({ success: true, recipe: { id: "old-recipe" } }));
  expect(mockRouter.push).not.toHaveBeenCalled();
  expect(mockConsume).not.toHaveBeenCalled();
  expect(mockPending?.id).toBe("share-2");
  await act(async () => finishSecond({ success: true, recipe: { id: "new-recipe" } }));
  expect(mockRouter.push).toHaveBeenCalledWith("/recipes/new-recipe");
  expect(mockConsume).toHaveBeenCalledWith("share-2");
});

it("opens file/caption recovery on failure and does not retry on every app resume", async () => {
  mockImport.mockResolvedValueOnce({
    success: false,
    error: "Choose the saved video or paste the full caption.",
  });
  mockPayloads = caption;
  await render(<SocialRecipeShareHandler />);
  await waitFor(() =>
    expect(mockRecovery).toHaveBeenCalledWith(
      expect.objectContaining({
        open: true,
        initialError: "Choose the saved video or paste the full caption.",
        initialInput: expect.objectContaining({ text: caption[0]?.value }),
      })
    )
  );
  expect(mockRouter.push).not.toHaveBeenCalled();
  expect(mockPending?.id).toBe("share-1");
  await act(async () => active?.("active"));
  expect(mockImport).toHaveBeenCalledTimes(1);
  await act(async () => mockRecovery.mock.calls.at(-1)?.[0].onOpenChange(false));
  expect(mockConsume).toHaveBeenCalledWith("share-1");
  expect(mockPending).toBeNull();
});

it("retains the source and shows an actionable recovery sheet if extraction throws", async () => {
  mockImport.mockRejectedValueOnce(new Error("Connection unavailable."));
  mockPayloads = caption;
  await render(<SocialRecipeShareHandler />);
  await waitFor(() =>
    expect(mockRecovery).toHaveBeenCalledWith(
      expect.objectContaining({
        initialError: "Connection unavailable.",
        initialInput: expect.objectContaining({ text: caption[0]?.value }),
      })
    )
  );
  expect(mockConsume).not.toHaveBeenCalled();
  expect(mockRouter.push).not.toHaveBeenCalled();
  expect(mockPending?.text).toBe(caption[0]?.value);
});

it("extracts only once when effects replay in Strict Mode", async () => {
  mockPending = { id: "restored-share", text: caption[0]?.value };
  await render(
    <React.StrictMode>
      <SocialRecipeShareHandler />
    </React.StrictMode>
  );
  await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith("/recipes/recipe-1"));
  expect(mockImport).toHaveBeenCalledTimes(1);
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

it("reviews a native social share before writing the recipe or consuming its source", async () => {
  const url = "https://vt.tiktok.com/ZSgH2hh7B/";
  const draft = { recipe: { title: "Steamed egg", sourceUrl: url }, warnings: ["Review amounts"] };
  mockImport.mockResolvedValueOnce({ success: true, kind: "review", draft });
  mockPayloads = [{ shareType: "url", value: url }];
  await render(<SocialRecipeShareHandler />);
  await waitFor(() => expect(mockReview).toHaveBeenCalled());
  expect(mockConsume).not.toHaveBeenCalled();
  expect(mockRouter.push).not.toHaveBeenCalled();
  expect(mockSaveDraft).not.toHaveBeenCalled();
  await act(async () => mockReview.mock.calls.at(-1)?.[0].onSave(draft));
  expect(mockSaveDraft).toHaveBeenCalledWith(draft);
  expect(mockConsume).toHaveBeenCalledWith("share-1");
  expect(mockRouter.push).toHaveBeenCalledWith("/recipes/reviewed");
});
