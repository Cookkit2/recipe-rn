import React from "react";
import { act, renderHook } from "@testing-library/react-native";
import { useRecipeImportPreview } from "../useRecipeImportPreview";

const mockPrepare = jest.fn();
const mockSave = jest.fn();
const mockInvalidate = jest.fn();
const mockClient = { invalidateQueries: mockInvalidate };
jest.mock("@tanstack/react-query", () => ({ useQueryClient: () => mockClient }));
jest.mock("~/data/api/recipeImportApi", () => ({
  recipeImportApi: {
    prepareSharedRecipe: (...args: unknown[]) => mockPrepare(...args),
    saveRecipeDraft: (...args: unknown[]) => mockSave(...args),
  },
  getImportStatusMessage: (status: string) => status,
}));
beforeEach(() => jest.resetAllMocks());

it("does not refresh saved recipes until the user saves the draft", async () => {
  const draft = { recipe: { title: "Eggs" }, warnings: [] };
  mockPrepare.mockResolvedValue({ kind: "review", draft });
  mockSave.mockResolvedValue({ success: true, recipe: { id: "saved" } });
  const screen = await renderHook(useRecipeImportPreview);
  await act(async () => {
    await screen.result.current.prepare({ text: "5 eggs, steam 15 minutes" });
  });
  expect(mockSave).not.toHaveBeenCalled();
  expect(mockInvalidate).not.toHaveBeenCalled();
  await act(async () => {
    await screen.result.current.save(draft as any);
  });
  expect(mockSave).toHaveBeenCalledTimes(1);
  expect(mockInvalidate).toHaveBeenCalledTimes(3);
});

it("cancels an obsolete extraction and ignores its late result", async () => {
  let finish!: (value: unknown) => void;
  mockPrepare.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const screen = await renderHook(useRecipeImportPreview);
  let result!: Promise<unknown>;
  await act(async () => {
    result = screen.result.current.prepare({ text: "old" }).catch((error) => error);
  });
  const signal = mockPrepare.mock.calls[0]?.[2].signal as AbortSignal;
  await act(async () => screen.result.current.cancel());
  expect(signal.aborted).toBe(true);
  await act(async () => finish({ kind: "saved", result: { success: true } }));
  expect(await result).toMatchObject({ name: "AbortError" });
  expect(mockInvalidate).not.toHaveBeenCalled();
  expect(screen.result.current.isPending).toBe(false);
});

it("keeps an active request across Strict Mode effect replay and cancels on unmount", async () => {
  mockPrepare.mockImplementation(() => new Promise(() => {}));
  const screen = await renderHook(useRecipeImportPreview, {
    wrapper: ({ children }) => <React.StrictMode>{children}</React.StrictMode>,
  });
  await act(async () => {
    void screen.result.current.prepare({ text: "eggs" });
  });
  const signal = mockPrepare.mock.calls[0]?.[2].signal as AbortSignal;
  expect(signal.aborted).toBe(false);
  await screen.unmount();
  await Promise.resolve();
  expect(signal.aborted).toBe(true);
});
