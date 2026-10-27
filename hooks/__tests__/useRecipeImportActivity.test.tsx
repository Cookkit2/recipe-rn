import { renderHook } from "@testing-library/react-native";
import { useRecipeImportActivity, useRecipeImportBusy } from "../useRecipeImportActivity";
it("remains busy until every import dialog/request has closed", async () => {
  const observer = await renderHook(useRecipeImportBusy);
  expect(observer.result.current).toBe(false);
  const first = await renderHook(() => useRecipeImportActivity(true));
  const second = await renderHook(() => useRecipeImportActivity(true));
  expect(observer.result.current).toBe(true);
  await first.unmount();
  expect(observer.result.current).toBe(true);
  await second.unmount();
  expect(observer.result.current).toBe(false);
});
