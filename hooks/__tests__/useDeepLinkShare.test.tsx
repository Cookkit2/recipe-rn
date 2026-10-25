import { act, renderHook, waitFor } from "@testing-library/react-native";
import { Linking, Platform } from "react-native";
import { useDeepLinkShare } from "../useDeepLinkShare";
import { resolveSharedRecipe } from "~/lib/resolve-shared-recipe";
import { toast } from "sonner-native";
import { ONBOARDING_COMPLETED_KEY } from "~/constants/storage-keys";

const values = new Map<string, unknown>();
const push = jest.fn();
const invalidate = jest.fn(async () => {});
const navigation = { isReady: () => true, addListener: jest.fn(() => () => {}) };
let segments = ["onboarding"];
jest.mock("expo-router", () => ({
  useRouter: () => ({ push }),
  useNavigationContainerRef: () => navigation,
  useRootNavigationState: () => ({ key: "root" }),
  useSegments: () => segments,
}));
jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: invalidate }),
}));
jest.mock("~/data/storage", () => ({
  storageFacade: {
    get: (key: string) => values.get(key) ?? null,
    set: (key: string, value: unknown) => values.set(key, value),
    delete: (key: string) => values.delete(key),
  },
}));
jest.mock("~/data/db/DatabaseFacade", () => ({ databaseFacade: {} }));
jest.mock("~/data/api/recipeShareApi", () => ({ fetchRecipeShare: jest.fn() }));
jest.mock("~/lib/resolve-shared-recipe", () => ({ resolveSharedRecipe: jest.fn() }));
jest.mock("~/lib/analytics/funnel-events", () => ({
  emitShareLinkOpened: jest.fn(),
  emitFunnelEvent: jest.fn(),
}));
jest.mock("sonner-native", () => ({
  toast: { loading: jest.fn(), dismiss: jest.fn(), error: jest.fn() },
}));

const token = "430138cb-2b17-42c8-a72b-b67e1c5ac927";
const second = "530138cb-2b17-42c8-a72b-b67e1c5ac927";
const link = (id: string) => `https://recipe-web-mings-projects-6bb85e23.vercel.app/r/${id}`;
let receive: (event: { url: string }) => void;
beforeEach(() => {
  jest.clearAllMocks();
  values.clear();
  segments = ["onboarding"];
  jest.replaceProperty(Platform, "OS", "ios");
  jest.spyOn(Linking, "getInitialURL").mockResolvedValue(link(token));
  jest.spyOn(Linking, "addEventListener").mockImplementation((_event, listener) => {
    receive = listener;
    return { remove: jest.fn() };
  });
});
afterEach(() => jest.restoreAllMocks());

it("preserves a cold-start link until onboarding finishes and imports only once", async () => {
  jest.mocked(resolveSharedRecipe).mockResolvedValue(token);
  const hook = await renderHook(() => useDeepLinkShare());
  await waitFor(() => expect(values.get("pending_cookkit_recipe_link")).toBe(link(token)));
  expect(resolveSharedRecipe).not.toHaveBeenCalled();
  values.set(ONBOARDING_COMPLETED_KEY, true);
  segments = ["index"];
  await hook.rerender(undefined);
  await waitFor(() => expect(push).toHaveBeenCalledWith(`/recipes/${token}`));
  await act(() => receive({ url: link("QwE4yysXQsinK7Z-HFrJJw") }));
  expect(resolveSharedRecipe).toHaveBeenCalledTimes(1);
});

it("doesn't drop a different incoming link while an import is in flight", async () => {
  values.set(ONBOARDING_COMPLETED_KEY, true);
  segments = ["index"];
  let finish!: (value: string) => void;
  jest
    .mocked(resolveSharedRecipe)
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    )
    .mockResolvedValueOnce(second);
  await renderHook(() => useDeepLinkShare());
  await waitFor(() => expect(resolveSharedRecipe).toHaveBeenCalledTimes(1));
  await act(() => receive({ url: link(second) }));
  await act(() => finish(token));
  await waitFor(() => expect(push).toHaveBeenCalledWith(`/recipes/${second}`));
  expect(resolveSharedRecipe).toHaveBeenCalledTimes(2);
});

it("keeps a failed link for retry without navigating or looping", async () => {
  values.set(ONBOARDING_COMPLETED_KEY, true);
  segments = ["index"];
  jest
    .mocked(resolveSharedRecipe)
    .mockRejectedValueOnce(new Error("Offline"))
    .mockResolvedValueOnce(token);
  await renderHook(() => useDeepLinkShare());
  await waitFor(() => expect(toast.error).toHaveBeenCalled());
  expect(push).not.toHaveBeenCalled();
  expect(resolveSharedRecipe).toHaveBeenCalledTimes(1);
  const args = jest.mocked(toast.error).mock.calls[0]?.[1];
  const action = args?.action;
  if (!action || typeof action !== "object" || !("onClick" in action))
    throw new Error("Missing retry action");
  await act(() => action.onClick());
  await waitFor(() => expect(push).toHaveBeenCalledWith(`/recipes/${token}`));
});
