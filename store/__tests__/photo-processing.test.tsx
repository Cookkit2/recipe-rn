import { act, cleanup, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { CreateIngredientProvider, useCreateIngredientStore } from "../CreateIngredientContext";
import { classifyStaticImage } from "~/hooks/model/classifyModel";
import { segmentStaticImage } from "~/hooks/model/segmentModel";
import { loadImageIntoSkia } from "~/hooks/model/processImage";

jest.mock("expo-file-system", () => ({
  File: jest.fn(() => ({ uri: "file:///masked.png", write: jest.fn() })),
  Paths: { cache: "cache" },
}));
jest.mock("~/data/supabase-api/BaseIngredientApi", () => ({
  baseIngredientApi: { getBaseIngredientByName: async () => null },
}));
jest.mock("~/hooks/model/processImage", () => ({
  loadImageIntoSkia: jest.fn(async () => ({ width: () => 100, height: () => 100 })),
}));
jest.mock("~/hooks/model/classifyModel", () => ({ classifyStaticImage: jest.fn() }));
jest.mock("~/hooks/model/segmentModel", () => ({
  segmentStaticImage: jest.fn(),
  trimTransparentBordersAndResizeImage: () => ({ base64: "png" }),
}));
jest.mock("~/utils/logger", () => ({
  log: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));
let mockId = 0;
jest.mock("expo-crypto", () => ({ randomUUID: () => String(++mockId) }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
const wrapper = ({ children }: { children: ReactNode }) => (
  <CreateIngredientProvider>{children}</CreateIngredientProvider>
);
afterEach(async () => {
  await cleanup();
  jest.clearAllMocks();
});

it("starts recognition before segmentation finishes and cancels removed photos", async () => {
  const segmentation = deferred<Awaited<ReturnType<typeof segmentStaticImage>>>();
  const recognition = deferred<Awaited<ReturnType<typeof classifyStaticImage>>>();
  jest.mocked(segmentStaticImage).mockReturnValue(segmentation.promise);
  jest.mocked(classifyStaticImage).mockReturnValue(recognition.promise);
  const { result } = await renderHook(() => useCreateIngredientStore(), { wrapper });
  await act(async () => {
    result.current.processImage("file:///photo.jpg", { x: 10, y: 10 });
  });
  await waitFor(() => expect(classifyStaticImage).toHaveBeenCalledTimes(1));
  expect(segmentStaticImage).toHaveBeenCalledTimes(1);
  const signal = jest.mocked(classifyStaticImage).mock.calls[0]?.[1];
  expect(signal?.aborted).toBe(false);
  const id = result.current.processPantryItems[0]!.id;
  await act(async () => {
    result.current.removeItem(id);
  });
  expect(signal?.aborted).toBe(true);
  await act(async () => {
    segmentation.resolve({ skImage: {} as never, background_color: "white" });
    recognition.resolve({ name: "Rice", quantity: 1, unit: "kg", confidence: 0.9 });
  });
  expect(result.current.processPantryItems).toEqual([]);
});

it("bounds photo processing to two jobs and skips a cancelled queued photo", async () => {
  const segmentation = deferred<Awaited<ReturnType<typeof segmentStaticImage>>>();
  jest.mocked(segmentStaticImage).mockReturnValue(segmentation.promise);
  jest
    .mocked(classifyStaticImage)
    .mockResolvedValue({ name: "Rice", quantity: 1, unit: "kg", confidence: 0.9 });
  const { result } = await renderHook(() => useCreateIngredientStore(), { wrapper });
  await act(async () => {
    for (let i = 0; i < 3; i++) result.current.processImage(`file:///${i}.jpg`, { x: 10, y: 10 });
  });
  await waitFor(() => expect(segmentStaticImage).toHaveBeenCalledTimes(2));
  const queued = result.current.processPantryItems[0]!.id;
  await act(async () => {
    result.current.removeItem(queued);
  });
  await act(async () => {
    segmentation.resolve({ skImage: {} as never, background_color: "white" });
  });
  expect(loadImageIntoSkia).toHaveBeenCalledTimes(2);
});
