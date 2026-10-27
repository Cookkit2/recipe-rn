import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import ClipboardRecipePrompt from "../ClipboardRecipePrompt";

jest.mock("react-native/Libraries/AppState/AppState", () => ({
  __esModule: true,
  default: { currentState: "active" },
}));

const mockRead = jest.fn<Promise<string>, []>();
const mockPush = jest.fn();
const mockSave = jest.fn(() => ({ id: "clipboard-1" }));
let mockPending = false;
let mockBusy = false;
const mockHistory = new Map<string, string>();
jest.mock("@react-native-clipboard/clipboard", () => ({
  __esModule: true,
  default: { getString: () => mockRead() },
}));
jest.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  digestStringAsync: async (_type: string, text: string) => `digest:${text}`,
}));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("~/data", () => ({
  storage: {
    get: (key: string) => mockHistory.get(key),
    set: (key: string, value: string) => mockHistory.set(key, value),
  },
}));
jest.mock("~/lib/recipe-share-inbox", () => ({
  readPendingRecipeShare: () => (mockPending ? { id: "native" } : null),
  savePendingRecipeShare: () => mockSave(),
}));
jest.mock("~/hooks/useRecipeImportActivity", () => ({ useRecipeImportBusy: () => mockBusy }));
jest.mock("~/components/ui/dialog", () => {
  const { View, Text } = jest.requireActual("react-native");
  return {
    Dialog: ({ open, children }: any) => (open ? <View>{children}</View> : null),
    DialogContent: View,
    DialogHeader: View,
    DialogFooter: View,
    DialogTitle: Text,
  };
});
jest.mock("~/components/ui/text", () => ({ Text: jest.requireActual("react-native").Text }));
jest.mock("~/components/ui/button", () => ({
  Button: jest.requireActual("react-native").Pressable,
}));
beforeEach(() => {
  jest.clearAllMocks();
  mockPending = false;
  mockBusy = false;
  mockHistory.clear();
  mockRead.mockResolvedValue("https://youtu.be/abcdefghijk");
});
it("prompts after startup and imports only on confirmation", async () => {
  const screen = await render(
    <ClipboardRecipePrompt enabled revision={1} receiving={() => false} />
  );
  await waitFor(() => expect(screen.getByText("Import recipe from copied link?")).toBeTruthy());
  expect(mockSave).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText("Import"));
  expect(mockSave).toHaveBeenCalledTimes(1);
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/recipes/import",
    params: { shareId: "clipboard-1" },
  });
});
it("defers a clipboard read until onboarding/navigation and native receiving are ready", async () => {
  const screen = await render(
    <ClipboardRecipePrompt enabled={false} revision={1} receiving={() => false} />
  );
  expect(mockRead).not.toHaveBeenCalled();
  await screen.rerender(<ClipboardRecipePrompt enabled revision={1} receiving={() => false} />);
  await waitFor(() => expect(mockRead).toHaveBeenCalledTimes(1));
});
it("waits for native pending shares and active manual imports", async () => {
  mockPending = true;
  const screen = await render(
    <ClipboardRecipePrompt enabled revision={1} receiving={() => false} />
  );
  expect(mockRead).not.toHaveBeenCalled();
  mockPending = false;
  mockBusy = true;
  await screen.rerender(<ClipboardRecipePrompt enabled revision={2} receiving={() => false} />);
  expect(mockRead).not.toHaveBeenCalled();
  mockBusy = false;
  await screen.rerender(<ClipboardRecipePrompt enabled revision={3} receiving={() => false} />);
  await waitFor(() => expect(mockRead).toHaveBeenCalledTimes(1));
});
it("remembers dismissal and offers a new link on the next foreground revision", async () => {
  const screen = await render(
    <ClipboardRecipePrompt enabled revision={1} receiving={() => false} />
  );
  await waitFor(() => expect(screen.getByText("Dismiss")).toBeTruthy());
  await fireEvent.press(screen.getByText("Dismiss"));
  await screen.rerender(<ClipboardRecipePrompt enabled revision={2} receiving={() => false} />);
  await waitFor(() => expect(mockRead).toHaveBeenCalledTimes(2));
  expect(screen.queryByText("Import recipe from copied link?")).toBeNull();
  mockRead.mockResolvedValue("https://vt.tiktok.com/ZSgH2hh7B/");
  await screen.rerender(<ClipboardRecipePrompt enabled revision={3} receiving={() => false} />);
  await waitFor(() =>
    expect(screen.getByText("Check this TikTok video for a recipe.")).toBeTruthy()
  );
});
it("closes a prompt when a native share takes priority", async () => {
  const screen = await render(
    <ClipboardRecipePrompt enabled revision={1} receiving={() => false} />
  );
  await waitFor(() => expect(screen.getByText("Import")).toBeTruthy());
  mockPending = true;
  await screen.rerender(
    <ClipboardRecipePrompt enabled={false} revision={2} receiving={() => true} />
  );
  expect(screen.queryByText("Import")).toBeNull();
  expect(mockSave).not.toHaveBeenCalled();
});
it("ignores a read completing after unmount", async () => {
  let finish!: (value: string) => void;
  mockRead.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const screen = await render(
    <ClipboardRecipePrompt enabled revision={1} receiving={() => false} />
  );
  await screen.unmount();
  finish("https://youtu.be/abcdefghijk");
  await Promise.resolve();
  expect(mockSave).not.toHaveBeenCalled();
  expect(mockHistory.size).toBe(0);
});
it("offers only one prompt through Strict Mode replay", async () => {
  const screen = await render(
    <React.StrictMode>
      <ClipboardRecipePrompt enabled revision={1} receiving={() => false} />
    </React.StrictMode>
  );
  await waitFor(() => expect(screen.getByText("Import")).toBeTruthy());
  expect(mockRead).toHaveBeenCalledTimes(1);
});
it("checks a new copied link when only an old retry record remains", async () => {
  mockPending = true;
  const screen = await render(
    <ClipboardRecipePrompt
      enabled
      revision={1}
      receiving={() => false}
      hasPendingShare={() => false}
    />
  );
  await waitFor(() => expect(screen.getByText("Import")).toBeTruthy());
  expect(mockSave).not.toHaveBeenCalled();
});
